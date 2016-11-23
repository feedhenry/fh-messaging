var helper = require('./test_helper.js'),
        fhfm = require('../../lib/fh_filter_man.js'),
        _ = require('underscore');

var config;
var logger;
var filterMan;

exports.initialize = function (test, assert) {
   helper.init( function(err,conf) {
    config = conf;
    logger = require('fh-logger').createLogger({name: 'test_fh_filter_man'});
    logger.info('initialize');

    test.finish();
  }); 
};

exports.finalize = function (test, assert) {
  logger.info('finalize');
  test.finish();
};

exports.test_extractIP = function (test, assert) {
  var privateIPs = [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "5.5.5.5/32"
  ];
  fhfm.buildNetMasks(privateIPs);

  var ips = [
    {
      input: '1.1.1.1',
      expected: '1.1.1.1'
    },
    {
      input: ' 2.2.2.2 ',
      expected: '2.2.2.2'
    },
    {
      input: '10.2.1.3, 3.3.3.3',
      expected: '3.3.3.3'
    },
    {
      input: 'undefined, 4.4.4.4',
      expected: '4.4.4.4'
    },
    {
      input: 'undefined, hello',
      expected: '127.0.0.1'
    },
    {
      input: '',
      expected: '127.0.0.1'
    },
    {
      input: '4.4.4.4, undefined',
      expected: '4.4.4.4'
    },
    {
      input: '3.3.3.3, 10.2.1.3',
      expected: '3.3.3.3'
    },
    {
      input: "91.123.227.33                          ,172.31.0.1",
      expected: '91.123.227.33'
    },
    {
      input: '4.4.4.4, undefined, 192.168.1.1',
      expected: '4.4.4.4'
    },
    {
      input: ',4.4.4.4, u,ndefined,, ,192.168.1.1',
      expected: '4.4.4.4'
    },
    {
      input: "91.123.227.33       ,192.168.1.1                   ,172.31.0.1",
      expected: '91.123.227.33'
    },
    {
      input: "91.123.227.33       ,5.5.5.5                  ,172.31.0.1",
      expected: '91.123.227.33'
    }
  ];

  var expectedIP;
  var inputIP;
  var actualIP;
  var i;
  for (i = 0; i < ips.length; i += 1) {
    inputIP = ips[i].input;
    expectedIP = ips[i].expected;
    actualIP = fhfm.getLastValidIP(inputIP, privateIPs);
    assert.strictEqual(actualIP, expectedIP, "Expected IP: " + expectedIP + ", actual: " + actualIP + ", input[" + i + "]: \"" + inputIP + "\"");
  }
  test.finish();
}

exports.test_geoip_filter = function (test, assert) {
  config.filters.Geoip =  {
    "fields": ["ipAddress", "ip"]
  }

  filterMan = new fhfm.FilterManager(config, logger);

  var msgs = [
    {MD5: 'helloWorld', ipAddress: "8.8.8.8"},
    {                   ipAddress: "unknown, 93.186.30.241"},
    {MD5: 'helloWorl2', ipAddress: "178.167.254.108"},
    {                   ipAddress: "93.186.30.116"},
    {                   ipAddress: "173.252.137.90"}
  ];

  filterMan.filterAsync(msgs, function (err, filteredMsgs) {

    console.log(JSON.stringify(filteredMsgs[1]));
    assert.ifError(err);

    assert.strictEqual(filteredMsgs[0].MD5, 'helloWorld', "message with existing key has been modified");
    assert.ok(filteredMsgs[1].MD5, "message should have had a key added by the filter");
    assert.strictEqual(filteredMsgs[2].MD5, 'helloWorl2', "message with existing key has been modified");
    assert.ok(filteredMsgs[3].MD5, "message should have had a key added by the filter");
    assert.ok(filteredMsgs[4].MD5, "message should have had a key added by the filter");

    assert.ok(filteredMsgs[0].country, "message should have had a country field added");
    assert.strictEqual(filteredMsgs[0].country.country_name, "United States");

    // ToDo why should this fail? Should it not just use the second ip to get the geo location?
    // assert.ok(!filteredMsgs[1].country, "message should not have had a country field added");

    assert.ok(filteredMsgs[2].country, "message should have had a country field added");
    assert.strictEqual(filteredMsgs[2].country.country_name, "Ireland");
    assert.ok(filteredMsgs[3].country, "message should have had a country field added");
    assert.strictEqual(filteredMsgs[3].country.country_name, "United Kingdom");
    assert.ok(filteredMsgs[4].country, "message should have had a country field added");
    assert.strictEqual(filteredMsgs[4].country.country_name, "United States");
    test.finish();
  });
}

