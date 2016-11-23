var async = require('async');
var LOG_TAG = "metrics_store: ";
var metricsService = require('../services/mbaas_metrics');
var helpers = require('../helpers');

module.exports = function metrics(cfg, logger, db) {
  if ( !cfg || !logger || ! db) {
    throw new Error(" no cfg or logger or database passed in to metrics handler");
  }
  var mongo = db.db; //get handle to mongo client

  var mService = metricsService(mongo,logger);
  /**
   * exposed api
   * accepts data in following format:
   * {
        "from":1444694400000,
        "to":1447252690464,
        "mbaas":"",
        "domaininstallsgeo":[],
        "domainrequestsdest":[{"_id":{"domain":"testing","ts":1447200000000},"value":{"other":15,"total":15}},{"_id":{"domain":"testing2","ts":1447200000000},"value":{"other":22,"total":22}}],
        "domaintransactionsdest":[{"_id":{"domain":"testing","ts":1447200000000},"value":{"other":1}},{"_id":{"domain":"testing2","ts":1447200000000},"value":{"other":21}}],
        "domainrequestsgeo":[],
        "domaintransactionsgeo":[],
        "domaininstallsdest":[],
        "domainstartupsdest":[],
        "domainstartupsgeo":[]
    }
   */
  return {
    storeByLevel: function(req, res) {
      var rollupData = req.body;

      if (!helpers.isValidAuthApiKey(req)) {
        logger.error("Metric rollup api called without apikey");
        res.status(403);
        res.end("Access Forbidden");
        return;
      }

      if (!rollupData || Object.keys(rollupData).length <= 2 ) {
        return res.status(400).json({ message: "rollup data has to be provided" });
      }

      async.series([
        async.apply(mService.removeMultipleMetrics,rollupData),
        async.apply(mService.insertMultipleMetrics,rollupData),
        async.apply(mService.storeRollUpFrom,rollupData.from)

      ],function done(err) {
        if (err) {
          logger.error(LOG_TAG + " error updating mbaas metrics ", err);
          return res.status(500).json(err);
        }
        return res.status(202).end();
      });
    },

    "run": function(req, res) {
      logger.info("Daily Rollup POST request received.", req.body);
      if (!helpers.isValidAuthApiKey(req)) {
        logger.error("Metric rollup api called without apikey");
        res.status(403);
        res.end("Access Forbidden");
        return;
      }
      if (!(req && req.body && req.body.date)) {
        res.statusCode = 400;
        if (req) {
          logger.error('Must specify date parameter. body: ' + JSON.stringify(req.body));
        } else {
          logger.error('Must specify date parameter. No reqest param');
        }
        res.end('Must specify date parameter');
      } else {
        var timeinfo = helpers.timeInfoForDate(req.body.date);
        var jobs = require('../jobs/metrics_rollup_job')(logger,cfg,{},db);
        jobs.runJobFor(timeinfo, function(err) {
          if (err) {
            res.statusCode = 500;
            res.end(JSON.stringify(err));
          } else {
            res.json({"status":"complete"});
          }
        });
      }
    }
  };
};
