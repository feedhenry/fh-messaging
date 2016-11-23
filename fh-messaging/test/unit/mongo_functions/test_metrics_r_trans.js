exports.test_metrics_r_trans_mongo = function (test,assert){
    var undertest = require('../../../lib/mongo_functions/metrics_r_trans');
    var val = [{"ireland":1},{"russia":1}];
    var key = {domain: "testing", ts: new Date().getTime()}
    var ret = undertest.metrics_r_trans(key,val);
    assert.ok(ret, "expected a return value");
    assert.ok(ret.ireland === 1,"expected ireland to have a count of 1");
    assert.ok(ret.russia === 1 , "expected  total to have a count of 1");
    test.finish()
};
