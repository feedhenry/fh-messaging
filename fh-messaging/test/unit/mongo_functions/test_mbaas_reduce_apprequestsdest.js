
//when testing the reduce function we have to supply an array of metrics as would be produced by one of the map functions
exports.test_metrics_r_mongo = function(test, assert) {
  var undertest = require('../../../lib/mongo_functions/metrics_map_apprequestdest');
  var key = {domain: "testing", ts: new Date().getTime()};
  var val = [{ "Ireland" : 13, id: 'appIdA'},{ "Ireland" : 13, id: 'appIdA' }, { "England" : 57, id: 'appIdB' }];
  var ret = undertest.metrics_r(key, val);
  assert.ok(ret, "expected a return value");
  assert.equal(ret.appIdA.Ireland , 26,"expected Ireland to have a count of 26");
  assert.equal(ret.appIdA.total , 26 , "expected  Ireland total to have a count of 26");
  assert.equal(ret.appIdB.England , 57,"expected England to have a count of 57");
  assert.equal(ret.appIdB.total , 57 , "expected  England total to have a count of 57");
  test.finish();
};
