
exports.test_map_counter_per_domain_per_day_per_owner_per_country = function (test,assert){
    var ts = new Date().getTime();
    var emit = function (data,counter){
        console.log(data);
        assert.ok(data.domain == "testing","expected domain to be set");
        assert.ok(data.ts === ts,"expected timestamp to match");
        assert.ok(data.country === "ireland");
        assert.ok(data.owner === "Red Hat");
        //assert.ok(data.country === "ireland");
        assert.ok(counter == 1,"expected the counter to return 1");
    };
    var undertest = require('../../../lib/mongo_functions/counter_per_domain_per_day_per_owner_per_country');
    undertest.setVars(ts,emit);
    var scope = {"country":{"country_name":"ireland"},"domain":"testing","owner":"Red Hat"};
    undertest.map_counter_per_domain_per_day_per_owner_per_country.call(scope);
    test.finish()
};
