//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_geo() {
  var obj = {};
  obj[this.country.country_name] = 1;
  emit({appid: this.appid, domain: this.domain, ts: ts}, obj);
}

exports.metrics_geo = metrics_geo;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
