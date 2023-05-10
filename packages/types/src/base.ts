export interface Price {
  amount?: string
  currency?: Buffer
  amountUSD?: number
}

export type Primitive = string | number | boolean | null | undefined
export type JSONValue =
  | Primitive
  | Primitive[]
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  | { [k: string]: Primitive | { [k: string]: Primitive } }
export type JSONObject = Record<string, JSONValue>
