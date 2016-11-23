#!/usr/bin/env node
//
//  Main FeedHenry Message Server.
//
/*jshint node:true */

"use strict";

var fhmetricssrv = require("../lib/fhmetricssrv.js");
var args = require('optimist').argv;
var fs = require('fs');
var path = require('path');
var fh_logger = require('fh-logger');
var fhcluster = require('fh-cluster');
var log = require('../lib/logger');
var fhconfig = require('fh-config');
var required = require('../lib/requiredvalidation.js');
var logger;

fs.exists = fs.exists || path.exists;
fs.existsSync = fs.existsSync || path.existsSync;
/* eslint-disable no-console */
function usage() {
  console.log("Usage: " + args.$0 + " <config file> [-d] (debug) --master-only --workers=[int] \n --master-only will override  --workers so should not be used together");
  process.exit(0);
}

if (args.h) {
  usage();
}

if (args._.length < 1) {
  usage();
}
if (args.d === true || args["master-only"] === true) {

  console.log('Starting single master process');
  startWorker();
} else {
  // Note: if required as a module, its up to the user to call start();
  if (require.main === module) {
    var numWorkers = args.workers;
    fhcluster(startWorker,numWorkers);
  }
}

function startWorker(clusterWorker) {
  var configFile = args._[0];
  fhconfig.init(configFile, required, function(err) {
    if (err) {
      handleConfigError(configFile, err);
    }
    var config = getConfig(fhconfig, configFile);
    logger = log.setLogger(fh_logger.createLogger(config.metrics.logger));
    startServer(config, clusterWorker || process);
  });
}

function handleConfigError(configFile, err) {
  console.log('Error reading config file: ' + configFile);
  console.error(err);
  process.exit(1);
}

/* eslint-enable*/

function getConfig(fhconfig, configFile) {
  var config = fhconfig.getConfig().rawConfig;
  config.configFilePath = path.resolve(configFile);
  config.configDir = path.dirname(config.configFilePath);
  return config;
}

function startServer(config, clusterWorker) {
  var metricsServer = new fhmetricssrv.MetricsServer(config, logger);
  metricsServer.messaging.database.on('tearUp', function() {
    var port = config.metrics.port;
    if (config.metrics.ssl.use_ssl === 'true') {
      port = config.metrics.ssl.port;
    }
    var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    logger.info('Starting Metrics Server version ' + pkg.version + ' on port: ' + port);

    metricsServer.server.listen(port, function() {
      logger.info('Started fh-metrics');
    });
  });

  function handleMongoConnError(message) {
    console.log(message);
    console.log('Stopping fh-metrics...');
    clusterWorker.emit('exit');
  }

  metricsServer.messaging.database.on('dbconnectionerror', function(err) {
    var errMsg = 'Error connecting to database: ' + JSON.stringify(err);
    handleMongoConnError(errMsg);
  });

  metricsServer.messaging.database.on('close', function(err) {
    var errMsg = 'Database connection closed: ' + JSON.stringify(err);
    handleMongoConnError(errMsg);
  });

  metricsServer.messaging.database.on('error', function(err) {
    var errMsg = 'Database connection error: ' + JSON.stringify(err);
    handleMongoConnError(errMsg);
  });

  metricsServer.messaging.database.on('tearDown', function() {
    console.log('Tear down complete. Database closed gracefully. Killing worker #' + clusterWorker.id);
    killProcess(clusterWorker);
  });

  clusterWorker.on('exit', function() {
    console.log('Cluster worker #' + clusterWorker.id + 'is exiting, attempting clean server shutdown');
    shutdownServer(metricsServer, clusterWorker);
  });
}

function killProcess(clusterWorker) {
  if (clusterWorker.process) {
    logger.info('Killing cluster worker ' + clusterWorker.id);
    clusterWorker.process.exit(1);
  } else {
    logger.info('Killing master process');
    clusterWorker.exit(1);
  }
}

function shutdownServer(metricsServer, clusterWorker) {
  try {
    if (metricsServer) {
      console.log('Shutting down MetricsServer');
      metricsServer.tearDown();
    }
  } catch (x) {
    console.log('Caught Server shutdown error: ' + x);
    console.log('Killing cluster worker ' + clusterWorker.id);
    killProcess(clusterWorker);
  }
}

process.on('exit', function() {
  console.log('fh-metrics stopped');
});
