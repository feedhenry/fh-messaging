#/bin/bash
#
export LOGDIR=/var/log/feedhenry/fh-messaging

export END_DATE=2011-11-20
export CURR_DATE=2011-11-01
while [ "${CURR_DATE}" != "${END_DATE}" ]
do
echo "processing $CURR_DATE"
sh ~hadmin/processone.sh $CURR_DATE > ${LOGDIR}/processback.out-$CURR_DATE 2> ${LOGDIR}/processback.err-$CURR_DATE
export CURR_DATE=`date --date "$CURR_DATE + 1 day" '+%F'`
done
