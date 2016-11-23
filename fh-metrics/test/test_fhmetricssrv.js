var helper = require('./test_helper.js'),
        logger = require('fh-logger').createLogger({name: 'test_fhmetricssrv'}),
        fhsrv = require("../lib/fhmetricssrv.js");
_ = require('underscore');

var config;
var metricsServer;

exports.initialize = function (test, assert) {
  logger.info('initialize');
  config = helper.getConfig();
  test.finish();
};

exports.finalize = function (test, assert) {
  logger.info('finalize');
  test.finish();
};

exports.setUp = function (test, assert) {
  logger.info('setUp');
  var collection = "appinstallsdest";
  config.set("metrics:database:name", 'test_fhmetricssrv');

  testData = {"log_19700101": {
    index: 'MD5',
    data: [
      {
        "appid": "allowme",
        'a': 'a0',
        MD5: 'a2b2ced207e7f8b4c5137b9d938fc0b2_19700101'},
      {
        "appid": "allowme",
        'a': 'a1',
        MD5: '2abe0ed38194d9792628cc1081ff436c_19700101'}
    ]}};

  testData = {
    "appinstallsdest": {
      data: [
        // Tue Mar 21 00:00:00 UTC 2000
        {_id: {appid: 'testid1', domain: 'testa', ts: 953596800000}, value: {studio: 3, embed: 2} },
        {_id: {appid: 'testid2', domain: 'testa', ts: 953596800000}, value: {studio: 1, android: 2} },
        {_id: {appid: 'testid3', domain: 'testa', ts: 953596800000}, value: {android: 1, iphone: 1} },
        // Wed Mar 22 00:00:00 UTC 2000
        {_id: {appid: 'testid1', domain: 'testa', ts: 953683200000}, value: {studio: 3} },
        {_id: {appid: 'testid3', domain: 'testa', ts: 953683200000}, value: {iphone: 4} }
      ]},
    "appinstalls": {
      data: [
        // Thu Mar 21 2000 00:00:00 GMT+0000 (GMT)
        {_id: {appid: 'testid1', domain: 'testa', ts: 953596800000}, value: {studio: 3, embed: 2} },
        {_id: {appid: 'testid2', domain: 'testa', ts: 953596800000}, value: {studio: 1, android: 2} },
        {_id: {appid: 'testid3', domain: 'testa', ts: 953596800000}, value: {android: 1, iphone: 1} },
        // Thu Mar 22 2000 00:00:00 GMT+0000 (GMT)
        {_id: {appid: 'testid1', domain: 'testa', ts: 953683200000}, value: {studio: 3} },
        {_id: {appid: 'testid3', domain: 'testa', ts: 953683200000}, value: {iphone: 4} }
      ]},
    "appactivedevice": {
      data: [
        // Thu Mar 21 2000 00:00:00 GMT+0000 (GMT)
        {_id: {appid: 'testid1', domain: 'testa', ts: 953596800000}, value: {cuids:{cuid1:{studio:1}, cuid2:{embed:1}}, destinations: {studio: 1, embed: 1}} },
        {_id: {appid: 'testid2', domain: 'testa', ts: 953596800000}, value: {cuids:{cuid1:{studio:1}, cuid3:{android:1}, cuid4: {android: 1}}, destinations: {studio: 1, android: 2}} },
        {_id: {appid: 'testid3', domain: 'testa', ts: 953596800000}, value: {cuids:{cuid3:{android:1}, cuid5:{iphone:1}}, destinations: {android: 1, iphone: 1}} },
        // Thu Mar 22 2000 00:00:00 GMT+0000 (GMT)
        {_id: {appid: 'testid1', domain: 'testa', ts: 953683200000}, value: {cuids:{cuid1:{studio:3}}, destinations: {studio: 3}} },
        {_id: {appid: 'testid3', domain: 'testa', ts: 953683200000}, value: {cuids:{cuid5:{iphone:4}}, destinations: {iphone: 4}} }
      ]
    },
    "appactivedevicegeo": {
      data:[
        // Thu Mar 21 2000 00:00:00 GMT+0000 (GMT)
        {_id: {appid: 'testid1', domain: 'testa', ts: 953596800000}, value: {"Ireland":{"cuids":{"F47A61E5E9064966B7E1D0A3FB56815F":1,"testdevice1":1,"testdevice2":1},"total":3}} },
        {_id: {appid: 'testid2', domain: 'testa', ts: 953596800000}, value: {"Germany":{"cuids":{"testdevice1":1,"testdevice2":1,"testdevice3":1,"F4DBCA2A878149288415E59959E35443":1},"total":4}} },
        {_id: {appid: 'testid3', domain: 'testa', ts: 953596800000}, value: {"United States":{"cuids":{"testdevice1":1},"total":1}} },
        // Thu Mar 22 2000 00:00:00 GMT+0000 (GMT)
        {_id: {appid: 'testid1', domain: 'testa', ts: 953683200000}, value: {"Ireland":{"cuids":{"F47A61E5E9064966B7E1D0A3FB56815F":1,"testdevice1":1,"testdevice2":1},"total":3}} },
        {_id: {appid: 'testid3', domain: 'testa', ts: 953683200000}, value: {"Germany":{"cuids":{"testdevice1":1,"testdevice2":1,"testdevice3":1,"F4DBCA2A878149288415E59959E35443":1},"total":4}} }
      ]
    }
  };

  helper.testDataSetUp(config.get("metrics:database"), testData, function (err, data, db) {
    if (err) {
      logger.error(JSON.stringify(err));
    }
    assert.ok(!err);
    test.finish();
  });
};

