var helper = require('./test_helper.js'),
    fhsrv = require("../../lib/fhsrv.js");

var config;
var logger;
var msgServer;

var msgs1 = [
  {"appid": "allowme", 'X': 'Y'},
  {"appid": "allowme", 'A': 'B'}
];
var msgs2 = [
  {"appid": "allowme", 'a': 'a1111'},
  {"appid": "allowme", 'a': 'a0'},
  {"appid": "allowme", 'a': 'a00000'}
];

var id0, id1;
var ignoreAPIKey = false;
var sendValidHeader = true;

exports.initialize = function (test, assert) {

   helper.init( function(err,conf) {
    config = conf;
    logger = require('fh-logger').createLogger({name: 'test_fhsrv'});
    logger.debug('initialize');

    config.messaging.ignoreAPIKey = false;
    config.messaging.msgAPIKey = "mysecrettestapikey";
    config.messaging.whitelist.log = true;
    config.messaging.whitelist.logallowed = true;
    config.messaging.apiKeyExceptionTopics = ['logallowed'];
     config.agenda.enabled = false;
    
    test.finish();
  }); 
};

exports.finalize = function (test, assert) {
  logger.info('finalize');
  test.finish();
};

exports.setUp = function (test, assert) {
  logger.info('setUp');
  config.database.name = "test_fhsrv";
  testData = {"log_19700101": {
    index: 'MD5',
    data: [
      {
        "appid": "allowme",
        'a': 'a0',
        MD5: 'a2b2ced207e7f8b4c5137b9d938fc0b2_19700101'},
      {
        "appid": "allowme",
        'a': 'a1',
        MD5: '2abe0ed38194d9792628cc1081ff436c_19700101'}
    ]}};
  helper.testDataSetUp(config.database, testData, function (err, data, db) {
    if (err) {
      logger.error(err);
    }
    assert.ok(!err);
    logger.info({data: data});
    id0 = data[0][0].MD5;
    id1 = data[0][1].MD5;
    test.finish();
  });
};

exports.tearDown = function (test, assert) {
  logger.info('tearDown');
  msgServer.messaging.tearDown(function() {
    helper.testDataTearDown(config.database, function (err, data) {
      if (err) {
        logger.error(err);
      }
      assert.ok(!err);
      test.finish();
    });
  });
};

//######################## VALID TESTS BEGIN ########################

exports.test_fhsrv_sys_info_ping = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger.child({test: 'sys_info_ping'}), function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/sys/info/ping'
    }, {
      body: '"OK"',
      status: 200
    }, function (res) {
      test.finish();
    });
  });
};

exports.test_fhsrv_sys_info_version = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/sys/info/version',
      headers: helper.setDefaultHeaders(sendValidHeader, {})
    }, {
      status: 200
    }, function (res) {
      assert.notEqual(res.body, null);
      test.finish();
    });
  });
};

exports.test_fhsrv_sys_info_stats = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/sys/info/stats',
      headers: helper.setDefaultHeaders(sendValidHeader, {})
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /sys/info/stats, but got: " + res.statusCode);
      assert.notEqual(JSON.parse(res.body), null);
      test.finish();
    });
  });
};

exports.test_fhsrv_sys_info_status = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/sys/info/status',
      headers: helper.setDefaultHeaders(sendValidHeader, {})
    }, {
      status: 200
    }, function (res) {
      assert.notEqual(res.body, null);
      test.finish();
    });
  });
};

exports.test_fhsrv_no_endpoint = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/'
    }, function (res) {
      assert.strictEqual(res.statusCode, 503);
      assert.ok(res.body.indexOf("No end point") != -1);
      test.finish();
    });
  })
};

exports.test_fhsrv_get_msgs_by_topic = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/msg/log_19700101',
      headers: helper.setDefaultHeaders(sendValidHeader, {})
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/log_19700101, but got: " + res.statusCode);
      var msgs = JSON.parse(res.body);
      assert.equal(msgs.length, 2);
      assert.equal(msgs[0].a, 'a0');
      assert.equal(msgs[0].MD5, id0);
      assert.equal(msgs[1].MD5, id1);
      test.finish();
    });
  });
};

exports.test_fhsrv_get_msg_by_id = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/msg/log/' + id0,
      headers: helper.setDefaultHeaders(sendValidHeader, {})
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/[id0], but got: " + res.statusCode);
      var msg = JSON.parse(res.body);
      assert.equal(msg.a, 'a0');
      test.finish();
    });
  });
};

