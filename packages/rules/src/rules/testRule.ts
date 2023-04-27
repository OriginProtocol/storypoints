import { IActivity } from '@storypoints/models'

import { RuleContext } from '@storypoints/rules'

// process.env.NODE_ENV === 'test' ||
const isTest = process.env.ENABLE_TEST_RULES === 'true'

// Test rule
export const name = 'testRule'
export async function run(
  ctx: RuleContext,
  act: IActivity
): Promise<RuleContext> {
  await Promise.resolve() // shutup eslint

  if (isTest && act.type === 'sale')
    return {
      ...ctx,
      multiplier: ctx.multiplier + 42,
      points: (ctx.points += Math.floor(+act.timestamp / 10000000)),
    }

  return ctx
}
