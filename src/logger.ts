import pino from 'pino'

export { Logger } from 'pino'

export default pino({
  name: 'storypoints',
  level: process.env.LOG_LEVEL ?? 'debug',
  transport:
    process.env.PRETTY === 'true'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true
          }
        }
      : undefined
})
