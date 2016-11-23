exports.test_metrics_reduce_active_device = function(test, assert){
  var undertest = require('../../../lib/mongo_functions/metrics_r_active_device');
  var val = [{cuid1: {iphone:1}}, {cuid2: {android:1}}, {cuids: {cuid2:{android:1}, cuid3: {other:1}}, destinations:{android:1, other:1}, total: 2}];
  var key = {domain: "testing", ts: new Date().getTime()}
  var ret = undertest.metrics_r_active_device(key,val);
  assert.ok(ret, "expected a return value");
  assert.ok(ret.total === 3,"expected total cuids to be 3");
  assert.ok(ret.cuids, "ret to have cuids");
  assert.ok(ret.cuids.cuid1.iphone === 1, "expect cuids to have cuid1");
  assert.ok(ret.cuids.cuid2.android === 1, "expect cuids to have cuid2");
  assert.ok(ret.cuids.cuid3.other === 1, "expect cuids to have cuid3");
  assert.ok(ret.destinations.iphone === 1, "expect to have 1 iphone device");
  assert.ok(ret.destinations.android === 1, "expect to have 1 android device");
  assert.ok(ret.destinations.other === 1, "expect to have 1 other device");
  test.finish();
};