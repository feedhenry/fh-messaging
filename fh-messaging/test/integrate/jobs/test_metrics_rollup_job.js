var proxy = require('proxyquire');
var TEST_CONFIG = '../../../config/dev.json';
var util = require('util');
var MongoClient = require('mongodb').MongoClient;
var mongo;
var UNDERTEST = '../../../lib/jobs/metrics_rollup_job';
var _ = require("underscore");
var async = require('async');
var sinon = require('sinon');
var moment = require('moment');
var helpers = require('../../../lib/helpers');
var config = require(TEST_CONFIG);
var mbaasMetricsUtil = require('../fixtures/mbaasMetrics');
var fhconfig = require('fh-config');

var PROJECTID = "testprojectid";
var APPID = "testappid";
var DOMAIN = "testing2";
var TODAY  = helpers.daysAgo(0);
var RAW_FH_ACT_IPHONE_TOTAL = 20;
var RAW_FH_ACT_ANDROID_TOTAL = 10;
var MBAAS_IPHONE_TOTAL = 10;
var MBAAS_ANDROID_TOTAL = 15;
var YESTERDAY = helpers.daysAgo(1);
var DAY_BEFORE_YESTERDAY = helpers.daysAgo(2);
var NUM_RAW_TRANSACTIONS = 4; //there are 4 ios devices and 4 android devices
var NUM_IRELAND_TRANSACTIONS = 10;
var NUM_CZECH_TRANSACTIONS =1;

function setUp (cb){

  var dbConf = config.database;
  var url = "mongodb://" + dbConf.host + ":" + dbConf.port + "/" + dbConf.name;
  fhconfig.init(__dirname + "/" + TEST_CONFIG,undefined,function (err,conf){
    if (err){
      console.error("failed to setup config",err);
      cb(err);
    }
    MongoClient.connect(url, function (err,db){
      if (err)return cb(err);
      mongo = db;
      async.series([
        tearDown,
        async.apply(insertFhactData,mongo,[TODAY.START_OF_DAY,YESTERDAY.START_OF_DAY,DAY_BEFORE_YESTERDAY.START_OF_DAY]),        //insert for today and yesterday
        async.apply(insertDecoupledMbaasData,mongo,[TODAY.START_OF_DAY,YESTERDAY.START_OF_DAY,DAY_BEFORE_YESTERDAY.START_OF_DAY])
      ],function (err){
        console.log("setup finished ",err);
        cb(err);
      });
    });
  });
}

function getTotal(){
  return MBAAS_IPHONE_TOTAL + RAW_FH_ACT_ANDROID_TOTAL + RAW_FH_ACT_IPHONE_TOTAL + MBAAS_ANDROID_TOTAL;
}

function getIphoneTotal(){
  return MBAAS_IPHONE_TOTAL + RAW_FH_ACT_IPHONE_TOTAL;
}

function getAndroidTotal(){
  return MBAAS_ANDROID_TOTAL + RAW_FH_ACT_ANDROID_TOTAL;
}

function getFhactCollection (time){
  return  "fhact_" + moment(time).format("YYYYMMDD");
}

function getMbaasCollection (metric){
  return "mbaas_" + metric;
}

function insertFhactData(mongo,times,cb){
  console.log("INSERT FHACT DATA ");
  //insert data for today and yesterday
  async.each(times, function (t,done){
    mongo.collection(getFhactCollection(t), function (err, collection) {
      if (err)return done(err);
      var rawActs = mbaasMetricsUtil.getRawFhactData(t, PROJECTID, APPID, DOMAIN, RAW_FH_ACT_IPHONE_TOTAL,RAW_FH_ACT_ANDROID_TOTAL);
      collection.insert(rawActs, function inserted(err, ok) {
        done(err);
      });
    });
  },cb);
}

function insertDecoupledMbaasData(mongo,times,cb){
  async.each(times, function (t,done) {
    var mMetrics = mbaasMetricsUtil.getRawMbaasData(t, DOMAIN, PROJECTID, APPID, MBAAS_IPHONE_TOTAL, MBAAS_ANDROID_TOTAL);
    var metrics = Object.keys(mMetrics);
    async.each(metrics, function (metric, cb) {
      console.log("INSERTING DATA ", metric, mMetrics[metric]);
      mongo.collection(getMbaasCollection(metric), function (err, coll) {
        if (err) {
          return cb(err);
        }
        coll.insert(mMetrics[metric], cb);
      });
    }, done);
  },cb);
}

