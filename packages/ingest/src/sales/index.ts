import { fetchFromReservoir } from '@storypoints/utils/reservoir'
import { GetSalesResponse, IActivity, ReservoirSale } from '@storypoints/types'
import { buf2hex, logger } from '@storypoints/utils'

const log = logger.child({ app: 'ingest', module: 'sales' })

/// Fetch an order (bid) form Reservoir
export async function fetchSale(
  txHash: string,
  reservoirOrderId: string
): Promise<ReservoirSale | undefined> {
  const params = new URLSearchParams({
    txHash,
  })
  const url = `/sales/v4?${params.toString()}`

  log.debug(`Fetching ${url}`)

  const json = await fetchFromReservoir<GetSalesResponse>({
    url,
  })

  return (json.sales ?? []).find((s) => s.orderId === reservoirOrderId)
}

/// Add salesBlob to an activity
export async function addSaleBlob(activity: IActivity): Promise<IActivity> {
  if (!(activity.activityBlob.txHash && activity.reservoirOrderId))
    return activity

  activity.saleBlob = await fetchSale(
    activity.activityBlob.txHash,
    buf2hex(activity.reservoirOrderId)
  )

  return activity
}
