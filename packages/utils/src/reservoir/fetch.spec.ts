import { expect } from 'chai'
import nock from 'nock'
import { fetchFromReservoir } from './fetch'

const { RESERVOIR_URL = 'https://api.reservoir.tools' } = process.env

describe('Reservoir API', () => {
  afterEach(() => {
    nock.cleanAll()
  })

  describe('fetchFromReservoir', () => {
    afterEach(() => {
      nock.cleanAll()
    })

    it('should fetch data from the Reservoir API', async () => {
      const url = '/test'
      const expectedResult = { data: 'test' }

      nock(RESERVOIR_URL).get(url).reply(200, expectedResult)

      const result = await fetchFromReservoir({ url })

      expect(result).to.deep.equal(expectedResult)
    })
  })
})
