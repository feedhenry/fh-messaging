//  Message Server Rest HTTP server
//
/*jshint node:true */

"use strict";

var util = require('util');
var express = require('express');
var fhmsg = require("./fhmsg.js");
var fs = require('fs');
var path = require('path');
var helpers = require('./helpers.js');
var async = require('async');
var http = require('http');
var bodyParser = require('body-parser');
var metrics = require('./handlers/metrics');
var healthmonitor = require('./handlers/healthmonitor.js');
var _ = require("underscore");

// Message Server configuration, set in constructor.
var config;

// Private handle to our logging object, created in constructor
var logger;

// Private handles on our 'fhmsg' object created in constructor..
var messaging;

function handleInternalError(err, res, funct, code, msg) {
  if (err) {
    logger.error("Error in: " + funct + " - " + util.inspect(err));
  }
  res.statusCode = (('undefined' === typeof code) ? 500 : code);
  res.end((!(msg) ? "Internal Error" : msg));
}

var sys = function(cfg,logger) {
  var router = new express.Router();

  router.get('/info/ping', function(req, res) {
    logger.info("Ping request received.");
    res.end(JSON.stringify("OK"));
  });

  router.get('/info/version', function(req, res) {
    var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), "utf8"));
    logger.info("Version request received: " + pkg.version);
    res.end(JSON.stringify(pkg.version));
  });

  router.get('/info/status', function(req, res) {
    if (!messaging) {
      res.statusCode = 500;
      res.write(JSON.stringify({"status":"critical", message: "The fh-metrics messaging server failed to initialise"}));
      res.end();
    } else {
      messaging.database.checkStatus(function(err) {
        if (err) {
          res.statusCode = 500;
          res.write(JSON.stringify({"status":"critical", message: err.message}));
          res.end();
        } else {
          res.statusCode = 200;
          res.write(JSON.stringify({"status":"ok", "message":"everything is fine"}));
          res.end();
        }
      });
    }
  });

  router.get('/info/health', healthmonitor(config));

  return router;
};


var filterData = function(metric, results) {
  //remove all the cuids from the results as they are not used by the client and increase the size of the response significantly
  if (metric === "domainactivedevice" || metric === "appactivedevice") {
    return _.map(results, function(r) {
      return {"_id": r._id, "value": {"destinations": r.value.destinations}};
    });
  } else if (metric === "domainactivedevicegeo" || metric === "appactivedevicegeo") {
    return _.map(results, function(r) {
      var countries = _.mapObject(r.value, function(val) {
        return val.total;
      });
      return {"_id": r._id, "value": countries};
    });
  } else {
    return results;
  }
};

var getMetric = function(metric, metric_id_field_name, query, callback) {
  var startDate, endDate;
  //switch collection if mbaas data enabled
  var metricCollection = metric;

  logger.debug('query: ' + JSON.stringify(query));

  startDate = new Date(query.from.year, query.from.month - 1, query.from.date);
  // Get the 'to' date, if available, or default to next day  i.e. a single days metrics
  if (query.to) {
    endDate = new Date(query.to.year, query.to.month - 1, query.to.date);
    endDate.setDate(endDate.getDate() + 1);
  } else {
    endDate = new Date(startDate.getTime());
    endDate.setDate(endDate.getDate() + 1);
  }

  logger.info('METRIC_collection: ' + metricCollection + ' ' + metric_id_field_name + ': ' + query._id);

  var findQuery = {'_id.ts': {$gte: startDate.getTime(), $lt: endDate.getTime()} };

  // The _id field can be an array for service requests (containing all the ids of the
  // associated services
  if (query._id && Array.isArray(query._id)) {
    findQuery[metric_id_field_name] = {
      $in: query._id
    };
  } else {
    findQuery[metric_id_field_name] = query._id;
  }

  logger.info('METRIC_QUERY: ' + JSON.stringify(findQuery));
  messaging.database.find(metricCollection, findQuery, function(err, results) {
    if (err) {
      logger.info(' error with METRIC_QUERY: ' + JSON.stringify(err));
      return callback(err);
    }

    results = filterData(metric, results);
    logger.debug('METRIC_results: ' + JSON.stringify(results));
    callback(null, results);
  });
};

var getSumMetric = function(metric, metric_id_field_name, query, callback) {
  var startDate, endDate;
  var limitRows = query.num || 5;
  logger.debug('query: ' + JSON.stringify(query));
  var metricCollection = metric;

  startDate = new Date(query.from.year, query.from.month - 1, query.from.date);
  // Get the 'to' date, if available, or default to next day  i.e. a single days metrics
  if (query.to) {
    endDate = new Date(query.to.year, query.to.month - 1, query.to.date);
    endDate.setDate(endDate.getDate() + 1);
  } else {
    endDate = new Date(startDate.getTime());
    endDate.setDate(endDate.getDate() + 1);
  }

  logger.info('METRIC_collection: ' + metricCollection + ' ' + metric_id_field_name + ': ' + query._id);

  var findQuery = {'_id.ts': {$gte: startDate.getTime(), $lt: endDate.getTime()} };
  findQuery[metric_id_field_name] = query._id;
  logger.info('METRIC_QUERY: ' + JSON.stringify(findQuery));
  messaging.database.findWithSelection(metric, findQuery, {}, {sort: {"value.total": -1}, limit: limitRows}, function(err, results) {
    if (err) {
      return callback(err);
    }

    logger.debug('METRIC_results: ' + JSON.stringify(results));
    callback(null, results);
  });
};

