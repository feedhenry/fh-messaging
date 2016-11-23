// fhmsg module, responsible for logging messages in fhmsgsrv, etc.
//
var util = require('util');
var fhdb = require('fh-db');
var EventEmitter = require('events').EventEmitter;

//
// Main Messaging constructor function..
//
function Messaging(cfg, logr, callback) {
  this.config = cfg.metrics;
  this.logger = logr;
  this.whitelist = null;
  var self = this;
  this.database = new fhdb.Database(this.config.database.host, this.config.database.port, this.config.database.options, cfg.retryConfig);
  this.database.name = this.config.database.name;

  self.database.on("tearUp", function() {
    self.logger.info("Database opened ");
    if ('function' === typeof callback) {
      return callback(undefined,self.database);
    }
  });

  console.log('Initialise database tearUp');
  this.database.tearUp(this.config.database.auth);
}

util.inherits(Messaging, EventEmitter);

Messaging.prototype.checkStatus = function(cb) {
  var self = this;
  self.database.checkStatus(cb);
};

Messaging.prototype.tearDown = function(cb) {
  console.log('Stopping Messaging');
  if (this.database) {
    this.database.tearDown();
  }
  cb();
};

exports.Messaging = Messaging;
