#!/usr/bin/env node
//
//  Main FeedHenry Message Server.
//
var fhsrv = require("../lib/fhsrv.js");
var args = require('optimist').argv;
var fs = require('fs');
var path = require('path');
var fhconfig = require('fh-config');
var required = require('../lib/requiredvalidation.js');
var fhlogger = require('fh-logger');
var log = require('../lib/logger');
var fhcluster = require('fh-cluster');
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
} else if (require.main === module) {
  var numWorkers = args.workers;
  fhcluster(startWorker,numWorkers);
}

function startWorker(clusterWorker) {
  var configFile = args._[0];
  fhconfig.init(configFile, required, function(err) {
    if (err) {
      handleConfigError(configFile, err);
    }
    var config = getConfig(fhconfig, configFile);
    logger = log.setLogger(fhlogger.createLogger(config.messaging.logger));
    config.fhconfig = fhconfig;
    startMsgServer(config, clusterWorker || process) ;
  });
}

function handleConfigError(configFile, err) {
  console.log('Error reading config file: ' + configFile);
  console.log(err);
  process.exit(1);
}

/* eslint-enable*/

function getConfig(fhconfig, configFile) {
  var config = fhconfig.getConfig().rawConfig;
  config.configFilePath = path.resolve(configFile);
  config.configDir = path.dirname(config.configFilePath);
  return config;
}

function startMsgServer(config, clusterWorker) {
  var msgServer = new fhsrv.MessageServer(config, logger);
  msgServer.messaging.database.on('tearUp', function() {
    var port = config.messaging.port;
    if (config.ssl.use_ssl === 'true') {
      port = config.ssl.port;
    }
    var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    logger.info('Starting Messaging Server version ' + pkg.version + ' on port: ' + port);
    msgServer.server.listen(port);
    logger.info('Started fh-messaging');
  });


  function handleMongoConnError(message) {
    logger.error(message);
    logger.warn('Stopping fh-messaging...');
    clusterWorker.emit('exit');
  }

  msgServer.messaging.database.on('dbconnectionerror', function(err) {
    var errMsg = 'Error connecting to database: ' + JSON.stringify(err);
    handleMongoConnError(errMsg);
  });

  msgServer.messaging.database.on('close', function(err) {
    var errMsg = 'Database connection closed: ' + JSON.stringify(err);
    handleMongoConnError(errMsg);
  });

  msgServer.messaging.database.on('error', function(err) {
    var errMsg = 'Database connection error: ' + JSON.stringify(err);
    handleMongoConnError(errMsg);
  });


  msgServer.messaging.database.on('tearDown', function() {
    logger.info('Tear down complete. Database closed gracefully. Killing worker #' + clusterWorker.id);
    killProcess(clusterWorker);
  });

  clusterWorker.on('exit', function() {
    logger.info('Cluster worker #' + clusterWorker.id + 'is exiting, attempting clean server shutdown');
    shutdownMsgServer(msgServer, clusterWorker);
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

function shutdownMsgServer(msgServer, clusterWorker) {
  try {
    if (msgServer) {
      logger.info('Shutting down MessageServer');
      msgServer.tearDown();
    }
  } catch (x) {
    logger.error('Caught Server shutdown error: ' + x);
    killProcess(clusterWorker);
  }
}