// metric will be top, params contains array of metrics to return
var getTopMetric = function(metric, metric_id_field_name, params, callback) {
  var metricsList, retVal = {};
  if (Array.isArray(params.metric)) {
    metricsList = params.metric;
  } else {
    metricsList = [ params.metric ];
  }

  async.each(
    metricsList,
    function(item, cb) {
      getSumMetric(item, metric_id_field_name, params, function(err, results) {
        if (!err) {
          retVal[item] = results;
        }
        return cb(err);
      });
    },
    function(err) {
      return callback(err, retVal);
    }
  );
};

var metric = function(config,logger, db) {
  var router = new express.Router();
  var metricsHandler = metrics(config,logger,db);
  router.get("/:level", metricsHandler.byLevel);
  //TODO tech debt move to metricsHandler them metric becomes metricsHandler
  router.post('/:metric', function(req, res) {
    // default to calling usus func
    var metricFunction = getMetric;
    var requestedMetric = req.params.metric;
    logger.info('POST: ' + req.url + ' metric: ' + requestedMetric);
    if (!helpers.isValidAuthApiKey(req)) {
      logger.warn("Metric retrieve api called without apikey");
      res.writeHead(403, 'Forbidden');
      res.end('Access Forbidden');
      return;
    }

    function requireParams(params, required) {
      var ri, rl, tempReq, valid = true;

      for (ri =0, rl = required.length; ri < rl; ri += 1) {
        tempReq = required[ri];
        if ('undefined' === typeof params[tempReq]) {
          valid = false;
        }
      }
      return valid;
    }

    // validate params in body
    var params = req.body;
    logger.info('params: ' + JSON.stringify(params));
    if ('undefined' !== typeof params && requireParams(params, ['_id', 'from'])) {
      if ('undefined' === typeof params.out || 'raw' !== params.out) {
        var metric_id_field_name = config.metrics.idFieldName["default"];
        if (config.metrics.idFieldName[requestedMetric]) {
          metric_id_field_name = config.metrics.idFieldName[requestedMetric];
        }

        if (requestedMetric === "top") {
          metricFunction = getTopMetric;
          metric_id_field_name = '_id.domain';
        }

        metricFunction(requestedMetric, metric_id_field_name, params, function(err, results) {
          if (err) {
            handleInternalError(err, res, "getMetric");
            return;
          }
          if (requestedMetric !== "top") {
            removeTotals(results);
          }
          logger.debug('results: ' + JSON.stringify(results));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(results));
        });
      } else {
        // out: raw has been removed
        res.statusCode = 400;
        res.end();
      }
    } else {
      // invalid or missing params, return 400
      res.statusCode = 400;
      res.end();
    }
  });
  router.use(metricsHandler.errorHandler);
  router.use(metricsHandler.responseHandler);
  router.use(function(req,res) {
    res.status(404).json({"message":"endpoint not found"});
  });
  return router;
};

function removeTotals(results) {
  var i;
  for (i = 0; i < results.length; i += 1) {
    if (results[i] && results[i].value && results[i].value.total) {
      delete results[i].value.total;
    }
  }
}

exports.MetricsServer = function(cfg, logr, cb) {
  config = cfg;
  logger = logr;
  var self = this;

  this.app = express();

  this.messaging = new fhmsg.Messaging(config, logr, function(err,database) {
    if (err) {
      logr.error('error during startup ', err);
    }
    if (logger.requestIdMiddleware) {
      self.app.use(logger.requestIdMiddleware);
    }
    self.app
            .use(require('express-bunyan-logger')({ logger: logger, parseUA: false }))
            .use(bodyParser.urlencoded({ extended: false }))
            .use(bodyParser.json({}))
            .use(helpers.fhApiKeyFilter(config.metrics.ignoreAPIKey, "x-feedhenry-metricsapikey", config.metrics.metricsAPIKey, logger))
            .use('/sys', sys(cfg,logr))
            .use('/metric', metric(cfg,logr,database));
    if ('function' === typeof cb) {
      return cb();
    }
  });

  // ssl/https support
  if (config.metrics.ssl.use_ssl === 'true') {
    var privateKey = fs.readFileSync(config.metrics.ssl.key);
    var certificate = fs.readFileSync(config.metrics.ssl.cert);
    this.server = http.createServer({key: privateKey.toString(), cert: certificate.toString()}, this.app);
  } else {
    this.server = http.createServer(this.app);
  }

  this.tearDown = function(cb) {
    cb = cb || function() {};
    console.log('Stopping MetricsServer...');
    if (self.server && self.server.close) {
      self.server.close();
    }
    self.messaging.tearDown(cb);
  };

  messaging = this.messaging;

};
