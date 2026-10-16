import sys
import json
import urllib.request

def run_sql(query):
    url = 'http://localhost:8000/mcp?features=docs%2Cdatabase%2Cdebugging%2Cdevelopment'
    call_payload = {
        'jsonrpc': '2.0',
        'id': 1,
        'method': 'tools/call',
        'params': {
            'name': 'execute_sql',
            'arguments': {
                'query': query
            }
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(call_payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
        }
    )

    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        content = data.get('result', {}).get('content', [])
        for c in content:
            if c.get('type') == 'text':
                try:
                    text_data = json.loads(c.get('text', ''))
                    print(text_data.get('result', c.get('text')))
                except Exception:
                    print(c.get('text'))

if __name__ == '__main__':
    if len(sys.argv) > 1:
        query = sys.argv[1]
    else:
        query = sys.stdin.read()
    run_sql(query)
