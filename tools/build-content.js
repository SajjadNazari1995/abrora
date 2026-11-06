#!/usr/bin/env node
/* Builds content/index.json from the files in content/articles/.
   Run it after adding or editing an article:   node tools/build-content.js
   The index holds only what the lists need (titles, summaries, tags). The full text stays in each article file,
   so the app downloads it only when someone opens that article.

   The shape of index.json is the same shape your server (phase 2) will serve, so the app does not change when you move. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'content');
const dir = path.join(root, 'articles');
const LANGS = ['fa', 'en', 'de'];

const CATEGORIES = [
  { id: 'basics',    emoji: '📅', name: { fa: 'شناخت چرخه', en: 'Cycle basics', de: 'Zyklus-Grundlagen' } },
  { id: 'pain',      emoji: '🫖', name: { fa: 'درد و گرفتگی', en: 'Pain relief', de: 'Schmerzen' } },
  { id: 'pms',       emoji: '🌦️', name: { fa: 'PMS و خلق‌وخو', en: 'PMS & mood', de: 'PMS & Stimmung' } },
  { id: 'nutrition', emoji: '🥗', name: { fa: 'تغذیه', en: 'Nutrition', de: 'Ernährung' } },
  { id: 'movement',  emoji: '🧘', name: { fa: 'حرکت و یوگا', en: 'Movement & yoga', de: 'Bewegung & Yoga' } },
  { id: 'fertility', emoji: '🌱', name: { fa: 'باروری', en: 'Fertility', de: 'Fruchtbarkeit' } },
  { id: 'health',    emoji: '🩺', name: { fa: 'سلامت و پزشک', en: 'Health & doctors', de: 'Gesundheit & Praxis' } }
];

let errors = 0;
const fail = (id, msg) => { errors++; console.error('✗ ' + id + ': ' + msg); };

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
const articles = [];
files.forEach(f => {
  const id = f.replace(/\.json$/, '');
  let a;
  try { a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return fail(id, 'invalid JSON: ' + e.message); }
  if (a.id !== id) fail(id, 'id "' + a.id + '" does not match the file name');
  if (!CATEGORIES.some(c => c.id === a.category)) fail(id, 'unknown category "' + a.category + '"');
  LANGS.forEach(l => {
    if (!a.title || !a.title[l]) fail(id, 'missing title.' + l);
    if (!a.summary || !a.summary[l]) fail(id, 'missing summary.' + l);
    if (!a.body || !Array.isArray(a.body[l]) || !a.body[l].length) fail(id, 'missing body.' + l);
  });
  if (!Array.isArray(a.sources) || !a.sources.length) fail(id, 'needs at least one source');
  articles.push({
    id: a.id, status: a.status || 'published', category: a.category, emoji: a.emoji, tone: a.tone,
    phases: a.phases || [], signals: a.signals || [], moods: a.moods || [], readMin: a.readMin, order: a.order,
    updated: a.updated, file: 'articles/' + f, title: a.title, summary: a.summary
  });
});

articles.sort((x, y) => (x.order || 999) - (y.order || 999));
const newest = articles.map(a => a.updated || '').sort().pop() || '';
const index = {
  schema: 1,
  version: (newest || '0000-00-00').replace(/-/g, '.') + '.' + articles.length,
  updated: newest,
  categories: CATEGORIES,
  articles
};
if (errors) { console.error('\n' + errors + ' problem(s). index.json was NOT written.'); process.exit(1); }
fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify(index, null, 1) + '\n');
console.log('✓ content/index.json — ' + articles.length + ' articles, version ' + index.version);
