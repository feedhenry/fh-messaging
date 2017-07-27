// FeedHenry Metrics Manager
//
// Responsible for producing rolled up metrics data
// and writing messages to log files
//

"use strict";

var fs, fhdb, fhmsg, helpers, async;
// using node-fs here rather than fs allows us to mkdir recursively
//spawn = require('child_process').spawn;
fs = require('node-fs');
async = require('async');
fhdb = require('fh-db');
fhmsg = require('./fhmsg.js');
helpers = require('./helpers.js');

/* Constructor
 *
 */

function MetricsManager(pConfig, pLogger) {
  var self = this;
  this.mConfig = pConfig;
  this.mLogger = pLogger;
  this.messageMans = [];


  // Private functions
  this.constructDateQuery = function(start, end, dateKeyPrefix) {
    var dateKey;

    if (!dateKeyPrefix) {
      dateKey = "_ts";
    } else {
      dateKey = dateKeyPrefix;
    }

    var query = {};
    query[dateKey] = {
      $gte: start.getTime(),
      $lt: end.getTime()
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

    db = new fhdb.Database(self.mConfig.metrics.database.host, self.mConfig.metrics.database.port, self.mConfig.metrics.database.options);
    db.name = self.mConfig.metrics.database.name;

    db.on("tearUp", function() {
      callback(db);
    });

    db.addListener("error", function(err) {
      self.mLogger.error("connectDB error: " + err);
    });

    db.tearUp(self.mConfig.metrics.database.auth);
  };

  this.getEachTopicMessage = function(messageMan, topic, date, group, callback) {
    var self = this,
      startDate = 0,
      endDate = 0,
      collectionName,
      query = {},
      dateQuery = {};

    // Construct the query for the correct date
    startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    dateQuery = self.constructDateQuery(startDate, endDate);

    if (group) {
      dateQuery[group.groupField] = group.groupValue;
    }

    collectionName = topic + "_" + helpers.toYYYYMMDD(date);

    self.mLogger.info("getting messages from " + collectionName);

    if (self.mConfig.metrics.whitelist &&
        self.mConfig.metrics.whitelist.genlogfiles &&
        self.mConfig.metrics.whitelist.genlogfiles[topic]) {
      dateQuery['$or'] = self.mConfig.metrics.whitelist.genlogfiles[topic]['$or'];
    }

    query["dateQuery"] = dateQuery;

    messageMan.getEachTopicMessage(collectionName, query, callback);
  };

  this.getGroupsList = function(messageMan, topic, date, key, callback) {
    var self = this,
      collectionName,
      startDate = 0,
      endDate = 0,
      dateQuery = {};
    // Construct the query for the correct date
    startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    dateQuery = self.constructDateQuery(startDate, endDate);

    collectionName = topic + "_" + helpers.toYYYYMMDD(date);
    self.mLogger.info("getting messages from " + collectionName);
    messageMan.getGroupsList(collectionName, key, dateQuery, callback);
  };

}


// Public functions
/*
 * Writes out the messages in the db to log files.
 * These log files are structured in a particular way
 *  e.g. per app, per topic, per day
 */
MetricsManager.prototype.generateLogFiles = function(topic, date, callback) {
  var self = this, messageMan;
  self.mLogger.info("Starting log file generation..");

  // must clone the config here otherwise causes some weird asynchronous issues
  // if multiple message managers pointed at the same config are running at the
  // same time

  var msgConfig = JSON.parse(JSON.stringify(self.mConfig));

  messageMan = new fhmsg.Messaging(msgConfig, self.mLogger);
  self.messageMans.push(messageMan);
  messageMan.database.on('tearUp', function() {
    var grouping = null, fileDir = '', topicInfo;
    topicInfo = self.mConfig.metrics.topics[topic];
    if ('undefined' !== typeof topicInfo && 'undefined' !== typeof topicInfo.groupField) {
      grouping = topicInfo.groupField;
    }

    fileDir = self.constructLogFileDir(date);
    self.createDir(fileDir, function() {
      self.mLogger.info('call self.getMessages');

      if (grouping) {
        self.getGroupsList(messageMan, topic, date, grouping, function(err, groups) {
          if (err) {
            return callback(err);
          }
          async.forEachSeries(groups, function(groupName, callback) {
            var tempFilePath = fileDir + '/' + topic + '.' + groupName + '.log';
            self.mLogger.info('creating X file: ' + tempFilePath);
            self.processGroup(messageMan, tempFilePath, topic, date, {groupField: grouping, groupValue: groupName}, callback);
          }, callback);
        });
      } else {
        var tempFilePath = fileDir + '/' + topic + '.log';
        self.mLogger.info('creating X file: ' + tempFilePath);
        self.processGroup(messageMan, tempFilePath, topic, date, null, callback);
      }
    });
  });
};

MetricsManager.prototype.deleteMetricsData = function(topic, date, callback) {
  var self = this, messageMan;
  self.mLogger.info("Starting delete..");

  // must clone the config here otherwise causes some weird asynchronous issues
  // if multiple message managers pointed at the same config are running at the
  // same time
  var msgConfig = JSON.parse(JSON.stringify(self.mConfig));
  var collectionName = topic + "_" + helpers.toYYYYMMDD(date);

  messageMan = new fhmsg.Messaging(msgConfig, self.mLogger);
  self.messageMans.push(messageMan);
  messageMan.database.on('tearUp', function() {
    messageMan.database.db.dropCollection(collectionName, callback);
    //remove all the data that is older than the x number of days from the intermediate tables
    async.each(['transactionsdesttemp', 'transactionsgeotemp'], function(tempCol, cb) {
      var daysToCalculate = self.mConfig.agenda.jobs.metrics_rollup_job.daysToKeep || 31;
      var beforeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysToCalculate);
      var query = {"_id.ts":{$lt: beforeDate.getTime()}};
      messageMan.database.db.collection(tempCol, function(err, collection) {
        if (err) {
          return cb(err);
        }
        collection.remove(query, cb);
      });
    }, callback);
  });
};

