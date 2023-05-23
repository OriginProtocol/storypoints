import { processReservoirActivity } from '@storypoints/ingest'
import { ReservoirCollectionActivity } from '@storypoints/types'
import { getProvider } from '@storypoints/utils'

const out = (a: unknown) =>
  process.stdout.write(JSON.stringify(a, null, 2) + '\n')

const activityJSON = `{
  "type": "sale",
  "fromAddress": "0xb659bee47bee9092a9e083b13b5188d4c0f49b4c",
  "toAddress": "0xf92aaa76e61af8dd5e1efc888eaceb229d4a6795",
  "price": {
    "currency": {
      "contract": "0x0000000000000000000000000000000000000000",
      "name": "Ether",
      "symbol": "ETH",
      "decimals": 18
    },
    "amount": {
      "raw": "100000000000000000",
      "decimal": 0.1,
      "usd": 180.49291,
      "native": 0.1
    }
  },
  "amount": 1,
  "timestamp": 1684601928,
  "createdAt": "2023-05-20T16:58:55.643Z",
  "contract": "0xd5170616689ed19d2697ffdac2cd95da50f25d5c",
  "token": {
    "tokenId": "0",
    "tokenName": "POGMAN PFP #0",
    "tokenImage": "https://i.seadn.io/gcs/files/bd0fe383fe26006457579550cfaa7f34.png?w=500&auto=format"
  },
  "collection": {
    "collectionId": "0xd5170616689ed19d2697ffdac2cd95da50f25d5c",
    "collectionImage": null,
    "collectionName": "POGs"
  },
  "txHash": "0x9801bb594966642087939312d8e52f3211fb8cb37508fae76844fe35479804c6",
  "logIndex": 123,
  "batchIndex": 1,
  "order": {
    "id": "0x2cf5af32dc7f7b7aa53c16a804b557a5f2f405c7bbede44dcf66dcc929422347",
    "side": "ask",
    "source": {
      "domain": "opensea.io",
      "name": "OpenSea",
      "icon": "https://raw.githubusercontent.com/reservoirprotocol/indexer/v5/src/models/sources/opensea-logo.svg"
    },
    "criteria": {
      "kind": "token",
      "data": {
        "token": {
          "tokenId": "0",
          "name": "POGMAN PFP #0",
          "image": "https://i.seadn.io/gcs/files/bd0fe383fe26006457579550cfaa7f34.png?w=500&auto=format"
        },
        "collection": {
          "id": "0xd5170616689ed19d2697ffdac2cd95da50f25d5c",
          "name": "POGs",
          "image": null
        }
      }
    }
  }
}`

;(function () {
  out('processActivity main()')
  const provider = getProvider()
  const act = JSON.parse(activityJSON) as ReservoirCollectionActivity
  processReservoirActivity(act, {
    provider,
    simulate: true,
    cliout: out,
  }).catch(out)
})()
