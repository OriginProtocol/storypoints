import { expect } from 'chai'
import nock from 'nock'
import {
  getSalesForTransactions,
  GetSalesForTransactionsParams,
  SalesQueryParams
} from '../../../src/lib/reservoir/royalties'
import { ReservoirActivity } from '../../../src/lib/reservoir/types'

describe('getSalesForTransactions', () => {
  const mockActivities = [
    { txHash: 'hash1' },
    { txHash: 'hash2' },
    { txHash: 'hash3' }
  ]
  const mockContractAddress = '0x123456789'
  const mockReservoirUrl = 'http://reservoir.com'
  const mockReservoirApiKey = 'my-api-key'

  beforeEach(() => {
    // Mock the HTTP requests using Nock
    nock(mockReservoirUrl)
      .get('/sales/v4')
      .query(true)
      .reply(200, { sales: [], continuation: null })

    nock(mockReservoirUrl)
      .get('/sales/v4')
      .query(true)
      .reply(200, { sales: [], continuation: 'token1' })

    nock(mockReservoirUrl)
      .get('/sales/v4')
      .query(true)
      .reply(200, { sales: [], continuation: 'token2' })

    nock(mockReservoirUrl)
      .get('/sales/v4')
      .query(true)
      .reply(200, {
        sales: [{ txHash: 'hash1', price: '100' }],
        continuation: 'token1'
      })

    nock(mockReservoirUrl)
      .get('/sales/v4')
      .query(true)
      .reply(200, {
        sales: [{ txHash: 'hash2', price: '200' }],
        continuation: 'token2'
      })

    nock(mockReservoirUrl)
      .get('/sales/v4')
      .query(true)
      .reply(200, {
        sales: [{ txHash: 'hash3', price: '300' }],
        continuation: null
      })

    // Set environment variables for RESERVOIR_URL and RESERVOIR_API_KEY
    process.env.RESERVOIR_URL = mockReservoirUrl
    process.env.RESERVOIR_API_KEY = mockReservoirApiKey
  })

  afterEach(() => {
    nock.cleanAll()
  })

  // it('should make a request with correct query parameters for the first iteration', async () => {
  //   const params: GetSalesForTransactionsParams = {
  //     contractAddress: mockContractAddress,
  //     activities: mockActivities
  //   }
  //   await getSalesForTransactions(params)
  //   const expectedParams: SalesQueryParams = { collection: mockContractAddress }

  //   expect(nock.isDone()).to.be.true
  //   const interceptor1 = nock.interceptors[0]
  //   expect(interceptor1.url).to.include(mockReservoirUrl)
  //   expect(interceptor1.req.headers['x-api-key']).to.equal(mockReservoirApiKey)
  //   expect(interceptor1.query).to.eql(expectedParams)

  //   const interceptor2 = nock.interceptors[1]
  //   expect(interceptor2.query).to.eql(expectedParams)
  // })

  // it('should make a request with correct query parameters for subsequent iterations', async () => {
  //   const params: GetSalesForTransactionsParams = {
  //     contractAddress: mockContractAddress,
  //     activities: mockActivities
  //   }
  //   await getSalesForTransactions(params)

  //   const expectedParams1: SalesQueryParams = {
  //     collection: mockContractAddress,
  //     continuation: 'token1'
  //   }
  //   const interceptor1 = nock.interceptors[2]
  //   expect(interceptor1.query).to.eql(expectedParams1)

  //   const expectedParams2: SalesQueryParams = {
  //     collection: mockContractAddress,
  //     continuation: 'token2'
  //   }
  //   const interceptor2 = nock.interceptors[3]
  //   expect(interceptor2.query).to.eql(expectedParams2)
  // })

  // it('should return all fetched sales up to the request limit', async () => {
  //   const params: GetSalesForTransactionsParams = {
  //     contractAddress: mockContractAddress,
  //     activities: mockActivities,
  //     requestLimit: 2
  //   }
  //   const result = await getSalesForTransactions(params)

  //   expect(result).to.eql([
  //     { txHash: 'hash1', price: '100' },
  //     { txHash: 'hash2', price: '200' }
  //   ])
  // })
})
