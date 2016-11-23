//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_temptrans_app() {
  emit({appid: this._id.appid, domain: this._id.domain, ts: ts}, this.value);
}

exports.metrics_temptrans_app = metrics_temptrans_app;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
