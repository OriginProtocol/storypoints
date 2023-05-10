import { IActivity, IRule, RuleContext, RuleFunction } from '@storypoints/types'
import { buf2hex, isDir, logger } from '@storypoints/utils'
import fs from 'fs/promises'
import path from 'path'

const log = logger.child({ app: 'rules' })
let RULES_CACHE: IRule[] = []

/// Load rules for scoring that are part of this module
async function loadModuleRules(): Promise<IRule[]> {
  const rulesDir = path.resolve(__dirname, 'rules')
  const secretRulesDir = path.resolve(__dirname, 'secret')
  const publicRuleFiles = (await fs.readdir(rulesDir)).map((f) =>
    path.join(rulesDir, f)
  )

  let secretRuleFiles: string[] = []
  if (await isDir(secretRulesDir)) {
    secretRuleFiles = (await fs.readdir(secretRulesDir)).map((f) =>
      path.join(secretRulesDir, f)
    )
  }
  const ruleFiles = publicRuleFiles
    .concat(secretRuleFiles)
    .filter((f) => f.endsWith('.js') || f.endsWith('.ts'))

  const rules = []
  for (const rulePath of ruleFiles) {
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
    RULES_CACHE = await loadModuleRules()
  }
  return RULES_CACHE
}

/// Return a score for an activity
export async function scoreActivity(activity: IActivity): Promise<RuleContext> {
  const rules = await loadRules()
  let ctx: RuleContext = {
    valid: true,
    multiplier: 1,
    points: 0,
    adjustments: [],
  }

  let isInvalid = false
  for (const rule of rules) {
    ctx = await rule.run(ctx, activity)

    log.debug(ctx, `Rule ${rule.name} executed`)

    if (!ctx.valid && !isInvalid) {
      log.debug(
        `Rules ${rule.name} has invalidated activity ${
          activity.activityHash ? buf2hex(activity.activityHash) : 'UNK'
        }`
      )
      isInvalid = true
    }
  }

  return ctx
}

export { IRule, RuleContext, RuleFunction }
