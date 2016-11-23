var helper = require('./test_helper.js'),
    helpers = require('../../lib/helpers.js'),
    _ = require('underscore'),
    async = require('async');
var fhconfig = require('fh-config');
var required = require('../../lib/requiredvalidation.js');
var path = require('path');


var config;
var logger;

var configFile = path.resolve(__dirname, '../../config/dev.json');
var config;

exports.initialize = function (callback) {
  fhconfig.init(configFile, required, function(err){
    if(err){
      console.error("Problems reading config file: " + configFile);
      console.error(err);
      throw err;
    }
        
    var conf = fhconfig.getConfig().rawConfig;

    return callback(null,conf);
  });
}

exports.test_findKey = function (test, assert) {
  var msgs = [
    {key: 'a', values: [
      {'testa': 1, 'MD5': 'TEST_MD5'},
      {'testa': 2, 'c': 3}
    ]},
    {key: 'b', values: [
      {'testb': 1, 'MD5': 'TEST_MD5'},
      {'testb': 2, 'c': 3}
    ]},
    {key: 'c', values: [
      {'testc': 1, 'MD5': 'TEST_MD5'},
      {'testc': 2, 'c': 3}
    ]}
  ];
  assert.strictEqual(helpers.findKey(msgs, 'a'), 0);
  assert.strictEqual(helpers.findKey(msgs, 'b'), 1);
  assert.strictEqual(helpers.findKey(msgs, 'c'), 2);
  assert.strictEqual(helpers.findKey(msgs, 'd'), -1);
  test.finish();
};

exports.test_toYYYYMMDD = function (test, assert) {
  assert.strictEqual(helpers.toYYYYMMDD(0), "19700101");
  assert.strictEqual(helpers.toYYYYMMDD(new Date(2011, 9, 20).getTime()), "20111020");
  // 1307914504819, // Sun, 12 Jun 2011 22: 56: 44 GMT
  assert.strictEqual(helpers.toYYYYMMDD(1307914504819), "20110612");
  test.finish();
};

exports.test_getDatePart = function (test, assert) {
  assert.strictEqual(helpers.getDatePart({nodate: 'specified'}), "19700101");
  assert.strictEqual(helpers.getDatePart({_ts: 0}), "19700101");
  // 1307914504819, // Sun, 12 Jun 2011 22: 56: 44 GMT
  assert.strictEqual(helpers.getDatePart({_ts: 1307914504819}), "20110612");
  test.finish();
};

exports.test_groupMsgsByDay = function (test, assert) {
  var msgs = [
    {'_ts': 1, debug: 'day1'},  // 19700101
    {'_ts': (1307914500019 + 86400000), debug: 'day3'},  // 20110613
    {debug: 'day1'},  // 19700101
    {'_ts': 1307914504819, debug: 'day2'}, // 20110612
    {'_ts': 1307914500000, debug: 'day2'}, // 20110612
    {'_ts': (1307914504819 + 86400000), debug: 'day3'},  // 20110613
    {'_ts': 1, debug: 'day1'},  // 19700101
    {'_ts': 1307914500019, debug: 'day2'}, // 20110612
    {'_ts': 0, debug: 'day1'},  // 19700101
    {'_ts': (1307914500000 + 86400000), debug: 'day3'}  // 20110613
  ];

  msgsByDay = helpers.groupMsgsByDay(msgs);
  assert.strictEqual(msgsByDay.length, 3);
  var i, len;
  var j, jlen;

  for (i = 0, len = msgsByDay.length; i < len; i += 1) {
    var row = msgsByDay[i];
    if (row.key === '19700101') {
      assert.strictEqual(row.values.length, 4);
      for (j = 0, jlen = row.values.length; j < jlen; j += 1) {
        assert.strictEqual(row.values[j].debug, 'day1');
      }
    } else if (row.key === '20110612') {
      assert.strictEqual(row.values.length, 3);
      for (j = 0, jlen = row.values.length; j < jlen; j += 1) {
        assert.strictEqual(row.values[j].debug, 'day2');
      }
    } else if (row.key === '20110613') {
      assert.strictEqual(row.values.length, 3);
      for (j = 0, jlen = row.values.length; j < jlen; j += 1) {
        assert.strictEqual(row.values[j].debug, 'day3');
      }
    } else {
      assert.ok(0 === 1, "Invalid date in list");
    }
  }
  test.finish();
};


