var sys = require('sys');
var fh_logger = require('fh-logger');
var EventEmitter = require('events').EventEmitter;

function TestListener(numTests, logr) {
  this.numTests = numTests;
  this.testCount = 0;

  var logcfg = require("../config/dev.json").metrics.logger;
  this.logger = logr || fh_logger.createLogger(logcfg);
  EventEmitter.call(this);
};

sys.inherits(TestListener, EventEmitter);

TestListener.prototype.testFinished = function(testName) {
  this.testCount++;
  var tn = testName || "";
  this.logger.debug("TestListener.testFinished: '" + tn + "' num: " + this.testCount + " of expected: " + this.numTests);

  if (this.testCount == this.numTests) {
    this.emit('testsFinished');
  }
  this.emit('testFinished', testName, this.testCount);
};

exports.TestListener = TestListener;