exports.test_fhsrv_get_msgs_by_topic_with_query = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/msg/log_19700101?MD5=' + id0 + "&a=a0",
      headers: helper.setDefaultHeaders(sendValidHeader, {})
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/log_19700101?MD5-..., but got: " + res.statusCode);
      var msgs = JSON.parse(res.body);
      assert.ok(msgs.length > 0, "Expected array with at least one element, but got: " + JSON.stringify(msgs));
      assert.ok(msgs[0].a, "Expected array element containing a field called \"a\", but got: " + JSON.stringify(msgs));
      assert.strictEqual(msgs[0].a, 'a0');
      test.finish();
    });
  });
};

exports.test_fhsrv_get_msg_by_invalid_id = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/msg/log/000000000000',
      headers: helper.setDefaultHeaders(sendValidHeader, {})
    }, function (res) {
      assert.strictEqual(res.statusCode, 404, "Expected 404 but was " + res.statusCode + ", body >>" + res.body + "<<");
      test.finish();
    });
  });
};

exports.test_fhsrv_post_msg = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/msg/log',
      method: 'POST',
      data: '{"appid": "allowme", "a":"b"}',
      headers: helper.setDefaultHeaders(sendValidHeader, {})
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/log, but got: " + res.statusCode);
      var msgs = JSON.parse(res.body);
      //response is ended asap so should only have a simple message in the body
      assert.equal(msgs.message,"accepted messages");
      test.finish();
    });
  });
};

exports.test_fhsrv_post_multiple_msgs = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/msg/log',
      method: 'POST',
      data: JSON.stringify(msgs1),
      headers: helper.setDefaultHeaders(sendValidHeader, {})
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/log (second), but got: " + res.statusCode);
      var msgs = JSON.parse(res.body);
      //response is ended asap so should only have a simple message in the body
      assert.equal(msgs.message,"accepted messages");
      test.finish();
    });
  });
};

exports.test_fhsrv_get_msg_topics = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);
    var headers = helper.setDefaultHeaders(sendValidHeader, {});
    assert.response(msgServer.server, {
      url: '/msg',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/, but got: " + res.statusCode);
      var bdy = JSON.parse(res.body);
      assert.strictEqual(bdy.length, 1, "Expected 1 item but have " + bdy.length + ", " + JSON.stringify(bdy));
      assert.strictEqual(bdy[0], "log_19700101");
      test.finish();
    });
  });
};

exports.test_fhsrv_post_multiple_msgs_with_duplicates = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);
    var headers = helper.setDefaultHeaders(sendValidHeader, {});
    // Test logging same message twice along with a bunch of new
    // messages
    // A message thats already logged should not halt the logging of
    // other messages..
    assert.response(msgServer.server, {
      url: '/msg/log',
      method: 'POST',
      data: JSON.stringify(msgs2),
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/log (third), but got: " + res.statusCode);
      var msgs = JSON.parse(res.body);
      assert.equal(msgs.message,"accepted messages");
      test.finish();
    });
  });
};

exports.test_fhsrv_post_existing_msg = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    var headers = helper.setDefaultHeaders(sendValidHeader, {});
    // Test logging just one message that already exists
    assert.response(msgServer.server, {
      url: '/msg/log',
      method: 'POST',
      data: '{"appid": "allowme", "a":"a0"}',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/log (fourth), but got: " + res.statusCode);
      var msgs = JSON.parse(res.body);
      assert.equal(msgs.message,"accepted messages");
      test.finish();
    });
  });
};


exports.test_fhsrv_post_msg_api_key_check_excluded = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);
    // Test logging one message with no apikey to a topic that's excluded from the api key check
    var headers = helper.setDefaultHeaders(false, {});
    assert.response(msgServer.server, {
      url: '/msg/logallowed',
      method: 'POST',
      data: '{"appid": "allowme", "a":"a0"}',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/log (fourth), but got: " + res.statusCode);
      var msgs = JSON.parse(res.body);
      assert.equal(msgs.message,"accepted messages");
      test.finish();
    });
  });
};


exports.test_fhsrv_head_msg_exists_api = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);
    var headers = helper.setDefaultHeaders(sendValidHeader, {});
    // Test message exists API
    assert.response(msgServer.server, {
      url: '/msg/log/a2b2ced207e7f8b4c5137b9d938fc0b2_19700101?_method=head',
      method: 'HEAD',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/log/c1a3c00f03..., but got: " + res.statusCode);
      test.finish();
    });
  });
};

