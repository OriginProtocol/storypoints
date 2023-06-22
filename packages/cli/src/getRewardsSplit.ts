import { logger, hex2buf, buf2hex } from '@origin/storypoints-utils'
import { Collection, Activity, Op, sequelize } from '@origin/storypoints-models'
import { BigNumber } from '@ethersproject/bignumber'
import fs from 'fs'
import path from 'path'

// Use this script to get the OGN rewards split per address
// for a given promo period. Output is a JSON file.
const getRewardsSplit = async (contractAddress: string, startTime: number, endTime: number) => {
    const log = logger.child({ app: 'cli', module: 'getRewardsSplit', level: 'info' })
    log.info('Starting getRewardsSplit...')

    if(!contractAddress) {
        throw new Error('contractAddress is required')
    }
    if(!startTime) {
        throw new Error('startTime is required')
    }
    if(!endTime) {
        throw new Error('endTime is required')
    }

    // Check contract exists in DB
    const collection = await Collection.findOne({
        where: { contractAddress: hex2buf(contractAddress) }
    })

    if(!collection) {
        throw new Error('Collection not found')
    }

    log.info(`Collection found at ${contractAddress}...`)

    // Get total points
    const activities = await Activity.findAll({
        where: {
            contractAddress: hex2buf(contractAddress),
            //valid: true, // TODO: Uncomment this for prod
            points: {
                [Op.gt]: 0,
            },
            timestamp: {
                [Op.between]: [new Date(startTime * 1000), new Date(endTime * 1000)],
            },
        },
        attributes: [
            'walletAddress',
            [
                sequelize.literal(
                    'SUM(ROUND(multiplier * points * adjustment_multiplier))'
                ),
                'score',
            ],
        ],
        group: [
            'walletAddress',
        ],
    })

    if(!activities.length) {
        throw new Error('No activities found')
    }

    log.info(`Found ${activities.length} activities...`)

    const totalPoints = activities.reduce((acc, activity) => {
        const score = activity.getDataValue('score') as number
        return acc + score
    }, 0)

    const totalPointsBn = BigNumber.from(totalPoints)

    log.info(`Total points: ${totalPoints.toString()}...`)

    const totalOgn = BigNumber.from(500000).mul(BigNumber.from(10).pow(18))

    const rewardsSplit: Record<string, BigNumber> = {}

    activities.forEach((activity) => {
        const oneBn = BigNumber.from(1).mul(BigNumber.from(10).pow(18))
        const score = activity.getDataValue('score') as number
        const address = buf2hex(activity.getDataValue('walletAddress') as Buffer)

        const scoreBn = BigNumber.from(score).mul(oneBn)
        const shareOfPointsBn = scoreBn.div(totalPointsBn)

        const ognRewardsSplit = totalOgn.mul(shareOfPointsBn).div(oneBn)

        rewardsSplit[address] = ognRewardsSplit
    })

    const rewardsSplitTotal = Object.values(rewardsSplit).reduce(
        (acc, val) => {
            const accBn = BigNumber.from(acc)
            const valBn = BigNumber.from(val)
            const totalBn = accBn.add(valBn)
            return totalBn
        }, BigNumber.from(0))

    // Output the JSON
    fs.writeFileSync(`${path.resolve(__dirname)}/../data/rewards-split-${contractAddress}-${startTime}-${endTime}.json`, JSON.stringify(rewardsSplit, null, 2))

    // Debug/info
    log.info(rewardsSplit)
    log.info(`Total points amassed: ${totalPoints}`)
    log.info(`OGN rewards available: ${totalOgn.toString()}`)
    log.info(`Rewards split total: ${rewardsSplitTotal.toString()}`)
    log.info(`Rewards total diff: ${totalOgn.sub(rewardsSplitTotal).toString()}`)
    log.info(`Rewards split created with ${Object.keys(rewardsSplit).length} entries.`)
}

getRewardsSplit(`0x3bf2922f4520a8ba0c2efc3d2a1539678dad5e9d`, 1685552400, 1688194800)