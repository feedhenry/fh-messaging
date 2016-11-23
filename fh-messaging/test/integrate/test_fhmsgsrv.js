var sinon = require('sinon');
var rewire = require('rewire');
var fhmsgsrv = rewire("../bin/fhmsgsrv.js");
var fh_logger = require("fh-logger");
var logger = fh_logger.createLogger({name: 'test_fhmsgsrv'});
fhmsgsrv.__set__("logger", logger);

exports.test_fhmsgsrv_setupUncaughtExceptionHandler = function (test, assert) {
  var exceptionHandler = fhmsgsrv.__get__("setupUncaughtExceptionHandler");
  assert.equal(process.listeners('uncaughtException').length, 1);
  exceptionHandler(fh_logger.createLogger({name: "testing"}));
  assert.equal(process.listeners('uncaughtException').length, 2);
  test.finish();
};

exports.test_fhmsgsrv_shutdownMsgServer = function (test, assert) {
  var msgServer = {
    messaging: {
      database: {
        tearDown: sinon.spy()
      }
    },
    server: {
      close: sinon.spy()
    }
  };
  var shutdownMsgServer = fhmsgsrv.__get__("shutdownMsgServer");
  shutdownMsgServer(msgServer);
  assert.ok(msgServer.messaging.database.tearDown.called);
  assert.ok(msgServer.server.close.called);
  test.finish();
};

