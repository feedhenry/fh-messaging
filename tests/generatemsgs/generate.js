var fs = require('fs');
var crypto = require('crypto');
var async = require('async');
var args = require('optimist')
  .demand('c').alias('c', 'config').describe('c', 'Config file to use (json) e.g. apps.json')
  .demand('y').alias('y', 'year').describe('y', 'Year to take messages for e.g. 2000')
  .demand('m').alias('m', 'month').describe('m', 'Month to take messages for (1-12)')
  .demand('d').alias('d', 'day').describe('d', 'Day to take messages for (1-31)')
  .demand('o').alias('o', 'output').describe('o', 'Name of output file')
  .boolean('v').alias('v', 'verbose').describe('v', 'verbose output to stderr')
  .argv;

var configFile = args.config;
var year = args.year;
var month = args.month;
var day = args.day;
var outputFileName = args.output;

function verboseError(str) {
	if (args.verbose) {
		process.stdout.write(str);
	}
};

verboseError('config: ' + configFile + "\n");
verboseError('date: ' + year + " " + month + " " + day + "\n");
verboseError('output' + " " + outputFileName + "\n");


var MILLIS_PER_DAY = 86400 * 1000;
var msgNum = 0;

var startDate = new Date(2013,02,27);
var startTime = startDate.getTime();
var endTime = startTime + MILLIS_PER_DAY;

var apps = require(configFile);

function pickRandom(ary) {
	var len = ary.length;
	var item = Math.floor((Math.random()*len));
	return ary[item];
}

function getRandomItem(app, defaultValue, aryFieldName) {
	var ret = defaultValue;
	if(app[aryFieldName]) {
		ret = pickRandom(app[aryFieldName]);
	}
	return ret;
}

function getCuid(app) {
	return getRandomItem(app, "defaultcuid", "cuids");
}

function getIPAddress(app) {
	return getRandomItem(app, "0.0.0.0", "ips");
}

function getHost(app) {
	return getRandomItem(app, "defaultHost", "hosts");
}

function getDestination(app) {
	return getRandomItem(app, "studio", "destinations");
}

function calcMsgInterval(numMsgsPerDay) {
  // MILLIS_PER_DAY / thisApp.msgs[msg]
  return Math.floor((MILLIS_PER_DAY-1) / numMsgsPerDay);
}

function generateMessageIntervals(apps, startTime) {
	console.log('generating intervals for each message:', apps);
	var i;
	var msg;
	var thisApp;

	for(i = 0; i < apps.length; i += 1) {
		thisApp = apps[i];
		thisApp.msgInterval = {};
		thisApp.msgNextTime = {};
		thisApp.msgNumSent = {};

		for(msg in thisApp.msgs) {
			thisApp.msgInterval[msg] = calcMsgInterval(thisApp.msgs[msg]);   // MILLIS_PER_DAY / thisApp.msgs[msg]
			thisApp.msgNextTime[msg] = startTime + thisApp.msgInterval[msg];
			thisApp.msgNumSent[msg] = 0;
		}
	}
	console.log('generating intervals for each message:', apps);
}

function md5(str) {
	return crypto.createHash('md5').update(str).digest('hex');	
}

function formatMessageForFile(msg, topic) {
  return {"MD5": md5(JSON.stringify(msg)), "message": msg, "topic": topic}
}

// this could be modified to add data specific to message types
function addMsgSpecifics(msg, app, outputMsg) {
  outputMsg.guid = app.instanceID;
  outputMsg.appid = app.appID;
  outputMsg.cuid = getCuid(app);
  outputMsg.destination = getDestination(app);
}

function outputMsg(msg, app, currTime, outputStream) {
	var d = new Date(currTime);
	msgNum += 1;
	var outputMsg = {
		_ts: currTime,
		_mn: msgNum,
		_cl: app.cluster,
		_ho: getHost(app),
		ipAddress: getIPAddress(app),
		domain: app.domain
	};
	addMsgSpecifics(msg, app, outputMsg);
	outputStream.write(JSON.stringify(formatMessageForFile(outputMsg, msg)) + "\n");
}

// this will be called a lot of times
function checkOutputRequired(currTime, apps, outputStream) {
	var i;
	var msg;
	var thisApp;
	for(i = 0; i < apps.length; i += 1) {
		thisApp = apps[i];
		for(msg in thisApp.msgs) {
			if(thisApp.msgNumSent[msg] < thisApp.msgs[msg]) {
				if(currTime >= thisApp.msgNextTime[msg]) {
					thisApp.msgNextTime[msg] = thisApp.msgNextTime[msg] + thisApp.msgInterval[msg];
					thisApp.msgNumSent[msg] += 1;
					outputMsg(msg, thisApp, currTime, outputStream);
				}				
			}
		}
	}
}

// this will be called a lot of times
function findNextScheduleOutput(apps, endTime) {
	var minTime = endTime;
	var msg;
	var thisApp;
	for(i = 0; i < apps.length; i += 1) {
		thisApp = apps[i];
		for(msg in thisApp.msgs) {
			if(thisApp.msgNumSent[msg] < thisApp.msgs[msg]) {
				if(thisApp.msgNextTime[msg] <= minTime) {
					minTime = thisApp.msgNextTime[msg];
				}				
			}
		}
	}
	return minTime;
}

function generate(startTime, endTime, apps, outputStream, cb) {
	generateMessageIntervals(apps, startTime);
	
	var currTime=startTime;
	async.whilst(function() {
		return currTime < endTime;
	}, function(callback) {
		verboseError("" + new Date(currTime) + "    \r");
		checkOutputRequired(currTime, apps, outputStream);
		currTime += 1;
		currTime = findNextScheduleOutput(apps, endTime);
		return callback();
	}, function(err) {
		console.log('debug: ', apps);
		console.log('Finished.');		
		if (cb) {
			return cb(err);
		}
	});
}

var stream = fs.createWriteStream(outputFileName);

generate(startTime, endTime, apps, stream, function (err) {
  stream.end();
  console.log('stream closed');
});
