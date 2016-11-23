
var undertest = require('../lib/helpers');

exports.test_helper_use_mbaas_data = function(test,assert){
  assert.ok(undertest.useMbaasData({"mbaas_data_enabled":true},"domainrequestsdest"),"expected to use mbaas data");
  assert.ok(undertest.useMbaasData({"mbaas_data_enabled":true},"apprequestsdest"),"expected to use mbaas data");
  assert.ok( ! undertest.useMbaasData({"mbaas_data_enabled":false},"apprequestsdest"),"expected to use mbaas data");
  assert.ok( ! undertest.useMbaasData({"mbaas_data_enabled":true},"appinstallsdest"),"expected to use mbaas data");
  test.finish()
};
