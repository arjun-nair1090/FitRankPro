with open(r'frontend\app.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Check for the broken double-join pattern from earlier edits
if '}).join("") + "</div>";\n  }).join' in c:
    print('ERROR: Double join found - renderBars still broken')
else:
    print('OK: No double join')

# Check renderBars is complete
import re
m = re.search(r'function renderBars.*?^  }', c, re.MULTILINE | re.DOTALL)
if m:
    print('renderBars snippet:')
    print(m.group()[:300])
else:
    print('ERROR: renderBars not found')

print('Total lines:', c.count('\n'))
