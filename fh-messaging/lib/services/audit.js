var mongo = require('mongodb');
var async = require('async');
var log = require('../logger');
var moment = require('moment');

module.exports = function(db) {

  if (!db || !db instanceof mongo.Db) {
    throw new Error("expected to be passed an instance of monog.Db");
  }
  var logger = log.getLogger();

  var AUDIT_COLLECTION = "metrics_audit_log";

  function newAuditLog(jobName, jobStarted, rollupDate) {
    return {
      "_id": {"name": jobName, "started": jobStarted},
      "name": jobName,
      "started": jobStarted,
      "rollupFor": rollupDate,
      "status": "started",
      "hrStartDateUTC": moment(jobStarted).utc().toString(),
      "hrRollUpDateUTC": moment(rollupDate).utc().toString()
    };
  }

  function getCollection(callback) {
    db.collection(AUDIT_COLLECTION, callback);
  }

  function jobDecorator(auditJob) {

    function updateAudit(status, message) {
      auditJob.status = status;
      auditJob.finished = Date.now();
      auditJob.totalTime = auditJob.finished - auditJob.started;
      auditJob.hrFinishedUTC = moment(auditJob.finished).utc().toString();
      if (message) {
        auditJob.message = message;
      }
      return auditJob;
    }

    function completeSequence(cb) {
      return function(err, audit) {
        if ("function" === typeof cb) {
          return cb(err, audit);
        } else if (err) {
          logger.error("failed to update audit log ", err);
        }
      };
    }

    return {
      "completeJob": function(message, cb) {
        async.waterfall([
          async.apply(getCollection),
          function completed(collection, callback) {
            auditJob = updateAudit("complete");
            // db create, sys data?
            collection.save(auditJob, function(err) {
              return callback(err, auditJob);
            });
          }], completeSequence(cb));
      },
      "completeJobWithError": function(message, err, cb) {
        async.waterfall([
          async.apply(getCollection),
          function completed(collection, callback) {
            auditJob = updateAudit("error", "unexpected error");
            auditJob.err = (err instanceof Error) ? err.message : JSON.stringify(err);
            // db create, sys data?
            collection.save(auditJob, function(err) {
              return callback(err, auditJob);
            });
          }], completeSequence(cb));
      }
    };
  }

  return {
    /**
     *
     * @param jobName string
     * @param jobStarted timestamp
     * @param rollupDate timestamp
     * @param cb function
     * @return {"completeJob": function(),"completeJobWithError":function()}
     */
    "createRollUpLog": function(jobName, jobStarted, rollupDate, cb) {
      async.waterfall([
        async.apply(getCollection),
        function create(collection, callback) {
          var audit = newAuditLog(jobName, jobStarted, rollupDate);
          // db create
          collection.insert(audit, function(err) {
            var decoratedAudit = jobDecorator(audit);
            return callback(err, decoratedAudit);
          });
        }
      ], cb);

    },
    "findRollUpLogById": function(id, cb) {
      async.waterfall([
        async.apply(getCollection),
        function findById(collection, callback) {
          // db read
          collection.findOne({"_id": id}, callback);
        }
      ], cb);
    },
    "findWhereRolledUpForInDateRange": function(from, to, cb) {
      async.waterfall([
        async.apply(getCollection),
        function findByDate(collection, callback) {
          // db read
          collection.find({
            "rollupFor": {
              "$gte": from,
              "$lte": to
            }
          }).toArray(callback);
        }
      ], cb);
    }
  };

};
