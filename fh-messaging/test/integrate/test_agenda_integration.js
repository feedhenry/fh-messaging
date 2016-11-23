var proxyquire = require('proxyquire');
var helper = require('./test_helper.js');
var fhlogger = require('fh-logger');

var config;
var logger;
var database;

exports.setUp = function (test, assert) {
  helper.init( function(err, conf) {
    logger = fhlogger.createLogger({name: 'test_agenda_integration'});
    logger.debug('setUp');

    config = conf;
    config.database.name = "test_agenda_integration";

    helper.testDataSetUp(config.database, undefined, function (err, data, db) {
      if (err) {
        logger.error(err);
      }
      assert.ok(!err);

      database = db;
      test.finish();
    });
  });
};

exports.tearDown = function (test, assert) {
  logger.info('tearDown');
  database.on('tearDown', function() {
    helper.testDataTearDown(config.database, function (err, data) {
      if (err) {
        logger.error(err);
      }
      assert.ok(!err);
      test.finish();
    });
  });
  database.tearDown();
};

exports.test_integration = function ( test, assert ) {

  var config, agendaScheduler, schedulerInstance;

  function sampleJob( logger, config, agenda ) {
    var timerStart = Date.now();

    function jobDefinition(job, done) {

      var tookSeconds = ((Date.now() - timerStart) / 1000).toFixed();
      done();

      process.nextTick(function() {
        logger.info('sample job executed after ' + tookSeconds + ' seconds');
        assert.equal(tookSeconds, 3);

        schedulerInstance.tearDown(function() {
          test.finish();
        });
      });

    }

    function setUp(){
      agenda.define('sample_job', jobDefinition);

      logger.info('Waiting 3 seconds for scheduled job...');
      agenda.schedule('in 3 seconds', 'sample_job');
    }

    return{
      "setUp":setUp,
      "job":jobDefinition
    }

  }
  sampleJob['@noCallThru'] = true;

  agendaScheduler = proxyquire('../../lib/agenda_scheduler', {
    './jobs/job1': sampleJob
  });
  config = { agenda: {
    enabled: true,
    jobs: {
      job1: {}
    }
  }};

  schedulerInstance = agendaScheduler(logger, config, database.db );
};
