/* eslint-disable*/
//ts and emit are used for testing purposes
var ts;
var emit;
function metrics_r(k, vals) {
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
        // this add a total field to the output, to aggregate the individual fields
        if ('undefined' !== typeof ret['total']) {
          ret['total'] += tempVal[p];
        } else {
          ret['total'] = tempVal[p];
        }
      }
    }
  }
  return ret;
}
exports.metrics_r = metrics_r;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
  // added log to use variables to pass eslint test based on testing note above
  console.log('timestamp=' + ts + ', emit=' + emit);
};
