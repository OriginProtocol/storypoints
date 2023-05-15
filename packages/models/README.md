# StoryPoints Models

Sequelize data models for StoryPoints.

## Adding Migrations

Migrations are currently a hybrid of Sequelize-cli and Umzug which may be a
little unexpected. It also means they're currently hardcoded and will **only be
executed on prod systems if they're included in `migrations` map in
`src/migrate.ts`**.

First init the file by CLI (it will be in `src/migrations/`).

```bash
yarn sequelize migration:create --name add-test-column
```

Update the file as you see fit. You can immediately use this migration with
`sequelize-cli` for testing. When you're ready for it to be included, make sure
to import it in `src/migrate.ts` and include it in the `migrations` mapping.

## TODO

- [ ] Make migrations more friendly and less hard-coded

## Notes

### `sequelize-typescript` and decorators

TypeScript decorators are a bit of an issue. They need a couple of settings in
tsconfig.json to work (experimentalDecorators and emitDecoratorMetadata).
However, esbuild
[does not and appear will not support these](https://github.com/evanw/esbuild/issues/257).

[`esbuild-plugin-tsc`](https://github.com/thomaschaaf/esbuild-plugin-tsc) is a
possibility but we aren't able to use plugins with CDK's esbuild becuase we only
get the option to add CLI options. And it seems like
[esbuild will not be supporting specifying plugins on the CLI](https://github.com/evanw/esbuild/issues/884).

It's possible [`cdk-esbuild`](https://github.com/mrgrain/cdk-esbuild) may help
with this issue and bundling for cdk. But for the sake of speed we just make
sure to specify types so we don't have to deal with decorator metadata. Might be
worth revisiting later.
