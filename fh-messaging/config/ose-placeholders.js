var placeholders = {
  "messaging.port": 8080,
  "database.name": "{{env.MONGODB_FHREPORTING_DATABASE}}",
  "database.host": "{{fallback(env.MONGODB_SERVICE_NAME, 'mongodb-1')}}",
  "database.auth.user": "{{env.MONGODB_FHREPORTING_USER}}",
  "database.auth.pass": "{{env.MONGODB_FHREPORTING_PASSWORD}}",
  "database.auth.source": "{{env.MONGODB_FHREPORTING_DATABASE}}",
  "database.options.replicaSet": "{{env.MONGODB_REPLICA_NAME}}",
  "mongo.admin_auth.user": "{{env.MONGODB_ADMIN_USER}}",
  "mongo.admin_auth.pass": "{{env.MONGODB_ADMIN_PASSWORD}}",
  "metrics.port": 8080,
  "metrics.database.name": "{{env.MONGODB_FHREPORTING_DATABASE}}",
  "metrics.database.host": "mongodb-1",
  "metrics.database.auth.user": "{{env.MONGODB_FHREPORTING_USER}}",
  "metrics.database.auth.pass": "{{env.MONGODB_FHREPORTING_PASSWORD}}",
  "metrics.database.auth.source": "{{env.MONGODB_FHREPORTING_DATABASE}}",
  "metrics.database.options.replicaSet": "{{env.MONGODB_REPLICA_NAME}}",
  "agenda.enabled":true,
  "agenda.jobs.metrics_rollup_job.schedule":"{{env.FH_MESSAGING_CRON}}",
  "messaging.ignoreAPIKey":false,
  "messaging.msgAPIKey": "{{env.FH_MESSAGING_API_KEY}}",
  "messaging.logger.streams[0].level": "{{env.FH_LOG_LEVEL}}",
  "configDir":"/opt/app-root/src/config"
};

module.exports = placeholders;
