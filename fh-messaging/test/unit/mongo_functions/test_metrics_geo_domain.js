
exports.test_metrics_geo_domain_mongo = function (test,assert){
    var ts = new Date().getTime();
    var emit = function (data,obj){
        console.log(data,obj);
        assert.ok(data.domain == "testing","expected domain to be set");
        assert.ok(data.ts === ts,"expected timestamp to match");
        assert.ok(obj.ireland === 1);

    };
    var undertest = require('../../../lib/mongo_functions/metrics_geo_domain');
    undertest.setVars(ts,emit);
    var scope = {"appid":"testapp","domain":"testing","country":{"country_name":"ireland"}};
    undertest.metrics_geo_domain.call(scope);
    test.finish()
};
