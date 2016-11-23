#!/usr/bin/env node
//
// FeedHenry Metrics Generator
//
"use strict";

var fs, path, args, fhfg, metricsGen, config, configFile, topic, year, month, day, date, fh_logger;
fhfg = require('../lib/fh_metrics_gen.js');
fh_logger = require('fh-logger');
var log = require('../lib/logger');
path = require('path');
fs = require('fs');
args = require('optimist')
  .demand('c').alias('c', 'config').describe('c', 'Config file to use (json) e.g. ../config/dev.json')
  .demand('t').alias('t', 'topic').describe('t', 'Topic to generate log files/metrics for')
  .demand('y').alias('y', 'year').describe('y', 'Year to take messages for e.g. 2000')
  .demand('m').alias('m', 'month').describe('m', 'Month to take messages for (1-12)')
  .demand('d').alias('d', 'day').describe('d', 'Day to take messages for (1-31)')
  .demand('o').alias('o', 'output').describe('o', 'Type of metrics output. (db) -\'db\' rolled up metric data').default('o', 'db')
  .check(function(argv) {
    if (argv.output !== 'db') {
      throw 'Output must be \'db\'';
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

/* eslint-disable no-console */
if (!path.existsSync(configFile)) {
  console.log("Config file does not exist: " + configFile);
  process.exit(1);
}

try {
  var buf = fs.readFileSync(configFile.toString());
  config = JSON.parse(buf.toString());
} catch (e) {
  console.log("Problems reading conifg file: " + configFile);
  console.log(e);
  process.exit(1);
}
/* eslint-enable */

var logger = log.setLogger(fh_logger.createLogger(config.messaging.logger));

metricsGen = new fhfg.MetricsGenerator(config, logger);

//Subtract one from month as Date is zero based for months
date = new Date(year, month - 1, day);

logger.info('-----------------------------START-DB-METRICS-GENERATION---------------------------------');
logger.info('topic: "' + topic + '" date: "' + date.toString() + '" timestamp: ' + date.getTime());
logger.info('-----------------------------------------------------------------------------------------');

metricsGen.generateMetricsData(topic, date, function(err) {
  if (err) {
    logger.error('Generation error: "' + err.message + '"' + JSON.stringify(err));
  } else {
    logger.info('Generation complete..');
  }

  logger.info('-----------------------------END-DB-METRICS-GENERATION------------------------------------');
  logger.info('topic: "' + topic + '" date: "' + date.toString() + '" timestamp: ' + date.getTime());
  logger.info('------------------------------------------------------------------------------------------');
  process.exit(0);
});
