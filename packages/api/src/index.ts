// nonce: 23
import { collectActivities } from '@storypoints/ingest'
import { Activity, Collection, Op, sequelize } from '@storypoints/models'
import { address, addressMaybe, hex2buf, logger } from '@storypoints/utils'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import express, { NextFunction, Request, Response } from 'express'

const sqs = new SQSClient({ region: process.env.AWS_REGION })
const log = logger.child({
  app: 'api',
})
export const app = express()
const port = process.env.PORT ?? '3000'
const isProdEnv = !!process.env.APP_NAME
const isWorker = process.env.IS_WORKER === 'true'

app.use(express.json())

interface Leader {
  walletAddress: string
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

app.get(
  '/leaders',
  awrap(async function (req: Request, res: Response): Promise<void> {
    const {
      contractAddress,
      type: activityType,
      //since,
      limit = 20,
      sortField = 'score',
      sortDirection = 'desc',
    } = req.query

    const where: Record<string, unknown> = {
      points: {
        [Op.gt]: 0,
      },
    }
    if (contractAddress) {
      where.contractAddress = {
        [Op.in]: (contractAddress as string).split(',').map((a) => hex2buf(a)),
      }
    }
    if (activityType) {
      where.type = activityType as string
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
        order: [
          [sortField as string, sortDirection === 'asc' ? 'ASC' : 'DESC'],
        ],
        limit: parseInt(limit as string, 10),
      })

      const leaders: Leader[] = activities.map((item) => {
        const leader: Leader = {
          walletAddress: address(item.walletAddress),
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

app.use(function (err: Error, req: Request, res: Response, next: NextFunction) {
  log.error(err, 'Error in express middleware')
  res.status(500).send('Something broke!')
  next()
})

app.listen(port, () => {
  log.info(`Server is running on port ${port}`)
})
