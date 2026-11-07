#!/usr/bin/env node
/* Builds privacy.html (for the app stores and your site) from js/privacy.js, so it always matches the in-app page.
   Run:  node tools/build-privacy.js   — then put your contact email in CONTACT below. */
const fs = require('fs'), path = require('path');
const P = require('../js/privacy.js');
const CONTACT = process.env.ABRORA_CONTACT || '';   // e.g. ABRORA_CONTACT=you@example.com node tools/build-privacy.js
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const L = { fa: 'فارسی', en: 'English', de: 'Deutsch' }, CT = { fa: 'تماس', en: 'Contact', de: 'Kontakt' };
const sec = l => `<section lang="${l}" dir="${l === 'fa' ? 'rtl' : 'ltr'}" id="${l}"><h1>${esc(P.title[l])}</h1><p class="m">${esc(P.who[l])} · ${esc(P.updatedLabel[l])}: ${P.updated}</p>` +
  P.sections.map(s => `<h2>${esc(s.h[l])}</h2><p>${esc(s.p[l])}</p>`).join('') + (CONTACT ? `<h2>${CT[l]}</h2><p><a href="mailto:${esc(CONTACT)}">${esc(CONTACT)}</a></p>` : '') + '</section>';
const html = `<!doctype html><html lang="fa"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrora — ${esc(P.title.en)}</title>
<style>:root{color-scheme:light dark}body{font:16px/1.8 system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;max-width:680px;margin:0 auto;padding:20px 16px 48px}
nav{display:flex;gap:8px;margin-bottom:12px}nav a{padding:6px 14px;border-radius:99px;border:1px solid #8885;text-decoration:none;color:inherit}
section{display:none}section:target{display:block}body:not(:has(:target)) #fa{display:block}h1{font-size:26px}h2{font-size:18px;margin-top:26px}.m{opacity:.7}</style></head>
<body><nav>${['fa', 'en', 'de'].map(l => `<a href="#${l}">${L[l]}</a>`).join('')}</nav>${['fa', 'en', 'de'].map(sec).join('')}</body></html>`;
fs.writeFileSync(path.join(__dirname, '..', 'privacy.html'), html);
console.log('privacy.html written' + (CONTACT ? '' : ' (no contact email set)'));
