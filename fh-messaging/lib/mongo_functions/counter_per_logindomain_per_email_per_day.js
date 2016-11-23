//ts and emit are used for testing purposes
var ts;
var emit;


function map_counter_per_logindomain_per_email_per_day() {
  var email = (this.email)?(this.email):'No Email';
  emit({domain: this.loginDomain, email: email, ts: ts}, 1);
}

exports.map_counter_per_logindomain_per_email_per_day = map_counter_per_logindomain_per_email_per_day;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
