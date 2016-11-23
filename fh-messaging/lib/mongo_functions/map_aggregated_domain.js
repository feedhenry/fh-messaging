//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_domain() {
  emit({domain: this._id.domain, ts: ts}, this.value);
}

exports.metrics_aggregated_domain = metrics_domain;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
