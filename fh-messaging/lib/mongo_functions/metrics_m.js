//ts and emit are used for testing purposes
var ts;
var emit;
function metrics_m() {
  var obj = {};
  obj[this.destination] = 1;
  emit({appid: this.appid, domain: this.domain, ts: ts}, obj);
}

exports.metrics_m = metrics_m;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
