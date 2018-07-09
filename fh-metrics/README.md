fh-metrics(1) -- The FeedHenry Metrics Server
===============================================

## DESCRIPTION

The Metrics Server component fronts API requests from Millicore for summary analytics reports such as client installs/startups and cloud request/active users. This component sources its information from the MongoDB which fh-messaging writes the aggregated reports to.


## Dependencies

Metrics currently relies on the following being installed on a host:

* node.js

* npm (the Node Package Manager)

Metrics also relies on access to a Mongo Database running either locally or remotely.

## Installation

Metrics is deployed using npm. The Metrics Package (fh-metrics-<version>.tar.gz) can be installed via npm, either by copying the package to the local host or installing over http.

To install (on ubuntu):

	sudo npm install fh-metrics-<version>.tar.gz

The necessary node dependency modules are also installed automatically.

You can upgrade an existing intallation with the same command.    

## Running and Configuration  

To run the Metrics Server you must pass a config file on the command line. For a sample configuration file, see ```dev.json``` in the config directory.

E.g:

	./bin/fhmetsrv.js /etc/fh-metrics/dev.json

## Upstart

Create a file called 'fh-metrics.conf' in the /etc/init directory, and put in the following:

    pre-start script
        mkdir -p /log/fh-metrics/
    end script

    description "FeedHenry Metrics Server"
    author  "FeedHenry Ltd"

    start on (local-filesystems and net-device-up IFACE=eth0)
    stop on shutdown

    respawn

    exec sudo fh-metrics /etc/fh-metrics/dev.json >> /log/fh-metrics/metrics.log 2>&1

The fh-metrics server can then be started/stopped with

    sudo service fh-metrics start
    sudo service fh-metrics stop


## Tests

### Run all tests

    grunt fh:unit

### Run a single test
First install [Whiskey](https://github.com/cloudkick/whiskey):

```
npm install -g whiskey
```

```
whiskey --real-time --report-timing --failfast --tests test.test_fhmetricssrv.test_getMetric*
```

This will run any tests in ```test/test_fhmetricssrv.js``` beginning with ```test_getMetric```.

## Testing Cloud Reporting Manually

### Generating messages (cloud requests) from the studio

1. Create a hello world project, add 'process.env.FH_MESSAGING_REALTIME_ENABLED = "true";' as the first line of application.js in the cloud app
1. deploy cloud code to dev
1. View client app in studio preview
1. click execute cloud action call 4 times
1. login to VM and run: `/usr/local/bin/fh-msg-process $(date '+%F') NO_IMPORT`
1. visit Project|Reporting section of studio and verify that there are 4 cloud requests, and 1 active user listed for the device type used

### Generating messages (app startups/installs and cloud requests) from a device

1. Create a hello world project, add 'process.env.FH_MESSAGING_REALTIME_ENABLED = "true";' as the first line of application.js in the cloud app
1. deploy cloud code to live
1. Build a Distribution app for iPhone or Android
1. Install app to iPhone or Android device
1. Launch app on device 4 times and stop it
1. Launch the app a 5th time and click execute cloud action call 4 times
1. login to VM and run: `/usr/local/bin/fh-msg-process $(date '+%F') NO_IMPORT`
1. visit Project|Reporting section of studio and verify that there is 1 App Install, 5 App Startups, 4 cloud requests, and 1 active user listed for the device type used


### Testing with decoupled mbaas

1. Create a hello world project, add 'process.env.FH_MESSAGING_REALTIME_ENABLED = "true";' as the first line of application.js in the cloud app
1. deploy cloud code to dev
1. View client app in studio preview
1. click execute cloud action call 4 times
1. ensure mbaas_data_enabled is set to true in messaging/metrics and supercore
1. set the agenda.jobs[jobname].schedule to be 2 minutes
1. set the agenda.jobs[jobname].options.rollupFor.daysAgo to 0 in messaging config and supercore config
1. restart the services. After two minutes your metrics should appear

# Developing on OpenShift
For development purposes, we can build a CentOS based Docker image and watch for changes in the local filesystem which would be reflected in the running image.

### Build the development image
1. Generate the config file: `grunt fh-generate-dockerised-config`
2. `docker build -t docker.io/my-Username/fh-metrics:dev -f Dockerfile.dev .`
3. `docker push docker.io/my-Username/fh-metrics:dev`
4. `oc edit dc fh-metrics`
5. Replace the image with the tagged version above.

### Hot Deployment

The development image will allow you to sync local code changes to the running container without the need for rebuilding or redeploying the image.

From the root of the `fh-metrics directory, run the following:
```oc rsync --watch --no-perms=true ./lib $(oc get po | grep fh-metrics | grep Running | awk '{print $1}'):/opt/app-root/src ```

### Debugging with VS Code

1. Open [Visual Studio Code](https://code.visualstudio.com/)
2. `oc set probe dc fh-metrics --liveness --readiness --remove=true`
3. `oc port-forward $(oc get po | grep fh-metrics | grep Running | awk '{print $1}') :5858`. - This will forward port 5858 from the running Pod to a local port. Note the port.
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
             "program": "${workspaceRoot}/bin/fhmetsrv.js"
         }
     ]
 }
 ```
6.Click `Attach to Remote`
