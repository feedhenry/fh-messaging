/* eslint-disable*/
//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_r_trans(k, vals) {

  // Take the domain and ts in the first vals entry as the reduced elements domain and ts
  var ret = {}, i, p, tempVal;

  for (i in vals) {
    if (vals.hasOwnProperty(i)) {
      tempVal = vals[i];
      for (p in tempVal) {
        if (tempVal.hasOwnProperty(p)) {
          ret[p] = tempVal[p];
        }
      }
    }
  }
  return ret;

}

exports.metrics_r_trans = metrics_r_trans;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
  // added log to use variables to pass eslint test based on testing note above
  console.log('timestamp=' + ts + ', emit=' + emit);
};
