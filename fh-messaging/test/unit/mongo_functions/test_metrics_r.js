
//when testing the reduce function we have to supply an array of metrics as would be produced by one of the map functions
exports.test_metrics_r_mongo = function (test,assert){
    var undertest = require('../../../lib/mongo_functions/metrics_r');
    var key = {domain: "testing", ts: new Date().getTime()} 
    var val = [{ "Ireland" : 13},{ "Ireland" : 13 }];
    var ret = undertest.metrics_r(key,val);
    assert.ok(ret, "expected a return value");
    assert.equal(ret.Ireland , 26,"expected ireland to have a count of 26");
    assert.equal(ret.total , 26 , "expected  total to have a count of 26");
    test.finish()
};
