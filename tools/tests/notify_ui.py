import datetime, json
from playwright.sync_api import sync_playwright
d=datetime.date.today()
OLD={"settings":{"lang":"fa","font":"vazir","theme":"auto","weekStart":1,"cycleLen":28,"periodLen":5,"lutealLen":14,"onboarded":True,"name":"سارا"},"periods":[{"s":(d-datetime.timedelta(days=20)).isoformat(),"e":(d-datetime.timedelta(days=16)).isoformat()}],"logs":{}}
# a fake native plugin, to prove what the app schedules
FAKE="""window.__sched=[];window.__perm='prompt';
window.Capacitor={Plugins:{LocalNotifications:{
 checkPermissions:()=>Promise.resolve({display:window.__perm}),
 requestPermissions:()=>{window.__perm='granted';return Promise.resolve({display:'granted'})},
 getPending:()=>Promise.resolve({notifications:window.__sched.map(n=>({id:n.id}))}),
 cancel:(o)=>{window.__sched=window.__sched.filter(n=>!o.notifications.some(x=>x.id===n.id));return Promise.resolve()},
 schedule:(o)=>{window.__sched=window.__sched.concat(o.notifications);return Promise.resolve()}}}};"""
res=[]
def ok(n,c,x=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n,'' if c else x)
with sync_playwright() as p:
    b=p.chromium.launch(); 
    # 1) browser: no native -> hint only
    c=b.new_context(viewport={'width':402,'height':874},locale='fa-IR'); pg=c.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.evaluate("k=>localStorage.setItem('abrora:v1',JSON.stringify(k))",OLD); pg.reload(); pg.wait_for_timeout(3000)
    pg.click('[data-act=settings]'); pg.wait_for_timeout(300)
    ok('browser: hint, no toggle', pg.locator('[data-act=notify-toggle]').count()==0 and 'اندروید' in pg.inner_text('body'))
    ok('privacy button opens policy', (pg.click('[data-act=privacy]') or True) and (pg.wait_for_timeout(500) or True) and 'IP' in pg.inner_text('.sheet'))
    c.close()
    # 2) phone app: fake plugin
    c=b.new_context(viewport={'width':402,'height':874},locale='fa-IR'); c.add_init_script(FAKE); pg=c.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.evaluate("k=>localStorage.setItem('abrora:v1',JSON.stringify(k))",OLD); pg.reload(); pg.wait_for_timeout(3000)
    pg.click('[data-act=settings]'); pg.wait_for_timeout(300)
    ok('phone: toggle present', pg.locator('[data-act=notify-toggle]').count()==2)
    pg.click('[data-act=notify-toggle][data-v=on]'); pg.wait_for_timeout(1800)
    s=pg.evaluate("window.__sched"); print('scheduled:',[(x['id'],x['title'],x['body'],x['schedule']['at']) for x in s][:2], len(s))
    ok('permission asked then scheduled', pg.evaluate("window.__perm")=='granted' and len(s)>=4, len(s))
    ok('lock-screen texts do not name the topic', all(not __import__('re').search('پریود|چرخه|period|cycle',x['body']+x['title'],__import__('re').I) for x in s))
    pg.click('[data-act=notify-pre][data-v="0"]'); pg.wait_for_timeout(1600)
    ok('same-day only -> 3 reminders', len(pg.evaluate("window.__sched"))==3, len(pg.evaluate("window.__sched")))
    pg.click('[data-act=notify-toggle][data-v=off]'); pg.wait_for_timeout(800)
    ok('off clears schedule', len(pg.evaluate("window.__sched"))==0)
    ok('no page errors', not errs, errs)
    b.close()
print(res.count(False),'failed')
