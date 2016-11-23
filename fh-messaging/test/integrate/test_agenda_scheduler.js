var sinon = require('sinon');
var proxyquire = require('proxyquire');
var fhlogger = require('fh-logger');
var logger = fhlogger.createLogger({ name: 'test_metrics_rollup_job'});
sinon.spy( logger, 'info' );
sinon.spy( logger, 'error' );

var MockAgenda, tearDownCallback;

exports.setUp = function ( setUp ) {
  MockAgenda = sinon.spy(function() {
  });
  MockAgenda.prototype.name = sinon.spy(function() { return this; });
  MockAgenda.prototype.mongo = sinon.spy(function() { return this; });
  MockAgenda.prototype.start = sinon.spy(function() {});
  MockAgenda.prototype.stop = sinon.spy(function() {});

  tearDownCallback = sinon.spy();
  setUp.finish();
};


exports.test_disabled = function ( test, assert ) {
  var agendaScheduler = proxyquire('../../lib/agenda_scheduler', {
    'fh-agenda': MockAgenda
  });
  var config = { agenda: { enabled: false }};

  var schedulerInstance = agendaScheduler(logger, config, {});
  assert.ok(!MockAgenda.called);

  schedulerInstance.tearDown(tearDownCallback);
  assert.ok(tearDownCallback.called);

  test.finish();
};

exports.test_no_jobs = function ( test, assert ) {
  var agendaScheduler = proxyquire('../../lib/agenda_scheduler', {
    'fh-agenda': MockAgenda
  });
  var config = { agenda: {
    enabled: true,
    jobs: {}
  }};

  var schedulerInstance = agendaScheduler(logger, config, {});
  assert.ok(!MockAgenda.called);

  schedulerInstance.tearDown(tearDownCallback);
  assert.ok(tearDownCallback.called);

  test.finish();
};

exports.test_two_jobs = function ( test, assert ) {

  var config, agendaScheduler, job1, job2;

  function verifyJobArgs( l, c, a ) {
    assert.strictEqual( l, logger );
    assert.strictEqual( c, config );
    assert.ok( a instanceof MockAgenda );
    return{
      "setUp":function (){

      }
    }
  }

  job1 = sinon.spy(verifyJobArgs);
  job1['@noCallThru'] = true;

  job2 = sinon.spy(verifyJobArgs);
  job2['@noCallThru'] = true;

  agendaScheduler = proxyquire('../../lib/agenda_scheduler', {
    'fh-agenda': MockAgenda,
    './jobs/job1': job1,
    './jobs/job2': job2
  });
  config = { agenda: {
    enabled: true,
    jobs: {
      job1: {},
      job2: {}
    }
  }};

  var schedulerInstance = agendaScheduler(logger, config, {});
  assert.ok(MockAgenda.called);
  assert.ok(job1.called);
  assert.ok(job2.called);
  assert.ok(MockAgenda.prototype.start.called);

  var tearDown = sinon.spy(function() {
    assert.ok(MockAgenda.prototype.stop.called);
  });


  schedulerInstance.tearDown(tearDown);
  assert.ok(tearDown.called);
  assert.ok(MockAgenda.prototype.stop.called);

  test.finish();
};
