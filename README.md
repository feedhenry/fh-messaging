#fh-messaging(1) -- The FeedHenry Message Server

## DESCRIPTION

This contains the 2 messaging components

* fh-messaging

* fh-metrics

## fh-messaging

This is the main messaging server which handles receiving messages and storing them in the database.  It also has
the scripts/commands for doing batch imports, and rollups for the metrics

## fh-metrics

This is the metrics server which handles serving metrics data to millicore.  It has been seperated from fh-messaging,
so that App Studio will not be affect by slowness or downtime of the messaging server

## API endpoints

### fh-messaging

The express routes for `fh-messaging` are defined in `./fh-messaging/lib/fhsrv.js` as per:

| Route| Request method | Purpose  |
| :--- |:---:| :--- |
| / | router.get | Returns all topics |
| /:topic | router.get | Returns selected topic |
| /:topic/:md5id | router.get | Returns a raw message based on its topic and unique hash |
| /:topic/:md5id | router.head | Checks if the message with given hash exists |
| /:topic | router.post | Creates a new topic |
| /daily | router.post | Runs rollup process for the day (`rollupHandler.run`) |
| /receive/:level | router.post | Stores the rolled-up data from mbaases (`rollupHandler.storeByLevel`) |
| /info/ping | router.get | Returns service connectivity check result |
| /info/version | router.get | Returns service version  |
| /info/stats | router.get | Returns service stats |
| /info/status | router.get | Returns service status |
| /info/health | router.get | Returns health check details (`healthmonitor(config)`) |

### fh-metrics

The express routes for `fh-metrics` are defined in `./fh-metrics/lib/fhmetricssrv.js` as per:

| Route| Request method | Purpose  |
| :--- |:---:| :--- |
| /:level | router.get | Returns the rolled-up data by level - apps, projects, domains, etc. (`metricsHandler.byLevel`) |
| /:metric | router.post | Return metrics based on the query params in the request body |
| /info/ping | router.get | Returns service connectivity check |
| /info/version | router.get | Returns service version  |
| /info/stats | router.get | Returns service stats |
| /info/status | router.get | Returns service status |
| /info/health | router.get | Returns health check details (`healthmonitor(config)`) |

## Tests

### Individual component testing

Each component has there own test suite that runs tests on the components individually. see the individual components README's for more on this.

### Acceptance tests

Run the acceptance test suite

Install whiskey https://github.com/cloudkick/whiskey

    npm install -g whiskey

Install any other dependancies

    npm install

Run the tests

    npm test

Run a single test

    whiskey --dependencies tests/dependencies.json --only-essential-dependencies --real-time --report-timing --tests tests/test_fhinit.js

IMPORTANT: Timezone must be IST currently for tests to work.
IMPORTANT: Mongo Auth must not be enabled for tests to work.

### Manual tests

#### Testing Cloud Reporting Manually

For instructions how to test cloud reporting manually, refer to [`fh-metrics/README.md`](https://github.com/fheng/fh-messaging/blob/master/fh-metrics/README.md#testing-cloud-reporting-manually).

### License

fh-messaging & fh-metrics are licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/).
