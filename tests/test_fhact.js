var helper = require('./test_helper.js');
var request = require("request");

exports.dependencies = ["fh-messaging", "fh-metrics"];

exports.initialize = function (test, assert) {
  console.log('initialize');
  helper.cleanUp(function () {
    test.finish();
  });
};

exports.finalize = function (test, assert) {
  console.log('finalize');
  test.finish();
};

var firstMD5;
var testDateStr = '20130530';
var expectedMetricTimestamp = helper.utcTimestampForDateStr(testDateStr);

console.log('test_fhact test data  :: testDate : ' + testDateStr + ' : queryParams : ' + JSON.stringify(helper.queryParamsForDateStr(testDateStr)) + ' : ' + expectedMetricTimestamp);

exports.test_fhact_post_message = function (test, assert) {
  console.log('test_fhact_post_message');
  var url = helper.getMessagingUrl('msg/fhact');
  var headers = helper.setHeader(false, {});
  var msg = helper.generateMessage({"bytes": 50,
    "cached": false,
    "cuid": "D6AF9907342F40CB81101846D1C075E7",
    "destination": "studio",
    "function": "getConfig",
    "guid": "oWec1cT87gwxslT6U7CM9oE0",
    "status": -1,
    "time": 532});

  request.post({
    url: url,
    headers: headers,
    body: JSON.stringify(msg)
  }, function (err, res, bod) {
    console.log(err, bod);
    assert.equal(res.statusCode, 200);
    assert.isDefined(bod);
    var msgs = JSON.parse(res.body);
    assert.notEqual(msgs.newMessages, null);
    firstMD5 = msgs.newMessages[0]
    test.finish();
  });
};

exports.test_fhact_get_message = function (test, assert) {
  console.log('test_fhact_get_message');
  var url = helper.getMessagingUrl('msg/fhact_' + testDateStr);
  var headers = helper.setHeader(false, {});

  request.get({
    url: url,
    headers: headers
  }, function (err, res, bod) {
    console.log(err, bod);
    assert.equal(res.statusCode, 200);
    assert.isDefined(bod);
    var msgs = JSON.parse(res.body);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].MD5, firstMD5);
    test.finish();
  });
};

exports.test_fhact_daily_rollup = function (test, assert) {
  console.log('test_fhact_daily_rollup');
  var url = helper.getMessagingUrl('rollup/daily');
  var headers = helper.setHeader(false, {});
  var body = {"date": testDateStr};

  request.post({
    url: url,
    headers: headers,
    body: JSON.stringify(body)
  }, function (err, res, bod) {
    console.log(err, bod);
    assert.equal(res.statusCode, 200);
    assert.isDefined(bod);
    test.finish();
  });
};

exports.test_fhact_get_metric_apprequestsdest = function (test, assert) {
  console.log('test_fhact_get_metric_apprequestsdest');
  var url = helper.getMetricsUrl('metric/apprequestsdest');
  var headers = helper.setHeader(false, {});

  var body = {
    _id: '12345',
    from: helper.queryParamsForDateStr(testDateStr)
  };

  request.post({
    url: url,
    headers: headers,
    body: JSON.stringify(body)
  }, function (err, res, bod) {
    console.log(err, bod);
    assert.equal(res.statusCode, 200);
    assert.isDefined(bod);
    var results = JSON.parse(res.body);
    assert.equal(results.length, 1);
    var metric = JSON.parse(JSON.stringify(results[0]));
    assert.equal(JSON.stringify(metric._id), '{"appid":"12345","domain":"testing","ts":' + expectedMetricTimestamp + '}');
    assert.equal(JSON.stringify(metric.value), '{"studio":1}');
    test.finish();
  });
};

exports.test_fhact_get_metric_domainrequestsdest = function (test, assert) {
  console.log('test_fhact_get_metric_domainrequestsdest');
  var url = helper.getMetricsUrl('metric/domainrequestsdest');
  var headers = helper.setHeader(false, {});

  var body = {
    _id: 'testing',
    from: helper.queryParamsForDateStr(testDateStr)
  };

  request.post({
    url: url,
    headers: headers,
    body: JSON.stringify(body)
  }, function (err, res, bod) {
    console.log(err, bod);
    assert.equal(res.statusCode, 200);
    assert.isDefined(bod);
    var results = JSON.parse(res.body);
    assert.equal(results.length, 1);
    var metric = JSON.parse(JSON.stringify(results[0]));
    assert.equal(JSON.stringify(metric._id), '{"domain":"testing","ts":' + expectedMetricTimestamp + '}');
    assert.equal(JSON.stringify(metric.value), '{"studio":1}');
    test.finish();
  });
};