function runRollUp(from,to,cb){
  var logger = {
    "error":console.log,
    "warn":console.log,
    "info":console.log,
    "debug":console.log
  };
  var job = require(UNDERTEST)(logger,config,{},mongo);
  job.runJobFromTo({"from":from},to,function done(){
    cb();
  });
}

//change to assert based on passed time
function assertOnRollUp(assert, times,cb){

  //pull out rolled up metrics and assert todays are valid and yesterdays
  async.series([
    function assertapprequestsdest(callback){
      mongo.collection("apprequestsdest",function (err,collection){
        assert.ok(! err, "did not expect error getting collection");
        async.each(times, function verifyForTime(t,done){
          console.log("RUN ASSERT ON ROLLUP for ", t);
          collection.findOne({"_id.appid":"testappid","_id.ts": t,"_id.domain":DOMAIN},function (err, doc){
            assert.ok(!err, "did not expect an err finding apprequestsdest",err);
            console.log(doc);
            assert.ok(doc.value[PROJECTID].total === getTotal(),"total should have been equal to mbaas plus fhact total " + getTotal());
            assert.ok(doc.value[PROJECTID].iphone === getIphoneTotal(),"iphone total should have been equal to mbaas plus fhact total" + getIphoneTotal());
            assert.ok(doc.value[PROJECTID].android === getAndroidTotal(),"android total should have been equal to mbaas plus fhact total " + getAndroidTotal());
            done();
          });
        },callback);
      });
    },
    function assertapptransactionsdest(callback){
      mongo.collection("apptransactionsdest",function (err,collection){
        assert.ok(! err, "did not expect error getting collection");
        async.each(times, function verifyForTime(t,done){
          console.log("RUN ASSERT ON ROLLUP for apptransactionsdest ", t);
          collection.findOne({"_id.appid":"testappid","_id.ts": t,"_id.domain":DOMAIN},function (err, doc){
            console.log(doc);
            assert.ok(!err, "did not expect an err finding apprequestsdest",err);
            assert.ok(doc.value.iphone === MBAAS_IPHONE_TOTAL + NUM_RAW_TRANSACTIONS ,"iphone total should have been equal to mbaas plus fhact total " + getIphoneTotal() + " : " + doc.value.iphone);
            assert.ok(doc.value.android === MBAAS_ANDROID_TOTAL + NUM_RAW_TRANSACTIONS,"android total should have been equal to mbaas plus fhact total " + getAndroidTotal());
            done();
          });
        },callback);
      });
    },
    function assertapptransactionsgeo(callback){
      mongo.collection("apptransactionsgeo",function (err,collection){
        assert.ok(! err, "did not expect error getting collection");
        async.each(times, function verifyForTime(t,done){
          console.log("RUN ASSERT ON ROLLUP for apptransactionsgeo ", t);
          collection.findOne({"_id.appid":"testappid","_id.ts": t,"_id.domain":DOMAIN},function (err, doc){
            assert.ok(!err, "did not expect an err finding apprequestsdest",err);
            console.log(doc);
            //assert.ok(doc.value.total === getTotal(),"total should have been equal to mbaas plus fhact total " + getTotal());
            assert.ok(doc.value.Ireland === NUM_IRELAND_TRANSACTIONS ,"iphone total should have been equal to mbaas plus fhact total" + getIphoneTotal());
            assert.ok(doc.value["Czech Republic"] === NUM_CZECH_TRANSACTIONS,"android total should have been equal to mbaas plus fhact total " + getAndroidTotal());
            done();
          });
        },callback);
      });
    },
    function assertappactivedevice(callback){
      mongo.collection("appactivedevice",function (err,collection){
        assert.ok(! err, "did not expect error getting collection");
        async.each(times, function verifyForTime(t,done){
          console.log("RUN ASSERT ON ROLLUP for appactivedevice ", t);
          collection.findOne({"_id.appid":"testappid","_id.ts": t,"_id.domain":DOMAIN},function (err, doc){
            assert.ok(!err, "did not expect an err finding appactivedevice",err);
            console.log(doc);
            //assert.ok(doc.value.total === getTotal(),"total should have been equal to mbaas plus fhact total " + getTotal());
            assert.ok(doc.value.total === 10 , "active device total should equal to 10");
            assert.ok(doc.value.destinations, "active device destinations are set");
            assert.ok(doc.value.destinations.iphone === 5, "active device should have 5 iphone devices");
            assert.ok(doc.value.destinations.android === 5, "active device should have 5 android devices");
            done();
          });
        },callback);
      });
    },
    function assertappactivedevicegeo(callback){
      mongo.collection("appactivedevicegeo",function (err,collection){
        assert.ok(! err, "did not expect error getting collection");
        async.each(times, function verifyForTime(t,done){
          console.log("RUN ASSERT ON ROLLUP for appactivedevicegeo ", t);
          collection.findOne({"_id.appid":"testappid","_id.ts": t,"_id.domain":DOMAIN},function (err, doc){
            assert.ok(!err, "did not expect an err finding appactivedevice",err);
            console.log(doc);
            //assert.ok(doc.value.total === getTotal(),"total should have been equal to mbaas plus fhact total " + getTotal());
            assert.ok(doc.value.Ireland.total === 10 , "active device geo Ireland total should equal to 10");
            assert.ok(doc.value['Czech Republic'].total === 2, "active device geo Czech total should equal to 2");
            done();
          });
        },callback);
      });
    }
  ],cb);

}

