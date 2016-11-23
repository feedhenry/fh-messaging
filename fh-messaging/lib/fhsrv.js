//  Message Server Rest HTTP server
//
var util = require('util');
var express = require('express');
var url = require('url');
var fhmsg = require("./fhmsg.js");
var fhmm = require("./fh_metrics_man.js");
var fs = require('fs');
var path = require('path');
var async = require('async');
var helpers = require('./helpers.js');
var appkeys = require('./appkeys.js');
var http = require('http');
var bodyParser = require('body-parser');
var rolledUpMetrics = require('./handlers/rolled_up_metrics.js');
var agendaScheduler = require('./agenda_scheduler.js');
var healthmonitor = require('./handlers/healthmonitor.js');


// Message Server configuration, set in constructor.
var config;

// Private handles on our 'fhmsg' object and fh_metrics_man, created in constructor..
var messaging;

// Private handle to our logging object, created in constructor
var logger;

var connections = {
  num: 0,
  last: 0
};

function handleInternalError(err, res, funct, code, msg) {
  if (err) {
    logger.error("Error in: " + funct + " - " + util.inspect(err));
  }
  connections.num -= 1;
  res.statusCode = (('undefined' === typeof code) ? 500 : code);
  res.end((!(msg) ? "Internal Error" : msg));
}

//
// internal functions to provide topic stats
//
function countTopic(topic, callback) {
  messaging.countMessages(topic, callback);
}

function getTopicStats(callback) {
  messaging.getTopics(function(err, topics) {
    if (err) {
      return callback(err, null);
    }
    var stats = {};
    async.map(topics, countTopic, function(err, results) {
      var i;
      if (err) {
        return callback(err, null);
      }
      for (i = 0; i < topics.length; i += 1) {
        stats[topics[i]] = results[i];
      }
      return callback(err, stats);
    });
  });
}

function topicExcludedFromAuth(topic) {
  var ret = false;
  var listOfExcludes = config.messaging.apiKeyExceptionTopics;
  if (util.isArray(listOfExcludes) && topic) {
    ret = (listOfExcludes.indexOf(topic) >= 0);
  }
  return ret;
}

//
// Main Rest API routing entry point for '/msg'
//

// common handler function for HEAD response
function handleHeadResponse(err, exists, res) {
  if (err) {
    handleInternalError(err, res, "hasAllMessages");
    return;
  }
  if (exists === null || exists === false) {
    res.statusCode = 404;
    res.end();
  } else {
    res.statusCode = 200;
    res.end("");
  }
  return;
}

var msg = (function() {
  var router = new express.Router();
  router.get('/', function(req, res) {
    logger.info("GET: " + req.url);
    if (!helpers.isValidAuthApiKey(req)) {
      logger.warn("get topics api called without apikey");
      res.writeHead(403, "Forbidden");
      res.end("Access Forbidden");
      return;
    }

    messaging.getTopics(function(err, topics) {
      if (err) {
        handleInternalError(err, res, "getTopics");
        return;
      }
      res.end(JSON.stringify(topics));
    });
  });

  router.get('/:topic', function(req, res) {
    // To do - if no params set, need to return a sensible limit, and not
    // all of the messages for this topic as we do at the moment.
    var params = url.parse(req.url, true);
    logger.info("GET Messages for: " + req.url + " params: " + util.inspect(params.query));

    if (!helpers.isValidAuthApiKey(req)) {
      logger.warn("get topic api called without apikey");
      res.writeHead(403, "Forbidden");
      res.end("Access Forbidden");
      return;
    }

    messaging.getMessages(req.params.topic, params.query, function(err, messages) {
      if (err) {
        handleInternalError(err, res, "getMessages");
        return;
      }
      res.end(JSON.stringify(messages));
    });
  });

  router.get('/:topic/:md5id', function(req, res) {
    logger.info("GET: " + req.url);

    if (!helpers.isValidAuthApiKey(req)) {
      logger.warn("get message api called without apikey");
      res.writeHead(403, "Forbidden");
      res.end("Access Forbidden");
      return;
    }

    messaging.getMessage(req.params.topic, req.params.md5id, function(err, message) {
      if (err) {
        handleInternalError(err, res, "getMessage");
        return;
      }
      if (!message) {
        res.statusCode = 404;
      }
      res.end(JSON.stringify(message));
    });
  });


  router.head('/:topic/:md5id', function(req, res) {
    logger.info("HEAD: " + req.url);

    if (!helpers.isValidAuthApiKey(req)) {
      logger.warn("get message api called without apikey");
      res.writeHead(403, "Forbidden");
      res.end("Access Forbidden");
      return;
    }

    messaging.hasAllMessages(req.params.topic, req.params.md5id.split(';'), function(err, exists) {
      handleHeadResponse(err,exists,res);
    });
  });


  router.post('/:topic', function(req, res) {
    connections.num += 1;
    connections.last = Date.now();
    var timings_start = Date.now();
    var numMessages = 1;
    var topic = req.params.topic;
    var messages = req.body;
    var url = req.url;
    if (messages instanceof Array) {
      numMessages = messages.length;
    }
    logger.info("POST: " + url + " - topic: " + topic + ' - ' + numMessages + ' messages');

    // any auth (millicore api or )
    if (!(helpers.isValidAuth(req) || topicExcludedFromAuth(topic))) {
      logger.debug("Post message api called without valid apikey");
      messaging.deadletter(topic, messages, function(err) {
        if (err) {
          logger.error("Error saving unauthorised message: " + JSON.stringify(err));
        }
        res.writeHead(403, "Forbidden");
        res.end("Access Forbidden");
      });
      return;
    }
    //end request
    res.json({"message":"accepted messages"});

    // first filter out any messages we already have
    messaging.filterExistingMessages(topic, messages, function(err, existingMessages, newMessages) {
      var timings_filtered = Date.now();
      if (err) {
        logger.error("Error filtering after " + (timings_filtered - timings_start) + " milliseconds", err);
        return;
      }
      if (newMessages.length > 0) {
        messaging.logMessage(topic, newMessages, function(err, objects) {
          var i;
          if (err) {
            logger.error("Error filtering after " + (timings_filtered - timings_start) + " milliseconds", err);
            return;
          }

          var ids = [];
          for (i in objects) {
            if (objects.hasOwnProperty(i)) {
              var msg = objects[i];
              ids.push(msg.MD5);
            }
          }
          var m = {};
          m.newMessages = ids;
          if (existingMessages.length > 0) {
            m.existingMessages = existingMessages;
          }
          var timings_logged = Date.now();
          logger.info("Added messages to topic: " + req.params.topic + " new: " + m.newMessages.length + " existing: " + existingMessages.length + ", filtered in " + (timings_filtered - timings_start) + " milliseconds" + ", logged in " + (timings_logged - timings_filtered) + " milliseconds");
          connections.num -= 1;
        });
        var timings_funcLogged = Date.now();
        logger.info("Call to logMessage() took: " + (timings_funcLogged - timings_filtered) + " milliseconds");
      } else {
        var m = {};
        if (existingMessages.length > 0) {
          m.existingMessages = existingMessages;
        }
        logger.info("topic: " + req.params.topic + " existing: " + existingMessages.length + ", filtered in " + (timings_filtered - timings_start) + " milliseconds");
        connections.num -= 1;
      }
    });
    var timings_funcFiltered = Date.now();
    logger.info("Call to filterExistingMessages() took: " + (timings_funcFiltered - timings_start) + " milliseconds");
  });
  return router;
})();