exports.tearDown = function (test, assert) {
  logger.info('tearDown');
  if (metricsServer && metricsServer.messaging.database != null) {
    console.log('tearing down db');
    metricsServer.messaging.database.tearDown();
  }
  helper.testDataTearDown(config.get("metrics:database"), function (err, data) {
    if (err) {
      logger.error(JSON.stringify(err));
    }
    assert.ok(!err);
    test.finish();
  });
};

exports.test_getMetric_no_metric = function (test, assert) {
  metricsServer = new fhsrv.MetricsServer(config.get(), logger, function (err) {
    assert.equal(err, null);
    assert.response(metricsServer.server, {
      url: '/metric',
      method: 'POST'
    }, {
      status: 404
    }, function (res) {
      test.finish();
    });
  });
};

exports.test_getMetric_invalid_metric = function (test, assert) {
  metricsServer = new fhsrv.MetricsServer(config.get(), logger, function (err) {
    assert.equal(err, null);

    assert.response(metricsServer.server, {
      url: '/metric/invalid',
      method: 'POST'
    }, {
      status: 400
    }, function (res) {
      test.finish();
    });
  });
};

exports.test_getMetric_no_params = function (test, assert) {
  metricsServer = new fhsrv.MetricsServer(config.get(), logger, function (err) {
    assert.equal(err, null);

    assert.response(metricsServer.server, {
      url: '/metric/appinstalls',
      method: 'POST'
    }, {
      status: 400
    }, function (res) {
      test.finish();
    });
  });
};

