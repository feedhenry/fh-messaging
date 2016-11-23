//ts and emit are used for testing purposes
var ts;
var emit;


function map_counter_per_logindomain_per_day() {
  emit({domain: this.loginDomain, ts: ts}, 1);
}

exports.map_counter_per_logindomain_per_day = map_counter_per_logindomain_per_day;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
