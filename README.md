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

## Commands

### API Calls

Add a collection:

```bash
curl -v -X POST -H 'Content-Type: application/json' --data '{"contractAddress": "0x3bf2922f4520a8ba0c2efc3d2a1539678dad5e9d", "description": ""}' http://localhost:3000/collection
```

Trigger a fetch (local):

```bash
curl -v -X POST -H 'Content-Type: application/json' --data '{"contractAddresses": ["0x3bf2922f4520a8ba0c2efc3d2a1539678dad5e9d"], "full": true, "requestLimit": 500}' http://localhost:3000/work
```

Trigger a fetch (remote):

```bash
curl -v -X POST -H 'Content-Type: application/json' --data '{"contractAddresses": ["0x3bf2922f4520a8ba0c2efc3d2a1539678dad5e9d"], "full": true, "requestLimit": 500}' http://LBENDPOINT.us-east-2.elb.amazonaws.com/trigger
```
