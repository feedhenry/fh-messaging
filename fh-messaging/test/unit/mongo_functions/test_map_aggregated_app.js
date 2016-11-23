


exports.test_map_aggregated = function (test,assert){
  var ts = new Date().getTime();
  var emit = function (data,obj){
    assert.ok(data.domain == "testing","expected domain to be set");
    assert.ok(data.ts === ts,"expected timestamp to match");
    assert.ok(data.appid === "someapp","expected timestamp to match");
    assert.ok(obj.total == 10);
  };
  var undertest = require('../../../lib/mongo_functions/map_aggregated_app');
  undertest.setVars(ts,emit);
  var scope = {"_id":{"domain":"testing","appid":"someapp"},"value":{"total":10}};
  undertest.metrics_aggregated_app.call(scope);
  test.finish()
};
