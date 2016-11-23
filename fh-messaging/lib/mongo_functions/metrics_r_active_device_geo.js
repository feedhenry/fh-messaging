/* eslint-disable*/
//ts and emit are used for testing purposes
var ts;
var emit;
//the vals could be like this (according to mongo, reduce function could be called multiple times during map reduce, and the results of previous reduce call will be passed in the vals):
// - [{Ireland: {cuids: {cuid1: 1}, total: 1}}, {Germany: {cuids: {cuid1: 1, cuid2:1}, total: 2}}, {Ireland: {cuids:{cuid3:1, total:1}}, Germany:{cuids:{cuid4:1}, total: 1}}]
//and it should be reduced to:
//- {Ireland: {cuids: {cuid1:1, cuid3:1}, total: 2}, Germany: {cuids: {cuid1: 1, cuid2:1, cuid4:1}, totals: 3}}
function metrics_r_active_device_geo(k, vals) {
  var results = {};
  function getCuids(input, cuids) {
    for (var cuid in input) {
      if (input.hasOwnProperty(cuid)) {
        cuids[cuid] = 1;
      }
    }
  }

  function addCuids(country, cuids) {
    if(!results[country]) {
      results[country] = {cuids: {}, total: 0};
    }
    getCuids(cuids, results[country].cuids);
    results[country].total = Object.keys(results[country].cuids).length;
  }
  
  for (var i=0;i<vals.length; i++) {
    var val = vals[i];
    for (var country in val) {
      if( val.hasOwnProperty(country) ) {
        addCuids(country, val[country].cuids);
      }
    }
  }
  return results;
}

exports.metrics_r_active_device_geo = metrics_r_active_device_geo;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
  // added log to use variables to pass eslint test based on testing note above
};