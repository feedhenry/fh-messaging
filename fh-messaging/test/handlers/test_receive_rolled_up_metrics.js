var undertest = '../../lib/handlers/rolled_up_metrics';
var proxy = require('proxyquire');
var sinon = require('sinon');
var util = require('util');
var async = require('async');

var recordStatusFn, assertBadRequest;

function getMocks(assert) {
  var mocks = {
    '../services/mbaas_metrics': function (mongo, logger) {
      return {
        "insertMultipleMetrics": function (metrics, cb) {
          assert.ok(metrics, "metrics should be defined");
          assert.ok("function" == typeof  cb);
          cb();
        },
        "removeMultipleMetrics": function (metrics, cb) {
          assert.ok(metrics, "metrics should be defined");
          assert.ok("function" == typeof  cb);
          cb();
        },
        "storeRollUpFrom": function (date,cb){
          assert.ok(date);
          cb();
        }
      }
    }
  };
  return mocks;
}

exports.setUp = function ( setUp, assert ) {

  recordStatusFn = function( statusCode ) {
    this.status = statusCode;
    return this;
  };

  assertBadRequest = function( test, expectedStatus, expectedMessage ) {
    return {
      status: recordStatusFn,
      json: function ( responseData ) {
        assert.equal( this.status, expectedStatus );
        assert.deepEqual( responseData, {message: expectedMessage});
        test.finish();
      },
      end: function () {
        assert.equal( this.status, expectedStatus );
        test.finish();
      }
    }
  };

  setUp.finish();
};


exports.test_roll_up_metrics_success = function ( test, assert ) {
  var time = new Date().getTime();
  var metrics = proxy(undertest,getMocks(assert));
  var handlers = metrics({}, {}, {});

  handlers.storeByLevel({
    _feedhenry:{auth:true,"authType":"apikey"},
    params: { level :'domain' },
    body: { from: time, to: time, can_be: 'really anything'}
  }, {
    status: recordStatusFn,
    end: function () {
      assert.equal( this.status, 202 );
      test.finish();
    }
  });
};


exports.test_roll_up_metrics_error = function ( test, assert ) {
  var time = new Date().getTime();
  var mockDb = {
  };
  var mocks = {
    '../services/mbaas_metrics': function (mongo,logger){
      return{
        "insertMultipleMetrics": function (metrics,cb){
          assert.ok(metrics,"metrics should be defined");
          assert.ok("function" == typeof  cb);
          cb({"message":"Failed to store roll up data into DB: some error message"});
        },
        "removeMultipleMetrics": function (metrics,cb){
          assert.ok(metrics,"metrics should be defined");
          assert.ok("function" == typeof  cb);
          cb();
        }
      }
    }
  };
  var mockLogger = {
    error: sinon.spy(function() {})
  };
  var metrics = proxy(undertest,mocks);
  var handlers = metrics({}, mockLogger, mockDb);

  handlers.storeByLevel({
    _feedhenry:{auth:true,"authType":"apikey"},
    params: { level :'app' },
    body: { from: time, to: time, can_be: 'really anything'}
  }, {
    status: recordStatusFn,
    json: function ( responseData ) {
      assert.equal( this.status, 500 );
      assert.ok( mockLogger.error.called );
      assert.deepEqual( responseData, { message: 'Failed to store roll up data into DB: some error message' });
      test.finish();
    }
  });
};


exports.test_no_data = function ( test ) {

  // given
  var metrics = proxy(undertest,getMocks());
  var handlers = metrics({},{},{});
  var time = new Date().getTime();

  // when
  handlers.storeByLevel({
    _feedhenry:{auth:true,"authType":"apikey"},
    params: { level :'domain'},
    body: { from: time, to: time }
  }, assertBadRequest( test, 400, "rollup data has to be provided"));

};


exports.test_no_auth = function ( test ) {

  // given
  var metrics = proxy(undertest,getMocks());
  var handlers = metrics({},{"error":console.log},{});
  var time = new Date().getTime();

  // when
  handlers.storeByLevel({
    _feedhenry:{auth:false,"authType":"apikey"},
    params: { level :'domain'},
    body: { from: time, to: time }
  }, assertBadRequest( test, 403, "rollup data has to be provided"));

};