MetricsManager.prototype.processGroup = function(msgMan, outputFileName, topic, date, group, callback) {
  var outfile,
    self = this;
  async.series([
    function openFile(callback) {
      outfile = fs.open(outputFileName, "w+", function(err, fd) {
        if (!err) {
          outfile = fd;
        }
        callback(err);
      });
    },
    function processEachMessage(callback) {
      self.getEachTopicMessage(msgMan, topic, date, group, function(err, aMessage) {
        if (err) {
          self.mLogger.error(err);
          callback(err);
        }

        if (aMessage === null) {
          return callback(null);
        }
        var txtLine = JSON.stringify(aMessage);
        self.mLogger.info('aMessage: ' + txtLine);

        // Lets write messages to it
        self.mLogger.info('writing message: ');
        fs.writeSync(outfile, txtLine + "\n", null);
      });
    },
    function closeFile(callback) {
      self.mLogger.info('closing file');
      fs.close(outfile, callback);
    }
  ], callback);
};


MetricsManager.prototype.generateMetricsData = function(topic, date, callback) {
  var self = this, messageMan;
  self.mLogger.info("Starting metrics data generation..");
  var metricsMongoFunctions = require('./mongo_functions/index');
  var msgConfig = JSON.parse(JSON.stringify(self.mConfig));

  messageMan = new fhmsg.Messaging(msgConfig, self.mLogger);
  self.messageMans.push(messageMan);
  messageMan.database.on('tearUp', function() {
    var db, m, mgeo, r, startDate, endDate, dateQuery;
    var writeOpts = {};
    var m_domain, mgeo_domain, m_trans, mgeo_trans, r_trans, m_temptrans_app, m_temptrans_domain, m_active_device_app, m_active_device_domain, r_active_device, m_active_device_app_geo, m_active_device_domain_geo, r_active_device_geo;

    db = messageMan.database.db;

    m = metricsMongoFunctions.metricsM;

    mgeo = metricsMongoFunctions.metricsByGeo;

    r = metricsMongoFunctions.metricsR;

    m_domain = metricsMongoFunctions.metricsByDomain;

    mgeo_domain = metricsMongoFunctions.metricsByGeoDomain;

    m_temptrans_domain = metricsMongoFunctions.metricsByTemptransDomain;

    m_temptrans_app =  metricsMongoFunctions.metricsByTemptransApp;

    m_trans = metricsMongoFunctions.metricsByTrans;

    mgeo_trans = metricsMongoFunctions.metricsByGeoTrans;

    r_trans = metricsMongoFunctions.metricsRtrans;

    m_active_device_app = metricsMongoFunctions.metricsActiveDeviceApp;

    m_active_device_domain = metricsMongoFunctions.metricsActiveDeviceDomain;

    r_active_device = metricsMongoFunctions.metricsReduceActiveDevice;

    m_active_device_app_geo = metricsMongoFunctions.metricsActiveDeviceAppGeo;

    m_active_device_domain_geo = metricsMongoFunctions.metricsActiveDeviceDomainGeo;

    r_active_device_geo = metricsMongoFunctions.metricsReduceActiveDeviceGeo;

    var metrics_map_apprequestdest = metricsMongoFunctions.metricsMapAppRequestDest;

    var metrics_reduce_apprequestdest = metricsMongoFunctions.metricsReduceAppRequestDest;


    // map each row from collection topic_YYYYMMDD, matching date query combined with queryOptions,using mappingFunction
    // reduce using reduceFunction and saving result to outputCollection
    var reports = [
      // report: appinstallsdest
      { topic: "appinit", queryOptions: {firsttime: "install"}, outputCollection: 'appinstallsdest', mapFunction: m, reduceFunction: r},
      // report: domaininstallsdest
      { topic: "appinit", queryOptions: {firsttime: "install"}, outputCollection: 'domaininstallsdest', mapFunction: m_domain, reduceFunction: r},
      //report: appinstallsgeo
      { topic: "appinit", queryOptions: {firsttime: "install", country: {$exists: true, $ne: null}}, outputCollection: 'appinstallsgeo', mapFunction: mgeo, reduceFunction: r},
      //report: domaininstallsgeo
      { topic: "appinit", queryOptions: {firsttime: "install", country: {$exists: true, $ne: null}}, outputCollection: 'domaininstallsgeo', mapFunction: mgeo_domain, reduceFunction: r},
      // report: appstartupsdest
      { topic: "appinit", queryOptions: {}, outputCollection: 'appstartupsdest', mapFunction: m, reduceFunction: r},
      // report: domainstartupsdest
      { topic: "appinit", queryOptions: {}, outputCollection: 'domainstartupsdest', mapFunction: m_domain, reduceFunction: r},
      // report: appstartupsgeo
      { topic: "appinit", queryOptions: {country: {$exists: true, $ne: null}}, outputCollection: 'appstartupsgeo', mapFunction: mgeo, reduceFunction: r},
      // report: domainstartupsgeo
      { topic: "appinit", queryOptions: {country: {$exists: true, $ne: null}}, outputCollection: 'domainstartupsgeo', mapFunction: mgeo_domain, reduceFunction: r},

      // report: apprequestsdest
      { topic: "fhact", queryOptions: {}, outputCollection: 'apprequestsdest', mapFunction: metrics_map_apprequestdest, reduceFunction: metrics_reduce_apprequestdest},
      // report: apprequestsgeo
      { topic: "fhact", queryOptions: {country: {$exists: true, $ne: null}}, outputCollection: 'apprequestsgeo', mapFunction: mgeo, reduceFunction: r},
      // report: domainrequestsdest
      { topic: "fhact", queryOptions: {}, outputCollection: 'domainrequestsdest', mapFunction: m_domain, reduceFunction: r},
      // report: domainrequestsgeo
      { topic: "fhact", queryOptions: {country: {$exists: true, $ne: null}}, outputCollection: 'domainrequestsgeo', mapFunction: mgeo_domain, reduceFunction: r}
    ];

    async.series([
      function(cb) {
        async.eachSeries(reports, doReport, cb);
      },
      function(cb) {
        doTransactionsDestReports(cb);
      },
      function(cb) {
        doTransactionsGeoReports(cb);
      },
      function(cb) {
        doActiveDeviceReports(cb);
      },
      function(cb) {
        doActiveDeviceGeoReports(cb);
      }],
      function(err) {
        callback(err);
      }
    );

    function doReport(report, cb) {
      doMapReduce(date, report.topic, report.queryOptions, report.outputCollection, report.mapFunction, report.reduceFunction, cb);
    }

    function doMapReduce(date, topicName, queryOptions, outputCollection, mapFunction, reduceFunction, callback) {
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      dateQuery = self.constructDateQuery(startDate, endDate);

      var collectionName = topicName + "_" + helpers.toYYYYMMDD(date);
      async.series([
        function resetMongoValues(callback) {
          db.collection(outputCollection, function resetValues(err,collection) {
            //reset anything we are about to rollup
            var resetQuery = {"_id.ts":startDate.getTime()};
            collection.update(resetQuery,{$set:{"value":{}}}, writeOpts, function(err) {
              callback(err);
            });
          });
        },
        function runReduce(callback) {
          db.collection(collectionName, function(err, collection) {
            if (null !== err) {
              return callback(err, null);
            }


            var query = JSON.parse(JSON.stringify(dateQuery));
            var opt;

            for (opt in queryOptions) {
              if (queryOptions.hasOwnProperty(opt)) {
                query[opt] = queryOptions[opt];
              }
            }

            var options = {query : query, out: {merge: outputCollection, db: self.mConfig.metrics.database.name}, scope: {ts: startDate.getTime()}};
            // map, reduce, options, callback
            collection.mapReduce(mapFunction, reduceFunction, options, function(err, results) {
              var filteredErr = helpers.ignoreSomeErrs(err);
              return callback(filteredErr, results);
            });
          });
        }
      ],callback);
    }

    function doTransactionsDestReports(cb) {
      var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      var endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      var dateQuery = self.constructDateQuery(startDate, endDate);

      var fhactTopic = "fhact";
      var fhActPerDayTopicName = fhactTopic + "_" + helpers.toYYYYMMDD(date);
      var resetQuery = {"_id.ts":startDate.getTime()};

      // report: apptransactionsdest
      // report: domaintransactionsdest

      async.series([
        function resetDomaintransactionsdestMongoValues(callback) {
          db.collection("domaintransactionsdest", function resetValues(err,collection) {
            //reset anything we are about to rollup
            collection.update(resetQuery,{$set:{"value":{}}},writeOpts, function(err) {
              callback(err);
            });
          });
        },
        function resetApptransactionsdestMongoValues(callback) {
          db.collection("apptransactionsdest", function resetValues(err,collection) {
            //reset anything we are about to rollup
            collection.update(resetQuery,{$set:{"value":{}}},writeOpts, function(err) {
              callback(err);
            });
          });
        },
        function runReduce(callback) {
          db.collection(fhActPerDayTopicName, function(err, collection) {
            if (err) {
              return callback(err, null);
            }

            var query = {}, options = {};
            query = JSON.parse(JSON.stringify(dateQuery));
            options = {query : query, out: {merge: 'transactionsdesttemp'}, scope: {ts: startDate.getTime()}};
            //map, reduce, options, callback
            collection.mapReduce(m_trans, r_trans, options, function() {
              db.collection('transactionsdesttemp', function(err, collection) {
                if (err) {
                  return callback(err, null);
                }

                var query = {}, options = {};

                query = JSON.parse(JSON.stringify(self.constructDateQuery(startDate, endDate, "_id.ts")));
                options = {query : query, out: {merge: 'apptransactionsdest', db: self.mConfig.metrics.database.name}, scope: {ts: startDate.getTime()}};
                //map, reduce, options, callback
                collection.mapReduce(m_temptrans_app, r, options, function() {
                  var query = {}, options = {};
                  query = JSON.parse(JSON.stringify(self.constructDateQuery(startDate, endDate, "_id.ts")));
                  options = {query : query, out: {merge: 'domaintransactionsdest', db: self.mConfig.metrics.database.name}, scope: {ts: startDate.getTime()}};
                  //map, reduce, options, callback
                  collection.mapReduce(m_temptrans_domain, r, options, function(err, results) {
                    var filteredErr = helpers.ignoreSomeErrs(err);
                    return callback(filteredErr, results);
                  });
                });
              });
            });
          });
        }
      ],cb);
    }

    function doTransactionsGeoReports(cb) {
      var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      var endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      var dateQuery = self.constructDateQuery(startDate, endDate);

      var fhactTopic = "fhact";
      var fhActPerDayTopicName = fhactTopic + "_" + helpers.toYYYYMMDD(date);
      var resetQuery = {"_id.ts":startDate.getTime()};
      // report: apptransactionsgeo
      // report: domaintransactionsgeo

      async.series([
        function resetApptransactionsgeoMongoValues(callback) {
          db.collection("apptransactionsgeo", function resetValues(err,collection) {
            //reset anything we are about to rollup
            collection.update(resetQuery,{$set:{"value":{}}},writeOpts, function(err) {
              callback(err);
            });
          });
        },
        function resetDomaintransactionsgeoMongoValues(callback) {
          db.collection("domaintransactionsgeo", function resetValues(err,collection) {
            //reset anything we are about to rollup
            collection.update(resetQuery,{$set:{"value":{}}},writeOpts, function(err) {
              callback(err);
            });
          });
        },
        function runReduce(callback) {
          db.collection(fhActPerDayTopicName, function(err, collection) {
            if (null !== err) {
              return callback(err, null);
            }

            var query = {}, options = {};

            query = JSON.parse(JSON.stringify(dateQuery));
            query.country = {$exists: true, $ne: null};
            options = {query : query, out: {merge: 'transactionsgeotemp'}, scope: {ts: startDate.getTime()}};
            //map, reduce, options, callback
            collection.mapReduce(mgeo_trans, r_trans, options, function() {
              db.collection('transactionsgeotemp', function(err, collection) {
                if (null !== err) {
                  return callback(err, null);
                }

                var query = {}, options = {};

                query = JSON.parse(JSON.stringify(self.constructDateQuery(startDate, endDate, "_id.ts")));
                options = {query : query, out: {merge: 'apptransactionsgeo', db: self.mConfig.metrics.database.name}, scope: {ts: startDate.getTime()}};
                //map, reduce, options, callback
                collection.mapReduce(m_temptrans_app, r, options, function() {
                  var query = {}, options = {};
                  query = JSON.parse(JSON.stringify(self.constructDateQuery(startDate, endDate, "_id.ts")));
                  options = {query : query, out: {merge: 'domaintransactionsgeo', db: self.mConfig.metrics.database.name}, scope: {ts: startDate.getTime()}};
                  //map, reduce, options, callback
                  collection.mapReduce(m_temptrans_domain, r, options, function(err, results) {
                    var filteredErr = helpers.ignoreSomeErrs(err);
                    return callback(filteredErr, results);
                  });
                });
              });
            });
          });
        }],cb);
    }

    function doActiveDeviceReports(cb) {
      var daysToCalculate = self.mConfig.agenda.jobs.metrics_rollup_job.daysToKeep || 31;
      var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysToCalculate);
      var endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      var resetQuery = {"_id.ts":date.getTime()};

      async.series([
        function resetDomainActiveDeviceMongoValues(callback) {
          db.collection("domainactivedevice", function resetValues(err,collection) {
            //reset anything we are about to rollup
            if (err) {
              return callback(err);
            }
            collection.update(resetQuery,{$set:{"value":{}}},writeOpts, function(err) {
              callback(err);
            });
          });
        },
        function resetAppActiveDeviceMongoValues(callback) {
          db.collection("appactivedevice", function resetValues(err,collection) {
            //reset anything we are about to rollup
            if (err) {
              return callback(err);
            }
            collection.update(resetQuery,{$set:{"value":{}}},writeOpts, function(err) {
              callback(err);
            });
          });
        },
        function produceActiveDevices(callback) {
          //in order to get the active devices count for the last X number of days, we need to do map reduce on a single collection that has those information for the past X days:
          // * appid, domain, timestamp and cuid
          //"transactionsdesttemp" is exactly the collection we need. It alreadys contains the data we need, and a lot less compared to the original raw data.
          //For example, the documents in this collection are like these:
          //{"_id": {appid: id1, domain: domain1, ts: ts1, cuid: cuid1}, "value":{android:1}},
          //{"_id": {appid: id1, domain: domain1, ts: ts1, cuid: cuid2}, "value":{ios:1}},
          //{"_id": {appid: id1, domain: domain1, ts: ts2, cuid: cuid1}, "value":{android:1}},
          //{"_id": {appid: id2, domain: domain1, ts: ts1, cuid: cuid1}, "value":{android:1}},
          db.collection("transactionsdesttemp", function(err, collection) {
            if (err) {
              return callback(err);
            }

            var query = {}, options = {};

            query = self.constructDateQuery(startDate, endDate, "_id.ts");
            options = {query : query, out: {merge: 'appactivedevice', db: self.mConfig.metrics.database.name}, scope: {ts: date.getTime()}};
            //use the above documents in the comments as examples, here are the results after running each step per app:
            //map:
            //key: {appid: id1, domain: domain1, ts: today_ts} - value: [{cuid1: {android:1}}, {cuid2: {ios:1}}, {cuid1: {android:1}}]
            //key: {appid: id2, domain: domain1, ts: today_ts} - value: {cuid1: {android:1}}
            //reduce:
            //key: {appid: id1, domain: domain1, ts: today_ts} - value: {cuids: {cuid1: {android:1}, cuid2:{ios:1}}, destinations:{android:1, ios:1}, total: 2}
            //key: {appid: id2, domain: domain1, ts: today_ts} - value: {cuids: {cuid1: 1}, destinations:{android:1}, total: 1}
            //NOTE: we can't just return the length of the value as the result of reduce step for 2 reasons:
            //1. According to the mapReduce document, mongo can call the reduce function multiple times and the results of the previous reduce will be passed as one of the values to the next reduce function.
            //because of this, the reduce function we use here will just construct a map that contains non-duplicated cuids.
            //2. Another reason for using this reduce function is that we can't lose the cuids as part of the mapReduce in each decoupled mbaas.
            //Each decoupled mbaas will have fh-messaging running as well, and the CoreMAP will get the results from each mbaas and run another rollup.
            //We can't just simply count the number of unqinue devices in each mbaas and add them up. There could be the same device talk to multiple mbaases.
            //So the mapReduce process should produce the list of the unique cuids in each mbaas, and in the CoreMAP, there will be another run of mapReduce to count the total unique devices in Core and all the mbaases.
            collection.mapReduce(m_active_device_app, r_active_device, options, function() {
              options = {query : query, out: {merge: 'domainactivedevice', db: self.mConfig.metrics.database.name}, scope: {ts: date.getTime()}};
              //use the above documents in the comments as examples, here are the results after running each step per domain:
              //map:
              //key: {domain: domain1, ts: today_ts} - value: [{cuid1: {android:1}}, {cuid2: {ios:1}}, {cuid1: {android:1}}, {cuid1: {android:1}}]
              //reduce:
              //key: {domain: domain1, ts: today_ts} - value: {cuids: {cuid1: {android:1}, cuid2:{ios:1}}, destinations:{android:1, ios:1}, total: 2}
              collection.mapReduce(m_active_device_domain, r_active_device, options, function(err, results) {
                var filteredErr = helpers.ignoreSomeErrs(err);
                return callback(filteredErr, results);
              });
            });
          });
        }
      ], cb);
    }

    function doActiveDeviceGeoReports(cb) {
      var daysToCalculate = self.mConfig.agenda.jobs.metrics_rollup_job.daysToKeep || 31;
      var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysToCalculate);
      var endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      var resetQuery = {"_id.ts":date.getTime()};

      async.series([
        function resetDomainActiveDeviceGeoMongoValues(callback) {
          db.collection("domainactivedevicegeo", function resetValues(err,collection) {
            //reset anything we are about to rollup
            if (err) {
              return callback(err);
            }
            collection.update(resetQuery,{$set:{"value":{}}},writeOpts, function(err) {
              callback(err);
            });
          });
        },
        function resetAppActiveDeviceMongoValues(callback) {
          db.collection("appactivedevicegeo", function resetValues(err,collection) {
            //reset anything we are about to rollup
            if (err) {
              return callback(err);
            }
            collection.update(resetQuery,{$set:{"value":{}}},writeOpts, function(err) {
              callback(err);
            });
          });
        },
        function produceActiveDevicesGeo(callback) {
          //in order to get the active devices geo count for the last X number of days, we need to do map reduce on a single collection that has those information for the past X days:
          // * appid, domain, timestamp, cuid and country
          //"transactionsgeotemp" is exactly the collection we need. It alreadys contains the data we need, and a lot less compared to the original raw data.
          //For example, the documents in this collection are like these:
          //{"_id": {appid: id1, domain: domain1, ts: ts1, cuid: cuid1}, "value":{Ireland:1}},
          //{"_id": {appid: id1, domain: domain1, ts: ts1, cuid: cuid2}, "value":{Germany:1}},
          //{"_id": {appid: id1, domain: domain1, ts: ts2, cuid: cuid1}, "value":{Ireland:1}},
          //{"_id": {appid: id2, domain: domain1, ts: ts1, cuid: cuid1}, "value":{Germany:1}},
          db.collection("transactionsgeotemp", function(err, collection) {
            if (err) {
              return callback(err);
            }

            var query = {}, options = {};

            query = self.constructDateQuery(startDate, endDate, "_id.ts");
            options = {query : query, out: {merge: 'appactivedevicegeo', db: self.mConfig.metrics.database.name}, scope: {ts: date.getTime()}};
            //use the above documents in the comments as examples, here are the results after running each step per app:
            //map:
            //key: {appid: id1, domain: domain1, ts: today_ts} - value: [{Ireland: {cuids: {cuid1:1}, total: 1}}, {Germany: {cuids: {cuid2:1}, total: 1}}, {Ireland: {cuids: {cuid1:1}, total: 1}}]
            //key: {appid: id2, domain: domain1, ts: today_ts} - value: {Germany: {cuids: {cuid1: 1}, total: 1}}
            //reduce:
            //key: {appid: id1, domain: domain1, ts: today_ts} - value: {Ireland: {cuids:{cuid1:1}, total:1}, Germany: {cuids1: {cuid2:1}, total: 1}}
            //key: {appid: id2, domain: domain1, ts: today_ts} - value: {Germany: {cuids: {cuid1: 1}, total: 1}}
            //NOTE: we can't just return the length of the value as the result of reduce step for 2 reasons:
            //1. According to the mapReduce document, mongo can call the reduce function multiple times and the results of the previous reduce will be passed as one of the values to the next reduce function.
            //because of this, the reduce function we use here will just construct a map that contains non-duplicated cuids.
            //2. Another reason for using this reduce function is that we can't lose the cuids as part of the mapReduce in each decoupled mbaas.
            //Each decoupled mbaas will have fh-messaging running as well, and the CoreMAP will get the results from each mbaas and run another rollup.
            //We can't just simply count the number of unqinue devices in each mbaas and add them up. There could be the same device talk to multiple mbaases.
            //So the mapReduce process should produce the list of the unique cuids in each mbaas, and in the CoreMAP, there will be another run of mapReduce to count the total unique devices in Core and all the mbaases.
            collection.mapReduce(m_active_device_app_geo, r_active_device_geo, options, function() {
              options = {query : query, out: {merge: 'domainactivedevicegeo', db: self.mConfig.metrics.database.name}, scope: {ts: date.getTime()}};
              //use the above documents in the comments as examples, here are the results after running each step per domain:
              //map:
              //key: {domain: domain1, ts: today_ts} - value: [{Ireland: {cuids: {cuid1:1}, total: 1}}, {Germany: {cuids: {cuid2:1}, total: 1}}, {Ireland: {cuids: {cuid1:1}, total: 1}}, {Germany: {cuids:{cuid1:1}, total:1}}]
              //reduce:
              //key: {domain: domain1, ts: today_ts} - value: {Ireland:{cuids:{cuid1:1}, total:1}, Germany: {cuids: {cuid1:1, cuid2:1}, total:2}}
              collection.mapReduce(m_active_device_domain_geo, r_active_device_geo, options, function(err, results) {
                var filteredErr = helpers.ignoreSomeErrs(err);
                return callback(filteredErr, results);
              });
            });
          });
        }
      ], cb);
    }


  });
};

