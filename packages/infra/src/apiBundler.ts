import path from 'path'
import fs from 'fs'
import { buildSync } from 'esbuild'
import { ILocalBundling } from 'aws-cdk-lib'

const packageJson = `{
  "name": "@storypoints/api",
  "description": "Origin Story Points API",
  "author": "Origin Protocol <engineering@originprotocol.com>",
  "version": "0.1.0",
  "license": "MIT",
  "engines": {
    "node": ">=16.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "fetch-retry-ts": "^1.1.25",
    "node-fetch": "2.6.7",
    "pg": "^8.10.0",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.30.0",
    "sequelize-cli": "^6.6.0",
    "supertest": "^6.3.3"
  },
  "scripts": {
    "start": "node index.js"
  }
}
`

export default class ApiBundler implements ILocalBundling {
  constructor(readonly appPath: string, readonly target: string) {}

  tryBundle(outdir: string /*, options: BundlingOptions*/): boolean {
    const bundleOpts = {
      bundle: true,
      target: this.target,
      // minify: true,
    }

    buildSync({
      ...bundleOpts,
      platform: 'node',
      entryPoints: [path.join(this.appPath, 'src/index.ts')],
      external: ['express', 'fetch-retry-ts', 'node-fetch'],
      outfile: path.join(outdir, 'index.js'),
    })

    // Copy externals/build files
    fs.writeFile(path.join(outdir, 'package.json'), packageJson, (err) => {
      if (err) {
        throw err instanceof Error ? err : new Error(err)
      }
    })

    // TODO: Maybe should accept this as a parameter?
    const rulesSourceDir = path.resolve(
      path.join(__dirname, '..', '..', 'rules', 'src', 'rules'),
    )
    const rulesFiles = fs
      .readdirSync(rulesSourceDir)
      .map((f) => path.join(rulesSourceDir, f))
    const secretRulesSourceDir = path.resolve(
      path.join(__dirname, '..', '..', 'rules', 'src', 'secret'),
    )
    const secretFiles = fs
      .readdirSync(secretRulesSourceDir)
      .map((f) => path.join(secretRulesSourceDir, f))

    buildSync({
      ...bundleOpts,
      platform: 'node',
      entryPoints: rulesFiles.concat(secretFiles),
      outdir,
      preserveSymlinks: true,
    })

    return true
  }
}
