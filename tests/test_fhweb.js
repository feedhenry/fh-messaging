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

console.log('test_fhweb test data  :: testDate : ' + testDateStr + ' : queryParams : ' + JSON.stringify(helper.queryParamsForDateStr(testDateStr)) + ' : ' + expectedMetricTimestamp);

exports.test_fhweb_post_message = function (test, assert) {
  console.log('test_fhweb_post_message');
  var url = helper.getMessagingUrl('msg/fhweb');
  var headers = helper.setHeader(false, {});

  var msg = helper.generateMessage({
    "bytes": 171,
    "cached": false,
    "conns": 2,
    "errors": "",
    "referrer": "[http://testing.feedhenry.me/]",
    "source": "webproxy",
    "start": 1369914119993,
    "status": 200,
    "time": 231,
    "url": "https://www.googleapis.com/urlshortener/v1/url"
  });

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

exports.test_fhweb_get_message = function (test, assert) {
  console.log('test_fhweb_get_message');
  var url = helper.getMessagingUrl('msg/fhweb_' + testDateStr);
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

exports.test_fhweb_daily_rollup = function (test, assert) {
  console.log('test_fhweb_daily_rollup');
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

exports.test_fhweb_get_metric = function (test, assert) {
  console.log('test_fhweb_get_metric');
  test.skip('Unsure what metric this produces...');
};