// fhmsg module, responsible for logging messages in fhmsgsrv, etc.
//
var util = require('util');
var async = require('async');
var fhdb = require('fh-db');
var fhfm = require('./fh_filter_man.js');
var helpers = require('./helpers.js');
var EventEmitter = require('events').EventEmitter;

//
// Main Messaging constructor function..
//
function Messaging(cfg, logr, callback) {
  this.config = cfg;
  this.logger = logr;
  this.filterMan = new fhfm.FilterManager(this.config, this.logger);
  this.whitelist = null;
  var self = this;

  this.database = new fhdb.Database(this.config.database.host, this.config.database.port, this.config.database.options, this.config.retryConfig);
  this.database.name = this.config.database.name;

  self.database.on('tearUp', function() {
    self.logger.info('Database opened');
    if ('function' === typeof callback) { // jshint ignore:line
      return callback(undefined, self.database);
    }
  });

  self.logger.info('tearUp db');
  this.database.tearUp(this.config.database.auth);
}

util.inherits(Messaging, EventEmitter);

function createTimer(name) {
  return {
    name: name,
    startTime: Date.now()
  };
}

function finishTimer(timer, logger) {
  timer.finishTime = Date.now();
  timer.duration = timer.finishTime - timer.startTime;

  if (logger) {
    logger.debug("Timer " + timer.name + " finished after " + timer.duration + " milliseconds");
  }

  return timer;
}

//
// Public functions
//
//
// Logs a message to the Message Server Database. The 'topic' currently
// maps to a mongo collection. The actual collection name will have a date
// suffix added so that there will be a collection per-topic per-day
//
Messaging.prototype.logMessage = function(topic, msg, callback) {
  var self = this;

  if (!(msg instanceof Array)) {
    msg = [msg];
  }

  var timerFilter = createTimer('applyFilters');
  self.filterMan.filterAsync(msg, function() {
    finishTimer(timerFilter, self.logger);

    async.forEachSeries(msg, function(item, cb) {
      var collectionName = helpers.constructCollectionName(item, topic);
      self.createTopicIfNotExists(collectionName, function(err) {
        if (err) {
          return cb(err);
        }
        self.database.create(collectionName, item, cb);
      });
    }, function(err) {
      callback(err, msg);
    });
  });
};

//
// Public functions
//
//
// Logs a message to the Message Server Database. The 'topic' currently
// maps to a mongo collection. The actual collection name will have a date
// suffix added so that there will be a collection per-topic per-day
//
Messaging.prototype.deadletter = function(topic, msgs, callback) {
  var self = this;

  if (!(msgs instanceof Array)) {
    msgs = [msgs];
  }

  var collectionName = self.config.messaging.unauthorisedMessagesCollection.name;     //"BoundedDeadLetterCollection";
  var maxSize = self.config.messaging.unauthorisedMessagesCollection.maxSize;
  var maxEntries = self.config.messaging.unauthorisedMessagesCollection.maxEntries;

  self.createBoundedTopicIfNotExists(collectionName, maxSize, maxEntries, function(err) {
    if (err) {
      return callback(err);
    }
    async.forEachSeries(msgs, function(item, cb) {
      self.database.create(collectionName, {topic: topic, msg: item}, cb);
    }, function(err) {
      callback(err);
    });
  });
};

Messaging.prototype.createBoundedTopicIfNotExists = function(collectionName, maxSize, maxEntries, callback) {
  var self = this;
  this.database.collectionExists(collectionName, function(err, exists) {
    if (err) {
      return callback(err);
    }
    if (!exists) {
      self.database.createCollectionWithOptions(collectionName, {capped: true, size: maxSize, max: maxEntries}, callback);
    } else {
      callback(null);
    }
  });
};

//
// Get a single message from teh database, given the md5 'id' of the message.
//
Messaging.prototype.getMessage = function(topic, md5, callback) {

  if (this.logger) {
    this.logger.debug("trying to get message id: " + md5 + " nad topic " + topic + " from database");
  }

  var collectionName = helpers.getCollectionNameFromTopicAndId(topic, md5);
  var query = { MD5 : md5 };

  this.database.find(collectionName, query, function(err, msgs) {
    var msg =  (!msgs) ? null : msgs[0];
    return callback(err, msg);
  });
};

