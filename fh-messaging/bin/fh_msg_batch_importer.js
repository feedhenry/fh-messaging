#!/usr/bin/env node
//
// FeedHenry Batch Message Importer
//
var fs = require('fs');
var lines = require('lines');
var request = require('request');
var async = require('async');
var path = require('path');
var args = require('optimist')
  .demand('c').alias('c', 'config').describe('c', 'Config file to use (json) e.g. ../config/dev.json')
  .demand('f').alias('f', 'file').describe('f', 'filename to import e.g. dub1app1b/backupmessages.log.2011-09-30')
  .argv;
var fh_logger = require('fh-logger');
var log = require('../lib/logger');
var helpers = require('../lib/helpers.js');

//IMPORTANT: This will force node to ignore cert errors for https requests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var configFile = args.config;
var filename = args.file;
var config = null;

fs.exists = fs.exists || path.exists;
fs.existsSync = fs.existsSync || path.existsSync;

/* eslint-disable no-console */
if (!fs.existsSync(configFile)) {
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

// Create our logger
var logger = log.setLogger(fh_logger.createLogger(config.messaging.logger));

var startTime = Date.now();
var endTime = null;
var messageBatchSize = config.batchImporter.logMessageBatchSize;
var batches = {};
var sentMsgs = {};    // holds number of messages per topic whitelisted and sent to msgserver
var notSentMsgs = {}; // holds number of messages per topic not whitelisted and therefore not sent to msg server

var totals = {totalLines:0, totalNewMsgs: 0, totalExistingMessages:0, totalSent:0, totalWhiteListed:0};

function createMessagePoster(count, myTopic, myMsgs) {
  return function() {
    var apiInclTopic = config.batchImporter.logMessageApiPrefix + myTopic;

    var headers = {};
    if (config.batchImporter.apikey) {
      headers[config.batchImporter.apikey.name] = config.batchImporter.apikey.value;
    }
    q.push(function(cb) {
      request({uri: apiInclTopic, method: 'POST', json: myMsgs, headers: headers}, cb);
    }, (function(lineNum) {
      return function(error, response, body) {
        if (!error && response.statusCode === 200) {
          var newMsgs = (body.newMessages)?body.newMessages.length:0;
          var existingMsgs = (body.existingMessages)?body.existingMessages.length:0;
          var sentMsgs = myMsgs.length;
          totals.totalNewMsgs += newMsgs;
          totals.totalExistingMessages += existingMsgs;
          totals.totalSent += sentMsgs;
          logger.info("Processed " + newMsgs + " new messages, and " + existingMsgs + " existing messages, with " + sentMsgs + " input messages");
          if ((newMsgs + existingMsgs) !== sentMsgs) {
            logger.warn("Line: " + lineNum + ", sent messages for topic: " + myTopic + " that were not whitelisted by the messagserver: response from MessageServer: " + JSON.stringify(body)); // Print the response
          }
          logger.debug("Line: " + lineNum + ", response from MessageServer: " + JSON.stringify(body)); // Print the response
        } else {
          logger.error("Line: " + lineNum + ", Error calling MessageServer: " + JSON.stringify(error) + " , statusCode: " + (response?response.statusCode:"") + ", " + JSON.stringify(body));
        }
      };
    }(count)));
  };
}

// construct full file path
var importFileName = path.join(config.batchImporter.backupFileLocation, filename);
var rs = fs.createReadStream(importFileName, { flags: 'r', encoding: 'utf8', bufferSize: 64 * 1024 });
var allQueued = false; // flag to indicate when all lines read from file and sent to work queue

var counter = 1;
lines(rs);
rs.on('line', function(line) {
  totals.totalLines += 1;
  if (line.length > config.batchImporter.maxLineLength) {
    logger.error('Ignoring long line from backup message file. Line length: ' + line.length);
  } else {
    var jsonLine = null;
    try {
      jsonLine = JSON.parse(line);
    } catch (e) {
      logger.error("Failed to parse message to json, ignore it : file : " + importFileName + " : line: " + counter + " : content : " + line);
      return;
    }
    var topic = jsonLine.topic;
    var msg = jsonLine.message;

    helpers.isWhiteListed(config.batchImporter.whitelist, topic, msg, function(isWhiteListed) {
      if (isWhiteListed) {
        totals.totalWhiteListed += 1;
        if (!batches[topic]) {  // create topic batch if not already existing
          batches[topic] = [];
        }
        if (!sentMsgs[topic]) {
          sentMsgs[topic] = 0;
        }
        sentMsgs[topic] += 1;
        batches[topic].push(msg);  // add message to current batch for this topis

        if (batches[topic].length >= messageBatchSize) {  // if batch has "enough" messages then send to message server
          process.nextTick(createMessagePoster(counter, topic, JSON.parse(JSON.stringify(batches[topic]))));
          batches[topic] = [];
        }
      } else { // !whiteListed
        if (!notSentMsgs[topic]) {
          notSentMsgs[topic] = 0;
        }
        notSentMsgs[topic] += 1;
      }
    });
  }

  counter += 1;
});

rs.on('end', function() {
  logger.info("End of input file reached.");
  // at end of input file queue any partial batches remaining
  var tn;
  for (tn in batches) {
    if (batches.hasOwnProperty(tn)) {
      if (batches[tn].length > 0) {
        process.nextTick(createMessagePoster("END", tn, JSON.parse(JSON.stringify(batches[tn]))));
        batches[tn] = [];
      }
    }
  }
  allQueued = true;
});

function logSummaryInfo() {
  logger.info("Summary for file: " + importFileName);
  logger.info("Process Totals: " + JSON.stringify(totals));
  logger.info("numMessage sent: " + JSON.stringify(sentMsgs));
  logger.info("numMessage not sent: " + JSON.stringify(notSentMsgs));
  endTime = Date.now();
  logger.info("Elapsed time: " + (endTime-startTime) + " milliseconds");
}

var q = async.queue(function(task, callback) {
  task(callback);
}, config.batchImporter.numConcurrentWorkers);

// assign a callback
q.drain = function() {
  logger.info('async work queue drained, restarting stream');
  if (!allQueued) {  // if not finished then resume stream
    rs.resume();
  } else {  //  if finished then display totals
    logSummaryInfo();
  }
};

q.saturated = function() {
  logger.info('async work queue reached concurrency limit, pausing stream');
  rs.pause();
};
