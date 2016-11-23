/* eslint-disable*/
//ts and emit are used for testing purposes
var ts;
var emit;
//the vals could be like this (according to mongo, reduce function could be called multiple times during map reduce, and the results of previous reduce call will be passed in the vals):
// - [{cuid1:{android:1}}, {cuid2:{ios:1}}, {cuids:{cuid1:{android:1}, cuid2:{ios:1}}, destinations:{ios:1, android:1}, total:2}]
//and it should be reduced to:
//- {cuids:{cuid1:{android: 1}, cuid2:{ios:1}}, destinations:{ios:1, android:1}, total: 2}
function metrics_r_active_device(k, vals) {
  var cuids = {};
  var destinations = {};
  function getCuids(input) {
    for (var cuid in input) {
      if (input.hasOwnProperty(cuid)) {
        if(!cuids[cuid]) {
          var dest = input[cuid];
          cuids[cuid] = dest;
          for(var d in dest) {
            if (dest.hasOwnProperty(d)) {
              if(!destinations[d]) {
                destinations[d] = 1;
              } else {
                destinations[d]++;
              }
            }
          }
        }
      }
    }
  }
  for (var i=0;i<vals.length; i++) {
    var val = vals[i];
    if (val.cuids && val.total) {
      getCuids(val.cuids);
    } else {
      getCuids(val);
    }
  }
  return {cuids: cuids, destinations: destinations, total: Object.keys(cuids).length};
}

exports.metrics_r_active_device = metrics_r_active_device;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
  // added log to use variables to pass eslint test based on testing note above
};
