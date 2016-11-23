var util = require('util');
var rollup = require("../fh_rollup.js");
var moment = require('moment');
var audit = require('../services/audit');
var async = require('async');
var metricsService = require('../services/mbaas_metrics');
var helpers = require('../helpers');
var rollUpTime = helpers.daysAgo;

module.exports = function(logger, config, agenda, db) {
  var auditService = audit(db);
  var metrics = metricsService(db);
  var days = config.agenda.jobs.metrics_rollup_job.options.rollupFor.daysAgo;
  var logTag = "#metrics_rollup ";
  var jobSchedule = config.agenda.jobs.metrics_rollup_job.schedule;
  var jobName = "metrics_rollup_job";

  // Determines how long the raw data is kept for aggregation
  var daysToKeep = config.agenda.jobs.metrics_rollup_job.daysToKeep;

  return {
    "setUp": jobSetup,
    "job": jobDefinition,
    "runJobFor": runJobFor,
    "runJobFromTo": runJobFromTo
  };


  function jobSetup() {
    agenda.define(jobName, jobDefinition(days));
    agenda.every(jobSchedule, 'metrics_rollup_job',{},{"timezone":"UTC"});

    agenda.on("fail:metrics_rollup_job", function(err, job) {
      if (job.audit) {
        job.audit.completeJobWithError("agenda job failed ", err);
      }
      logger.warn(logTag + " : failed  to run job metrics_rollup_job error " + util.inspect(err));
    });
  }

  function runJobFor(time, cb) {
    executeJob(time, {}, cb);
  }

  function runJobFromTo(from, to, cb) {
    executeFromTo(from, to, {}, cb);
  }

  function completeJob(err, auditLog, cb) {
    var message;
    if (err) {
      message = logTag + " Failed to perform scheduled metrics roll-up";
      logger.error({err: err}, message);
      auditLog.completeJobWithError(message, err);
      logger.info(message + " updated audit log marking job done");
      logger.error(err);
      return cb();
    }
    message = logTag + ' Successfully performed scheduled metrics roll-up';
    auditLog.completeJob(message);
    logger.info(message + " updated audit log marking job done");
    cb();
  }

  function jobDefinition(daysAgo) {
    //this is called by agenda
    return function(job, done) {
      try {
        var timeInfo = rollUpTime(daysAgo);
        metrics.getRollUpFrom(function(err, from) {
          if (err) {
            logger.error("error getting rollup from ", err);
            return done(err);
          }
          executeFromTo(from, timeInfo, job, done);

        });
      } catch (e) {
        logger.error(logTag + "exception occurred running job ", e);
      }
    };
  }

  function executeFromTo(from, to, job, done) {
    var series = [];
    //always run once for the expected date
    series.push(function(callback) {
      executeJob(to, job, callback);
    });
    logger.info(logTag + " from is ", from);
    if (from) {
      //get the number of days difference
      var numDays = helpers.totalDaysBetweenDates(from.from, to.START_OF_DAY);
      logger.info(logTag + " total number of days to roll up ", 1 + numDays); //always is 1 day
      //already have the expected date in the series which would be 0 days ago
      for (var i = 1; i <= numDays; i++) {
        series.push(function(days) {
          var thePast = helpers.daysAgoFromDate(to.START_OF_DAY, days);
          return function(callback) {
            executeJob(thePast, job, callback);
          };
        }(i));
      }
    }

    logger.info(logTag + " number of jobs to execute " + series.length);
    //execute our series of jobs
    async.series(series, function(err) {
      if (err) {
        logger.error(logTag + " error executing series ", err);
        return done();
      }
      metrics.clearFrom(function(err) {
        if (err) {
          logger.error(logTag + " error removing from collection . ", err);
        }
        done();
      });
    });
  }

  function executeJob(timeInfo, job, done) {
    logger.info(logTag + " executing metrics rollup for ", timeInfo.HR_DATE);
    async.waterfall([
      isEnabled,
      async.apply(startAuditLog, timeInfo),
      async.apply(processRawMessages, job, timeInfo),
      async.apply(reduceMbaasAndCoreData, timeInfo)
    ], function(err, audit) {
      completeJob(err, audit, done);
    });
  }

  function isEnabled(cb) {
    var error;
    if (false === config.agenda.jobs.metrics_rollup_job.enabled) {
      error = {"message": "metrics rollup job not enabled", "code": 503};
    }
    cb(error);
  }

  function startAuditLog(time, cb) {
    auditService.createRollUpLog("metrics_rollup", Date.now(), time.END_OF_DAY, cb);
  }

  function processRawMessages(job, time, auditLog, callback) {
    job.audit = auditLog;
    config.doimport = config.agenda.jobs.metrics_rollup_job.options.doImport;
    var day = moment(time.END_OF_DAY).format("YYYY-MM-DD");
    logger.info('#metrics_rollup Starting metrics rollup for day ' + day);
    rollup.process(config, logger, day, daysToKeep, function(err, result) {
      if (err) {
        return callback(err, auditLog);
      }
      if (result) {
        logger.info("#metrics_rollup: result ", result.output);
        if (result.code === 0) {
          return callback(undefined, auditLog);
        }
      }
      return callback('Something went wrong while performing scheduled metrics roll-up', auditLog);
    });
  }

  function reduceMbaasAndCoreData(time, auditLog, callback) {
    var dbOutput = config.metrics.database.name;
    metrics.reduceMetricsForTimePeriod(metrics.MbaasMetricTypes, time.START_OF_DAY, time.END_OF_DAY, dbOutput, function(err) {
      callback(err, auditLog);
    });
  }
};
