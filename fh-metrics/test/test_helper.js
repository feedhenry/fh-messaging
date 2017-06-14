var fs = require('fs');
var nconf = require('nconf');
var path = require('path');
var fhdb = require('fh-db');
var _ = require('underscore');
var async = require('async');
_.str = require('underscore.string');
var moment = require('moment');

if (typeof process.env.CLEANDB === 'undefined' || process.env.CLEANDB === null) {
  cleanDb = true;
} else {
  cleanDb = (/^1|true$/i).test('' + process.env.CLEANDB);
}

nconf.file(path.resolve(__dirname, '../config/dev.json'));


nconf.set("metrics:database:name", "test_results");
nconf.set("metrics:ssl:use_ssl", false);
nconf.set("metrics:ssl:key", path.resolve(__dirname, '../config/server.key'));
nconf.set("metrics:ssl:cert", path.resolve(__dirname, '../config/server.crt'));
nconf.set("metrics:ignoreAPIKey", true);

exports.getConfig = function () {
  if(process.env.MONGODB_HOST) {
    console.log(process.env.MONGODB_HOST);
    nconf.set("metrics:database:host",process.env.MONGODB_HOST);
  }
  return nconf;
}

exports.openDB = function (dbconfig, callback) {
  var db = new fhdb.Database(dbconfig.host, dbconfig.port, dbconfig.options);
  db.name = dbconfig.name;

  db.on("tearUp", function () {
    return callback(null, db);
  });

  db.addListener("error", function (err) {
    console.log("openDB database error: " + err);
    return callback(err);
  });

  db.tearUp();
}

exports.testDataSetUp = function (dbconfig, testData, callback) {
  this.openDB(dbconfig, function (err, db) {
    if (err) {
      return callback(err);
    }
    db.dropDatabase(function (err, result) {
      if (err) {
        return callback(err);
      }
      if (testData) {
        async.forEachOf(testData, function (collectionData, collectionName, asyncCallback) {
          var createCollection = function (err, data) {
            db.create(collectionName, collectionData.data, function (err, data) {
              if (err) {
                console.log(err);
                return asyncCallback(err);
              }
              return asyncCallback(err, data, db);
            });
          };

          if (_.has(collectionData, 'index')) {
            db.createCollectionWithIndex(collectionName, 'MD5', createCollection);
          } else {
            createCollection();
          }
        }, function(err) {
          db.tearDown();
          return callback(err);
        });
      } else {
        return callback(err, null, db);
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
