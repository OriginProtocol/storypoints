// nonce: 25
import { collectActivities } from '@storypoints/ingest'
import {
  Activity,
  Collection,
  IActivity,
  Op,
  sequelize,
} from '@storypoints/models'
import { scoreActivity } from '@storypoints/rules'
import {
  address,
  addressMaybe,
  buf2hex,
  hex2buf,
  logger,
  unixnow,
} from '@storypoints/utils'
import { E_18, getOGN } from '@storypoints/utils/eth'
import { ethToUSD } from '@storypoints/utils/exchangerate'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'

import * as inhand from './inhand'

const sqs = new SQSClient({ region: process.env.AWS_REGION })
const log = logger.child({
  app: 'api',
})
export const app = express()
const apiKey = process.env.API_KEY
const port = process.env.PORT ?? '3000'
const isProdEnv = !!process.env.APP_NAME
const isWorker = process.env.IS_WORKER === 'true'
const boostMultipliers: [bigint, number][] = [
  [E_18 * BigInt(500000), 2.5],
  [E_18 * BigInt(100000), 2.0],
  [E_18 * BigInt(50000), 1.5],
  [E_18 * BigInt(1000), 1.05],
  [BigInt('0'), 1.0],
]
const findBoost = (amount: bigint): number => {
  for (const [threshold, mplier] of boostMultipliers) {
    if (amount >= threshold) return mplier
  }

  return 1.0
}

app.use(cors())
app.use(express.json())

function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = req.headers['x-api-key'] as string
  if (key !== apiKey) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }
  next()
}

interface Leader {
  walletAddress: string
  name: string
  score?: number
}

type ExpressAsyncHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<unknown>

const awrap = (fn: ExpressAsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    return fn(req, res, next).catch(next) as unknown
  }
}

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Hello World!' })
})

app.post(
  '/simulate',
  awrap(async function (req: Request, res: Response): Promise<void> {
    const body = req.body as {
      contractAddress?: string
      type?: string
      price?: string
      royalty?: string
      currency?: string
      expires: number
    }
    const contractAddress = inhand.address(body.contractAddress, '')
    const type = inhand.stringOptions(
      body.type,
      ['ask', 'bid', 'ask_cancel', 'bid_cancel', 'sale'],
      ''
    )
    const price = inhand.bigint(body.price, BigInt(0))
    const royalty = inhand.bigint(body.royalty, BigInt(0))
    const currency = inhand.address(body.currency, '')
    const expires = inhand.integer(body.expires, +new Date())

    log.debug(
      { contractAddress, type, price, royalty, currency, expires },
      '/simulate'
    )

    const priceUSD = await ethToUSD(price)

    // Speculative IActivity details that rules are looking for
    const unow = unixnow()
    const act: IActivity = {
      multiplier: 1,
      points: 0,
      timestamp: new Date(),
      contractAddress: hex2buf(contractAddress),
      type,
      price: price.toString(),
      priceUSD: priceUSD,
      currency: hex2buf(currency),
      activityBlob: {
        order: {
          source: {
            domain: 'story.xyz',
          },
        },
      },
      orderBlob: {
        id: '0xdeadbeef',
        kind: type,
        side: 'sell',
        tokenSetId: '',
        tokenSetSchemaHash: '',
        maker: '',
        taker: '',
        price: {
          currency: {
            contract: currency,
          },
          amount: {
            raw: price.toString(),
            //usd:
          },
        },
        feeBreakdown: [
          {
            kind: 'royalty',
            //recipeient: '',
            bps: Number((royalty * 10000n) / price).valueOf(),
          },
        ],
        validFrom: unow,
        validUntil: expires,
        expiration: 0,
        createdAt: unow.toString(),
        updatedAt: unow.toString(),
      },
    }

    const score = await scoreActivity(act)

    res.status(200).json({ success: true, score })
  })
)

