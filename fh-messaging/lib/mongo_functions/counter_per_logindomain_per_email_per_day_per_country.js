//ts and emit are used for testing purposes
var ts;
var emit;

function map_counter_per_logindomain_per_email_per_day_per_country() {
  var country = (this.country && this.country.country_name)?(this.country.country_name):'Unknown';
  var email = (this.email)?(this.email):'No Email';
  emit({domain: this.loginDomain, email: email, ts: ts, country:country}, 1);
}

exports.map_counter_per_logindomain_per_email_per_day_per_country = map_counter_per_logindomain_per_email_per_day_per_country;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
