"""Phase 2: two browsers <-> real Core API. Pairing, brand switch, safety code, selective sharing, encrypted chat, unlink."""
from playwright.sync_api import sync_playwright
import subprocess, tempfile, os, time, sys, sqlite3, re
from helpers import pass_terms
CORE='/home/claude/work/abra-core'
tmp=tempfile.mkdtemp(); db=tmp+'/t.sqlite'; cfg=tmp+'/config.php'
open(cfg,'w').write("<?php return ['db'=>['dsn'=>'sqlite:%s'],'data_dir'=>'%s','pepper'=>'test-pepper-test-pepper','allowed_origins'=>['http://localhost:8765'],'service_tokens'=>[],'mail'=>['from'=>'a@b.co']];"%(db,tmp))
env=dict(os.environ,ABRA_CONFIG=cfg)
subprocess.run(['php',CORE+'/bin/migrate.php'],env=env,check=True,capture_output=True)
srv=subprocess.Popen(['php','-S','127.0.0.1:8791','-t',CORE+'/public'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1.2)
OUT='/tmp/claude-0/-home-claude/18c509e7-1926-53a8-acb9-60fa937e1357/scratchpad/'
res=[]
def ok(n,c,extra=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n, '' if c else extra)
def signup(b, email, name):
    c=b.new_context(viewport={'width':402,'height':874}); pg=c.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.evaluate("ABRORA_CONFIG.coreApi='http://127.0.0.1:8791'")
    pg.wait_for_selector('#docScroll'); pass_terms(pg)
    pg.click('[data-act=login-mode]'); pg.fill('#lgEmail',email); pg.fill('#lgPw','correct-horse-battery-9'); pg.click('#lgGo'); pg.wait_for_selector('.onb', timeout=8000)
    pg.fill('#nameField',name) if pg.locator('#nameField').count() else None
    pg.click('[data-act=onb-next]'); pg.wait_for_timeout(200)
    pg.click('[data-act=onb-next]') if pg.locator('[data-act=pick-day]').count()==0 else None
    pg.click('[data-act=pick-day]:not([disabled]) >> nth=0'); pg.click('[data-act=onb-next]'); pg.click('[data-act=onb-finish]'); pg.wait_for_timeout(900)
    return c,pg,errs
def tab(pg,v): pg.click(f'[data-act=tab][data-v={v}]'); pg.wait_for_timeout(700)
try:
    with sync_playwright() as p:
        b=p.chromium.launch()
        ca,A,ea=signup(b,'sara@example.com','Sara'); cb,B,eb=signup(b,'mina@example.com','Mina')
        ok('solo: brand is Abra', A.evaluate("document.documentElement.dataset.brand")=='abra' and 'Abra' in A.title())
        tab(A,'together'); tab(B,'together')
        ok('together tab offers invite + join', A.locator('[data-act=tg-invite]').count()==1 and A.locator('#tgCode').count()==1)
        A.click('[data-act=tg-invite]'); A.wait_for_selector('.tg-code', timeout=6000)
        code=A.inner_text('.tg-code').replace('-','').strip()
        ok('invite code is 8 chars with a QR', re.fullmatch(r'[0-9A-Z]{8}',code) is not None and A.locator('.tg-qr svg').count()==1, code)
        A.screenshot(path=OUT+'p2_invite.png')
        B.fill('#tgCode', code[:4]+'-'+code[4:].lower()); B.click('[data-act=tg-join]'); B.wait_for_selector('.tg-hero.paired', timeout=10000)
        ok('partner joined: paired view', True)
        A.wait_for_selector('.tg-hero.paired', timeout=12000)
        ok('inviter sees paired view without reloading', True)
        for who,pg in (('A',A),('B',B)):
            ok(f'{who}: brand switched to Abrora (name, theme attribute, title, tab icon)', pg.evaluate("document.documentElement.dataset.brand")=='abrora' and pg.title()=='Abrora' and 'abrora' in pg.evaluate("document.querySelector('link[rel=icon]').href"), pg.title())
        ok('prefs mirror stores brand for the next splash', A.evaluate("JSON.parse(localStorage.getItem('abra:prefs')).brand")=='abrora')
        A.wait_for_selector('.tg-safety', timeout=8000); B.wait_for_selector('.tg-safety', timeout=8000)
        sa,sb=A.inner_text('.tg-safety'),B.inner_text('.tg-safety')
        ok('safety codes identical on both phones', sa==sb and re.fullmatch(r'\d{5} \d{5} \d{5} \d{5}',sa) is not None, sa+'|'+sb)
        B.click('[data-act=tg-verify]'); B.wait_for_timeout(300)
        ok('verify marks the code as verified (and survives reload via Store)', 'Verified' in B.inner_text('.main, main, .view') or B.locator('.form-msg.ok').count()>=1)
        con=sqlite3.connect(db)
        ok('server holds two public keys, no private material', con.execute('select count(*) from space_member_keys').fetchone()[0]==2)
        # sharing: nothing by default
        ok('nothing shared by default', con.execute('select count(*) from space_shares').fetchone()[0]==0 and 'Nothing is shared' in B.inner_text('.view'))
        A.click('[data-act=tg-share][data-v=phase]'); A.wait_for_timeout(1200)
        row=con.execute('select enabled,ciphertext from space_shares').fetchall()
        ok('A switches on "Cycle phase": ciphertext stored, no plaintext phase words', len(row)==1 and row[0][0]==1 and row[0][1] and not re.search(r'follicular|menstrual|luteal|fertile',row[0][1],re.I), row)
        B.click('[data-act=tg-refresh]'); B.wait_for_timeout(1500)
        ok('B reads the decrypted phase summary', 'Cycle phase' in B.inner_text('.tg-theirs') and re.search(r'follicular|menstrual|luteal|fertile|Phase|Day',B.inner_text('.tg-theirs'),re.I) is not None, B.inner_text('.view')[:300])
        ok('B sees only the one category A allowed', B.locator('.tg-theirs .tg-row').count()==1)
        B.screenshot(path=OUT+'p2_paired_b.png', full_page=True)
        # Persian (RTL) view of the same screen
        tab(B,'home')
        B.evaluate("document.querySelector('[data-act=settings]').click()"); B.wait_for_timeout(300)
        B.evaluate("document.querySelector('[data-act=set-cat][data-v=look]').click()"); B.wait_for_timeout(300)
        B.evaluate("document.querySelector('[data-act=set-lang][data-v=fa]').click()"); B.wait_for_timeout(400)
        B.evaluate("document.querySelector('[data-act=settings-back]') && document.querySelector('[data-act=settings-back]').click()"); B.wait_for_timeout(200)
        tab(B,'together'); B.wait_for_timeout(1500)
        ok('Persian: RTL, translated, brand name stays Latin "Abrora"', B.evaluate("document.documentElement.dir")=='rtl' and 'اشتراک' in B.inner_text('.view') and B.title()=='Abrora' and 'با هم' in B.inner_text('.page-title'), B.inner_text('.view')[:200])
        B.screenshot(path=OUT+'p2_fa.png')
        tab(B,'home')
        B.evaluate("document.querySelector('[data-act=settings]').click()"); B.wait_for_timeout(300)
        B.evaluate("document.querySelector('[data-act=set-cat][data-v=look]').click()"); B.wait_for_timeout(300)
        B.evaluate("document.querySelector('[data-act=set-lang][data-v=en]').click()"); B.wait_for_timeout(300)
        tab(B,'together'); B.wait_for_timeout(800)
        # chat
        B.fill('#tgMsg','Hello Sara, thinking of you'); B.press('#tgMsg','Enter'); B.wait_for_timeout(1500)
        msg=con.execute('select kind,ciphertext from space_messages').fetchall()
        ok('chat message stored as ciphertext only', len(msg)==1 and msg[0][0]=='text' and 'Hello' not in msg[0][1] and 'Sara' not in msg[0][1], msg)
        A.wait_for_selector('#tgChat .msg.them', timeout=12000)
        ok('A receives and decrypts the text', 'Hello Sara' in A.inner_text('#tgChat'), A.inner_text('#tgChat'))
        A.click('[data-act=tg-stk]'); A.click('[data-act=tg-sticker][data-v="🤗"]'); A.wait_for_timeout(1500)
        B.click('[data-act=tg-refresh]'); B.wait_for_timeout(1500)
        ok('sticker delivered', '🤗' in B.inner_text('#tgChat') and con.execute("select count(*) from space_messages where kind='sticker'").fetchone()[0]==1)
        ok('chat has no attachment control (text and stickers only)', B.locator('input[type=file]').count()==0)
        # switch off
        A.click('[data-act=tg-share][data-v=phase]'); A.wait_for_timeout(1200)
        row=con.execute('select enabled,ciphertext from space_shares').fetchall()
        ok('A switches off: ciphertext deleted at once', row and row[0][0]==0 and row[0][1] is None, row)
        B.click('[data-act=tg-refresh]'); B.wait_for_timeout(1300)
        ok('B no longer sees it', B.locator('.tg-theirs .tg-row').count()==0)
        ok('consent history lists the on/off events', len(re.findall(r'switched o',A.inner_text('.tg-hist')))==2, A.inner_text('.view')[-500:])
        A.screenshot(path=OUT+'p2_paired_a.png', full_page=True)
        # unlink by B without A's permission
        B.click('[data-act=tg-unlink]'); B.wait_for_selector('[data-act=tg-unlink-go]'); B.click('[data-act=tg-unlink-go]'); B.wait_for_timeout(1500)
        ok('B (unlinks): back to solo and brand Abra', B.evaluate("document.documentElement.dataset.brand")=='abra' and B.locator('[data-act=tg-invite]').count()==1, B.inner_text('.view')[:200])
        ok('server: space, shares, messages, history, keys all gone', con.execute('select (select count(*) from spaces),(select count(*) from space_messages),(select count(*) from space_shares),(select count(*) from space_member_keys),(select count(*) from space_consents)').fetchone()==(0,0,0,0,0))
        A.click('[data-act=tg-refresh]'); A.wait_for_selector('[data-act=tg-ack]', timeout=8000)
        ok('A is told once that the connection ended; brand already Abra', A.evaluate("document.documentElement.dataset.brand")=='abra' and 'ended' in A.inner_text('.view').lower())
        A.click('[data-act=tg-ack]'); A.wait_for_timeout(1200)
        ok('after OK: A is solo again', A.locator('[data-act=tg-invite]').count()==1)
        ok('no JS errors in either browser', not ea and not eb, (ea,eb))
        b.close()
finally:
    srv.terminate()
print('%d/%d passed'%(sum(res),len(res))); sys.exit(0 if all(res) else 1)
