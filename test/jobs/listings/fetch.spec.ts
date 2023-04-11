import { expect } from 'chai'
import nock from 'nock'
import {
  fetchFromReservoir,
  FetchFromReservoirParams
} from '../../../src/lib/reservoir/fetch'

import {
  getSalesForTransactions,
  GetSalesForTransactionsParams
} from '../../../src/lib/reservoir/royalties'

import { Sale, ReservoirActivity } from '../../../src/lib/reservoir/types'

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

  describe('getSalesForTransactions', () => {
    it('should fetch sales for given transactions', async () => {
      const contractAddress = '0x12345'

      const activities: Partial<ReservoirActivity>[] = [
        {
          // Mock a ReservoirActivity object
          txHash: 'tx1'
          // ...
        },
        {
          // Mock another ReservoirActivity object
          txHash: 'tx2'
          // ...
        }
      ]

      const salesResponse1: Sale[] = [
        {
          // Mock a Sale object
          txHash: 'tx1',
          feeBreakdown: [
            {
              kind: 'marketplace',
              bps: 50,
              recipient: '0x0000a26b00c1f0df003000390027140000faa719'
            }
          ]
          // ...
        }
      ]

      const salesResponse2: Sale[] = [
        {
          // Mock another Sale object
          txHash: 'tx2'
          // ...
        }
      ]

      const reservoirScope = nock(RESERVOIR_URL)
        .get('/sales/v4')
        .query(true)
        .reply(200, {
          sales: salesResponse1,
          continuation: 'continuationToken'
        })
        .get('/sales/v4')
        .query(true)
        .reply(200, { sales: salesResponse2, continuation: null })

      const getSalesParams: GetSalesForTransactionsParams = {
        contractAddress,
        activities
      }

      const result = await getSalesForTransactions(getSalesParams)

      console.log(result)

      expect(result).to.deep.equal([...salesResponse1, ...salesResponse2])
      reservoirScope.done()
    })
  })
})
