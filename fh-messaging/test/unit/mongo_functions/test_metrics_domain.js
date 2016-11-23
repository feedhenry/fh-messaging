


exports.test_metrics_domain_mongo = function (test,assert){
  var ts = new Date().getTime();
  var emit = function (data,obj){
    assert.ok(data.domain == "testing","expected domain to be set");
    assert.ok(data.ts === ts,"expected timestamp to match");
    assert.ok(obj.test == 1);
  };
  var undertest = require('../../../lib/mongo_functions/metrics_domain');
  undertest.setVars(ts,emit);
  var scope = {"destination":"test","domain":"testing"};
  undertest.metrics_domain.call(scope);
  test.finish()
};
