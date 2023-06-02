import { IActivity } from '@origin/storypoints-types'

import { address } from '../address'

/// Return Reservoir format tokenSetId given an activity
export function getTokenSetId(activity: IActivity): string | undefined {
  if (!activity.activityBlob.token?.tokenId) return
  return `token:${address(activity.contractAddress).toLowerCase()}:${
    activity.activityBlob.token.tokenId
  }`
}
