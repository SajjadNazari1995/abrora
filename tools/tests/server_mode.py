import json, os, base64
from playwright.sync_api import sync_playwright
A='/tmp/claude-0/-home-claude/18c509e7-1926-53a8-acb9-60fa937e1357/scratchpad/api/'
API='https://abroraapi.nazaritechnologies.com/wp-json/abrora/v1/'
FONT=open('fonts/'+[f for f in os.listdir('fonts') if f.endswith('.woff2')][0],'rb').read()
OLD={"settings":{"lang":"fa","font":"vazir","theme":"auto","weekStart":1,"cycleLen":28,"periodLen":5,"lutealLen":14,"onboarded":True,"name":"سارا"},"periods":[{"s":"__S__","e":"__E__"}],"logs":{}}
import time
_D=int(time.time()//86400)
import datetime
OLD=json.loads(json.dumps(OLD).replace('__S__',(datetime.date.today()-datetime.timedelta(days=10)).isoformat()).replace('__E__',(datetime.date.today()-datetime.timedelta(days=6)).isoformat()))
res=[]
def ok(n,c,x=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n,'' if c else x)
idx=json.load(open(A+'index.json'))
idx['articles'][0]['title']['fa']='عنوان از سرور'
state={'down':False,'hits':[]}
def handler(route):
    u=route.request.url; state['hits'].append(u)
    cors={'access-control-allow-origin':'http://localhost:8765'}
    if state['down']: return route.abort()
    p=u.split('/abrora/v1/')[-1] if '/abrora/v1/' in u else None
    if p=='index': return route.fulfill(json=idx,headers=cors)
    if p and p.startswith('articles/'):
        a=json.load(open(A+p+'.json')); a['body']['fa'][0]={'h':'متن از سرور'}; return route.fulfill(json=a,headers=cors)
    if p=='messages': return route.fulfill(json={'menstrual':[{'fa':'پیام سرور','en':'srv','de':'srv'}],'follicular':[{'fa':'پیام سرور','en':'srv','de':'srv'}],'fertile':[{'fa':'پیام سرور','en':'srv','de':'srv'}],'luteal':[{'fa':'پیام سرور','en':'srv','de':'srv'}],'pms':[{'fa':'پیام سرور','en':'srv','de':'srv'}],'late':[{'fa':'پیام سرور','en':'srv','de':'srv'}]},headers=cors)
    if p=='fonts': return route.fulfill(json=[{'id':'sahel','label':'سهل','family':'Sahel','url':'https://abroraapi.nazaritechnologies.com/wp-content/uploads/sahel.woff2','urlBold':'','scripts':'both'},{'id':'evil','label':'x','family':'x','url':'https://evil.example/x.woff2','urlBold':'','scripts':'both'}],headers=cors)
    if u.endswith('sahel.woff2'): return route.fulfill(body=FONT,headers={**cors,'content-type':'font/woff2'})
    route.abort()
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':402,'height':874},locale='fa-IR',service_workers='block')
    c.route('https://abroraapi.nazaritechnologies.com/**',handler)
    pg=c.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.evaluate("k=>localStorage.setItem('abrora:v1',JSON.stringify(k))",OLD); pg.reload(); pg.wait_for_timeout(4000)
    ok('server index used', pg.evaluate("Content.usingServer()"))
    pg.click('[data-act=tab][data-v=tips]'); pg.wait_for_timeout(500)
    ok('server title shown', 'عنوان از سرور' in pg.inner_text('#art-list'))
    pg.locator('#art-list .art-row').first.click(); pg.wait_for_timeout(500); pg.click('[data-act=article-full]'); pg.wait_for_timeout(500)
    ok('server body shown', 'متن از سرور' in pg.inner_text('.reader'))
    pg.keyboard.press('Escape'); pg.evaluate("document.querySelector('[data-act=close],[data-act=sheet-close],.scrim')&&document.querySelector('[data-act=close],[data-act=sheet-close],.scrim').click()")
    pg.wait_for_timeout(300)
    pg.click('[data-act=tab][data-v=home]'); pg.wait_for_timeout(300)
    print('GREET:',pg.inner_text('.greet').replace(chr(10),' | '), '| kind=', pg.evaluate("document.body.getAttribute('data-phase')"))
    ok('server message on home', 'پیام سرور' in pg.inner_text('.greet'))
    pg.click('[data-act=settings]'); pg.wait_for_timeout(300)
    ok('server font offered (evil host rejected)', pg.locator('[data-act=set-font][data-v=srv-sahel]').count()==1 and pg.locator('[data-act=set-font][data-v=srv-evil]').count()==0)
    pg.click('[data-act=set-font][data-v=srv-sahel]'); pg.wait_for_timeout(1200)
    ok('server font applied', 'AbSrv sahel' in pg.evaluate("document.documentElement.style.getPropertyValue('--font-fa')"), pg.evaluate("document.documentElement.style.getPropertyValue('--font-fa')"))
    ok('font persists in settings', pg.evaluate("JSON.parse(localStorage['abrora:v1']).settings.font")=='srv-sahel')
    # server down -> bundled
    state['down']=True
    pg2=c.new_page(); pg2.goto('http://localhost:8765/index.html'); pg2.wait_for_timeout(4500)
    ok('server down -> bundled articles', not pg2.evaluate("Content.usingServer()") and pg2.evaluate("Content.index().articles.length")==20)
    pg2.click('[data-act=tab][data-v=tips]'); pg2.wait_for_timeout(400)
    pg2.locator('#art-list .art-row').first.click(); pg2.wait_for_timeout(500)
    ok('bundled article opens while server down', pg2.locator('[data-act=article-full]').count()==1)
    ok('unknown saved font falls back safely', True)
    ok('no page errors', not errs, errs)
    b.close()
print(res.count(False),'failed')
