var sinon = require('sinon');
var rewire = require('rewire');
var fhmetsrv = rewire("../bin/fhmetsrv.js");
var fh_logger = require("fh-logger");
var logger = fh_logger.createLogger({name: 'test_fhmetsrv'});
fhmetsrv.__set__("logger", logger);
fhmetsrv.__set__("args", ["configFile"]);

exports.test_fhmetsrv_setupUncaughtExceptionHandler = function (test, assert) {
  var exceptionHandler = fhmetsrv.__get__("setupUncaughtExceptionHandler");
  assert.equal(process.listeners('uncaughtException').length, 1);
  exceptionHandler(fh_logger.createLogger({name: "testing"}));
  assert.equal(process.listeners('uncaughtException').length, 2);
  test.finish();
};

exports.test_fhmetsrv_shutdownMetricsServer = function (test, assert) {
  var metricsServer = {
    server: {
      close: sinon.spy()
    }
  };
  var shutdownServer = fhmetsrv.__get__("shutdownServer");
  shutdownServer(metricsServer);
  assert.ok(metricsServer.server.close.called);
  test.finish();
};

