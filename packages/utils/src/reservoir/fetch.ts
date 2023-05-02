import originalFetch from 'node-fetch'
import fetchBuilder from 'fetch-retry-ts'
import logger from '../logger'

const RESERVOIR_URL = process.env.RESERVOIR_URL ?? 'https://api.reservoir.tools'
const RESERVOIR_API_KEY = process.env.RESERVOIR_API_KEY ?? ''

export interface FetchFromReservoirParams {
  url: string
  retries?: number
  retryDelay?: number
  retryOn?: number[]
}

export async function fetchFromReservoir<T>(
  params: FetchFromReservoirParams
): Promise<T> {
  const {
    url,
    retries = 5,
    retryDelay = 1000,
    retryOn = [419, 429, 503, 504],
  } = params
  //gives us exponential backoff and retries - see https://github.com/sjinks/node-fetch-retry-ts
  const fetch = fetchBuilder(originalFetch, {
    retries,
    retryDelay: (attempt: number) => {
      const delay = retryDelay * Math.pow(2, attempt)
      logger.warn(
        { app: 'utils', module: 'reservoir/fetch' },
        `Attempting to fetch again in ${delay}ms (${url})`
      )
      return delay
    },
    retryOn,
  })

  logger.info(`Fetching from Reservoir API: ${RESERVOIR_URL}${url}`)
  const response = await fetch(`${RESERVOIR_URL}${url}`, {
    headers: { 'X-API-Key': RESERVOIR_API_KEY },
  })

  if (!response.ok) {
    throw new Error(
      `Error fetching from Reservoir: ${response.status} (${url})`
    )
  }

  return (await response.json()) as T
}
