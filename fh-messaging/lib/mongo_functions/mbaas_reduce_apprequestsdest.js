/* eslint-disable*/
//ts and emit are used for testing purposes
var ts;
var emit;
function mbaas_reduce_apprequestsdest(k, mbaasMetrics) {
  // Take the domain and ts in the first vals entry as the reduced elements domain and ts
  var result = {};


  function forEach(iterable, cb) {
    for (var i in iterable) {
      if (iterable.hasOwnProperty(i)) {
        cb(iterable[i], i);
      }
    }
  }

  forEach(mbaasMetrics, function(appMetrics) {
    forEach(appMetrics, function(appMetric, id) {
      if (typeof result[id] === 'undefined') {
        result[id] = {};
      }

      forEach(appMetric, function(metric, prop) {
        if (typeof result[id][prop] === 'undefined') {
          result[id][prop] = metric;
        } else {
          result[id][prop] += metric;
        }
      });
    });
  });

  return result;
}

exports.mbaas_reduce_apprequestsdest = mbaas_reduce_apprequestsdest;

exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
  console.log('timestamp=' + ts + ', emit=' + emit);
};
