/* eslint-disable*/
//ts and emit are used for testing purposes
var ts;
var emit;

function reduce_total_counter(k, vals) {
  var ret = 0, i, len;
  len = vals.length;
  for (i = 0; i < len; i += 1) {
    ret += vals[i];
  }
  return ret;
}

exports.reduce_total_counter = reduce_total_counter;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
  console.log('timestamp=' + ts + ', emit=' + emit);
};
