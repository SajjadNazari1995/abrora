from playwright.sync_api import sync_playwright
from helpers import gate
OUT='/tmp/claude-0/-home-claude/18c509e7-1926-53a8-acb9-60fa937e1357/scratchpad/shots/'
OLD={"settings":{"lang":"fa","font":"vazir","theme":"auto","weekStart":1,"cycleLen":28,"periodLen":5,"lutealLen":14,"onboarded":True,"name":"سارا"},"periods":[{"start":20400,"end":20404}],"logs":{}}
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':402,'height':874},locale='fa-IR'); pg=c.new_page()
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.evaluate("k=>localStorage.setItem('abrora:v1',JSON.stringify(k))",OLD); pg.reload(); gate(pg); pg.wait_for_timeout(3500)
    pg.screenshot(path=OUT+'20_home.png')
    # log cramps + sad today
    pg.click('.pain-pill'); pg.wait_for_timeout(400); pg.click('[data-act=pain-sym][data-id=cramps]'); pg.wait_for_timeout(300)
    pg.keyboard.press('Escape'); pg.evaluate("document.querySelector('[data-act=sheet-close]')&&document.querySelector('[data-act=sheet-close]').click()"); pg.wait_for_timeout(400)
    print('tips now:',pg.evaluate("[...document.querySelectorAll('.tip b')].map(e=>e.textContent)"))
    pg.click('[data-act=tab][data-v=tips]'); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelector('.fchips').scrollIntoView()"); pg.wait_for_timeout(200)
    print(pg.evaluate("(()=>{const f=document.querySelector('.fchips');return {sw:f.scrollWidth,cw:f.clientWidth,doc:document.documentElement.scrollWidth,win:innerWidth,ox:getComputedStyle(f).overflowX,parent:getComputedStyle(f.parentElement).display}})()"))
    pg.screenshot(path=OUT+'21_tips.png')
    print(errs); b.close()
