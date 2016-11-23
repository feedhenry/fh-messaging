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
    logger = require('fh-logger').createLogger({name: 'test_metrics_man_gen_metrics_geoip'});
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
  config.database.name = "test_fh_metrics_man_gen_metrics_geoip_msg";
  config.metrics.database.name = "test_fh_metrics_man_gen_metrics_geoip_met";
  config.metrics.whitelist = {}; //Remove the whitelist or none of the gen log tests work
  logger.info("Test metrics dir :: " + config.metrics.metricsDir);

  //fhact_20130219 // Tue Feb 19 2013 - 1361232000000
  //fhact_20130220 // Wed Feb 20 2013 - 1361318400000

  testData = {
    "appinit_20110612": {
      "index": 'MD5',
      "data": [
        {"MD5": "2f30d22d4182ac5c6fc3b3", ipAddress: "1.0.1.2", "country": { "country_name": "China", "country_code": "CN", "country_code3": "CHN", "continent_code": "AS" }, "_ts": 1307919404819, "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "install"},
        {"MD5": "2f30d22d418sdfsdfsdf53", ipAddress: "193.1.184.10", "country": { "country_name": "Ireland", "country_code": "IE", "country_code3": "IRL", "continent_code": "EU" }, "_ts": 1307919404819, "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "install"},
        {"MD5": "2f30asdfsdfb3b75365884", ip: "193.1.184.11", "country": { "country_name": "Ireland", "country_code": "IE", "country_code3": "IRL", "continent_code": "EU" }, "_ts": 1307919404819, "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "install"},
        {"MD5": "2f30d22d418sdfasdf3658", ip: "3.4.5.6", "country": { "country_name": "United States", "country_code": "US", "country_code3": "USA", "continent_code": "NA" }, "_ts": 1307919404819, "appid": "PA5kI3YBNgM-HXXrAmn72h5p", "destination": "iphone", "domain": "testa", "firsttime": "install"},
        {"MD5": "2f30asdfsdafc3b3b75365", ipAddress: "3.4.5.6", "country": { "country_name": "United States", "country_code": "US", "country_code3": "USA", "continent_code": "NA" }, "_ts": 1307919404819, "appid": "PA5kI3YBNgM-HXXrAmn72h5p", "destination": "iphone", "domain": "testa", "firsttime": "install"}
      ]
    },
    "appinit_20110613": {
      "index": 'MD5',
      "data": [
        {"MD5": "93a6186fecd3cesdfsdfsd", ipAddress: "3.4.5.6", "country": { "country_name": "United States", "country_code": "US", "country_code3": "USA", "continent_code": "NA" }, "_ts": 1307929721110, "appid": "PA5kI3YBNgM-HXXrAmn72h5p", "destination": "iphone", "domain": "testa", "firsttime": "install"},
        {"MD5": "sdfdsf6fecdsdfsdfsdfsd", ip: "193.1.184.10", "country": { "country_name": "Ireland", "country_code": "IE", "country_code3": "IRL", "continent_code": "EU" }, "_ts": 1307929721110, "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "install"},
        {"MD5": "12345sdfsdfsdfsdfddfsd", ipAddress: "127.0.0.1", "_ts": 1307929721110, "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "install"},
        {"MD5": "asdfsdafacd3cesdfsdfsd", "_ts": 1307929721110, "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "install"}
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


exports.test_generateMetricsData_geoip = function (test, assert) {
  topic = 'appinit';
  // Test for Sun, 12 Jun 2011
  var messageDate = new Date(1307919404819);
  var expected_metric_ts = moment("12 Jun 2011").startOf('day').utc().valueOf();

  metricsMan = new fhmm.MetricsManager(config, logger);

  metricsMan.generateMetricsData(topic, messageDate, function (err, result) {
    var gtd, ltd, dateQuery, query1, query2, query3, query4;

    gtd = new Date(messageDate);
    gtd.setHours(0, 0, 0, 0);
    ltd = new Date(gtd);
    ltd.setDate(ltd.getDate() + 1);
    dateQuery = { $gte: gtd.getTime(), $lt: ltd.getTime()};

    async.series([
      function (testCallback) {
        query1 = {'_id.appid': '_ychdfEXFfcKf6YJK4hlWQ_a', '_id.ts': dateQuery};
        metdb.find('appinstallsgeo', query1, function (err, results) {
          logger.info('query: ' + JSON.stringify(query1));
          var data = {};
          assert.equal(1, results.length);
          data = results[0];
          assert.equal('_ychdfEXFfcKf6YJK4hlWQ_a', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(2, data.value.Ireland);
          assert.equal(1, data.value.China);
          testCallback();
        });
      },
      function (testCallback) {
        // get metrics data from db for app installs on the specified day
        query2 = {'_id.appid': 'PA5kI3YBNgM-HXXrAmn72h5p', '_id.ts': dateQuery};
        metdb.find('appinstallsgeo', query2, function (err, results) {
          logger.info('query: ' + JSON.stringify(query2));
          var data = {};
          assert.equal(1, results.length);
          data = results[0];
          assert.equal('PA5kI3YBNgM-HXXrAmn72h5p', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          testCallback();
        });
      }
    ], function (err, res) {
      test.finish();
    });
  });
};

exports.test_generateMetricsData_geoip_day2 = function (test, assert) {
  topic = 'appinit';
  // Test for Sun, 13 Jun 2011
  var messageDate = new Date(1307929721110);
  var expected_metric_ts = moment("13 Jun 2011").startOf('day').utc().valueOf();

  metricsMan.generateMetricsData(topic, messageDate, function (err, result) {
    var gtd, ltd, dateQuery, query1, query2, query3;

    gtd = new Date(messageDate);
    gtd.setHours(0, 0, 0, 0);
    ltd = new Date(gtd);
    ltd.setDate(ltd.getDate() + 1);
    dateQuery = { $gte: gtd.getTime(), $lt: ltd.getTime()};

    async.series([
      function (testCallback) {
        query1 = {'_id.appid': '_ychdfEXFfcKf6YJK4hlWQ_a', '_id.ts': dateQuery};
        // get metrics data from db for app installs on the specified day
        metdb.find('appinstallsgeo', query1, function (err, results) {
          logger.info('query: ' + JSON.stringify(query1));
          var data = {};
          assert.equal(1, results.length);
          data = results[0];
          assert.equal('_ychdfEXFfcKf6YJK4hlWQ_a', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(1, data.value.Ireland);
          testCallback();
        });
      },
      function (testCallback) {
        query2 = {'_id.appid': 'PA5kI3YBNgM-HXXrAmn72h5p', '_id.ts': dateQuery};
        metdb.find('appinstallsgeo', query2, function (err, results) {
          logger.info('query: ' + JSON.stringify(query2));
          var data = {};
          assert.equal(1, results.length);
          data = results[0];
          assert.equal('PA5kI3YBNgM-HXXrAmn72h5p', data._id.appid);
          assert.equal('testa', data._id.domain);
          assert.equal(expected_metric_ts, data._id.ts);
          assert.equal(1, data.value['United States']);
          testCallback();
        });
      }
    ], function (err, res) {
      test.finish();
    });
  });
};