var mr = function(config, logger, db) {
  var router = new express.Router();
  var rollupHandler = rolledUpMetrics(config, logger, db);

  router.post('/daily',rollupHandler.run);

  router.post('/receive/:level', rollupHandler.storeByLevel);

  return router;
};

var sys = (function() {
  var router = new express.Router();
  router.get('/info/ping', function(req, res) {
    logger.info("Ping request received.");
    if (!helpers.isValidAuth(req)) {
      logger.info("Not authorised key");
    } else {
      logger.info("Is AUTHORISED key");
    }
    res.end(JSON.stringify("OK"));
  });
  router.get('/info/version', function(req, res) {
    var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), "utf8"));
    logger.info("Version request received: " + pkg.version);
    res.end(JSON.stringify(pkg.version));
  });
  router.get('/info/stats', function(req, res) {
    getTopicStats(function(err, stats) {
      logger.info("Stats request received: " + stats);
      res.end(JSON.stringify(stats));
    });
  });
  router.get('/info/status', function(req, res) {
    if (!messaging) {
      res.statusCode = 500;
      res.write(JSON.stringify({"status":"critical", message: "messaging server failed to initialise"}));
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
})();

exports.MessageServer = function(cfg, logr, cb) {
  config = cfg;
  logger = logr;
  var self = this;
  this.metricsMan = new fhmm.MetricsManager(cfg, logr);

  this.app = express();

  this.messaging = new fhmsg.Messaging(cfg, logr, function(err, database) {
    if (err) {
      logr.error("error during startup ", err);
    }
    if (logger.requestIdMiddleware) {
      self.app.use(logger.requestIdMiddleware);
    }
    self.app
            .use(require('express-bunyan-logger')({ logger: logger, parseUA: false }))
            .use(bodyParser.urlencoded({ extended: false }))
            .use(bodyParser.json({}))
            .use(helpers.fhApiKeyFilter(config.messaging.ignoreAPIKey, "x-feedhenry-msgapikey", config.messaging.msgAPIKey, logger))
            .use(helpers.fhAppKeyFilter(config.messaging.ignoreAPIKey, "x-fh-auth-app", self.appkeyValidator, logger))
            .use('/sys', sys)
            .use('/msg', msg)
            .use('/rollup', mr(cfg, logr, database))
            .use(function(req, res) {
              handleInternalError(null, res, "", 503, "Error: No end point." + req.path);
            });

    self.agenda = agendaScheduler( logr, cfg, database.db);

    if ('function' === typeof cb) { // jshint ignore:line
      return cb();
    }
  });

  this.server = http.createServer(this.app);

  this.tearDown = function(cb) {
    cb = cb || function() {};
    logger.info('Stopping MessageServer...');
    if (self.server && self.server.close) {
      self.server.close();
    }
    self.agenda.tearDown(function() {
      self.messaging.tearDown(cb);
    });
  };

  this.appkeyValidator = new appkeys.AppKeyValidator(cfg.messaging, this.messaging.database, logr);

  if (cfg.messaging.whitelist) {
    this.messaging.loadFilterWhiteList(cfg.messaging.whitelist, function(err, whitelist) {
      logger.info({'message-whitelist': whitelist});
    });
  }

  messaging = this.messaging;

};