MetricsManager.prototype.getMetric = function(metric, query, callback) {
  var self = this, startDate, endDate;

  self.mLogger.info('query: ' + JSON.stringify(query));

  startDate = new Date(query.from.year, query.from.month - 1, query.from.date);
  // Get the 'to' date, if available, or default to next day  i.e. a single days metrics
  if (query.to) {
    endDate = new Date(query.to.year, query.to.month - 1, query.to.date);
    endDate.setDate(endDate.getDate() + 1);
  } else {
    endDate = new Date(startDate.getTime());
    endDate.setDate(endDate.getDate() + 1);
  }

  var metric_id_field_name = self.mConfig.metrics.idFieldName["default"];
  if (self.mConfig.metrics.idFieldName[metric]) {
    metric_id_field_name = self.mConfig.metrics.idFieldName[metric];
  }

  self.mLogger.info('METRIC_collection: ' + metric + ' ' + metric_id_field_name + ': ' + query._id);

  self.connectDB(function(db) {
    var findQuery = {'_id.ts': {$gte: startDate.getTime(), $lt: endDate.getTime()} };
    findQuery[metric_id_field_name] = query._id;
    self.mLogger.info('METRIC_QUERY: ' + JSON.stringify(findQuery));
    db.find(metric, findQuery , function(err, results) {
      if (err) {
        db.tearDown();
        return callback(err);
      }

      self.mLogger.debug('METRIC_results: ' + JSON.stringify(results));
      db.tearDown();
      callback(null, results);
    });
  });
};

