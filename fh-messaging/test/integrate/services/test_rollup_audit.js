var MongoClient = require('mongodb').MongoClient;
var mongo;
var UNDERTEST = '../../../lib/services/audit';
var TEST_CONFIG = '../../../config/dev.json'
var util = require('util');
var config = require(TEST_CONFIG);
var moment =require('moment');
var proxyquire = require('proxyquire');
var async = require('async');

exports.setUp = function (test,assert){

  var dbConf = config.database;
  var url = "mongodb://" + dbConf.host + ":" + dbConf.port + "/" + dbConf.name;

  MongoClient.connect(url, function (err,db){
    assert.ok(!err, " did not expect an error connecting to db");
    mongo = db;
    cleanUp(function (err){
      console.log("clean up dpne");
      test.finish();
    });
  });
};


var sharedJobStart = Date.now();

exports.test_create_audit_log_ok = function (test,assert){
  var undertest = proxyquire(UNDERTEST,{});
  var jobName = "ajob";
  var rollupdate = moment().subtract(1,"day").utc().valueOf();
  async.waterfall([
    function createLog(callback){
      undertest(mongo).createRollUpLog(jobName, sharedJobStart, rollupdate, function done(err,ok){
        assert.ok(! err, " did not expect an error " );
        callback();
      });
    },
    function verify(callback){
      var collection = mongo.collection("metrics_audit_log");
      collection.findOne({"name":jobName},function (err,data){
        assert.ok(!err, "did not expect an error");
        assert.ok(data,"expected a model returned");
        assert.ok(data.started == sharedJobStart, "expected the started time to be the same");
        assert.ok(data.rollupFor == rollupdate, "expected the rollupFor time to be the same");
        assert.ok(!data.completed,"did not expect job to be completed");
        assert.ok(data.status == "started","did not expect job to have a status complete");
        callback();
      });
    }
  ],test.finish);

};

exports.test_create_audit_log_fails_two_jobs_same_name_same_start_time = function (test,assert){
  var undertest = proxyquire(UNDERTEST,{});
  var jobName = "ajob";
  var rollupdate = moment().subtract(1,"day").utc().valueOf();
  async.series([
    function addOne(callback){
      undertest(mongo).createRollUpLog(jobName, sharedJobStart,rollupdate, function done(err,ok){
        assert.ok(!err);
        callback();
      });
    },
    function assertCantAddAgain(callback){
      undertest(mongo).createRollUpLog(jobName, sharedJobStart,rollupdate, function done(err,ok){
        assert.ok(err,"expected an error");
        console.log(err);
        callback();
      });
    }
  ],function done(){
    console.log("duplicate test finished");
    test.finish();
  });

};

exports.test_update_auditlog_success = function(test,assert){
  var undertest = proxyquire(UNDERTEST,{});
  var jobName = "ajob";
  var rollupdate = moment().subtract(1,"day").utc().valueOf();
  async.waterfall([
    function addOne(callback){
      undertest(mongo).createRollUpLog(jobName, sharedJobStart,rollupdate, function done(err,ok){
        assert.ok(!err);
        callback(err,ok);
      });
    },
    function completeOne(audit,callback){
      assert.ok(audit,"expected an audit");
      audit.completeJob('job successful ajob',function verify(err,audit){
        assert.ok(!err, "did not expect an error completing job");
        assert.ok(audit.finished);
        callback();
      });
    },
    function (callback){
      var collection = mongo.collection("metrics_audit_log");
      collection.findOne({"name":jobName},function (err,data){
        assert.ok(!err, "did not expect an error");
        assert.ok(data,"expected a model returned");
        assert.ok(data.status == "complete",data);
        assert.ok(data.finished,data);
        callback();
      });
    }],test.finish);
};


exports.test_update_auditlog_error = function(test,assert){
  var undertest = proxyquire(UNDERTEST,{});
  var jobName = "ajob";
  var rollupdate = moment().subtract(1,"day").utc().valueOf();
  async.waterfall([
    function addOne(callback){
      undertest(mongo).createRollUpLog(jobName, sharedJobStart,rollupdate, function done(err,ok){
        assert.ok(!err);
        callback(err,ok);
      });
    },
    function completeOne(audit,callback){
      assert.ok(audit,"expected an audit");
      audit.completeJobWithError('job failed ajob',new Error("error"),function verify(err,audit){
        assert.ok(!err, "did not expect an error completing job");
        assert.ok(audit.finished);
        callback();
      });
    },
    function (callback){
      var collection = mongo.collection("metrics_audit_log");
      collection.findOne({"name":jobName},function (err,data){
        assert.ok(!err, "did not expect an error");
        assert.ok(data,"expected a model returned");
        assert.ok(data.status == "error",data);
        assert.ok(data.finished,data);
        assert.ok(data.err === "error","expected the same error message");
        callback();
      });
    }],test.finish);
};



exports.test_should_find_with_date_range = function (test,assert){
  var undertest = proxyquire(UNDERTEST,{});
  var jobName = "ajob";
  var rollupdate = moment().subtract(1,"day").utc().valueOf();
  async.waterfall([
    function addOne(callback){
      undertest(mongo).createRollUpLog(jobName, sharedJobStart,rollupdate, function done(err,ok){
        assert.ok(!err);
        callback(err);
      });
    },
    function testShouldFind(callback){
      undertest(mongo).findWhereRolledUpForInDateRange(rollupdate,Date.now(),function verify(err,doc){
        console.log(doc);
        callback();
      });
    }],test.finish);
};

function cleanUp(cb){
  if (mongo){
    var collection = mongo.collection("metrics_audit_log");
    collection.remove({},{},cb);
  }
}


exports.tearDown = function (test,assert){
  if(mongo){
    cleanUp(function (err){
      if (err) console.error("clean up failed. this may impact on future tests ", err);
      mongo.close(test.finish);
    });
  }else {
    console.log("mongo was not defined");
    test.finish();
  }
};
