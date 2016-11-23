//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_active_device_app() {
  var val = {};
  val[this._id.cuid] = this.value;
  emit({appid: this._id.appid, domain: this._id.domain, ts: ts}, val);
}

exports.metrics_active_device_app = metrics_active_device_app;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};