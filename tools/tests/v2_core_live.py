"""Browser <-> real Core API (php -S, SQLite temp db): register, consent, sign-out/in, delete account."""
from playwright.sync_api import sync_playwright
import subprocess, tempfile, os, time, sys, sqlite3, json
from helpers import pass_terms, cat, cat_back
CORE='/home/claude/work/abra-core'
tmp=tempfile.mkdtemp(); db=tmp+'/t.sqlite'
cfg=tmp+'/config.php'
open(cfg,'w').write("""<?php return ['db'=>['dsn'=>'sqlite:%s'],'data_dir'=>'%s','pepper'=>'test-pepper-test-pepper','allowed_origins'=>['http://localhost:8765'],'service_tokens'=>[],'mail'=>['from'=>'a@b.c','sink'=>'%s/mail.txt'],'app_base_url'=>'http://localhost:8765','argon'=>['memory_cost'=>1024,'time_cost'=>1,'threads'=>1]];"""%(db,tmp,tmp))
env=dict(os.environ,ABRA_CONFIG=cfg)
subprocess.run(['php',CORE+'/bin/migrate.php'],env=env,check=True,capture_output=True)
srv=subprocess.Popen(['php','-S','127.0.0.1:8791','-t',CORE+'/public'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
web=subprocess.Popen(['python3','-m','http.server','8765','-d','/home/claude/work/abrora'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1.5)
res=[]
def ok(n,c,extra=''):
    res.append(c); print(('PASS ' if c else 'FAIL ')+n, extra if not c else '')
try:
    with sync_playwright() as p:
        b=p.chromium.launch(); pg=b.new_page(viewport={'width':402,'height':874}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.goto('http://localhost:8765/index.html?still'); pg.evaluate("ABRORA_CONFIG.coreApi='http://127.0.0.1:8791'")
        pg.goto('http://localhost:8765/index.html'); pg.evaluate("ABRORA_CONFIG.coreApi='http://127.0.0.1:8791'")
        pg.wait_for_selector('#docScroll'); pass_terms(pg)
        pg.click('[data-act=login-mode]'); pg.fill('#lgEmail','Sajjad@Example.com'); pg.fill('#lgPw','short'); pg.click('#lgGo'); pg.wait_for_timeout(800)
        ok('weak password rejected with guidance', '10 characters' in pg.inner_text('#lgMsg'), pg.inner_text('#lgMsg'))
        pg.fill('#lgPw','correct-horse-battery-9'); pg.click('#lgGo'); pg.wait_for_selector('.onb', timeout=8000)
        ok('real API: register -> onboarding', True)
        pg.wait_for_timeout(600)
        con=sqlite3.connect(db); rows=con.execute("select doc_id,version,locale from consents").fetchall()
        ok('server stored both consent records (version+locale)', sorted(r[0] for r in rows)==['privacy','terms'] and all(r[1]=='2026-11-07' for r in rows), rows)
        em=con.execute("select email_norm from accounts").fetchall(); ok('email normalised lowercase', em==[('sajjad@example.com',)], em)
        pg.click('[data-act=onb-next]'); pg.click('[data-act=pick-day]:not([disabled]) >> nth=0'); pg.click('[data-act=onb-next]'); pg.click('[data-act=onb-finish]'); pg.wait_for_timeout(1000)
        pg.evaluate("document.querySelector('[data-act=settings]').click()"); pg.wait_for_timeout(300); cat(pg,'account')
        pg.evaluate("document.querySelector('[data-act=signout]').click()"); pg.wait_for_selector('#loginForm')
        ok('sign out returns to login', True)
        pg.fill('#lgEmail','sajjad@example.com'); pg.fill('#lgPw','wrong-password-1'); pg.click('#lgGo'); pg.wait_for_timeout(700)
        ok('wrong password generic error', 'incorrect' in pg.inner_text('#lgMsg'))
        pg.fill('#lgPw','correct-horse-battery-9'); pg.click('#lgGo'); pg.wait_for_selector('.tabbar', timeout=8000)
        ok('login works and local data still there', True)
        pg.evaluate("document.querySelector('[data-act=settings]').click()"); pg.wait_for_timeout(300); cat(pg,'account')
        pg.evaluate("document.querySelector('[data-act=del-open]').click()"); pg.wait_for_timeout(400)
        pg.fill('#delPw','correct-horse-battery-9'); pg.fill('#delType','DELETE'); pg.click('#delGo'); pg.wait_for_timeout(1500)
        ok('deletion confirmation shown', 'deleted' in pg.inner_text('.sheet').lower(), pg.inner_text('.sheet')[:150])
        con=sqlite3.connect(db)
        ok('server: account gone', con.execute('select count(*) from accounts').fetchone()[0]==0)
        ok('server: consent kept only de-identified', con.execute('select count(*) from consents').fetchone()[0]==2 and con.execute("select count(*) from consents where account_ref like 'acc_%'").fetchone()[0]==0)
        ok('no JS errors', not errs, errs)
        b.close()
finally:
    srv.terminate(); web.terminate()
print('%d/%d passed'%(sum(res),len(res))); sys.exit(0 if all(res) else 1)
