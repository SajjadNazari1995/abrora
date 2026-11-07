import datetime, json
from playwright.sync_api import sync_playwright
from helpers import gate
OUT='/tmp/claude-0/-home-claude/18c509e7-1926-53a8-acb9-60fa937e1357/scratchpad/shots/'
d=datetime.date.today()
OLD={"settings":{"lang":"fa","font":"vazir","theme":"auto","weekStart":1,"cycleLen":28,"periodLen":5,"lutealLen":14,"onboarded":True,"name":"سارا"},"periods":[{"s":(d-datetime.timedelta(days=1)).isoformat(),"e":(d-datetime.timedelta(days=1)).isoformat(),"open":True}],"logs":{}}
res=[]
def ok(n,c,x=''): res.append(c); print(('PASS ' if c else 'FAIL ')+n,'' if c else x)
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':402,'height':874},locale='fa-IR'); pg=c.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.evaluate("k=>localStorage.setItem('abrora:v1',JSON.stringify(k))",OLD); pg.reload(); gate(pg); pg.wait_for_timeout(3500)
    pg.click('[data-act=tab][data-v=tips]'); pg.wait_for_timeout(400)
    pg.click('[data-act=tips-tab][data-v=move]'); pg.wait_for_timeout(1200)
    pg.screenshot(path=OUT+'30_move.png')
    n=pg.locator('[data-act=workout]').count(); ok('workout rows shown (3 recommended + 6 library)', n==9, n)
    first=pg.locator('.art-list [data-act=workout]').first.get_attribute('data-id'); print('first recommended:',first)
    ok('period day recommends gentle cramp routine', first=='gentle-cramp-relief', first)
    pg.click('.fchip[data-v=strength]'); pg.wait_for_timeout(300)
    ok('kind filter', pg.locator('.fchips + .art-list [data-act=workout]').count()==2, pg.locator('.fchips + .art-list [data-act=workout]').count())
    pg.locator('[data-act=workout][data-id=gentle-cramp-relief]').first.click(); pg.wait_for_timeout(900)
    pg.screenshot(path=OUT+'31_workout.png')
    ok('5 steps listed', pg.locator('.wk-step').count()==5, pg.locator('.wk-step').count())
    ok('amount localized (فارسی)', 'ثانیه' in pg.inner_text('.sheet') and 'هر طرف' in pg.inner_text('.sheet'))
    pg.locator('.wk-step').nth(1).click(); pg.wait_for_timeout(300)
    ok('exercise how-to opens', pg.locator('.wk-how li').count()==3, pg.locator('.wk-how li').count())
    pg.screenshot(path=OUT+'32_step.png')
    ok('safety note', 'پزشک' in pg.inner_text('.sheet'))
    # german
    pg.evaluate("document.querySelector('[data-act=sheet-close]').click()"); pg.wait_for_timeout(400)
    ok('no page errors', not errs, errs)
    b.close()
print(res.count(False),'failed')
