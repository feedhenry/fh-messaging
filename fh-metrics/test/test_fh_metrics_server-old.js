// Test suite for FeedHenry Metrics Server
//
// NOTE: The Metrics Server is currently deployed as part of the message server,
//       so these tests run against the messsage server.
var fh_logger = require('fh-logger');
var fhdb = require('fh-db');
var test_listener = require('./test_listener.js');
var path = require('path');
var assert = require('assert');

var fs = require('node-fs');

var fhsrv = require("../lib/fhmetricssrv.js");

var testConfig = {
  "metrics": {
    "database": {
      "name": "test_fh_metrics_server_results",
      "host": "localhost",
      "port": 27017
    },
    "ssl": {
      "use_ssl": "false",
      "key": "../config/server.key",
      "cert": "../config/server.crt"
    },
    "metricsDir":  "/var/log/feedhenry/fh-messaging/metrics",
    "dirPerms":  "0760",
    "filePerms":  "0660",
    "idFieldName": {
      "default": "_id.appid",
      "usercreate": "_id.domain",
      "usercreategeo": "_id.domain",
      "userlogin": "_id.domain",
      "userlogingeo": "_id.domain",
      "appcreate": "_id.domain",
      "appcreategeo": "_id.domain",
      "appbuild": "_id.domain",
      "appbuildgeo": "_id.domain",
      "credentialsuploaded": "_id.domain",
      "credentialsuploadedgeo": "_id.domain"
    },
    "topics": {
      "appinit": {
        "groupField": "appid"
      },
      "appcreate": {
        "groupField": "guid"
      },
      "appexport": {
        "groupField": "guid"
      },
      "appdelete": {
        "groupField": "guid"
      },
      "appbuild": {
        "groupField": "guid"
      },
      "fhact": {
        "groupField": "guid"
      },
      "fhweb": {
        "groupField": "guid"
      }
    },
    "retryConfig": {
      "interval": 1000,
      "limit": 3
    },
    "logger": {
      "name": "metrics",
      "streams": [{
        "type": "file",
        "stream": "file",
        "path": "/var/log/feedhenry/fh-metrics/fh-metrics.log",
        "level": "info"
      }, {
        "type": "raw",
        "src": true,
        "level": "debug",
        "stream": "ringBuffer"
      }]
    }
  }
};

var logger = fh_logger.createLogger(testConfig.metrics.logger);

/*
 * Generic error handler
 */
function handleErr(err) {
  assert.ok(!err);
  if (err) {
    logger.error(err);
    process.exit(1);
  }
}

// test data calls
function createTestData(config, collection, testData, callback) {
  var db = new fhdb.Database();
  db.name = config.metrics.database.name;

  db.on("tearUp", function () {
    db.dropDatabase(function (err, result) {
      handleErr(err);
      db.create(collection, testData, function (err, data) {
        handleErr(err);
        db.tearDown();
        callback(err, data);
      });
    });
  });

  db.addListener("error", function (err) {
    logger.error("createTestData database error: " + err);
    callback(err);
  });

  db.tearUp();
}

