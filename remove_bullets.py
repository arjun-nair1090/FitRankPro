import re

def fix():
    with open(r'frontend\app.js', 'r', encoding='utf-8') as f:
        c = f.read()

    # The user demanded replacing the bullets with basic spacing to remove the component entirely.
    c = c.replace(' &bull; ', '   ')
    c = c.replace(' \u2022 ', '   ')
    c = c.replace(' "&bull;" ', ' "   " ')

    with open(r'frontend\app.js', 'w', encoding='utf-8') as f:
        f.write(c)

if __name__ == '__main__':
    fix()
