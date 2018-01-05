// FeedHenry Metrics Generator
//
// Responsible for producing rolled up metrics data
// and writing messages to log files
//

"use strict";

var fs, fhmsg, helpers, async, fhdb;
// using node-fs here rather than fs allows us to mkdir recursively
//spawn = require('child_process').spawn;
fs = require('node-fs');
async = require('async');
fhmsg = require('./fhmsg.js');
helpers = require('./helpers.js');
fhdb = require('fh-db');

/* Constructor
 *
 */

function MetricsGenerator(pConfig, pLogger) {
  var self = this;
  this.mConfig = pConfig;
  this.mLogger = pLogger;
  this.messageMans = [];

  // Private functions
  this.constructDateQuery = function(start, end) {
    var query = {};

    query = {
      "_ts": {
        $gte: start.getTime(),
        $lt: end.getTime()
      }
    };
    self.mLogger.info('dateQuery: ' + JSON.stringify(query));

    return query;
  };


  this.createDir = function(dir, callback) {
    self.mLogger.info('creating dir:' + dir);
    fs.mkdir(dir, self.mConfig.metrics.dirPerms, true, function(err) {
      if (err) {
        self.mLogger.info(err.message);
      }
      // following code is to work around a bug in node-fs where doesn't signal an error
      // if a file already existed with the name of the directory to be created
      fs.stat(dir, function(err, stats) {
        if (!err && !stats.isDirectory()) {
          err = new Error("Problem creating directory: " + dir);
        }
        return callback(err);
      });
    });
  };

  this.constructLogFileDir = function(date) {
    var dir = '';

    dir = self.mConfig.metrics.metricsDir + '/' + date.getFullYear() + '/' + helpers.parseMonth(date.getMonth()) + '/' + helpers.parseDate(date.getDate());

    return dir;
  };

  this.connectDB = function(callback) {
    var self = this, db;

    db = new fhdb.Database();
    db.name = self.mConfig.metrics.database.name;

    db.on("tearUp", function() {
      callback(db);
    });

    db.addListener("error", function(err) {
      self.mLogger.error("connectDB error: " + err);
    });

    db.tearUp();
  };

}

