import { EventModel } from '../../src'
import { expect } from 'chai'

describe('Event', () => {
  it('should be a function', () => {
    expect(EventModel).to.be.a('function')
  })

  it('should create an event', () => {
    const event = EventModel('test')

    expect(event).to.be.an('object')
    expect(event).to.have.property('name', 'test')
    expect(event).to.have.property('age')
  })
})