//
// Get messages, feeds in to mongodb.find()
// https://github.com/christkv/node-mongodb-native/blob/master/lib/mongodb/collection.js
// Currently returns messages as an array..
//
Messaging.prototype.getMessages = function(topic, query, callback) {
  this.database.find(topic, query, callback);
};

Messaging.prototype.getEachTopicMessage = function(topic, query, callback) {
  this.database.findWithSelectionCursor(topic, query.dateQuery, {}, {}, function(err, cursor) {
    if (err) {
      return callback(err, cursor);
    }
    if (query.groupQuery) {
      cursor.sort(query.groupQuery).each(callback);
    } else {
      cursor.sort().each(callback);
    }
  });
};

Messaging.prototype.getGroupsList = function(collectionName, key, query, callback) {
  this.database.distinct(collectionName, key, query, callback);
};

Messaging.prototype.getGroupedMessages = function(topic, query, callback) {
  this.database.group(topic, query, callback);
};

//
// Checks if messages exists, given the md5 'id' of the message.
// Callback with true if we have *all* the messages, false otherwise.
//
// This is implemented as find the first missing message - if none missing then
// we have all messages
Messaging.prototype.hasAllMessages = function(topic, md5s, callback) {
  var self = this;
  async.detectSeries(md5s, function(id, detectCallback) {
    var selector = {MD5 : id };
    var fields = {'fields' : [ 'MD5' ] };
    var collectionName = helpers.getCollectionNameFromTopicAndId(topic, id);
    self.database.findOne(collectionName, selector, fields, function(err, msg) {
      if (err) {
        // Still need to verify that detectSeries() is ok with the iterator callback not being called in error cases
        return callback(err, null);
      }
      detectCallback(null == msg); // eslint-disable-line eqeqeq
    });
  }, function(result) {
    var allExist = ('undefined' === typeof result) ? true: false;
    callback(null, allExist);
  });
};

//
// Deletes all messages for a topic.
//
/*
 * Commenting for two reasons: 1) its not working consistently, causing a random
 * failing test, so it needs some investigation 2) its a dangerous api call to
 * have and not needed anywhere outside the test suite
 * Messaging.prototype.deleteAllMessages = function(topic, callback) { var db =
 * newDB(this.config); db.open(function(err, client) { if (err) {callback(err);
 * return;} db.collection(topic, function(err, collection) { if (err)
 * {callback(err); db.close(); return;} collection.remove({}, {$atomic : true },
 * function(err, collection) { if (err) {callback(err); db.close(); return;}
 * db.close(); callback(err); }); }); }); }
 */

Messaging.prototype.createTopicIfNotExists = function(topic, callback) {
  var self = this;
  this.database.collectionExists(topic, function(err, exists) {
    if (err) {
      return callback(err);
    }
    if (!exists) {
      self.database.createCollectionWithIndex(topic, 'MD5', callback);
    } else {
      callback(null);
    }
  });
};

//
// Counts number of messages for a topic.
// Returns 0 if topic doesn't exist.
//
Messaging.prototype.countMessages = function(topic, callback) {
  var self = this;
  self.database.collectionExists(topic, function(err, exists) {
    if (err) {
      return callback(err, null);
    }
    if (!exists) {
      return callback(null, 0);
    }
    self.database.countCollection(topic, callback);
  });
};

//
// Get Topics, a topic is currently a mongo collection
// Returns an array of topics. Note the collection names
// returned from mongo have the database name prefixed,
// and also the 'system.indexes' is returned. These
// are filtered out..
//
Messaging.prototype.getTopics = function(callback) {
  this.database.collectionNames(function(err, names) {
    if (err) {
      return callback(err, null);
    }
    var topics = [];
    names.forEach(function(n) {
      if (!isUtilityCollection(n.name)) {
        topics.push(n.name.substring(n.name.lastIndexOf('.') + 1, n.name.length));
      }
    });
    callback(err, topics);
  });
};

// Determines whether given collection is a system collection (i.e. the collection that does not represent a topic)
function isUtilityCollection(collectionName) {
  if (collectionName.indexOf('system.indexes') > -1) {
    return true;
  }

  if (collectionName.indexOf('agendaJobs') > -1) {
    return true;
  }

  return false;
}

