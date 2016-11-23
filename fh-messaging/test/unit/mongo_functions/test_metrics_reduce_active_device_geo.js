exports.test_metrics_reduce_active_device_geo = function(test, assert) {
  var undertest = require('../../../lib/mongo_functions/metrics_r_active_device_geo');
  var val = [{Ireland: {cuids:{cuid1:1}, total: 1}}, {Germany: {cuids:{cuid2:1}, total: 1}}, {Ireland: {cuids: {cuid1:1, cuid3:1}, total:2}, Germany: {cuids:{cuid4:1}, total: 1}}];
  var key = {domain: "testing", ts: new Date().getTime()};
  var ret = undertest.metrics_r_active_device_geo(key,val);
  assert.ok(ret, "expected a return value");
  assert.ok(ret.Ireland.total === 2,"expected Ireland total cuids to be 2");
  assert.ok(ret.Ireland.cuids, "expect Ireland have cuids");
  assert.ok(ret.Ireland.cuids.cuid1 === 1, "expect Ireland cuids to have cuid1");
  assert.ok(ret.Ireland.cuids.cuid3 === 1, "expect Ireland cuids to have cuid3");
  assert.ok(ret.Germany.total === 2, "expect Germany total to be 1");
  assert.ok(ret.Germany.cuids, "expect Germany have cuids");
  assert.ok(ret.Germany.cuids.cuid2 === 1, "expect Germany cuids to have cuid2");
  assert.ok(ret.Germany.cuids.cuid4 === 1, "expect Germany cuids to have cuid4");
  test.finish();
};