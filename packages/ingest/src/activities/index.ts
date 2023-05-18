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
import { URLSearchParams } from 'url'

import { addOrderBlob } from '../orders'

const log = logger.child({ app: 'ingest', module: 'listings' })
const WANTED_RESERVOIR_TYPES: ActivityType[] = [
  'ask',
  'ask_cancel',
  'bid',
  'bid_cancel',
  'sale',
]

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
      const actProps = transalateActivity(item)
      actProps.activityHash = hashActivity(actProps)
      actProps.reservoirOrderId = actProps.activityBlob.order?.id
        ? hex2buf(actProps.activityBlob.order.id)
        : undefined

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
        const tx = await provider.getTransaction(actProps.activityBlob.txHash)
        if (tx) actProps.transactionBlob = tx
      }

      let cheapestOrder, collectionFloorPrice, userOgnStake
      if (['ask', 'bid'].includes(actProps.type)) {
        if (actProps.activityBlob.token?.tokenId) {
          const cheapest = await getCheapestOrder(
            actProps.contractAddress,
            actProps.activityBlob.token?.tokenId
          )

          if (!cheapest || hex2buf(cheapest.id) === actProps.reservoirOrderId) {
            cheapestOrder = true
          } else {
            cheapestOrder = false
          }
        } else {
          cheapestOrder = false
        }

        collectionFloorPrice = await getCollectionFloor(
          actProps.contractAddress
        )
      }

      if (!actProps.type.endsWith('_cancel')) {
        const ogn = getOGN()
        const stake = actProps.walletAddress
          ? ((await ogn.balanceOf(buf2hex(actProps.walletAddress))) as bigint)
          : 0n
        userOgnStake = stake.toString()
      }

      actProps.contextBlob = {
        cheapestOrder,
        collectionFloorPrice,
        userOgnStake,
      }

      if (actProps.type.endsWith('_cancel')) {
        const cancelledOrder = await Activity.findOne({
          where: {
            reservoirOrderId: actProps.reservoirOrderId,
            type: {
              [Op.in]: ['ask', 'bid'],
            },
          },
        })

        // If we know about the order...
        if (cancelledOrder) {
          actProps.valid = cancelledOrder.valid
          actProps.points = cancelledOrder.points
          // negate its points
          actProps.multiplier = cancelledOrder.multiplier * -1
        } else {
          actProps.valid = false
        }
      } else {
        const score = await scoreActivity(actProps)
        actProps.valid = score.valid
        actProps.multiplier = score.multiplier
        actProps.points = score.points
        actProps.reason = score.reason

        if (score.adjustments.length) {
          await makeAdjustments(score.adjustments)
        }
      }

      try {
        const [, created] = await insertActivity(actProps)
        if (created) {
          insertCount += 1
        }
      } catch (err) {
        // console.error(err)
        log.error(
          `Error occurred trying to insret activity ${
            actProps.activityHash ? buf2hex(actProps.activityHash) : 'UNK'
          }`
        )
      }
    }

    if (result.isDone) {
      log.debug('fetchActivities() indicated isDone')
      break
    }
    log.debug(`continuationToken: ${continuationToken ?? 'NONE'}`)
    log.debug(`requestCount: ${requestCount}`)
    log.debug(`requestLimit: ${requestLimit}`)
  } while (continuationToken && requestCount < requestLimit)

  log.info(
    `Finished collecting ${insertCount} activities with ${requestCount} requests`
  )
}

export async function insertActivity(
  actProps: IActivity
): Promise<[Activity, boolean]> {
  const hexHash = actProps.activityHash ? buf2hex(actProps.activityHash) : 'UNK'
  log.debug(`Attempting to find or create Activity ${hexHash}`)

  const [activity, created] = await Activity.findOrCreate({
    where: { activityHash: actProps.activityHash },
    defaults: {
      ...actProps,
    },
  })

  if (created) {
    log.info(`Inserted activity ${hexHash}`)
  } else {
    log.debug(`Activity ${hexHash} already exists`)
  }

  return [activity, created]
}

export async function makeAdjustments(
  adjustments: Adjustment[]
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
        await act.update({
          adjustmentMultiplier:
            (act.adjustmentMultiplier || 1) * adjust.multiplier,
        })
      }
    }
  }
}
