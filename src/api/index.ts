import express from 'express'
import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { Event } from '../models'

export const app = express()
const port = process.env.PORT || 3000

app.use(express.json())

interface Leader {
  walletAddress: string
  pointsSum?: number
  priceSum?: number
}

app.get('/leaders', async (req: Request, res: Response) => {
  const {
    contractAddress,
    type,
    since,
    limit = 20,
    sortField = 'pointsSum',
    sortDirection = 'desc'
  } = req.query

  const where: any = {}
  if (contractAddress) {
    where.contractAddress = contractAddress
  }
  if (type) {
    where.type = type
  }
  if (since) {
    where.timestamp = {
      [Op.gte]: since
    }
  }

  try {
    const events = await Event.findAll({
      where,
      attributes: [
        'walletAddress',
        ['SUM(points)', 'pointsSum'],
        ['SUM(price)', 'priceSum']
      ],
      group: ['walletAddress'],
      order: [[sortField.toString(), sortDirection.toString()]],
      limit: parseInt(limit as string, 10)
    })

    const leaders: Leader[] = events.map((item) => {
      const leader: Leader = {
        walletAddress: item.getDataValue('walletAddress'),
        pointsSum: Number(item.getDataValue('pointsSum')),
        priceSum: Number(item.getDataValue('priceSum'))
      }
      return leader
    })

    res.status(200).json(leaders)
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
