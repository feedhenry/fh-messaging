#!/bin/bash


# Load config
#. /etc/feedhenry/fh-messaging/fileimportconfig.sh
. ${3:-/etc/feedhenry/fh-messaging}/fileimportconfig.sh
export CONFIG_LOCATION=${3:-${CONFIG_LOCATION}}

export BACKUP_MESSAGE_FILES_LOCATION=${METRICS_FILES_ROOT}

export IMPORT_FLAG=${2:-DO_IMPORT}

export DAYS_TO_KEEP=${4:-31}

# Get components of process date
export PROC_DATE=$1
export YEAR=`date --date "$PROC_DATE" '+%Y'`
export MONTH=`date --date "$PROC_DATE" '+%m'`
export DAY=`date --date "$PROC_DATE" '+%d'`

# Get components of previous date - used to process additional data from
# previous day, in case extra data was imported
export PREV_DATE=`date --date "$PROC_DATE - 1 day" '+%F'`
export PREV_YEAR=`date --date "$PREV_DATE" '+%Y'`
export PREV_MONTH=`date --date "$PREV_DATE" '+%m'`
export PREV_DAY=`date --date "$PREV_DATE" '+%d'`

# Get components of date (now - DAYS_TO_KEEP) - used to delete old raw data from database
export DELETE_DATE=`date --date "$PROC_DATE - $DAYS_TO_KEEP day" '+%F'`
export DELETE_YEAR=`date --date "$DELETE_DATE" '+%Y'`
export DELETE_MONTH=`date --date "$DELETE_DATE" '+%m'`
export DELETE_DAY=`date --date "$DELETE_DATE" '+%d'`

if [ "$IMPORT_FLAG" = "DO_IMPORT" ]
then
  echo Starting processing of $PROC_DATE files `date`
  (cd ${BACKUP_MESSAGE_FILES_LOCATION}; ls */backupmessages.log.$PROC_DATE) | while read FILENAME
  do
    echo Processing file $FILENAME `date` >> /var/log/feedhenry/fh-messaging/filenames-$PROC_DATE.log
    echo Processing file $FILENAME `date`
    ${FH_BATCH_IMPORT_CMD} --config ${CONFIG_LOCATION}/batch_importer_conf.json --file $FILENAME
    echo Finished file $FILENAME `date` >> /var/log/feedhenry/fh-messaging/filenames-$PROC_DATE.log
    echo Finished file $FILENAME `date`
  done
  echo Finished file import. 
fi

echo Generating metrics for $PROC_DATE. `date`
${FH_METRICS_CMD} -c ${CONFIG_LOCATION}/conf.json  -t appinit -y $YEAR -m $MONTH -d $DAY -o db

echo re-generating metrics for $PREV_DATE, in case additional records imported. `date`
${FH_METRICS_CMD} -c ${CONFIG_LOCATION}/conf.json  -t appinit -y $PREV_YEAR -m $PREV_MONTH -d $PREV_DAY -o db

for TOPICNAME in apicalled appbuild appcreate appinit fhact useractivate userlogin
do
  echo deleting ${TOPICNAME} messages for $DELETE_DATE. `date`
  ${FH_METRICS_CMD}  -c ${CONFIG_LOCATION}/conf.json  -t ${TOPICNAME} -y $DELETE_YEAR -m $DELETE_MONTH -d $DELETE_DAY -o delete
done

echo Finished processing of all files `date`
