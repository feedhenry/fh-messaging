var mongo = require('mongodb');
var async = require('async');
var log = require('../logger');
var _ = require('underscore');
var helpers = require('../helpers');

var LOG_TAG = "metrics_store: ";

var moment = require('moment');
var mongoFunctions = require('../mongo_functions/index');
var MAP_REDUCE={
  "apprequestsdest":{
    "map":mongoFunctions.mbaasAggregateApp,
    "reduce":mongoFunctions.mbaasReduce,
    queryOptions: {}
  },
  "apprequestsgeo":{
    "map":mongoFunctions.mbaasAggregateApp,
    "reduce":mongoFunctions.mbaasReduce,
    queryOptions: {}
  },
  "apptransactionsdest":{
    "map":mongoFunctions.mbaasAggregateApp,
    "reduce":mongoFunctions.mbaasReduce,
    queryOptions: {}
  },
  "apptransactionsgeo":{
    "map":mongoFunctions.mbaasAggregateApp,
    "reduce":mongoFunctions.mbaasReduce,
    queryOptions: {}
  },
  "appactivedevice":{
    "map": mongoFunctions.mbaasAggregateApp,
    "reduce": mongoFunctions.metricsReduceActiveDevice,
    "queryOptions": {}
  },
  "appactivedevicegeo":{
    "map": mongoFunctions.mbaasAggregateApp,
    "reduce": mongoFunctions.metricsReduceActiveDeviceGeo,
    "queryOptions": {}
  },
  "domainrequestsdest":{
    "map":mongoFunctions.mbaasAggregateDomain,
    "reduce":mongoFunctions.mbaasReduce,
    queryOptions: {}
  },
  "domainrequestsgeo":{
    "map":mongoFunctions.mbaasAggregateDomain,
    "reduce":mongoFunctions.mbaasReduce,
    queryOptions: {}
  },
  "domaintransactionsdest":{
    "map":mongoFunctions.mbaasAggregateDomain,
    "reduce":mongoFunctions.mbaasReduce,
    queryOptions: {}
  },
  "domaintransactionsgeo":{
    "map":mongoFunctions.mbaasAggregateDomain,
    "reduce":mongoFunctions.mbaasReduce,
    queryOptions: {}
  },
  "domainactivedevice": {
    "map": mongoFunctions.mbaasAggregateDomain,
    "reduce": mongoFunctions.metricsReduceActiveDevice,
    "queryOptions": {}
  },
  "domainactivedevicegeo": {
    "map": mongoFunctions.mbaasAggregateDomain,
    "reduce": mongoFunctions.metricsReduceActiveDeviceGeo,
    "queryOptions": {}
  }
};


