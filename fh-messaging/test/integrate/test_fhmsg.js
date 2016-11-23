var helper = require('./test_helper.js'),
    fhmsg = require("../../lib/fhmsg.js"),
    http = require('http'),
    async = require('async');

var config;
var logger;
var db;
var messageMan;

exports.initialize = function (test, assert) {

   helper.init( function(err,conf) {
    config = conf;
    logger = require('fh-logger').createLogger({name: 'test_fhmsg'});
    logger.info('initialize');

    test.finish();
  });
};

exports.finalize = function (test, assert) {
  logger.info('finalize');
  test.finish();
};

exports.setUp = function (test, assert) {
  logger.info('setUp');
  config.database.name = "test_fhmsg";
  helper.testDataSetUp(config.database, null, function (err, data, opendb) {
    if (err) {
      logger.error(err);
    }
    assert.ok(!err);
    db = opendb;
    test.finish();
  });
};

exports.tearDown = function (test, assert) {
  logger.info('tearDown');
  db.tearDown();
  messageMan.tearDown(function() {
    helper.testDataTearDown(config.database, function (err, data) {
      if (err) {
        logger.error(err);
      }
      assert.ok(!err);
      test.finish();
    });
  });
};

function containsCollectionName(collectionNames, collection) {
  var i, len;
  var found = false;
  var nameIncludingDatabase = config.database.name + '.' + collection;
  for (i = 0, len = collectionNames.length; (i < len) && !found; i += 1) {
    if (collectionNames[i].name === nameIncludingDatabase) {
      found = true;
    }
  }
  return found;
}

exports.test_geoip_EU_cities = function (test, assert) {
  var testTopic = "geoip";
  messageMan = new fhmsg.Messaging(config, logger);

  messageMan.database.on("tearUp", function () {
    messageMan.logMessage(testTopic, {a: 1, ipAddress: '193.1.184.10'}, function (err, objects) {
      assert.equal(err, null, JSON.stringify(err));

      messageMan.getMessages(testTopic + "_" + "19700101", {a: 1}, function (err, messages) {
        assert.isNull(err);
        assert.equal(1, messages.length);
        assert.equal(1, messages[0].a);
        assert.equal('193.1.184.10', messages[0].ipAddress);
        assert.isDefined(messages[0].country);
        assert.equal('EU', messages[0].country.continent_code);
        assert.equal('IE', messages[0].country.country_code);
        assert.equal('Ireland', messages[0].country.country_name);
        assert.equal('27', messages[0].country.region);
        assert.equal('Waterford', messages[0].country.city);
        test.finish();
      });
    });
  });
};


exports.test_geoip_US_region = function (test, assert) {
  var testTopic = "geoip";
  messageMan = new fhmsg.Messaging(config, logger);

  messageMan.database.on("tearUp", function () {
    messageMan.logMessage(testTopic, {a: 1, ipAddress: '8.8.8.8'}, function (err, objects) {
      assert.equal(err, null, JSON.stringify(err));

      messageMan.getMessages(testTopic + "_" + "19700101", {a: 1}, function (err, messages) {
        assert.isNull(err);
        assert.equal(1, messages.length);
        assert.equal(1, messages[0].a);
        assert.equal('8.8.8.8', messages[0].ipAddress);
        assert.isDefined(messages[0].country);
        assert.equal('NA', messages[0].country.continent_code);
        assert.equal('US', messages[0].country.country_code);
        assert.equal('United States', messages[0].country.country_name);
        assert.equal('CA', messages[0].country.region);
        assert.equal('Mountain View', messages[0].country.city);
        test.finish();
      });
    });
  });
};