MetricsGenerator.prototype.generateMetricsData = function(topic, date, callback) {
  var self = this, messageMan, result = [];
  self.mLogger.info("Starting metrics data generation..");
  var metricsMongoFunctions = require('./mongo_functions/index');

  var msgConfig = JSON.parse(JSON.stringify(self.mConfig));

  messageMan = new fhmsg.Messaging(msgConfig, self.mLogger);
  self.messageMans.push(messageMan);
  messageMan.database.on('tearUp', function() {
    var db = messageMan.database.db;
    var map_counter_per_domain_per_day = metricsMongoFunctions.metricsCounterPerDomainPerDay;
    var map_counter_per_domain_per_day_per_country = metricsMongoFunctions.metricsCounterPerDomainPerDayPerCountry;
    var map_counter_per_domain_per_day_per_owner  =  metricsMongoFunctions.metricsCounterPerDomainPerDayPerOwner;
    var map_counter_per_domain_per_day_per_owner_per_country =  metricsMongoFunctions.metricsCounterPerDomainPerDayPerOwnerPerCountry;
    var map_counter_per_domain_per_destination_per_day = metricsMongoFunctions.metricsCounterPerDomainPerDestinationPerDay;
    var map_counter_per_domain_per_destination_per_day_per_country = metricsMongoFunctions.metricsCounterPerDomainPerDestinationPerDayPerCountry;
    var map_counter_per_logindomain_per_day = metricsMongoFunctions.metricsCounterPerLoginDomainPerDay;
    var map_counter_per_logindomain_per_day_per_country = metricsMongoFunctions.metricsCounterPerLoginDomainPerDayPerCountry;
    var map_counter_per_logindomain_per_email_per_day = metricsMongoFunctions.metricsCounterPerLoginDomainPerEmailPerDay;
    var map_counter_per_logindomain_per_email_per_day_per_country = metricsMongoFunctions.metricsCounterPerLoginDomainPerEmailPerDayPerCountry;
    var reduce_total_counter = metricsMongoFunctions.metricsReduceTotalCounter;

    var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    var dateQuery = self.constructDateQuery(startDate, endDate);

    // below is a list of potential collections which exist in the fh-reporting db,
    //can we assume these are all system, they appear to be??
    var report_list = [
      {
        comment: 'user creates, per domain, per day',
        msgTopicName: 'useractivate_' + helpers.toYYYYMMDD(date),
        metricName: 'usercreate',
        mapFunc: map_counter_per_domain_per_day,
        reduceFunc: reduce_total_counter
      },

      {
        comment: 'user creates, per domain, per day, per country',
        msgTopicName: 'useractivate_' + helpers.toYYYYMMDD(date),
        metricName:  'usercreategeo',
        mapFunc: map_counter_per_domain_per_day_per_country,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'user logins, per day, per domain',
        msgTopicName: "userlogin_" + helpers.toYYYYMMDD(date),
        additionalQuery: {field: "result", value: "ok"},
        metricName:  'userlogin',
        mapFunc: map_counter_per_logindomain_per_day,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'user logins, per day, per domain, per country',
        msgTopicName: "userlogin_" + helpers.toYYYYMMDD(date),
        additionalQuery: {field: "result", value:  "ok"},
        metricName:  'userlogingeo',
        mapFunc: map_counter_per_logindomain_per_day_per_country,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'user logins, per email, per day, per domain',
        msgTopicName: "userlogin_" + helpers.toYYYYMMDD(date),
        additionalQuery: {field: "result", value:  "ok"},
        metricName:  'usernumlogin',
        mapFunc:     map_counter_per_logindomain_per_email_per_day,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'user logins, per email, per day, per domain, per country',
        msgTopicName: "userlogin_" + helpers.toYYYYMMDD(date),
        additionalQuery: {field: "result", value:  "ok"},
        metricName:  'usernumlogingeo',
        mapFunc: map_counter_per_logindomain_per_email_per_day_per_country,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'app creates per domain, per day',
        msgTopicName: "appcreate_" + helpers.toYYYYMMDD(date),
        metricName:  'appcreate',
        mapFunc: map_counter_per_domain_per_day,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'app creates per domain, per day, per country',
        msgTopicName: "appcreate_" + helpers.toYYYYMMDD(date),
        metricName:  'appcreategeo',
        mapFunc: map_counter_per_domain_per_day_per_country,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'app creates per domain, per day, per owner',
        msgTopicName: "appcreate_" + helpers.toYYYYMMDD(date),
        metricName:  'appownernumcreates',
        mapFunc: map_counter_per_domain_per_day_per_owner,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'app creates per domain, per day, per owner, per country',
        msgTopicName: "appcreate_" + helpers.toYYYYMMDD(date),
        metricName:  'appownernumcreatesgeo',
        mapFunc: map_counter_per_domain_per_day_per_owner_per_country,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'app builds per domain, per destination, per day',
        msgTopicName: "appbuild_" + helpers.toYYYYMMDD(date),
        metricName:  'appbuild',
        mapFunc: map_counter_per_domain_per_destination_per_day,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'app builds per domain, per destination, per day, per country',
        msgTopicName: "appbuild_" + helpers.toYYYYMMDD(date),
        metricName:  'appbuildgeo',
        mapFunc: map_counter_per_domain_per_destination_per_day_per_country,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'credentials uploaded, per domain, per day',
        msgTopicName: "apicalled_" + helpers.toYYYYMMDD(date),
        additionalQuery: {field: "url", value: {"$regex": "https?://[^/]+/box/srv/1.1/dev/account/res/upload"}},
        metricName:  'credentialsuploaded',
        mapFunc: map_counter_per_logindomain_per_day,
        reduceFunc:  reduce_total_counter
      },

      {
        comment: 'credentials uploaded, per domain, per day, per country',
        msgTopicName: "apicalled_" + helpers.toYYYYMMDD(date),
        additionalQuery: {field: "url", value: {"$regex": "https?://[^/]+/box/srv/1.1/dev/account/res/upload"}},
        metricName:  'credentialsuploadedgeo',
        mapFunc: map_counter_per_logindomain_per_day_per_country,
        reduceFunc:  reduce_total_counter
      }
    ];

    var doReport = function(rptSpec, cb) {
      self.mLogger.info('Running report: ' + rptSpec.comment);
      db.collection(rptSpec.msgTopicName, function(err, collection) {
        if (null !== err) {
          if (err.errmsg && err.errmsg === "ns doesn't exist") {
            err = null;  // if err is collection doesnt exist then forget error and return no results.  No messages have been logged to this topic name (yet)
            self.mLogger.info('Collection not found: ' + rptSpec.msgTopicName);
          }
          return callback(err, null);
        }

        var query = {}, options = {};

        query = JSON.parse(JSON.stringify(dateQuery));
        if (rptSpec.additionalQuery) {
          query[rptSpec.additionalQuery.field] = rptSpec.additionalQuery.value;
        }
        options = {query : query, out: {merge: rptSpec.metricName, db: self.mConfig.metrics.database.name}, scope: {ts: startDate.getTime()}};
        //map, reduce, options, callback
        collection.mapReduce(rptSpec.mapFunc, rptSpec.reduceFunc, options, function(err) {
          if (err) {
            if (err.errmsg && err.errmsg === "ns doesn't exist") {
              // if err is collection doesnt exist then forget error and return no results.  No messages have been logged to this topic name (yet)
              err = null;
              self.mLogger.info('Collection not found: ' + rptSpec.msgTopicName);
            } else if (!('undefined' === typeof err.message || (err.message.indexOf('collection name must be a String') < 0))) {
              err = null;
            }
            return cb(err);
          }
        });
      });
    };

    async.forEachSeries(
      report_list,
      function(rpt, cb) {
        doReport(rpt, function(err, results) {
          if (!err) {
            result.push(results);
          }
          return cb(err);
        });
      } , function(err) {
        callback(err, result);
      });
  });
};

MetricsGenerator.prototype.tearDown = function() {
  var self = this, mi, ml, tempMan;
  self.mLogger.info('no. messageGens:' + self.messageGens.length);
  for (mi = 0, ml = self.messageGens.length; mi < ml; mi += 1) {
    tempMan = self.messageGens[mi];
    tempMan.database.tearDown();
  }
};

// Make the constructor available externally
exports.MetricsGenerator = MetricsGenerator;
