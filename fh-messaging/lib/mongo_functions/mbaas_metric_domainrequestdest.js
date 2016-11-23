//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_domain() {
  var obj = {};
  obj[this.destination] = 1;
  emit({domain: this.domain, ts: ts,mbaas:this.mbaas}, obj);
}

exports.metrics_mbaas_domain = metrics_domain;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
