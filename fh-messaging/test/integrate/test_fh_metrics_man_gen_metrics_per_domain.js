var helper = require('./test_helper.js'),
    fhmm = require('../../lib/fh_metrics_man.js'),
    fs = require('node-fs'),
    async = require('async'),
    _ = require('underscore');

var config;
var logger;
var msgdb;
var metdb;
var metricsMan;

exports.initialize = function (test, assert) {
  helper.init( function(err,conf) {
    config = conf;
    logger = require('fh-logger').createLogger({name: 'test_metrics_man_gen_metrics_per_domain'});
    logger.info('initialize');

    test.finish();
  }); 
};

exports.finalize = function (test, assert) {
  logger.info('finalize');
  test.finish();
};

exports.setUp = function (test, assert) {
  logger.info('setUp');
  config.database.name = "test_fh_metrics_man_gen_metrics_per_domain_msg";
  config.metrics.database.name = "test_fh_metrics_man_gen_metrics_per_domain_met";
  config.metrics.whitelist = {}; //Remove the whitelist or none of the gen log tests work
  logger.info("Test metrics dir :: " + config.metrics.metricsDir);

  //fhact_20130219 // Tue Feb 19 2013 - 1361232000000
  //fhact_20130220 // Wed Feb 20 2013 - 1361318400000
  testData = {
    "fhact_20130219": {
      "index": 'MD5',
      "data": [
        { "_cl": "development", "_ho": "fh", "_mn": 30, "_ts": 1361278531702, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D40", "destination": "iphone", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojf", "ipAddress": "192.168.28.35", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 206, "MD5": "5a978b5a73f0a49cff961d541f9dcaa6_20130219" },
        { "_cl": "development", "_ho": "fh", "_mn": 31, "_ts": 1361278532474, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D40", "destination": "iphone", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojf", "ipAddress": "192.168.28.35", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 200, "MD5": "964d12f4609b4188aebf48a2de4b1d44_20130219" },
        { "_cl": "development", "_ho": "fh", "_mn": 32, "_ts": 1361278533256, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D40", "destination": "iphone", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojf", "ipAddress": "192.168.28.35", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 442, "MD5": "150040f3475fd6a6e010f90a51110f05_20130219" },
        { "_cl": "development", "_ho": "fh", "_mn": 33, "_ts": 1361278533524, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D41", "destination": "android", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojf", "ipAddress": "192.168.28.35", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 359, "MD5": "a0de876305978eb78434d9bd6c7b3a02_20130219" },
        { "_cl": "development", "_ho": "fh", "_mn": 34, "_ts": 1361278540204, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D41", "destination": "android", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojf", "ipAddress": "192.168.28.35", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 232, "MD5": "5439ac7941c45170a5f0b97acdf5ddad_20130219" },
        { "_cl": "development", "_ho": "fh", "_mn": 35, "_ts": 1361278540681, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D42", "destination": "android", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojf", "ipAddress": "192.168.28.35", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 240, "MD5": "70fce3166b79712bd625f9fa8b5eae08_20130219" }
      ]
    },
    "fhact_20130220": {
      "index": 'MD5',
      "data": [
        { "_cl": "development", "_ho": "fh", "_mn": 30, "_ts": 1361318500000, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D40", "destination": "iphone", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojf", "ipAddress": "1.0.1.2", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 206, "MD5": "5a978b5a73f0a49cff961d541f9dcaa6_20130220" },
        { "_cl": "development", "_ho": "fh", "_mn": 31, "_ts": 1361318600000, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D40", "destination": "iphone", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojG", "ipAddress": "1.0.1.2", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 200, "MD5": "964d12f4609b4188aebf48a2de4b1d44_20130220" },
        { "_cl": "development", "_ho": "fh", "_mn": 32, "_ts": 1361318700000, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D40", "destination": "iphone", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojH", "ipAddress": "193.1.184.10", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 442, "MD5": "150040f3475fd6a6e010f90a51110f05_20130220" },
        { "_cl": "development", "_ho": "fh", "_mn": 33, "_ts": 1361318800000, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D41", "destination": "android", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojf", "ipAddress": "193.1.184.10", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 359, "MD5": "a0de876305978eb78434d9bd6c7b3a02_20130220" },
        { "_cl": "development", "_ho": "fh", "_mn": 37, "_ts": 1361318800000, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D41", "destination": "android", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojf", "ipAddress": "193.1.184.10", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 359, "MD5": "a0de876305978eb78434d9bd6c7b3a01_20130220" },
        { "_cl": "development", "_ho": "fh", "_mn": 34, "_ts": 1361318900000, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D41", "destination": "android", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojG", "ipAddress": "193.1.184.10", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 232, "MD5": "5439ac7941c45170a5f0b97acdf5ddad_20130220" },
        { "_cl": "development", "_ho": "fh", "_mn": 35, "_ts": 1361319000000, "app_version": "21", "guid": "RAAOa7NplLpCgjcnLnataojV", "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": "testa", "bytes": 98, "cached": false, "cuid": "A0E7BD2F792E42C98E48A85F7C0D2D41", "destination": "android", "function": "getConfig", "appid": "RAAOa7NplLpCgjcnLnataojH", "ipAddress": "193.1.184.10", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 240, "MD5": "70fce3166b79712bd625f9fa8b5eae08_20130220" }
      ]
    }
  }

  // Open both the msg and met dbs
  async.series([
    function (testCallback) {
      helper.testDataSetUp(config.database, testData, function (err, data, opendb) {
        if (err) {
          logger.error(err);
        }
        assert.ok(!err);
        msgdb = opendb;
        testCallback();
      });
    },
    function (testCallback) {
      helper.testDataSetUp(config.metrics.database, null, function (err, data, opendb) {
        if (err) {
          logger.error(err);
        }
        assert.ok(!err);
        metdb = opendb;
        testCallback();
      });
    }
  ], function (err, res) {
    test.finish();
  });
};

