// nonce: 45
import { collectActivities, updateWallets } from '@storypoints/ingest'
import {
  Activity,
  Collection,
  Op,
  Wallet,
  sequelize,
} from '@storypoints/models'
import { scoreActivity } from '@storypoints/rules'
import {
  address,
  addressMaybe,
  buf2hex,
  dateToUnix,
  hex2buf,
  logger,
} from '@storypoints/utils'
import { E_18, getOGN } from '@storypoints/utils/eth'
import { fetchFromReservoir } from '@storypoints/utils/reservoir'
import { GetCollectionActivityResponse } from '@storypoints/types'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'

import * as inhand from './inhand'

type Primitive = string | number | boolean | null
type JSONValue = Primitive | Primitive[] | Record<string, Primitive>
type JSONObject = Record<string, JSONValue>

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
const workerStamp: Record<string, number> = {}

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
  boost?: number
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

app.get(
  '/leaders',
  awrap(async function (req: Request, res: Response): Promise<void> {
    const contractAddresses = inhand.addresses(
      req.query.contractAddresses?.toString() ?? ''
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

    const latestWhere: Record<string, unknown> = {}
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
      latestWhere.contractAddress = {
        [Op.in]: contractAddresses.map((a) => hex2buf(a)),
      }
    }
    if (activityType) {
      where.type = activityType
    }

    try {
      const latest = await Activity.findOne({
        attributes: ['timestamp'],
        where: latestWhere,
        order: [['timestamp', 'DESC']],
        limit: 1,
      })

      const activities = (await Activity.findAll({
        where,
        attributes: [
          'walletAddress',
          [
            sequelize.literal(
              'SUM(multiplier * points * adjustment_multiplier)'
            ),
            'score',
          ],
        ],
        include: [
          {
            attributes: ['ensName', 'ognStake'],
            model: Wallet,
            required: false,
          },
        ],
        group: [
          'walletAddress',
          'wallet.address',
          'wallet.ens_name',
          'wallet.ogn_stake',
        ],
        order: [[sortField, sortDirection]],
        limit,
      })) as unknown as {
        walletAddress: string
        score: number
        wallet?: {
          ensName: string
          ognStake: string
        }
        getDataValue: (key: string) => unknown
      }[]

      const leaders: Leader[] = activities.map((item) => {
        const leader: Leader = {
          walletAddress: address(item.walletAddress),
          name: item.wallet?.ensName ?? '',
          boost: item.wallet?.ognStake
            ? findBoost(BigInt(item.wallet.ognStake))
            : 0,
          score: item.getDataValue('score') as number,
        }
        return leader
      })

      res.status(200).json({
        timestamp: latest?.timestamp ? +latest.timestamp : 0,
        leaders,
      })
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
      valid: true,
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

app.get(
  '/activity',
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
      const activityRes = await Activity.findAll({
        where,
        order: [['timestamp', 'DESC']],
        limit: 100,
      })

      res.status(200).json({
        result: activityRes.map((a) => a.json()),
      })
      return
    } catch (error) {
      log.error(error, 'Error while getting user activity')
      res.status(500).json({ error: 'Internal Server Error' })
      return
    }
  })
)

app.get(
  '/health',
  awrap(async function (req: Request, res: Response): Promise<void> {
    let reservoir = 0
    let latest = 0

    try {
      const collections = await Collection.findAll({
        attributes: ['contractAddress'],
      })
      if (collections.length) {
        // TODO: This is probably going to be an issue at scale
        const collectionParams = collections
          .map((c) => buf2hex(c.contractAddress))
          .join('&collection=')

        const json = await fetchFromReservoir<GetCollectionActivityResponse>({
          url: `/collections/activity/v6?includeMetadata=false&limit=1&collection=${collectionParams}`,
        })

        if (json.activities?.length) {
          const act = json.activities[0]
          if (act.timestamp) {
            reservoir = act.timestamp
          } else {
            log.debug('No timestamp on latest Reservoir activity?')
          }
        } else {
          log.debug('No latest Reservoir activity?')
        }
      }
    } catch (error) {
      log.error(error, 'Error while getting activity health data')
      res.status(500).json({ healthy: false, error: 'Internal Server Error' })
      return
    }

    try {
      const latestAct = await Activity.findOne({
        attributes: ['timestamp'],
        order: [['timestamp', 'DESC']],
        limit: 1,
      })
      if (latestAct?.timestamp) {
        latest = dateToUnix(latestAct.timestamp)
      } else {
        log.debug('No latest activity')
      }
    } catch (error) {
      log.error(error, 'Error while getting activity health data')
      res.status(500).json({ healthy: false, error: 'Internal Server Error' })
      return
    }

    const diff = reservoir - latest

    res.status(200).json({
      healthy: diff < 300, // less than 5min is unhealthy
      diff,
      reservoir,
      reservoirHuman: reservoir ? new Date(reservoir * 1000).toISOString() : '',
      latest,
      latestHuman: latest ? new Date(latest * 1000).toISOString() : '',
    })
    return
  })
)

const workerHandler = awrap(async function (
  req: Request,
  res: Response
): Promise<void> {
  req.setTimeout(300000) // 5m

  const body = req.body as {
    task?: string
    full?: boolean
    contractAddresses?: string[]
    requestLimit?: number
  }

  log.debug(body, 'Received worker request')

  const now = +new Date()
  const reqKey = `${body.task ?? 'default'}-${(
    body.contractAddresses ?? []
  ).join(',')}-${body.full ? 'full' : ''}`
  // Let's not run multiple instance of the worker process
  if ((workerStamp[reqKey] || 0) > now - 30 * 1000) {
    log.warn(`Already processing for ${reqKey}`)
    res.status(200).json({ success: false, message: 'In process', reqKey })
    return
  } else {
    workerStamp[reqKey] = now
  }

  log.info(
    {
      contractAddresses: body.contractAddresses,
      full: body.full,
      requestLimit: body.requestLimit,
    },
    `Received task: ${body.task ?? 'default'}`
  )

  if (body.task === 'wallet') {
    try {
      await updateWallets()
    } catch (err) {
      // console.error(err)
      log.error(err, 'Error updating wallets')
      res.status(500).json({ success: false, message: 'Internal server error' })
      return
    }
  } else {
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
  }

  log.debug(body, 'Completed worker request')

  res.status(200).json({ success: true })
  workerStamp[reqKey] = 0
})

if (isWorker) {
  app.post('/', workerHandler)
} else if (!isProdEnv) {
  // Conditional local runner
  app.post('/work', workerHandler)
}

// Add a collection
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
    const body = req.body as {
      task?: string
      full?: boolean
      contractAddresses?: string[]
    }
    const fullHistory = body.full === true
    const contractAddresses = (body.contractAddresses ?? [])
      .filter((x) => x)
      .map(addressMaybe)

    const { APP_NAME = 'storypoints', WORKER_QUEUE_URL } = process.env
    if (!WORKER_QUEUE_URL) throw new Error(`WORKER_QUEUE_URL is not defined`)
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: WORKER_QUEUE_URL,
        MessageBody: JSON.stringify({
          task: body.task,
          contractAddresses,
          fullHistory,
        }),
      })
    )

    res.status(200).json({ success: true, message: 'WORKER JOB!' })
  })
)

/*app.post(
  '/rescore',
  apiKeyMiddleware,
  awrap(async function (req: Request, res: Response): Promise<void> {
    const body = req.body as {
      start?: number
      end?: number
      type?: string
      contractAddresses?: string[]
    }
    const { start, end, type } = body
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

    const where: Record<string, unknown> = {
      contractAddress: {
        [Op.in]: contractAddresses.map((a) => hex2buf(a)),
      },
      timestamp: {
        [Op.between]: [startStamp, endStamp],
      },
    }

    if (type) {
      where.type = type
    }

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
)*/

app.use(function (err: Error, req: Request, res: Response, next: NextFunction) {
  // console.error(err)
  log.error(err, 'Error in express middleware')
  res.status(500).send('Something broke!')
  next()
})

app.listen(port, () => {
  log.info(`Server is running on port ${port}`)
})
