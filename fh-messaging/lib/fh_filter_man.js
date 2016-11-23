//
// FeedHenry Metrics Manager
//
// Responsible for producing rolled up metrics data
// and writing messages to log files
//
// jslint node: true, sub: false, white: false, maxerr: 50, indent: 2

"use strict";
var async = require('async');
var crypto = require('crypto');
var helpers = require('./helpers.js');
var geoip = require('geoip');
var City = geoip.City;
var net = require('net');
var Netmask = require('netmask').Netmask;
var _ = require('underscore');
var semver = require('semver');

var filters, mLogger, country;

var netMasks;

var MD5 = function(str) {
  return crypto.createHash('md5').update(str).digest('hex');
};

var generateID = function(message) {
  return MD5(JSON.stringify(message)) + "_" + helpers.getDatePart(message);
};

var do_geoip = function(ip, cb) {
  return country.lookup(ip, cb);
};

var filterFuncs = {
  MD5: function(message, cb) {
    var filtered = message;
    if (!filtered.MD5) {
      filtered.MD5 = generateID(filtered);
    }
    return cb(null, filtered);
  },
  Geoip: function(message, callback) {
    var filtered = message, fi, fl, ft, fields, ip;
    fields = filters.Geoip.fields;
    for (fi = 0, fl = fields.length; fi < fl; fi += 1) {
      ft = fields[fi];
      ip = message[ft];
      if ('undefined' !== typeof ip) {
        break;
      }
    }

    if (ip) {
      ip = getLastValidIP(ip);
      mLogger.debug('calling do_geoip: ' + JSON.stringify(ip));
      do_geoip(ip, function(err, country) {
        mLogger.debug("callback from geoip. Err: " + JSON.stringify(err) + ", country: " + JSON.stringify(country));
        if (!err) {
          filtered.country = country;
        } else {
          mLogger.warn("Error from geoip lookup: " + JSON.stringify(err) + ", continuing anyway with no country for ip: " + ip);
        }
        return callback(null, filtered);
      });
    } else {
      return callback(null, filtered);
    }
  },
  AppFields: function(message, callback) {
    mLogger.debug('AppFields filter :: msg : ' + JSON.stringify(message));
    var filtered = message;
    if (message['appid'] && message['app_version']) {
      if (_.has(filters.AppFields, message['appid'])) {
        _.each(filters.AppFields[message['appid']], function(rule) {
          if (_.has(message, rule.field)) {
            var msg_app_version = message['app_version'] + '.0.0';
            if (semver.valid(msg_app_version)) {
              if (semver.satisfies(msg_app_version, rule.version + '.0.0')) {
                mLogger.info('AppFields filter :: Message being modified : ' + rule.field + ' = ' + rule.value);
                filtered[rule.field] = rule.value;
              }
            } else {
              mLogger.debug('AppFields filter :: Message app_version invalid : ' + message['app_version']);
            }
          }
        });
      }
    } else {
      mLogger.debug('AppFields filter :: Message does not contain both an appid and app_version field.');
    }
    return callback(null, filtered);
  },
  Destinations: function(message, callback) {
    mLogger.debug('Destination filter :: msg : ' + JSON.stringify(message));
    var filtered = message;
    var validDestinations;
    if (filters.Destinations && filters.Destinations.validDestinations && _.isArray(filters.Destinations.validDestinations) && filters.Destinations.validDestinations.length > 0) {
      validDestinations = filters.Destinations.validDestinations;
    }
    if (validDestinations && message['destination']) {
      var messageDest = message['destination'];
      if (_.indexOf(validDestinations, messageDest.toLowerCase()) === -1) {
        //the destination is not valid, replace it with "other"
        mLogger.debug('Destination filter :: Message being modified : destination : ' + messageDest + ' => other');
        filtered['original_destination'] = messageDest;
        filtered['destination'] = filters.Destinations.categoryForOthers;
      }
    }
    return callback(null, filtered);
  }
};

function buildNetMasks(exclList) {
  var masks = [];
  var mask;
  var i;
  for (i = 0; i < exclList.length; i += 1) {
    mask = new Netmask(exclList[i]);
    masks.push(mask);
  }
  netMasks = masks;
}

function inBlockList(thisOne, masks) {
  var i, len=0;
  if (masks) {
    len = masks.length;
  }

  for (i = 0; i < len; i += 1) {
    if (masks[i].contains(thisOne)) {
      return true;
    }
  }
  return false;
}

// return the last valid ip address in the passed str param
// a valid ip is an IP address that is not in one of the excluded ranges
function getLastValidIP(str) {
  var ip = "127.0.0.1";
  var strs = str.split(',');
  var l = strs.length - 1;
  for (;l >= 0; l -= 1) {
    var thisOne = strs[l].trim();
    if (thisOne && net.isIPv4(thisOne) && (!inBlockList(thisOne, netMasks))) {
      ip = thisOne;
      break;
    }
  }
  return ip;
}

var filterOneAsync = function(message, cb) {
  var fKey;
  var filterFunctions = [];

  filterFunctions.push(function(callback) {
    return callback(null, message);
  });

  for (fKey in filters) {
    if (filters.hasOwnProperty(fKey)) {
      filterFunctions.push(filterFuncs[fKey]);
    }
  }

  async.waterfall(filterFunctions, cb);
  return;
};


// constructor
function FilterManager(config, logger) {
  filters = config.filters;
  mLogger = logger;
  country = new City(config.geoip.dataFile);
  if (!netMasks) {
    buildNetMasks(config.ipFilter.excludes);
  }
}

// public functions
FilterManager.prototype.filterAsync = function(messages, cb) {
  async.map(messages, filterOneAsync, cb);
  return;
};

FilterManager.prototype.generateID = function(message) {
  return generateID(message);
};

// expose getLastValidIP() for testing
exports.getLastValidIP = getLastValidIP;
exports.buildNetMasks = buildNetMasks;
// Make the constructor available externally
exports.FilterManager = FilterManager;
