import { hex2buf } from '@storypoints/utils'
import { expect } from 'chai'

import { loadRules, scoreActivity } from './index'
import { RuleContext } from './types'

describe('@storypoints/rules', () => {
  beforeEach(() => {})

  afterEach(() => {})

  it('should load rules from fs', async () => {
    const rules = await loadRules()
    expect(rules.length).to.equal(1)
  })

  it('should score an activity', async () => {
    const activity = {
      contractAddress: hex2buf('0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63'),
      currency: hex2buf('0x0000000000000000000000000000000000000000'),
      points: 0,
      multiplier: 1,
      price: '100000000000000000', // 0.1 ETH
      timestamp: new Date(),
      type: 'sale',
      walletAddress: hex2buf('0x9a04a8c79ceb0889bdd12acdf3fa9d207ed3ff52'),
    }

    const ctx = await scoreActivity(activity)
    expect(ctx.valid).to.be.true
    expect(ctx.points).to.equal(Math.floor(+activity.timestamp / 10000000))
    expect(ctx.multiplier).to.equal(42)
  })
})
