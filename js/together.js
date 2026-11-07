/* Abrora "Together": invite / join, selective sharing, encrypted chat, consent history, unlink.
   The server only relays ciphertext (see Pair). Everything here fails softly: no network never breaks the rest of the app. */
(function (root) {
  'use strict';
  var API = null;
  var CATS = ['phase', 'forecast', 'fertility', 'mood', 'symptoms'];
  var STICKERS = ['🤗', '❤️', '🌸', '☕', '🍫', '🫶', '🌙', '✨', '🙏', '😴', '🤒', '🌿'];
  var TG = fresh();
  var timers = { poll: 0, inv: 0 }, scanning = null, active = false;

  function fresh() {
    return { status: 'idle', space: null, me: null, partner: null, key: null, fp: null, fpOk: true, verified: false, keyChanged: false,
      partnerKeyReady: false, mine: {}, theirs: {}, msgs: [], lastId: 0, hist: [], invite: null, busy: false, err: '', joinErr: '', code: '', scan: false, scanMsg: '', pushed: {}, ended: false, stk: false, draft: '' };
  }
  function t() { return API.t.apply(null, arguments); }
  function esc(s) { return API.esc(s); }
  function fmt1(s, v) { return String(s).replace(/%[sd]/, v); }
  function acct() { return Core.account() || {}; }
  function spaceInfo() { return acct().space || {}; }
  function isPaired() { return spaceInfo().state === 'paired'; }

  /* ---------- small persistent state (verified safety code, last known partner key) ---------- */
  var PS = { verifiedFp: null, knownKey: null, spaceId: null };
  function loadPS() { return Store.load('pair').then(function (v) { if (v && typeof v === 'object') PS = { verifiedFp: v.verifiedFp || null, knownKey: v.knownKey || null, spaceId: v.spaceId || null }; }, function () { }); }
  function savePS() { return Store.save('pair', PS); }

  /* ---------- state refresh ---------- */
  function startPolling() {
    stopPolling(); active = true;
    timers.poll = setInterval(tick, 4500);
  }
  function stopPolling() { active = false; clearInterval(timers.poll); clearInterval(timers.inv); timers.poll = 0; timers.inv = 0; stopScan(); }
  function tick() {
    if (!active || document.hidden) return;
    if (TG.status === 'paired') { pollMessages(); if (!TG.partnerKeyReady) refresh(true); else { pushShares(); pollShares(); } }
  }

  function refresh(quiet) {
    if (!Core.signedIn()) { TG.status = 'guest'; API.rerender(); return Promise.resolve(); }
    if (!Core.configured()) { TG.status = 'nocore'; API.rerender(); return Promise.resolve(); }
    return Core.me().then(function () {
      var sp = spaceInfo();
      API.syncBrand();
      if (sp.state === 'ended') { TG.status = 'ended'; TG.ended = true; API.rerender(); return; }
      if (sp.state === 'paired') return loadSpace(quiet);
      TG.status = 'solo'; TG.space = null; TG.theirs = {}; TG.msgs = []; TG.lastId = 0; TG.key = null;
      API.rerender();
    }).catch(function (e) {
      if (e && e.code === 'network') { TG.err = t('tw.offline'); if (TG.status === 'idle') TG.status = isPaired() ? 'paired' : 'solo'; }
      else TG.err = t('tw.err.generic');
      API.rerender();
    });
  }

  function loadSpace(quiet) {
    return Promise.all([Pair.ensureKeys(), loadPS()]).then(function (r) {
      var myPub = r[0];
      return Core.space().then(function (j) {
        var sp = j.space; TG.space = sp;
        TG.me = sp.members.filter(function (m) { return m.you; })[0] || null;
        TG.partner = sp.members.filter(function (m) { return !m.you; })[0] || null;
        var reg = TG.me && TG.me.publicKey !== myPub ? Core.putMemberKey(myPub) : Promise.resolve();
        return reg.then(function () {
          TG.status = 'paired';
          if (!TG.partner || !TG.partner.publicKey || (TG.me && TG.me.publicKey !== myPub && !TG.me.publicKey)) { TG.partnerKeyReady = false; API.rerender(); return; }
          var ppub = TG.partner.publicKey;
          return Pair.fingerprint(myPub, ppub).then(function (fp) {
            TG.fp = fp; TG.fpOk = !sp.keyFingerprint || sp.keyFingerprint === fp || TG.me.publicKey !== myPub;
            if (PS.spaceId !== sp.id) { PS = { verifiedFp: null, knownKey: ppub, spaceId: sp.id }; savePS(); }
            TG.keyChanged = !!(PS.knownKey && PS.knownKey !== ppub);
            if (TG.keyChanged) { PS.verifiedFp = null; }
            TG.verified = !!PS.verifiedFp && PS.verifiedFp === fp;
            return Pair.derive(sp.id, ppub);
          }).then(function (k) {
            TG.key = k; TG.partnerKeyReady = true;
            return Promise.all([pollShares(true), pollMessages(true), loadHistory()]);
          }).then(function () { API.rerender(); pushShares(); });
        });
      });
    }).catch(function (e) {
      if (e && e.code === 'unsupported') TG.err = t('tw.err.keys'); else if (e && e.code === 'network') TG.err = t('tw.offline'); else TG.err = t('tw.err.generic');
      if (TG.status === 'idle') TG.status = 'paired';
      API.rerender();
    });
  }

  /* ---------- shares ---------- */
  function shareAad(mem, cat) { return 'abrora/share/' + TG.space.id + '/' + mem + '/' + cat; }
  function pollShares(noRender) {
    if (TG.status !== 'paired' || !TG.key) return Promise.resolve();
    return Core.shares().then(function (j) {
      TG.mine = {}; j.mine.forEach(function (m) { TG.mine[m.category] = m.enabled; });
      var jobs = j.partner.map(function (p) {
        return Pair.open(TG.key, p.blob, shareAad(TG.partner.memberId, p.category)).then(function (o) { return [p.category, o, p.updatedAt]; });
      });
      return Promise.all(jobs).then(function (rows) {
        var nx = {}; rows.forEach(function (r) { nx[r[0]] = { data: r[1], at: r[2] }; });
        var changed = JSON.stringify(nx) !== JSON.stringify(TG.theirs);
        TG.theirs = nx;
        if (changed && !noRender && active && API.view() === 'together') API.rerender();
      });
    }).catch(function () { });
  }
  function pushShares() {
    if (TG.status !== 'paired' || !TG.key || !TG.me) return;
    CATS.forEach(function (c) {
      if (!TG.mine[c]) return;
      var o = API.summary(c), js = JSON.stringify(o);
      if (TG.pushed[c] === js) return;
      Pair.seal(TG.key, o || { none: 1 }, shareAad(TG.me.memberId, c)).then(function (blob) {
        return Core.putShare(c, { enabled: true, blob: blob, keyVersion: 1 });
      }).then(function () { TG.pushed[c] = js; }, function () { });
    });
  }
  function toggleShare(cat) {
    if (!TG.key || TG.busy) return;
    var on = !TG.mine[cat];
    TG.busy = true;
    var job = on ? Pair.seal(TG.key, API.summary(cat) || { none: 1 }, shareAad(TG.me.memberId, cat)).then(function (blob) { return Core.putShare(cat, { enabled: true, blob: blob, keyVersion: 1 }); })
      : Core.putShare(cat, { enabled: false });
    job.then(function () {
      TG.mine[cat] = on; if (!on) delete TG.pushed[cat]; else TG.pushed[cat] = JSON.stringify(API.summary(cat));
      return loadHistory();
    }).catch(function () { TG.err = t('tw.err.generic'); }).then(function () { TG.busy = false; API.rerender(); });
  }
  function loadHistory() {
    return Core.consents().then(function (j) { TG.hist = j.history || []; }, function () { });
  }

  /* ---------- chat ---------- */
  function msgAad(sender, kind) { return 'abrora/msg/' + TG.space.id + '/' + sender + '/' + kind; }
  function pollMessages(noPaint) {
    if (TG.status !== 'paired' || !TG.key) return Promise.resolve();
    return Core.messages(TG.lastId).then(function (j) {
      if (!j.messages.length) return;
      return Promise.all(j.messages.map(function (m) {
        var sender = m.mine ? TG.me.memberId : TG.partner.memberId;
        return Pair.open(TG.key, m.blob, msgAad(sender, m.kind)).then(function (o) { return { id: m.id, mine: m.mine, kind: m.kind, at: m.createdAt, o: o }; });
      })).then(function (list) {
        var seen = {}; TG.msgs.forEach(function (m) { seen[m.id] = 1; });
        list.forEach(function (m) { if (!seen[m.id]) TG.msgs.push(m); TG.lastId = Math.max(TG.lastId, m.id); });
        TG.msgs = TG.msgs.filter(function (m) { return !m.pending; }).concat(TG.msgs.filter(function (m) { return m.pending; }));
        if (!noPaint) paintChat(true);
      });
    }).catch(function () { });
  }
  function paintChat(scroll) {
    var box = document.getElementById('tgChat'); if (!box) return;
    var near = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = chatHTML();
    if (scroll && near) box.scrollTop = box.scrollHeight;
  }
  function chatHTML() {
    if (!TG.msgs.length) return '<p class="hint center">' + esc(t('tw.chat_empty')) + '</p>';
    return TG.msgs.map(function (m) {
      var body = !m.o ? '<i>' + esc(t('tw.msg_bad')) + '</i>' : m.kind === 'sticker' ? '<span class="stk">' + esc(String(m.o.s || '').slice(0, 8)) + '</span>' : esc(String(m.o.m || '').slice(0, 600));
      var del = m.mine && m.id ? '<button class="msg-del" data-act="tg-msg-del" data-id="' + m.id + '" aria-label="' + esc(t('tw.msg_del')) + '" title="' + esc(t('tw.msg_del')) + '">×</button>' : '';
      return '<div class="msg ' + (m.mine ? 'me' : 'them') + (m.kind === 'sticker' ? ' sticker' : '') + '"><div class="bub">' + body + '</div>' + del + '</div>';
    }).join('');
  }
  function sendMsg(kind, obj) {
    if (!TG.key || !TG.me) return;
    var cid = Pair.clientId();
    Pair.seal(TG.key, obj, msgAad(TG.me.memberId, kind)).then(function (blob) {
      TG.msgs.push({ id: 0, mine: true, kind: kind, o: obj, pending: true, cid: cid }); paintChat(true);
      return Core.postMessage({ kind: kind, blob: blob, clientId: cid });
    }).then(function () { TG.msgs = TG.msgs.filter(function (m) { return m.cid !== cid; }); return pollMessages(); }, function (e) {
      TG.msgs = TG.msgs.filter(function (m) { return m.cid !== cid; }); paintChat();
      API.toast(e && e.status === 429 ? 'tw.err.rate' : 'tw.err.generic');
    });
  }

  /* ---------- invite / join ---------- */
  function normCode(s) { return String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); }
  function fmtCode(c) { return c && c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : c || ''; }
  function createInvite() {
    TG.busy = true; TG.err = ''; API.rerender();
    Core.invite().then(function (j) {
      TG.invite = j; TG.busy = false; API.rerender();
      clearInterval(timers.inv);
      timers.inv = setInterval(function () {
        if (!active || document.hidden) return;
        if (TG.invite && new Date(TG.invite.expiresAt) < new Date()) { clearInterval(timers.inv); TG.invite = null; API.rerender(); return; }
        Core.me().then(function () { if (isPaired()) { clearInterval(timers.inv); TG.invite = null; onPaired(); } }, function () { });
      }, 3000);
    }, function (e) { TG.busy = false; TG.err = e && e.status === 429 ? t('tw.err.rate') : t('tw.err.generic'); API.rerender(); });
  }
  function joinWith(raw) {
    var code = normCode((/abrora:pair:([0-9A-Za-z-]+)/i.exec(raw || '') || [0, raw])[1]);
    if (code.length !== 8) { TG.joinErr = t('tw.err.not_found'); API.rerender(); return; }
    stopScan(); TG.busy = true; TG.joinErr = ''; API.rerender();
    Core.accept(code).then(function () { TG.busy = false; return Core.me(); }).then(function () { onPaired(); }, function (e) {
      TG.busy = false;
      TG.joinErr = e && e.status === 404 ? t('tw.err.not_found') : e && e.status === 400 ? t('tw.err.own') : e && e.status === 429 ? t('tw.err.rate') : t('tw.err.generic');
      API.rerender();
    });
  }
  function onPaired() {
    TG.status = 'idle'; TG.fresh = true; API.syncBrand(); loadSpace().then(function () { API.celebrate(); });
  }

  /* ---------- QR scan ---------- */
  function canScan() { return !!(root.BarcodeDetector && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function startScan() {
    if (!canScan()) { TG.scanMsg = t('tw.scan_none'); API.rerender(); return; }
    TG.scan = true; TG.scanMsg = ''; API.rerender();
    var vid = document.getElementById('tgVideo'); if (!vid) return;
    var det = new BarcodeDetector({ formats: ['qr_code'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (stream) {
      scanning = stream; vid.srcObject = stream; vid.setAttribute('playsinline', ''); return vid.play();
    }).then(function () {
      (function loop() {
        if (!scanning) return;
        det.detect(vid).then(function (r) {
          if (r && r[0] && r[0].rawValue && /abrora:pair:/i.test(r[0].rawValue)) { joinWith(r[0].rawValue); return; }
          setTimeout(loop, 250);
        }, function () { setTimeout(loop, 400); });
      })();
    }).catch(function () { TG.scan = false; scanning = null; TG.scanMsg = t('tw.scan_none'); API.rerender(); });
  }
  function stopScan() {
    if (scanning) { try { scanning.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) { } scanning = null; }
    if (TG.scan) { TG.scan = false; }
  }

  /* ---------- unlink / ended ---------- */
  function unlink() {
    TG.busy = true; API.rerender();
    Core.unlink().then(function () { return Core.me(); }).then(function () { return finishLocal(); }, function (e) {
      TG.busy = false; if (e && e.status === 404) return Core.me().then(finishLocal); TG.err = t('tw.err.generic'); API.rerender();
    });
  }
  function finishLocal() {
    TG = fresh(); PS = { verifiedFp: null, knownKey: null, spaceId: null }; Store.remove('pair');
    API.closeSheet(); API.syncBrand(); TG.status = 'solo'; API.rerender(); API.toast('tw.unlinked');
  }
  function ackEnded() {
    Core.ackEnded().catch(function () { }).then(function () { return Core.me(); }).then(function () { TG = fresh(); TG.status = 'solo'; PS = { verifiedFp: null, knownKey: null, spaceId: null }; Store.remove('pair'); API.syncBrand(); API.rerender(); }, function () { });
  }

  /* ---------- views ---------- */
  function relDays(n) { return n === 0 ? t('tw.today') : fmt1(t('tw.in_days'), API.num(n)); }
  function theirsLine(cat, d) {
    if (!d || d.none) return esc(t('tw.nodata'));
    if (cat === 'phase') return esc(t('phase.' + d.phase)) + (d.day ? ' · ' + esc(fmt1(t('tw.day'), API.num(d.day))) : '');
    if (cat === 'forecast') return d.daysTo == null ? esc(t('tw.nodata')) : esc(t('tw.next') + ': ' + (d.daysTo < 0 ? t('tw.today') : relDays(d.daysTo)));
    if (cat === 'fertility') return esc(d.kind === 'ovulation' ? t('tw.fert_ovu') : d.kind === 'fertile' ? t('tw.fert_now') : t('tw.fert_not'));
    if (cat === 'mood') return (d.mood || []).length ? (d.mood || []).map(function (m) { return esc(API.moodEmoji(m) + ' ' + t('mood.' + m)); }).join(' · ') : esc(t('tw.nodata'));
    if (cat === 'symptoms') return (d.sym || []).length ? (d.sym || []).map(function (s) { return esc(t('sym.' + s)); }).join(' · ') : esc(t('tw.nodata'));
    return '';
  }
  function html() {
    var h = '<div class="page-head"><div class="left"><h1 class="page-title">' + esc(t('tw.title')) + '</h1></div><button class="icon-btn" data-act="tg-refresh" aria-label="' + esc(t('tw.refresh')) + '" title="' + esc(t('tw.refresh')) + '">' + API.icon('refresh') + '</button></div>';
    var st = TG.status;
    if (st === 'idle') return h + '<div class="tg-skeleton" aria-busy="true"></div>';
    if (TG.err) h += '<p class="form-msg err" role="status">' + esc(TG.err) + '</p>';
    if (st === 'guest') return h + hero() + '<section class="group"><h3>' + esc(t('tw.need_acct')) + '</h3><p class="hint">' + esc(t('tw.need_acct_d')) + '</p><button class="btn primary block" data-act="signin-open">' + esc(t('tw.signin')) + '</button></section>';
    if (st === 'nocore') return h + hero() + '<section class="group"><h3>' + esc(t('tw.nocore')) + '</h3><p class="hint">' + esc(t('tw.nocore_d')) + '</p></section>';
    if (st === 'ended') return h + '<section class="group tg-ended"><div class="big-em" aria-hidden="true">🌤️</div><h3>' + esc(t('tw.ended')) + '</h3><p class="hint">' + esc(t('tw.ended_d')) + '</p><button class="btn primary block" data-act="tg-ack">' + esc(t('tw.ok')) + '</button></section>';
    if (st === 'solo') return h + hero() + inviteCard() + joinCard();
    return h + pairedHTML();
  }
  function hero() {
    return '<section class="tg-hero"><div class="tg-orbs" aria-hidden="true"><img src="icons/abra.svg" alt=""><img src="icons/aurora.svg" alt=""></div><h2>' + esc(t('tw.hero')) + '</h2><p>' + esc(t('tw.hero_d')) + '</p></section>';
  }
  function inviteCard() {
    var inv = TG.invite, h = '<section class="group"><h3>' + esc(t('tw.invite')) + '</h3><p class="hint">' + esc(t('tw.invite_d')) + '</p>';
    if (!inv) return h + '<button class="btn primary block" data-act="tg-invite"' + (TG.busy ? ' disabled' : '') + '>' + esc(t('tw.invite_go')) + '</button></section>';
    var until = new Date(inv.expiresAt), hm = API.num(('0' + until.getHours()).slice(-2) + ':' + ('0' + until.getMinutes()).slice(-2));
    return h + '<div class="tg-qr" role="img" aria-label="' + esc(t('tw.qr_alt')) + '">' + QR.svg(inv.qrPayload) + '</div><div class="tg-code" dir="ltr" aria-live="polite">' + esc(fmtCode(inv.code)) + '</div>' +
      '<p class="hint center">' + esc(t('tw.invite_wait')) + ' · ' + esc(t('tw.invite_exp', hm)) + '</p>' +
      '<div class="actions two"><button class="btn soft block" data-act="tg-copy">' + esc(t('tw.copy')) + '</button><button class="btn ghost block" data-act="tg-invite">' + esc(t('tw.invite_new')) + '</button></div></section>';
  }
  function joinCard() {
    var h = '<section class="group"><h3>' + esc(t('tw.join')) + '</h3><p class="hint">' + esc(t('tw.join_d')) + '</p>';
    if (TG.scan) h += '<div class="tg-scan"><video id="tgVideo" muted playsinline></video><p class="hint center">' + esc(t('tw.scan_hint')) + '</p><button class="btn ghost block" data-act="tg-scan-stop">' + esc(t('tw.scan_stop')) + '</button></div>';
    h += '<label class="lbl" for="tgCode">' + esc(t('tw.code')) + '</label><input class="field tg-code-in" id="tgCode" dir="ltr" inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="14" value="' + esc(TG.code) + '" placeholder="ABCD-2345">';
    if (TG.joinErr || TG.scanMsg) h += '<p class="form-msg err" role="status">' + esc(TG.joinErr || TG.scanMsg) + '</p>';
    h += '<div class="actions two"><button class="btn primary block" data-act="tg-join"' + (TG.busy ? ' disabled' : '') + '>' + esc(t('tw.join_go')) + '</button>' + (canScan() ? '<button class="btn soft block" data-act="tg-scan">' + esc(t('tw.scan')) + '</button>' : '') + '</div></section>';
    return h;
  }
  function pairedHTML() {
    var p = TG.partner, name = p && p.displayName ? esc(p.displayName) : esc(t('tw.partner')), h = '';
    h += '<section class="tg-hero paired"><div class="tg-orbs" aria-hidden="true"><img src="icons/abrora.svg" alt=""></div><h2>' + esc(t('tw.paired')) + '</h2><p>' + name + (TG.space ? ' · ' + esc(fmt1(t('tw.since'), API.fmtDate(TG.space.createdAt))) : '') + '</p></section>';
    if (!TG.partnerKeyReady) return h + '<section class="group"><p class="hint center">' + esc(t('tw.waiting_key')) + '</p></section>';
    if (!TG.fpOk) return h + '<section class="group"><p class="form-msg err">' + esc(t('tw.safety_bad')) + '</p></section>';
    // safety code
    h += '<section class="group"><h3>' + esc(t('tw.safety')) + '</h3>' + (TG.keyChanged ? '<p class="form-msg err">' + esc(t('tw.safety_changed')) + '</p>' : '') +
      '<div class="tg-safety" dir="ltr">' + esc(Pair.safetyCode(TG.fp)) + '</div><p class="hint">' + esc(t('tw.safety_d')) + '</p>' +
      (TG.verified ? '<p class="form-msg ok">' + esc(t('tw.safety_done')) + '</p>' : '<button class="btn soft block" data-act="tg-verify">' + esc(t('tw.safety_ok')) + '</button>') + '</section>';
    // theirs
    var any = CATS.filter(function (c) { return TG.theirs[c]; });
    h += '<section class="group"><h3>' + esc(t('tw.theirs')) + '</h3>' + (any.length ? '<div class="tg-theirs">' + any.map(function (c) {
      return '<div class="tg-row"><b>' + esc(t('tw.cat.' + c)) + '</b><span>' + theirsLine(c, TG.theirs[c].data) + '</span></div>';
    }).join('') + '</div>' : '<p class="hint">' + esc(t('tw.theirs_none')) + '</p>') + '</section>';
    // mine
    h += '<section class="group"><h3>' + esc(t('tw.mine')) + '</h3><p class="hint">' + esc(t('tw.mine_d')) + '</p><div class="tg-toggles">' + CATS.map(function (c) {
      var on = !!TG.mine[c];
      return '<button class="tg-sw" role="switch" aria-checked="' + on + '" data-act="tg-share" data-v="' + c + '"' + (TG.busy ? ' disabled' : '') + '><span>' + esc(t('tw.cat.' + c)) + '</span><i class="sw' + (on ? ' on' : '') + '" aria-hidden="true"></i><span class="sr">' + esc(on ? t('tw.on') : t('tw.off')) + '</span></button>';
    }).join('') + '</div><p class="hint">' + esc(t('tw.shared_note')) + '</p></section>';
    // chat
    h += '<section class="group tg-chatbox"><h3>' + esc(t('tw.chat')) + '</h3><div class="tg-chat" id="tgChat" role="log" aria-live="polite">' + chatHTML() + '</div>' +
      (TG.stk ? '<div class="tg-stickers" role="group" aria-label="' + esc(t('tw.stickers')) + '">' + STICKERS.map(function (s) { return '<button data-act="tg-sticker" data-v="' + s + '" aria-label="' + s + '">' + s + '</button>'; }).join('') + '</div>' : '') +
      '<form class="tg-compose" id="tgForm" autocomplete="off"><button type="button" class="icon-btn" data-act="tg-stk" aria-label="' + esc(t('tw.stickers')) + '" aria-pressed="' + TG.stk + '">🙂</button><input class="field" id="tgMsg" maxlength="500" placeholder="' + esc(t('tw.chat_ph')) + '" value="' + esc(TG.draft) + '" aria-label="' + esc(t('tw.chat_ph')) + '"><button class="btn primary" type="submit">' + esc(t('tw.send')) + '</button></form></section>';
    // history
    h += '<section class="group"><h3>' + esc(t('tw.history')) + '</h3><p class="hint">' + esc(t('tw.history_d')) + '</p>' + (TG.hist.length ? '<ul class="tg-hist">' + TG.hist.slice(0, 20).map(function (x) {
      return '<li><b>' + esc(t('tw.h.' + x.by)) + '</b> ' + esc(t('tw.h.' + x.action)) + ' ' + esc(t('tw.cat.' + x.category)) + ' <time>' + esc(API.fmtDate(x.at)) + '</time></li>';
    }).join('') + '</ul>' : '<p class="hint">' + esc(t('tw.history_none')) + '</p>') + '</section>';
    // unlink
    h += '<section class="group"><h3>' + esc(t('tw.unlink')) + '</h3><p class="hint">' + esc(t('tw.unlink_d')) + '</p><button class="btn danger block" data-act="tg-unlink">' + esc(t('tw.unlink')) + '</button></section>';
    return h;
  }
  function unlinkSheet() {
    return '<h2>' + esc(t('tw.unlink_t')) + '</h2><ul class="plain"><li>' + esc(t('tw.unlink_l1')) + '</li><li>' + esc(t('tw.unlink_l2')) + '</li><li>' + esc(t('tw.unlink_l3')) + '</li></ul>' +
      '<div class="actions two"><button class="btn soft block" data-act="sheet-close">' + esc(t('st.cancel')) + '</button><button class="btn danger block" data-act="tg-unlink-go"' + (TG.busy ? ' disabled' : '') + '>' + esc(t('tw.unlink_go')) + '</button></div>';
  }
  function after() {
    var box = document.getElementById('tgChat'); if (box) box.scrollTop = box.scrollHeight;
    if (TG.scan) startScan();
  }

  /* ---------- actions + input wiring ---------- */
  var act = {
    'tg-refresh': function () { TG.err = ''; refresh(); },
    'tg-invite': function () { createInvite(); },
    'tg-copy': function () { if (TG.invite && navigator.clipboard) navigator.clipboard.writeText(TG.invite.code).then(function () { API.toast('tw.copied'); }, function () { }); },
    'tg-join': function () { var el = document.getElementById('tgCode'); TG.code = el ? el.value : TG.code; joinWith(TG.code); },
    'tg-scan': function () { startScan(); },
    'tg-scan-stop': function () { stopScan(); API.rerender(); },
    'tg-share': function (el) { toggleShare(el.dataset.v); },
    'tg-verify': function () { PS.verifiedFp = TG.fp; PS.knownKey = TG.partner.publicKey; PS.spaceId = TG.space.id; savePS(); TG.verified = true; TG.keyChanged = false; API.rerender(); },
    'tg-sticker': function (el) { TG.stk = false; sendMsg('sticker', { s: el.dataset.v }); API.rerender(); },
    'tg-stk': function () { TG.stk = !TG.stk; var d = document.getElementById('tgMsg'); TG.draft = d ? d.value : ''; API.rerender(); },
    'tg-msg-del': function (el) { var id = +el.dataset.id; Core.deleteMessage(id).then(function () { TG.msgs = TG.msgs.filter(function (m) { return m.id !== id; }); paintChat(); }, function () { }); },
    'tg-unlink': function () { API.openSheet({ type: 'tg-unlink' }); },
    'tg-unlink-go': function () { unlink(); },
    'tg-ack': function () { ackEnded(); }
  };
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'tgForm') {
      e.preventDefault();
      var el = document.getElementById('tgMsg'), v = el ? el.value.trim() : '';
      if (!v) return; el.value = ''; TG.draft = '';
      sendMsg('text', { m: v.slice(0, 500) });
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'tgCode') { TG.code = e.target.value; }
    if (e.target && e.target.id === 'tgMsg') { TG.draft = e.target.value; }
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && active) tick(); });

  root.Together = {
    init: function (api) { API = api; },
    html: html, after: after, act: act, unlinkSheet: unlinkSheet,
    enter: function () { TG.err = ''; if (TG.status !== 'paired') TG.status = Core.signedIn() ? (Core.configured() ? 'idle' : 'nocore') : 'guest'; startPolling(); refresh(true); },
    leave: stopPolling,
    status: function () { return TG.status; },
    reset: function () { TG = fresh(); PS = { verifiedFp: null, knownKey: null, spaceId: null }; stopPolling(); },
    fresh: function () { var f = TG.fresh; TG.fresh = false; return f; }
  };
})(typeof self !== 'undefined' ? self : this);
