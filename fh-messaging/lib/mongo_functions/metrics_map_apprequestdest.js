//ts and emit are used for testing purposes
var ts;
var emit;
function metrics_map_apprequestdest() {
  var obj = {};
  obj[this.destination] = 1;
  obj.id = this.guid;
  emit({appid: this.appid, domain: this.domain, ts: ts}, obj);
}

exports.metrics_map_apprequestdest = metrics_map_apprequestdest;
exports.setVars = function(tstamp,emitFunc) {
  ts = tstamp;
  emit = emitFunc;
};
