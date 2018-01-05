/**
 *
 * @param req
 * @param res
 * @param next
 * returns all rolled up metrics from and to at level app or domain
 * domainrequestsdest
 * domainrequestsgeo
 * domaintransactionsdest
 * domaintransactionsgeo
 * domaininstallsdest
 * domaininstallsgeo
 * domainstartupsdest
 * domainstartupsgeo
 * domainactivedevice
 * app
 * apprequestsdest
 * apprequestsgeo
 * apptransactionsdest
 * apptransactionsgeo
 * appinstallsdest
 * appinstallsgeo
 * appstartupsdest
 * appstartupsgeo
 * appactivedevice
 */

var async = require('async');
var helpers = require('../helpers');
//note the should become the main metrics handler. We are passing in cfg and logger because of how they are constructed in fhmetricserve.js
var AppMetricsCollections = helpers.getAppMbaasMetricCollections();
//dont need these come from the core  "appinstallsdest","appinstallsgeo",
//"appstartupsdest","appstartupsgeo"

var DomainMetricsCollections = helpers.getDomainMbaasMetricCollections();
//dont need these come from the core "domaininstallsdest","domaininstallsgeo","domainstartupsdest","domainstartupsgeo"

module.exports = function metrics(cfg,logger, db) {
  if (!logger) {
    throw new Error(" no cfg or logger passed in to metrics handler");
  }

  //private function
  function collectMetrics(collections,from,to,cb) {
    var dat = {};
    logger.debug("get metrics retrieving from ", collections);
    async.each(collections, function getMetrics(collection,cb) {
      async.waterfall([
        function retrieve(callback) {
          getMetric(collection,from,to,callback);
        },
        function decorate(retrieved,callback) {
          logger.debug("retrieved metrics decorating with mbasid", cfg.mbaasid);
          decorateMetricsWithMbaasId(retrieved,function(err,decorated) {
            if (err) {
              return callback(err);
            }
            dat[collection] = decorated;
            callback();
          });
        }
      ],function seriesDone(err) {
        cb(err);
      });
    },function eachDone(err) {
      return cb(err, dat);
    });
  }

  function decorateMetricsWithMbaasId(metrics,cb) {
    async.map(metrics, function(mVal,done) {
      if (mVal._id && ! mVal._id.mbaas) {
        mVal._id.mbaas = cfg.mbaasid;
        done(undefined,mVal);
      } else {
        done();
      }
    }, cb);
  }

  //private function
  function getMetric(collection,from,to ,cb) {
    //query mongo
    //get metrics from the system db
    var findQuery = {'_id.ts': {$gte: from, $lt: to}};
    db.find(collection,findQuery,cb);
  }

  /**
   * exposed api
   */
  return {
    /**
     *
     * @param req the request object
     * @param res the response object
     * @param next the next piece of middleware in the chain
     * @returns {*}
     * @desc get all metrics at domain | app level for specified time period.
     */
    "byLevel": function aggregated(req,res,next) {
      var level = req.params.level;
      var from = Number(req.query.from);
      var to = Number(req.query.to);

      if (!level) {
        return next({"code":400,message:"missing param :level"});
      }

      if (! from || ! to) {
        return next({"code":400,"message":"expected to and from query params"});
      }

      if (isNaN(from) || isNaN(to)) {
        return next({"code":400,"message":"expected to and from to be numbers"});
      }

      if ("domain" === level) {
        return collectMetrics(DomainMetricsCollections,from,to,metricsCallback(req,res,next));
      } else if ("app" === level) {
        return collectMetrics(AppMetricsCollections,from,to,metricsCallback(req,res,next));
      }

      return next({"code":400,"message":"invalid value for level"});
    },
    /**
     * @param err the error being handled
     * @param req the request object
     * @param res the response object
     * @param next the next piece of middleware in the chain
     * @desc error handler for metrics route
     */
    "errorHandler":function metrics_error(err,req,res,next) {
      logger.warn("error in metrics route ", err);
      if ("string" === typeof err) {
        err = {"message":err};

        if (next && "function" === typeof next) {
          next();
        }
      }

      var errorCode = err.code ? err.code : 500;

      res.status(errorCode);
      res.json(err);
    },
    /**
     *
     * @param req the request object
     * @param res the response object
     * @returns {*}
     * @desc response handler for metrics route
     */
    "responseHandler" : function responseHandler(req,res,next) {
      if (!res.ok) {
        return next();
      }
      return res.json(res.ok);
    },
    "domainMetricTypes": DomainMetricsCollections,
    "appMetricTypes": AppMetricsCollections
  };
};

//should become middleware once fhmetricserve tidied up


function metricsCallback(req,res,next) {
  return function(err, ok) {
    if (err) {
      return next(err);
    }
    res.ok = ok;
    return next(undefined,ok);
  };
}
