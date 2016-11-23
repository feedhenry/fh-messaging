

exports.test_map_counter_per_logindomain_per_day = function (test,assert){
  var ts = new Date().getTime();
  var emit = function (data,counter){
    console.log(data);
    assert.ok(data.domain == "testing","expected domain to be set");
    assert.ok(data.ts === ts,"expected timestamp to match");
    //assert.ok(data.country === "ireland");
    //assert.ok(counter == 1,"expected the counter to return 1");
  };
  var undertest = require('../../../lib/mongo_functions/counter_per_logindomain_per_day');
  undertest.setVars(ts,emit);
  var scope = {"country":{"country_name":"ireland"},"loginDomain":"testing"};
  undertest.map_counter_per_logindomain_per_day.call(scope);
  test.finish()
};
