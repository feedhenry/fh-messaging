/* eslint-disable*/
//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_reduce_apprequestdest(k, metrics) {

  function forEach(iterable, cb) {
    for (var i in iterable) {
      if (iterable.hasOwnProperty(i)) {
        cb(iterable[i], i);
      }
    }
  }

  function groupById(allMetrics) {
    var groups = {};
    forEach(allMetrics, function(metric) {
      if (!groups[metric.id]) {
        groups[metric.id] = [];
      }

      groups[metric.id].push(metric);
    });

    return groups;
  }

  function reduceMetrics(vals) {
    // Take the domain and ts in the first vals entry as the reduced elements domain and ts
    var ret = {};

    forEach(vals, function(value) {
      delete value.id;

      forEach(value, function(val, key) {
        if ('undefined' !== typeof ret[key]) {
          ret[key] += val;
        } else {
          ret[key] = val;
        }
        // this add a total field to the output, to aggregate the individual fields
        if ('undefined' !== typeof ret.total) {
          ret.total += val;
        } else {
          ret.total = val;
        }
      });
    });

    return ret;
  }

  function reduceEachGroup(grps) {
    var result = {};
    forEach(grps, function(grp, key) {
      result[key] = reduceMetrics(grp);
    });

    return result;
  }

  var groupedMetrics = groupById(metrics);
  var groupedAndReducedMetrics = reduceEachGroup(groupedMetrics);

  return groupedAndReducedMetrics;
}

exports.metrics_reduce_apprequestdest = metrics_reduce_apprequestdest;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
  // added log to use variables to pass eslint test based on testing note above
  console.log('timestamp=' + ts + ', emit=' + emit);
};
