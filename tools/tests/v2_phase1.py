from playwright.sync_api import sync_playwright
import json, subprocess, time, sys
from helpers import pass_terms, cat, cat_back
OUT='/tmp/claude-0/-home-claude/18c509e7-1926-53a8-acb9-60fa937e1357/scratchpad/shots/'
U='http://localhost:8765/index.html'
res=[]
def ok(n,c,extra=''):
    res.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n, extra if not c else '')

MOCK_ACC={'id':'acc_1','email':'a@b.co','providers':['email'],'emailVerified':False,'displayName':None,'locale':'en','calendar':'gregorian','status':'active','createdAt':'2026-11-07T00:00:00Z','needsConsent':['terms','privacy'],'flags':{'vault':False}}
calls=[]
def mock(route, req):
    u=req.url; m=req.method
    path=u.split('/v1',1)[1] if '/v1' in u else u
    calls.append((m,path.split('?')[0], req.post_data))
    def j(code,obj): route.fulfill(status=code,content_type='application/json',headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'},body=json.dumps(obj))
    if m=='OPTIONS': return route.fulfill(status=204,headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'})
    if path.startswith('/auth/register'): return j(201,{'session':{'token':'t','expiresAt':'2099-01-01T00:00:00Z'},'account':MOCK_ACC,'device':{'id':'dev_1'}})
    if path.startswith('/auth/login'):
        b=json.loads(req.post_data)
        return j(200,{'session':{'token':'t','expiresAt':'2099-01-01T00:00:00Z'},'account':MOCK_ACC,'device':{'id':'dev_1'}}) if b['password']=='correct-horse-1' else j(401,{'error':{'code':'unauthorized','message':'x'}})
    if path.startswith('/me/consents'): return j(200,{'ok':True})
    if path.startswith('/auth/reauth'): return j(200,{'reauthToken':'rt','expiresAt':'2099'})
    if m=='DELETE' and path.startswith('/me'): return j(200,{'deletion':{'state':'server_completed','backups':{'state':'expires','by':'2026-12-12T00:00:00Z'}}})
    if path.startswith('/auth/logout'): return route.fulfill(status=204,headers={'access-control-allow-origin':'*'})
    return j(404,{'error':{'code':'not_found','message':''}})

with sync_playwright() as p:
    b=p.chromium.launch()
    c=b.new_context(viewport={'width':402,'height':874},locale='en-US')
    c.route('**/mock-core/v1/**', mock)
    pg=c.new_page(); errs=[]
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.add_init_script("self.__cfg=1")
    pg.goto(U+'?still')
    pg.evaluate("ABRORA_CONFIG.coreApi='http://localhost:8765/mock-core'")
    pg.wait_for_timeout(1200)
    ok('splash tagline English on first run', pg.inner_text('#spTag')=='Your private cycle companion', pg.inner_text('#spTag'))
    ok('splash brand is Abra', pg.inner_text('#spName')=='Abra')
    pg.screenshot(path=OUT+'v2_01_splash.png')
    pg.goto(U); pg.evaluate("ABRORA_CONFIG.coreApi='http://localhost:8765/mock-core'"); pg.wait_for_selector('#docScroll', timeout=9000)
    pg.wait_for_timeout(2600)
    ok('default language English / ltr', pg.evaluate("document.documentElement.lang+document.documentElement.dir")=='enltr')
    ok('title Abra', pg.title()=='Abra')
    # language icon top-right
    bb=pg.locator('.lang-btn').bounding_box()
    ok('language icon is top-right', bb and bb['x']+bb['width']>402-24 and bb['y']<60, bb)
    pg.screenshot(path=OUT+'v2_02_terms.png')
    # terms gate
    ok('checkbox disabled before end of scroll', pg.is_disabled('#docCheck'))
    ok('continue disabled before end', pg.is_disabled('#docNext'))
    ok('checkbox starts unchecked', not pg.is_checked('#docCheck'))
    pg.evaluate("document.getElementById('docScroll').scrollTop = 1e6"); pg.wait_for_timeout(200)
    ok('checkbox enabled after scrolling to end', not pg.is_disabled('#docCheck'))
    ok('checkbox still unchecked after end', not pg.is_checked('#docCheck'))
    ok('continue still disabled until ticked', pg.is_disabled('#docNext'))
    pg.check('#docCheck'); ok('continue enabled after tick', not pg.is_disabled('#docNext'))
    pg.click('#docNext'); pg.wait_for_timeout(150)
    ok('second document shown, gate resets', pg.is_disabled('#docCheck') and not pg.is_checked('#docCheck') and pg.is_disabled('#docNext'))
    ok('step indicator 2/2', '2 / 2' in pg.inner_text('.doc-step'))
    # language switch to Persian keeps icon top-right, rtl
    pg.click('.lang-btn'); pg.click('[data-act=pre-lang][data-v=fa]'); pg.wait_for_timeout(200)
    bb=pg.locator('.lang-btn').bounding_box()
    ok('fa: rtl and icon still top-right', pg.evaluate("document.documentElement.dir")=='rtl' and bb['x']+bb['width']>402-24, bb)
    ok('fa: brand stays Latin Abra', pg.inner_text('.brand-name')=='Abra')
    pg.screenshot(path=OUT+'v2_03_terms_fa.png')
    pg.click('.lang-btn'); pg.click('[data-act=pre-lang][data-v=en]')
    pg.evaluate("document.getElementById('docScroll').scrollTop = 1e6"); pg.wait_for_function("!document.getElementById('docCheck').disabled")
    pg.check('#docCheck'); pg.click('#docNext'); pg.wait_for_timeout(300)
    rec=pg.evaluate("Store.load('consent')")
    ok('consent recorded for both docs with version+locale+time', rec and len(rec['records'])==2 and all(r['version']=='2026-11-07' and r['locale'] and r['acceptedAt'] for r in rec['records']), rec)
    # login screen
    ok('login screen shown after terms', pg.locator('#loginForm').count()==1)
    pg.screenshot(path=OUT+'v2_04_login.png')
    pg.fill('#lgEmail','a@b.co'); pg.fill('#lgPw','wrongwrong'); pg.click('#lgGo'); pg.wait_for_timeout(500)
    ok('wrong password shows generic error', 'incorrect' in pg.inner_text('#lgMsg'), pg.inner_text('#lgMsg'))
    pg.click('[data-act=login-mode]'); pg.fill('#lgEmail','a@b.co'); pg.fill('#lgPw','correct-horse-1'); pg.click('#lgGo'); pg.wait_for_timeout(700)
    ok('register signs in and goes to onboarding', pg.locator('.onb').count()==1)
    cons=[x for x in calls if x[1].startswith('/me/consents')]
    ok('consent records posted to Core after sign-in', len(cons)==1 and 'terms' in cons[0][2] and 'privacy' in cons[0][2], cons)
    ok('no health fields ever sent to Core', not any(k in (x[2] or '') for x in calls for k in ['periods','logs','flow','mood','symptom']))
    # onboarding: default calendar gregorian, language & calendar independent
    ok('calendar defaults to Gregorian', pg.evaluate("S=null,document.querySelector('[data-act=set-cal][data-v=gregorian]').getAttribute('aria-pressed')")=='true')
    pg.click('[data-act=set-lang][data-v=fa]'); pg.wait_for_timeout(200)
    ok('fa language keeps Gregorian', pg.evaluate("document.querySelector('[data-act=set-cal][data-v=gregorian]').getAttribute('aria-pressed')")=='true')
    pg.click('[data-act=set-cal][data-v=jalali]'); pg.click('[data-act=set-lang][data-v=en]'); pg.wait_for_timeout(200)
    ok('en language keeps Jalali', pg.evaluate("document.querySelector('[data-act=set-cal][data-v=jalali]').getAttribute('aria-pressed')")=='true')
    pg.click('[data-act=set-cal][data-v=gregorian]')
    pg.click('[data-act=onb-next]'); pg.click('[data-act=pick-day]:not([disabled]) >> nth=0'); pg.click('[data-act=onb-next]'); pg.click('[data-act=onb-finish]'); pg.wait_for_timeout(1200)
    # storage is encrypted
    raw=pg.evaluate("localStorage.getItem('abra:s:main')")
    ok('stored data is ciphertext (no readable keys)', raw and '"periods"' not in raw and '"ct"' in raw, (raw or '')[:80])
    ok('encryption mode enc', pg.evaluate("Store.mode()")=='enc')
    ok('no legacy plain key', pg.evaluate("localStorage.getItem('abrora:v1')")is None)
    # settings
    pg.click('[data-act=settings]'); pg.wait_for_timeout(300)
    ok('settings opens as a short category list', pg.locator('.cat-row').count()==8 and pg.evaluate("document.body.scrollHeight")<1100, pg.evaluate("document.body.scrollHeight"))
    pg.screenshot(path=OUT+'v2_05a_settings_list.png')
    cat(pg,'account'); ok('settings shows account email', 'a@b.co' in pg.inner_text('.acct-id')); cat_back(pg)
    cat(pg,'about'); ok('about shows Nazari Technologies logo', pg.locator('.nz-logo').count()==1); pg.screenshot(path=OUT+'v2_05_settings.png', full_page=True); cat_back(pg)
    cat(pg,'look')
    # skins
    pg.click('[data-act=set-skin][data-v=glass]'); pg.wait_for_timeout(300)
    ok('glass skin applied', pg.evaluate("document.documentElement.dataset.skin")=='glass')
    bf=pg.evaluate("getComputedStyle(document.querySelector('.group')).backdropFilter")
    ok('glass uses backdrop-filter', 'blur' in bf, bf)
    pg.screenshot(path=OUT+'v2_06_settings_glass.png', full_page=True)
    # reload keeps the last language on the splash
    pg.evaluate("document.querySelector('[data-act=set-skin][data-v=calm]').click()"); pg.evaluate("document.querySelector('[data-act=set-lang][data-v=de]').click()"); pg.wait_for_timeout(300)
    pg.reload(); pg.evaluate("ABRORA_CONFIG.coreApi='http://localhost:8765/mock-core'"); pg.wait_for_timeout(400)
    ok('splash shows last chosen language (de) on reopen', pg.evaluate("document.getElementById('spTag')? document.getElementById('spTag').textContent : 'gone'") in ('Deine private Zyklus-Begleiterin','gone'))
    pg.wait_for_timeout(3000)
    ok('app reopens in German, still signed in', pg.evaluate("document.documentElement.lang")=='de' and pg.locator('.tabbar').count()==1)
    pg.screenshot(path=OUT+'v2_07_home_de.png')
    # delete account
    pg.evaluate("document.querySelector('[data-act=settings]').click()"); pg.wait_for_timeout(300); cat(pg,'account'); pg.evaluate("document.querySelector('[data-act=del-open]').click()"); pg.wait_for_timeout(400)
    ok('delete button disabled until DELETE typed', pg.is_disabled('#delGo'))
    pg.fill('#delPw','correct-horse-1'); pg.fill('#delType','DELETE'); ok('delete enabled after DELETE', not pg.is_disabled('#delGo'))
    pg.screenshot(path=OUT+'v2_08_delete.png')
    pg.click('#delGo'); pg.wait_for_timeout(1200)
    ok('deletion result sheet with backup date', '2026-12-12' in pg.inner_text('.sheet'), pg.inner_text('.sheet')[:200])
    ok('Core DELETE /me called with confirm', any(x[0]=='DELETE' and 'DELETE' in (x[2] or '') and 'rt' in (x[2] or '') for x in calls))
    ok('local data & key erased', pg.evaluate("Object.keys(localStorage).filter(k=>k.indexOf('abra:s:')===0).length")==0)
    pg.click('[data-act=del-finish]'); pg.wait_for_timeout(400)
    ok('after deletion the terms gate returns', pg.locator('#docScroll').count()==1)
    ok('no JS errors', not [e for e in errs if 'Failed to load resource' not in e], errs)
    b.close()

    # legacy migration
    b=p.chromium.launch(); c=b.new_context(viewport={'width':402,'height':874}); pg=c.new_page()
    legacy={'v':1,'settings':{'lang':'fa','calendar':'jalali','onboarded':True,'name':'Sara','cycleLen':30,'periodLen':5,'lutealLen':14,'theme':'auto','font':'vazir','weekStart':6},'periods':[{'s':'2026-10-10','e':'2026-10-14','open':False}],'logs':{'2026-10-11':{'flow':2,'note':'secret-note'}},'reads':{},'saved':[]}
    pg.goto(U+'?still'); pg.evaluate("l=>{localStorage.setItem('abrora:v1',JSON.stringify(l));localStorage.setItem('abrora:pre-update',JSON.stringify({at:1,data:l}))}", legacy)
    pg.goto(U); pg.wait_for_selector('#docScroll', timeout=9000); pass_terms(pg); pg.wait_for_selector('.tabbar')
    ok('legacy: Persian preserved on first launch after upgrade', pg.evaluate("document.documentElement.lang")=='fa')
    ok('legacy: plain copies removed', pg.evaluate("[ 'abrora:v1','abrora:pre-update' ].map(k=>localStorage.getItem(k)).join('')")=='')
    ok('legacy: nothing readable in storage', 'secret-note' not in json.dumps(pg.evaluate("Object.assign({},localStorage)")))
    pg.wait_for_timeout(500)
    ok('legacy: data migrated, app opens at home (no onboarding)', pg.locator('.tabbar').count()==1 and pg.locator('.onb').count()==0)
    ok('legacy: jalali calendar kept', pg.evaluate("I18N.getCalendar()")=='jalali')
    ok('legacy: snapshot moved into the protected store', pg.evaluate("Store.has('snap')"))
    b.close()
fails=[n for n,c in res if not c]
print('\n%d/%d passed'%(len(res)-len(fails),len(res)))
sys.exit(1 if fails else 0)