exports.tearDown = function (test, assert) {
  logger.info('tearDown');
  msgdb.tearDown();
  metdb.tearDown();
  if (metricsMan) {
    metricsMan.tearDown();
  }

  // Close both the msg and met dbs
  async.series([
    function (testCallback) {
      helper.testDataTearDown(config.database, function (err, data) {
        if (err) {
          logger.error(err);
        }
        assert.ok(!err);
        testCallback();
      });
    },
    function (testCallback) {
      helper.testDataTearDown(config.metrics.database, function (err, data) {
        if (err) {
          logger.error(err);
        }
        assert.ok(!err);
        testCallback();
      });
    }
  ], function (err, res) {
    test.finish();
  });
};

exports.test_generateMetricsData_per_domain_day1 = function (test, assert) {
  var topic = 'fhact';
  // Test for Feb 19 2013
  var messageDate1 = new Date(1361232000000);
  var expected_metric_ts = 1361232000000;

  metricsMan = new fhmm.MetricsManager(config, logger);
  metricsMan.generateMetricsData(topic, messageDate1, function (err, result) {
    var gtd, ltd, dateQuery, query1, query2, query3, query4;

    gtd = new Date(messageDate1);
    gtd.setHours(0, 0, 0, 0);
    ltd = new Date(gtd);
    ltd.setDate(ltd.getDate() + 1);
    dateQuery = { $gte: gtd.getTime(), $lt: ltd.getTime()};

    async.series([
      function (testCallback) {
        // get metrics data from db for app installs on the specified day
        query1 = {'_id.appid': 'RAAOa7NplLpCgjcnLnataojf', '_id.ts': dateQuery};
        metdb.find('apprequestsdest', query1, function (err, results) {
          logger.info('query: ' + JSON.stringify(query1));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length, "Should only be 1 record returned for apprequestsdest, was: " + results.length);
          data = results[0];
          assert.equal('RAAOa7NplLpCgjcnLnataojf', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(3, data.value['RAAOa7NplLpCgjcnLnataojV'].iphone, 'incorrect iphone requests');
          assert.equal(3, data.value['RAAOa7NplLpCgjcnLnataojV'].android, 'incorrect android requests');
          testCallback();
        });

      },
      function (testCallback) {
        // get metrics data from db for app transactions on the specified day
        query2 = {'_id.appid': 'RAAOa7NplLpCgjcnLnataojf', '_id.ts': dateQuery};
        metdb.find('apptransactionsdest', query2, function (err, results) {
          logger.info('query: ' + JSON.stringify(query2));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length, "Should be 1 record returned for apptransactionsdest, was: " + results.length);
          data = results[0];
          assert.equal('RAAOa7NplLpCgjcnLnataojf', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(1, data.value.iphone);
          assert.equal(2, data.value.android);
          testCallback();
        });
      },
      function (testCallback) {
        query3 = {'_id.domain': 'testa', '_id.ts': dateQuery};
        // get metrics data from db for app installs on the specified day
        metdb.find('domainrequestsdest', query3, function (err, results) {
          logger.info('query: ' + JSON.stringify(query3));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length, "Should be 1 record returned for domainrequestsdest, was: " + results.length);
          data = results[0];
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts, 'incorrect timestamp or report data');
          assert.equal(3, data.value.iphone, 'incorrect iphone requests');
          assert.equal(3, data.value.android, 'incorrect android requests');
          testCallback();
        });
      },
      function (testCallback) {
        query4 = {'_id.domain': 'testa', '_id.ts': dateQuery};
        // get metrics data from db for app startups on the specified day
        metdb.find('domaintransactionsdest', query4, function (err, results) {
          logger.info('query: ' + JSON.stringify(query4));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length, "Should be 1 record returned for domaintransactionsdest, was: " + results.length);
          data = results[0];
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal('testa', data._id.domain);
          assert.equal(1, data.value.iphone);
          assert.equal(2, data.value.android);
          testCallback();
        });
      }
    ], function (err, res) {
      test.finish();
    });
  });
};

