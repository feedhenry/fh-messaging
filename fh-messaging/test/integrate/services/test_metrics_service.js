var proxy = require('proxyquire');
var fhconfig = require('fh-config');
const TEST_CONFIG = '../../../config/dev.json'
const TEST_DATA_FIXTURE = "../fixtures/test_mbaas_metrics.json";
var util = require('util');
var MongoClient = require('mongodb').MongoClient;
var mongo;
var UNDERTEST = '../../../lib/services/mbaas_metrics';
var _ = require("underscore");
var async = require('async');
var sinon = require('sinon');
var TEST_MBAAS1 = "ppa4-mbaas-1";
var TEST_MBAAS2 = "ppa4-mbaas-2";
var testMbaas1Metrics = require(TEST_DATA_FIXTURE)[TEST_MBAAS1];
var testMbaas2Metrics = require(TEST_DATA_FIXTURE)[TEST_MBAAS2];
var config = require(TEST_CONFIG);
var mbaasMetricsUtil = require('../fixtures/mbaasMetrics');
var moment = require('moment');


exports.setUp = function (test,assert){
  var dbConf = config.database;
  var url = "mongodb://" + dbConf.host + ":" + dbConf.port + "/" + dbConf.name;
  mongo = MongoClient.connect(url, function (err,db){
    assert.ok(!err, " did not expect an error connecting to db");
    mongo = db;
    cleanUp(function (err){
      console.log("clean up dpne");
      test.finish();
    });
  });
};

exports.test_should_insert_multiple_mertrics_ok = function (test,assert){
  var undertest = proxy(UNDERTEST,{});
  undertest(mongo).insertMultipleMetrics(testMbaas1Metrics,function (err, ok){
    assert.ok(! err, "did not expect an error" + util.inspect(err));
    var testcollection = mongo.collection("mbaas_domainrequestsdest");
    assert.ok(testcollection,"expected test collection");
    var testDoc = testMbaas1Metrics.domainrequestsdest[0];
    testcollection.findOne({"_id":testDoc._id},{},function (err, doc){
      assert.ok(! err, "did not expect an error " + util.inspect(err));
      assert.ok(_.isEqual(testDoc,doc));
      test.finish();
    });
  });

};


exports.test_should_fail_to_insert_multiple_mertrics = function (test,assert){
  var undertest = proxy(UNDERTEST,{});
  var mongoApi = {
    "insert": function (doc,cb){
      cb({"error":"error"});
    }
  };

  var mongo = {
    collection : function (name){
      return mongoApi
    }
  };
  undertest(mongo).insertMultipleMetrics(testMbaas1Metrics,function (err, ok){
    assert.ok(err," expected an error ", util.inspect(err));
    test.finish();
  });
};


exports.test_should_remove_multiple_mertrics_ok = function (test,assert){

  var undertest = proxy(UNDERTEST,{});
  undertest(mongo).removeMultipleMetrics(testMbaas1Metrics,function (err, ok){
    assert.ok(! err, "did not expect an error" + util.inspect(err));
    shouldNotFindOne("domainrequestsdest",assert,test.finish);
  });

};

exports.test_should_fail_to_remove_multiple_mertrics = function (test,assert){
  var undertest = proxy(UNDERTEST,{});
  var mongoApi = {
    "remove": function (doc,cb){
      cb({"error":"error"});
    }
  };

  var mongo = {
    collection : function (name){
      return mongoApi
    }
  };
  undertest(mongo).removeMultipleMetrics(testMbaas1Metrics,function (err, ok){
    assert.ok(err," expected an error ", util.inspect(err));
    test.finish();
  });
};

exports.test_should_insert_and_remove_multiple_metrics = function (test, assert) {
  var undertest = proxy(UNDERTEST,{});
  undertest(mongo).replaceAndInsert(testMbaas1Metrics, function asserts(err, ok){
    assert.ok(!err, "did not expect an error" + util.inspect(err));
    console.log(err,ok);
    test.finish();
  });
};


