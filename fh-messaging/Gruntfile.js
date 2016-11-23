module.exports = function(grunt) {
  'use strict';

  // Just set shell commands for running different types of tests
  grunt.initConfig({
    _test_runner: 'whiskey',
    _unit_tests: [
      'test/handlers/test_receive_rolled_up_metrics.js',
      'test/jobs/test_metrics_rollup_job.js',
      'test/unit/mongo_functions/test_metrics_domain.js',
      'test/unit/mongo_functions/test_metrics_geo.js',
      'test/unit/mongo_functions/test_metrics_geo_domain.js',
      'test/unit/mongo_functions/test_metrics_geo_trans.js',
      'test/unit/mongo_functions/test_metrics_r.js',
      'test/unit/mongo_functions/test_metrics_r_trans.js',
      // test failure from: 'test/unit/mongo_functions/test_metrics_temptrans_app.js',
      // test failure from: 'test/unit/mongo_functions/test_metrics_temptrans_domain.js',
      'test/unit/mongo_functions/test_map_counter_per_domain_per_day.js',
      'test/unit/mongo_functions/test_map_counter_per_domain_per_day_per_owner.js',
      'test/unit/mongo_functions/test_map_counter_per_domain_per_day_per_owner_per_country.js',
      'test/unit/mongo_functions/test_map_counter_per_domain_per_day_per_country.js',
      'test/unit/mongo_functions/test_map_counter_per_domain_per_destination_per_day.js',
      'test/unit/mongo_functions/test_map_counter_per_domain_per_destination_per_day_per_country.js',
      'test/unit/mongo_functions/test_map_counter_per_logindomain_per_day.js',
      'test/unit/mongo_functions/test_map_counter_per_logindomain_per_day_per_country.js',
      'test/unit/mongo_functions/test_map_counter_per_logindomain_per_email_per_day.js',
      'test/unit/mongo_functions/test_map_counter_per_logindomain_per_email_per_day_per_country.js',
      'test/unit/mongo_functions/test_metrics_trans.js',
      'test/unit/mongo_functions/test_metrics_active_device_app.js',
      'test/unit/mongo_functions/test_metrics_active_device_domain.js',
      'test/unit/mongo_functions/test_metrics_reduce_active_device.js',
      'test/unit/mongo_functions/test_metrics_active_device_app_geo.js',
      'test/unit/mongo_functions/test_metrics_active_device_domain_geo.js',
      'test/unit/mongo_functions/test_metrics_reduce_active_device_geo.js'
    ],
    _functional_tests:[
      'test/integrate/jobs/test_metrics_rollup_job.js',
      'test/integrate/services/test_metrics_service.js',
      'test/integrate/services/test_rollup_audit.js',
      'test/integrate/test_agenda_integration.js',
      'test/integrate/test_agenda_scheduler.js',
      'test/integrate/test_appkeys.js',
      'test/integrate/test_fhsrv.js',
      'test/integrate/test_fhmsg.js',
      'test/integrate/test_helpers.js',
      'test/integrate/test_fh_filter_man.js',
      'test/integrate/test_fh_metrics_man_gen_metrics.js',
      'test/integrate/test_fh_metrics_man_gen_metrics_geoip.js',
      'test/integrate/test_fh_metrics_man_gen_metrics_installs_and_startups.js',
      'test/integrate/test_fh_metrics_man_gen_metrics_per_domain.js',
      'test/integrate/test_fh_metrics_man_logs.js'
    ],
    _unit_args: '--real-time --report-timing --failfast --timeout 50000 --tests "<%= _unit_tests.join(\' \') %>"',
    _integrate_args: '--real-time --report-timing --failfast --timeout 50000 --tests "<%= _functional_tests.join(\' \') %>"',

    // These are the properties that grunt-fh-build will use
    unit: '<%= _test_runner %> <%= _unit_args %>',
    integrate: '<%= _test_runner %> <%= _integrate_args %>',
    unit_cover: 'istanbul cover --dir cov-unit <%= _test_runner %> -- <%= _unit_args %>',
    accept_cover: ['istanbul cover --dir cov-accept <%= _test_runner %> -- <%= _integrate_args %>'],
    "fhinclude":["config/fileimportconfig.sh"]
  });

  grunt.loadNpmTasks('grunt-fh-build');
  grunt.registerTask('default', ['fh-default']);
};
