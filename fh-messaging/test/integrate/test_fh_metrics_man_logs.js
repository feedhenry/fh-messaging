var helper = require('./test_helper.js'),
    fhmm = require('../../lib/fh_metrics_man.js'),
    fs = require('node-fs'),
    async = require('async'),
    _ = require('underscore');

var config;
var logger;
var db;
var metricsMan;

exports.initialize = function (test, assert) {
  helper.init( function(err,conf) {
    config = conf;
    logger = require('fh-logger').createLogger({name: 'test_metrics_man_log'});
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
  config.database.name = "test_fh_metrics_man_msgs";
  config.metrics.database.name = "test_fh_metrics_man_mets";
  config.metrics.whitelist = {}; //Remove the whitelist or none of the gen log tests work
  logger.info("Test metrics dir :: " + config.metrics.metricsDir);
  //testTopic1
  //1307914504819// Sun, 12 Jun 2011 22: 56: 44 GMT
  //1307919504819,// Sun, 12 Jun 2011 22: 58: 24 GMT

  //testTopic2
  //307919404819, // Sun, 12 Jun 2011 22: 56: 44 GMT
  //1307919504819, // Sun, 12 Jun 2011 22: 58: 24 GMT
  //1307929701110, // Mon, 13 Jun 2011 01: 48: 21 GMT
  //1307929721110, // Mon, 13 Jun 2011 01: 48: 41 GMT

  //appinit
  //1307919404819, // Sun, 12 Jun 2011 22: 56: 44 GMT
  //1307929721110 // Mon, 13 Jun 2011 01: 48: 41 GMT

  testData = {
    "testTopic1_20110612": {
      "index": 'MD5',
      "data": [
        {a: 'a0', _ts: 1307914504819, MD5: 'c1a3c00f03806ad69fdc2e4a84682b46'},
        {a: 'a1', _ts: 1307919504819, MD5: '85a5a10946344ee984558064e3c5b70f'}
      ]
    },
    "testTopic2_20110612": {
      "index": 'MD5',
      "data": [
        {a: 'a0', _ts: 1307919404819, MD5: 'c1a3c00f03806ad69fdc2e4a84682b46'},
        {a: 'a1', _ts: 1307919504819, MD5: '85a5a10946344ee984558064e3c5b70f'}
      ]
    },
    "testTopic2_20110613": {
      "index": 'MD5',
      "data": [
        {a: 'a2', _ts: 1307929701110, MD5: 'asdfasdd46344ee984558064asdfasdf'},
        {a: 'a3', _ts: 1307929721110, MD5: 'klkljlhk46344ee984558064lkjlkjlk'}
      ]
    },
    "appinit_20110612": {
      "index": 'MD5',
      "data": [
        {"MD5": "2f30d22d4182ac5c6fc3b3b753658845", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96119, "_ts": 1307919404819, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "a88cbe3e52c63e03493922c29d65033cb08a7d62"},
        {"MD5": "cc5224fd3eabf88b5268b3ed443ad912", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96437, "_ts": 1307919404819, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "init", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "ae0b3552bedf9ac36f2131be5a222fb27599e7b3"},
        {"MD5": "d4156f7d3b4e6e73c9240d6b0459c8bb", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96196, "_ts": 1307919404819, "app_version": "535", "appid": "PA5kI3YBNgM-HXXrAmn72h5p", "destination": "iphone", "domain": "testa", "firsttime": "init", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "DA63F132D2814B5F8C7DCD157D91DBA5"},
        {"MD5": "64f28b6a63354cbe487ca66b6d8765a1", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96392, "_ts": 1307919404819, "app_version": "3801", "appid": "VwPdJnMwIAWNOEKAmvEhlNrt", "destination": "iphone", "domain": "testa", "firsttime": "install", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "4CEC6A0350AD47538CD5B71EEB4FC22E"}
      ]
    },
    "appinit_20110613": {
      "index": 'MD5',
      "data": [
        {"MD5": "93a6186fecd3ce0e883b924cd2e62661", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96439, "_ts": 1307929721110, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "init", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "a0d997677974cf3b45ea538f8701eca993440ea0"},
        {"MD5": "654e786af874c0a17e0462fdaa75e489", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96656, "_ts": 1307929721110, "app_version": "32", "appid": "_ychdfEXFfcKf6YJK4hlWQ_a", "destination": "iphone", "domain": "testa", "firsttime": "init", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "71d7050025b002aa20a0564dfcc4f114cab1f338"},
        {"MD5": "cf048315743350da51f7a4af00c6a83b", "_cl": "dub1b", "_ho": "dub1app2b", "_mn": 96555, "_ts": 1307929721110, "app_version": "3801", "appid": "VwPdJnMwIAWNOEKAmvEhlNrt", "destination": "iphone", "domain": "testa", "firsttime": "init", "subscriber": "nJuLGKeMbBGay5qowA6H7O90", "uuid": "C7D6D0C9D3C442B1AEE405963D76DEC3"}
      ]
    }
  }

  helper.testDataSetUp(config.database, testData, function (err, data, opendb) {
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
  if (metricsMan) {
    metricsMan.tearDown();
  }
  helper.testDataTearDown(config.database, function (err, data) {
    if (err) {
      logger.error(err);
    }
    assert.ok(!err);
    test.finish();
  });
};

exports.test_CreateDir = function (test, assert) {
  var testDirToCreate = "/tmp/dir_to_create";
  var testFileToForceFailure = "/tmp/testExistingFile.txt";

  metricsMan = new fhmm.MetricsManager(config, logger);

  metricsMan.createDir(testDirToCreate, function (err) {
    assert.ok(!err);
    var stats = fs.statSync(testDirToCreate);
    assert.ok(stats.isDirectory());

    // ensure that createDir won't fail if dir already exists
    metricsMan.createDir(testDirToCreate, function (err) {
      assert.ok(!err);
      var stats = fs.statSync(testDirToCreate);
      assert.ok(stats.isDirectory());

      // ensure that createDir will fail if dir can't be created
      fs.writeFileSync(testFileToForceFailure, "Hello");
      metricsMan.createDir(testFileToForceFailure, function (err) {
        assert.ok(err ? true : false);  // force err to be evaluated as boolean
        fs.unlinkSync(testFileToForceFailure);
        test.finish();
      });
    });
  });
};

exports.test_generateLogFiles_1Topic_1Day = function (test, assert) {
  var topic = 'testTopic1';
  // Sun, 12 Jun 2011 22: 56: 44 GMT
  var validMessageDate = new Date(1307919301110);
  // Run the metrics generator against the db
  metricsMan = new fhmm.MetricsManager(config, logger);
  metricsMan.generateLogFiles(topic, validMessageDate, function (err) {
    assert.ok(!err);

    // Verify 'unmetricified' log files were produced for the data
    fs.lstat(config.metrics.metricsDir, function (err, stat) {
      assert.ok(!err);
      // make sure log directory exists
      assert.ok(stat.isDirectory());

      var fileName = '', filePath = '';
      // verify a single file was created
      fileName = 'testTopic1.log';
      filePath = config.metrics.metricsDir + '/2011/06/12/' + fileName;
      fs.lstat(filePath, function (err, stat) {
        assert.ok(!err);
        assert.ok(stat.isFile());

        // Also verify the log file has the correct data
        fs.readFile(filePath, function (err, data) {
          assert.ok(!err);

          var lines = [], content = '', msg1 = '', msg2 = '';
          content = data.toString().trim();
          logger.info('file content:  "' + content + '"');
          lines = content.split('\n');
          logger.info('lines: ' + JSON.stringify(lines));
          // Should have 2 entries in the file
          assert.equal(2, lines.length);
          // Verify the entry content
          msg1 = JSON.parse(lines[0]);
          assert.equal('a0', msg1.a);
          msg2 = JSON.parse(lines[1]);
          assert.equal('a1', msg2.a);
          test.finish();
        });
      });
    });
  });
};

//
//  // Sat Jun 11 2011 00:00:00 GMT+0100 (IST), which should have no results
//  emptyMessageDate = new Date(1307746800000);
//  // Run the metrics generator against the db
//  metricsMan.generateLogFiles(topic, emptyMessageDate, function (err) {
//    test.finish();
//    assert.ok(!err);
//  });

exports.test_generateLogFiles_1Topic_XDays1 = function (test, assert) {
  // Test for Sun, 12 Jun 2011
  var topic = 'testTopic2';
  var messageDate1 = new Date(1307919404819);
  metricsMan = new fhmm.MetricsManager(config, logger);

  // Run the metrics generator against the db
  metricsMan.generateLogFiles(topic, messageDate1, function (err) {
    assert.ok(!err);
    // Verify 'unmetricified' log files were produced for the data
    fs.lstat(config.metrics.metricsDir, function (err, stat) {
      // make sure log directory exists
      assert.ok(stat.isDirectory());

      var fileName = '', filePath = '';
      // verify a single file was created
      fileName = 'testTopic2.log';
      filePath = config.metrics.metricsDir + '/2011/06/12/' + fileName;
      fs.lstat(filePath, function (err, stat) {
        assert.ok(stat.isFile());

        // Also verify the log file has the correct data
        fs.readFile(filePath, function (err, data) {
          var lines = [], content = '', msg1 = '', msg2 = '';
          content = data.toString().trim();

          logger.info('file content:  "' + content + '"');
          lines = content.split('\n');
          logger.info('lines: ' + JSON.stringify(lines));

          // Should have 2 entries in the file
          assert.equal(2, lines.length);
          // Verify the entry content
          msg1 = JSON.parse(lines[0]);
          assert.equal('a0', msg1.a);
          msg2 = JSON.parse(lines[1]);
          assert.equal('a1', msg2.a);
          test.finish();
        });
      });
    });
  });
};

exports.test_generateLogFiles_1Topic_XDays_day2 = function (test, assert) {
  var topic = 'testTopic2';
  // Test for Sun, 13 Jun 2011
  var messageDate1 = new Date(1307929701110);
  metricsMan = new fhmm.MetricsManager(config, logger);
  metricsMan.generateLogFiles(topic, messageDate1, function (err) {
    assert.ok(!err);
    var fileName = '', filePath = '';
    // verify a single file was created
    fileName = 'testTopic2.log';
    filePath = config.metrics.metricsDir + '/2011/06/13/' + fileName;
    fs.lstat(filePath, function (err, stat) {
      assert.ok(stat.isFile());

      // Also verify the log file has the correct data
      fs.readFile(filePath, function (err, data) {
        var lines = [], content = '', msg1 = '', msg2 = '';

        content = data.toString().trim();

        logger.info('file content:  "' + content + '"');
        lines = content.split('\n');
        logger.info('lines: ' + JSON.stringify(lines));

        // Should have 2 entries in the file
        assert.equal(2, lines.length, "should have been 2 lines in " + filePath + ", but was: " + lines.length);
        // Verify the entry content
        msg1 = JSON.parse(lines[0]);
        assert.equal('a2', msg1.a);
        msg2 = JSON.parse(lines[1]);
        assert.equal('a3', msg2.a);
        test.finish();
      });
    });
  });
};

/*
 * With this test data the following files should be created
 *
 * log/2011/06/12/appinit._ychdfEXFfcKf6YJK4hlWQ_a.log 2 entries
 * log/2011/06/12/appinit.PA5kI3YBNgM-HXXrAmn72h5p.log 1 entry
 * log/2011/06/12/appinit.VwPdJnMwIAWNOEKAmvEhlNrt.log 1 entry
 *
 * log/2011/06/13/appinit._ychdfEXFfcKf6YJK4hlWQ_a.log 2 entries
 * log/2011/06/13/appinit.VwPdJnMwIAWNOEKAmvEhlNrt.log 1 entry
 *
 * By using appInit as the topic, the app id will be used to split the log files also
 * i.e. one log file per app, per topic, per day
 *
 */

function verifyLogExists(logPath, assert, callback) {
  fs.lstat(config.metrics.metricsDir, function (err, stat) {
    // make sure log directory exists
    assert.ok(stat.isDirectory());
    // verify a single file was created
    fs.lstat(logPath, function (err, stat) {
      assert.ok(stat.isFile());

      // Also verify the log file has the correct data
      fs.readFile(logPath, function (err, data) {
        assert.ok(!err);
        callback(data);
      });
    });
  });
}

exports.test_generateLogFiles_per_app = function (test, assert) {
  var topic = 'appinit';
  // Test for Sun, 12 Jun 2011
  var messageDate1 = new Date(1307919404819);
  metricsMan = new fhmm.MetricsManager(config, logger);
  metricsMan.generateLogFiles(topic, messageDate1, function (err) {
    assert.ok(!err);

    async.series([
      function (testCallback) {
        var filePath = config.metrics.metricsDir + '/2011/06/12/' + 'appinit._ychdfEXFfcKf6YJK4hlWQ_a.log';
        verifyLogExists(filePath, assert, function (data) {
          var lines = [], content = '', msg1 = '', msg2 = '';
          content = data.toString().trim();
          logger.info('file content:  "' + content + '"');
          lines = content.split('\n');
          logger.info('lines: ' + JSON.stringify(lines));
          assert.equal(2, lines.length);
          msg1 = JSON.parse(lines[0]);
          assert.equal('_ychdfEXFfcKf6YJK4hlWQ_a', msg1.appid);
          assert.equal(1307919404819, msg1._ts);
          msg2 = JSON.parse(lines[1]);
          assert.equal('_ychdfEXFfcKf6YJK4hlWQ_a', msg2.appid);
          assert.equal(1307919404819, msg2._ts);
          testCallback();
        });
      },
      function (testCallback) {
        var filePath = config.metrics.metricsDir + '/2011/06/12/' + 'appinit.PA5kI3YBNgM-HXXrAmn72h5p.log';
        verifyLogExists(filePath, assert, function (data) {
          var lines = [], content = '', msg1 = '';
          content = data.toString().trim();
          logger.info('file content:  "' + content + '"');
          lines = content.split('\n');
          logger.info('lines: ' + JSON.stringify(lines));
          assert.equal(1, lines.length);
          msg1 = JSON.parse(lines[0]);
          assert.equal('PA5kI3YBNgM-HXXrAmn72h5p', msg1.appid);
          assert.equal(1307919404819, msg1._ts);
          testCallback();
        });
      },
      function (testCallback) {
        var filePath = config.metrics.metricsDir + '/2011/06/12/' + 'appinit.VwPdJnMwIAWNOEKAmvEhlNrt.log';
        verifyLogExists(filePath, assert, function (data) {
          var lines = [], content = '', msg1 = '';
          content = data.toString().trim();
          logger.info('file content:  "' + content + '"');
          lines = content.split('\n');
          logger.info('lines: ' + JSON.stringify(lines));

          // Should have 2 entries in the file
          assert.equal(1, lines.length);
          // Verify the entry content
          msg1 = JSON.parse(lines[0]);
          assert.equal('VwPdJnMwIAWNOEKAmvEhlNrt', msg1.appid);
          assert.equal(1307919404819, msg1._ts);
          testCallback();
        });
      }
    ], function (err, res) {
      test.finish();
    });
  });
};

exports.test_generateLogFiles_per_app2 = function (test, assert) {
  var topic = 'appinit';
  // Test for Sun, 13 Jun 2011
  var messageDate = new Date(1307929701110);
  metricsMan = new fhmm.MetricsManager(config, logger);
  metricsMan.generateLogFiles(topic, messageDate, function (err) {
    assert.ok(!err);

    async.series([
      function (testCallback) {
        var filePath = config.metrics.metricsDir + '/2011/06/13/' + 'appinit._ychdfEXFfcKf6YJK4hlWQ_a.log';
        verifyLogExists(filePath, assert, function (data) {
          var lines = [], content = '', msg1 = '', msg2 = '';
          content = data.toString().trim();
          logger.info('file content:  "' + content + '"');
          lines = content.split('\n');
          logger.info('lines: ' + JSON.stringify(lines));

          // Should have 2 entries in the file
          assert.equal(2, lines.length);
          // Verify the entry content
          msg1 = JSON.parse(lines[0]);
          assert.equal('_ychdfEXFfcKf6YJK4hlWQ_a', msg1.appid);
          assert.equal(1307929721110, msg1._ts);
          msg2 = JSON.parse(lines[1]);
          assert.equal('_ychdfEXFfcKf6YJK4hlWQ_a', msg2.appid);
          assert.equal(1307929721110, msg2._ts);
          testCallback();
        });
      },
      function (testCallback) {
        var filePath = config.metrics.metricsDir + '/2011/06/13/' + 'appinit.VwPdJnMwIAWNOEKAmvEhlNrt.log';
        verifyLogExists(filePath, assert, function (data) {
          var lines = [], content = '', msg1 = '';
          content = data.toString().trim();
          logger.info('file content:  "' + content + '"');
          lines = content.split('\n');
          logger.info('lines: ' + JSON.stringify(lines));

          // Should have 2 entries in the file
          assert.equal(1, lines.length);
          // Verify the entry content
          msg1 = JSON.parse(lines[0]);
          assert.equal('VwPdJnMwIAWNOEKAmvEhlNrt', msg1.appid);
          assert.equal(1307929721110, msg1._ts);
          testCallback();
        });
      }
    ], function (err, res) {
      test.finish();
    });
  });
};

exports.test_getMetricFilePaths = function (test, assert) {
  var topic = 'appinit';
  // Test for Sun, 12 Jun 2011
  var messageDate1 = new Date(1307919404819);
  // Test for Sun, 13 Jun 2011
  var messageDate2 = new Date(1307929701110);
  metricsMan = new fhmm.MetricsManager(config, logger);

  async.series([
    function (testCallback) {
      //Generate logs for date1
      metricsMan.generateLogFiles(topic, messageDate1, function (err) {
        assert.ok(!err);
        testCallback();
      });
    },
    function (testCallback) {
      //Generate logs for date2
      metricsMan.generateLogFiles(topic, messageDate2, function (err) {
        assert.ok(!err);
        testCallback();
      });
    },
    function (testCallback) {
      // check appinit for one day
      metricsMan.getMetricFilePaths('appinit', {_id: 'VwPdJnMwIAWNOEKAmvEhlNrt', from: {year: 2011, month: 6, date: 12}}, function (err, files) {
        console.log("datafiles" + JSON.stringify(files));
        assert.strictEqual(files.length, 1);
        assert.strictEqual(files[0], "2011/06/12/appinit.VwPdJnMwIAWNOEKAmvEhlNrt.log");
        testCallback();
      });
    },
    function (testCallback) {
      // check non-existant metric returns no file name
      metricsMan.getMetricFilePaths('doesnotexist', {_id: 'VwPdJnMwIAWNOEKAmvEhlNrt', from: {year: 2011, month: 6, date: 12}}, function (err, files) {
        console.log("datafiles" + JSON.stringify(files));
        assert.strictEqual(files.length, 0);
        testCallback();
      });
    },
    function (testCallback) {
      // check appinstallsdest translated to appinit metric
      metricsMan.getMetricFilePaths('appinstallsdest', {_id: 'VwPdJnMwIAWNOEKAmvEhlNrt', from: {year: 2011, month: 6, date: 12}}, function (err, files) {
        console.log("datafiles" + JSON.stringify(files));
        assert.strictEqual(files.length, 1);
        assert.strictEqual(files[0], "2011/06/12/appinit.VwPdJnMwIAWNOEKAmvEhlNrt.log");
        testCallback();
      });
    },
    function (testCallback) {
      // check appstartupsdest translated to appinit metric
      metricsMan.getMetricFilePaths('appstartupsdest', {_id: 'VwPdJnMwIAWNOEKAmvEhlNrt', from: {year: 2011, month: 6, date: 12}}, function (err, files) {
        console.log("datafiles" + JSON.stringify(files));
        assert.strictEqual(files.length, 1);
        assert.strictEqual(files[0], "2011/06/12/appinit.VwPdJnMwIAWNOEKAmvEhlNrt.log");
        testCallback();
      });
    },
    function (testCallback) {
      // check invalid appid returns no data
      metricsMan.getMetricFilePaths('appstartupsdest', {_id: 'gibberish', from: {year: 2011, month: 6, date: 12}}, function (err, files) {
        console.log("datafiles" + JSON.stringify(files));
        assert.strictEqual(files.length, 0);
      });
      testCallback();
    },
    function (testCallback) {
      // check enddate same as start returns no files
      metricsMan.getMetricFilePaths('appstartupsdest', {_id: 'VwPdJnMwIAWNOEKAmvEhlNrt', from: {year: 2011, month: 6, date: 12}, to: {year: 2011, month: 6, date: 11}}, function (err, files) {
        console.log("datafiles" + JSON.stringify(files));
        assert.strictEqual(files.length, 0);

        testCallback();
      });
    },
    function (testCallback) {
      // check date range
      metricsMan.getMetricFilePaths('appstartupsdest', {_id: 'VwPdJnMwIAWNOEKAmvEhlNrt', from: {year: 2011, month: 6, date: 12}, to: {year: 2011, month: 6, date: 14}}, function (err, files) {
        console.log("datafiles" + JSON.stringify(files));
        assert.strictEqual(files.length, 2);
        assert.strictEqual(files[0], "2011/06/12/appinit.VwPdJnMwIAWNOEKAmvEhlNrt.log");
        assert.strictEqual(files[1], "2011/06/13/appinit.VwPdJnMwIAWNOEKAmvEhlNrt.log");
        testCallback();
      });
    }
  ], function (err, res) {
    test.finish();
  });
};
