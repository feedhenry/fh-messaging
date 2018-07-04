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

# Developing on OpenShift
For development purposes, we can build a CentOS based Docker image and watch for changes in the local filesystem which would be reflected in the running image.

### Build the development image
1. Generate the config file: `grunt fh-generate-dockerised-config`
2. `docker build -t docker.io/my-Username/fh-messaging:dev -f Dockerfile.dev .`
3. `docker push docker.io/my-Username/fh-messaging:dev`
4. `oc edit dc fh-messaging`
5. Replace the image with the tagged version above.

### Hot Deployment

The development image will allow you to sync local code changes to the running container without the need for rebuilding or redeploying the image.

From the root of the `fh-messaging directory, run the following:
```oc rsync --watch --no-perms=true ./lib $(oc get po | grep fh-messaging | grep Running | awk '{print $1}'):/opt/app-root/src ```

### Debugging with VS Code

1. Open [Visual Studio Code](https://code.visualstudio.com/)
2. `oc set probe dc fh-messaging --liveness --readiness --remove=true`
3. `oc port-forward $(oc get po | grep fh-messaging | grep Running | awk '{print $1}') :5858`. - This will forward port 5858 from the running Pod to a local port. Note the port.
4. Select the debug option and choose Node.js as the runtime.
5. Set the `launch.json` file similar to the following, using the port obtained above via the port forward command:

```json
 {
     "version": "0.2.0",
     "configurations": [
         {
             "type": "node",
             "request": "attach",
             "name": "Attach to Remote",
             "address": "localhost",
             "port": <PORT>,
             "localRoot": "${workspaceRoot}",
             "remoteRoot": "/opt/app-root/src/"
         },
         {
             "type": "node",
             "request": "launch",
             "name": "Launch Program",
             "program": "${workspaceRoot}/bin/fhmsgsrv.js"
         }
     ]
 }
 ```
6.Click `Attach to Remote`
