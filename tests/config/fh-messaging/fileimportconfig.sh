#!/bin/sh
# directory where backup messages will be copied to and extracted
export METRICS_FILES_ROOT=/mnt/is1/metrics/metrics_raw
#
# Names of the appservers prefixed by their cluster names (e.g. CLUSTERNAME.SERVERNAME, lon3.lon3app1)
export METRICS_SERVERS_APPSERVER_NAMES="lon3.lon3app1 lon3.lon3app2 lon3.lon3app3 lon3.lon3app4 csg1.csg1app1 csg1.csg1app2 fdc1.fdc1app1 fdc1.fdc1app2"
#
# Names of the dynoservers prefixed by their cluster names (e.g. lon3.lon3dyno1)  These must be listed seperately to the appservers, since the backup files are in a different format
export METRICS_SERVERS_DYNOSERVER_NAMES="lon3.lon3dyno1 lon3.lon3dyno2 lon3.lon3dyno5 lon3.lon3dyno6 csg1.csg1dyno1 csg1.csg1dyno2 csg1.csg1dyno3 csg1.csg1dyno4"
#
# File containing the password for the GPG key to decrypt the backup message files
export GPG_KEY_PASSWORD_FILE=/etc/feedhenry/fh-messaging/password.txt
#
# metrics rollup command name
export FH_METRICS_CMD=fh-metrics-cli
#
# message batchimport command name
export FH_BATCH_IMPORT_CMD=fh-msg-batch-import
#
# messaging config files directory
export CONFIG_LOCATION=/etc/feedhenry/fh-messaging