module.exports = {
  testGetTopMetrics: function () {
    var self = this, config = {}, testData = [], collectionName = '', testCount = 0, tl;

    collectionName = "appinstallsdest";
    config = JSON.parse(JSON.stringify(testConfig));
    config.metrics.database.name = 'testGetTopMetrics';
    config.metrics.ignoreAPIKey = true;
    testData = [
       // Thu Mar 21 2000 00:00:00 GMT+0000 (GMT)
      {_id: {appid: 'testid1', domain: 'testa', ts: 953596800000}, value: {studio: 3, embed: 2, total: 5} },
      {_id: {appid: 'testid2', domain: 'testa', ts: 953596800000}, value: {studio: 1, android: 2, total: 3} },
      {_id: {appid: 'testid3', domain: 'testa', ts: 953596800000}, value: {android: 1, iphone: 1, total: 2} },
      // Thu Mar 22 2000 00:00:00 GMT+0000 (GMT)
      {_id: {appid: 'testid1', domain: 'testa', ts: 953683200000}, value: {studio: 3, total: 3} },
      {_id: {appid: 'testid3', domain: 'testa', ts: 953683200000}, value: {iphone: 4, total: 4} }
    ];

    createTestData(JSON.parse(JSON.stringify(config)), collectionName, testData, function (err, data) {
      assert.equal(err, null);
      logger.info('creating new message server');
      self.metricsServer = new fhsrv.MetricsServer(JSON.parse(JSON.stringify(config)), logger, function(err) {
      assert.equal(err, null);
      var metricname1 = 'appinstallsdest';
      var numappsrequested = 2; // get top 2

      testCount = 1; // arguments.callee.toString().split('testFinished').length - 2;
      logger.info('testcount testGetTopMetrics :: ' + testCount);
      tl = new test_listener.TestListener(testCount, logger);
      tl.on('testsFinished', function () {
        self.metricsServer.messaging.database.tearDown();
      });

      assert.response(self.metricsServer.server, {
          url: '/metric/top',
          method: 'POST',
          data: JSON.stringify({
            _id: 'testa',
            num: numappsrequested,
            from: {
              year: '2000',
              month: '3',
              date: '21'
            },
            metric: [metricname1]
          }),
          headers : {
            'Content-Type' : 'application/json'
          }
        }, function (res) {
          assert.equal(200, res.statusCode, "should have returned a 200 status, was: " + res.statusCode);
          var results, res1;
          logger.info('res.body: ' + res.body);
          results = JSON.parse(res.body);

          tl.testFinished('Test top apps for metric with valid params');
          assert.ok(results[metricname1], "should have a key for metric: " + metricname1);
          res1 = results[metricname1];
          // following check that testid1 and testid2 are the top 2 apps
          var foundApp1 = false;
          var foundApp2 = false;
          var foundOtherApp = false;
          var i;
          for(i = 0; i < res1.length; i += 1) {
            if (res1[i]._id.appid === 'testid1') {
              foundApp1 = true;
            } else if (res1[i]._id.appid === 'testid2') {
              foundApp2 = true;
            } else {
              foundOtherApp = true;
            }
          }
          assert.ok(true === foundApp1, 'should have found app1 in top 2');
          assert.ok(true === foundApp2, 'should have found app2 in top 2');
          assert.ok(!foundOtherApp, 'found unexpected app in top 2');
        }
      );
    });
    });

  },

  testGetMetrics: function () {
    var self = this, config = {}, testData = [], collectionName = '', testCount = 0, tl;

    collectionName = "appinstalls";
    config = JSON.parse(JSON.stringify(testConfig));
    config.metrics.database.name = 'testGetMetrics';
    config.metrics.ignoreAPIKey = true;

    testData = [
       // Thu Mar 21 2000 00:00:00 GMT+0000 (GMT)
      {_id: {appid: 'testid1', domain: 'testa', ts: 953596800000}, value: {studio: 3, embed: 2} },
      {_id: {appid: 'testid2', domain: 'testa', ts: 953596800000}, value: {studio: 1, android: 2} },
      {_id: {appid: 'testid3', domain: 'testa', ts: 953596800000}, value: {android: 1, iphone: 1} },
      // Thu Mar 22 2000 00:00:00 GMT+0000 (GMT)
      {_id: {appid: 'testid1', domain: 'testa', ts: 953683200000}, value: {studio: 3} },
      {_id: {appid: 'testid3', domain: 'testa', ts: 953683200000}, value: {iphone: 4} }
    ];

    createTestData(JSON.parse(JSON.stringify(config)), collectionName, testData, function (err, data) {
      assert.equal(err, null);
      logger.info('creating new message server');
      self.metricsServer = new fhsrv.MetricsServer(JSON.parse(JSON.stringify(config)), logger, function(err) {

      testCount = arguments.callee.toString().split('testFinished').length - 2;
      logger.info('testcount testGetMetrics :: ' + testCount);
      tl = new test_listener.TestListener(testCount, logger);
      tl.on('testsFinished', function () {
        self.metricsServer.messaging.database.tearDown();
      });

      assert.equal(err, null);
      // Test no metric type being requested
      assert.response(self.metricsServer.server, {
        url: '/metric',
        method: 'POST'
      }, {
        body: 'Error: No end point.',
        status: 503
      }, function (res) {
        tl.testFinished('Test no metric type being requested');
      });

      // Test an invalid metric type
      assert.response(self.metricsServer.server, {
        url: '/metric/invalid',
        method: 'POST'
      }, {
        status: 400
      }, function (res) {
        tl.testFinished('Test an invalid metric type');
      });

      assert.response(self.metricsServer.server, {
        url: '/metric/appinstalls',
        method: 'POST'
      }, {
        status: 400
      }, function (res) {
        tl.testFinished('Test a valid metric type with no params');
      });

      assert.response(self.metricsServer.server, {
        url: '/metric/appinstalls',
        method: 'POST',
        params: {
          invalidParam1: 'some value'
        }
      }, {
        status: 400
      }, function (res) {
        tl.testFinished('Test a valid metric type with an invalid param');
      });

      assert.response(self.metricsServer.server, {
        url: '/metric/appinstalls',
        method: 'POST',
        data: JSON.stringify({
          from: {
            year: '2000',
            month: '3',
            date: '21'
          }
        }),
        headers : {
          'Content-Type' : 'application/json'
        }
      }, {
        status: 400
      }, function (res) {
        tl.testFinished('Test a valid metric type with a required param missing');
      });

      assert.response(self.metricsServer.server, {
        url: '/metric/appinstalls',
        method: 'POST',
        data: JSON.stringify({
          _id: 'testid1',
          from: {
            year: '2000',
            month: '3',
            date: '21'
          }
        }),
        headers : {
          'Content-Type' : 'application/json'
        }
      }, {
        status: 200
      }, function (res) {
        var results, res1;
        logger.info('res.body: ' + res.body);
        results = JSON.parse(res.body);

        tl.testFinished('Test a valid metric type with valid params');
        assert.equal(1, results.length);
        res1 = results[0];
        assert.isNotNull(res1);
        assert.equal('testid1', res1._id.appid);
        assert.equal('3', res1.value.studio);
        assert.equal('2', res1.value.embed);
      });


      assert.response(self.metricsServer.server, {
        url: '/metric/appinstalls',
        method: 'POST',
        data: JSON.stringify({
          _id: 'testid2',
          from: {
            year: '2000',
            month: '3',
            date: '21'
          }
        }),
        headers : {
          'Content-Type' : 'application/json'
        }
      }, {
        status: 200
      }, function (res) {
        var results, res1;
        logger.info('res.body: ' + res.body);
        results = JSON.parse(res.body);

        tl.testFinished('Test another valid metric type with valid params');
        assert.equal(1, results.length, "expected 1 result but got: " + results.length);
        res1 = results[0];
        assert.isNotNull(res1);
        assert.equal('testid2', res1._id.appid);
        assert.equal('1', res1.value.studio);
        assert.equal('2', res1.value.android);
      });


      assert.response(self.metricsServer.server, {
        url: '/metric/appinstalls',
        method: 'POST',
        data: JSON.stringify({
          _id: 'testid2',
          from: {
            year: '2000',
            month: '3',
            date: '21'
          },
          out: 'raw'
        }),
        headers : {
          'Content-Type' : 'application/json'
        }
      }, function (res) {
	setTimeout(function () {
          tl.testFinished('Test another valid metric type with valid params - appinstalls, out: raw - ensure requesting raw output fails');
          assert.ok(res.statusCode);
          assert.strictEqual(res.statusCode, 400);
	}, 0);
      });

      for (var dayNum = 1; dayNum <= 2; dayNum += 1) {
        var dayStr = 10 + dayNum;
        var day = path.join(testConfig.metrics.metricsDir, "2011/9/" + dayStr);
        fs.mkdirSync(day, 511, true);  // 511 == 0777
        for (var fileNum = 1; fileNum <= 2; fileNum += 1) {
          var file = path.join(day, "appinit.testid" + fileNum + ".log");
          fs.writeFileSync(file, "This is day " + dayNum + " - file " + fileNum + "\n");
        }
      }

      assert.response(self.metricsServer.server, {
        url: '/metric/appinit',
        method: 'POST',
        data: JSON.stringify({
          _id: 'testid1',
          from: {
            year: '2011',
            month: '10',
            date: '11'
          },
          out: 'raw'
        }),
        headers : {
          'Content-Type' : 'application/json'
        }
      }, function (res) {
	setTimeout(function () {
          tl.testFinished('Test another valid metric type with valid params- appinit, out: raw - ensure requesting raw output fails');
          assert.ok(res.statusCode);
          assert.strictEqual(res.statusCode, 400);
        }, 0);
      });
    });
    });
  }
};