function aggregateMetricsTypeForApp(metricType,assert,cb){
  var undertest = proxy(UNDERTEST,{});
  var inst = undertest(mongo);
  var times = inst.time();
  var starOfDay = 1447372800000; //based on fixtures/test_mbaas_metrics.json
  var endOfDay =  1447459199000;
  inst.reduceMetricsForTimePeriod([metricType], starOfDay, endOfDay,"fh-messaging", function next(err) {
    assert.ok(!err, "did not expect an error " + err);
    //read from appreqestdest for start to end and assert values are as expected
    var mbaasMet = mbaasMetricsUtil.getMbaasMetrics(TEST_MBAAS1);
    var app = mbaasMet.getAppNameForMetric(metricType);
    var totals = mbaasMetricsUtil.sumTotalMetricsForApp(metricType,app);
    async.waterfall([
      function getCollection(callback){
        mongo.collection(metricType,callback);
      },
      function findData(collection,callback){
        collection.findOne({"_id.appid":app},callback);
      },
      function assertData(data,callback){
        assert.ok(_.isEqual(data.value,totals),"expected equality for " + metricType);
        callback();
      }
    ],cb);
  });
}


function aggregateMetricsTypeForDomain(metricType,assert,cb){
  var undertest = proxy(UNDERTEST,{});
  var inst = undertest(mongo);
  var starOfDay = 1447372800000; //based on fixtures/test_mbaas_metrics.json
  var endOfDay =  1447459199000;
  inst.reduceMetricsForTimePeriod([metricType], starOfDay, endOfDay,"fh-messaging", function next(err) {
    assert.ok(!err, "did not expect an error " + err);
    var mbaasMet = mbaasMetricsUtil.getMbaasMetrics(TEST_MBAAS1);
    var domain = mbaasMet.getDomainNameForMetric(metricType);
    var totals = mbaasMetricsUtil.sumTotalMetricsForDomain(metricType,domain);
    assert.ok(domain, "expected domain to be present");
    async.waterfall([
      function getCollection(callback){
        mongo.collection(metricType,callback);
      },
      function findData(collection,callback){
        collection.findOne({"_id.domain":domain},callback);

      },
      function assertData(data,callback){
        assert.ok(data,"expected data to be returned for " + metricType)
        assert.ok(_.isEqual(data.value,totals),"expected equality for " + metricType);
        callback();
      }
    ],cb);
  });
}

exports.test_should_aggregate_collected_mbaas_app_metrics = function (test,assert){
  var undertest = proxy(UNDERTEST,{});
  var inst = undertest(mongo);
  var times = inst.time();
  assert.ok(times, " expected times not to be null");
  async.series([
    function insertmbaas1metrics(callback){
      undertest(mongo).insertMultipleMetrics(testMbaas1Metrics,callback);
    },
    function insertmbaas2metrics(callback){
      undertest(mongo).insertMultipleMetrics(testMbaas2Metrics,callback);
    }
  ],function doTest(err){
    assert.ok(!err, "did not expect an error");
    async.series([
      function testAppRequestsDest(callback){
        aggregateMetricsTypeForApp("apprequestsdest",assert,callback);
      },
      function testApprequestsgeo(callback){
        aggregateMetricsTypeForApp("apprequestsgeo",assert,callback);
      },
      function testApptransactionsdest(callback){
        aggregateMetricsTypeForApp("apptransactionsdest",assert,callback);
      },
      function testapptransactionsgeo(callback){
        aggregateMetricsTypeForApp("apptransactionsgeo",assert,callback);
      }
    ],test.finish);
  });
};


exports.test_should_aggregate_collected_mbaas_domain_metrics = function (test,assert){
  var undertest = proxy(UNDERTEST,{});
  var inst = undertest(mongo);
  var times = inst.time();
  assert.ok(times, " expected times not to be null");
  async.series([
    function insertmbaas1metrics(callback){
      undertest(mongo).insertMultipleMetrics(testMbaas1Metrics,callback);
    },
    function insertmbaas2metrics(callback){
      undertest(mongo).insertMultipleMetrics(testMbaas2Metrics,callback);
    }
  ],function doTest(err){
    assert.ok(!err, "did not expect an error");
    async.series([
      function testDomainRequestsDest(callback){
        console.log('cheking domainrequestsdest');
        aggregateMetricsTypeForDomain("domainrequestsdest",assert,callback);
      },
      function testDomainrequestsgeo(callback){
        console.log('cheking domainrequestsgeo');
        aggregateMetricsTypeForDomain("domainrequestsgeo",assert,callback);
      },
      function testDomaintransactionsdest(callback){
        console.log('cheking domaintransactionsdest');
        aggregateMetricsTypeForDomain("domaintransactionsdest",assert,callback);
      },
      function testDomaintransactionsgeo(callback){
        console.log('cheking domaintransactionsgeo');
        aggregateMetricsTypeForDomain("domaintransactionsgeo",assert,callback);
      }
    ],test.finish);
  });
};


