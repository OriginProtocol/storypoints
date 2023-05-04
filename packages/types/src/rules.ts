import { IActivity } from './interface'
import { ActivityType } from './reservoir'

/// Describes an adjustment to previous activities
export interface Adjustment {
  type: ActivityType
  reservoirOrderId: Buffer
  multiplier?: number
}

export interface RuleContext {
  valid: boolean // If false, points are invalidated and effectively 0
  reason?: string
  points: number // The amount of points awarded by the rules
  multiplier: number // The points multiplier
  adjustments: Adjustment[]
}

export type RuleFunction = (
  ctx: RuleContext,
  act: IActivity
) => Promise<RuleContext>

export interface IRule {
  name: string
  sourceURI: string
  run: RuleFunction
}
