//ts and emit are used for testing purposes
var ts;
var emit;

function metrics_active_device_app_geo() {
  var val = this.value;
  for (var key in val) {
    if (val.hasOwnProperty(key)) {
      //key is the name of the country
      val[key] = {cuids: {}, total: 1};
      val[key].cuids[this._id.cuid] = 1;
    }
  }
  emit({appid: this._id.appid, domain: this._id.domain, ts: ts}, val);
}

exports.metrics_active_device_app_geo = metrics_active_device_app_geo;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};