app.get(
  '/leaders',
  awrap(async function (req: Request, res: Response): Promise<void> {
    const contractAddresses = inhand.addresses(
      req.query.contractAddress?.toString() ?? ''
    )
    const activityType = inhand.string(req.query.type?.toString() ?? '')
    const limit = inhand.integer(req.query.limit, 100)
    const sortField = inhand.stringOptions(
      req.query.sortField?.toString() ?? '',
      ['score', 'walletAddress'],
      'score'
    )
    const sortDirection = inhand.stringOptions(
      req.query.sortDirection?.toString() ?? '',
      ['asc', 'desc'],
      'desc'
    )
    const start = inhand.date(req.query.start, new Date(0))
    const end = inhand.date(req.query.end, new Date())

    const where: Record<string, unknown> = {
      valid: true,
      points: {
        [Op.gt]: 0,
      },
      timestamp: {
        [Op.between]: [start, end],
      },
    }
    if (contractAddresses.length) {
      where.contractAddress = {
        [Op.in]: contractAddresses.map((a) => hex2buf(a)),
      }
    }
    if (activityType) {
      where.type = activityType
    }

    try {
      const activities = await Activity.findAll({
        where,
        attributes: [
          'walletAddress',
          [sequelize.literal('SUM(multiplier * points)'), 'score'],
        ],
        group: ['walletAddress'],
        order: [[sortField, sortDirection]],
        limit,
      })

      const leaders: Leader[] = activities.map((item) => {
        const leader: Leader = {
          walletAddress: address(item.walletAddress),
          // TODO: ENS
          name: '',
          score: item.getDataValue('score') as number,
        }
        return leader
      })

      res.status(200).json(leaders)
      return
    } catch (error) {
      log.error(error, 'Error while fetching leaders')
      res.status(500).json({ error: 'Internal Server Error' })
      return
    }
  })
)

app.get(
  '/user',
  awrap(async function (req: Request, res: Response): Promise<void> {
    const contractAddresses = inhand.addresses(
      req.query.contractAddress?.toString() ?? ''
    )
    const walletAddress = inhand.address(
      req.query.walletAddress?.toString() ?? '',
      ''
    )
    const activityType = inhand.string(req.query.type?.toString() ?? '')
    const start = inhand.date(req.query.start, new Date(0))
    const end = inhand.date(req.query.end, new Date())

    if (!walletAddress) {
      res.status(400).json({ error: 'Missing walletAddress' })
      return
    }

    const where: Record<string, unknown> = {
      walletAddress: hex2buf(walletAddress),
      timestamp: {
        [Op.between]: [start, end],
      },
    }
    if (contractAddresses.length) {
      where.contractAddress = {
        [Op.in]: contractAddresses.map((a) => hex2buf(a)),
      }
    }
    if (activityType) {
      where.type = activityType
    }

    try {
      const userRes = await Activity.findAll({
        where,
        attributes: [[sequelize.literal('SUM(multiplier * points)'), 'score']],
      })

      if (!userRes.length) {
        res.status(200).json({
          result: { points: 0, boost: 0, stake: BigInt(0).toString() },
        })
        return
      }

      const points = (userRes[0].getDataValue('score') as number | null) ?? 0

      const ogn = getOGN()
      const stake = (await ogn.balanceOf(walletAddress)) as bigint
      const boost = findBoost(stake)

      res
        .status(200)
        .json({ result: { points, boost, stake: stake.toString() } })
      return
    } catch (error) {
      log.error(error, 'Error while getting user details')
      res.status(500).json({ error: 'Internal Server Error' })
      return
    }
  })
)

const fetchHandler = awrap(async function (
  req: Request,
  res: Response
): Promise<void> {
  const body = req.body as {
    full?: boolean
    contractAddresses?: string[]
    requestLimit?: number
  }
  const fullHistory = body.full === true
  const requestLimit = body.requestLimit ?? 10
  const contractAddresses = (body.contractAddresses ?? [])
    .map(addressMaybe)
    .filter((x) => x)

  try {
    for (const contractAddress of contractAddresses) {
      await collectActivities({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        contractAddress: contractAddress!,
        fullHistory,
        requestLimit,
      })
    }
  } catch (err) {
    // console.error(err)
    log.error(err, 'Error fetching listings in fetchHandler')
    res.status(500).json({ success: false, message: 'Internal server error' })
    return
  }

  res.status(200).json({ success: true })
})

