var combiclock = require("combiclock.lib.js");
var settings = require('Storage').readJSON("combiclock.json", true) || {};
settings = Object.assign({
  "dateFont":"6x8",
  "dateFontSize":2,
  "dowFont":"6x8",
  "dowFontSize":2,
  "specialFont":"6x8",
  "specialFontSize":2,
  "shortDate":true,
  "showStopwatches":true,
  "showTimers":true,
}, settings.clock||{});

var stopwatches = [], timers = [];
if (settings.showStopwatches) {
  stopwatches = require("Storage").readJSON("combiclock.stopwatch.json") || [];
  stopwatches = stopwatches.filter(e=>e.start||e.time);
}
if (settings.showTimers) {
  timers = require("Storage").readJSON("combiclock.timer.json") || [];
  timers = timers.filter(e=>e.start||e.timeAdd);
}

// Calendar
var calendar = [];
var nextEvent = null;

function updateCalendar() {
  calendar = require("Storage").readJSON("android.calendar.json",true)||[];
  // Filter out all-day events, keep only future non-allDay events
  var now = getTime();
  calendar = calendar.filter(e => !e.allDay && e.timestamp > now);
  calendar.sort((a,b) => a.timestamp - b.timestamp);
  nextEvent = calendar.length ? calendar[0] : null;
}

function zp(str) {
  return ("0"+str).substr(-2);
}

// timeout used to update every minute
var drawTimeout;
var drawSpecialTimeout;
// border between time and date/dow
var dragBorder;

// schedule a draw for the next minute
function queueDraw(timeout, interval, func) {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(function() {
    timeout = undefined;
    func();
  }, interval - (Date.now() % interval));
}

function drawSpecial() {
  var interval = 60000;
  var stopwatch = 0, timer = 0, time;
  var x = g.getWidth()/4;
  g.setColor(g.theme.fg);
  g.setFontAlign(0,0).setFont(settings.specialFont, settings.specialFontSize);
  var y = Bangle.appRect.y + g.stringMetrics("00:00").height/2;
  g.clearRect(Bangle.appRect.x, Bangle.appRect.y, Bangle.appRect.x2, Bangle.appRect.y+g.stringMetrics("00:00").height);

  if (stopwatches.length) {
    time = combiclock.getTime(stopwatches[stopwatch]);
    g.drawString(combiclock.formatTime(time, true), x, y);
    if (Math.floor(time/3600000) === 0) interval = 1000;
    stopwatch++;
  } else if (timers.length > 1) {
    time = timers[timer].time - combiclock.getTime(timers[timer]);
    g.drawString(combiclock.formatTime(time, true), x, y);
    if (Math.floor(time/3600000) === 0) interval = 1000;
    timer++;
  }
  x += g.getWidth()/2;
  if (timers.length) {
    time = timers[timer].time - combiclock.getTime(timers[timer]);
    g.drawString(combiclock.formatTime(time, true), x, y);
    if (Math.floor(time/3600000) === 0) interval = 1000;
  } else if (stopwatches.length > 1) {
    time = combiclock.getTime(stopwatches[stopwatch]);
    g.drawString(combiclock.formatTime(time, true), x, y);
    if (Math.floor(time/3600000) === 0) interval = 1000;
  }
  queueDraw(drawSpecialTimeout, interval, drawSpecial);
}

