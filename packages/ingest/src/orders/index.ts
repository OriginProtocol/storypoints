/**
 * Fetches order data Reservoir
 */

import { fetchFromReservoir } from '@origin/storypoints-utils/reservoir'
import {
  GetOrderResponse,
  IActivity,
  ReservoirOrder,
} from '@origin/storypoints-types'
import { buf2hex, logger } from '@origin/storypoints-utils'

const log = logger.child({ app: 'ingest', module: 'orders' })

// Fetch an order (ask) form Reservoir
export async function fetchOrderAsk(
  orderId: string
): Promise<ReservoirOrder | undefined> {
  const params = new URLSearchParams({
    ids: orderId,
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
    ids: orderId,
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
  if (!activity.activityBlob.order) return activity

  let order
  const { id, side } = activity.activityBlob.order

  if (!id) {
    log.warn(
      {
        activityHash: activity.activityHash
          ? buf2hex(activity.activityHash)
          : 'UNK',
      },
      'Order on activity is missing id!'
    )
    return activity
  }

  if (side === 'ask') {
    order = await fetchOrderAsk(id)
  } else if (side === 'bid') {
    order = await fetchOrderBid(id)
  } else {
    // Try both? Probably a dead code path but the types say otherwise
    order = await fetchOrderAsk(id)

    if (!order) {
      order = await fetchOrderBid(id)
    }
  }

  if (order) {
    activity.orderBlob = order
  }

  return activity
}
