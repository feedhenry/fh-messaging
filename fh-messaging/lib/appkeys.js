var async = require('async');
var url = require('url');
var request = require('request');

var APPKEY_CACHE_COLLECTION = 'appKeyCache';

var splitKeyInfo = function(key) {
  var parts = key.split(';');
  var clusterId = parts[0] || "";
  var appGuid = parts[1] || "";
  var appKey = parts[2] || "";
  return {
    clusterId: clusterId,
    appGuid: appGuid,
    appKey: appKey
  };
};

function AppKeyValidator(pCfg, pDb, pLogr) {
  this.db = pDb;
  this.cfg = pCfg;
  this.logger = pLogr;
}

AppKeyValidator.prototype.validateAppKey = function(appkey, cb) {
  var keyInfo = splitKeyInfo(appkey);
  var self = this;

  this.logger.debug("RUN = validate key: " + appkey);
  if (!keyInfo || !keyInfo.clusterId || !keyInfo.appGuid || !keyInfo.appKey) {
    this.logger.info("invalid appkey format: " + appkey + ", returning not valid");
    return cb(undefined, false);
  }

  this.getCachedValidationResult(keyInfo, function(err, incache, valid) {
    self.logger.debug("RUN = incache: " + incache + ", valid: " + valid);
    var cached_value = incache;
    if (err) {
      self.logger.error("Error retrieving cached validation result: " + JSON.stringify(err));
      cached_value = false;
    }
    if (cached_value) {
      return cb(undefined, valid);
    }

    async.waterfall([
      function(callback) {
        self.logger.debug("RUN = getting host from: " + keyInfo.clusterId);
        self.getClusterHostFromId(keyInfo.clusterId, callback);
      },
      function(host, callback) {
        self.logger.debug("RUN = got host: " + host + " validating id: " + keyInfo.appGuid + ", key: " + keyInfo.appKey);
        if (!host) {
          var error = new Error("cluster not congfigured: " + JSON.stringify(keyInfo));
          return callback(error);
        }
        self.validateWithHost(host, keyInfo.appGuid, keyInfo.appKey, callback);
      },
      function(valid, callback) {
        self.logger.debug("RUN = valid: " + valid + ", caching: (" + JSON.stringify(keyInfo) + ", " + valid + ")");
        self.cacheResult(keyInfo, valid, function(err) {
          if (err) {
            self.logger.error('Error caching appkey validation result: ' + JSON.stringify(err));
          }
          // Don't fail if error caching
          return callback(undefined, valid);
        });
      }
    ], function(err, result) {
      self.logger.debug("RUN = finishing ith result: " + result);
      var valid = false;
      if (!err) {
        valid = result;
      }
      return cb(err, valid);
    });
  });
};

function joinHostAndPath(host, path) {
  var urlObj = url.parse(host);
  urlObj.pathname = path;
  return url.format(urlObj);
}

AppKeyValidator.prototype.validateWithHost = function(host, appGuid, appKey, callback) {
  var apiUrl = joinHostAndPath(host, this.cfg.appkey_validate_path);
  var self = this;

  request({
    uri: apiUrl,
    method: 'POST',
    json: {
      type: 'app',
      key: appKey,
      appId: appGuid
    }
  }, function(err, response, body) {
    var valid = false;
    if (!err && response && response.statusCode === 200) {
      if (body && ("ok" === body.status)) {
        valid = body.valid;
      } else {
        self.logger.error("Error from Millicore: appkeys.validateithHost(host: " + host + ", appid: " + appGuid + ", appKey: " + appKey + ") - err: " + JSON.stringify(err) + " , statusCode: " + (response?response.statusCode:"") + ", body: " + JSON.stringify(body));
      }
      self.logger.debug("appkeys.validateithHost(host: " + host + ", appid: " + appGuid + ", appKey: " + appKey + ") - " + ((valid)?"valid":"INVALID"));
    } else {
      self.logger.error("Error from Millicore: appkeys.validateithHost(host: " + host + ", appid: " + appGuid + ", appKey: " + appKey + ") - err: " + JSON.stringify(err) + " , statusCode: " + (response?response.statusCode:"") + ", body: " + JSON.stringify(body));
    }
    return callback(err, valid);
  });
};

AppKeyValidator.prototype.cacheResult = function(keyInfo, valid, cb) {
  //db update
  this.db.update(APPKEY_CACHE_COLLECTION, {_id:keyInfo}, {_id:keyInfo, valid: valid}, true, function(err) {
    return cb(err);
  });
};

AppKeyValidator.prototype.getCachedValidationResult = function(keyInfo, cb) {
  var self = this;
  var query = {
    _id: keyInfo
  };
  //db read
  this.db.find(APPKEY_CACHE_COLLECTION, query, function(err, results) {
    var incache = false;
    var valid = false;
    var result;
    self.logger.debug("err: " + JSON.stringify(err) + ", results: " + JSON.stringify(results));
    if (!err) {
      result =  (!results) ? null : results[0];
      if (result) {
        incache = true;
        valid = result.valid;
      }
    }
    return cb(err, incache, valid);
  });
};

AppKeyValidator.prototype.getClusterHostFromId = function(clusterId, cb) {
  async.detect(this.cfg.clusters, function(item, cb) {
    return cb(item.clusterId === clusterId);
  }, function(result) {
    return cb(undefined, (result)?result.host:null);
  });
};

exports.splitKeyInfo = splitKeyInfo;
exports.AppKeyValidator = AppKeyValidator;
