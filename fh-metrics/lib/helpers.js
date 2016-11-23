var async = require('async');

/*
 * Helper functions
 */

function prefixZeroIfReq(val) {
  val = val.toString();
  return val.length > 1 ? val : '0' + val;
}

function parseMonth(month) {
  return prefixZeroIfReq(month + 1);
}

function parseDate(date) {
  return prefixZeroIfReq(date);
}

function toYYYYMMDD(ts) {
  var tsDate = new Date(ts);
  var ret = tsDate.getFullYear() + parseMonth(tsDate.getMonth()) + parseDate(tsDate.getDate());
  return ret;
}

// return the default date for a non-timestamped message;
// currently set up to return 0 (i.e. 1970-01-01T00:00:00) to be obvious that there are non-timestamped messages
// being logged
// TODO consider if we should use "now" for this instead
//
// TODO Warning Millicore has a copy of thes functions in org.tssg.millicore.messaging.ApacheMessageManager
//
function getDefaultDateForMessage() {
  return 0;
}

function getDatePart(msg) {
  var ts = (msg._ts)?msg._ts:getDefaultDateForMessage();
  return toYYYYMMDD(ts);
}
// TODO Warning Millicore has a copy of thes functions in org.tssg.millicore.messaging.ApacheMessageManager

//
// return the collection name to use for a particular topic and message
// collectionname will be the topic name, underscore, and message date, in format "topic_YYYYMMDD"
//
var constructCollectionName = function(msg, topic) {
  var datePart = getDatePart(msg);
  return topic + "_" + datePart;
};

// find index of array item with specified key proprerty
// if not found, return -1
function findKey(ary, key) {
  var i, len, foundIndex = -1;
  for (i = 0, len = ary.length; (i < len) && (foundIndex < 0); i += 1) {
    if (key === ary[i].key) {
      foundIndex = i;
    }
  }
  return foundIndex;
}

function groupMsgsByDay(msgs) {
  var i, len, msgDate, currentMsg, dailyMsgs, item;

  dailyMsgs = [];
  for (i = 0, len = msgs.length; i < len; i += 1) {
    currentMsg = msgs[i];
    msgDate = getDatePart(currentMsg);
    item = findKey(dailyMsgs, msgDate);
    if (item < 0) {
      dailyMsgs.push({key:msgDate, values: [currentMsg]});
    } else {
      dailyMsgs[item].values.push(currentMsg);
    }
  }
  return dailyMsgs;
}

function getCollectionNameFromTopicAndId(topic, id) {
  var idParts, datePart, collectionName;
  idParts = id.split('_');
  if ((idParts.length <= 1) || (idParts[idParts.length-1].length < 1)) {
    datePart = getDatePart({});
  } else {
    datePart = idParts[idParts.length-1];
  }
  collectionName = topic + "_" + datePart;
  return collectionName;
}

function equals(val1, val2, callback) {
  return callback(val1 === val2);
}

function isWhiteListed(whitelist, topicName, msg, callback) {
  if (whitelist[topicName]) {
    // if domain/appid specific restrictions
    if (whitelist[topicName].domain || whitelist[topicName].appid) {
      async.some(whitelist[topicName].domain, async.apply(equals, (msg.domain)?(msg.domain):""), function(domainWhiteListed) {
        if (domainWhiteListed) {
          return callback(true);
        } else {
          async.some(whitelist[topicName].appid, async.apply(equals, (msg.appid)?(msg.appid):""), callback);
        }
      });
    } else { // topic name whitelisted with no appid/domain restrictions
      return callback(true);
    }
  } else { // whitelist configured but topic not listed, so exclude
    return callback(false);
  }
}

// This can be used as a connect filter to set a _feedhenry object in a HTTP request
// if a valid api key header (and value) are used in a request
function fhApiKeyFilter(ignoreKey, headerName, apiKey, lgr) {
  return function(req, res, next) {
    lgr.debug("expected key: " + apiKey);
    lgr.debug("received key: " + (((req.headers) && (req.headers[headerName]))?req.headers[headerName]:""));
    if (!req._feedhenry) {
      req._feedhenry = {};
    }
    // if configured to ignored keys, then return as authorised
    if (ignoreKey) {
      req._feedhenry.auth = true;
      req._feedhenry.authType = 'apikey';
    } else {
      req._feedhenry.auth = ((req.headers) && (req.headers[headerName]) && (req.headers[headerName] === apiKey));
      req._feedhenry.authType = 'apikey';
    }
    next();
  };
}

function isValidAuth(req) {
  return req && req._feedhenry && (true === req._feedhenry.auth);
}

function isValidAuthApiKey(req) {
  return req && req._feedhenry && (true === req._feedhenry.auth) && ('apikey' === req._feedhenry.authType);
}

function getAppMbaasMetricCollections() {
  return ["apprequestsdest","apprequestsgeo",
    "apptransactionsdest","apptransactionsgeo", "appactivedevice", "appactivedevicegeo"];
}


function getDomainMbaasMetricCollections() {
  return ["domainrequestsdest","domainrequestsgeo",
    "domaintransactionsdest","domaintransactionsgeo", "domainactivedevice", "domainactivedevicegeo"];
}


exports.constructCollectionName = constructCollectionName;
exports.isWhiteListed = isWhiteListed;
exports.getCollectionNameFromTopicAndId = getCollectionNameFromTopicAndId;
exports.getDatePart = getDatePart;
exports.groupMsgsByDay = groupMsgsByDay;
exports.findKey = findKey;
exports.parseMonth = parseMonth;
exports.parseDate = parseDate;
exports.toYYYYMMDD = toYYYYMMDD;
exports.fhApiKeyFilter = fhApiKeyFilter;
exports.isValidAuth = isValidAuth;
exports.isValidAuthApiKey = isValidAuthApiKey;
exports.getDomainMbaasMetricCollections = getDomainMbaasMetricCollections;
exports.getAppMbaasMetricCollections = getAppMbaasMetricCollections;

