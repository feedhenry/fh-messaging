

var undertest = '../../lib/handlers/metrics';
var proxy = require('proxyquire');
var sinon = require('sinon');
var util = require('util');
var async = require('async');

var logger = {
  "debug":console.log
}

exports.test_metrics_get_byLevel_domain = function (test,assert){
  var metrics = proxy(undertest,{});
  
  var res = {
    "json":sinon.stub()
  };
  var mockDb = {"find": function (collection,q,cb){
    return cb(undefined, []);
  }};
  var spy = sinon.spy(mockDb,"find");
  var handlers = metrics({},logger,mockDb);
  var time = new Date().getTime();
  handlers.byLevel({"params":{"level":"domain"},"query":{"from": time, "to":time }},res,function (err, ok){
    assert.ok(! err, "did not expect an error " + util.inspect(err));
    assert.ok(ok,"expected ok to be defined");
    assert.ok(spy.callCount === handlers.domainMetricTypes.length,"expected spy to have been called for each metric");
    async.each(handlers.domainMetricTypes, function (metric,cb){
      assert.ok(ok.hasOwnProperty(metric),"expected domain metrics to have property " + metric);
      cb();
    },test.finish);
  });
  
};


exports.test_metrics_get_byLevel_app = function (test,assert){
  var metrics = proxy(undertest,{});

  var res = {
    "json":sinon.stub()
  };
  var mockDb = {"find": function (collection,q,cb){
    return cb(undefined, []);
  }};
  var spy = sinon.spy(mockDb,"find");
  var handlers = metrics({},logger,mockDb);
  var time = new Date().getTime();
  
  handlers.byLevel({"params":{"level":"app"},"query":{"from": time, "to":time }},res,function (err, ok){
    assert.ok(! err, "did not expect an error " + util.inspect(err));
    assert.ok(ok,"expected ok to be defined");
    assert.ok(spy.callCount === handlers.appMetricTypes.length,"expected spy to have been called for each metric");
    async.each(handlers.appMetricTypes, function (metric,cb){
      assert.ok(ok.hasOwnProperty(metric),"expected domain metrics to have property " + metric);
      cb();
    },test.finish);
  });

};

exports.test_metrics_get_byLevel_err = function (test,assert){
  var metrics = proxy(undertest,{});
  var handlers = metrics({},{});
  var time = new Date().getTime();
  handlers.byLevel({"params":{},"query":{}},{},function (err, ok){
    assert.ok(err, "expected an error");
    assert.equal(400,err.code,"expected 400 error code");
    test.finish();
  });

};

exports.test_metrics_get_byLevel_err_missing_bad_query_params = function (test,assert){
  var metrics = proxy(undertest,{});
  var handlers = metrics({},{});
  var time = new Date().getTime();
  handlers.byLevel({"params":{"level":"domain"},"query":{"from":"notanumber","to":"alsonotanumber"}},{},function (err, ok){
    assert.ok(err, "expected an error");
    assert.equal(400,err.code,"expected 400 error code");
    test.finish();
  });

};


