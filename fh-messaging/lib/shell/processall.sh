#!/bin/bash
echo Starting processing of all files `date`
while read PROC_DATE
do
  (cd /mnt/is1/metrics/metrics_raw; ls */backupmessages.log.$PROC_DATE) | while read FILENAME
  do
    echo Processing file $FILENAME `date` >> filenames.log
    echo Processing file $FILENAME `date`
    /usr/bin/fh-msg-batch-import --config /etc/fh-messaging/batch_importer_conf.json --file $FILENAME
    echo Finished file $FILENAME `date` >> filenames.log
    echo Finished file $FILENAME `date`
  done
done <<EOF
2011-10-03
EOF
echo Finished processing of all files `date`

