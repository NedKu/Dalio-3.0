import urllib.request
import json

url = 'https://www.clevelandfed.org/-/media/files/webcharts/inflationnowcasting/nowcast_quarter.json'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    resp = urllib.request.urlopen(req, timeout=15)
    data = json.loads(resp.read().decode('utf-8'))
    
    # Print structure
    if isinstance(data, list):
        print(f"Array with {len(data)} items")
        for i, item in enumerate(data):
            if isinstance(item, dict):
                if 'title' in item:
                    print(f"\n[{i}] title: {item['title']}")
                if 'dataset' in item and isinstance(item['dataset'], list):
                    print(f"    datasets: {len(item['dataset'])}")
                    for ds in item['dataset']:
                        if isinstance(ds, dict) and 'seriesname' in ds:
                            print(f"      - {ds['seriesname']}")
                            if 'data' in ds and isinstance(ds['data'], list) and len(ds['data']) > 0:
                                last_val = ds['data'][-1]
                                print(f"        Latest: {last_val}")
except Exception as e:
    print(f"Error: {e}")
