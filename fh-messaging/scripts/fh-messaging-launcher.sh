#!/bin/bash
#
# Special helper script to be used in conjunction with /etc/init.d/fh-messaging
# to ensure log output (sent to stdout,stderr) from a daemonized script is accessible.
#
exec /usr/local/bin/fh-messaging $* >> /var/log/feedhenry/fh-messaging/fh-messaging-console.log 2>&1
