/**
 * Fetches newly-created activities from Reservoir, creates Activity rows as
 * appropriate
 */
import { Activity, Op, hashActivity } from '@storypoints/models'
import { scoreActivity } from '@storypoints/rules'
import {
  ActivityType,
  Adjustment,
  GetCollectionActivityResponse,
  IActivity,
  ReservoirCollectionActivity,
} from '@storypoints/types'
import {
  dateToUnix,
  hex2buf,
  buf2hex,
  logger,
  unixToJSDate,
} from '@storypoints/utils'
import { getOGN, getProvider } from '@storypoints/utils/eth'
import {
  fetchFromReservoir,
  getCheapestOrder,
  getCollectionFloor,
} from '@storypoints/utils/reservoir'
import { JsonRpcProvider } from 'ethers'
import { URLSearchParams } from 'url'

import { addOrderBlob } from '../orders'
import { addSaleBlob } from '../sales'

const log = logger.child({ app: 'ingest', module: 'listings' })
const WANTED_RESERVOIR_TYPES: ActivityType[] = [
  'ask',
  'ask_cancel',
  'bid',
  'bid_cancel',
  'sale',
]

type CLIOut = (a: unknown) => void

//represents the query params for the reservoir api
interface ActivityQueryParams {
  collection: string
  continuation?: string
  includeMetadata?: string
  limit?: string
}

interface FetchActivitiesResult {
  continuationToken?: string
  isDone: boolean
  activities: ReservoirCollectionActivity[]
}

/// Fetch a page of activities looking for
export const fetchActivities = async ({
  contractAddress,
  continuationToken,
  until,
}: {
  contractAddress: string
  continuationToken?: string
  until?: Date
}): Promise<FetchActivitiesResult> => {
  const result: FetchActivitiesResult = {
    activities: [],
    continuationToken: undefined,
    isDone: false,
  }

  const queryParams: ActivityQueryParams = {
    collection: contractAddress,
    includeMetadata: 'false',
    limit: '1000',
  }

  if (continuationToken) {
    queryParams.continuation = continuationToken
  }

  const params = new URLSearchParams({ ...queryParams })
  for (const rType of WANTED_RESERVOIR_TYPES) {
    // Multiple params for multiple values, not command delimited or whatever
    params.append('types', rType)
  }
  const url = `/collections/activity/v6?${params.toString()}`

  log.debug(`Fetching ${url}`)

  const json = await fetchFromReservoir<GetCollectionActivityResponse>({
    url,
  })

  if (!json.activities) {
    result.isDone = true
    return result
  }

  result.activities = json.activities
  result.continuationToken = json.continuation

  // Check if we have reached our end
  result.isDone = until
    ? json.activities.some(
        // TODO: when is timestamp undefined?
        (activity: ReservoirCollectionActivity) =>
          activity.timestamp && activity.timestamp <= dateToUnix(until)
      )
    : !result.continuationToken

  return result
}

const transalateActivity = (
  activity: ReservoirCollectionActivity
): IActivity => ({
  contractAddress: hex2buf(activity.contract),
  currency: hex2buf(activity.price?.currency?.contract),
  multiplier: 0,
  description: '',
  points: 0,
  price: activity.price?.amount?.raw,
  priceUSD: activity.price?.amount?.usd,
  timestamp: activity.timestamp ? unixToJSDate(activity.timestamp) : new Date(),
  type: (activity.type ?? 'unknown') as ActivityType,
  activityBlob: activity,
  walletAddress: activity.fromAddress
    ? hex2buf(activity.fromAddress)
    : undefined,
})

