// This file is only used by the Sequelize CLI tools
const {
  POSTGRES_HOST = '127.0.0.1',
  POSTGRES_DB = 'storypoints',
  POSTGRES_USER = 'storypoints',
  POSTGRES_PASSWORD
} = process.env

module.exports = {
  username: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  database: POSTGRES_DB,
  host: POSTGRES_HOST,
  dialect: 'postgres'
}
