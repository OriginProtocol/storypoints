# Origin Story Points System

This is a simple story points system for the Origin Story marketplace. It awards
points to wallets based on activities performed. The system comprises 3 parts:

There is a single data entity (model) in the system called Event. An event is a
record of some activity performed by some wallet, optionally on some contract
address, with some set of points awarded. The points awarded are determined by
the type of event. The system is designed to be extensible, so new event types
can be added easily.

- src/api - a very simple API gives leaderboard stats based on aggregations on
  the Event model
- src/jobs - set of jobs that run periodically to award points to wallets based
  on events
- src/models - Sequelize model for the Event entity

The API server is a very simple Node Express JS server. It serves the Open API
specs defined at
https://app.swaggerhub.com/apis-docs/edspencer/Points/1.0.11#/Leaderboards/getLeaders.
The API server is deployed to Heroku and talks to a postgres database. That
should change as soon as the system gets any load as Heroku us a disaster.

The jobs are run periodically by a cron job. The cron job is defined in the
Procfile and is run by Heroku. The jobs are written in Node JS and use the
Sequelize ORM to talk to the database. It's totally possible to have jobs that
run in real-time - they don't all have to be cron. For example, we could have a
job to re-check for royalties on a user's wallet after the complete a purchase
flow, so that we can award points for that action.

## Running the system locally

To run the system locally, you need to have Node JS installed. You also need to
have a postgres database running. See src/config/config.json for dev and test
database configuration.

To run the Node JS API:

```
yarn start:dev
```

Running the tests:

```
yarn test
```

## TODO and known issues:

- Mocha seems to be stuck on auto watch, seems to be due to having its config in
  package.json. Need to make it not do that to have CI job for tests
- CD pipeline needs to be set up
- Needs trigger for jobs to run. Combination of cron and webhooks, but
  ultimately triggering code in the /src/jobs directory
- The code exists to get all the collection activity and then all the sales
  activity for those transaction hashes, so that we can award points for those
  actions. But the code to actually award the points is not written yet. It will
  just be a matter of looping over that array and applying whatever formula we
  decide on for awarding points for those actions.
