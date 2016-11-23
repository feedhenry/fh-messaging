var placeholders = {
  "metrics.port": 8080,
  "metrics.database.name": "{{env.MONGODB_FHREPORTING_DATABASE}}",
  "metrics.database.host": "mongodb-1",
  "metrics.database.auth.user": "{{env.MONGODB_FHREPORTING_USER}}",
  "metrics.database.auth.pass": "{{env.MONGODB_FHREPORTING_PASSWORD}}",
  "metrics.database.auth.source": "{{env.MONGODB_FHREPORTING_DATABASE}}",
  "metrics.database.options.replicaSet": "{{env.MONGODB_REPLICA_NAME}}",
  "metrics.logger.streams": [{
    "type": "stream",
    "src": true,
    "level": "{{env.FH_LOG_LEVEL}}",
    "stream": "process.stdout"
  }],
  "mbaasid":"{{env.FH_MBAASID}}",
  "metrics.ignoreAPIKey":false,
  "metrics.metricsAPIKey":"{{env.FH_METRICS_API_KEY}}"
};

module.exports = placeholders;
