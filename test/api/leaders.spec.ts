// test/leader.test.ts

import { expect } from 'chai'
import supertest from 'supertest'
import EventDefinition from '../../src/models/event'
import { Sequelize } from 'sequelize'
import { app } from '../../src/api/index'

const sequelize = new Sequelize({
  username: 'ed',
  password: undefined,
  database: 'points_test',
  host: '127.0.0.1',
  dialect: 'postgres',
  logging: false
})

const Event = EventDefinition(sequelize)

const request = supertest(app)

describe('/leaders endpoint', () => {
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
        description: 'Event 1'
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
        description: 'Event 2'
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
        description: 'Event 3'
      }
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
      priceSum: 300
    })
    expect(response.body).to.deep.include({
      walletAddress: '0xDEF',
      pointsSum: 30,
      priceSum: 300
    })
  })

  it('should return aggregated data filtered by contract address', async () => {
    const response = await request.get('/leaders?contractAddress=0x123')
    expect(response.status).to.equal(200)
    expect(response.body.length).to.equal(1)
    expect(response.body).to.deep.include({
      walletAddress: '0xABC',
      pointsSum: 30,
      priceSum: 300
    })
  })

  it('should return aggregated data filtered by event type', async () => {
    const response = await request.get('/leaders?type=A')
    expect(response.status).to.equal(200)
    expect(response.body.length).to.equal(2)
    expect(response.body).to.deep.include({
      walletAddress: '0xABC',
      pointsSum: 10,
      priceSum: 100
    })
    expect(response.body).to.deep.include({
      walletAddress: '0xDEF',
      pointsSum: 30,
      priceSum: 300
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
      priceSum: 300
    })
    expect(response.body).to.deep.include({
      walletAddress: '0xDEF',
      pointsSum: 30,
      priceSum: 300
    })
  })
})
