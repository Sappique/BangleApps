var combiclockTimerTimeout;
var combiclockAlarmTimeout;
function combiclockCheckTimers() {
  var expiresIn=require("combiclock.lib.js").timerExpiresIn;
  if (combiclockTimerTimeout) clearTimeout(combiclockTimerTimeout);
  var timers = require('Storage').readJSON('combiclock.timer.json',1)||[];
  timers = timers.filter(e=>e.start);
  if (timers.length) {
    timers = timers.sort((a,b)=>expiresIn(a)-expiresIn(b));
    if (!require('Storage').read("combiclock.timer.alert.js")) {
      console.log("No timer app!");
    } else {
      var time = expiresIn(timers[0]);
      if (time<1000) time=1000;
      if (combiclockTimerTimeout) clearTimeout(combiclockTimerTimeout);
      combiclockTimerTimeout = setTimeout(() => load("combiclock.timer.alert.js"),time);
    }
  }
}
function combiclockCheckAlarms() {
  if (combiclockAlarmTimeout) clearTimeout(combiclockAlarmTimeout);
  var alarms = require('Storage').readJSON('combiclock.alarm.json',1)||[];
  var currentTime = require("combiclock.lib.js").getCurrentTime();
  alarms = alarms.filter(e=>e.on);
  if (alarms.length) {
    alarms = alarms.sort((a,b)=>(a.time-b.time)+(a.last-b.last)*86400000);
    if (!require('Storage').read("combiclock.alarm.alert.js")) {
      console.log("No alarm app!");
    } else {
      var time = alarms[0].time-currentTime;
      if (alarms[0].last == new Date().getDate() || time < 0) time += 86400000;
      if (time<1000) time=1000;
      if (combiclockAlarmTimeout) clearTimeout(combiclockAlarmTimeout);
      combiclockAlarmTimeout = setTimeout(() => load("combiclock.alarm.alert.js"),time);
    }
  }
}
combiclockCheckTimers();
combiclockCheckAlarms();
