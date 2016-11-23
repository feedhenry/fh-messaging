#!/bin/bash
export PROCESS_DATE=$1
export IMPORT_FLAG=${2:-DO_IMPORT}
export CONFIG_LOCATION=${3:-/etc/feedhenry/fh-messaging}
export DAYS_TO_KEEP=${4:-31}

if [ "$IMPORT_FLAG" = "DO_IMPORT" ]
then
  echo "Getting backup files"
  fh-msg-getbackupfiles $PROCESS_DATE
fi

fh-msg-process-one $PROCESS_DATE $IMPORT_FLAG $CONFIG_LOCATION $DAYS_TO_KEEP

. $CONFIG_LOCATION/fileimportconfig.sh
if [[ ${#METRICS_FILES_ROOT} -gt 3 ]]; then
  echo "Emptying ${METRICS_FILES_ROOT}/*"
  rm -rf ${METRICS_FILES_ROOT}/*
else
  echo "Value of directory (${METRICS_FILES_ROOT}/*) too short, not emptying"
fi