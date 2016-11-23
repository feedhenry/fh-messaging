//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_active_device_domain_geo() {
  var val = this.value;
  for (var key in val) {
    if (val.hasOwnProperty(key)) {
      //key is the name of the country
      val[key] = {cuids: {}, total: 1};
      val[key].cuids[this._id.cuid] = 1;
    }
  }
  emit({domain: this._id.domain, ts: ts}, val);
}

exports.metrics_active_device_domain_geo = metrics_active_device_domain_geo;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};