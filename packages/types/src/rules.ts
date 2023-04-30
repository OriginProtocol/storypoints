import { IActivity } from './interface'

export interface RuleContext {
  valid: boolean // If false, points are invalidated and effectively 0
  points: number // The amount of points awarded by the rules
  multiplier: number // The points multiplier
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
