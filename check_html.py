import urllib.request

url = 'https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    resp = urllib.request.urlopen(req, timeout=15)
    html = resp.read().decode('utf-8','ignore')
    
    # Look for key values
    searches = ['4.18', '3.36', 'year-over-year', 'CPI', 'PCE']
    
    for search_term in searches:
        if search_term.lower() in html.lower():
            idx = html.lower().find(search_term.lower())
            print(f"\n=== Found '{search_term}' at position {idx} ===")
            print(html[max(0, idx-300):idx+400].replace('\n', ' '))
            
except Exception as e:
    print(f"Error: {e}")
