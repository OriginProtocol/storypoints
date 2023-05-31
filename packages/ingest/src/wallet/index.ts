import { Activity, Wallet, sequelize } from '@origin/storypoints-models'
import { buf2hex, logger } from '@origin/storypoints-utils'

import { resolveENS } from './name'
import { getOGNStake } from './ogn'

const log = logger.child({ app: 'ingest', module: 'wallet' })

/**
 * Update wallet ENS names and OGN stakes for boost
 *
 * Look for wallets that have no wallet entry or have not been udpated since
 * the above configured limit.
 */
export async function updateWallets(): Promise<void> {
  const dayAgo = new Date(+new Date() - 60 * 60 * 24 * 1000)
  const result = await sequelize.query(
    `SELECT DISTINCT wallet_address AS "walletAddress"
    FROM activity a
    LEFT JOIN wallet w ON a.wallet_address = w.address
    WHERE w.address IS NULL
    OR w.updated_at < :dayAgo`,
    {
      replacements: { dayAgo },
      mapToModel: true,
      model: Activity,
    }
  )

  log.info(`Found ${result.length} wallets to update`)

  for (const row of result) {
    const ensName = await resolveENS(row.walletAddress)
    const ognStake = await getOGNStake(row.walletAddress)
    const data = {
      ensName,
      ognStake: ognStake.toString(),
    }
    const [wallet, created] = await Wallet.findOrCreate({
      where: {
        address: row.walletAddress,
      },
      defaults: data,
    })

    if (created) {
      log.debug(`Created wallet entry for ${buf2hex(row.walletAddress)}`)
    } else {
      if (
        wallet.ensName !== data.ensName ||
        wallet.ognStake !== data.ognStake
      ) {
        log.debug(`Updated wallet entry for ${buf2hex(row.walletAddress)}`)
        await wallet.update({ ...data })
      } else {
        // We want to mark it as updates so we aren't checking it constantly
        wallet.changed('updatedAt', true)
        await wallet.update({ updatedAt: new Date() })
      }
    }
  }
}
