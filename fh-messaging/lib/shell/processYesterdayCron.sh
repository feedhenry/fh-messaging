export LOGDIR=/var/log/feedhenry/fh-messaging/
export IMPORT_FLAG=${2:-DO_IMPORT}

cd ~hadmin
export YESTERDAY=`date --date " - 1 day" '+%F'`
nohup fh-msg-process $YESTERDAY $IMPORT_FLAG >> ${LOGDIR}/batchimport.out 2>> ${LOGDIR}/batchimport.err &
