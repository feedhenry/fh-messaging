var fhLogger = require('fh-logger');

var log = {};

module.exports = {
  setLogger: function(newLogger) {
    log.logger = newLogger;
    return newLogger;
  },
  getLogger: function() {
    if (!log.logger) {
      log.logger = fhLogger.createLogger({
        name: 'fh-metrics-basic',
        level: 'debug',
        src: true,
        stream: process.stdout
      });
    }

    return log.logger;
  }
};
