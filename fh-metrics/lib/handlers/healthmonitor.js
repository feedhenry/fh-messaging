var util = require('util');
var fhconfig = require('fh-config');

function result(id, status, error) {
  return {
    id: id,
    status: status,
    error: error
  };
}

//connection to system db here
function checkMongoDB(callback) {
  var mc = require('mongodb').MongoClient;
  mc.connect(fhconfig.mongoConnectionString('metrics.database'), function(err, db) {
    if (db && db.close && typeof db.close === 'function') {
      db.close();
    }

    if (err) {
      return callback(result('mongodb', 'error', util.inspect(err)));
    }
    return callback(null, result('mongodb', 'OK', null));
  });
}

function initFhHealth() {
  var fhhealth = require('fh-health');
  fhhealth.init();

  fhhealth.addCriticalTest('Check Mongodb connection', checkMongoDB);

  return fhhealth;
}

function monitorHealth(config) {
  fhconfig.setRawConfig(config);
  var fhhealth = initFhHealth();

  return function(req, res) {
    fhhealth.runTests(function(err, testResults) {
      res.statusCode = 200;
      res.write(testResults);
      res.end();
    });
  };
}

module.exports = monitorHealth;
