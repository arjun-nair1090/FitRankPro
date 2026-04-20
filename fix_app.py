import re

def fix():
    with open(r'frontend\app.js', 'r', encoding='utf-8') as f:
        c = f.read()

    # Fix encoding
    c = c.replace('â€¢', '\u2022')
    c = c.replace('ðŸ“ˆ', '&#x1F4C8;')
    c = c.replace('ðŸ‘€', '&#x1F440;')
    c = c.replace('ðŸ¥‡', '&#x1F947;')
    c = c.replace('ðŸ“—', '&#x1F4D7;')
    c = c.replace('ðŸ“µ', '&#x1F4F5;')
    c = c.replace('ðŸ”’', '&#x1F512;')
    c = c.replace('ðŸŽ¥', '&#x1F3A5;')
    c = c.replace('ðŸ”„', '&#x1F504;')
    c = c.replace('ðŸ”¥', '&#x1F525;')
    c = c.replace('ðŸŽ¯', '&#x1F3AF;')
    c = c.replace('ðŸ¤–', '&#x1F916;')
    c = c.replace('A-', 'x')

    # Specifically for the hardcoded HTML emojis that might have been mangled
    c = re.sub(r'dY[^\s<]* Premium only', '&#x1F512; Premium only', c)
    c = re.sub(r'dY\?\<\?\,\?', '&#x1F947;', c)
    c = re.sub(r'dYZ_', '&#x1F4C8;', c)
    c = re.sub(r'dY -', '&#x1F916;', c)
    c = re.sub(r'dY\?\?', '&#x1F4E4;', c)
    c = re.sub(r'dYZ\xA5', '&#x1F3A5;', c)
    c = re.sub(r'dY\?\",', '&#x1F504;', c)
    c = re.sub(r'dY``', '&#x2705;', c)
    c = re.sub(r'Active \?-', '&#x2705;', c)

    # Fix buildAnalytics renderBars slices
    c = c.replace('renderBars(analytics.volume.values)', 'renderBars(analytics.volume.values.slice(-14))')
    c = c.replace('renderBars(analytics.calories.values)', 'renderBars(analytics.calories.values.slice(-14))')

    with open(r'frontend\app.js', 'w', encoding='utf-8') as f:
        f.write(c)

if __name__ == '__main__':
    fix()