exports.test_basic_message_log = function (test, assert) {
  var testTopic = "log";
  var TEST_MD5 = 'qwerty123456';

  messageMan = new fhmsg.Messaging(config, logger);

  messageMan.database.on("tearUp", function () {
    messageMan.countMessages(testTopic, function (err, count) {
      assert.equal(err, null);
      assert.equal(count, 0);
      messageMan.database.collectionNames(function (err, beginCollectionNames) {
        console.log('COLLECTION NAMES: ' + JSON.stringify(beginCollectionNames));
        assert.ok(!containsCollectionName(beginCollectionNames, testTopic)); // generic no-date version of collection should not exist ever
        assert.ok(!containsCollectionName(beginCollectionNames, testTopic + ""));// date version of collection should not exist yet
        assert.ok(!containsCollectionName(beginCollectionNames, testTopic + "")); // date version of collection should not exist yet
        messageMan.logMessage(testTopic, {'a': 1, 'b': 1}, function (err, objects) {
          assert.equal(err, null);
          var obj1MD5 = objects[0].MD5;
          messageMan.logMessage(testTopic, {'a': 1, 'b': 2, 'MD5': TEST_MD5}, function (err, objects) {
            assert.equal(err, null);
            assert.equal(objects[0].MD5, TEST_MD5);
            var obj2MD5 = objects[0].MD5;

            //For the sake of speed in converting this to whiskey im just using async.series, these should be split out into seperate tests
            async.series([
              function (testCallback) {
                messageMan.database.collectionNames(function (err, after2CollectionNames) {
                  console.log('COLLECTION NAMES: ' + JSON.stringify(after2CollectionNames));
                  assert.ok(!containsCollectionName(after2CollectionNames, testTopic)); // generic no-date version of collection should not exist ever
                  assert.ok(containsCollectionName(after2CollectionNames, testTopic + "_19700101"));// date version of collection should now exist

                  messageMan.countMessages(testTopic, function (err, count) {
                    assert.equal(err, null);
                    assert.equal(count, 0);

                    messageMan.countMessages(testTopic + "_19700101", function (err, count) {
                      assert.equal(err, null);
                      assert.equal(count, 2);

                      messageMan.getMessages(testTopic + "_19700101", {'b': 2}, function (err, messages) {
                        assert.equal(err, null);
                        assert.equal(messages.length, 1);
                        assert.equal(messages[0].b, 2);
                      });

                      // test getting by id
                      messageMan.getMessage(testTopic, obj2MD5, function (err, message) {
                        assert.equal(err, null);
                        assert.equal(message.b, 2);

                        // calling getMessage again should hit the cache this time..
                        messageMan.getMessage(testTopic, obj2MD5, function (err, message) {
                          assert.ok((err == null) || (JSON.stringify(err) === "{}"));
                          testCallback();
                        });
                      });
                    });
                  });
                });
              },
              function (testCallback) {
                // test getting a non-existent id
                messageMan.getMessage(testTopic, 'idontexist-md5', function (err, message) {
                  assert.equal(err, null);
                  assert.equal(message, null);
                  testCallback();
                });
              },
              function (testCallback) {
                // test message filtering.. single existing message
                messageMan.filterExistingMessages(testTopic, {'a': 1, 'b': 2, 'MD5': TEST_MD5}, function (err, existingMsgs, newMsgs) {
                  assert.equal(err, null);
                  assert.equal(existingMsgs.length, 1);
                  assert.equal(newMsgs.length, 0);
                  testCallback();
                });
              },
              function (testCallback) {
                // test message filtering.. multiple messages, one existing..
                messageMan.filterExistingMessages(testTopic, [
                  {'a': 1, 'b': 2, 'MD5': TEST_MD5},
                  {'ab': 'cd'}
                ], function (err, existingMsgs, newMsgs) {
                  assert.equal(err, null);
                  assert.equal(existingMsgs.length, 1);
                  assert.equal(newMsgs.length, 1);
                  assert.equal(newMsgs[0].ab, 'cd');
                  testCallback();
                });
              },
              function (testCallback) {
                // test hasAllMessages (where all messages exist).
                var ids = [obj1MD5, obj2MD5];
                messageMan.hasAllMessages(testTopic, ids, function (err, allExist) {
                  assert.equal(allExist, true);
                  testCallback();
                });
              },
              function (testCallback) {
                // test hasAllMessages (where some messages exist, should return false).
                var ids = [ obj1MD5, "abcd12345" ];
                messageMan.hasAllMessages(testTopic, ids, function (err, allExist) {
                  assert.equal(allExist, false);
                  testCallback();
                });
              },
              function (testCallback) {
                // test listing of topics.
                messageMan.getTopics(function (err, topics) {
                  assert.equal(topics.length, 1);
                  assert.equal(topics[0], testTopic + "_19700101");
                  testCallback();
                });
              },
              function (testCallback) {
                // test count messages on non-existent topic
                messageMan.countMessages("Idontexist", function (err, count) {
                  assert.equal(err, null);
                  assert.equal(count, 0);
                  testCallback();
                });
              },
              function (testCallback) {
                // test hasAllMessages (where no messages exist).
                var ids = [ "abcd1234", "abcd123245", "abcd1234567" ];
                messageMan.hasAllMessages(testTopic, ids, function (err, allExist) {
                  assert.equal(allExist, false);
                  testCallback();
                });
              }
            ], function (err, result) {
              test.finish();
            });
          });
        });
      });
    });
  });
};

