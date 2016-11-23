//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_geo_domain() {
  var obj = {};
  obj[this.country.country_name] = 1;
  emit({domain: this.domain, ts: ts}, obj);
}

exports.metrics_geo_domain = metrics_geo_domain;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
