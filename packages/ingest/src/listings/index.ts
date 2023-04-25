/**
 * Fetches newly-created listings from Reservoir, creates Activity rows as
 * appropriate
 */
import { Activity, IActivity, hashActivity } from '@storypoints/models'
import { scoreActivity } from '@storypoints/rules'
import {
  dateToUnix,
  hex2buf,
  buf2hex,
  logger,
  unixToJSDate,
} from '@storypoints/utils'
import {
  fetchFromReservoir,
  GetCollectionActivityResponse,
  ReservoirCollectionActivity,
} from '@storypoints/utils/reservoir'
import { URLSearchParams } from 'url'

import { fetchOrder } from '../orders'

const log = logger.child({ app: 'ingest', module: 'listings' })
const WANTED_RESERVOIR_TYPES = [
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

  const params = new URLSearchParams(queryParams)
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
  timestamp: activity.timestamp ? unixToJSDate(activity.timestamp) : new Date(),
  type: activity.type ?? '',
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

  let continuationToken
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

    const activities = []
    for (const item of result.activities) {
      const actProps = transalateActivity(item)
      actProps.activityHash = hashActivity(actProps)
      actProps.orderBlob = await fetchOrder(actProps.activityBlob.order.id)

      const score = await scoreActivity(actProps)
      actProps.valid = score.valid
      actProps.points = score.points
      actProps.multiplier = score.multiplier

      activities.push(actProps)
    }

    if (activities.length) {
      log.info(`upserting ${activities.length} activities`)
      await upsertActivites(activities)
    }
    if (result.isDone) {
      log.debug('fetchActivities() indicated isDone')
      break
    }
    log.debug(`continuationToken: ${continuationToken ?? 'NONE'}`)
    log.debug(`requestCount: ${requestCount}`)
    log.debug(`requestLimit: ${requestLimit}`)
  } while (continuationToken && requestCount < requestLimit)
}

export async function upsertActivites(activities: IActivity[]) {
  for (const item of activities) {
    let activity = await Activity.findOne({
      where: { activityHash: item.activityHash },
    })

    if (activity) {
      await activity.update({ ...item })
    } else {
      activity = await Activity.create({ ...item })
      // if activityHash is undefined, something broke, so ignoring
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      log.debug(`Created activity ${buf2hex(activity.activityHash!)}`)
    }
  }
}
