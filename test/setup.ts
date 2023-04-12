import dotenv from 'dotenv'

import path from 'path'
const dotEnvPath = path.resolve('../.env.test')

console.log(`dotEnvPath: ${dotEnvPath}`)

dotenv.config({ path: dotEnvPath })

console.log(process.env.PORT)
