import { hex2buf } from '@storypoints/utils'
import { expect } from 'chai'

import { getOGNStake } from './ogn'

describe('@storypoints/ingest/wallet/ogn', () => {
  it('should get an OGN balance for an account - string', async () => {
    const amount = await getOGNStake(
      '0x57B0DD7967955c92b6e34A038b47Fee63E1eFd1a'
    )
    expect(amount).to.equal(862614969236140571356600n)
  })
  it('should get an OGN balance for an account - buffer', async () => {
    const amount = await getOGNStake(
      hex2buf('0x57B0DD7967955c92b6e34A038b47Fee63E1eFd1a')
    )
    expect(amount).to.equal(862614969236140571356600n)
  })
  it('should get an OGN balance for an account - ens name', async () => {
    const amount = await getOGNStake('joshfraser.eth')
    expect(amount).to.equal(862614969236140571356600n)
  })
})
