//ts and emit are used for testing purposes
var ts;
var emit;

function map_counter_per_domain_per_day_per_owner() {
  var owner = (this.owner)?(this.owner):'Unknown';
  emit({domain: this.domain, ts: ts, owner: owner}, 1);
}


exports.map_counter_per_domain_per_day_per_owner = map_counter_per_domain_per_day_per_owner;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