exports.test_fhsrv_head_msg_exists_api_use_head = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);
    var headers = helper.setDefaultHeaders(sendValidHeader, {});
    // Test message exists API using the connect.head method
    assert.response(msgServer.server, {
      url: '/msg/log/a2b2ced207e7f8b4c5137b9d938fc0b2_19700101',
      method: 'HEAD',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/log/c1a3c00f03..., but got: " + res.statusCode);
      test.finish();
    });
  });
};


exports.test_fhsrv_head_msg_doesnt_exist_api = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);
    var headers = helper.setDefaultHeaders(sendValidHeader, {});
    // Test message doesnt exists API
    assert.response(msgServer.server, {
      url: '/msg/log/abc123?_method=head',
      method: 'HEAD',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 404, "T11: expected statuscode 404 from /msg/log/abc123?_method=head..., but got: " + res.statusCode + "res.body: " + res.body);
      test.finish();
    });
  });
};

exports.test_fhsrv_head_msgs_all_exist = function (test, assert) {
  test.skip();
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);
    // Test all messages exist
    var headers = helper.setDefaultHeaders(sendValidHeader, {});
    assert.response(msgServer.server, {
      url: '/msg/log/a2b2ced207e7f8b4c5137b9d938fc0b2_19700101;2abe0ed38194d9792628cc1081ff436c_19700101?_method=head',
      method: 'HEAD',
      headers: headers
    }, function (res) {
      console.log("res = " + res.body);
      assert.strictEqual(res.statusCode, 200, "expected statuscode 200 from /msg/log/c1a3c00f03... (second), but got: " + res.statusCode);
      test.finish();
    });
  });
};


exports.test_fhsrv_head_msgs_some_exist = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    var headers = helper.setDefaultHeaders(sendValidHeader, {});
    // Test where one exists, one doesn't, should return false
    assert.response(msgServer.server, {
      url: '/msg/log/a2b2ced207e7f8b4c5137b9d938fc0b2_19700101;abc123?_method=head',
      method: 'HEAD',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 404, "T13: expected statuscode 404 from /msg/log/a2b2ced207e7f8b4c5137b9d938fc0b2_19700101;abc123?_method=head, but got: " + res.statusCode);
      test.finish();
    });
  });
};

//######################## VALID TESTS END ########################

//######################## INVALID TESTS BEGIN ########################

exports.test_fhsrv_invalid_no_endpoint = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.response(msgServer.server, {
      url: '/',
      headers: {}
    }, function (res) {
      assert.strictEqual(res.statusCode, 503);
      assert.ok(res.body.indexOf("No end point") > -1);
      test.finish();
    });
  });
};

exports.test_fhsrv_invalid_get_topic = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    var headers = {};
    assert.response(msgServer.server, {
      url: '/msg/log_19700101',
      headers: headers,
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "expected statuscode 403 from /msg/log_19700101, but got: " + res.statusCode);
      test.finish();
    });
  });
};
exports.test_fhsrv_invalid_get_msg_by_id = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    var headers = {};
    assert.response(msgServer.server, {
      url: '/msg/log/' + id0,
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "expected statuscode 403 from /msg/[id0], but got: " + res.statusCode);
      test.finish();
    });
  });
};

exports.test_fhsrv_invalid_get_topic_by_id_with_query = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    var headers = {};
    assert.response(msgServer.server, {
      url: '/msg/log_19700101?MD5=' + id0 + "&a=a0",
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "expected statuscode 403 from /msg/log_19700101?MD5-..., but got: " + res.statusCode);
      test.finish();
    });
  });
};

exports.test_fhsrv_invalid_get_topic_by_id = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    var headers = {};
    assert.response(msgServer.server, {
      url: '/msg/log/000000000000',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "Expected 403 but was " + res.statusCode + ", body >>" + res.body + "<<");
      test.finish();
    });
  });
};

exports.test_fhsrv_invalid_post_msg = function (test, assert) {
  test.skip();
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    // TODO - test /msg/log/123 (throws expception currently!)
    var headers = {
      'Content-Type': 'application/json'
    };
    assert.response(msgServer.server, {
      url: '/msg/log',
      method: 'POST',
      json: {appid: "allowme", a: "b"},
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "expected statuscode 403 from /msg/log, but got: " + res.statusCode);
      test.finish();
    });
  });
};

