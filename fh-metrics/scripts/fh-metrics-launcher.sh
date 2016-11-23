#!/bin/bash
#
# Special helper script to be used in conjunction with /etc/init.d/fh-metrics
# to ensure log output (sent to stdout,stderr) from a daemonized script is accessible.
#
exec /usr/local/bin/fh-metrics $* >> /var/log/feedhenry/fh-metrics/fh-metrics-console.log 2>&1
