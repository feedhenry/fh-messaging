#!/usr/bin/env node
//
// FeedHenry Metrics Generator
//
"use strict";

var fs, path, args, fhmm, metricsMan, configFile, topic, year, month, day, date, fhconfig;
fhmm = require('../lib/fh_metrics_man.js');
var fh_logger = require('fh-logger');
var log = require('../lib/logger');
path = require('path');

//in os3 the placeholders are replaced by fhconfig so we need to init here to ensure the envars are picked up
fhconfig = require('fh-config');
fs = require('fs');
args = require('optimist')
  .demand('c').alias('c', 'config').describe('c', 'Config file to use (json) e.g. ../config/dev.json')
  .demand('t').alias('t', 'topic').describe('t', 'Topic to generate log files/metrics for')
  .demand('y').alias('y', 'year').describe('y', 'Year to take messages for e.g. 2000')
  .demand('m').alias('m', 'month').describe('m', 'Month to take messages for (1-12)')
  .demand('d').alias('d', 'day').describe('d', 'Day to take messages for (1-31)')
  .alias('o', 'output').describe('o', 'Type of metrics output. (log|db) \'log\' log files with message data -\'db\' rolled up metric data').default('o', 'log')
  .check(function(argv) {
    if (argv.output !== 'log' && argv.output !== 'db' && argv.output !== 'delete') {
      throw 'Output must be one of \'log\' or \'db\' or \'delete\'';
    }
  })
  .argv;

fs.exists = fs.exists || path.exists;
fs.existsSync = fs.existsSync || path.existsSync;

//pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), "utf8"));

configFile = args.config;
topic = args.topic;
year = args.year;
month = args.month;
day = args.day;

function setUpConfig(cb) {
  fhconfig.init(configFile, function(err,conf) {
    if (err) {
      /* eslint-disable no-console */
      console.log("Problems reading conifg file: " + configFile);
      console.log(err);
      process.exit(1);
      /* eslint-enable */
    } else {
      cb(conf);
    }
  });
}


function doRollup(config) {
  var logger = log.setLogger(fh_logger.createLogger(config.messaging.logger));

  metricsMan = new fhmm.MetricsManager(config, logger);

//Subtract one from month as Date is zero based for months
  date = new Date(year, month - 1, day);

  if ('log' === args.output) {
    logger.info('-----------------------------START-LOG-GENERATION----------------------------------------');
    logger.info('topic: "' + topic + '" date: "' + date.toString() + '" timestamp: ' + date.getTime());
    logger.info('-----------------------------------------------------------------------------------------');
    metricsMan.generateLogFiles(topic, date, function(err) {
      if (err) {
        logger.error('Generation error: "' + err.message + '"');
      } else {
        logger.info('Generation complete..');
      }

      logger.info('----------------------------END-LOG-GENERATION--------------------------------------------');
      logger.info('topic: "' + topic + '" date: "' + date.toString() + '" timestamp: ' + date.getTime());
      logger.info('------------------------------------------------------------------------------------------');
      process.exit(0);
    });
  } else if ('db' === args.output) {
    logger.info('-----------------------------START-DB-METRICS-GENERATION---------------------------------');
    logger.info('topic: "' + topic + '" date: "' + date.toString() + '" timestamp: ' + date.getTime());
    logger.info('-----------------------------------------------------------------------------------------');

    metricsMan.generateMetricsData(topic, date, function(err) {
      if (err) {
        logger.error('Generation error: "' + err.message + '"');
      } else {
        logger.info('Generation complete..');
      }

      logger.info('-----------------------------END-DB-METRICS-GENERATION------------------------------------');
      logger.info('topic: "' + topic + '" date: "' + date.toString() + '" timestamp: ' + date.getTime());
      logger.info('------------------------------------------------------------------------------------------');
      process.exit(0);
    });
  } else if ('delete' === args.output) {
    logger.info('-------------------------START-DELETE-METRICS-GENERATION---------------------------------');
    logger.info('topic: "' + topic + '" date: "' + date.toString() + '" timestamp: ' + date.getTime());
    logger.info('-----------------------------------------------------------------------------------------');

    metricsMan.deleteMetricsData(topic, date, function(err) {
      if (err) {
        logger.error('delete error: "' + err.message + '"');
      } else {
        logger.info('Delete complete..');
      }

      logger.info('-------------------------END-DELETE-METRICS-GENERATION------------------------------------');
      logger.info('topic: "' + topic + '" date: "' + date.toString() + '" timestamp: ' + date.getTime());
      logger.info('------------------------------------------------------------------------------------------');
      process.exit(0);
    });
  }

}

setUpConfig(function(conf) {
  doRollup(conf.rawConfig);
});
