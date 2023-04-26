// nonce: 25
import { collectActivities } from '@storypoints/ingest'
import { Activity, Collection, Op, sequelize } from '@storypoints/models'
import { address, addressMaybe, hex2buf, logger } from '@storypoints/utils'
import { E_18, getOGN } from '@storypoints/utils/eth'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import express, { NextFunction, Request, Response } from 'express'

import * as inhand from './inhand'

const sqs = new SQSClient({ region: process.env.AWS_REGION })
const log = logger.child({
  app: 'api',
})
export const app = express()
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

app.use(express.json())

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
  '/simulate',
  awrap(async function (req: Request, res: Response): Promise<void> {
    await Promise.resolve() // shuddup eslint
    const body = req.body as {
      contractAddress?: string
      type?: string
      price?: string
      royalty?: string
      currency?: string
      expires: number
    }
    const contractAddress = inhand.address(body.contractAddress, '')
    const type = inhand.stringOptions(body.type, ['ask', 'bid'], '')
    //const fromAddress = inhand.address(body?.fromAddress)
    const price = inhand.bigint(body.price, BigInt(0))
    const royalty = inhand.bigint(body.royalty, BigInt(0))
    const currency = inhand.address(body.currency, '')
    const expires = inhand.integer(body.expires, +new Date())

    log.debug(
      { contractAddress, type, price, royalty, currency, expires },
      '/simulate'
    )

    res
      .status(200)
      .json({ success: true, score: Math.floor(Math.random() * 100_000) })
  })
)

app.get(
  '/leaders',
  awrap(async function (req: Request, res: Response): Promise<void> {
    const contractAddresses = inhand.addresses(
      req.query.contractAddress?.toString() ?? ''
    )
    const activityType = inhand.string(req.query.type?.toString() ?? '')
    const limit = inhand.integer(req.query.limit)
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

    const where: Record<string, unknown> = {
      points: {
        [Op.gt]: 0,
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
    /*if (since) {
      where.timestamp = {
        [Op.gte]: since,
      }
    }*/

    try {
      //await Activity.findAll()
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

    if (!walletAddress) {
      res.status(400).json({ error: 'Missing walletAddress' })
      return
    }

    const where: Record<string, unknown> = {
      walletAddress: hex2buf(walletAddress),
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

app.use(function (err: Error, req: Request, res: Response, next: NextFunction) {
  log.error(err, 'Error in express middleware')
  res.status(500).send('Something broke!')
  next()
})

app.listen(port, () => {
  log.info(`Server is running on port ${port}`)
})