exports.test_metrics_rollup_happy = function(test,assert){
  async.series([
    setUp,
    async.apply(runRollUp,TODAY.START_OF_DAY,TODAY), //run just for today
    async.apply(assertOnRollUp,assert,[TODAY.START_OF_DAY]),
    async.apply(runRollUp,TODAY.START_OF_DAY,TODAY),
    async.apply(assertOnRollUp,assert, [TODAY.START_OF_DAY])
  ], function (err){
    tearDown(function (){
      closeMongo();
      assert.ok(!err, "did not expect an error " +  util.inspect(err));
      test.finish();
    });
  });
};



exports.test_metrics_rollup_three_days = function(test,assert){

  async.series([
    setUp,
    async.apply(runRollUp,DAY_BEFORE_YESTERDAY.START_OF_DAY,TODAY), //run for yesterday and today
    async.apply(assertOnRollUp,assert,[TODAY.START_OF_DAY,YESTERDAY.START_OF_DAY,DAY_BEFORE_YESTERDAY.START_OF_DAY])
  ], function (err){
    tearDown(function (){
      closeMongo();
      assert.ok(!err, "did not expect an error " +  util.inspect(err));
      test.finish();
    });

  });

};

function closeMongo(){
  if(mongo){
    mongo.close();
  }
}

function tearDown(cb){
  if (mongo){
    async.series([
      function dropFhact(callback){
        console.log("DROP FHACT");
        async.each([TODAY.START_OF_DAY,YESTERDAY.START_OF_DAY,DAY_BEFORE_YESTERDAY.START_OF_DAY], function (t, done){
          console.log("DROPPING ", getFhactCollection(t));
          mongo.collection(getFhactCollection(t), function (err, collection){
            if (collection){
              collection.remove(function (err){
                if(err)console.log("failed to drop collection", err);
                done();
              });
            }else {
              return done();
            }
          });
        },callback);
      },
      function dropMbaasData(callback){
        var mMetrics = mbaasMetricsUtil.getRawMbaasData(Date.now(), DOMAIN, APPID, MBAAS_IPHONE_TOTAL, MBAAS_ANDROID_TOTAL);
        var metrics = Object.keys(mMetrics);
        async.each(metrics, function (metric,cb){
          console.log("DROP MBAAS metric", metric);
          mongo.collection(getMbaasCollection(metric), function (err, collection){
            if (collection){
              collection.remove(function (err){
                if (err) console.error("failed to remove collection ", err);
                return cb();
              });
            }else {
              return cb();
            }
          });
        },callback);
      },
      function dropTransTempData(callback){
        async.each(['transactionsdesttemp', 'transactionsgeotemp'], function(tempCol, cb){
          console.log("DROP " + tempCol);
          mongo.collection(tempCol, function(err, collection){
            if (collection) {
              collection.remove(function(err) {
                if (err) console.error("failed to remove collection ", err);
                return cb();
              });
            } else {
              return cb();
            }
          });
        }, callback);
      }
    ],cb);
  } else {
    return cb();
  }
};