exports.test_generateMetricsData_per_domain_day2 = function (test, assert) {
  var topic = 'fhact';
  // Test for Wed, 20 Feb 2013
  var messageDate1 = new Date(1361318400000);
  var expected_metric_ts = 1361318400000;

  metricsMan = new fhmm.MetricsManager(config, logger);
  metricsMan.generateMetricsData(topic, messageDate1, function (err, result) {
    var gtd, ltd, dateQuery, query1, query2;

    gtd = new Date(messageDate1);
    gtd.setHours(0, 0, 0, 0);
    ltd = new Date(gtd);
    ltd.setDate(ltd.getDate() + 1);
    dateQuery = { $gte: gtd.getTime(), $lt: ltd.getTime()};

    query1 = {'_id.appid': 'RAAOa7NplLpCgjcnLnataojf', '_id.ts': dateQuery};
    query2 = {'_id.domain': 'testa', '_id.ts': dateQuery};

    async.series([
      function (testCallback) {
        // get metrics data from db for app installs on the specified day
        metdb.find('apprequestsdest', query1, function (err, results) {
          logger.info('query: ' + JSON.stringify(query1));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length, "Should be 1 record returned for apprequestsdest-day2, was: " + results.length);
          data = results[0];
          assert.equal('RAAOa7NplLpCgjcnLnataojf', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          console.log('@@@@@@data', data);  
          assert.equal(1, data.value['RAAOa7NplLpCgjcnLnataojV'].iphone, "Should be 1 iphone requests returned for apprequestsdest-day2, was: " + data.value.iphone);
          assert.equal(2, data.value['RAAOa7NplLpCgjcnLnataojV'].android, "Should be 2 android requests returned for apprequestsdest-day2, was: " + data.value.android);
          testCallback();
        });
      }
    ], function (err, res) {
      test.finish();
    });

  });
};