exports.test_getMessage = function (test, assert) {
  var testTopic = "getMessageLog";
  var TEST_MD5 = 'qwerty123456';
  messageMan = new fhmsg.Messaging(config, logger);

  messageMan.database.on("tearUp", function () {
    messageMan.logMessage(testTopic, {'a': 1, 'b': 2, 'MD5': TEST_MD5}, function (err, objects) {
      assert.equal(err, null);
      assert.equal(objects[0].MD5, TEST_MD5);
      var obj2MD5 = objects[0].MD5;

      messageMan.getMessage(testTopic, obj2MD5, function (err, message) {
        assert.equal(err, null);
        assert.isDefined(message);
        assert.isDefined(message.b);
        assert.equal(message.b, 2);

        messageMan.getMessage(testTopic, obj2MD5, function (err, message) {
          assert.equal(err, null);
          test.finish();
        });
      });
    });
  });
};

exports.test_filterExistingMessages = function (test, assert) {
  var testTopic = "filterMessage";
  var TEST_MD5 = 'qwerty123456';
  var existingMsg = {'a': 1, 'b': 2, 'MD5': TEST_MD5};

  db.create(testTopic + "_19700101", [existingMsg], function (err, docs) {
    messageMan = new fhmsg.Messaging(config, logger);
    messageMan.database.on("tearUp", function () {
      async.series([
        function (testCallback) {
          // test message filtering.. single existing message
          messageMan.filterExistingMessages(testTopic, existingMsg, function (err, existingMsgs, newMsgs) {
            console.log('in test callback 1'); //   XXXXXXXXXXXXXXX
            assert.equal(err, null);
            assert.equal(existingMsgs.length, 1);
            assert.equal(newMsgs.length, 0);
            testCallback();
          });
        },
        function (testCallback) {
          // test message filtering.. multiple messages, one existing..
          messageMan.filterExistingMessages(testTopic, [existingMsg, {'ab': 'cd'}], function (err, existingMsgs, newMsgs) {
            console.log('in test callback 2'); //    XXXXXXXXXXXXXXXX
            assert.equal(err, null);
            assert.equal(existingMsgs.length, 1);
            assert.equal(newMsgs.length, 1);
            assert.equal(newMsgs[0].ab, 'cd');
            testCallback();
          });
        }
      ], function (err, res) {
        test.finish();
      });
    });
  });
}

exports.test_filterWhitelistExistingMessages = function (test, assert) {
  var testTopic = "testWhitelist";
  var TEST_MD5 = 'qwerty123456';
  var whiteListedExistingMsg = {'appid': "app1", 'a': 1, 'b': 2, 'MD5': TEST_MD5};
  var whiteListedNewMsg = {'appid': "app2", 'a': 27, 'b': 43};
  var notWhiteListedNewMsg = {'appid': "app5", 'a': 28, 'b': 44};
  var whiteListedNewMsg2 = {'appid': "app2", 'a': 29, 'b': 43};
  var notWhiteListedNewMsg2 = {'appid': "app5", 'a': 30, 'b': 44};
  db.create(testTopic + "_19700101", [whiteListedExistingMsg], function (err, docs) {
    messageMan = new fhmsg.Messaging(config, logger);

    messageMan.database.on("tearUp", function () {
      var mywhitelist = {};
      mywhitelist[testTopic] = {
        "appid": ["app1", "app2", "app3"],
        "domain": []
      };

      messageMan.loadFilterWhiteList(mywhitelist, function (err, whitelist) {
        assert.strictEqual(JSON.stringify(mywhitelist), JSON.stringify(whitelist), "white list should match but received: " + JSON.stringify(whitelist));
        async.series([
          function (testCallback) {
            // test message filtering.. single existing message
            messageMan.filterExistingMessages(testTopic, whiteListedExistingMsg, function (err, existingMsgs, newMsgs) {
              console.log('in test callback 1'); //   XXXXXXXXXXXXXXX
              assert.equal(err, null);
              assert.equal(existingMsgs.length, 1);
              assert.equal(newMsgs.length, 0);
              testCallback();
            });
          }, function (testCallback) {
            // test message filtering.. multiple messages, one existing..
            messageMan.filterExistingMessages(testTopic, [whiteListedExistingMsg, whiteListedNewMsg], function (err, existingMsgs, newMsgs) {
              console.log('in test callback 2'); //    XXXXXXXXXXXXXXXX
              assert.equal(err, null);
              assert.equal(existingMsgs.length, 1);
              assert.equal(newMsgs.length, 1);
              assert.equal(newMsgs[0].a, 27);
              testCallback();
            });
          }, function (testCallback) {
            // test message filtering.. multiple messages, one existing.., and one not whitelisted
            messageMan.filterExistingMessages(testTopic, [whiteListedExistingMsg, whiteListedNewMsg, notWhiteListedNewMsg, whiteListedNewMsg2, notWhiteListedNewMsg2], function (err, existingMsgs, newMsgs) {
              console.log('in test callback 3'); //    XXXXXXXXXXXXXXXX
              assert.equal(err, null);
              assert.equal(existingMsgs.length, 1, "should be 1 existing message, but got: " + JSON.stringify(existingMsgs));
              assert.equal(newMsgs.length, 2, "should be 2 new message, but got: " + JSON.stringify(newMsgs));
              assert.equal(newMsgs[0].a, 27);
              testCallback();
            });
          }
        ], function (err, res) {
          test.finish();
        });
      });
    });
  });
}

