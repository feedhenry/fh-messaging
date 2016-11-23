var sinon = require('sinon');
var fhlogger = require('fh-logger');
var proxyquire = require('proxyquire');

var metricsRollupJob, mockAgenda, config, mockRollup, logger, spyDone;

exports.setUp = function ( setUp, assert ) {
  mockAgenda = {
    define: sinon.spy(function(jobName, jobFn) {
      assert.equal(jobName, 'metrics_rollup_job');
      this.performJob = jobFn;
    }),
    every: sinon.spy(function(schedule, jobName) {
      this.schedule = schedule;
      assert.equal(jobName, 'metrics_rollup_job');
    }),
    "on":function (name,fn){
      
    }
  };
  mockRollup = {
    process: sinon.spy(function() {})
  };
  config = {
    agenda: {
      jobs: {
        metrics_rollup_job: {
          schedule: '1 minute',
          "daysToKeep": 31,
          "enabled":true,
          "options":{
            "rollupFor":{
              "daysAgo":0
            }
          }
        }
      }
    }
  };
  metricsRollupJob = proxyquire('../../lib/jobs/metrics_rollup_job', {
    '../fh_rollup.js': mockRollup,
    '../services/mbaas_metrics': function (){
      return{
        reduceMetricsForTimePeriod: function(types,start,end,db,cb){
          return cb();
        },
        "getRollUpFrom": function (cb){
          return cb();
        },
        "clearFrom": function(cb){
          return cb();
        }
      }
    },
    '../services/audit':function (){
      return{
        createRollUpLog: function (jobName, jobStarted, rollupDate, cb){
          return cb(undefined,{
            completeJob: function(m,cb){
              if (cb) return cb()
            },
            completeJobWithError: function (m,err,cb){
              if(cb)return cb()
            }
          })
        }
      }
    }
  });
  spyDone = sinon.spy(function() {});
  logger = fhlogger.createLogger({ name: 'test_metrics_rollup_job'});
  sinon.spy( logger, 'info' );
  sinon.spy( logger, 'error' );
  setUp.finish();
};


exports.test_job_setup = function ( test, assert ) {
  var job = metricsRollupJob( logger, config, mockAgenda );
  job.setUp();

  assert.ok( mockAgenda.define.called );
  assert.ok( mockAgenda.every.called );

  test.finish();

};

exports.test_rollup_arguments = function ( test, assert ) {
  mockRollup.process = sinon.spy(function(conf, logr, today) {
    assert.strictEqual( conf, config );
    assert.strictEqual( logr, logger );
    assert.ok( /\d{4}-\d{2}-\d{2}/.test(today) );
    assert.equal( today, new Date().toISOString().substring(0, 10) );
  });
  var job = metricsRollupJob( logger, config, mockAgenda );
  job.setUp();
  mockAgenda.performJob( {}, function() {} );

  test.finish();
};

exports.test_rollup_error = function ( test, assert ) {
  mockRollup.process = sinon.spy(function(config, logr, today, daysToKeep, callback) {
    assert.equal(daysToKeep, config.agenda.jobs.metrics_rollup_job.daysToKeep);
    callback(new Error('some error'));
  });

  var job = metricsRollupJob( logger, config, mockAgenda );
  job.setUp();

  mockAgenda.performJob( {}, function done(){
    assert.ok(logger.error.called);
    test.finish();  
  });
};

exports.test_rollup_success = function ( test, assert ) {
  mockRollup.process = sinon.spy(function(config, logr, today, daysToKeep, callback) {
    assert.equal(daysToKeep, config.agenda.jobs.metrics_rollup_job.daysToKeep);
    callback(undefined, {});
  });

  var job = metricsRollupJob( logger, config, mockAgenda );
  job.setUp();

  mockAgenda.performJob( {}, function (){
    test.finish();
  });

  
};