exports.test_store_from_date_does_not_store_later_date = function (test,assert){
  var undertest = proxy(UNDERTEST,{});
  var earlyDate = moment().subtract(2,'days').utc().valueOf();
  var lateDate = moment().subtract(1,'days').utc().valueOf();

  async.series([
    function addDate(callback){
      undertest(mongo).storeRollUpFrom(earlyDate,function done(err){
        assert.ok(! err, "did not expect an error storing date");
         callback();
      });
    },
    function updateDate(callback){
      undertest(mongo).storeRollUpFrom(lateDate,function done(err){
         assert.ok(! err, "did not expect an error storing date");
        callback();
      });
    },
    function assertOnGetDate(callback){
      undertest(mongo).getRollUpFrom(function (err,doc){
         assert.ok(!err, "did not expect an error getting from");
         assert.ok(doc,"expected a doc")
         assert.ok(doc.from === earlyDate, "expected to get the early date");
        callback();
      });
    }
  ],function (){
    //clean up
    test.finish();
  });
};


exports.test_store_from_date_does_store_earlier_date = function (test,assert){
  var undertest = proxy(UNDERTEST,{});
  var earlyDate = moment().subtract(2,'days').utc().valueOf();
  var lateDate = moment().subtract(1,'days').utc().valueOf();

  async.series([
    function addDate(callback){
      undertest(mongo).storeRollUpFrom(lateDate,function done(err){
        assert.ok(! err, "did not expect an error storing date");
        callback();
      });
    },
    function updateDate(callback){
      undertest(mongo).storeRollUpFrom(earlyDate,function done(err){
        assert.ok(! err, "did not expect an error storing date");
        callback();
      });
    },
    function assertOnGetDate(callback){
      undertest(mongo).getRollUpFrom(function (err,doc){
        assert.ok(!err, "did not expect an error getting from");
        assert.ok(doc,"expected a doc");
        console.log(doc);
        assert.ok(doc.from === earlyDate, "expected to get the early date");
        callback();
      });
    }
  ],function (){
    //clean up
    test.finish();
  });
};




function shouldNotFindOne(collection,assert,cb){
  var fullCollectionName = "mbaas_" + collection;
  var metricsColl = testMbaas1Metrics[collection];
  assert.ok(metricsColl,"expected to find a collection " + fullCollectionName );
  var testDoc = metricsColl[0];
  assert.ok(testDoc,"expected a test document at index 0");
  var testcollection = mongo.collection(fullCollectionName);
  assert.ok(testcollection,"expected test collection");
  testcollection.findOne({"_id":testDoc._id},{},function (err, doc){
    assert.ok(! err, "did not expect an error " + util.inspect(err));
    assert.ok(! doc, "did not expect to find a doc");
    cb()
  });
}




function cleanUp(callback){
  var fromCollection = mongo.collection("from_date");
  fromCollection.remove({},{},function(){});
  var metricTypes = Object.keys(testMbaas1Metrics);
  async.each(metricTypes,function clean(metricType,cb) {
    var mbaascollection = mongo.collection("mbaas_" + metricType);
    mbaascollection.remove({},{},function (){
      var collection = mongo.collection(metricType);
      collection.remove({},{},cb);
    });
  },callback);

}

exports.tearDown = function (test,assert){
  if(mongo){
    cleanUp(function (err){
       mongo.close(test.finish);
    });
  } else {
    console.log("mongo was not defined");
    test.finish();
  }
};
