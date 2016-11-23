var metrics = require('./test_mbaas_metrics.json');
var _ = require('underscore');
var randomstring = require('randomstring');
var IPHONE_CUIDS = [randomstring.generate(), randomstring.generate(), randomstring.generate(), randomstring.generate()];
var ANDROID_CUIDS = [randomstring.generate(), randomstring.generate(), randomstring.generate(), randomstring.generate()];
module.exports = {
  "getMbaasMetrics": function(mbaas){
    return mbaasMeticss(metrics[mbaas]);
  },
  "sumTotalMetricsForApp": function (metric,app){
    var mbaases = Object.keys(metrics);
    var totalsPerMbaas = _.map(mbaases,function (mbaas){
      return mbaasMeticss(metrics[mbaas]).sumMbaasMetricForApp(metric,app)
    });
    return totalMetrics(totalsPerMbaas);
  },
  "sumTotalMetricsForDomain": function (metric,domain){
    var mbaases = Object.keys(metrics);
    var totalsPerMbaas = _.map(mbaases,function (mbaas){
      return mbaasMeticss(metrics[mbaas]).sumMbaasMetricsForDomain(metric,domain)
    });
    return totalMetrics(totalsPerMbaas);
  },
  "getRawFhactData": function (time,projectid,appid, domain, iphone,android){

    var testData = [];

    var crypto = require('crypto');



    for(var i=0; i < iphone; i++){
      var timeStr = ""+time+Math.random();
      var hash = crypto.createHash('md5').update(timeStr).digest("hex");
      testData.push(    { "_cl": "development", "_ho": "fh", "_mn": 30, "_ts": time, "app_version": "21", "guid": projectid, "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": domain, "bytes": 98, "cached": false, "cuid": IPHONE_CUIDS[i%IPHONE_CUIDS.length], "destination": "iphone", "function": "getConfig", "appid": appid, "ipAddress": "192.168.28.35", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 206, "MD5": hash,
        "country" : {
        "country_name" : "Ireland",
        "country_code" : "IE",
        "country_code3" : "IRL",
        "continent_code" : "EU" }});
    }
    for(var j=0; j < android; j++){
      var timeStr = ""+time+Math.random();
      var hash = crypto.createHash('md5').update(timeStr).digest("hex");
      testData.push(    { "_cl": "development", "_ho": "fh", "_mn": 30, "_ts": time, "app_version": "21", "guid": projectid, "appkey": "57ed22d3e4b1a729705472b0cdda9ec25b608b53", "domain": domain, "bytes": 98, "cached": false, "cuid": ANDROID_CUIDS[j%ANDROID_CUIDS.length], "destination": "android", "function": "getConfig", "appid": appid, "ipAddress": "192.168.28.35", "scriptEngine": "node", "sdk_version": "FH_HYBRID_SDK/1.0.5", "status": 200, "time": 206, "MD5": hash,
        "country" : {
          "country_name" : "Ireland",
          "country_code" : "IE",
          "country_code3" : "IRL",
          "continent_code" : "EU" }});
    }

    return testData;
  },
  "getRawMbaasData": function(time,domain, appid, iphone, android){
    var cuids = {};
    cuids[randomstring.generate()] = {iphone:1};
    cuids[randomstring.generate()] = {android:1};
     return {
       "apprequestsdest": [
         {
           "_id": {
             "appid": appid,
             "domain": domain,
             "ts": time,
             "mbaas": "ppa4-mbaas-1"
           },
           "value": {
             "total": iphone + android,
             "iphone": iphone,
             "android":android
           }
         }
       ],
       "apptransactionsdest":[
         {
           "_id": {
             "appid": appid,
             "domain": domain,
             "ts": time,
             "mbaas": "ppa4-mbaas-1"
           },
           "value": {
             "iphone": iphone,
             "android": android
           }
         }
       ],
       "apptransactionsgeo":[
         { "_id" : {
           "appid" : appid,
           "domain" : domain,
           "ts" : time,
           "mbaas" : "ppa4-mbaas-1"
         },
           "value" : {
             "Ireland" : 2,
             "Czech Republic" : 1
           }
         }
       ],
       "appactivedevice": [
         { "_id" : {
           "appid" : appid,
           "domain" : domain,
           "ts" : time,
           "mbaas" : "ppa4-mbaas-1"
         },
           "value" : {
             cuids: cuids,
             total: 2
           }
         }
       ],
       "appactivedevicegeo":[
         { "_id" : {
           "appid" : appid,
           "domain" : domain,
           "ts" : time,
           "mbaas" : "ppa4-mbaas-1"
         },
           "value" : {
             "Ireland" : {cuids: cuids, total: 2},
             "Czech Republic" : {cuids: cuids, total: 2}
           }
         }
       ]
     };
  }
};


function totalMetrics(values){
  var totals = {};
  _.each(values,function (vals){
    var props = Object.keys(vals);
    _.each(props, function (prop){
      if (totals.hasOwnProperty(prop)){
        totals[prop]+= vals[prop];
      }else{
        totals[prop] = vals[prop]
      }
    });
  });

  return totals;
}

function mbaasMeticss(metrics){
  return{
    "getMetrics":function (){
      return metrics;
    },
    "sumMbaasMetricForApp": function (metric,app){
      var metricsOfType = metrics[metric];
      var metricsForApp = _.filter(metricsOfType, function (met){
        if (met._id && met._id.appid === app){
          return met;
        }
      });
      var values = _.map(metricsForApp, function (metric){
        return metric.value;
      });
      return totalMetrics(values);

    },
    "sumMbaasMetricsForDomain": function (metric,domain){
      var metricsOfType = metrics[metric];
      var metricsForDomain = _.filter(metricsOfType, function (met){
        if (met._id && met._id.domain === domain){
          return met;
        }
      });
      var values = _.map(metricsForDomain, function (metric){
        return metric.value;
      });
      return totalMetrics(values);

    },
    "getAppNameForMetric": function (metric){
      var app;
      _.each(metrics[metric], function (m){
        if(m._id && m._id.appid){
          app = m._id.appid
        }
      });
      if (! app ) throw new Error("did not find app for metric " + metric);
      return app
    },
    "getDomainNameForMetric": function (metric){
      var domain;
      _.each(metrics[metric], function (m){
        if(m._id && m._id.domain){
          domain = m._id.domain
        }
      });
      if (! domain ) throw new Error("did not find domain for metric " + metric);
      return domain
    }
  }
}
