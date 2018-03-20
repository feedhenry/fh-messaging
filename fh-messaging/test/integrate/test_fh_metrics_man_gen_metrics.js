var helper = require('./test_helper.js'),
    fhmm = require('../../lib/fh_metrics_man.js'),
    fs = require('node-fs'),
    async = require('async'),
    _ = require('underscore'),
    moment = require('moment');

var config;
var logger;
var msgdb;
var metdb;
var metricsMan;

exports.initialize = function (test, assert) {
   helper.init( function(err,conf) {
    config = conf;
    logger = require('fh-logger').createLogger({name: 'test_metrics_man_gen_metrics'});
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
  config.database.name = "test_fh_metrics_man_gen_metrics_msg";
  config.metrics.database.name = "test_fh_metrics_man_gen_metrics_met";
  config.metrics.whitelist = {}; //Remove the whitelist or none of the gen log tests work
  logger.info("Test metrics dir :: " + config.metrics.metricsDir);

  testData = {
    "fhact_20110101":{
      "index": "MD5",
      "data": [
        {}
      ]
    },
    "fhact_30000101":{
      "index": "MD5",
      "data": [
        {}
      ]
    },
    "appinit_20110612": {
      "index": 'MD5',
      "data": [
        {"MD5": "2f30d22d4182ac5c6fc3b3b75365884", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96119, "_ts": 1307919404819, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "a88cbe3e52c63e03493922c29d65033cb08a7d62"},
        {"MD5": "cc5224fd3eabf88b5268b3ed443ad91", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96437, "_ts": 1307919404819, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "ae0b3552bedf9ac36f2131be5a222fb27599e7b3"},
        {"MD5": "cc522dfd3eabf88b5268b3ed443ad91", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96437, "_ts": 1307919404819, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "android", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "df9ac36f2131be5a222fb27599"},
        {"MD5": "sss56f7d3b4e6e73c9240d6b0459c8b", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96196, "_ts": 1307919404819, "app_version": "535", "appid": "PA5kI3YBNgM-HXXrAmn72h5p", "destination": "iphone", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "DA63F132D2814B5F8C7DCD157D91DBA5"},
        {"MD5": "d4156f7d3b4e6e73c9240d6b0459c8b", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96196, "_ts": 1307919404819, "app_version": "535", "appid": "PA5kI3YBNgM-HXXrAmn72h5p", "destination": "embed", "domain": "testa", "firsttime": "init", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "DA63F132D2814B5F8C7DCD157D91DBA5"},
        {"MD5": "64f28b6a63354cbe487ca66b6d8765a", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96392, "_ts": 1307919404819, "app_version": "3801", "appid": "VwPdJnMwIAWNOEKAmvEhlNrt", "destination": "android", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "4CEC6A0350AD47538CD5B71EEB4FC22E"}
      ]
    },
    "appinit_20110613": {
      "index": 'MD5',
      "data": [
        {"MD5": "93a6186fecd3ce0e883b924cd2e6266", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96439, "_ts": 1307929721110, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "a0d997677974cf3b45ea538f8701eca993440ea0"},
        {"MD5": "654e786af874c0a17e0462fdaa75e48", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96656, "_ts": 1307929721110, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "71d7050025b002aa20a0564dfcc4f114cab1f338"},
        {"MD5": "asdfsdafcd3ce0e883b924cd2e62661", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96439, "_ts": 1307929721110, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "android", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "a0d997677974cf3b45ea538f8701eca993440ea0"},
        {"MD5": "asdfsadfas6af874c0a17e0462fdaa7", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96656, "_ts": 1307929721110, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "nokiawrt", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "71d7050025b002aa20a0564dfcc4f114cab1f338"},
        {"MD5": "asdfsafsadf924cd2e626610e883b92", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96439, "_ts": 1307929721110, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "android", "domain": "testa", "firsttime": "init", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "a0d997677974cf3b45ea538f8701eca993440ea0"},
        {"MD5": "asdfsf0a17e0462fdaa75e4890e883b", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96656, "_ts": 1307929721110, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "jil", "domain": "testa", "firsttime": "init", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "71d7050025b002aa20a0564dfcc4f114cab1f338"},
        {"MD5": "d4sfsdfse73c9240d6b0459c8bb0e88", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96196, "_ts": 1307929721110, "app_version": "535", "appid": "PA5kI3YBNgM-HXXrAmn72h5p", "destination": "iphone", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "DA63F132D2814B5F8C7DCD157D91DBA5"},
        {"MD5": "d4156f7d3sfsdf3c9240d6b0459c8bb", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96196, "_ts": 1307929721110, "app_version": "535", "appid": "PA5kI3YBNgM-HXXrAmn72h5p", "destination": "iphone", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "DA63F132D2814B5F8C7DCD157D91DBA5"}
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


exports.test_deleteMetricsData = function (test, assert) {
  var topic = 'fhact'; // get the list of topics that this is generally run for
  logger.info("Running deleteMetricsData for: " + topic);
  var date = new Date();
  var results = [{name: 'appinit_20110612', options: {}},{name: 'appinit_20110613', options: {}},{name: 'fhact_30000101', options: {}}];

  metricsMan = new fhmm.MetricsManager(config, logger);

  metricsMan.deleteMetricsData(topic, date, function (err, metricsMan_db) {
    assert.ok(!err);

    async.series([
      function (testCallback){
        metricsMan_db.listCollections({}).toArray(function(err, items){
          if(err){
            logger.error(err);
          }

          assert.ok(!err);
          assert.equal(3, items.length);
          assert.equal(results.toString(), items.toString());

          testCallback();
        });
      }
    ], function (err, res) {
      test.finish();
    });
  });
}


exports.test_generateMetricsData_day1 = function (test, assert) {
  var topic = 'appinit';
  // Test for Sun, 12 Jun 2011
  var messageDate1 = new Date(1307919404819);
  var expected_metric_ts = moment("12 Jun 2011").startOf('day').utc().valueOf();
  var test_date = new Date(expected_metric_ts);
  console.log("expected data ", expected_metric_ts);

  metricsMan = new fhmm.MetricsManager(config, logger);

  // generate metric data for a single topic on a single day
  metricsMan.generateMetricsData(topic, messageDate1, function (err, result) {
    assert.ok(!err);
    var gtd, ltd, dateQuery, query1, query2, query3, query4, query5;

    gtd = new Date(messageDate1);
    gtd.setHours(0, 0, 0, 0);
    ltd = new Date(gtd);
    ltd.setDate(ltd.getDate() + 1);
    dateQuery = { $gte: gtd.getTime(), $lt: ltd.getTime()}; //these are utc

    async.series([
      function (testCallback) {
        query1 = {'_id.appid': '_ychdfEXFfcKf6YJK4hlWQ_a', '_id.ts': dateQuery};
        // get metrics data from db for app installs on the specified day
        metdb.find('appinstallsdest', query1, function (err, results) {
          logger.info('query: ' + JSON.stringify(query1));
          console.log("appinstallsdest - err:", err, ", query1:", query1);
          var data = {};

          // verify the metric data was produced and is correct
          assert.equal(1, results.length);
          data = results[0];
          assert.equal('_ychdfEXFfcKf6YJK4hlWQ_a', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(2, data.value.iphone);
          assert.equal(1, data.value.android);
          testCallback();
        });
      },
      function (testCallback) {
        // get metrics data from db for app installs on the specified day
        query2 = {'_id.appid': 'PA5kI3YBNgM-HXXrAmn72h5p', '_id.ts': dateQuery};
        metdb.find('appinstallsdest', query2, function (err, results) {
          logger.info('query: ' + JSON.stringify(query2));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length);
          data = results[0];
          assert.equal('PA5kI3YBNgM-HXXrAmn72h5p', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(1, data.value.iphone);
          testCallback();
        });
      },
      function (testCallback) {
        query3 = {'_id.appid': 'VwPdJnMwIAWNOEKAmvEhlNrt', '_id.ts': dateQuery};
        // get metrics data from db for app installs on the specified day
        metdb.find('appinstallsdest', query3, function (err, results) {
          logger.info('query: ' + JSON.stringify(query3));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length);
          data = results[0];
          assert.equal('VwPdJnMwIAWNOEKAmvEhlNrt', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(1, data.value.android);
          testCallback();
        });
      },
      function (testCallback) {
        query4 = {'_id.appid': 'PA5kI3YBNgM-HXXrAmn72h5p', '_id.ts': dateQuery};
        // get metrics data from db for app startups on the specified day
        metdb.find('appstartupsdest', query4, function (err, results) {
          logger.info('query: ' + JSON.stringify(query4));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length);
          data = results[0];
          assert.equal('PA5kI3YBNgM-HXXrAmn72h5p', data._id.appid);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal('testa', data._id.domain);
          assert.equal(1, data.value.embed);
          testCallback();
        });
      },
      function (testCallback) {
        query5 = {'_id.domain': 'testa', '_id.ts': dateQuery};
        // get metrics data from db for app installs on the specified day
        metdb.find('domaininstallsdest', query5, function (err, results) {
          logger.info('query: ' + JSON.stringify(query5));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length, 'expected 1 resuls fro domaininstallsdest on day 1, was: ' + results.length);
          data = results[0];
          assert.equal('testa', data._id.domain, 'expected domain testa but was: ' + data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(2, data.value.android, 'expected 2 installs in domain for android, but was: ' + data.value.android);
          assert.equal(3, data.value.iphone, 'expected 3 installs in domain for iphone, but was: ' + data.value.iphone);
          testCallback();
        });
      } ,
      function (testCallback) {
        metricsMan.getMetric('appstartupsdest', {
          _id: 'PA5kI3YBNgM-HXXrAmn72h5p',
          from: {
            year: test_date.getFullYear(),
            month: test_date.getMonth() + 1,
            date: test_date.getDate()
          }
        }, function (err, results) {
          assert.isNull(err);
          assert.equal(results.length, 1);
          var getMetricData = results[0];
          assert.equal('PA5kI3YBNgM-HXXrAmn72h5p', getMetricData._id.appid);
          assert.equal(expected_metric_ts, getMetricData._id.ts);
          assert.equal('testa', getMetricData._id.domain);
          assert.equal(1, getMetricData.value.embed);
          testCallback();
        });
      },
      function (testCallback) {
        metricsMan.getMetric('appstartupsdest', {
          _id: 'PA5kI3YBNgM-HXXrAmn72h5p',
          from: {
            year: test_date.getFullYear(),
            month: test_date.getMonth() + 1,
            date: test_date.getDate()
          },
          to: {
            year: test_date.getFullYear(),
            month: test_date.getMonth() + 1,
            date: test_date.getDate()
          }
        }, function (err, results) {
          assert.isNull(err);
          assert.equal(results.length, 1);
          var getMetricData = results[0];
          assert.equal('PA5kI3YBNgM-HXXrAmn72h5p', getMetricData._id.appid);
          assert.equal(expected_metric_ts, getMetricData._id.ts);
          assert.equal('testa', getMetricData._id.domain);
          assert.equal(1, getMetricData.value.embed);
          testCallback();
        });
      } ,
      function (testCallback) {
        metricsMan.getMetric('appstartupsdest', {
          _id: 'PA5kI3YBNgM-HXXrAmn72h5p',
          from: {
            year: test_date.getFullYear(),
            month: test_date.getMonth() + 1,
            date: test_date.getDate()
          },
          to: {
            year: test_date.getFullYear(),
            month: test_date.getMonth() + 1,
            date: test_date.getDate() - 1
          }
        }, function (err, results) {
          assert.isNull(err);
          assert.equal(results.length, 0);  // no results since start and end date the same
          testCallback();
        });
      },
      function (testCallback) {
        testCallback();
      }
    ], function (err, res) {
      test.finish();
    });

  });
};

exports.test_generateMetricsData_day2 = function (test, assert) {
  var topic = 'appinit';

  // Test for Sun, 13 Jun 2011
  var messageDate1 = new Date(1307929721110);
  var expected_metric_ts = moment("13 Jun 2011").startOf('day').utc().valueOf();
  console.log("expected date ",expected_metric_ts)

  metricsMan = new fhmm.MetricsManager(config, logger);

  // generate metric data for a single topic on a single day
  metricsMan.generateMetricsData(topic, messageDate1, function (err, result) {
    assert.ok(!err);
    var gtd, ltd, dateQuery, query1, query2, query3;

    gtd = new Date(messageDate1);
    gtd.setHours(0, 0, 0, 0);
    ltd = new Date(gtd);
    ltd.setDate(ltd.getDate() + 1);
    dateQuery = { $gte: gtd.getTime(), $lt: ltd.getTime()};

    async.series([
      function (testCallback) {
        query1 = {'_id.appid': '_ychdfEXFfcKf6YJK4hlWQ_a', '_id.ts': dateQuery};
        metdb.find('appinstallsdest', query1, function (err, results) {
          logger.info('query: ' + JSON.stringify(query1));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length);
          data = results[0];
          assert.equal('_ychdfEXFfcKf6YJK4hlWQ_a', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(2, data.value.iphone);
          assert.equal(1, data.value.android);
          assert.equal(1, data.value.nokiawrt);
          testCallback();
        });
      },
      function (testCallback) {
        query2 = {'_id.appid': 'PA5kI3YBNgM-HXXrAmn72h5p', '_id.ts': dateQuery};
        metdb.find('appinstallsdest', query2, function (err, results) {
          logger.info('query: ' + JSON.stringify(query2));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length);
          data = results[0];
          assert.equal('PA5kI3YBNgM-HXXrAmn72h5p', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(2, data.value.iphone);
          testCallback();
        });
      },
      function (testCallback) {
        query3 = {'_id.appid': '_ychdfEXFfcKf6YJK4hlWQ_a', '_id.ts': dateQuery};
        metdb.find('appstartupsdest', query3, function (err, results) {
          logger.info('query: ' + JSON.stringify(query3));
          var data = {};
          // verify the metric data was produced and is correct
          assert.equal(1, results.length);
          data = results[0];
          assert.equal('_ychdfEXFfcKf6YJK4hlWQ_a', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(2, data.value.android);
          assert.equal(1, data.value.jil);
          testCallback();
        });
      },
      function (testCallback) {
        testCallback();
      }
    ], function (err, res) {
      test.finish();
    });
  });
};
