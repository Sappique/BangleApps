// Scrollable list of all upcoming calendar events grouped by day
var w = g.getWidth();
var ROW_H = 40;

function zp(str) {
  return ("0"+str).substr(-2);
}

function truncate(text, maxW) {
  if (g.stringMetrics(text).width <= maxW) return text;
  var ellW = g.stringMetrics("...").width;
  var t = text;
  while (g.stringMetrics(t).width + ellW > maxW && t.length > 1)
    t = t.slice(0, -1);
  while (t.length > 1 && t[t.length - 1] === " ") t = t.slice(0, -1);
  return t + "...";
}

function getDateStr(d) {
  return require("locale").dow(d) + " " + zp(d.getDate()) + "." + zp(d.getMonth()+1) + ".";
}

// Load and prepare events
var allEvents = require("Storage").readJSON("android.calendar.json",true)||[];
var now = getTime();
allEvents = allEvents.filter(function(e) { return !e.allDay && e.timestamp > now; });
allEvents.sort(function(a,b) { return a.timestamp - b.timestamp; });

// Build flat list of rows: day headers + event entries
var rows = [];
var lastDay = "";
for (var i = 0; i < allEvents.length; i++) {
  var d = new Date(allEvents[i].timestamp * 1000);
  var dayStr = getDateStr(d);
  if (dayStr !== lastDay) {
    rows.push({type:"header", label:dayStr});
    lastDay = dayStr;
  }
  rows.push({type:"event", event:allEvents[i]});
}

if (rows.length === 0) {
  rows.push({type:"header", label:"No events"});
}

g.clear();
Bangle.loadWidgets();
Bangle.drawWidgets();

E.showScroller({
  h: ROW_H,
  c: rows.length,
  draw: function(idx, r) {
    var row = rows[idx];
    g.setColor(g.theme.bg);
    g.fillRect(r.x, r.y, r.x+r.w-1, r.y+r.h-1);

    if (row.type === "header") {
      g.setColor(g.theme.fg);
      g.setFont("6x8", 2).setFontAlign(-1, 0);
      g.drawString(row.label, r.x+4, r.y+r.h/2);
      // Underline
      g.drawLine(r.x, r.y+r.h-1, r.x+r.w-1, r.y+r.h-1);
    } else {
      var evt = row.event;

      // Color bar
      if (evt.color) {
        g.setColor("#"+(0x1000000+Number(evt.color)).toString(16).padStart(6,"0"));
        g.fillRect(r.x, r.y, r.x+3, r.y+r.h-1);
      }

      g.setColor(g.theme.fg);
      var x = r.x + 8;
      var maxW = r.w - 12;

      // Title line
      g.setFont("6x8", 2).setFontAlign(-1, -1);
      g.drawString(truncate(evt.title, maxW), x, r.y + 2);

      // Time + location line
      g.setFont("6x8", 1).setFontAlign(-1, -1);
      var evtTime = new Date(evt.timestamp * 1000);
      var info = zp(evtTime.getHours()) + ":" + zp(evtTime.getMinutes());
      if (evt.location) info += " - " + evt.location;
      g.drawString(truncate(info, maxW), x, r.y + 22);

      // Separator line
      g.drawLine(r.x, r.y+r.h-1, r.x+r.w-1, r.y+r.h-1);
    }
  },
  back: function() { load(); }
});