function drawCalendarEvent() {
  // Draw area below the time
  var calY = dragBorder + 4;
  var w = g.getWidth();

  g.clearRect(0, calY, w, Bangle.appRect.y2);

  if (!nextEvent) return;

  var evtTime = new Date(nextEvent.timestamp * 1000);
  var timeStr = zp(evtTime.getHours()) + ":" + zp(evtTime.getMinutes());

  // Time until start
  var minsUntil = Math.round((nextEvent.timestamp - getTime()) / 60);
  var untilStr;
  if (minsUntil < 1) untilStr = "now";
  else if (minsUntil < 60) untilStr = "in " + minsUntil + "m";
  else if (minsUntil < 1440) {
    var hrs = Math.floor(minsUntil/60);
    var mins = minsUntil % 60;
    untilStr = "in " + hrs + "h" + (mins ? zp(mins) : "");
  } else {
    var days = Math.floor(minsUntil/1440);
    untilStr = "in " + days + "d";
  }

  var x = 10;
  // Color bar on the left
  if (nextEvent.color) {
    var oldColor = g.getColor();
    g.setColor("#"+(0x1000000+Number(nextEvent.color)).toString(16).padStart(6,"0"));
    g.fillRect(0, calY, 4, Bangle.appRect.y2);
    g.setColor(oldColor);
  }

  // Start time + time until
  g.setColor(g.theme.fg);
  g.setFont("6x8", 2);
  g.setFontAlign(-1, -1);
  g.drawString(timeStr + " (" + untilStr + ")", x, calY);
  calY += 17;

  // Event title (wrap, max 2 lines)
  g.setFont("6x8", 1);
  var lines = g.wrapString(nextEvent.title, w - x - 5);
  if (lines.length > 2) {
    lines = lines.slice(0,2);
    lines[1] += "...";
  }
  g.drawString(lines.join('\n'), x, calY);
  calY += 9 * lines.length;

  // Location if set
  if (nextEvent.location) {
    g.drawString(nextEvent.location, x, calY);
  }
}

function draw() {
  var x = g.getWidth()/2;
  g.reset();
  var date = new Date();
  var timeStr = require("locale").time(date,1);
  var dateStr = require("locale").date(date,settings.shortDate).toUpperCase();
  var dowStr = require("locale").dow(date).toUpperCase();

  // Start y position after widget area + special display
  var y = Bangle.appRect.y;
  var specialH = 0;
  if (stopwatches.length || timers.length) {
    g.setFont(settings.specialFont, settings.specialFontSize);
    specialH = g.stringMetrics("00:00").height;
  }
  y += specialH;

  // Clear from below special area to bottom
  g.clearRect(Bangle.appRect.x, y, Bangle.appRect.x2, Bangle.appRect.y2);

  // Draw day of week (above date, above time)
  g.setFontAlign(0,-1).setFont(settings.dowFont, settings.dowFontSize);
  g.drawString(dowStr, x, y);
  y += g.stringMetrics(dowStr).height;

  // Draw date
  g.setFontAlign(0,-1).setFont(settings.dateFont, settings.dateFontSize);
  g.drawString(dateStr, x, y);
  y += g.stringMetrics(dateStr).height + 2;

  // Draw time in monospace font
  g.setFontAlign(0,-1).setFont("12x20", 2);
  g.drawString(timeStr, x, y);
  y += g.stringMetrics(timeStr).height;

  // dragBorder separates time area from calendar area (for swipe detection)
  dragBorder = y;

  // Draw calendar event
  drawCalendarEvent();

  // queue draw in one minute
  queueDraw(drawTimeout, 60000, draw);
}

if (process.env.HWVERSION==1) {
  setWatch(()=>load("combiclock.stopwatch.js"), BTN4);
  setWatch(()=>load("combiclock.timer.js"), BTN5);
  setWatch(()=>load("combiclock.alarm.js"), BTN3);
  setWatch(()=>load("combiclock.alarm.js"), BTN1);
} else {
  var absY, lastX=0, lastY=0;
  Bangle.on('drag', e=>{
    if (!e.b) {
      if (lastX > 5) { // right
        if (absY < dragBorder) {
          load("combiclock.timer.js");
        } else {
          load("combiclock.alarm.js");
        }
      } else if (lastX < -5) { // left
        if (absY < dragBorder) {
          load("combiclock.stopwatch.js");
        } else {
          load("combiclock.alarm.js");
        }
      }
      lastX = 0;
      lastY = 0;
    } else {
      lastX = lastX + e.dx;
      lastY = lastY + e.dy;
      absY = e.y;
    }
  });
}

Bangle.setUI("clock");
g.clear();
Bangle.loadWidgets();
Bangle.drawWidgets();
updateCalendar();
draw();
if (stopwatches.length || timers.length) drawSpecial();

// Update calendar every minute
setInterval(function() {
  updateCalendar();
}, 60000);
