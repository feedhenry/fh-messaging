var request = require("request");
var fhdb = require("fh-db");
var _ = require('underscore');
_.str = require('underscore.string');
var fs = require('fs');
var moment = require('moment');

exports.testConfig = {
  "messaging": {
    "host": "localhost",
    "port": "8903",
    "database": {
      "name": "fh-messaging"
    }
  },
  "metrics": {
    "host": "localhost",
    "port": "8913",
    "database": {
      "name": "fh-metrics"
    }
  }
}

exports.cleanUp = function (cb) {
  var self = this;
  this.databaseCleaner(self.getMsgConfig().database, function () {
    self.databaseCleaner(self.getMetConfig().metrics.database, cb);
  });
}

exports.databaseCleaner = function (dbcfg, cb) {
  console.log("Cleaning up db :: " + JSON.stringify(dbcfg));
  if (dbcfg.name == "fh-messaging" || dbcfg.name == "fh-metrics") {
    console.log("You probably don't really want to drop " + dbcfg.name + " : Skipping");
    cb();
  } else {
    var db = new fhdb.Database(dbcfg.host, dbcfg.port);
    db.name = dbcfg.name;

    db.on("tearUp", function () {
      console.log("Database opened ");
      db.dropDatabase(function (err, result) {
        if (err) {
          console.log("Error dropping database " + db.name);
        }
        db.tearDown();
        cb();
      });
    });

    db.addListener("tearDown", function () {
      console.log("Database closed..");
    });

    db.addListener("error", function (err) {
      console.log("Database error: " + err);
    });

    db.on("dbconnectionerror", function (err) {
      console.log("Database connection error: " + err);
    });
    db.tearUp();
  }
}

exports.getMsgConfig = function () {
  var buf = fs.readFileSync(__dirname + "/config/fh-messaging/dev.json");
  return JSON.parse(buf.toString());
}

exports.getMetConfig = function () {
  var buf = fs.readFileSync(__dirname + "/config/fh-metrics/dev.json");
  return JSON.parse(buf.toString());
}

exports.getMetricsUrl = function (endpoint) {
  var cfg = this.getMetConfig();
  return "http://localhost:" + cfg.metrics.port + "/" + endpoint
}

exports.getMessagingUrl = function (endpoint) {
  var cfg = this.getMsgConfig();
  return "http://localhost:" + cfg.messaging.port + "/" + endpoint
}

exports.setHeader = function (setFlag, headers) {
  headers['Content-Type'] = 'application/json'
  if (setFlag) {
    headers['x-feedhenry-msgapikey'] = 'mysecrettestapikey';
  }
  return headers;
}

exports.utcTimestampForDateStr = function (dateStr) {
  //ToDo This timestamp is wrong, the correct utc timestamp for 20130530 is 1369872000000. This is a workaround until the other tests timezone issue is fixed.
  //This should always be retuning a utc timestamp, but because of the timezone issue, it is returning a local time instead (THIS NEEDS FIXED ASAP)
  //  return moment.utc(dateStr, "YYYYMMDD").valueOf()
  return moment(dateStr, "YYYYMMDD").valueOf();
}

exports.queryParamsForDateStr = function (dateStr) {
  var m = moment(dateStr, "YYYYMMDD");
  return {"year": m.year(), "month": _.str.lpad(m.month() + 1, 2, '0'), "date": _.str.lpad(m.date(), 2, '0') }
}

exports.generateMessage = function (overrides) {
  //1369914119993 == 20130530 = Thu May 30 11:41:59 UTC 2013
  var msg = {
    "_ts" : 1369914119993,
    "_cl": "testing",
    "_ho": "localhost",
    "app_version": "1",
    "appid": "12345",
    "appkey": "54321",
    "destination": "studio",
    "domain": "testing",
    "instid": "12345",
    "ipAddress": "127.0.0.1",
    "sdk_version": "FH_HYBRID_SDK/1.1.0",
    "subscriber": "-",
    "uuid": "ABD1D4229D5C41EE8CAB2E77CB0C8665"};
  return _.extend(msg, overrides);
}