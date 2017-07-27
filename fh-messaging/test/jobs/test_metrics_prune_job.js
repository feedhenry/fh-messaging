var sinon = require('sinon');
var fhlogger = require('fh-logger');
var metricsPruneJob = require('../../lib/jobs/metrics_prune_job');

var mockAgenda, config, logger;
var db = {
  command: function() {}
};

exports.setUp = function(setUp, assert) {
  mockAgenda = {
    define: sinon.spy(function(jobName) {
      assert.equal(jobName, 'metrics_prune_job');
    }),
    every: sinon.spy(function(schedule, jobName) {
      assert.equal(jobName, 'metrics_prune_job');
    }),
    "on": function() {}
  };

  config = {
    agenda: {
      jobs: {
        metrics_prune_job: {
          schedule: '1 minute'
        }
      }
    }
  };

  logger = fhlogger.createLogger({ name: 'test_metrics_prune_job' });
  setUp.finish();
};

exports.test_job_setup = function(test, assert) {
  var job = metricsPruneJob(logger, config, mockAgenda, db);
  job.setUp();

  assert.ok(mockAgenda.define.called);
  assert.ok(mockAgenda.every.called);

  test.finish();

};