var helper = require('./test_helper.js'),
    appkeys = require("../../lib/appkeys.js"),
    http = require('http');

var config;
var logger;
var msgdb;
var testServer;
var testServerPort = 52125;
var APPKEY_CACHE_COLLECTION = 'appKeyCache';

exports.initialize = function (test, assert) {
   helper.init( function(err,conf) {
    config = conf;
    logger = require('fh-logger').createLogger({name: 'test_appkeys'});
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
  config.database.name = "test_appkeys";

  testServer = http.createServer(function (request, response) {
    var data = "";
    request.on('data', function (chunk) {
      data += chunk;
    });
    request.on('end', function () {
      var resp = {
        status: "error"
      };
      console.log('DATA: ', data);
      if (data === '{"type":"app","key":"67890","appId":"12345"}') {
        resp.status = "ok";
        resp.valid = true;
      }
      if (data === '{"type":"app","key":"67890","appId":"12346"}') {
        resp.status = "ok";
        resp.valid = false;
      }
      // Every request gets the same "Hello Connect" response.
      response.writeHead(200, {"Content-Type": "application/json"});
      response.end(JSON.stringify(resp));

    });
  }).listen(testServerPort);

  helper.testDataSetUp(config.database, null, function (err, data, opendb) {
    if (err) {
      logger.error(err);
    }
    assert.ok(!err);
    msgdb = opendb;
    test.finish();
  });

};

exports.tearDown = function (test, assert) {
  logger.info('tearDown');
  testServer.close();
  msgdb.tearDown();

  helper.testDataTearDown(config.database, function (err, data) {
    if (err) {
      logger.error(err);
    }
    assert.ok(!err);
    test.finish();
  });
};

var test_cfg = {
  appkey_validate_path: '/box/srv/1.1/ide/fh-messaging/api/validate',
  clusters: [
    {
      clusterId: 'cluster',
      host: 'http://localhost:' + testServerPort
    },
    {
      clusterId: 'testing',
      host: 'https://testing.feedhenry.me'
    },
    {
      clusterId: 'testhttp',
      host: 'http://testhttp.feedhenry.me'
    },
    {
      clusterId: 'port',
      host: 'https://cluster.feedhenry.me:8080'
    }
  ]};

exports.test_GetClusterHostFromId1 = function (test, assert) {
  var appkeyValidator = new appkeys.AppKeyValidator(test_cfg, null, logger);

  appkeyValidator.getClusterHostFromId("cluster", function (err, host) {
    assert.strictEqual(host, 'http://localhost:' + testServerPort);
    test.finish();
  });
};

exports.test_GetClusterHostFromId2 = function (test, assert) {
  var appkeyValidator = new appkeys.AppKeyValidator(test_cfg, null, logger);

  appkeyValidator.getClusterHostFromId("testing", function (err, host) {
    assert.strictEqual(host, "https://testing.feedhenry.me");
    test.finish();
  });
};

exports.test_GetClusterHostFromId3 = function (test, assert) {
  var appkeyValidator = new appkeys.AppKeyValidator(test_cfg, null, logger);

  appkeyValidator.getClusterHostFromId('testhttp', function (err, host) {
    assert.strictEqual(host, 'http://testhttp.feedhenry.me');
    test.finish();
  });
};

exports.test_GetClusterHostFromId4 = function (test, assert) {
  var appkeyValidator = new appkeys.AppKeyValidator(test_cfg, null, logger);
  appkeyValidator.getClusterHostFromId('port', function (err, host) {
    assert.strictEqual(host, "https://cluster.feedhenry.me:8080");
    test.finish();
  });
};

exports.test_GetClusterHostFromId_not_exist = function (test, assert) {
  var appkeyValidator = new appkeys.AppKeyValidator(test_cfg, null, logger);
  appkeyValidator.getClusterHostFromId('notexist', function (err, host) {
    assert.strictEqual(host, null);
    test.finish();
  });
};

exports.test_ValidateWithHost = function (test, assert) {
  var appkeyValidator = new appkeys.AppKeyValidator(test_cfg, null, logger);

  appkeyValidator.validateWithHost("http://localhost:" + testServerPort, "12345", "67890", function (err, valid) {
    assert.ok(true === valid, 'validateWithHostValid should be valid');

    appkeyValidator.validateWithHost("http://localhost:" + testServerPort, "12346", "67890", function (err, valid) {
      assert.ok(false === valid, 'validateWithHostInValid should not be valid');

      appkeyValidator.validateWithHost("http://localhost:" + testServerPort, "12347", "67890", function (err, valid) {
        assert.ok(false === valid, 'validateWithHostError should not be valid');
        test.finish();
      });
    });
  });
};

exports.test_ValidateAppKey = function (test, assert) {
  //ToDo This should be broken up into smaller tests
  var appkeyValidator = new appkeys.AppKeyValidator(test_cfg, msgdb, logger);
  msgdb.removeAll(APPKEY_CACHE_COLLECTION, function (err) {
    assert.ok(!err, "Error deleting collection: " + JSON.stringify(err));

    var fred = appkeyValidator.validateAppKey;
    fred.call(appkeyValidator, "cluster;12345;67890", function (err, valid) {

      assert.ok(true === valid, "validateAppKeyValid should be valid");

      appkeyValidator.validateAppKey("cluster;12346;67890", function (err, valid) {
        assert.ok(false === valid, "validateAppKeyInvalid should not be valid");

        appkeyValidator.validateAppKey("cluster;12347;67890", function (err, valid) {
          assert.ok(false === valid, "validateAppKeyError should not be valid");

          msgdb.find(APPKEY_CACHE_COLLECTION, {_id: {clusterId: "cluster", appGuid: "12345", appKey: "67890"}}, function (err, results) {
            console.log("CACHE CHECK1 err: " + JSON.stringify(err) + ", results: " + JSON.stringify(results));
            assert.ok(!err, "error in check cached 1: " + JSON.stringify(err));
            assert.ok(results[0], "bad results[0] in check cached 1: " + JSON.stringify(results));
            assert.ok(true === results[0].valid, "check cached 1 - should be valid");
            msgdb.find(APPKEY_CACHE_COLLECTION, {_id: {clusterId: "cluster", appGuid: "12346", appKey: "67890"}}, function (err, results) {
              console.log("CACHE CHECK1 err: " + JSON.stringify(err) + ", results: " + JSON.stringify(results));
              assert.ok(!err, "error in check cached 2: " + JSON.stringify(err));
              assert.ok(results[0], "bad results[0] in check cached 2: " + JSON.stringify(results));
              assert.ok(false === results[0].valid, "check cached 1 - should be valid");

              //Finish test here
              test.finish();
            });
          });
        });
      });
    });
  });
};

exports.test_SplitKeyInfo = function (test, assert) {
  var splittest = [
    {
      input: "cluster;appid;appkey",
      output: {clusterId: "cluster", appGuid: "appid", appKey: "appkey"}}
  ];
  var i;
  var result;
  for (i = 0; i < splittest.length; i += 1) {
    result = appkeys.splitKeyInfo(splittest[i].input);
    assert.strictEqual(result.clusterId, splittest[i].output.clusterId, "incorrect clusterid: " + result.clusterId + ", expected: " + splittest[i].output.clusterId + ", returned for entry: " + i);
    assert.strictEqual(result.appGuid, splittest[i].output.appGuid, "incorrect appGuid: " + result.appGuid + ", expected: " + splittest[i].output.appGuid + ", returned for entry: " + i);
    assert.strictEqual(result.appKey, splittest[i].output.appKey, "incorrect appKey: " + result.appKey + ", expected: " + splittest[i].output.appKey + ", returned for entry: " + i);
  }

  test.finish();
};

exports.test_APPKeyCache = function (test, assert) {
  //ToDo This should be broken up into smaller tests
  var appkeyValidator = new appkeys.AppKeyValidator({}, msgdb, logger);
  var keyInfo = {
    clusterId: "cluster",
    appGuid: "appguid",
    appKey: "appkey"
  };

  msgdb.removeAll(APPKEY_CACHE_COLLECTION, function (err) {
    assert.ok(!err, "Error deleting collection: " + JSON.stringify(err));
    appkeyValidator.getCachedValidationResult(keyInfo, function (err, incache, valid) {
      assert.ok(!err, "Error getCachedValidationResult() - emptycache: " + JSON.stringify(err));
      assert.ok(false === incache, "should not have been found in cache");
      msgdb.create(APPKEY_CACHE_COLLECTION, {_id: keyInfo, valid: false}, function (err, data) {
        assert.ok(!err, "Error creating cached test value: " + JSON.stringify(err));
        console.log("data from db.create: ", JSON.stringify(data));
        appkeyValidator.getCachedValidationResult(keyInfo, function (err, incache, valid) {
          assert.ok(!err, "Error getCachedValidationResult() - cachefalse: " + JSON.stringify(err));
          assert.ok(true === incache, "should have been found in cache");
          assert.ok(false === valid, "should not have been valid in cache");
          msgdb.update(APPKEY_CACHE_COLLECTION, {_id: keyInfo, valid: false}, {_id: keyInfo, valid: true}, true, function (err, data) {
            assert.ok(!err, "Error updating cached test value: " + JSON.stringify(err));
            appkeyValidator.getCachedValidationResult(keyInfo, function (err, incache, valid) {
              assert.ok(!err, "Error getCachedValidationResult() - cachetrue: " + JSON.stringify(err));
              assert.ok(true === incache, "should have been found in cache");
              assert.ok(true === valid, "should have been valid in cache");

              var keyInfo2 = {
                clusterId: "cluster2",
                appGuid: "appguid2",
                appKey: "appkey2"
              };
              var keyInfo3 = {
                clusterId: "cluster3",
                appGuid: "appguid3",
                appKey: "appkey3"
              };
              msgdb.removeAll(APPKEY_CACHE_COLLECTION, function (err) {
                assert.ok(!err, "Error deleting collection: " + JSON.stringify(err));
                appkeyValidator.cacheResult(keyInfo2, false, function (err) {
                  assert.ok(!err);
                  msgdb.find(APPKEY_CACHE_COLLECTION, {_id: keyInfo2}, function (err, results) {
                    console.log("err: " + JSON.stringify(err) + ", results: " + JSON.stringify(results));
                    assert.ok(!err);
                    assert.ok(results[0]);
                    assert.ok(false === results[0].valid);

                    appkeyValidator.cacheResult(keyInfo3, true, function (err) {
                      assert.ok(!err, "Error setting second cache result: " + JSON.stringify(err));
                      msgdb.find(APPKEY_CACHE_COLLECTION, {_id: keyInfo3}, function (err, results) {
                        console.log("err: " + JSON.stringify(err) + ", results: " + JSON.stringify(results));
                        assert.ok(!err);
                        assert.ok(results[0]);
                        assert.ok(true === results[0].valid);

                        //Finish here
                        test.finish();

                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    })
  });

};
