/* eslint-disable*/
//ts and emit are used for testing purposes
var ts;
var emit;
function metrics_aggregated_reduce(k, vals) {
  // Take the domain and ts in the first vals entry as the reduced elements domain and ts
  var ret = {}, i, p, tempVal;

  for (i in vals) {
    if (vals.hasOwnProperty(i)) {
      tempVal = vals[i];
      for (p in tempVal) {
        if ('undefined' !== typeof ret[p]) {
          ret[p] += tempVal[p];
        } else {
          ret[p] = tempVal[p];
        }

      }
    }
  }
  return ret;
}
exports.metrics_aggregated_reduce = metrics_aggregated_reduce;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
  console.log('timestamp=' + ts + ', emit=' + emit);
};
