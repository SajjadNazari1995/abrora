from playwright.sync_api import sync_playwright
OUT='/tmp/claude-0/-home-claude/18c509e7-1926-53a8-acb9-60fa937e1357/scratchpad/shots/'
U='http://localhost:8765/index.html'
res=[]
def ok(n,c,x=''):
    res.append(c); print(('PASS ' if c else 'FAIL ')+n, '' if c else x)
OLD={"settings":{"lang":"fa","font":"vazir","theme":"auto","weekStart":1,"cycleLen":28,"periodLen":5,"lutealLen":14,"onboarded":True},"periods":[{"start":20400,"end":20404}],"logs":{}}
with sync_playwright() as p:
    b=p.chromium.launch()
    c=b.new_context(viewport={'width':402,'height':874},locale='fa-IR')
    pg=c.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    cdp=c.new_cdp_session(pg)
    cdp.send('WebAuthn.enable')
    auth=cdp.send('WebAuthn.addVirtualAuthenticator',{'options':{'protocol':'ctap2','transport':'internal','hasResidentKey':True,'hasUserVerification':True,'isUserVerified':True,'automaticPresenceSimulation':True}})
    # v1.2.0-style data migration
    pg.goto(U); pg.evaluate("k=>localStorage.setItem('abrora:v1',JSON.stringify(k))",OLD); pg.reload(); pg.wait_for_timeout(3500)
    ok('old data migrates (no onboarding)', pg.locator('.onb').count()==0 and pg.locator('.art-row').count()>=1)
    # SW + offline
    pg.wait_for_timeout(1500)
    ok('sw active', pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!!(r&&r.active))"))
    pg.reload(); pg.wait_for_timeout(3000)
    cc=pg.evaluate("caches.open('abrora-content').then(c=>c.keys()).then(k=>k.length)"); ok('content cache filled', cc>=10, cc)
    c.set_offline(True); pg.reload(); pg.wait_for_timeout(3500)
    ok('offline: app + articles open', pg.locator('.art-row').count()>=1)
    pg.locator('.art-row').first.click(); pg.wait_for_timeout(600)
    ok('offline: article body', pg.locator('[data-act=article-full]').count()==1)
    pg.click('[data-act=article-full]'); pg.wait_for_timeout(400); ok('offline: full text', pg.locator('.reader p, .reader li').count()>=3)
    c.set_offline(False)
    # lock
    pg.reload(); pg.wait_for_timeout(3500)
    pg.click('[data-act=settings]'); pg.wait_for_timeout(300)
    ok('lock row visible', pg.locator('[data-act=lock-toggle]').count()==1)
    pg.click('[data-act=lock-toggle]'); pg.wait_for_timeout(1200)
    ok('lock enabled', pg.evaluate("!!localStorage.getItem('abrora:lock')"))
    ok('lock excluded from data key', 'abrora:lock' not in pg.evaluate("localStorage.getItem('abrora:v1')"))
    pg.reload(); pg.wait_for_timeout(4000)
    pg.screenshot(path=OUT+'10_after_reload_lock.png')
    locked=pg.evaluate("document.documentElement.classList.contains('is-locked')")
    print('locked after reload:',locked, '| overlay:', pg.locator('.applock').count())
    ok('boot unlocks via auth (virtual authenticator verified)', not locked or pg.locator('[data-act=lock-unlock]').count()==1)
    if pg.locator('[data-act=lock-unlock]').count():
        pg.click('[data-act=lock-unlock]'); pg.wait_for_timeout(1200)
    ok('unlocked', not pg.evaluate("document.documentElement.classList.contains('is-locked')"))
    # failed verification -> stays locked
    cdp.send('WebAuthn.setUserVerified',{'authenticatorId':auth['authenticatorId'],'isUserVerified':False})
    pg.reload(); pg.wait_for_timeout(4000)
    ok('failed verification keeps lock', pg.evaluate("document.documentElement.classList.contains('is-locked')"))
    pg.screenshot(path=OUT+'11_locked.png')
    # forgot lock -> erase
    if pg.locator('[data-act=lock-help]').count():
        pg.click('[data-act=lock-help]'); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'12_lockhelp.png')
        pg.click('[data-act=lock-reset-yes]'); pg.wait_for_timeout(1500)
        ok('reset erases data + lock', pg.evaluate("!localStorage.getItem('abrora:lock')") and pg.locator('.onb').count()==1)
    else: ok('lock-help present', False)
    ok('no page errors', not [e for e in errs if 'NotAllowed' not in e and 'Failed to load resource' not in e], errs)
    b.close()
print(res.count(False),'failed')
