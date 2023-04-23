//chai tests for the listings jobs
import { expect } from 'chai'
import nock from 'nock'

import {
  fetchListings,
  getActivitiesUntilTxHash
} from './index'
import { listingsResponse } from '../../test/fixture/listings'

const {
  RESERVOIR_URL = 'https://api.reservoir.tools',
  RESERVOIR_API_KEY = ''
} = process.env

console.log(RESERVOIR_API_KEY)

describe('getActivitiesUntilTxHash', () => {
  const contractAddress = '0x123'

  beforeEach(() => {
    // Set up mock API endpoint
    nock(RESERVOIR_URL)
      .get('/collections/activity/v6')
      .matchHeader('x-api-key', RESERVOIR_API_KEY)
      .query({ collection: contractAddress, types: 'sale' })
      .reply(200, {
        activities: [
          { txHash: 'hash1' },
          { txHash: 'hash2' },
          { txHash: 'hash3' }
        ],
        continuation: 'continuationToken'
      })
      //second response
      .get('/collections/activity/v6')
      .matchHeader('x-api-key', RESERVOIR_API_KEY)
      .query({
        collection: contractAddress,
        types: 'sale',
        continuation: 'continuationToken'
      })
      .reply(200, {
        activities: [
          { txHash: 'hash4' },
          { txHash: 'desiredHash' },
          { txHash: 'hash6' }
        ],
        continuation: 'continuationToken2'
      })
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('should stop fetching after reaching requestLimit, even if hash not found', async () => {
    //third reponse
    nock(RESERVOIR_URL)
      .get('/collections/activity/v6')
      .matchHeader('x-api-key', RESERVOIR_API_KEY)
      .query({
        collection: contractAddress,
        types: 'sale',
        continuation: 'continuationToken2'
      })
      .reply(200, {
        activities: [{ txHash: 'third response' }]
      })

    const result = await getActivitiesUntilTxHash({
      contractAddress,
      txHash: 'nonexistent',
      requestLimit: 3
    })

    console.log('ASDFASFASDF', result)

    expect(result).to.have.lengthOf(7)
    expect(result[0].txHash).to.equal('hash1')
    expect(result[1].txHash).to.equal('hash2')
    expect(result[4].txHash).to.equal('desiredHash')
    expect(result[6].txHash).to.equal('third response')

    // Should have made 3 requests
    expect(nock.isDone()).to.equal(true)
  })

  it('should keep requesting until the request limit if a txHash is not provided', async () => {
    //third reponse
    nock(RESERVOIR_URL)
      .get('/collections/activity/v6')
      .matchHeader('x-api-key', RESERVOIR_API_KEY)
      .query({
        collection: contractAddress,
        types: 'sale',
        continuation: 'continuationToken2'
      })
      .reply(200, {
        activities: [{ txHash: 'third response' }],
        continuation: 'continuationToken3'
      })

    //fourth response
    nock(RESERVOIR_URL)
      .get('/collections/activity/v6')
      .matchHeader('x-api-key', RESERVOIR_API_KEY)
      .query({
        collection: contractAddress,
        types: 'sale',
        continuation: 'continuationToken3'
      })
      .reply(200, {
        activities: [{ txHash: 'final response' }]
      })

    const result = await getActivitiesUntilTxHash({
      contractAddress,
      requestLimit: 4
    })

    expect(result).to.have.lengthOf(8)
    expect(result[0].txHash).to.equal('hash1')
    expect(result[1].txHash).to.equal('hash2')
    expect(result[4].txHash).to.equal('desiredHash')
    expect(result[6].txHash).to.equal('third response')
    expect(result[7].txHash).to.equal('final response')

    // Should have made 4 requests
    expect(nock.isDone()).to.equal(true)
  })

  it('should load until the desired hash is found', async () => {
    const result = await getActivitiesUntilTxHash({
      contractAddress,
      txHash: 'desiredHash'
    })

    expect(result).to.have.lengthOf(6)
    expect(result[0].txHash).to.equal('hash1')
    expect(result[1].txHash).to.equal('hash2')
    expect(result[4].txHash).to.equal('desiredHash')
    expect(result[5].txHash).to.equal('hash6')
  })
})

describe('getSalesForTransactionIds', () => {})

describe('Listings processor', () => {
  afterEach(() => {
    nock.cleanAll()
  })

  describe('fetching listings from Reservoir', () => {
    const contractAddress = '0x123456789abcdef'

    it('should call the Reservoir API with the correct query params and API key', async () => {
      const params = {
        collection: contractAddress,
        types: 'sale'
      }

      const scope = nock(RESERVOIR_URL)
        .matchHeader('x-api-key', RESERVOIR_API_KEY)
        .get('/collections/activity/v6')
        .query(params)
        .reply(200, listingsResponse)

      await fetchListings(contractAddress)
      expect(scope.isDone()).to.be.true
    })

    it('should throw an exception if the Reservoir API is down', async () => {
      nock(RESERVOIR_URL)
        .get('/collections/activity/v6')
        .query(true)
        .reply(425, {
          error: 'Reservoir API is down'
        })

      try {
        await fetchListings(contractAddress)
        expect.fail('should have thrown an error')
      } catch (err) {
        if (err instanceof Error) {
          expect(err.message).equal('Error fetching from Reservoir: 425')
        } else {
          expect.fail('should have thrown a validation error')
        }
      }
    })
  })

  it('should fetch listings from Reservoir', async () => {
    // const contractAddress = '0x123456789abcdef'
    // const activity = await fetchLatestActivity(contractAddress)
    // expect(activity).to.be.an('array')
  })
})
