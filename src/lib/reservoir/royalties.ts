import { ReservoirActivity, Sale } from './types'
import { fetchFromReservoir } from './fetch'

export type GetSalesForTransactionsParams = {
  contractAddress: string
  activities: ReservoirActivity[]
  requestLimit?: number
}

export type SalesQueryParams = {
  collection: string
  continuation?: string
}

export const getSalesForTransactions = async (
  params: GetSalesForTransactionsParams
): Promise<Sale[]> => {
  const { contractAddress, activities, requestLimit = 10 } = params

  // Initialize variables for storing sales data, fetching them and terminating loop when limit is reached
  let sales: Sale[] = []
  let continuationToken: string | null = null
  let isDone = false
  let requestCount = 0
  let limitReached = false

  // Create an array of txHashes for each activity
  const activityTxHashes = activities.map((activity) => activity.txHash)

  // Loop through the sales data
  while (!isDone && !limitReached) {
    // Define query parameters to fetch sales for given collection/contract address
    const queryParams: SalesQueryParams = {
      collection: contractAddress
    }

    // Add a continuation token if there is any (for pagination)
    if (continuationToken) {
      queryParams.continuation = continuationToken
    }

    requestCount += 1

    // Create URL for API call with necessary params
    const params = new URLSearchParams(queryParams)
    const url = `/sales/v4?${params.toString()}`

    // Fetch data from OpenSea
    const json = await fetchFromReservoir({ url })

    // New sales fetched
    const newSales: Sale[] = json.sales || []

    // Collect all sales
    sales = [...sales, ...newSales]

    // Store current continuation token
    continuationToken = json.continuation

    // Check if we have fetched sales for all the given activities
    isDone = activityTxHashes.every((txHash) =>
      sales.some((sale) => sale.txHash === txHash)
    )

    // Check if we have hit our request limit
    limitReached = requestCount >= requestLimit
  }

  return sales // Return all fetched sales
}