MetricsManager.prototype.getMetricFilePaths = function(metric, query, callback) {
  var self = this, startDate, endDate, id, time, end, tempDate, tempFile, tempStat, mFiles = [];

  self.mLogger.debug('query: ' + JSON.stringify(query));
  id = query._id;

  if (('appinstallsdest' === metric) || ('appstartupsdest' === metric)) {
    metric = 'appinit';
  }

  startDate = new Date(query.from.year, query.from.month - 1, query.from.date);
  // Get the 'to' date, if available, or default to next day  i.e. a single days metrics
  if (query.to && query.to.year) {
    endDate = new Date(query.to.year, query.to.month - 1, query.to.date);
    endDate.setDate(endDate.getDate() + 1);
  } else {
    endDate = new Date(startDate.getTime());
    endDate.setDate(endDate.getDate() + 1);
  }

  self.mLogger.info('download raw: ' + metric + ' _id: ' + id + ' from metricsDir: ' + self.mConfig.metrics.metricsDir);

  process.chdir(self.mConfig.metrics.metricsDir);

  // get all log files for the specified app id in the specified range
  time = new Date(startDate.getTime());
  end = endDate.getTime();
  self.mLogger.info('time: ' + time);
  self.mLogger.info('end: ' + end);
  while (time.getTime() < end) {
    self.mLogger.debug('time: ' + time);
    tempDate = new Date(time);

    tempFile = tempDate.getFullYear() + '/' + helpers.parseMonth(tempDate.getMonth()) + '/' + helpers.parseDate(tempDate.getDate()) + '/' + metric + '.' + id + '.log';

    self.mLogger.info('stat ' + tempFile);

    try {
      tempStat = fs.statSync(tempFile);
      self.mLogger.debug(JSON.stringify(tempStat));

      if (tempStat.isFile()) {
        self.mLogger.info('adding file : ' + tempFile);
        mFiles.push(tempFile);
      }
    } catch (e) {
      self.mLogger.debug('Ignoring: ' + e);
    }

    time.setDate(time.getDate() + 1);
  }

  callback(null, mFiles);
};

MetricsManager.prototype.tearDown = function() {
  var self = this, mi, ml, tempMan;
  self.mLogger.info('no. messageMans:' + self.messageMans.length);
  for (mi = 0, ml = self.messageMans.length; mi < ml; mi += 1) {
    tempMan = self.messageMans[mi];
    tempMan.database.tearDown();
  }
};

// Make the constructor available externally
exports.MetricsManager = MetricsManager;
