import { IActivity } from '@storypoints/models'
import { logger } from '@storypoints/utils'
import fs from 'fs/promises'
import path from 'path'

import { IRule, RuleContext, RuleFunction } from './types'

const log = logger.child({ app: 'rules' })
let RULES_CACHE: IRule[] = []

/// Load rules from an S3 bucket
async function loadBucketRules(): Promise<IRule[]> {
  // TODO
  await Promise.resolve()
  return []
}

/// Load rules for scoring that are part of this module
async function loadModuleRules(): Promise<IRule[]> {
  const rulesDir = path.resolve(__dirname, 'rules')
  const ruleFiles = await fs.readdir(rulesDir)
  const rules = []

  for (const rule of ruleFiles) {
    const rulePath = path.join(rulesDir, rule)
    log.debug(`Importing rule @ ${rulePath}`)
    const ruleModule = (await import(rulePath)) as {
      name: string
      run: RuleFunction
    }

    log.debug(`Loaded rule ${ruleModule.name}`)

    rules.push({
      name: ruleModule.name,
      sourceURI: `file://${rulePath}`,
      run: ruleModule.run,
    })
  }

  return rules
}

/// Load rules for scoring
export async function loadRules(): Promise<IRule[]> {
  if (RULES_CACHE.length < 1) {
    RULES_CACHE = (await loadModuleRules()).concat(await loadBucketRules())
  }
  return RULES_CACHE
}

/// Return a score for an activity
export async function scoreActivity(activity: IActivity): Promise<RuleContext> {
  const rules = await loadRules()
  let ctx: RuleContext = {
    valid: true,
    multiplier: 0,
    points: 0,
  }

  for (const rule of rules) {
    ctx = await rule.run(ctx, activity)
  }

  return ctx
}

export { IRule, RuleContext, RuleFunction }
