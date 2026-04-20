import re

def fix():
    with open(r'frontend\app.js', 'r', encoding='utf-8') as f:
        c = f.read()

    # Replace corrupted bullets around the subtext
    c = re.sub(r'''\+ formatDateTime\(workout\.createdAt\) \+ '.{1,5}' \+ workout\.durationMinutes \+ ' min.{1,5}' \+ number\(workout\.volume\) \+ ' kg volume''',
               r'''+ formatDateTime(workout.createdAt) + ' • ' + workout.durationMinutes + ' min • ' + number(workout.volume) + ' kg volume''', c)

    c = re.sub(r'''\+ routine\.days \+ '.{1,5}' \+ routine\.focus''',
               r'''+ routine.days + ' • ' + routine.focus''', c)
               
    c = re.sub(r'''\+ escapeHtml\(exercise\.category\) \+ ".{1,5}" \+ escapeHtml\(exercise\.primaryMuscle\) \+ ".{1,5}" \+ escapeHtml\(exercise\.equipment\)''',
               r'''+ escapeHtml(exercise.category) + " • " + escapeHtml(exercise.primaryMuscle) + " • " + escapeHtml(exercise.equipment)''', c)

    # Rewrite renderBars
    renderBarsBody = '''  function renderBars(data) {
    var vals = data.values || data;
    if (!vals.length || !hasPositive(vals)) return "<p>No data yet. Save workouts to build this chart.</p>";
    var max = Math.max.apply(null, vals) || 1;
    return '<div class="chart-box" style="align-items:flex-end;gap:12px;margin-top:20px;">' + vals.map(function (value, i) {
      var lbl = data.labels && data.labels[i] ? String(data.labels[i]).slice(5) : "";
      var h = Math.max(12, Math.round((value / max) * 180));
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;">' +
        '<span style="font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:4px;">' + Math.round(value) + '</span>' +
        '<div class="bar" style="height:' + h + 'px;width:100%;border-radius:6px;background:linear-gradient(180deg,#8db0ff,#8a5cff 65%,#b050ff);"></div>' +
        (lbl ? '<span style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;white-space:nowrap;transform:rotate(-45deg);transform-origin:left center;">' + escapeHtml(lbl) + '</span>' : '') +
        '</div>';
    }).join("") + "</div>";
  }'''
    c = re.sub(r'  function renderBars\(.*?  }', renderBarsBody, c, flags=re.S)

    # Rewrite renderLineChart
    c = c.replace('points.push(x + "," + y);', 'points.push(x + "," + y);\n      labelsSvg += \'<text x="\' + x + \'" y="\' + (y - 12) + \'" fill="rgba(255,255,255,0.8)" font-size="10" text-anchor="middle">\' + Math.round(data.values[i]*10)/10 + \'</text>\';')

    with open(r'frontend\app.js', 'w', encoding='utf-8') as f:
        f.write(c)

if __name__ == '__main__':
    fix()
