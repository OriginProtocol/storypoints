import { hex2buf } from '@origin/storypoints-utils'
import { expect } from 'chai'

import { resolveENS } from './name'

describe.skip('@origin/storypoints-ingest/wallet/name', () => {
  it('should resolve an address to ENS name - string', async () => {
    const name = await resolveENS('0x57B0DD7967955c92b6e34A038b47Fee63E1eFd1a')
    expect(name).to.equal('joshfraser.eth')
  })
  it('should resolve an address to ENS name - Buffer', async () => {
    const name = await resolveENS(
      hex2buf('0x57B0DD7967955c92b6e34A038b47Fee63E1eFd1a')
    )
    expect(name).to.equal('joshfraser.eth')
  })
})
