import originalFetch from 'node-fetch'
import fetchBuilder from 'fetch-retry-ts'
import logger from '../../logger'

const RESERVOIR_URL = process.env.RESERVOIR_URL ?? 'https://api.reservoir.tools'
const RESERVOIR_API_KEY = process.env.RESERVOIR_API_KEY ?? ''

export interface FetchFromReservoirParams {
  url: string
  retries?: number
  retryDelay?: number
  retryOn?: number[]
}

const fetch = fetchBuilder(originalFetch, {
  retries: 3,
  retryDelay: 1000,
  retryOn: [419, 503, 504]
})

export const fetchFromReservoir = async (
  params: FetchFromReservoirParams
): Promise<any> => {
  const {
    url,
    retries = 3,
    retryDelay = 1000,
    retryOn = [419, 503, 504]
  } = params
  //gives us exponential backoff and retries - see https://github.com/sjinks/node-fetch-retry-ts
  // const fetch = fetchBuilder(originalFetch, {
  //   retries,
  //   retryDelay,
  //   retryOn
  // })

  logger.info(`Fetching from Reservoir API: ${RESERVOIR_URL}${url}`)
  const response = await originalFetch(`${RESERVOIR_URL}${url}`, {
    headers: { 'X-API-Key': RESERVOIR_API_KEY }
  })

  if (!response.ok) {
    throw new Error(`Error fetching from Reservoir: ${response.status}`)
  }

  return await response.json()
}
