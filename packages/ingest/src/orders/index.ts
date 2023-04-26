/**
 * Fetches order data Reservoir
 */

import { IActivity } from '@storypoints/models'
import {
  fetchFromReservoir,
  GetOrderResponse,
  ReservoirOrder,
} from '@storypoints/utils/reservoir'
import { logger } from '@storypoints/utils'

const log = logger.child({ app: 'ingest', module: 'orders' })

// Fetch an order (ask) form Reservoir
export async function fetchOrderAsk(
  orderId: string
): Promise<ReservoirOrder | undefined> {
  const params = new URLSearchParams({
    id: orderId,
  })
  const url = `/orders/asks/v4?${params.toString()}`

  log.debug(`Fetching ${url}`)

  const json = await fetchFromReservoir<GetOrderResponse>({
    url,
  })

  return json.orders?.[0]
}

// Fetch an order (bid) form Reservoir
export async function fetchOrderBid(
  orderId: string
): Promise<ReservoirOrder | undefined> {
  const params = new URLSearchParams({
    id: orderId,
  })
  const url = `/orders/bids/v4?${params.toString()}`

  log.debug(`Fetching ${url}`)

  const json = await fetchFromReservoir<GetOrderResponse>({
    url,
  })

  return json.orders?.[0]
}

// Add an orderBlob and an IActivity
export async function addOrderBlob(activity: IActivity): Promise<IActivity> {
  const orderId = activity.activityBlob.order?.id

  if (!orderId) return activity

  let order = await fetchOrderAsk(orderId)

  if (!order) {
    order = await fetchOrderBid(orderId)

    if (!order) {
      return activity
    }
  }

  activity.orderBlob = order

  return activity
}
