// test/leader.test.ts

//import {Event} from '@origin/storypoints-models'
import { unixnow } from '@origin/storypoints-utils'
import { expect } from 'chai'
import supertest from 'supertest'
import { Sequelize } from 'sequelize'

import { app } from './index'

const request = supertest(app)

/*describe('/leaders endpoint', () => {
  before(async () => {
    // Create fake Event data
    await Event.bulkCreate([
      {
        points: 10,
        currency: 'USD',
        price: 100,
        type: 'A',
        contractAddress: '0x123',
        walletAddress: '0xABC',
        eventHash: 'hash1',
        timestamp: new Date(),
        ognStakedMultiplier: 1,
        collectionVolumeMultiplier: 1,
        moderationMultiplier: 1,
        description: 'Event 1',
      },
      {
        points: 20,
        currency: 'USD',
        price: 200,
        type: 'B',
        contractAddress: '0x123',
        walletAddress: '0xABC',
        eventHash: 'hash2',
        timestamp: new Date(),
        ognStakedMultiplier: 1,
        collectionVolumeMultiplier: 1,
        moderationMultiplier: 1,
        description: 'Event 2',
      },
      {
        points: 30,
        currency: 'USD',
        price: 300,
        type: 'A',
        contractAddress: '0x456',
        walletAddress: '0xDEF',
        eventHash: 'hash3',
        timestamp: new Date(),
        ognStakedMultiplier: 1,
        collectionVolumeMultiplier: 1,
        moderationMultiplier: 1,
        description: 'Event 3',
      },
    ])
  })

  after(async () => {
    // Clean up the fake data
    await Event.destroy({ where: {} })
  })

  it('should return aggregated data for all events', async () => {
    const response = await request.get('/leaders')
    expect(response.status).to.equal(200)
    expect(response.body.length).to.equal(2)
    expect(response.body).to.deep.include({
      walletAddress: '0xABC',
      pointsSum: 30,
      priceSum: 300,
    })
    expect(response.body).to.deep.include({
      walletAddress: '0xDEF',
      pointsSum: 30,
      priceSum: 300,
    })
  })

  it('should return aggregated data filtered by contract address', async () => {
    const response = await request.get('/leaders?contractAddress=0x123')
    expect(response.status).to.equal(200)
    expect(response.body.length).to.equal(1)
    expect(response.body).to.deep.include({
      walletAddress: '0xABC',
      pointsSum: 30,
      priceSum: 300,
    })
  })

  it('should return aggregated data filtered by event type', async () => {
    const response = await request.get('/leaders?type=A')
    expect(response.status).to.equal(200)
    expect(response.body.length).to.equal(2)
    expect(response.body).to.deep.include({
      walletAddress: '0xABC',
      pointsSum: 10,
      priceSum: 100,
    })
    expect(response.body).to.deep.include({
      walletAddress: '0xDEF',
      pointsSum: 30,
      priceSum: 300,
    })
  })

  it('should return aggregated data filtered by timestamp', async () => {
    const sinceTimestamp = Math.floor(Date.now() / 1000) - 60 * 60 * 24 // 24 hours ago
    const response = await request.get(`/leaders?since=${sinceTimestamp}`)
    expect(response.status).to.equal(200)
    expect(response.body.length).to.equal(2)
    expect(response.body).to.deep.include({
      walletAddress: '0xABC',
      pointsSum: 30,
      priceSum: 300,
    })
    expect(response.body).to.deep.include({
      walletAddress: '0xDEF',
      pointsSum: 30,
      priceSum: 300,
    })
  })
})*/

interface SimulateResponseBody {
  success: boolean
  score: {
    valid: boolean
    multiplier: number
    points: number
  }
}

describe('/simulate endpoint', function () {
  before(async () => {})

  after(async () => {})

  it.only('should score an ask', async function () {
    const response = await request
      .post('/simulate')
      .send({
        contractAddress: '0x3bf2922f4520a8BA0c2eFC3D2a1539678DaD5e9D',
        tokenId: '6954',
        type: 'ask',
        // actual price: '728000000000000000',
        price: '700000000000000000',
        royalty: '7280000000000000', // 1%
        currency: '0x0000000000000000000000000000000000000000',
        expires: unixnow() + 60 * 60 * 24 * 7,
      })
      .expect(200)

    const body = response.body as SimulateResponseBody
    console.log('body:', body)
    expect(body.success).to.be.true
    expect(body.score.valid).to.be.true
    expect(body.score.multiplier).to.be.above(1)
    expect(body.score.multiplier).to.be.below(40)
    expect(body.score.points).to.be.above(1)
    expect(body.score.points).to.be.below(1000)
    expect(body.score.points).to.be.above(1)
  })

  it('should score a sale', async () => {
    const response = await request
      .post('/simulate')
      .send({
        contractAddress: '0x3bf2922f4520a8BA0c2eFC3D2a1539678DaD5e9D',
        type: 'sale',
        price: '665000000000000000',
        royalty: '6650000000000000', // 1%
        currency: '0x0000000000000000000000000000000000000000',
        expires: unixnow() + 60 * 60 * 24 * 7,
      })
      .expect(200)
    const body = response.body as SimulateResponseBody
    console.log('body:', body)
    expect(body.success).to.be.true
    expect(body.score.valid).to.be.true
    expect(body.score.multiplier).to.be.above(1)
    expect(body.score.multiplier).to.be.below(40)
    expect(body.score.points).to.be.above(1)
    expect(body.score.points).to.be.below(1000)
    expect(body.score.points).to.be.above(1)
  })
})
