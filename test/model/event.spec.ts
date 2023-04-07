import { expect } from 'chai'
import { Sequelize, ValidationError } from 'sequelize'
import EventDefinition from '../../src/models/event'

describe('Event model', () => {
  const sequelize = new Sequelize({
    username: 'ed',
    password: undefined,
    database: 'points_test',
    host: '127.0.0.1',
    dialect: 'postgres',
    logging: false
  })

  const Event = EventDefinition(sequelize)

  beforeEach(async () => {
    await Event.truncate()
  })

  after(async () => {
    await sequelize.close()
  })

  it('should generate event hash on beforeCreate hook', async () => {
    const event = await Event.create({
      type: 'test-type',
      walletAddress: '0x123456789abcdef',
      contractAddress: '0x987654321fedcba',
      points: 123
    })

    expect(event.eventHash).equal(
      'test-type-0x123456789abcdef-0x987654321fedcba'
    )
  })

  it('should not generate event hash on beforeCreate hook if eventHash is already set', async () => {
    const event = await Event.create({
      type: 'test-type',
      walletAddress: '0x123456789abcdef',
      contractAddress: '0x987654321fedcba',
      points: 123,
      eventHash: 'test-hash'
    })

    expect(event.eventHash).equal('test-hash')
  })

  it('should not allow the same hash to be created twice (auto-generated hashes)', async () => {
    const eventData = {
      type: 'test-type',
      walletAddress: '0x123456789abcdef',
      contractAddress: '0x987654321fedcba',
      points: 123
    }

    //create the same event twice, make sure the second creation fails
    await Event.create(eventData)

    try {
      await Event.create(eventData)
      expect.fail('should have thrown an error')
    } catch (err) {
      if (err instanceof ValidationError) {
        expect(err.message).equal('Validation error')
      } else {
        expect.fail('should have thrown a validation error')
      }
    }
  })

  it('should not allow the same hash to be created twice (specified hashes)', async () => {
    const eventData = {
      type: 'test-type',
      walletAddress: '0x123456789abcdef',
      contractAddress: '0x987654321fedcba',
      points: 123,
      eventHash: 'test-hash'
    }

    //create the same event twice, make sure the second creation fails
    const event = await Event.create(eventData)

    expect(event.eventHash).equal('test-hash')

    try {
      await Event.create(eventData)
      expect.fail('should have thrown an error')
    } catch (err) {
      if (err instanceof ValidationError) {
        expect(err.message).equal('Validation error')
      } else {
        expect.fail('should have thrown a validation error')
      }
    }
  })
})
