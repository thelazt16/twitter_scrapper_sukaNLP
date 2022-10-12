#!/usr/bin/env bash
while :
do
	cd /home/dimmed/github/corpus_twitter_v2/
  echo "Inside corpus twitter"
  echo "Starting Script"
  node getAll.js
  echo ""
  echo ""
  echo "Script Finished"
  currentTime=`TZ='Asia/Jakarta' date`
  echo "Finish time: $currentTime"
  nextTime=`TZ='Asia/Jakarta' date -d "+45 min"`
  echo "Next run: $nextTime"
  sleep 2700
done
