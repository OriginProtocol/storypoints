/**
 * Fetches newly-created listings from Reservoir, creates Events as appropriate
 */
import fetch, { Response } from 'node-fetch'
import { URLSearchParams } from 'url'
import logger from '../../logger'

import { Event } from '../../models'
import {
  ReservoirActivity,
  ReservoirActivityResponse,
  Sale
} from '../../lib/reservoir/types'
import { fetchFromReservoir } from '../../lib/reservoir/fetch'

//represents the query params for the reservoir api
type ActivityQueryParams = {
  collection: string
  types: string
  continuation?: string
}

type getActivitiesUntilTxHashParams = {
  contractAddress: string
  txHash?: string
  requestLimit?: number
}

/**
 * Fetches recent activity from Reservoir for a given collection, stopping when it finds the
 * given txHash (if provided). Stops after making requestLimit requests.
 * @param contractAddress The contract address of the collection to fetch activities for
 * @param txHash The txHash to stop fetching at
 * @param requestLimit 10 by default
 * @returns array of ReservoirActivity objects
 */
export const getActivitiesUntilTxHash = async (
  params: getActivitiesUntilTxHashParams
): Promise<ReservoirActivity[]> => {
  const { contractAddress, txHash, requestLimit = 10 } = params

  let activities: ReservoirActivity[] = []
  let continuationToken: string | null = null
  let isDone = false
  let requestCount = 0
  let limitReached = false

  // Continue fetching while there is a continuation token and we haven't found the matching txHash
  while (!isDone && !limitReached) {
    const queryParams: ActivityQueryParams = {
      collection: contractAddress,
      types: 'sale'
    }

    if (continuationToken) {
      queryParams.continuation = continuationToken
    }

    requestCount += 1

    const params = new URLSearchParams(queryParams)
    const url = `/collections/activity/v6?${params.toString()}`

    logger.debug(`Fetching ${url}`)

    const json = await fetchFromReservoir({ url })
    const newActivities = json.activities || []

    activities = [...activities, ...newActivities]
    continuationToken = json.continuation

    // Check if we have found the activity with the matching txHash
    isDone = newActivities.some(
      (activity: ReservoirActivity) => activity.txHash === txHash
    )

    limitReached = requestCount >= requestLimit
  }

  return activities
}

//for a given contract address, fetches the latest activity from Reservoir
const fetchLatestActivity = async (
  contractAddress: string
): Promise<ReservoirActivity[]> => {
  const params = new URLSearchParams({
    collection: contractAddress,
    types: 'sale'
  })

  const url = `/collections/activity/v6?${params.toString()}`
  logger.debug(`Fetching ${url}`)

  const result: ReservoirActivityResponse = await fetchFromReservoir({ url })

  return result.activities
}

export const fetchListings = async (contractAddress: string) => {
  const activity = await fetchLatestActivity(contractAddress)

  //for each activity item, create an Event
  for (const item of activity) {
    // logger.debug(item)
    // const eventData = {
    //   type: item.type,
    //   walletAddress: item.walletAddress,
    //   contractAddress: item.contractAddress,
    //   points: item.points,
    //   eventHash: item.eventHash
    // }
    // //create the event
    // const event = await Event.create(eventData)
    // logger.debug(`Created event ${event.eventHash}`)
  }
}
function getSalesForTxHashes(contractAddress: string, txHashes: string[]) {
  throw new Error('Function not implemented.')
}