if (isWorker) {
  app.post('/', fetchHandler)
} else if (!isProdEnv) {
  // Conditional local runner
  app.post('/fetch', fetchHandler)
}

// Add a collection
// TODO: Needs auth
app.post(
  '/collection',
  apiKeyMiddleware,
  awrap(async function (req: Request, res: Response): Promise<void> {
    const body = req.body as {
      contractAddress: string
      description?: string
      disabled?: boolean
    }
    const contractAddress = addressMaybe(body.contractAddress)
    const { disabled = false, description = '' } = body

    if (!contractAddress) {
      const msg = 'Invalid contractAddress'
      log.warn({ contractAddress }, msg)
      res.status(400).json({ error: msg })
      return
    }

    const props = {
      description,
      disabled,
    }
    const [collection, created] = await Collection.findOrCreate({
      where: { contractAddress: hex2buf(contractAddress) },
      defaults: {
        ...props,
        contractAddress: hex2buf(contractAddress),
      },
    })

    if (!created) {
      await collection.update(props)
    }

    res.status(200).json({
      success: true,
      message: created ? 'Created collection' : 'Updated collection',
    })
  })
)

// Trigger a fetch sequence
// TODO: Do we want this exposed in prod?  Periodic beanstalk task?
app.post(
  '/trigger',
  apiKeyMiddleware,
  awrap(async function (req: Request, res: Response): Promise<void> {
    const body = req.body as { full?: boolean; contractAddresses?: string[] }
    const fullHistory = body.full === true
    const contractAddresses = (body.contractAddresses ?? [])
      .filter((x) => x)
      .map(addressMaybe)

    if (!contractAddresses.length) {
      const msg = 'Invalid contractAddress'
      log.warn({ contractAddresses }, msg)
      res.status(400).json({ error: msg })
      return
    }

    const { APP_NAME = 'storypoints', WORKER_QUEUE_URL } = process.env
    if (!WORKER_QUEUE_URL) throw new Error(`WORKER_QUEUE_URL is not defined`)
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: WORKER_QUEUE_URL,
        MessageBody: JSON.stringify({
          contractAddresses,
          fullHistory,
        }),
        MessageGroupId: `${APP_NAME}-worker`,
      })
    )

    res.status(200).json({ success: true, message: 'WORKER JOB!' })
  })
)

app.post(
  '/rescore',
  apiKeyMiddleware,
  awrap(async function (req: Request, res: Response): Promise<void> {
    const body = req.body as {
      start?: number
      end?: number
      contractAddresses?: string[]
    }
    const { start, end } = body
    const contractAddresses = (body.contractAddresses ?? [])
      .filter((x) => x)
      .map(addressMaybe)

    if (!contractAddresses.length) {
      const msg = 'Invalid contractAddress'
      log.warn({ contractAddresses }, msg)
      res.status(400).json({ error: msg })
      return
    }

    const startStamp = start ? new Date(start) : 0
    const endStamp = end ? new Date(end) : new Date()

    const where = {
      contractAddress: {
        [Op.in]: contractAddresses.map((a) => hex2buf(a)),
      },
      timestamp: {
        [Op.between]: [startStamp, endStamp],
      },
    }
    console.log('where:', where)

    const activities = await Activity.findAll({
      where,
    })

    log.debug(`Potentially rescoring ${activities.length} activities.`)

    for (const act of activities) {
      const score = await scoreActivity(act)
      if (
        act.multiplier !== score.multiplier ||
        act.points !== score.points ||
        act.valid !== score.valid
      ) {
        log.debug(
          `Rescoring activity ${
            act.activityHash ? buf2hex(act.activityHash) : 'UNK'
          }`
        )
        await act.update({
          multiplier: score.multiplier,
          points: score.points,
          valid: score.valid,
        })
      }
    }

    log.info(
      `Completed rescoring activities between ${startStamp.toString()} and ${endStamp.toString()}`
    )

    res.status(200).json({ success: true })
  })
)

app.use(function (err: Error, req: Request, res: Response, next: NextFunction) {
  log.error(err, 'Error in express middleware')
  res.status(500).send('Something broke!')
  next()
})

app.listen(port, () => {
  log.info(`Server is running on port ${port}`)
})
