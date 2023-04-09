/**
 * Fetches newly-created listings from Reservoir, creates Events as appropriate
 */
import fetch, { Response } from 'node-fetch'
import { URLSearchParams } from 'url'
import logger from '../../logger'

import { Event } from '../../models'
import { ReservoirActivity, ReservoirActivityResponse } from './reservoir.types'

const RESERVOIR_URL = process.env.RESERVOIR_URL ?? 'https://api.reservoir.tools'
const RESERVOIR_API_KEY = process.env.RESERVOIR_API_KEY ?? ''

type ActivityQueryParams = {
  collection: string
  types: string
  continuation?: string
}

export const getActivitiesUntilTxHash = async (
  contractAddress: string,
  txHash: string,
  requestLimit: number = 10
): Promise<ReservoirActivity[]> => {
  const url = `${RESERVOIR_URL}/collections/activity/v6`
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

    const params = new URLSearchParams(queryParams)
    requestCount += 1
    const response = await fetch(`${url}?${params.toString()}`, {
      headers: { 'X-API-Key': RESERVOIR_API_KEY }
    })
    const json = await response.json()
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

  const fetchUrl = `${RESERVOIR_URL}/collections/activity/v6?${params.toString()}`
  logger.debug(`Fetching ${fetchUrl}`)

  const response: Response = await fetch(fetchUrl, {
    headers: {
      'x-api-key': RESERVOIR_API_KEY
    }
  })

  if (response.status >= 300) {
    throw new Error(`Error fetching from Reservoir: ${response.status}`)
  }

  const reservoirActivity: ReservoirActivityResponse =
    (await response.json()) as ReservoirActivityResponse

  return reservoirActivity.activities
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
