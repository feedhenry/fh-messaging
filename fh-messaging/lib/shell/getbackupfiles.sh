#!/bin/bash
# FeedHenry Metrics Generator
#
# This script relies on the backup message files being stored at a file location like:
#     hadmin@amz1gen1.feedhenry.net:/export/backups/${CLUSTER}/metrics/$SERVER/metrics-$FILE_DATE-$SERVER.tar.gpg
#
export METRICS_DATE=$1
export FILE_DATE=`date --date "$METRICS_DATE + 1 day" '+%F'`

# Load config
. /etc/feedhenry/fh-messaging/fileimportconfig.sh

for CLUSTER_SERVER in ${METRICS_SERVERS_APPSERVER_NAMES} ${METRICS_SERVERS_DYNOSERVER_NAMES}
do
  read CLUSTER SERVER <<<$(IFS="."; echo $CLUSTER_SERVER)
  echo $SERVER
  if [ ! -d ${METRICS_FILES_ROOT}/$SERVER ]
  then
    mkdir -p ${METRICS_FILES_ROOT}/$SERVER
  fi
  scp hadmin@amz1gen1.feedhenry.net:/export/backups/${CLUSTER}/metrics/$SERVER/metrics-$FILE_DATE-$SERVER.tar.gpg ${METRICS_FILES_ROOT}/$SERVER
done

cd ${METRICS_FILES_ROOT}
for CLUSTER_SERVER in ${METRICS_SERVERS_APPSERVER_NAMES} ${METRICS_SERVERS_DYNOSERVER_NAMES}
do
  read CLUSTER SERVER <<<$(IFS="."; echo $CLUSTER_SERVER)
  echo $SERVER
  cd $SERVER
  echo metrics-$FILE_DATE-$SERVER.tar.gpg
  gpg --passphrase $(cat ${GPG_KEY_PASSWORD_FILE}) --yes --batch --no-tty metrics-$FILE_DATE-$SERVER.tar.gpg < /dev/null
  cd ../
done

for CLUSTER_SERVER in ${METRICS_SERVERS_APPSERVER_NAMES} ${METRICS_SERVERS_DYNOSERVER_NAMES}
do
  read CLUSTER SERVER <<<$(IFS="."; echo $CLUSTER_SERVER)
  echo $SERVER
  cd $SERVER
  echo metrics-$FILE_DATE-$SERVER.tar
  tar -xf metrics-$FILE_DATE-$SERVER.tar
  cd ../
done

# dyno files are organised differently, directories are laid out per app, so these need to be combined, also files
# are  logrotated on the day after the majority of the metrics are generated, to we need to use the FILE_DATE when combining
# the individual files
for CLUSTER_SERVER in ${METRICS_SERVERS_DYNOSERVER_NAMES}
do
  read CLUSTER SERVER <<<$(IFS="."; echo $CLUSTER_SERVER)
  echo Combining message files from ${SERVER}
  find ${SERVER} -type f -name backup.log-$FILE_DATE.gz -exec zcat {} \; > ${SERVER}/backupmessages.log.$METRICS_DATE
done