exports.test_fhsrv_invalid_post_msgs = function (test, assert) {
  test.skip();
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    var headers = {
      'Content-Type': 'application/json'
    };
    assert.response(msgServer.server, {
      url: '/msg/log',
      method: 'POST',
      data: JSON.stringify(msgs1),
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "expected statuscode 403 from /msg/log (second), but got: " + res.statusCode);
      test.finish();
    });
  });
};

exports.test_fhsrv_invalid_get_topics = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);

    assert.response(msgServer.server, {
      url: '/msg',
      headers: {}
    }, function (res) {
      console.log("res = " + res.body);
      assert.strictEqual(res.statusCode, 403, "expected statuscode 403 from /msg/, but got: " + res.statusCode);
      test.finish();
    });
  });
};

// Test logging same message twice along with a bunch of new
// messages
// A message thats already logged should not halt the logging of
// other messages..
exports.test_fhsrv_invalid_post_msg_twice = function (test, assert) {
  test.skip();
  var headers = {
    'Content-Type': 'application/json'
  };
  console.log("header :: " + JSON.stringify(helper.setDefaultHeaders(true, {})));
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);
    assert.response(msgServer.server, {
      url: '/msg/log',
      method: 'POST',
      data: JSON.stringify(msgs2),
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "expected statuscode 403 from /msg/log (third), but got: " + res.statusCode);
      test.finish();
    });
  });
};

// Test logging just one message that already exist
exports.test_fhsrv_invalid_post_msg_already_exists = function (test, assert) {
  test.skip();
  var headers = {
    'Content-Type': 'application/json'
  };
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.equal(err, null);
    assert.response(msgServer.server, {
      url: '/msg/log',
      method: 'POST',
      data: '{"appid": "allowme", "a":"a0"}',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "expected statuscode 403 from /msg/log (fourth), but got: " + res.statusCode);
      test.finish();
    });
  });
};


// Test message exists API
exports.test_fhsrv_invalid_head_msg_exists_api = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    var headers = {};
    assert.response(msgServer.server, {
      url: '/msg/log/a2b2ced207e7f8b4c5137b9d938fc0b2_19700101?_method=head',
      method: 'HEAD',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "expected statuscode 403 from /msg/log/c1a3c00f03..., but got: " + res.statusCode);
      test.finish();
    });
  });
};

// Test message doesnt exists API
exports.test_fhsrv_invalid_head_msg_doesnt_exist_api = function (test, assert) {
  test.skip();
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    var headers = {};
    assert.response(msgServer.server, {
      url: '/msg/log/abc123?_method=head',
      method: 'HEAD',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "T11: expected statuscode 403 from /msg/log/abc123?_method=head..., but got: " + res.statusCode + "res.body: " + util.inspect(res.body));
      test.finish();
    });
  });
};

// Test all messages exist
exports.test_fhsrv_invalid_head_msg_all_exist = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    var headers = {};
    assert.response(msgServer.server, {
      url: '/msg/log/a2b2ced207e7f8b4c5137b9d938fc0b2_19700101;2abe0ed38194d9792628cc1081ff436c_19700101?_method=head',
      method: 'HEAD',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "expected statuscode 403 from /msg/log/c1a3c00f03... (second), but got: " + res.statusCode);
      test.finish();
    });
  });
};

// Test where one exists, one doesn't, should return false
exports.test_fhsrv_invalid_head_msg_one_exists_one_doesnt = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    var headers = {};
    assert.response(msgServer.server, {
      url: '/msg/log/a2b2ced207e7f8b4c5137b9d938fc0b2_19700101;abc123?_method=head',
      method: 'HEAD',
      headers: headers
    }, function (res) {
      assert.strictEqual(res.statusCode, 403, "T13: expected statuscode 403 from /msg/log/a2b2ced207e7f8b4c5137b9d938fc0b2_19700101;abc123?_method=head, but got: " + res.statusCode);
      test.finish();
    });
  });
};

//######################## INVALID TESTS END ########################

// Test that posting rolled-up metrics for domain will lead into creating 2 records in collection
exports.test_metrics_rollup = function (test, assert) {
  msgServer = new fhsrv.MessageServer(config, logger, function (err) {
    assert.response(msgServer.server, {
      url: '/rollup/receive/domain',
      method: 'POST',
      data: JSON.stringify({ from: 1445536860575, to: 1445580170149, some: 'payload' }),
      headers: helper.setDefaultHeaders(sendValidHeader, {})
    }, function (res) {
      assert.equal( res.statusCode, 202 );
      test.finish();
    });
  });
};