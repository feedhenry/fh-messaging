//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_trans() {
  var obj = {};
  obj[this.destination] = 1;
  emit({appid: this.appid, domain: this.domain, ts: ts, cuid: this.cuid}, obj);
}

exports.metrics_trans = metrics_trans;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
