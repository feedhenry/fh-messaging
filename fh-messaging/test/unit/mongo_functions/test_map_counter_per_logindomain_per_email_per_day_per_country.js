
exports.test_map_counter_per_logindomain_per_email_per_day_per_country = function (test,assert){
  var ts = new Date().getTime();
  var emit = function (data,counter){
    console.log(data);
    assert.ok(data.domain == "testing","expected domain to be set");
    assert.ok(data.ts === ts,"expected timestamp to match");
    assert.ok(data.email == "foo@bar.com","expected email to be set");
    assert.ok(data.country === "ireland");
  };
  var undertest = require('../../../lib/mongo_functions/counter_per_logindomain_per_email_per_day_per_country');
  undertest.setVars(ts,emit);
  var scope = {"country":{"country_name":"ireland"},"email":"foo@bar.com","loginDomain":"testing"};
  undertest.map_counter_per_logindomain_per_email_per_day_per_country.call(scope);
  test.finish()
};
