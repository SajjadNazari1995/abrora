import sys, json
from playwright.sync_api import sync_playwright
from helpers import gate
OUT='/tmp/claude-0/-home-claude/18c509e7-1926-53a8-acb9-60fa937e1357/scratchpad/shots/'
with sync_playwright() as p:
    b=p.chromium.launch()
    c=b.new_context(viewport={'width':402,'height':874},device_scale_factor=1,locale='fa-IR')
    pg=c.new_page()
    errs=[]
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.goto('http://localhost:8765/index.html'); gate(pg)
    pg.wait_for_timeout(3500)
    pg.screenshot(path=OUT+'01_onb.png')
    print('errors',errs)
    print(pg.evaluate("document.body.innerText.slice(0,400)"))
    print(pg.evaluate("[...document.querySelectorAll('[data-a]')].map(e=>e.dataset.a).join(',')"))
    b.close()