/// Process a collection activity from /collections/activity/v6
export async function processReservoirActivity(
  item: ReservoirCollectionActivity,
  {
    cliout,
    provider,
    simulate = false,
  }: {
    cliout?: CLIOut
    provider: JsonRpcProvider
    simulate?: boolean
  }
): Promise<boolean> {
  const actProps = transalateActivity(item)
  actProps.activityHash = hashActivity(actProps)
  actProps.reservoirOrderId = actProps.activityBlob.order?.id
    ? hex2buf(actProps.activityBlob.order.id)
    : undefined

  // Check early if it exists, if it does, we can skip most of the rest
  if (!simulate && (await activityExists(actProps.activityHash))) {
    // SKIIIIIIP
    return false
  } else {
    log.debug(
      { activityHash: buf2hex(actProps.activityHash) },
      'Activity not known'
    )
  }

  // TODO: For now, we're only adding order blobs to native activities and
  // sales for efficiency raisins.  Wonder if we could make this lazy on
  // the model somehow?
  if (
    actProps.type === 'sale' ||
    actProps.type.endsWith('_cancel') ||
    actProps.activityBlob.order?.source?.domain === 'story.xyz'
  ) {
    await addOrderBlob(actProps)
  }

  // Add reservoir sales blob
  if (actProps.type === 'sale') {
    await addSaleBlob(actProps)
  }

  // The user getting points for the sale should be the taker in the case
  // of a ask. Asks getting filled have fromAddress set to maker.
  if (actProps.type === 'sale' && actProps.orderBlob?.side === 'sell') {
    actProps.walletAddress = hex2buf(actProps.activityBlob.toAddress)
  }

  // If there's an L1 tx involved, let's store the tx
  if (
    (actProps.type === 'sale' || actProps.type.endsWith('_cancel')) &&
    actProps.activityBlob.txHash
  ) {
    await addTxBlob(provider, actProps)
  }

  actProps.contextBlob = {
    cheapestOrder: await isCheapestOrder(actProps),
    collectionFloorPrice: ['ask', 'bid'].includes(actProps.type)
      ? await getCollectionFloor(actProps.contractAddress)
      : undefined,
    userOgnStake: !actProps.type.endsWith('_cancel')
      ? await getUserStake(actProps)
      : undefined,
  }

  if (actProps.type.endsWith('_cancel')) {
    await adjustForCancellation(actProps)
  } else {
    const score = await scoreActivity(actProps)
    actProps.valid = score.valid
    actProps.multiplier = score.multiplier
    actProps.points = score.points
    actProps.reason = score.reason

    if (score.adjustments.length) {
      await makeAdjustments(score.adjustments, { cliout, simulate })
    }
  }

  try {
    log.debug(`Inserting Activity ${buf2hex(actProps.activityHash)}`)
    if (!simulate) {
      await Activity.create({ ...actProps })
    } else {
      cliout?.('create activity:')
      cliout?.(actProps)
    }
    return true
  } catch (err) {
    console.error(err)
    log.error(
      {
        message: (err as { message?: string }).message,
        code: (err as { code?: unknown }).code,
        activityHash: buf2hex(actProps.activityHash),
      },
      `Error occurred trying to insret activity ${buf2hex(
        actProps.activityHash
      )}`
    )
  }

  return false
}

/// Fetch Reservoir activities, transmute, and store in DB
export async function collectActivities({
  contractAddress,
  fullHistory = false,
  requestLimit = 10,
}: {
  contractAddress: string
  fullHistory: boolean
  requestLimit: number
}): Promise<void> {
  log.debug(`Fetching listings for ${contractAddress}`)

  let until
  if (!fullHistory) {
    const latest = await Activity.findOne({
      attributes: ['timestamp'],
      where: {
        contractAddress: hex2buf(contractAddress),
      },
      order: [['timestamp', 'DESC']],
    })

    until = latest?.timestamp

    log.info(`Fetching activity until ${until?.toUTCString() ?? 'FOREVER'}`)
  }

  if (requestLimit > 1000) {
    // TODO
    log.warn('requestLimit > 1000 attempted')
    requestLimit = 1000
  }

  const provider = getProvider()

  let continuationToken
  let insertCount = 0
  let requestCount = 0
  do {
    const faProps = {
      continuationToken,
      contractAddress,
      until,
    }
    log.debug(faProps, 'Calling fetchActivities()')
    const result = await fetchActivities(faProps)

    log.debug(`Fetched ${result.activities.length} activities from Reservoir`)

    continuationToken = result.continuationToken
    requestCount += 1
    const resultCount = result.activities.length
      ? result.activities.length - 1
      : 0

    for (let i = resultCount; i >= 0; i--) {
      const item = result.activities[i]
      if (await processReservoirActivity(item, { provider })) insertCount += 1
    }

    if (result.isDone) {
      //log.debug('fetchActivities() indicated isDone')
      break
    }
    //log.debug(`continuationToken: ${continuationToken ?? 'NONE'}`)
    //log.debug(`requestCount: ${requestCount}`)
    //log.debug(`requestLimit: ${requestLimit}`)
  } while (continuationToken && requestCount < requestLimit)

  log.info(
    `Finished collecting ${insertCount} activities with ${requestCount} requests`
  )
}

