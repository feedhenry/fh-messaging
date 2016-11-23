var spawn = require('child_process').spawn;

exports.process = function(config, logger, inputDate, daysToKeep, cb) {

  var DO_IMPORT = (config.doimport ) ? "DO_IMPORT" : "NO_IMPORT";
  var logMessage = [
    'rolling up metrics for date: ' + inputDate,
    'IMPORT set to: ' + DO_IMPORT,
    'removing data older than: ' + daysToKeep + ' days'
  ].join(', ');

  logger.info(logMessage);

  var msgProcess;
  msgProcess = spawn('fh-msg-process', [inputDate, DO_IMPORT, config.configDir, daysToKeep]);
  var output = '';
  var errOut;

  msgProcess.stdout.on('data', function(data) {
    logger.debug('fh-msg-process stdout: ' + data);
    output += data;
  });

  msgProcess.stderr.on('data', function(data) {
    logger.error('fh-msg-process stderr: ' + data);
    if (!errOut) {
      errOut = data;
    } else {
      errOut += data;
    }
  });

  msgProcess.on('exit', function(code) {
    logger.info('fh-msg-process exited with code ' + code);
    var err;
    if (errOut) {
      err = {code: code, "output": errOut};
    }
    cb(err, {code: code, output: output});
  });
};