exports.test_getMetric_missing_param = function (test, assert) {
  metricsServer = new fhsrv.MetricsServer(config.get(), logger, function (err) {
    assert.equal(err, null);

    assert.response(metricsServer.server, {
      url: '/metric/appinstalls',
      method: 'POST',
      data: JSON.stringify({
        from: {
          year: '2000',
          month: '3',
          date: '21'
        }
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      status: 400
    }, function (res) {
      test.finish();
    });
  });
};

exports.test_getMetric_valid = function (test, assert) {
  metricsServer = new fhsrv.MetricsServer(config.get(), logger, function (err) {
    assert.equal(err, null);

    assert.response(metricsServer.server, {
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
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      status: 200
    }, function (res) {
      var results, res1;
      logger.info('res.body: ' + res.body);
      results = JSON.parse(res.body);
      assert.equal(1, results.length);
      res1 = results[0];
      assert.isNotNull(res1);
      assert.equal('testid1', res1._id.appid);
      assert.equal('3', res1.value.studio);
      assert.equal('2', res1.value.embed);
      test.finish();
    });
  });
};

exports.test_getMetric_valid2 = function (test, assert) {
  metricsServer = new fhsrv.MetricsServer(config.get(), logger, function (err) {
    assert.equal(err, null);

    assert.response(metricsServer.server, {
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
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      status: 200
    }, function (res) {
      var results, res1;
      logger.info('res.body: ' + res.body);
      results = JSON.parse(res.body);
      assert.equal(1, results.length, "expected 1 result but got: " + results.length);
      res1 = results[0];
      assert.isNotNull(res1);
      assert.equal('testid2', res1._id.appid);
      assert.equal('1', res1.value.studio);
      assert.equal('2', res1.value.android);
      test.finish();
    });
  });
};

exports.test_getMetric_raw = function (test, assert) {
  metricsServer = new fhsrv.MetricsServer(config.get(), logger, function (err) {
    assert.equal(err, null);

    assert.response(metricsServer.server, {
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
      headers: {
        'Content-Type': 'application/json'
      }
    }, function (res) {
      assert.ok(res.statusCode);
      assert.strictEqual(res.statusCode, 400);
      test.finish();
    });
  });
};

exports.test_getMetric_raw2 = function (test, assert) {
  metricsServer = new fhsrv.MetricsServer(config.get(), logger, function (err) {
    assert.equal(err, null);

    assert.response(metricsServer.server, {
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
      headers: {
        'Content-Type': 'application/json'
      }
    }, function (res) {
      assert.ok(res.statusCode);
      assert.strictEqual(res.statusCode, 400);
      test.finish();
    });
  });
};

exports.test_getTopMetric = function (test, assert) {
  logger.info('test_getTopMetric');

  metricsServer = new fhsrv.MetricsServer(config.get(), logger, function (err) {
    assert.equal(err, null);

    var numappsrequested = 2; // get top 2
    var metricname1 = 'appinstallsdest';
    var headers = helper.setDefaultHeaders(false, {});
    var data = {
      _id: 'testa',
      num: numappsrequested,
      from: helper.queryParamsForDateStr("20000321"),
      metric: [metricname1]
    }

    assert.response(metricsServer.server, {
      url: '/metric/top',
      method: 'POST',
      data: JSON.stringify(data),
      headers: headers
    }, function (res) {
      assert.equal(200, res.statusCode, "should have returned a 200 status, was: " + res.statusCode);
      logger.info('res.body: ' + res.body);
      var results = JSON.parse(res.body);
      assert.ok(results[metricname1], "should have a key for metric: " + metricname1);
      var res1 = results[metricname1];
      assert.equal(numappsrequested, res1.length, 'incorrect number of apps returned in list, expected: ' + numappsrequested + ", was: " + res1.length);

      var foundApp1 = false;
      var foundApp2 = false;
      var foundOtherApp = false;
      _.each(res1, function (r) {
        if (r._id.appid === 'testid1') {
          foundApp1 = true;
        } else if (r._id.appid === 'testid2') {
          foundApp2 = true;
        } else {
          foundOtherApp = true;
        }
      });

      assert.ok(true === foundApp1, 'should have found app1 in top 2');
      assert.ok(true === foundApp2, 'should have found app2 in top 2');
      assert.ok(!foundOtherApp, 'found unexpected app in top 2');
      test.finish();
    });
  });
};

exports.test_getSumMetric = function (test, assert) {
  logger.info('test_getSumMetric');
  test.skip('Implement me....');
};

exports.test_get_active_device_metric = function (test, assert) {
  metricsServer = new fhsrv.MetricsServer(config.get(), logger, function (err) {
    assert.equal(err, null);

    assert.response(metricsServer.server, {
      url: '/metric/appactivedevice',
      method: 'POST',
      data: JSON.stringify({
        _id: 'testid1',
        from: {
          year: '2000',
          month: '3',
          date: '21'
        }
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      status: 200
    }, function (res) {
      var results, res1;
      logger.info('res.body: ' + res.body);
      results = JSON.parse(res.body);
      assert.equal(1, results.length);
      res1 = results[0];
      assert.isNotNull(res1);
      assert.equal('testid1', res1._id.appid);
      assert.equal(1, res1.value.destinations.studio);
      assert.equal(1, res1.value.destinations.embed);
      test.finish();
    });
  });
};

exports.test_get_active_device_metric_geo = function (test, assert) {
  metricsServer = new fhsrv.MetricsServer(config.get(), logger, function (err) {
    assert.equal(err, null);

    assert.response(metricsServer.server, {
      url: '/metric/appactivedevicegeo',
      method: 'POST',
      data: JSON.stringify({
        _id: 'testid1',
        from: {
          year: '2000',
          month: '3',
          date: '21'
        }
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      status: 200
    }, function (res) {
      var results, res1;
      logger.info('res.body: ' + res.body);
      results = JSON.parse(res.body);
      assert.equal(1, results.length);
      res1 = results[0];
      assert.isNotNull(res1);
      assert.equal('testid1', res1._id.appid);
      assert.equal(3, res1.value.Ireland);
      test.finish();
    });
  });
};
