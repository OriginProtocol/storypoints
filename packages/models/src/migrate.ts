import { logger } from '@storypoints/utils'
import { Sequelize } from 'sequelize'
import { SequelizeStorage, Umzug } from 'umzug'

import * as migration20230406150645CreateActivity from './migrations/20230406150645-create-activity'
import { QueryInterface, sequelize } from './models'

interface MigrationModule {
  up: (c: QueryInterface, s: typeof Sequelize) => Promise<void>
  down: (c: QueryInterface) => Promise<void>
}

const migrations = {
  ['20230406150645-create-activity.js']: migration20230406150645CreateActivity,
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
