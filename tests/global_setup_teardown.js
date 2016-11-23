
exports.globalSetUp  = function(test, assert) {
  //This gets run before all tests in the test run
  test.finish();
}

exports.globalTearDown = function(test, assert) {
  //This gets run after all tests in the test run
  test.finish();
}