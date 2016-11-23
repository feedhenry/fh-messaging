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
        name: 'fh-messaging-basic',
        level: 'debug',
        src: true
      });
    }

    return log.logger;
  }
};