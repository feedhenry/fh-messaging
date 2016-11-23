for DATE in 2013-02-01 2013-02-02 2013-02-03 2013-02-04 2013-02-05 2013-02-06 2013-02-07 2013-02-08 2013-02-09 2013-02-10 2013-02-11 2013-02-12  2013-02-13 2013-02-14 2013-02-15 2013-02-16 2013-02-17 2013-02-18 2013-02-19 2013-02-20 2013-02-21 2013-02-22 2013-02-23 2013-02-24 2013-02-25 2013-02-26 2013-02-27
do
 for CLUSTER in csg1 fdc1 lon3
 do
  for MESSAGE in appinit fhact fhweb
  do
   TOT=$(grep "\"topic\":\"$MESSAGE\"" ${CLUSTER}a*/backupmessages.log.${DATE} |wc -l)
   echo "${DATE},${CLUSTER},${MESSAGE},millicore,${TOT}"
   TOT=$(grep "\"topic\":\"$MESSAGE\"" ${CLUSTER}d*/backupmessages.log.${DATE} |wc -l)
   echo "${DATE},${CLUSTER},${MESSAGE},dynofarm,${TOT}"
   TOT=$(grep "\"topic\":\"$MESSAGE\"" ${CLUSTER}*/backupmessages.log.${DATE} |wc -l)
   echo "${DATE},${CLUSTER},${MESSAGE},total,${TOT}"
  done

  TOT=$(cat ${CLUSTER}a*/backupmessages.log.${DATE} |wc -l)
  echo "${DATE},${CLUSTER},all,millicore,${TOT}"
  TOT=$(cat ${CLUSTER}d*/backupmessages.log.${DATE} |wc -l)
  echo "${DATE},${CLUSTER},all,dynofarm,${TOT}"
  TOT=$(cat ${CLUSTER}*/backupmessages.log.${DATE} |wc -l)
  echo "${DATE},${CLUSTER},all,total,${TOT}"

 done 
done 