exports.test_getCollectionNameFromTopicAndId = function (test, assert) {
  assert.strictEqual(helpers.getCollectionNameFromTopicAndId("topic", "12345_20111115"), "topic_20111115");
  assert.strictEqual(helpers.getCollectionNameFromTopicAndId("topic", "12345_"), "topic_19700101");
  assert.strictEqual(helpers.getCollectionNameFromTopicAndId("topic", "12345"), "topic_19700101");
  assert.strictEqual(helpers.getCollectionNameFromTopicAndId("topic", ""), "topic_19700101");
  assert.strictEqual(helpers.getCollectionNameFromTopicAndId("topic", "20111115"), "topic_19700101");
  test.finish();
};

exports.test_isWhiteListed_with_domain = function (test, assert) {
  var whitelist = {
    "appinit": {
      "appid": ["app1", "app2", "app3"],
      "domain": ["d1", "dom2"]
    }
  };

  async.series([
    function (testCallback) {
      helpers.isWhiteListed(whitelist, "appinit", {appid: "app1"}, function (answer) {
        assert.strictEqual(answer, true);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist, "appinit", {appid: "app6"}, function (answer) {
        assert.strictEqual(answer, false);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist, "hello", {appid: "app1"}, function (answer) {
        assert.strictEqual(answer, false);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist, "hello", {appid: "app1"}, function (answer) {
        assert.strictEqual(answer, false);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist, "appinit", {appid: "app5", domain: "dom2"}, function (answer) {
        assert.strictEqual(answer, true);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist, "appinit", {appid: "app5", domain: "dom3"}, function (answer) {
        assert.strictEqual(answer, false);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist, "appinit", {appid: "app1", domain: "dom3"}, function (answer) {
        assert.strictEqual(answer, true);
        testCallback();
      });
    }
  ], function (err, res) {
    test.finish();
  });
}

exports.test_isWhiteListed_no_domain = function (test, assert) {
  var whitelist_nodomain = {
    "appinit": {
      "appid": ["app1", "app2", "app3"],
      "domain": []
    }
  };
  async.series([
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "appinit", {appid: "app1"}, function (answer) {
        assert.strictEqual(answer, true);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "appinit", {appid: "app6"}, function (answer) {
        assert.strictEqual(answer, false);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "hello", {appid: "app1"}, function (answer) {
        assert.strictEqual(answer, false);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "hello", {appid: "app1"}, function (answer) {
        assert.strictEqual(answer, false);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "appinit", {appid: "app5", domain: "dom2"}, function (answer) {
        assert.strictEqual(answer, false);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "appinit", {appid: "app5", domain: "dom3"}, function (answer) {
        assert.strictEqual(answer, false);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "appinit", {appid: "app1", domain: "dom3"}, function (answer) {
        assert.strictEqual(answer, true);
        testCallback();
      });
    }
  ], function (err, res) {
    test.finish();
  });
}

exports.test_isWhiteListed_no_domain_appinit = function (test, assert) {
  var whitelist_nodomain = {
    "appinit": true
  };

  async.series([
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "appinit", {appid: "app1"}, function (answer) {
        assert.strictEqual(answer, true);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "appinit", {appid: "app6"}, function (answer) {
        assert.strictEqual(answer, true);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "hello", {appid: "app1"}, function (answer) {
        assert.strictEqual(answer, false);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "hello", {appid: "app1"}, function (answer) {
        assert.strictEqual(answer, false);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "appinit", {appid: "app5", domain: "dom2"}, function (answer) {
        assert.strictEqual(answer, true);
        testCallback();
      });
    },
    function (testCallback) {

      helpers.isWhiteListed(whitelist_nodomain, "appinit", {appid: "app5", domain: "dom3"}, function (answer) {
        assert.strictEqual(answer, true);
        testCallback();
      });
    },
    function (testCallback) {
      helpers.isWhiteListed(whitelist_nodomain, "appinit", {appid: "app1", domain: "dom3"}, function (answer) {
        assert.strictEqual(answer, true);
        testCallback();
      });
    }
  ], function (err, res) {
    test.finish();
  });
}
