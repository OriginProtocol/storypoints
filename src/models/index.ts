import { Sequelize } from 'sequelize'
import allConfig from '../config/config.json'
import EventModel from './event'

interface Config {
  username: string
  password: string | null
  database: string
  host: string
  dialect: string
  use_env_variable?: string
}

type Env = 'development' | 'test' | 'production'

const env: Env = ['development', 'test', 'production'].includes(
  process.env.NODE_ENV as Env
)
  ? (process.env.NODE_ENV as Env)
  : 'development'

// const config: Config = require(__dirname + '/../../config.js')[env]
const config: Config = allConfig[env]

let sequelize: Sequelize
if (config.use_env_variable) {
  const connString = process.env[config.use_env_variable] ?? ''
  sequelize = new Sequelize(connString)
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password ?? undefined
  )
}

const Event = EventModel(sequelize)

export { Sequelize, sequelize, Event }

// 'use strict'

// import * as fs from 'fs'
// import * as path from 'path'
// import { Sequelize, DataTypes } from 'sequelize'

// import process from 'process'
// const basename = path.basename(__filename)
// import allConfig from '../config/config.json'

// type Env = 'development' | 'test' | 'production'

// const env: Env = ['development', 'test', 'production'].includes(
//   process.env.NODE_ENV as Env
// )
//   ? (process.env.NODE_ENV as Env)
//   : 'development'

// interface Config {
//   username: string
//   password: string | null
//   database: string
//   host: string
//   dialect: string
//   use_env_variable?: string
// }

// // type Configs = {
// //   [key in Env]: Config
// // };

// const config: Config = allConfig[env]

// const db: any = {}

// let sequelize: any
// if (config.use_env_variable) {
//   const connString = process.env[config.use_env_variable] ?? ''
//   sequelize = new Sequelize(connString)
// } else {
//   sequelize = new Sequelize(
//     config.database,
//     config.username,
//     config.password ?? undefined
//   )
// }

// fs.readdirSync(__dirname)
//   .filter((file: string) => {
//     return (
//       !file.startsWith('.') &&
//       file !== basename &&
//       file.endsWith('.ts') &&
//       !file.includes('.test.ts')
//     )
//   })
//   .forEach((file: string) => {
//     const model = require(path.join(__dirname, file))(sequelize, DataTypes)
//     db[model.name] = model
//   })

// Object.keys(db).forEach((modelName: string) => {
//   if (db[modelName].associate) {
//     db[modelName].associate(db)
//   }
// })

// db.sequelize = sequelize
// db.Sequelize = Sequelize

// export default db
