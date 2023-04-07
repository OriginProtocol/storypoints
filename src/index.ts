export interface Event {
  name: string
  age: number
}

export function EventModel(name: string): Event {
  console.log('hello world')

  return {
    name,
    age: 18
  } as Event
}
