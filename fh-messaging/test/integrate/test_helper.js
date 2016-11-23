var fs = require('fs'),
        nconf = require('nconf'),
        path = require('path'),
        fhdb = require('fh-db'),
        _ = require('underscore');
_.str = require('underscore.string');
moment = require('moment');
var async = require('async');
var fhconfig = require('fh-config');
var required = require('../../lib/requiredvalidation.js');
var async = require('async');

if (typeof process.env.CLEANDB === 'undefined' || process.env.CLEANDB === null) {
  cleanDb = true
} else {
  cleanDb = (/^1|true$/i).test('' + process.env.CLEANDB);
}

var configFile = path.resolve(__dirname, '../../config/dev.json');
var config;

exports.init = function (callback) {
  fhconfig.init(configFile, required, function(err){
    if(err){
      console.error("Problems reading config file: " + configFile);
      console.error(err);
      throw err;
    }

    var conf = fhconfig.getConfig().rawConfig;
    conf.metrics.database.name = 'test_metrics_results';
    conf.database.name = 'test_messaging_results';
    conf.ssl.use_ssl = false;
    conf.ssl.key =  path.resolve(__dirname, '../../config/server.key');
    conf.ssl.cert = path.resolve(__dirname, '../../config/server.crt');
    conf.geoip.dataFile = path.resolve(__dirname, '../../vendor/GeoIP.dat');

    return callback(null,conf);
  });
}

exports.getConfig = function () {
  return config;
}

exports.openDB = function (dbconfig, callback) {
  var db = new fhdb.Database(dbconfig.host, dbconfig.port, dbconfig.options);
  db.name = dbconfig.name;

  db.on("tearUp", function () {
    return callback(null, db);
  });

  db.addListener("error", function (err) {
    console.log("openDB database error: " + err);
    callback(err);
  });

  db.tearUp();
}

exports.testDataSetUp = function (dbconfig, testData, callback) {
  this.openDB(dbconfig, function (err, db) {
    if (err) {
      callback(err);
    }
    db.dropDatabase(function (err, result) {
      if (err) {
        callback(err);
      }
      if (testData) {
        var funcs = _.map(testData, function(collectionData, collectionName){
          return function(callback){
            var createCollection = function (err, data) {
              db.create(collectionName, collectionData.data, function (err, data) {
                if (err) {
                  return callback(err);
                }
                callback(null, data);
              });
            };
            if (_.has(collectionData, 'index')) {
              db.createCollectionWithIndex(collectionName, 'MD5', createCollection);
            } else {
              createCollection();
            }
          }
        });
        async.series(funcs, function(err, results){
          if(err){
            callback(err);
          }
          db.tearDown();
          callback(err, results, db);
        });
      } else {
        callback(err, null, db);
      }
    });
  });
}

exports.testDataTearDown = function (dbconfig, callback) {
  if (dbconfig.name == "fh-messaging" || dbconfig.name == "fh-metrics") {
    console.log("You probably don't really want to drop " + dbconfig.name + " : Skipping");
    callback();
  } else {
    var db = new fhdb.Database(dbconfig.host, dbconfig.port);
    db.name = dbconfig.name;

    db.on("tearUp", function () {
      if (cleanDb) {
        console.log("cleaning db :: " + cleanDb);
        db.dropDatabase(function (err, result) {
          if (err) {
            console.log("Error dropping database " + db.name);
          }
          db.tearDown();
          callback();
        });
      } else {
        console.log("skipping cleaning db");
        db.tearDown();
        callback();
      }
    });

    db.addListener("error", function (err) {
      console.log("testDataTearDown database error: " + err);
      callback(err);
    });

    db.tearUp();
  }
}

exports.setDefaultHeaders = function (setFlag, headers) {
  headers['Content-Type'] = 'application/json'
  if (setFlag) {
    headers['x-feedhenry-msgapikey'] = 'mysecrettestapikey';
  }
  return headers;
}

exports.queryParamsForDateStr = function (dateStr) {
  var m = moment(dateStr, "YYYYMMDD");
  return {"year": m.year(), "month": _.str.lpad(m.month() + 1, 2, '0'), "date": _.str.lpad(m.date(), 2, '0') }
}

exports.utcTimestampForDateStr = function (dateStr) {
  return moment.utc(dateStr, "YYYYMMDD").valueOf();
}
