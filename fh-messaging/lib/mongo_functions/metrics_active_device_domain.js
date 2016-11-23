//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_active_device_domain() {
  var val = {};
  val[this._id.cuid] = this.value;
  emit({domain: this._id.domain, ts: ts}, val);
}

exports.metrics_active_device_domain = metrics_active_device_domain;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};