async function activityExists(activityHash: Buffer): Promise<boolean> {
  return (
    (await Activity.count({
      where: { activityHash },
    })) > 0
  )
}

async function adjustForCancellation(activity: IActivity): Promise<void> {
  const cancelledOrder = await Activity.findOne({
    where: {
      reservoirOrderId: activity.reservoirOrderId,
      type: {
        [Op.in]: ['ask', 'bid'],
      },
    },
  })

  // If we know about the order...
  if (cancelledOrder) {
    activity.valid = cancelledOrder.valid
    activity.points = cancelledOrder.points
    // negate its points
    activity.multiplier = cancelledOrder.multiplier * -1
  } else {
    activity.valid = false
  }
}

async function addTxBlob(
  provider: JsonRpcProvider,
  activity: IActivity
): Promise<void> {
  if (!activity.activityBlob.txHash) return
  const tx = await provider.getTransaction(activity.activityBlob.txHash)
  if (tx) activity.transactionBlob = tx
}

async function getUserStake(activity: IActivity): Promise<string> {
  const ogn = getOGN()
  const stake = activity.walletAddress
    ? ((await ogn.balanceOf(buf2hex(activity.walletAddress))) as bigint)
    : 0n
  return stake.toString()
}

async function isCheapestOrder(
  activity: IActivity
): Promise<boolean | undefined> {
  if (['ask', 'bid'].includes(activity.type)) {
    if (activity.type === 'ask') {
      if (activity.activityBlob.token?.tokenId) {
        const cheapest = await getCheapestOrder(
          activity.contractAddress,
          activity.activityBlob.token.tokenId
        )

        if (
          // if we have a response
          cheapest &&
          // and its not the order we're handling now
          hex2buf(cheapest.id) !== activity.reservoirOrderId &&
          // and it's the same owner
          hex2buf(cheapest.maker) === activity.walletAddress
        ) {
          // it ain't the cheapest
          return false
        }
      }
    }
    return true
  }

  return undefined
}

export async function makeAdjustments(
  adjustments: Adjustment[],
  { cliout, simulate = false }: { cliout?: CLIOut; simulate?: boolean } = {}
): Promise<void> {
  for (const adjust of adjustments) {
    const acts = await Activity.findAll({
      where: {
        type: adjust.type,
        reservoirOrderId: adjust.reservoirOrderId,
      },
    })

    if (!acts.length) {
      log.debug(
        {
          type: adjust.type,
          multiplier: adjust.multiplier,
          reservoirOrderId: buf2hex(adjust.reservoirOrderId),
        },
        'No activities found matching adjustment criteria'
      )
      continue
    }

    for (const act of acts) {
      if (adjust.multiplier) {
        log.info(
          `Adjusting activity (${
            act.activityHash ? buf2hex(act.activityHash) : 'UNK'
          }) by ${adjust.multiplier}`
        )

        const updateProps = {
          adjustmentMultiplier:
            (act.adjustmentMultiplier || 1) * adjust.multiplier,
        }
        if (simulate) {
          cliout?.('adjustment:')
          cliout?.(updateProps)
        } else {
          await act.update(updateProps)
        }
      }
    }
  }
}
