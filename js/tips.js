/* Abrora — "tips for today": short care tips picked from how the day actually is.
   Pool = tips for the current phase (from i18n.js) + tips for a symptom or mood the user logged.
   Nothing is fixed at 3 any more: logged symptoms/mood move the matching tips to the top, the rest is filled by the phase. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Tips = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // sym / mood = what it is for. fa/en/de = [title, body]
  var EXTRA = [
    { id: 'x-cramps', e: '🫖', tone: 'rose', sym: ['cramps'],
      fa: ['برای گرفتگی: گرما و حرکت ملایم', 'کیسه‌ی آب گرم روی پایین شکم، یک نوشیدنی گرم و کشش‌های آرام کمک می‌کند. اگر درد با مسکن معمول هم کم نمی‌شود یا خیلی شدید است، با پزشک صحبت کنید.'],
      en: ['For cramps: warmth and easy movement', 'A hot water bottle on your lower belly, a warm drink and gentle stretches can help. If the pain is severe or does not ease with usual pain relief, talk to a doctor.'],
      de: ['Bei Krämpfen: Wärme und sanfte Bewegung', 'Eine Wärmflasche auf dem Unterbauch, ein warmes Getränk und sanftes Dehnen können helfen. Sind die Schmerzen stark oder lassen trotz üblicher Schmerzmittel nicht nach, sprich mit einer Ärztin bzw. einem Arzt.'] },
    { id: 'x-headache', e: '🌿', tone: 'sky', sym: ['headache'],
      fa: ['برای سردرد: آب، استراحت و نور کم', 'کم‌آبی و کم‌خوابی سردرد را بدتر می‌کند. آب بنوشید، چند دقیقه در جای آرام و کم‌نور استراحت کنید و وعده‌ها را جا نیندازید.'],
      en: ['For a headache: water, rest and low light', 'Dehydration and little sleep make headaches worse. Drink water, rest a few minutes somewhere quiet and dim, and do not skip meals.'],
      de: ['Bei Kopfschmerzen: Wasser, Ruhe, wenig Licht', 'Wassermangel und wenig Schlaf verstärken Kopfschmerzen. Trink Wasser, ruh dich ein paar Minuten an einem ruhigen, gedimmten Ort aus und lass keine Mahlzeit aus.'] },
    { id: 'x-bloating', e: '🍵', tone: 'butter', sym: ['bloating'],
      fa: ['برای نفخ: کم‌نمک و آرام‌تر', 'نمک و نوشابه‌ی گازدار را کم کنید، آهسته بخورید و بعد از غذا کمی راه بروید. چای زنجبیل یا نعناع برای بعضی‌ها آرام‌کننده است.'],
      en: ['For bloating: less salt, slower meals', 'Cut back on salt and fizzy drinks, eat slowly and take a short walk after meals. Ginger or peppermint tea soothes some people.'],
      de: ['Bei Blähbauch: weniger Salz, langsamer essen', 'Weniger Salz und Sprudelgetränke, langsam essen und nach dem Essen kurz gehen. Ingwer- oder Pfefferminztee beruhigt manche.'] },
    { id: 'x-backache', e: '🧘', tone: 'mint', sym: ['backache'],
      fa: ['برای کمردرد: گرما و کشش', 'گرما روی کمر و چند حرکت کششی مثل حالت کودک یا چرخش ملایم ستون فقرات عضلات را شل می‌کند. مدت طولانی یک‌جا ننشینید.'],
      en: ['For back pain: warmth and a stretch', 'Heat on your lower back and a few stretches such as child’s pose or a gentle spinal twist relax the muscles. Avoid sitting in one spot for long.'],
      de: ['Bei Rückenschmerzen: Wärme und Dehnen', 'Wärme auf dem unteren Rücken und ein paar Dehnübungen wie die Kindhaltung oder eine sanfte Rumpfdrehung lockern die Muskeln. Sitz nicht lange am Stück.'] },
    { id: 'x-breast', e: '💗', tone: 'rose', sym: ['breast'],
      fa: ['برای حساسیت سینه‌ها', 'سوتین راحت و بدون سیم، کمپرس گرم یا سرد و کم‌کردن کافئین برای بعضی‌ها کمک می‌کند. اگر توده یا دردی دارید که با پریود می‌رود و نمی‌آید، به پزشک نشان دهید.'],
      en: ['For breast tenderness', 'A comfortable, supportive bra, a warm or cold compress and less caffeine help some people. If you find a lump or pain that does not follow your cycle, have a doctor look at it.'],
      de: ['Bei Brustspannen', 'Ein bequemer, stützender BH, ein warmer oder kalter Umschlag und weniger Koffein helfen manchen. Findest du einen Knoten oder Schmerzen, die nicht zum Zyklus passen, lass es ärztlich ansehen.'] },
    { id: 'x-acne', e: '🧴', tone: 'lilac', sym: ['acne'],
      fa: ['برای جوش‌های دوره‌ای', 'پوست را ملایم بشویید، دست به جوش نزنید و بالش و حوله را تمیز نگه دارید. اگر جوش‌ها شدید است یا جای زخم می‌گذارد، از پزشک پوست کمک بگیرید.'],
      en: ['For cycle-related breakouts', 'Wash gently, do not pick, and keep pillowcases and towels clean. If breakouts are severe or scar, ask a dermatologist.'],
      de: ['Bei Hautunreinheiten im Zyklus', 'Sanft waschen, nicht ausdrücken, Kissenbezug und Handtuch sauber halten. Sind die Unreinheiten stark oder vernarben sie, frag eine Hautärztin bzw. einen Hautarzt.'] },
    { id: 'x-fatigue', e: '😴', tone: 'lilac', sym: ['fatigue'],
      fa: ['برای خستگی: سبک‌تر و زودتر بخوابید', 'امروز کارها را سبک‌تر کنید، وعده‌ی غذایی با آهن و پروتئین بخورید و امشب زودتر بخوابید. اگر خستگی ماه‌ها ادامه دارد، آزمایش آهن بد نیست.'],
      en: ['For tiredness: lighten the day, sleep earlier', 'Lighten today’s load, have a meal with iron and protein and go to bed earlier tonight. If tiredness lasts for months, an iron check is worth asking about.'],
      de: ['Bei Müdigkeit: Tag entlasten, früher schlafen', 'Mach den Tag leichter, iss etwas mit Eisen und Eiweiß und geh heute früher ins Bett. Hält die Müdigkeit monatelang an, lohnt sich ein Eisenwert.'] },
    { id: 'x-nausea', e: '🍋', tone: 'butter', sym: ['nausea'],
      fa: ['برای تهوع: کم و آرام', 'وعده‌های کوچک، بیسکویت ساده، چای زنجبیل و هوای تازه کمک می‌کند. اگر استفراغ ادامه دارد یا ممکن است باردار باشید، با پزشک صحبت کنید.'],
      en: ['For nausea: small and slow', 'Small meals, plain crackers, ginger tea and fresh air can help. If you keep vomiting or could be pregnant, talk to a doctor.'],
      de: ['Bei Übelkeit: wenig und langsam', 'Kleine Mahlzeiten, Zwieback, Ingwertee und frische Luft können helfen. Musst du dich wiederholt übergeben oder könntest du schwanger sein, sprich mit einer Ärztin bzw. einem Arzt.'] },
    { id: 'x-cravings', e: '🍫', tone: 'butter', sym: ['cravings'],
      fa: ['هوس خوراکی طبیعی است', 'ممنوع کردن آن معمولاً بدتر می‌کند. یک تکه‌ی کوچک شکلات تلخ یا میوه را کنار یک وعده‌ی سیر‌کننده با پروتئین و فیبر بخورید.'],
      en: ['Cravings are normal', 'Banning them usually backfires. Enjoy a small piece of dark chocolate or fruit alongside a filling meal with protein and fibre.'],
      de: ['Heißhunger ist normal', 'Verbote machen es meist schlimmer. Genieß ein Stück dunkle Schokolade oder Obst zu einer sättigenden Mahlzeit mit Eiweiß und Ballaststoffen.'] },
    { id: 'x-sleep', e: '🌙', tone: 'sky', sym: ['sleep'],
      fa: ['برای خواب بهتر', 'یک ساعت ثابت برای خواب، نور کم و بدون صفحه‌ی گوشی نیم ساعت قبل از خواب، و اتاق کمی خنک. کافئین را از عصر کم کنید.'],
      en: ['For better sleep', 'A steady bedtime, dim light, no screens for half an hour before bed and a slightly cool room. Cut caffeine from the afternoon.'],
      de: ['Für besseren Schlaf', 'Feste Schlafenszeit, gedimmtes Licht, eine halbe Stunde vor dem Schlafen kein Bildschirm und ein etwas kühles Zimmer. Ab dem Nachmittag weniger Koffein.'] },
    { id: 'x-sad', e: '🫂', tone: 'lilac', mood: ['sad'],
      fa: ['برای دل‌گرفتگی', 'احساس‌تان را قضاوت نکنید. با یک نفر حرف بزنید، کمی نور روز و پیاده‌روی بگیرید و یک کار کوچک و دلخواه انجام دهید. اگر چند هفته ادامه یافت، از متخصص کمک بگیرید.'],
      en: ['When you feel low', 'Do not judge the feeling. Talk to someone, get some daylight and a short walk and do one small thing you like. If it lasts for weeks, reach out to a professional.'],
      de: ['Wenn du dich niedergeschlagen fühlst', 'Bewerte das Gefühl nicht. Sprich mit jemandem, hol dir Tageslicht und einen kurzen Spaziergang und tu eine kleine Sache, die dir gefällt. Hält es wochenlang an, such professionelle Hilfe.'] },
    { id: 'x-anxious', e: '🌬️', tone: 'sky', mood: ['anxious'],
      fa: ['برای دلشوره: نفس آهسته', 'چهار ثانیه نفس بکشید، شش ثانیه آرام بیرون بدهید و چند بار تکرار کنید. کافئین را کم کنید و نگرانی‌ها را روی کاغذ بنویسید.'],
      en: ['For anxious moments: slow breathing', 'Breathe in for four seconds, out slowly for six, and repeat a few times. Cut back on caffeine and write the worries down.'],
      de: ['Bei innerer Unruhe: langsam atmen', 'Vier Sekunden einatmen, sechs Sekunden langsam ausatmen und ein paarmal wiederholen. Weniger Koffein, Sorgen aufschreiben.'] },
    { id: 'x-irritable', e: '🌤️', tone: 'butter', mood: ['irritable', 'sensitive'],
      fa: ['وقتی زود عصبی یا حساس می‌شوید', 'کمی فاصله بگیرید، چند نفس عمیق بکشید و تصمیم‌های مهم را به فردا بسپارید. این حال معمولاً موقتی و مرتبط با چرخه است.'],
      en: ['When you feel snappy or sensitive', 'Step away for a moment, take a few deep breaths and leave big decisions for tomorrow. This usually passes and is tied to the cycle.'],
      de: ['Wenn du gereizt oder empfindlich bist', 'Geh kurz auf Abstand, atme tief durch und verschieb wichtige Entscheidungen auf morgen. Das geht meist vorbei und hängt mit dem Zyklus zusammen.'] },
    { id: 'x-energetic', e: '⚡', tone: 'mint', mood: ['energetic', 'happy'],
      fa: ['انرژی خوبی دارید', 'از آن برای ورزش، کارهای عقب‌مانده یا دیدن دوستان استفاده کنید. فقط آب و غذای کافی را فراموش نکنید.'],
      en: ['You have good energy', 'Use it for exercise, tasks you have put off or seeing friends. Just keep up water and meals.'],
      de: ['Du hast viel Energie', 'Nutz sie für Sport, liegengebliebene Aufgaben oder Freunde. Denk nur an genug Wasser und Essen.'] }
  ];

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function has(a, b) { return (a || []).filter(function (x) { return (b || []).indexOf(x) >= 0; }).length; }

  /* phaseTips: the tips of the current phase (each already has id). ctx: { day, sym[], symRecent[], mood[] }.
     Returns the best n. Tips for what the user logged come first; phase tips fill the rest. */
  function pick(phaseTips, ctx, n) {
    var all = [];
    (phaseTips || []).forEach(function (t) { all.push({ t: t, s: 3 }); });
    EXTRA.forEach(function (t) {
      var s = 0, a = has(t.sym, ctx.sym), b = has(t.mood, ctx.mood), c = has(t.sym, ctx.symRecent);
      if (a) s += 6; else if (c) s += 2;
      if (b) s += 4;
      if (s) all.push({ t: t, s: s });
    });
    all.forEach(function (x) { x.s += (hash(x.t.id + ':' + ctx.day) % 100) / 200; });
    all.sort(function (a, b) { return b.s - a.s; });
    return all.slice(0, n || 3).map(function (x) { return x.t; });
  }
  function byId(id, phaseTips) {
    var r = EXTRA.filter(function (t) { return t.id === id; })[0];
    return r || (phaseTips || []).filter(function (t) { return t.id === id; })[0] || null;
  }
  return { pick: pick, byId: byId, EXTRA: EXTRA };
});
