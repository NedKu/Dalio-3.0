import requests
import re

url = 'https://www.usdebtclock.org/'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'identity',
}
r = requests.get(url, headers=headers, timeout=20)
text = r.text
names = ['X1a890', 'X1a942', 'X1', 'X1a241', 'X1a906', 'X1a625', 'X1a765']
for name in names:
    print(name, text.count(name))

for name in names:
    idx = text.find(f"document.getElementById('{name}')")
    print('\n', name, 'doc element idx', idx)
    if idx != -1:
        print(text[idx-120:idx+240].replace('\n', ' '))
    else:
        print('  not found')

# Print sampling of variable assignments around the first debt variable
var_names = ['X1a890', 'R3a78', 'Y12a346', 'X1a942', 'R3R789', 'Y13a562']
for name in var_names:
    idx = text.find(f'var {name} =')
    print('\n', name, 'assignment idx', idx)
    if idx != -1:
        print(text[idx:idx+200].replace('\n', ' '))
    else:
        print('  not found')

# Attempt to compute debt and GDP using the same formula blocks

def safe_eval_expr(raw):
    cleaned = re.sub(r'[^0-9.\*\+/\-\(\)\s]', ' ', raw)
    tokens = cleaned.split()
    for start in range(len(tokens)):
        expr = ''.join(tokens[start:])
        try:
            value = eval(expr)
            if isinstance(value, (int, float)) and 1e8 < value < 1e11:
                return float(value)
        except Exception:
            continue
    return None

for id_name in ['X1a890', 'X1a942']:
    start = text.find(f"var {id_name} =")
    end = text.find(f"document.getElementById('{id_name}')", start)
    if start != -1 and end != -1:
        block = text[start:end]
        base = re.search(rf'var {id_name} = ([0-9.]+);', block)
        rate = re.search(r'var R3a78 = ([0-9.]+);', block)
        offset = re.search(r'var Y[0-9a-zA-Z]+ = ([^;]+);', block)
        print('\nBlock for', id_name, 'base', base.group(1) if base else None, 'rate', rate.group(1) if rate else None, 'offset', offset.group(1).strip() if offset else None)
        if base and rate and offset:
            val = safe_eval_expr(offset.group(1))
            print('parsed offset', val)
            import time
            now = time.time()
            computed = float(base.group(1)) + (now - val) * float(rate.group(1)) if val else None
            print('computed', computed)
    else:
        print('Block not found for', id_name)