exports.test_WhitelistMessages = function (test, assert) {
  var testTopic = "testWhitelist2";
  var TEST_MD5 = 'qwerty123456';
  var whiteListedExistingMsg = {'appid': "app1", 'a': 1, 'b': 2, 'MD5': TEST_MD5};
  var whiteListedNewMsg = {'appid': "app2", 'a': 27, 'b': 43};
  var notWhiteListedNewMsg = {'appid': "app5", 'a': 28, 'b': 44};
  var whiteListedNewMsg2 = {'appid': "app2", 'a': 29, 'b': 43};
  var notWhiteListedNewMsg2 = {'appid': "app5", 'a': 30, 'b': 44};
  db.create(testTopic + "_19700101", [whiteListedExistingMsg], function (err, docs) {
    messageMan = new fhmsg.Messaging(config, logger);
    messageMan.database.on("tearUp", function () {
      var mywhitelist = {};
      mywhitelist[testTopic] = { appid: ["app1", "app2", "app3"], domain: [] };

      messageMan.loadFilterWhiteList(mywhitelist, function (err, whitelist) {
        assert.strictEqual(JSON.stringify(mywhitelist), JSON.stringify(whitelist), "white list should match but received: " + JSON.stringify(whitelist));
        async.series([
          function (testCallback) {
            // test message filtering.. single existing message
            messageMan.filterExistingMessages(testTopic, whiteListedExistingMsg, function (err, existingMsgs, newMsgs) {
              console.log('in test callback 1'); //   XXXXXXXXXXXXXXX
              assert.equal(err, null);
              assert.equal(existingMsgs.length, 1);
              assert.equal(newMsgs.length, 0);
              testCallback();
            });
          }, function (testCallback) {
            // test message filtering.. multiple messages, one existing..
            messageMan.filterExistingMessages(testTopic, [whiteListedExistingMsg, whiteListedNewMsg], function (err, existingMsgs, newMsgs) {
              console.log('in test callback 2'); //    XXXXXXXXXXXXXXXX
              assert.equal(err, null);
              assert.equal(existingMsgs.length, 1);
              assert.equal(newMsgs.length, 1);
              assert.equal(newMsgs[0].a, 27);
              testCallback();
            });
          }, function (testCallback) {
            // test message filtering.. multiple messages, one existing.., and one not whitelisted
            messageMan.filterExistingMessages(testTopic, [whiteListedExistingMsg, whiteListedNewMsg, notWhiteListedNewMsg, whiteListedNewMsg2, notWhiteListedNewMsg2], function (err, existingMsgs, newMsgs) {
              console.log('in test callback 3'); //    XXXXXXXXXXXXXXXX
              assert.equal(err, null);
              assert.equal(existingMsgs.length, 1, "should be 1 existing message, but got: " + JSON.stringify(existingMsgs));
              assert.equal(newMsgs.length, 2, "should be 2 new message, but got: " + JSON.stringify(newMsgs));
              assert.equal(newMsgs[0].a, 27);
              testCallback();
            });
          }
        ], function (err, res) {
          test.finish();
        });
      });
    });
  });
}

exports.test_getMessage_cache_errors = function (test, assert) {
  var testTopic = "getMessageLogErrs";
  var TEST_MD5 = 'qwerty123456';
  messageMan = new fhmsg.Messaging(config, logger);

  messageMan.database.on("tearUp", function () {
    messageMan.logMessage(testTopic, {'a': 1, 'b': 2, 'MD5': TEST_MD5}, function (err, objects) {
      assert.equal(err, null);
      assert.equal(objects[0].MD5, TEST_MD5);
      var obj2MD5 = objects[0].MD5;

      messageMan.getMessage(testTopic, obj2MD5, function (err, message) {
        assert.equal(err, null);
        assert.isDefined(message);
        assert.isDefined(message.b);
        assert.equal(message.b, 2);

        // calling getMessage again should hit the cache this time..
        messageMan.getMessage(testTopic, obj2MD5, function (err, message) {
          assert.equal(err, null);
          test.finish();
        });
      });

    });
  });
}
