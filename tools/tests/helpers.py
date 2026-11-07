"""Shared helpers: get past the first-run gates (terms, sign-in) in browser tests."""
def pass_terms(pg):
    for _ in range(2):
        pg.wait_for_selector('#docScroll')
        pg.evaluate("document.getElementById('docScroll').scrollTop = 1e6")
        pg.wait_for_function("!document.getElementById('docCheck').disabled")
        pg.check('#docCheck')
        pg.click('#docNext'); pg.wait_for_timeout(150)

def pass_gates(pg, guest=True):
    """terms -> (guest) -> onboarding"""
    pass_terms(pg)
    if guest:
        pg.click('[data-act=login-guest]'); pg.wait_for_timeout(200)

def gate(pg, guest=True):
    """Pass the terms gate (and choose "this device only") if the app is showing them; otherwise do nothing."""
    try:
        pg.wait_for_selector('#docScroll', timeout=6000)
    except Exception:
        return
    pass_terms(pg)
    if guest:
        try:
            pg.wait_for_selector('[data-act=login-guest]', timeout=3000); pg.click('[data-act=login-guest]'); pg.wait_for_timeout(300)
        except Exception:
            pass

def cat(pg, name):
    """Settings are grouped: open a category from the settings list."""
    pg.evaluate("n=>document.querySelector('[data-act=set-cat][data-v='+n+']').click()", name); pg.wait_for_timeout(250)

def cat_back(pg):
    pg.evaluate("document.querySelector('[data-act=set-cat-back]').click()"); pg.wait_for_timeout(250)
