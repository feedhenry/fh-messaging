#/bin/bash
#
export CURR_DATE=2011-11-14
export END_DATE=2011-09-30
while [ "${CURR_DATE}" != "${END_DATE}" ]
do
echo "processing $CURR_DATE"
sh ~hadmin/getbackupfiles.sh $CURR_DATE
export CURR_DATE=`date --date "$CURR_DATE - 1 day" '+%F'`
done
