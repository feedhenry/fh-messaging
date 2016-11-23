//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_geo_trans() {
  var obj = {};
  obj[this.country.country_name] = 1;
  emit({appid: this.appid, domain: this.domain, ts: ts, cuid: this.cuid}, obj);
}

exports.metrics_geo_trans = metrics_geo_trans;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