//
// Filter the existing messages from new messages..
// Note 'msgs' can be a single message or an array of messages.
// Callback takes two arrays, one of the list of existing messages, the other
// the
// list of new messages..
// See Mongo documentation for more info:
// http://www.mongodb.org/display/DOCS/Advanced+Queries
//
Messaging.prototype.filterExistingMessagesSingleDay = function(topic, messages, callback) {
  // First convert msgs to an Array to work with if its not already..
  var self = this, msgs;
  if (messages instanceof Array) {
    msgs = messages;
  } else {
    msgs = [];
    msgs.push(messages);
  }

  // Query based on the following mongo shell command:
  // db.log.find({MD5: {$in: ['0227dcdac6f4bf1bc43a7c85947e4744']}}, {MD5:1,
  // _id:0});
  var query = {};
  var inn = {};
  var selection = {};
  selection.MD5 = 1;
  selection._id = 0;
  var md5s = [];

  for (var i = 0; i < msgs.length; i++) {
    if ('undefined' === typeof msgs[i].MD5) {
      //md5s.push(self.filterMan.MD5(JSON.stringify(msgs[i])));
      md5s.push(self.filterMan.generateID(msgs[i]));
    } else {
      md5s.push(msgs[i].MD5);
    }
  }

  inn.$in = md5s;
  query.MD5 = inn;

  this.database.findWithSelection(topic, query, {}, selection, function(err, existingMsgs) {
    if (err) {
      return callback(err, null);
    }
    //
    // We now have the existing messages..
    // Create a new array of just the new messages
    //
    var newMsgs = [];
    msgs.forEach(function(msg) {
      var md5 = ('undefined' === typeof msg.MD5) ? self.filterMan.generateID(msg) : msg.MD5;
      var found = false;
      existingMsgs.forEach(function(existingMsg) {
        if (existingMsg.MD5 === md5) {
          found = true;
        }
      });
      if (!found) {
        newMsgs.push(msg);
      }
    });
    callback(err, existingMsgs, newMsgs);
  });
};

Messaging.prototype.loadFilterWhiteList = function(whitelist, callback) {
  this.whitelist = whitelist;
  return callback(null, this.whitelist);
};

// callback take 1 param of true or false
Messaging.prototype.isWhiteListed = function(topicName, msg, callback) {
  if (this.whitelist) {
    helpers.isWhiteListed(this.whitelist, topicName, msg, callback);
  } else { // whitlist not configured, so default to whitelisted message
    return callback(true);
  }
};

//
// Filter the existing messages from new messages..
// Note 'msgs' can be a single message or an array of messages.
// Callback takes two arrays, one of the list of existing messages, the other
// the
// list of new messages..
// See Mongo documentation for more info:
// http://www.mongodb.org/display/DOCS/Advanced+Queries
//
Messaging.prototype.filterExistingMessages = function(topic, messages, callback) {
  // First convert msgs to an Array to work with if its not already..
  var self = this, msgs;

  if (messages instanceof Array) {
    msgs = messages;
  } else {
    msgs = [];
    msgs.push(messages);
  }

  async.filter(
    msgs,
    (function(topicName) {
      return function(currMessage, filterIteratorCallback) {
        return self.isWhiteListed(topicName, currMessage, filterIteratorCallback);
      };
    })(topic),
    function(whiteListedMessages) {
      var existingMsgs = [], newMsgs = [];
      var dailyMsgs = helpers.groupMsgsByDay(whiteListedMessages);

      async.forEach(dailyMsgs, function(item, cb) {
        self.filterExistingMessagesSingleDay(topic + "_" + item.key, item.values, function(err, existingPerDay, newPerDay) {
          var i, len;
          if (err) {
            self.logger.error("ERROR: err: " + JSON.stringify(err) + ", existing: " + JSON.stringify(existingPerDay) + ", new: " + JSON.stringify(newPerDay));
            return cb(err);
          }
          for (i = 0, len = existingPerDay.length; i < len; i += 1) {
            existingMsgs.push(existingPerDay[i]);
          }
          for (i = 0, len = newPerDay.length; i < len; i += 1) {
            newMsgs.push(newPerDay[i]);
          }
          cb();
        });
      }, function(err) {
        callback(err, existingMsgs, newMsgs);
      });
    });
};

Messaging.prototype.checkStatus = function(cb) {
  var self = this;
  self.database.checkStatus(cb);
};

Messaging.prototype.tearDown = function(cb) {
  this.logger.info('Stopping Messaging');
  if (this.database) {
    this.database.tearDown();
  }
  cb();
};

exports.Messaging = Messaging;
