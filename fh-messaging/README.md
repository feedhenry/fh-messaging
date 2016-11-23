fh-messaging(1) -- The FeedHenry Message Server
===============================================

## DESCRIPTION

The Message Server is a FeedHenry RESP API Service to which you can:

* log messages for a particular topic

* query the messages currently logged for a topic

## Dependencies

Messaging currently relies on the following being installed on a host:

* node.js

* npm (the Node Package Manager)

Messaging also relies on access to a Mongo Database running either locally or remotely.

## Installation

Messaging is deployed using npm. The Message Package (fh-messaging-<version>.tar.gz) can be installed via npm, either by copying the package to the local host or installing over http.

To install (on ubuntu):

sudo npm install fh-messaging-<version>.tar.gz

The necessary node dependency modules are also installed automatically.

You can upgrade an existing intallation with the same command.    

## Running and Configuration  

To run the Message Server you must pass a config file on the command line. For a sample configuration file, see 'dev.json' in the config directory.

E.g:
fh-messageserver /etc/fh-messaging/conf.json

## Upstart

Create a file called 'fh-messaging.conf' in the /etc/init directory, and put in the following:

    pre-start script
        mkdir -p /log/fh-messaging/
    end script

    description "FeedHenry Message Server"
    author  "FeedHenry Ltd"

    start on (local-filesystems and net-device-up IFACE=eth0)
    stop on shutdown

    respawn

    exec sudo fh-messaging /etc/fh-messaging/conf.json >> /log/fh-messaging/messaging.log 2>&1

The fh-messaging server can then be started/stopped with
    sudo start fh-messaging
    sudo stop fh-messaging

## Documentation

Documentation of the REST API of the Message Server is located in the doc/restapi.txt file.

## Updating GeoIP database

Download 'GeoLite City' (Binary / gzip) and replace binary under `vendor/GeoIP.dat`.


## Tests

### Prerequisites
#### Timezone must be IST currently for tests to work

    export TZ=Europe/Dublin

#### Mongo Auth must not be enabled for tests to work

Install whiskey https://github.com/cloudkick/whiskey

    sudo npm install -g whiskey

Install grunt http://gruntjs.com/

    sudo npm install grunt-cli -g

### Running the tests

    grunt fh:unit

Run a single test

    whiskey --real-time --report-timing --failfast --tests test.test_fhsrv.test_fhsrv_sys_info*

This will run any tests in "test/test_fhsrv.js" beginning with "test_fhsrv_sys_info"