module.exports = function(mongodb) {
  var logger = log.getLogger();
  if (!mongodb || !mongodb instanceof mongo.Db) {
    throw new Error("expected to be passed an instance of monog.Db");
  }

  function getSingleMbaasMetricsCollectionName(metricType) {
    return "mbaas_" + metricType;
  }

  function getFromDateCollection() {
    return "from_date";
  }

  /**
   *
   * @param metrics object {metricType:[{},{}],"anotherMetricType":[{},{}]}
   * @param cb function
   */
  function removeMultipleMetrics(metrics,cb) {
    var dataKeys = Object.keys(metrics);
    async.each(dataKeys, function removeMetric(metricType, eachCallback) {
      var collection = mongodb.collection(getSingleMbaasMetricsCollectionName(metricType));
      var ids = _.pluck(metrics[metricType], "_id");
      if (ids.length > 0) {
        logger.debug(ids);
        logger.debug(LOG_TAG + " removing metric " + metricType);
        collection.remove({_id: {"$in": ids}}, eachCallback);
      } else {
        eachCallback();
      }
    },cb);
  }

  /**
   *
   * @param metrics object {metricType:[{},{}],"anotherMetricType":[{},{}]}
   * @param cb function
   */
  function insertMultipleMetrics(metrics,cb) {
    var dataKeys = Object.keys(metrics);
    async.each(dataKeys, function insertMetric(metricType, eachCallback) {
      metricType = metricType.trim();
      var collection = mongodb.collection(getSingleMbaasMetricsCollectionName(metricType));
      if (metrics[metricType] instanceof Array && metrics[metricType].length > 0) {
        logger.debug(metrics[metricType]);
        logger.debug(LOG_TAG + " inserting metric " + metricType + " into " + getSingleMbaasMetricsCollectionName(metricType));
        collection.insert(metrics[metricType], eachCallback);
      } else {
        eachCallback();
      }
    },cb);
  }

  function storeRollUpFrom(date, cb) {
    //get the current total. if it is less than the passed total update with total
    async.waterfall([
      getRollUpFrom,
      function updateIfNeeded(doc,callback) {
        if (! doc || doc.from > date) {
          mongodb.collection(getFromDateCollection(),function(err, coll) {
            if (err) {
              return cb(err);
            }
            coll.update({"_id":"from"},{$set:{"from":date}},{"upsert":true,"w":1}, callback);
          });
        } else {
          callback();
        }
      }
    ],cb);
  }

  function getRollUpFrom(cb) {
    mongodb.collection(getFromDateCollection(),function(err, coll) {
      if (err) {
        return cb(err);
      }
      coll.findOne({"_id":"from"}, cb);
    });
  }

  function clearFrom(cb) {
    mongodb.collection(getFromDateCollection(),function(err, coll) {
      if (err) {
        return cb(err);
      }
      coll.remove({}, cb);
    });
  }
  /**
   *
   * @param metrics object {metricType:[{},{}],"anotherMetricType":[{},{}]}
   * @param cb function
   * @desc facade around remove and insert
   */
  function replaceAndInsertMetrics(metrics,cb) {
    async.series([
      async.apply(removeMultipleMetrics,metrics),
      async.apply(insertMultipleMetrics,metrics)
    ],cb);
  }

  function reduceMetricsForTimePeriod(metricTypes,from,to,dbName,cb) {
    var query = {};
    query["_id.ts"] = {
      $gte: from ,
      $lt: to
    };

    logger.info("Rollup query = " + JSON.stringify(query) + " metricType " ,metricTypes, "dbName " + dbName);

    //for each metricTypes map reduce into new collection.
    async.map(metricTypes, function mapReduceMetric(metric, metricComplete) {
      async.waterfall([
        function getCollection(callback) {
          mongodb.collection(getSingleMbaasMetricsCollectionName(metric),callback);
        },
        function rollUp(collection,callback) {
          mapReduceCollection(metric,collection,callback);
        }
      ],metricComplete);
    },cb);

    function mapReduceCollection(metric,collection,callback) {
      logger.info("map reducing " + metric + " into db " + dbName);
      var mReduceConf = MAP_REDUCE[metric];
      if (! mReduceConf) {
        return callback({"code":500,"message":"unknown metric type " + metric});
      }
      var q = JSON.parse(JSON.stringify(query));
      var opt;

      for (opt in mReduceConf["queryOptions"]) {
        if (mReduceConf["queryOptions"].hasOwnProperty(opt)) {
          q[opt] = mReduceConf[opt];
        }
      }

      var options = {query : q, out: {reduce: metric, db: dbName}, scope: {ts: from}};
      logger.info("Rollup options = " + JSON.stringify(options));
      collection.mapReduce(mReduceConf.map, mReduceConf.reduce, options, function(err,results) {
        var filteredErr = helpers.ignoreSomeErrs(err);
        collection.find({}, function(err, docs) {
          console.log('@@@@@doooocs', docs);
          return callback(filteredErr, results);
        });
      });
    }

  }

  function commonTime() {
    var time = moment();
    return {
      START_OF_DAY: time.startOf('day').utc().unix() * 1000,
      END_OF_DAY: time.endOf("day").utc().unix() * 1000,
      START_OF_YESTERDAY: time.subtract(1, 'days').startOf('day').utc().unix() * 1000,
      END_OF_YESTERDAY: time.subtract(1, 'days').endOf('day').utc().unix() * 1000,
      ONE_WEEK_AGO: time.subtract(1, 'week').startOf('day').utc().unix() * 1000
    };
  }

  function mbaasMetricTypes() {
    return Object.keys(MAP_REDUCE);
  }



  return {
    "MbaasMetricTypes":mbaasMetricTypes(),
    "time":commonTime,
    "removeMultipleMetrics" :removeMultipleMetrics,
    "insertMultipleMetrics": insertMultipleMetrics,
    "replaceAndInsert" : replaceAndInsertMetrics,
    "reduceMetricsForTimePeriod":reduceMetricsForTimePeriod,
    "storeRollUpFrom" : storeRollUpFrom,
    "getRollUpFrom" : getRollUpFrom,
    "clearFrom":clearFrom
  };
};
