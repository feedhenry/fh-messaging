var util = require('util');

module.exports = function(logger, config, agenda, db) {
  var logTag = "#metrics_prune";
  var jobSchedule = config.agenda.jobs.metrics_prune_job.schedule;
  var jobName = "metrics_prune_job";

  return {
    "setUp": jobSetup
  };

  function jobSetup() {
    agenda.define(jobName, jobDefinition(db));
    agenda.every(jobSchedule, 'metrics_prune_job', {}, { "timezone": "UTC" });

    agenda.on("fail:metrics_prune_job", function(err, job) {
      if (job.audit) {
        job.audit.completeJobWithError("agenda job failed ", err);
      }
      logger.warn(logTag + " : failed  to run job metrics_prune_job error " + util.inspect(err));
    });
  }

  function jobDefinition(db) {
    return function(job, done) {
      try {
        db.command({ repairDatabase: 1 }, function(err) {
          if (err) {
            logger.error("failed to free up disk space" + err);
            return done(err);
          } else {
            logger.info("reclaimed disk space ");
            done();
          }
        });
      } catch (e) {
        logger.error(logTag + "exception occurred running job ", e);
      }
    };
  }
};
