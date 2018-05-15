var async = require('async');
var moment = require('moment');
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

// return the default date for a non timestamped message
// currently set up to return 0 (i.e. 1970-01-01T00:00:00) to be obvious that there are non-timestamped messages
// being logged
function getDefaultDateForMessage() {
  return 0;
}

function getDatePart(msg) {
  var ts = (msg._ts) ? msg._ts : getDefaultDateForMessage();
  return toYYYYMMDD(ts);
}

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
  var i, len, msgDate, currentMsg, dailyMsgs;

  dailyMsgs = [];
  for (i = 0, len = msgs.length; i < len; i += 1) {
    currentMsg = msgs[i];
    msgDate = getDatePart(currentMsg);
    var item = findKey(dailyMsgs, msgDate);
    if (item < 0) {
      dailyMsgs.push({key: msgDate, values: [currentMsg]});
    } else {
      dailyMsgs[item].values.push(currentMsg);
    }
  }
  return dailyMsgs;
}

function getCollectionNameFromTopicAndId(topic, id) {
  var idParts, datePart, collectionName;
  idParts = id.split('_');
  if ((idParts.length <= 1) || (idParts[idParts.length - 1].length < 1)) {
    datePart = getDatePart({});
  } else {
    datePart = idParts[idParts.length - 1];
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
      async.some(whitelist[topicName].domain, async.apply(equals, (msg.domain) ? (msg.domain) : ""), function(domainWhiteListed) {
        if (domainWhiteListed) {
          return callback(true);
        } else {
          async.some(whitelist[topicName].appid, async.apply(equals, (msg.appid) ? (msg.appid) : ""), callback);
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
function fhAppKeyFilter(ignoreKey, headerName, validatorObj, lgr) {
  return function(req, res, next) {
    var appkey = (((req.headers) && (req.headers[headerName])) ? req.headers[headerName] : "");
    lgr.debug("received app key: " + appkey);  // clusterid;appid;appkey
    if (!req._feedhenry) {
      req._feedhenry = {};
    }
    if (ignoreKey) {  // if configured to ignored keys, then return as authorised
      req._feedhenry.auth = true;
    }
    if (!req._feedhenry.auth) {
      validatorObj.validateAppKey(appkey, function(err, valid) {
        if (!err) {
          lgr.debug("checking app key returns: " + ((valid) ? "TRUE" : "FALSE"));
          req._feedhenry.auth = valid;
          req._feedhenry.authType = "appkey";
        } else {
          lgr.error('error checking app key: ' + JSON.stringify(err));
        }
        next();
      });
    } else {
      next();
    }
  };
}

// This can be used as a connect filter to set a _feedhenry object in a HTTP request
// if a valid api key header (and value) are used in a request
function fhApiKeyFilter(ignoreKey, headerName, apiKey, lgr) {
  return function(req, res, next) {
    lgr.debug("expected api key: " + apiKey);
    lgr.debug("received api key: " + (((req.headers) && (req.headers[headerName])) ? req.headers[headerName] : ""));
    if (!req._feedhenry) {
      req._feedhenry = {};
    }
    if (ignoreKey) {  // if configured to ignored keys, then return as authorised
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

function ignoreSomeErrs(err) {
  var retErr = err;
  if (retErr) {
    // Some errors need to be ignored:
    /**
     * Allow for a bug in the mongodb driver that doesn't support mapReduce syntax for
     * {"out": {"replace":<collectionName> ,"db":<dbToPutResultsIn>}}
     * We can ignore this because the result set that should be returned isn't used at the
     * moment. It's the callback when complete that's more important.
     * For more info see the mapReduce function in collection.js:517
     */
    if (retErr.message && (retErr.message.indexOf('collection name must be a String') >= 0)) {
      retErr = undefined;
    }

    // Also allow for collections not existing.  Just because some type of events didn't occur on a particular
    // day, we shouldn't abort, we should continue rolling up the events that did happen
    if (retErr && JSON.stringify(retErr).indexOf("ns doesn't exist") >= 0) {
      retErr = undefined;
    }
  }
  return retErr;
}

function daysAgo(numberOfDays) {
  var time = moment().subtract(numberOfDays, 'days');
  return {
    "START_OF_DAY": time.startOf('day').unix() * 1000,
    "END_OF_DAY": time.endOf('day').unix() * 1000,
    "HR_DATE": time.format("YYYY-MM-DD")
  };
}

function timeInfoForDate(date) {
  var time = moment(date);
  return {
    "START_OF_DAY": time.startOf('day').unix() * 1000,
    "END_OF_DAY": time.endOf('day').unix() * 1000,
    "HR_DATE": time.format("YYYY-MM-DD")
  };
}

function totalDaysBetweenDates(from, to) {
  var future = moment(to);
  var start = moment(from);
  return future.diff(start, 'days');
}

function daysAgoFromDate(date, daysAgo) {
  var time = moment(date).subtract(daysAgo, 'days');
  return {
    "START_OF_DAY": time.startOf('day').unix() * 1000,
    "END_OF_DAY": time.endOf('day').unix() * 1000,
    "HR_DATE": time.format("YYYY-MM-DD")
  };
}

function toDateFromYYYYMMDD( date_name ) {
  // get the date from the YYYYMMDD
  // get the YYYY substring
  var year = date_name.substring(0,4);
  // get the MM substring
  // month is 0 indexed
  var month = date_name.substring(4,6) - 1;
  // get the DD substring
  var day = date_name.substring(6, date_name.length);

  // construct and return a Date
  return new Date(year, month, day);
}

exports.toDateFromYYYYMMDD = toDateFromYYYYMMDD;
exports.constructCollectionName = constructCollectionName;
exports.isWhiteListed = isWhiteListed;
exports.getCollectionNameFromTopicAndId = getCollectionNameFromTopicAndId;
exports.getDatePart = getDatePart;
exports.groupMsgsByDay = groupMsgsByDay;
exports.findKey = findKey;
exports.parseMonth = parseMonth;
exports.parseDate = parseDate;
exports.toYYYYMMDD = toYYYYMMDD;
exports.fhAppKeyFilter = fhAppKeyFilter;
exports.fhApiKeyFilter = fhApiKeyFilter;
exports.isValidAuth = isValidAuth;
exports.isValidAuthApiKey = isValidAuthApiKey;
exports.ignoreSomeErrs = ignoreSomeErrs;
exports.daysAgo = daysAgo;
exports.timeInfoForDate = timeInfoForDate;
exports.totalDaysBetweenDates = totalDaysBetweenDates;
exports.daysAgoFromDate = daysAgoFromDate;
