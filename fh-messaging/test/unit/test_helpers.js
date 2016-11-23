
var undertest = require('../../lib/helpers');

exports.test_ignore_some_errors = function (test,assert){
  var ignoreThisError = "collection name must be a String";
  var err = undertest.ignoreSomeErrs({"message":ignoreThisError});
  assert.ok(!err,"did not expect an error");
  
  var ignoreThisasWell = "ns doesn't exist";
  var err = undertest.ignoreSomeErrs(ignoreThisasWell);
  assert.ok(!err,"did not expect an error");
  
  test.finish();
};


exports.test_time_for_date = function (test, assert){
  //test we get the start and end of the day for 2015-08-03
  var start = 1438560000000;
  var end = 1438646399000;
  var timeInfo = undertest.timeInfoForDate("2015-08-03");
  assert.ok(start === timeInfo.START_OF_DAY, "start should be equal");
  assert.ok(end === timeInfo.END_OF_DAY, "start should be equal");
  test.finish()
};

exports.test_total_Days_Between_Dates = function(test,assert){
  var time1 = undertest.daysAgo(0);
  var time2 = undertest.daysAgo(4);
  var days = undertest.totalDaysBetweenDates(time1.START_OF_DAY, time2.START_OF_DAY);
  assert.ok(days === 4 , "expected 4 days difference " +days);
  test.finish();
};
