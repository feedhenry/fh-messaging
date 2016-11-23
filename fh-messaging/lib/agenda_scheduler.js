var Agenda = require('fh-agenda');
var os = require('os');

/**
 * Starts scheduled (agenda) jobs processing,
 *
 * agenda can be disabled in configuration,
 * the list of jobs to be performed by given node is specified in configuration.
 *
 * Jobs are stored under ./jobs/ directory and referenced by job_name (corresponding to job_name in configuration).
 *
 * Sample configuration:
 *
 * {
 *   agenda: {
 *     enabled: true,
 *     jobs: {
 *       job_name: {
 *         // job configuration
 *       }
 *     }
 *   }
 * }
 *
 * @param logger fh-logger instance
 * @param config configuration for this fh-messaging process
 * @param db the MongoDB database that agenda jobs will be stored in
 * @returns {{tearDown: Function}}
 */
module.exports = function( logger, config, db ) {

  var agenda;

  if (config.agenda && !config.agenda.enabled ) {
    logger.info( 'Agenda is disabled, skipping' );
  } else {
    var jobTypes = ( config.agenda && config.agenda.jobs ) ? Object.keys(config.agenda.jobs) : [];

    if ( !jobTypes.length ) {
      logger.info( 'No Agenda jobs specified, skipping' );
    } else {
      logger.info( 'Setting up Agenda' );
      agenda = new Agenda({defaultConcurrency: 1});
      agenda
        .name( os.hostname + '-' + process.pid )
      // default collection name is 'agendaJobs'
        .mongo( db );
      jobTypes.forEach( function( type ) {
        logger.info( 'Setting up job type ' + type);
        require( './jobs/' + type )( logger, config, agenda, db).setUp();
      });
      agenda.start();
      logger.info( 'Agenda set up' );
    }
  }

  // Public API
  return {
    /**
     * Stops the job queue processing and unlocks currently running jobs.
     *
     * If agenda wasn't set up, calls callback immediately.
     *
     * @param callback called when agenda is stopped
     */
    tearDown: function( callback ) {
      if ( agenda && agenda.stop ) {
        logger.info('Attempting to stop Agenda job queue for graceful shutdown');
        agenda.stop();
        callback();
      } else {
        callback();
      }
    }
  };
};
