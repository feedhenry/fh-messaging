var async = require('async');
var request = require('request');

var args = require('optimist')
  .demand('m').alias('m', 'messageServer').describe('m', 'URL to the message server e.g. https://e103-stg-pooled-01.feedhenry.net:8803')
  .alias('n', 'messageNumber').describe('n', 'initial value of message number').default('n', 1)
  .argv;

//var logMessageURL = 'https://testing.feedhenry.me:8803/msg/TOPIC';
var logMessageURL = args.messageServer + "/msg/TOPIC";

var msgNum = args.messageNumber;

var msgTemplate = {
  topic: 'fhact',
  appID: '123456789099999999901234',
  instanceID: '123456789099999999904321',
  domain: 'testing',
  cluster: 'development',
  ip: "193.1.184.10",       // Ireland
  destination: 'iphone',
  host: 'lon3app1',
  cuid: '123456789055555678901234'
};

// this could be modified to add data specific to message types
function addMsgSpecifics(msg, app, outputMsg) {
  outputMsg.guid = app.instanceID;
  outputMsg.appid = app.appID;
  outputMsg.cuid = app.cuid;
  outputMsg.destination = app.destination;
}

function generateMsg(msg, app, currTime) {
  var d = new Date(currTime);
  msgNum += 1;
  var outputMsg = {
    _ts: currTime,
    _mn: msgNum,
    _cl: app.cluster,
    _ho: app.host,
    ipAddress: app.ip,
    domain: app.domain
  };
  addMsgSpecifics(msg, app, outputMsg);
  return outputMsg;
}

var logMessages = function (topic, msg, cb) {
  var self = this;

  var apiToCall = logMessageURL.replace(/TOPIC/g, topic);
  var startTime = Date.now();
  request({
    uri: apiToCall,
    method: 'POST',
    json: msg
  }, function (error, response, body) {    
    var endTime = Date.now();

    var ret = {
      timing: {},
      status: "unknown",
      message: ""
    };

    var status;
    if (!error && response && response.statusCode === 200) {
      ret.status = "ok";
      ret.message = body;
    } else {
      ret.status = "error";
      ret.message = "Error logging message, error: " + JSON.stringify(error) + ", statusCode: " + ((response)?response.statusCode:"no response") + ", body: " + body;
    }

    ret.timing.startTime = startTime;
    ret.timing.endTime = endTime;
    ret.timing.duration = endTime - startTime;

    return cb(error, ret);
  });
};

function sendOneMessage(cb) {
  var msg = generateMsg(msgTemplate.topic, msgTemplate, Date.now());
  logMessages(msgTemplate.topic, msg, cb);
}

function sendXMessages(num, cb) {
  var i;
  var msgs = [];
  for(i = 0; i < num; i += 1) {
    msgs.push(generateMsg(msgTemplate.topic, msgTemplate, Date.now()));
  }
  logMessages(msgTemplate.topic, msgs, cb);
}

async.timesSeries(50, function (id, cb) {
  async.series([
    sendOneMessage,
    function (cb) {
      sendXMessages(50, cb);
    }
  ], function (err, results) {
    return cb(err, results);
    // if(err) {
    //   console.log("ERROR:", err);
    // }
    // console.log("RESULTS:", results);
  });  
}, function (err, results) {
    if(err) {
      console.log("ERROR:", err);
    }
    var i; len=(results)?results.length:0;
    for (i = 0; i < len; i += 1) {
      var j;
      var str = "RESULTS[" + i + "]:";
      for (j = 0; j < results[i].length; j += 1) {
        str += "" + ((j===0)?"  1: ":" 50: ") + results[i][j].status + " - " + JSON.stringify(results[i][j].timing) + ", ";
      }
      console.log(str);
    }
  }
);

