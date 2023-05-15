# Origin Story Points System

This is a simple story points system for the Origin Story marketplace. It awards
points to wallets based on activities performed. The system comprises 3 parts:

There is a single data entity (model) in the system called Activity. An activity
is a record of some activity performed by some wallet, optionally on some
contract address, with some set of points awarded. The points awarded are
determined by the type of activity. The system is designed to be extensible, so
new event types can be added easily.

- packages/api - a very simple API gives leaderboard stats based on aggregations
  on the Event model
- packages/infra - CDK devops infrastructure stuff
- packages/ingest - Data ingestion logic
- packages/models - Sequelize model for the Event entity
- packages/rules - Points calculations rules and loaders
- packages/utils - Various minor standalone utilities used across packages

The API server is a very simple Node Express JS server. It serves the Open API
specs defined at
https://app.swaggerhub.com/apis-docs/edspencer/Points/1.0.11#/Leaderboards/getLeaders.

## Running the system locally

To run the system locally, you need to have Node JS installed. You also need to
have a postgres database running.

You can configure the database and permissions with these queries:

```sql
CREATE DATABASE storypoints;
CREATE USER storypoints;
GRANT ALL ON DATABASE storypoints TO storypoints;
GRANT ALL ON SCHEMA public TO storypoints;
```

To run migrations:

```bash
yarn migrate
```

To run the Node JS API:

```bash
yarn start
```

Running the tests:

```bash
yarn test
```

## TODO

- [ ] Need a /simulate endpoint so users can see what points they might get when
      performing an action.
- [ ] ENS names in output
- [ ] Rules implementation
