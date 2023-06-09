import { logger } from '@origin/storypoints-utils'
import { Sequelize } from 'sequelize'
import { SequelizeStorage, Umzug } from 'umzug'

import * as createActivity from './migrations/20230406150645-create-activity'
import * as createCollection from './migrations/20230424200130-create-collection'
import * as createWallet from './migrations/20230428184115-create-wallet'
import * as addContextBlob from './migrations/20230429180333-add-activity-context'
import * as addReservoirOrderId from './migrations/20230502021736-add-reservoir-order-id'
import * as addAdjustmentMultiplier from './migrations/20230504182340-add-adjustment-multiplier'
import * as addReason from './migrations/20230504202005-add-reason'
import * as addTxBlob from './migrations/20230505211318-add-tx-blob'
import * as addIndexes from './migrations/20230509205552-add-indexes'
import * as addSaleBlob from './migrations/20230522192206-add-sale-blob'
import { QueryInterface, sequelize } from './models'

interface MigrationModule {
  up: (c: QueryInterface, s: typeof Sequelize) => Promise<void>
  down: (c: QueryInterface) => Promise<void>
}

const migrations = {
  ['20230406150645-create-activity.js']: createActivity,
  ['20230424200130-create-collection.js']: createCollection,
  ['20230428184115-create-wallet.js']: createWallet,
  ['20230429180333-add-activity-context.js']: addContextBlob,
  ['20230502021736-add-reservoir-order-id.js']: addReservoirOrderId,
  ['20230504182340-add-adjustment-multiplier.js']: addAdjustmentMultiplier,
  ['20230504202005-add-reason.js']: addReason,
  ['20230505211318-add-tx-blob.js']: addTxBlob,
  ['20230509205552-add-indexes.js']: addIndexes,
  ['20230522192206-add-sale-blob.js']: addSaleBlob,
}

const umzug = new Umzug({
  context: sequelize.getQueryInterface(),
  logger,
  migrations: Object.entries(
    migrations as unknown as Record<string, MigrationModule>
  ).map(([fname, migration]: [string, MigrationModule]) => {
    const context = sequelize.getQueryInterface()
    const parts = fname.split('.')
    const name = parts.slice(0, parts.length - 1).join('.')

    return {
      name,
      path: fname,
      up: async () => migration.up(context, Sequelize),
      down: async () => migration.down(context),
    }
  }),
  storage: new SequelizeStorage({ sequelize }),
})

/// Run migrations
export async function migrate() {
  return await umzug.up()
}

/// Undo last migration
export async function undo() {
  return umzug.down()
}