exports.test_appfields_filter = function (test, assert) {
  config.filters.AppFields = {
    "12345": [
      {
        "version": "<=10",
        "field": "test_field",
        "value": "changed"
      }
    ]
  }

  filterMan = new fhfm.FilterManager(config, logger);

  var msgs = [
    {"msg": {"appid": "12345", "app_version": 1, "test_field": "notchanged"}, "fail_error": "this should be filtered"},
    {"msg": {"appid": "12345", "app_version": 10, "test_field": "notchanged"}, "fail_error": "this should be filtered"},
    {"msg": {"appid": "12345", "app_version": 11, "test_field": "notchanged"}, "fail_error": "this should not be filtered"},
    {"msg": {"appid": "123456", "app_version": 10, "test_field": "notchanged"}, "fail_error": "this should not be filtered different app"},
    {"msg": {"appid": "12345", "app_version": 1}, "fail_error": "this should not be filtered no test_field to change"},
    {"msg": {"appid": "12345", "app_version": "-", "test_field": "notchanged"}, "fail_error": "this should not be filtered invalid app_version"},
    {"msg": {"app_version": 1, "test_field": "notchanged"}, "fail_error": "this should not be filtered no appid"},
    {"msg": {"appid": "12345", "test_field": "notchanged"}, "fail_error": "this should not be filtered no app_version"}
  ];

  filterMan.filterAsync(_.pluck(msgs, "msg"), function (err, filteredMsgs) {
    assert.ifError(err);
    assert.strictEqual(filteredMsgs[0].test_field, "changed", msgs[0].fail_error);
    assert.strictEqual(filteredMsgs[1].test_field, "changed", msgs[1].fail_error);
    assert.strictEqual(filteredMsgs[2].test_field, "notchanged", msgs[2].fail_error);
    assert.strictEqual(filteredMsgs[3].test_field, "notchanged", msgs[3].fail_error);
    assert.strictEqual(filteredMsgs[4].test_field, undefined, msgs[4].fail_error);
    assert.strictEqual(filteredMsgs[5].test_field, "notchanged", msgs[5].fail_error);
    assert.strictEqual(filteredMsgs[6].test_field, "notchanged", msgs[5].fail_error);
    assert.strictEqual(filteredMsgs[7].test_field, "notchanged", msgs[5].fail_error);
    test.finish();
  });
}

exports.test_destinations_filter = function (test, assert) {
  config.filters.Destinations = {
    "validDestinations": ["android", "embed", "iphone", "mobile", "studio", "web", "ipad", "other", "ios", "blackberry", "windowsphone7", "wp7", "nokiawrt", "fhc"],
    "categoryForOthers": "other"
  }

  filterMan = new fhfm.FilterManager(config, logger);
  var msgs = [
    {"msg": {"appid": "12345", "destination": "iphone"}, "failed_error": "destination should not be changed"},
    {"msg": {"appid": "12345", "destination": "ipad"}, "failed_error": "destination should not be changed"},
    {"msg": {"appid": "12345", "destination": "android"}, "failed_error": "destination should not be changed"},
    {"msg": {"appid": "12345", "destination": "studio"}, "failed_error": "destination should not be changed"},
    {"msg": {"appid": "12345", "destination": "this is not a valid destination"}, "failed_error": "destination should be changed"}
  ];
  var origin = msgs[4].msg.destination;
  filterMan.filterAsync(_.pluck(msgs, "msg"), function(err, filteredMsgs){
    assert.ifError(err);
    assert.strictEqual(filteredMsgs[0].destination, "iphone", msgs[0].failed_error);
    assert.strictEqual(filteredMsgs[1].destination, "ipad", msgs[1].failed_error);
    assert.strictEqual(filteredMsgs[2].destination, "android", msgs[2].failed_error);
    assert.strictEqual(filteredMsgs[3].destination, "studio", msgs[3].failed_error);
    assert.strictEqual(filteredMsgs[4].destination, config.filters.Destinations.categoryForOthers, msgs[4].failed_error);
    assert.strictEqual(filteredMsgs[4].original_destination, origin, msgs[4].failed_error);
    test.finish();
  });
}
