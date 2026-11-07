import json, datetime
from playwright.sync_api import sync_playwright
from helpers import gate
A='/tmp/claude-0/-home-claude/18c509e7-1926-53a8-acb9-60fa937e1357/scratchpad/api/'
API='https://abroraapi.nazaritechnologies.com/wp-json/abrora/v1/'
d=datetime.date.today()
OLD={"settings":{"lang":"fa","font":"vazir","theme":"auto","weekStart":1,"cycleLen":28,"periodLen":5,"lutealLen":14,"onboarded":True,"name":"سارا"},"periods":[{"s":(d-datetime.timedelta(days=10)).isoformat(),"e":(d-datetime.timedelta(days=6)).isoformat()}],"logs":{}}
idx=json.load(open(A+'index.json')); idx['articles'][0]['title']['fa']='عنوان از سرور'
cors={'access-control-allow-origin':'http://localhost:8765'}
def handler(route):
    p=route.request.url.split('/abrora/v1/')[-1]
    if p=='index': return route.fulfill(json=idx,headers=cors)
    if p.startswith('articles/'): return route.fulfill(json=json.load(open(A+p+'.json')),headers=cors)
    if p in('messages','fonts'): return route.fulfill(json={} if p=='messages' else [],headers=cors)
    route.abort()
res=[]
def ok(n,c,x=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n,'' if c else x)
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':402,'height':874},locale='fa-IR')
    c.route('https://abroraapi.nazaritechnologies.com/**',handler)
    pg=c.new_page(); pg.goto('http://localhost:8765/index.html'); pg.evaluate("k=>localStorage.setItem('abrora:v1',JSON.stringify(k))",OLD); pg.reload(); gate(pg); pg.wait_for_timeout(2500); pg.reload(); pg.wait_for_timeout(4500)
    n=pg.evaluate("caches.open('abrora-content').then(c=>c.keys()).then(k=>k.map(r=>r.url))")
    srv=[u for u in n if 'abroraapi' in u]; print('cached server urls:',len(srv))
    ok('server responses cached by service worker', len(srv)>=11, srv[:2])
    c.set_offline(True); pg.reload(); pg.wait_for_timeout(4500)
    pg.click('[data-act=tab][data-v=tips]'); pg.wait_for_timeout(400)
    ok('offline: server title still shown', 'عنوان از سرور' in pg.inner_text('#art-list'), pg.inner_text('#art-list')[:80])
    b.close()
print(res.count(False),'failed')
