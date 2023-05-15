// Date utilities

/// Convert unix timestamp to JS Date object
export function unixToJSDate(unix: number): Date {
  return new Date(unix * 1000)
}

/// Convert JS Date object to unix timestamp
export function dateToUnix(dt: Date): number {
  return Math.floor(+dt / 1000)
}

/// Get the current datetime as a unix timestamp
export function unixnow(): number {
  return dateToUnix(new Date())
}
