import re

def fix():
    with open(r'frontend\app.js', 'r', encoding='utf-8') as f:
        c = f.read()

    # Re-replace ` • ` from the recent script
    c = c.replace(" ' • ' ", " ' &bull; ' ")
    c = c.replace(' " • " ', ' " &bull; " ')

    with open(r'frontend\app.js', 'w', encoding='utf-8') as f:
        f.write(c)

if __name__ == '__main__':
    fix()
