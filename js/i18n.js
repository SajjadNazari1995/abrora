/* Abrora — translations (fa / en / de), numerals and Gregorian date names. */
(function (root) {
  'use strict';

  var LANGS = ['fa', 'en', 'de'];
  var IDX = { fa: 0, en: 1, de: 2 };
  var lang = 'fa';

  var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  function num(n) {
    var s = String(n);
    if (lang !== 'fa') return s;
    return s.replace(/[0-9]/g, function (d) { return FA_DIGITS[+d]; });
  }

  var MONTHS = {
    fa: ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
  };
  var MONTHS_S = {
    fa: MONTHS.fa,
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    de: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.']
  };
  // index 0 = Sunday
  var WD = {
    fa: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
  };
  var WD_S = {
    fa: ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'],
    en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    de: ['S', 'M', 'D', 'M', 'D', 'F', 'S']
  };

  /* ---------- dictionary: key -> [fa, en, de]; values may be functions ---------- */
  var D = {
    'app.name': ['ابرورا', 'Abrora', 'Abrora'],
    'app.tag': ['همراه آرام چرخه‌ی شما', 'Your calm cycle companion', 'Dein ruhiger Zyklusbegleiter'],

    'nav.cycle': ['سیکل', 'Cycle', 'Zyklus'],
    'nav.calendar': ['تقویم', 'Calendar', 'Kalender'],
    'nav.stats': ['آمار', 'Insights', 'Statistik'],
    'nav.tips': ['نکات', 'Tips', 'Wissen'],
    'nav.settings': ['تنظیمات', 'Settings', 'Einstellungen'],
    'today': ['امروز', 'Today', 'Heute'],
    'back': ['بازگشت', 'Back', 'Zurück'],
    'close': ['بستن', 'Close', 'Schließen'],

    'ph.period': ['پریود', 'Period', 'Periode'],
    'ph.fertile': ['روزهای باروری', 'Fertile window', 'Fruchtbare Tage'],
    'ph.ovulation': ['تخمک‌گذاری', 'Ovulation', 'Eisprung'],
    'ph.pms': ['PMS', 'PMS', 'PMS'],

    'days': [function (n) { return num(n) + ' روز'; },
             function (n) { return n + (n === 1 ? ' day' : ' days'); },
             function (n) { return n + (n === 1 ? ' Tag' : ' Tage'); }],
    'in_days': [function (n) { return n === 0 ? 'امروز' : n === 1 ? 'فردا' : num(n) + ' روز دیگر'; },
                function (n) { return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'In ' + n + ' days'; },
                function (n) { return n === 0 ? 'Heute' : n === 1 ? 'Morgen' : 'In ' + n + ' Tagen'; }],

    /* ring centre */
    'c.period_day': [function (n) { return 'روز ' + num(n) + ' پریود'; },
                     function (n) { return 'Period day ' + n; },
                     function (n) { return 'Periodentag ' + n; }],
    'c.to_period': [function (n) { return n === 0 ? 'امروز پریود پیش‌بینی می‌شود' : n === 1 ? 'یک روز تا شروع پریود' : num(n) + ' روز تا شروع پریود'; },
                    function (n) { return n === 0 ? 'Period expected today' : n === 1 ? '1 day until period' : n + ' days until period'; },
                    function (n) { return n === 0 ? 'Periode heute erwartet' : n === 1 ? 'Noch 1 Tag bis zur Periode' : 'Noch ' + n + ' Tage bis zur Periode'; }],
    'c.late': [function (n) { return num(n) + ' روز تأخیر'; },
               function (n) { return n === 1 ? '1 day late' : n + ' days late'; },
               function (n) { return n === 1 ? '1 Tag überfällig' : n + ' Tage überfällig'; }],
    'c.late_sub': ['پریود هنوز ثبت نشده است', 'No period logged yet', 'Noch keine Periode eingetragen'],
    'c.fertile': ['روزهای باروری', 'Fertile window', 'Fruchtbare Tage'],
    'c.ov_today': ['روز تخمک‌گذاری (تخمینی)', 'Ovulation day (estimated)', 'Eisprung (geschätzt)'],
    'c.to_ov': [function (n) { return n === 1 ? 'یک روز تا تخمک‌گذاری' : num(n) + ' روز تا تخمک‌گذاری'; },
                function (n) { return n === 1 ? '1 day until ovulation' : n + ' days until ovulation'; },
                function (n) { return n === 1 ? 'Noch 1 Tag bis zum Eisprung' : 'Noch ' + n + ' Tage bis zum Eisprung'; }],
    'c.after_ov': ['تخمک‌گذاری گذشته است', 'Ovulation has passed', 'Eisprung ist vorbei'],
    'c.pms_sub': ['دوره‌ی PMS', 'PMS days', 'PMS-Tage'],
    'c.cycle_day': [function (n) { return 'روز ' + num(n) + ' از چرخه'; },
                    function (n) { return 'Cycle day ' + n; },
                    function (n) { return 'Zyklustag ' + n; }],
    'c.none': ['آخرین پریود خود را ثبت کنید', 'Log your last period', 'Trage deine letzte Periode ein'],
    'c.none_sub': ['تا پیش‌بینی‌ها شروع شوند', 'to start your predictions', 'damit die Vorhersagen starten'],
    'c.period_sub': ['امروز را آرام بگیرید', 'Take it easy today', 'Gönn dir heute etwas Ruhe'],

    'b.start_period': ['شروع پریود', 'Start period', 'Periode starten'],
    'b.end_period': ['پایان پریود', 'End period', 'Periode beenden'],
    'b.log_last': ['ثبت آخرین پریود', 'Log last period', 'Letzte Periode eintragen'],
    'b.log_today': ['حال امروز را ثبت کنید', 'How do you feel today?', 'Wie fühlst du dich heute?'],
    'b.log_today_done': ['ویرایش علائم امروز', 'Edit today’s log', 'Heute bearbeiten'],

    'q.next_period': ['پریود بعدی', 'Next period', 'Nächste Periode'],
    'q.ovulation': ['تخمک‌گذاری', 'Ovulation', 'Eisprung'],
    'q.cycle_day': ['روز چرخه', 'Cycle day', 'Zyklustag'],
    'q.cycle_len': [function (n) { return 'از ' + num(n); }, function (n) { return 'of ' + n; }, function (n) { return 'von ' + n; }],

    'h.tips': ['نکات امروز', 'Today’s notes', 'Tipps für heute'],
    'h.install': ['برای استفاده‌ی آفلاین: در Safari روی دکمه‌ی اشتراک‌گذاری بزنید و «Add to Home Screen» را انتخاب کنید.',
                  'To use it offline: in Safari tap Share, then “Add to Home Screen”.',
                  'Für die Offline-Nutzung: in Safari auf Teilen tippen und „Zum Home-Bildschirm“ wählen.'],
    'h.install_ok': ['فهمیدم', 'Got it', 'Verstanden'],

    /* calendar */
    'cal.pred': ['پریود پیش‌بینی‌شده', 'Predicted period', 'Erwartete Periode'],
    'cal.logged': ['ثبت‌شده', 'Logged', 'Eingetragen'],
    'cal.future': ['برای روزهای آینده فقط پیش‌بینی نمایش داده می‌شود.',
                   'Future days only show predictions.',
                   'Für zukünftige Tage gibt es nur Vorhersagen.'],
    'cal.prev': ['ماه قبل', 'Previous month', 'Voriger Monat'],
    'cal.next': ['ماه بعد', 'Next month', 'Nächster Monat'],

    /* day sheet */
    'd.period_day': ['روز پریود', 'Period day', 'Periodentag'],
    'd.period_hint': ['این روز را به پریود اضافه یا از آن حذف کنید', 'Add or remove this day from your period', 'Diesen Tag zur Periode hinzufügen oder entfernen'],
    'd.flow': ['شدت خونریزی', 'Flow', 'Stärke'],
    'd.mood': ['حال و هوا', 'Mood', 'Stimmung'],
    'd.symptoms': ['علائم', 'Symptoms', 'Symptome'],
    'd.note': ['یادداشت', 'Note', 'Notiz'],
    'd.note_ph': ['هر چیزی که می‌خواهید به یاد بماند…', 'Anything you want to remember…', 'Alles, was du dir merken möchtest…'],
    'd.done': ['انجام شد', 'Done', 'Fertig'],
    'd.fill': [function (n) { return 'ثبت ' + num(n) + ' روز پریود از این روز'; },
               function (n) { return 'Add ' + n + ' period days from here'; },
               function (n) { return n + ' Periodentage ab hier eintragen'; }],
    'd.saved': ['ذخیره شد', 'Saved', 'Gespeichert'],
    'd.info_pred': ['پیش‌بینی: پریود', 'Predicted: period', 'Erwartet: Periode'],
    'd.info_fertile': ['روزهای باروری', 'Fertile window', 'Fruchtbare Tage'],
    'd.info_ov': ['روز تخمک‌گذاری (تخمینی)', 'Estimated ovulation day', 'Geschätzter Eisprung'],
    'd.info_pms': ['احتمال PMS', 'PMS likely', 'PMS wahrscheinlich'],
    'flow.1': ['لکه‌بینی', 'Spotting', 'Schmierblutung'],
    'flow.2': ['کم', 'Light', 'Leicht'],
    'flow.3': ['متوسط', 'Medium', 'Mittel'],
    'flow.4': ['زیاد', 'Heavy', 'Stark'],

    'mood.happy': ['شاد', 'Happy', 'Glücklich'],
    'mood.calm': ['آرام', 'Calm', 'Ruhig'],
    'mood.energetic': ['پرانرژی', 'Energetic', 'Energiegeladen'],
    'mood.sensitive': ['حساس', 'Sensitive', 'Sensibel'],
    'mood.irritable': ['عصبی', 'Irritable', 'Gereizt'],
    'mood.anxious': ['مضطرب', 'Anxious', 'Ängstlich'],
    'mood.sad': ['غمگین', 'Sad', 'Traurig'],

    'sym.cramps': ['گرفتگی و درد', 'Cramps', 'Krämpfe'],
    'sym.headache': ['سردرد', 'Headache', 'Kopfschmerzen'],
    'sym.bloating': ['نفخ', 'Bloating', 'Blähbauch'],
    'sym.backache': ['کمردرد', 'Back pain', 'Rückenschmerzen'],
    'sym.breast': ['حساسیت سینه', 'Breast tenderness', 'Brustspannen'],
    'sym.acne': ['جوش', 'Acne', 'Unreine Haut'],
    'sym.fatigue': ['خستگی', 'Fatigue', 'Müdigkeit'],
    'sym.nausea': ['تهوع', 'Nausea', 'Übelkeit'],
    'sym.cravings': ['هوس خوراکی', 'Cravings', 'Heißhunger'],
    'sym.sleep': ['بی‌خوابی', 'Poor sleep', 'Schlafprobleme'],

    /* stats */
    's.title': ['آمار و تحلیل', 'Insights', 'Statistik'],
    's.avg_cycle': ['میانگین چرخه', 'Average cycle', 'Ø Zyklus'],
    's.avg_period': ['میانگین پریود', 'Average period', 'Ø Periode'],
    's.regularity': ['نظم چرخه', 'Regularity', 'Regelmäßigkeit'],
    's.regular': ['منظم', 'Regular', 'Regelmäßig'],
    's.variable': ['متغیر', 'Variable', 'Schwankend'],
    's.range': [function (a, b) { return 'بین ' + num(a) + ' تا ' + num(b) + ' روز'; },
                function (a, b) { return a + '–' + b + ' days'; },
                function (a, b) { return a + '–' + b + ' Tage'; }],
    's.history': ['چرخه‌های اخیر', 'Recent cycles', 'Letzte Zyklen'],
    's.history_sub': [function (n) { return 'خط‌چین: میانگین (' + num(n) + ' روز)'; },
                      function (n) { return 'Dashed line: average (' + n + ' days)'; },
                      function (n) { return 'Gestrichelt: Durchschnitt (' + n + ' Tage)'; }],
    's.symptoms': ['علائم پرتکرار', 'Most frequent symptoms', 'Häufigste Symptome'],
    's.symptoms_sub': ['در ۴ ماه اخیر', 'Last 4 months', 'Letzte 4 Monate'],
    's.need_more': ['برای دیدن آمار، حداقل دو پریود ثبت کنید.', 'Log at least two periods to see your insights.', 'Trage mindestens zwei Perioden ein, um Auswertungen zu sehen.'],
    's.no_symptoms': ['هنوز علامتی ثبت نشده است. از تقویم یا صفحه‌ی اصلی شروع کنید.', 'No symptoms logged yet. Start from the calendar or the home screen.', 'Noch keine Symptome eingetragen. Starte im Kalender oder auf dem Startbildschirm.'],
    's.basis_default': ['پیش‌بینی‌ها فعلاً با مقادیر پیش‌فرض شما انجام می‌شود. بعد از ثبت سه پریود دقیق‌تر می‌شود.',
                        'Predictions currently use your defaults. They get sharper after you log three periods.',
                        'Die Vorhersagen nutzen aktuell deine Standardwerte. Nach drei eingetragenen Perioden werden sie genauer.'],
    's.basis_history': [function (n) { return 'پیش‌بینی‌ها بر اساس میانگین ' + num(n) + ' چرخه‌ی اخیر شماست.'; },
                        function (n) { return 'Predictions are based on the average of your last ' + n + ' cycles.'; },
                        function (n) { return 'Die Vorhersagen basieren auf dem Durchschnitt deiner letzten ' + n + ' Zyklen.'; }],
    's.cycle_of': [function (n) { return num(n) + ' روز'; }, function (n) { return n + ' d'; }, function (n) { return n + ' T'; }],

    /* tips */
    'tips.title': ['نکات و مقالات', 'Tips & articles', 'Tipps & Wissen'],
    'tips.now': ['مرحله‌ی فعلی', 'Right now', 'Gerade jetzt'],
    'tips.articles': ['مقاله‌های کوتاه', 'Short reads', 'Kurz erklärt'],
    'tips.read': ['خواندن', 'Read', 'Lesen'],
    'phase.menstrual': ['دوران پریود', 'Your period', 'Deine Periode'],
    'phase.follicular': ['بعد از پریود', 'After your period', 'Nach der Periode'],
    'phase.fertile': ['روزهای باروری', 'Fertile window', 'Fruchtbare Tage'],
    'phase.luteal': ['پیش از پریود', 'Before your period', 'Vor der Periode'],
    'phase.menstrual.d': ['بدن در حال تجدید قواست؛ مهربان‌تر از همیشه با خودتان باشید.',
                          'Your body is renewing itself, so be extra kind to yourself.',
                          'Dein Körper erneuert sich – sei besonders lieb zu dir.'],
    'phase.follicular.d': ['انرژی کم‌کم بالا می‌رود و حال و هوا روشن‌تر می‌شود.',
                           'Energy slowly rises and your mood tends to brighten.',
                           'Die Energie steigt langsam und die Stimmung wird oft heller.'],
    'phase.fertile.d': ['نزدیک تخمک‌گذاری هستید؛ بسیاری از خانم‌ها پرانرژی‌ترین روزهای ماه را دارند.',
                        'Ovulation is close, and many women feel their most energetic days of the month.',
                        'Der Eisprung ist nah – viele fühlen sich jetzt besonders energiegeladen.'],
    'phase.luteal.d': ['بدن آرام‌آرام آماده‌ی پریود می‌شود؛ خستگی و حساسیت طبیعی است.',
                       'Your body is getting ready for the next period. Tiredness and sensitivity are normal.',
                       'Dein Körper bereitet sich auf die nächste Periode vor. Müdigkeit und Sensibilität sind normal.'],

    /* settings */
    'st.title': ['تنظیمات', 'Settings', 'Einstellungen'],
    'st.language': ['زبان', 'Language', 'Sprache'],
    'st.theme': ['ظاهر برنامه', 'Appearance', 'Darstellung'],
    'st.theme.auto': ['خودکار', 'Auto', 'Automatisch'],
    'st.theme.light': ['روشن', 'Light', 'Hell'],
    'st.theme.dark': ['تیره', 'Dark', 'Dunkel'],
    'st.theme.hint': ['حالت «خودکار» از تنظیمات گوشی پیروی می‌کند.', '“Auto” follows your phone’s setting.', '„Automatisch“ folgt der Einstellung deines Telefons.'],
    'st.font': ['فونت فارسی', 'Persian font', 'Persische Schrift'],
    'st.font.vazir': ['وزیر', 'Vazir', 'Vazir'],
    'st.font.iransans': ['ایران‌سانس', 'IRANSans', 'IRANSans'],
    'st.week': ['اولین روز هفته در تقویم', 'First day of the week', 'Erster Tag der Woche'],
    'st.defaults': ['مقادیر پیش‌فرض چرخه', 'Cycle defaults', 'Zyklus-Standardwerte'],
    'st.defaults_hint': ['تا زمانی که چند پریود ثبت نکرده‌اید، پیش‌بینی با این مقادیر انجام می‌شود.',
                         'Used for predictions until you have logged a few periods.',
                         'Wird für Vorhersagen genutzt, bis du einige Perioden eingetragen hast.'],
    'st.cycle_len': ['طول چرخه', 'Cycle length', 'Zykluslänge'],
    'st.period_len': ['طول پریود', 'Period length', 'Periodenlänge'],
    'st.luteal': ['فاز پیش از پریود', 'Phase before period', 'Phase vor der Periode'],
    'st.luteal_hint': ['فاصله‌ی تخمک‌گذاری تا پریود بعدی؛ معمولاً ۱۲ تا ۱۶ روز.',
                       'Days between ovulation and the next period, usually 12 to 16.',
                       'Tage zwischen Eisprung und nächster Periode, meist 12 bis 16.'],
    'st.data': ['اطلاعات شما', 'Your data', 'Deine Daten'],
    'st.private': ['اطلاعات شما روی همین گوشی ذخیره می‌شود و برنامه کاملاً آفلاین کار می‌کند. فقط اگر خودتان پشتیبان‌گیری ابری را روشن کنید، یک نسخه در Google Drive شخصی شما نگه داشته می‌شود.',
                   'Your data is stored on this phone and the app works fully offline. Only if you turn on cloud backup is a copy kept in your own Google Drive.',
                   'Deine Daten liegen auf diesem Telefon und die App funktioniert komplett offline. Nur wenn du das Cloud-Backup einschaltest, wird eine Kopie in deinem eigenen Google Drive abgelegt.'],
    'st.export': ['ذخیره‌ی نسخه‌ی پشتیبان', 'Save a backup', 'Backup speichern'],
    'st.import': ['بازیابی از نسخه‌ی پشتیبان', 'Restore from backup', 'Aus Backup wiederherstellen'],
    'st.backup_hint': ['اگر برنامه را پاک کنید یا گوشی را عوض کنید، فقط با نسخه‌ی پشتیبان می‌توانید اطلاعات را برگردانید.',
                       'If you delete the app or change phones, a backup is the only way to get your data back.',
                       'Wenn du die App löschst oder das Telefon wechselst, kommst du nur mit einem Backup wieder an deine Daten.'],
    'st.erase': ['پاک کردن همه‌ی اطلاعات', 'Erase all data', 'Alle Daten löschen'],
    'st.erase_q': ['همه‌ی اطلاعات پاک شود؟', 'Erase all data?', 'Alle Daten löschen?'],
    'st.erase_d': ['پریودها، علائم و یادداشت‌ها برای همیشه حذف می‌شوند. این کار قابل بازگشت نیست.',
                   'All periods, symptoms and notes will be deleted for good. This can’t be undone.',
                   'Alle Perioden, Symptome und Notizen werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.'],
    'st.erase_yes': ['پاک کردن', 'Erase', 'Löschen'],
    'st.cancel': ['انصراف', 'Cancel', 'Abbrechen'],
    'st.import_ok': ['اطلاعات بازیابی شد', 'Data restored', 'Daten wiederhergestellt'],
    'st.import_bad': ['این فایل معتبر نیست. فایلی را انتخاب کنید که از خود برنامه ذخیره کرده‌اید.',
                      'This file can’t be read. Choose a backup saved from this app.',
                      'Diese Datei kann nicht gelesen werden. Wähle ein Backup, das du in dieser App gespeichert hast.'],
    'st.export_ok': ['نسخه‌ی پشتیبان آماده شد', 'Backup ready', 'Backup bereit'],
    'st.about': ['درباره', 'About', 'Über die App'],
    'st.disclaimer': ['این برنامه فقط برای ثبت و آگاهی است و جایگزین مشورت پزشک نیست. پیش‌بینی‌ها تخمینی‌اند و روش پیشگیری از بارداری محسوب نمی‌شوند.',
                      'This app is for tracking and awareness only and doesn’t replace medical advice. Predictions are estimates and are not a method of contraception.',
                      'Diese App dient nur zum Eintragen und zur Orientierung und ersetzt keine ärztliche Beratung. Die Vorhersagen sind Schätzungen und keine Verhütungsmethode.'],
    'st.install': ['نصب روی صفحه‌ی اصلی', 'Add to Home Screen', 'Zum Home-Bildschirm hinzufügen'],
    'st.install_d': ['آیفون: در Safari دکمه‌ی اشتراک‌گذاری را بزنید و «Add to Home Screen» را انتخاب کنید. اندروید: در Chrome منوی سه‌نقطه را بزنید و «Install app» یا «Add to Home screen» را انتخاب کنید. بعد از آن برنامه بدون اینترنت هم باز می‌شود.',
                     'iPhone: in Safari tap Share, then “Add to Home Screen”. Android: in Chrome open the ⋮ menu and choose “Install app” or “Add to Home screen”. After that the app opens without internet.',
                     'iPhone: Tippe in Safari auf Teilen und wähle „Zum Home-Bildschirm“. Android: Öffne in Chrome das ⋮-Menü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“. Danach öffnet sich die App auch ohne Internet.'],
    'st.version': ['نسخه', 'Version', 'Version'],

    /* app updates */
    'u.title': ['نسخه‌ی جدید ابرورا آماده است', 'A new version of Abrora is ready', 'Eine neue Version von Abrora ist bereit'],
    'u.ver': [function (v) { return 'نسخه‌ی ' + num(v); }, function (v) { return 'Version ' + v; }, function (v) { return 'Version ' + v; }],
    'u.safe': ['اطلاعات شما همه می‌ماند.', 'All your data stays as it is.', 'Alle deine Daten bleiben erhalten.'],
    'u.btn': ['بروزرسانی', 'Update', 'Aktualisieren'],
    'u.later': ['بعداً', 'Later', 'Später'],
    'u.group': ['بروزرسانی برنامه', 'App updates', 'App-Updates'],
    'u.check': ['بررسی نسخه‌ی جدید', 'Check for updates', 'Nach Updates suchen'],
    'u.checking': ['در حال بررسی…', 'Checking…', 'Suche läuft…'],
    'u.latest': ['از آخرین نسخه استفاده می‌کنید', 'You have the latest version', 'Du hast die neueste Version'],
    'u.offline': ['اتصال اینترنت برقرار نیست', 'No internet connection', 'Keine Internetverbindung'],
    'u.apply_to': [function (v) { return 'بروزرسانی به نسخه‌ی ' + num(v); }, function (v) { return 'Update to version ' + v; }, function (v) { return 'Auf Version ' + v + ' aktualisieren'; }],
    'u.nosw': ['بروزرسانی خودکار فقط در برنامه‌ی نصب‌شده روی صفحه‌ی اصلی کار می‌کند.', 'Updates work in the app installed on your home screen.', 'Updates funktionieren in der App auf deinem Home-Bildschirm.'],

    /* cloud backup (Google Drive) */
    'cl.title': ['پشتیبان‌گیری ابری', 'Cloud backup', 'Cloud-Backup'],
    'cl.desc': ['نسخه‌ی پشتیبان در بخش اختصاصی و پنهان Google Drive خودتان ذخیره می‌شود. فقط ابرورا به آن دسترسی دارد و در برنامه‌ی Drive هم دیده نمی‌شود. روی گوشی جدید فقط با ورود به همین حساب، اطلاعاتتان برمی‌گردد.',
                'Your backup is kept in a private, hidden area of your own Google Drive. Only Abrora can access it and it doesn’t show up in the Drive app. On a new phone, just sign in with the same account to get your data back.',
                'Dein Backup liegt in einem privaten, versteckten Bereich deines eigenen Google Drive. Nur Abrora hat Zugriff, und es erscheint nicht in der Drive-App. Auf einem neuen Telefon meldest du dich einfach mit demselben Konto an.'],
    'cl.unconfigured': ['پشتیبان‌گیری ابری هنوز فعال نشده است.', 'Cloud backup isn’t set up yet.', 'Cloud-Backup ist noch nicht eingerichtet.'],
    'cl.connect': ['اتصال به حساب گوگل', 'Connect Google account', 'Mit Google-Konto verbinden'],
    'cl.account': ['حساب متصل', 'Connected account', 'Verbundenes Konto'],
    'cl.last': [function (w) { return 'آخرین پشتیبان: ' + w; }, function (w) { return 'Last backup: ' + w; }, function (w) { return 'Letztes Backup: ' + w; }],
    'cl.never': ['هنوز پشتیبان‌گیری نشده', 'No backup yet', 'Noch kein Backup'],
    'cl.synced': ['همه‌ی اطلاعات پشتیبان‌گیری شده است', 'Everything is backed up', 'Alles ist gesichert'],
    'cl.pending': ['تغییرات تازه منتظر پشتیبان‌گیری است', 'New changes are waiting to be backed up', 'Neue Änderungen warten auf das Backup'],
    'cl.signin_again': ['برای ادامه‌ی پشتیبان‌گیری خودکار، یک بار دیگر وارد شوید.', 'Sign in again to continue automatic backups.', 'Melde dich erneut an, um automatische Backups fortzusetzen.'],
    'cl.signin': ['ورود', 'Sign in', 'Anmelden'],
    'cl.backup_now': ['پشتیبان‌گیری همین حالا', 'Back up now', 'Jetzt sichern'],
    'cl.restore': ['بازیابی از نسخه‌ی ابری', 'Restore from cloud', 'Aus der Cloud wiederherstellen'],
    'cl.disconnect': ['قطع اتصال', 'Disconnect', 'Trennen'],
    'cl.delete': ['حذف نسخه‌ی ابری', 'Delete cloud copy', 'Cloud-Kopie löschen'],
    'cl.backing': ['در حال پشتیبان‌گیری…', 'Backing up…', 'Sicherung läuft…'],
    'cl.ok': ['پشتیبان‌گیری انجام شد', 'Backup done', 'Backup erstellt'],
    'cl.fail': ['پشتیبان‌گیری انجام نشد. اینترنت را بررسی کنید.', 'Backup failed. Check your internet connection.', 'Backup fehlgeschlagen. Prüfe deine Internetverbindung.'],
    'cl.signin_fail': ['ورود انجام نشد', 'Sign-in didn’t work', 'Anmeldung fehlgeschlagen'],
    'cl.connected_ok': ['به حساب گوگل متصل شد', 'Google account connected', 'Google-Konto verbunden'],
    'cl.first_ok': ['اتصال برقرار شد و اولین پشتیبان ساخته شد', 'Connected, first backup saved', 'Verbunden, erstes Backup gespeichert'],
    'cl.found_t': ['نسخه‌ی ابری پیدا شد', 'Cloud backup found', 'Cloud-Backup gefunden'],
    'cl.found_d': [function (w) { return 'یک نسخه‌ی پشتیبان از ' + w + ' در حساب گوگل شما هست. آن را بازیابی کنیم؟'; },
                   function (w) { return 'There’s a backup from ' + w + ' in your Google account. Restore it?'; },
                   function (w) { return 'In deinem Google-Konto liegt ein Backup von ' + w + '. Wiederherstellen?'; }],
    'cl.found_both': ['روی این گوشی هم اطلاعاتی ثبت شده است. با بازیابی، اطلاعات همین گوشی با نسخه‌ی ابری جایگزین می‌شود.',
                      'This phone also has data. Restoring replaces what’s on this phone with the cloud copy.',
                      'Auf diesem Telefon sind auch Daten. Beim Wiederherstellen werden sie durch die Cloud-Kopie ersetzt.'],
    'cl.restore_yes': ['بازیابی اطلاعات', 'Restore data', 'Daten wiederherstellen'],
    'cl.keep_local': ['نگه داشتن اطلاعات این گوشی', 'Keep this phone’s data', 'Daten dieses Telefons behalten'],
    'cl.restored': ['اطلاعات از نسخه‌ی ابری بازیابی شد', 'Data restored from the cloud', 'Daten aus der Cloud wiederhergestellt'],
    'cl.none': ['نسخه‌ی ابری پیدا نشد', 'No cloud backup found', 'Kein Cloud-Backup gefunden'],
    'cl.disc_q': ['اتصال قطع شود؟', 'Disconnect?', 'Verbindung trennen?'],
    'cl.disc_d': ['پشتیبان‌گیری خودکار متوقف می‌شود. نسخه‌ی ابری در Drive باقی می‌ماند و اطلاعات این گوشی دست‌نخورده است.',
                  'Automatic backups stop. The cloud copy stays in Drive and the data on this phone is untouched.',
                  'Automatische Backups werden beendet. Die Cloud-Kopie bleibt in Drive, die Daten auf diesem Telefon bleiben unverändert.'],
    'cl.disc_yes': ['قطع اتصال', 'Disconnect', 'Trennen'],
    'cl.del_q': ['نسخه‌ی ابری حذف شود؟', 'Delete the cloud copy?', 'Cloud-Kopie löschen?'],
    'cl.del_d': ['نسخه‌ی پشتیبان از Google Drive شما پاک می‌شود. اطلاعات روی این گوشی می‌ماند.',
                 'The backup is removed from your Google Drive. The data on this phone stays.',
                 'Das Backup wird aus deinem Google Drive entfernt. Die Daten auf diesem Telefon bleiben.'],
    'cl.del_yes': ['حذف', 'Delete', 'Löschen'],
    'cl.deleted': ['نسخه‌ی ابری حذف شد', 'Cloud copy deleted', 'Cloud-Kopie gelöscht'],
    'cl.banner': ['پشتیبان‌گیری ابری متوقف شده است. برای ادامه وارد شوید.', 'Cloud backup is paused. Sign in to continue.', 'Das Cloud-Backup ist pausiert. Melde dich an, um fortzufahren.'],
    'cl.new_phone': ['گوشی جدید دارید؟ بازیابی با حساب گوگل', 'New phone? Restore with Google', 'Neues Telefon? Mit Google wiederherstellen'],
    'in.btn': ['نصب برنامه', 'Install app', 'App installieren'],

    /* onboarding */
    'o.welcome': ['به ابرورا خوش آمدید', 'Welcome to Abrora', 'Willkommen bei Abrora'],
    'o.welcome_d': ['چرخه‌ی خود را ساده و خصوصی دنبال کنید. همه‌چیز فقط روی همین گوشی می‌ماند.',
                    'Follow your cycle simply and privately. Everything stays on this phone.',
                    'Verfolge deinen Zyklus einfach und privat. Alles bleibt auf diesem Telefon.'],
    'o.start': ['شروع', 'Get started', 'Los geht’s'],
    'o.last_t': ['آخرین پریود شما کی شروع شد؟', 'When did your last period start?', 'Wann hat deine letzte Periode begonnen?'],
    'o.last_d': ['روز اول را در تقویم انتخاب کنید.', 'Tap the first day in the calendar.', 'Tippe im Kalender auf den ersten Tag.'],
    'o.skip': ['یادم نیست', 'I don’t remember', 'Weiß ich nicht mehr'],
    'o.len_t': ['چرخه و پریود معمول شما', 'Your usual cycle and period', 'Dein üblicher Zyklus'],
    'o.len_d': ['چرخه از روز اول یک پریود تا روز قبل از پریود بعدی است. اگر مطمئن نیستید، همین مقادیر را نگه دارید؛ برنامه خودش با ثبت‌های شما دقیق‌تر می‌شود.',
                'A cycle runs from the first day of one period to the day before the next. If you’re not sure, keep these values; the app sharpens them as you log.',
                'Ein Zyklus reicht vom ersten Tag einer Periode bis zum Tag vor der nächsten. Wenn du unsicher bist, lass die Werte stehen – die App wird mit deinen Einträgen genauer.'],
    'o.next': ['ادامه', 'Continue', 'Weiter'],
    'o.finish': ['ورود به برنامه', 'Open Abrora', 'Abrora öffnen'],
    'o.step': [function (a, b) { return num(a) + ' از ' + num(b); },
               function (a, b) { return a + ' of ' + b; },
               function (a, b) { return a + ' von ' + b; }],

    'toast.started': ['پریود ثبت شد', 'Period started', 'Periode gestartet'],
    'toast.ended': ['پایان پریود ثبت شد', 'Period ended', 'Periode beendet'],
    'toast.last_ok': ['آخرین پریود ثبت شد', 'Last period saved', 'Letzte Periode gespeichert'],
    'weekday.1': ['دوشنبه', 'Monday', 'Montag'],
    'weekday.0': ['یکشنبه', 'Sunday', 'Sonntag'],
    'weekday.6': ['شنبه', 'Saturday', 'Samstag'],
    'lang.fa': ['فارسی', 'فارسی', 'فارسی'],
    'lang.en': ['English', 'English', 'English'],
    'lang.de': ['Deutsch', 'Deutsch', 'Deutsch']
  };

  /* ---------- tips & articles ---------- */
  // each tip: icon, tone, [fa,en,de] each = [title, body]
  var TIPS = {
    menstrual: [
      { e: '🔥', tone: 'rose',
        fa: ['گرما، بهترین مسکن طبیعی', 'کیسه‌ی آب گرم یا کمپرس گرم روی پایین شکم عضلات را شل می‌کند و گرفتگی را کم می‌کند. کشش‌های ملایم و پیاده‌روی آرام هم کمک می‌کند.'],
        en: ['Warmth is your friend', 'A hot water bottle or warm compress on your lower belly relaxes the muscles and eases cramps. Gentle stretching or a slow walk can help too.'],
        de: ['Wärme tut gut', 'Eine Wärmflasche oder ein warmer Wickel auf dem Unterbauch entspannt die Muskeln und lindert Krämpfe. Sanftes Dehnen oder ein langsamer Spaziergang helfen ebenfalls.'] },
      { e: '🥬', tone: 'mint',
        fa: ['آهن را فراموش نکنید', 'در روزهای پریود کمی آهن از دست می‌دهید. عدس، اسفناج، لوبیا، تخم‌مرغ و گوشت کم‌چرب منبع خوبی‌اند و ویتامین C (مرکبات، فلفل دلمه‌ای) جذب آهن را بیشتر می‌کند.'],
        en: ['Don’t forget iron', 'You lose a little iron while bleeding. Lentils, spinach, beans, eggs and lean meat are good sources, and vitamin C (citrus, peppers) helps your body absorb it.'],
        de: ['Denk an Eisen', 'Beim Bluten verlierst du etwas Eisen. Linsen, Spinat, Bohnen, Eier und mageres Fleisch sind gute Quellen, Vitamin C (Zitrusfrüchte, Paprika) verbessert die Aufnahme.'] },
      { e: '😴', tone: 'lilac',
        fa: ['استراحت کنید', 'در روزهای اول انرژی معمولاً کمتر است. برنامه‌ی سبک‌تر و خواب زودتر کاملاً قابل قبول است.'],
        en: ['Allow yourself to rest', 'Energy is often lower in the first days. A lighter schedule and an early night are completely fine.'],
        de: ['Gönn dir Ruhe', 'In den ersten Tagen ist die Energie oft geringer. Ein leichterer Tagesplan und früh ins Bett gehen sind völlig in Ordnung.'] }
    ],
    follicular: [
      { e: '🏃‍♀️', tone: 'mint',
        fa: ['وقت حرکت و شروع‌های تازه', 'با بالا رفتن استروژن، انرژی و تمرکز معمولاً بیشتر می‌شود. زمان خوبی برای ورزش، کارهای جدید و برنامه‌های اجتماعی است.'],
        en: ['Time to move and start fresh', 'As estrogen rises, energy and focus usually rise too. A good time for workouts, new projects and social plans.'],
        de: ['Zeit für Bewegung und Neues', 'Wenn das Östrogen steigt, nehmen Energie und Fokus meist zu. Eine gute Zeit für Sport, neue Projekte und Verabredungen.'] },
      { e: '🥗', tone: 'butter',
        fa: ['غذای سبک و رنگارنگ', 'سبزی تازه، غلات کامل و پروتئین کافی انرژی را پایدار نگه می‌دارد.'],
        en: ['Light, colourful meals', 'Fresh vegetables, whole grains and enough protein keep your energy steady.'],
        de: ['Leicht und bunt essen', 'Frisches Gemüse, Vollkorn und genug Eiweiß halten die Energie stabil.'] },
      { e: '💧', tone: 'sky',
        fa: ['آب کافی بنوشید', 'نوشیدن منظم آب به تمرکز و پوست کمک می‌کند. یک بطری کنار دستتان بگذارید.'],
        en: ['Keep sipping water', 'Drinking regularly supports focus and skin. Keep a bottle within reach.'],
        de: ['Trink genug Wasser', 'Regelmäßiges Trinken unterstützt Konzentration und Haut. Stell dir eine Flasche in Reichweite.'] }
    ],
    fertile: [
      { e: '🌿', tone: 'mint',
        fa: ['این روزها بارداری ممکن است', 'اگر نمی‌خواهید باردار شوید، از روش پیشگیری مطمئن استفاده کنید. پیش‌بینی‌های این برنامه تخمینی است و روش پیشگیری نیست.'],
        en: ['Pregnancy is possible now', 'If you want to avoid pregnancy, use reliable contraception. This app’s predictions are estimates, not birth control.'],
        de: ['Jetzt ist eine Schwangerschaft möglich', 'Wenn du nicht schwanger werden möchtest, nutze eine sichere Verhütung. Die Vorhersagen dieser App sind Schätzungen und keine Verhütungsmethode.'] },
      { e: '✨', tone: 'rose',
        fa: ['نشانه‌های رایج تخمک‌گذاری', 'ترشحات شفاف و کشسان، درد خفیف یک‌طرفه‌ی پایین شکم یا میل بیشتر به معاشرت در این روزها طبیعی است. همه کس این نشانه‌ها را ندارد.'],
        en: ['Common signs of ovulation', 'Clear, stretchy mucus, mild one-sided lower belly twinges or a social mood are normal now. Not everyone notices signs.'],
        de: ['Typische Zeichen des Eisprungs', 'Klarer, fadenziehender Schleim, leichtes einseitiges Ziehen im Unterbauch oder mehr Lust auf Gesellschaft sind jetzt normal. Nicht jede spürt Zeichen.'] },
      { e: '🍓', tone: 'butter',
        fa: ['فیبر و میوه‌ی تازه', 'میوه، سبزی و غلات کامل هضم را راحت و انرژی را پایدار نگه می‌دارد.'],
        en: ['Fibre and fresh fruit', 'Fruit, vegetables and whole grains keep digestion comfortable and energy steady.'],
        de: ['Ballaststoffe und frisches Obst', 'Obst, Gemüse und Vollkorn halten die Verdauung angenehm und die Energie stabil.'] }
    ],
    luteal: [
      { e: '🍫', tone: 'butter',
        fa: ['هوس خوراکی عادی است', 'قبل از پریود هوس شیرینی و شور رایج است. میان‌وعده‌ی متعادل با پروتئین و فیبر انرژی را ثابت نگه می‌دارد. اگر نفخ اذیتتان می‌کند، غذای خیلی شور را کم کنید.'],
        en: ['Cravings are normal', 'Craving sweet or salty food before your period is common. Balanced snacks with protein and fibre keep energy steady. If bloating bothers you, go easy on very salty food.'],
        de: ['Heißhunger ist normal', 'Vor der Periode Lust auf Süßes oder Salziges zu haben, ist häufig. Ausgewogene Snacks mit Eiweiß und Ballaststoffen halten die Energie stabil. Bei Blähbauch lieber weniger Salziges essen.'] },
      { e: '🧘‍♀️', tone: 'lilac',
        fa: ['حرکت ملایم و نفس عمیق', 'کشش، یوگا یا چند دقیقه تنفس عمیق به کاهش تنش و بهتر شدن حال کمک می‌کند.'],
        en: ['Gentle movement, deep breaths', 'Stretching, yoga or a few minutes of slow breathing can ease tension and lift your mood.'],
        de: ['Sanfte Bewegung, tiefe Atemzüge', 'Dehnen, Yoga oder ein paar Minuten ruhiges Atmen können Anspannung lösen und die Stimmung heben.'] },
      { e: '🌙', tone: 'sky',
        fa: ['خواب منظم', 'ساعت خواب ثابت داشته باشید و کافئین را آخر روز کم کنید؛ در این روزها خواب سبک‌تر می‌شود.'],
        en: ['Protect your sleep', 'Keep a regular bedtime and cut back on caffeine late in the day; sleep is often lighter now.'],
        de: ['Schütze deinen Schlaf', 'Halte feste Schlafenszeiten ein und trink spätabends weniger Koffein – der Schlaf ist jetzt oft leichter.'] }
    ]
  };

  // articles: title + paragraphs per language
  var ARTICLES = [
    { id: 'normal', e: '📅', tone: 'lilac',
      fa: ['چرخه‌ی طبیعی چند روز است؟', [
        'چرخه از روز اول یک پریود شروع می‌شود و تا روز قبل از شروع پریود بعدی ادامه دارد.',
        'در بزرگسالان معمولاً بین ۲۱ تا ۳۵ روز طبیعی است و پریود هم معمولاً ۲ تا ۷ روز طول می‌کشد.',
        'چند روز تفاوت از ماهی به ماه دیگر عادی است. هرچه پریودهای بیشتری ثبت کنید، پیش‌بینی برنامه دقیق‌تر می‌شود.']],
      en: ['What is a normal cycle?', [
        'A cycle starts on the first day of one period and lasts until the day before the next one begins.',
        'In adults, 21 to 35 days is typical, and a period usually lasts 2 to 7 days.',
        'A few days of variation from month to month is normal. The more periods you log, the sharper the predictions get.']],
      de: ['Was ist ein normaler Zyklus?', [
        'Ein Zyklus beginnt am ersten Tag einer Periode und dauert bis zum Tag vor Beginn der nächsten.',
        'Bei Erwachsenen sind 21 bis 35 Tage typisch, die Periode dauert meist 2 bis 7 Tage.',
        'Ein paar Tage Unterschied von Monat zu Monat sind normal. Je mehr Perioden du einträgst, desto genauer werden die Vorhersagen.']] },
    { id: 'phases', e: '🌗', tone: 'rose',
      fa: ['چهار مرحله‌ی چرخه', [
        'پریود: لایه‌ی داخلی رحم همراه با خونریزی دفع می‌شود.',
        'بعد از پریود: هورمون‌ها بالا می‌روند، رحم دوباره آماده می‌شود و انرژی معمولاً بیشتر می‌شود.',
        'تخمک‌گذاری: تخمدان یک تخمک آزاد می‌کند. این اتفاق معمولاً حدود ۱۴ روز مانده به پریود بعدی رخ می‌دهد.',
        'پیش از پریود: اگر بارداری رخ ندهد، هورمون‌ها افت می‌کنند. در این مرحله ممکن است علائم PMS مثل خستگی، نفخ یا حساسیت را حس کنید.']],
      en: ['The four phases of your cycle', [
        'Period: the lining of the uterus is shed with bleeding.',
        'After your period: hormones rise, the lining builds up again and energy often improves.',
        'Ovulation: an ovary releases an egg. This usually happens about 14 days before the next period.',
        'Before your period: if there is no pregnancy, hormones drop. You may notice PMS signs such as tiredness, bloating or sensitivity.']],
      de: ['Die vier Phasen deines Zyklus', [
        'Periode: Die Gebärmutterschleimhaut wird mit der Blutung abgestoßen.',
        'Nach der Periode: Die Hormone steigen, die Schleimhaut baut sich wieder auf und die Energie wird oft besser.',
        'Eisprung: Ein Eierstock gibt eine Eizelle ab. Das passiert meist etwa 14 Tage vor der nächsten Periode.',
        'Vor der Periode: Ohne Schwangerschaft sinken die Hormone. Du bemerkst vielleicht PMS-Zeichen wie Müdigkeit, Blähbauch oder Sensibilität.']] },
    { id: 'fertile', e: '🌱', tone: 'mint',
      fa: ['روزهای باروری را بهتر بشناسید', [
        'اسپرم تا حدود ۵ روز در بدن می‌ماند و تخمک حدود ۱۲ تا ۲۴ ساعت پس از تخمک‌گذاری قابل لقاح است. به همین دلیل پنجره‌ی باروری حدود ۶ روز است.',
        'این برنامه تخمک‌گذاری را حدود ۱۴ روز (مقدار قابل تنظیم) قبل از پریود بعدی تخمین می‌زند. در عمل زمان تخمک‌گذاری در هر چرخه می‌تواند جابه‌جا شود.',
        'بنابراین این پیش‌بینی‌ها برای پیشگیری از بارداری قابل اتکا نیستند.']],
      en: ['Understanding the fertile window', [
        'Sperm can survive up to about 5 days, and an egg can be fertilised for roughly 12 to 24 hours after ovulation. That makes the fertile window about 6 days long.',
        'The app estimates ovulation about 14 days (adjustable) before your next period. In real life the timing can shift from cycle to cycle.',
        'That’s why these predictions can’t be relied on to prevent pregnancy.']],
      de: ['Die fruchtbaren Tage verstehen', [
        'Spermien überleben bis zu etwa 5 Tage, eine Eizelle ist nach dem Eisprung etwa 12 bis 24 Stunden befruchtbar. Das fruchtbare Fenster dauert deshalb rund 6 Tage.',
        'Die App schätzt den Eisprung etwa 14 Tage (einstellbar) vor der nächsten Periode. In Wirklichkeit kann sich der Zeitpunkt von Zyklus zu Zyklus verschieben.',
        'Deshalb sind diese Vorhersagen nicht zur Verhütung geeignet.']] },
    { id: 'relief', e: '🫖', tone: 'butter',
      fa: ['کم کردن PMS و گرفتگی', [
        'گرما، حرکت ملایم، خواب کافی و آب فراوان معمولاً کمک می‌کنند. کم کردن کافئین، الکل و غذاهای خیلی شور هم برای بعضی‌ها مؤثر است.',
        'مسکن‌های بدون نسخه را فقط طبق برچسب دارو و در صورتی استفاده کنید که برای شما مناسب باشند. اگر مطمئن نیستید از داروساز یا پزشک بپرسید.',
        'ثبت علائم در این برنامه کمک می‌کند الگوی خود را ببینید و در صورت نیاز به پزشک نشان بدهید.']],
      en: ['Easing PMS and cramps', [
        'Warmth, gentle movement, enough sleep and plenty of water usually help. Cutting back on caffeine, alcohol and very salty food works for some people.',
        'Use over-the-counter pain relief only as directed on the label and only if it is suitable for you. If you’re unsure, ask a pharmacist or doctor.',
        'Logging symptoms here helps you see your pattern and show it to a doctor if needed.']],
      de: ['PMS und Krämpfe lindern', [
        'Wärme, sanfte Bewegung, genug Schlaf und viel Wasser helfen meist. Weniger Koffein, Alkohol und sehr salzige Speisen tun manchen gut.',
        'Rezeptfreie Schmerzmittel nur nach Packungsbeilage und nur, wenn sie für dich geeignet sind. Frag im Zweifel in der Apotheke oder bei deiner Ärztin bzw. deinem Arzt.',
        'Wenn du Symptome hier einträgst, erkennst du dein Muster und kannst es bei Bedarf in der Praxis zeigen.']] },
    { id: 'doctor', e: '🩺', tone: 'sky',
      fa: ['چه زمانی به پزشک سر بزنیم؟', [
        'اگر چرخه‌هایتان مدام کوتاه‌تر از ۲۱ یا بلندتر از ۳۵ روز است، یا از ماهی به ماه دیگر خیلی تغییر می‌کند.',
        'اگر پریود بیش از ۷ روز طول می‌کشد، یا چند ساعت پشت‌سرهم هر ساعت نوار یا تامپون کاملاً خیس می‌شود.',
        'اگر دردی دارید که زندگی روزمره را مختل می‌کند، خونریزی بین دو پریود یا بعد از رابطه دارید، یا بیش از ۳ ماه پریود نشده‌اید (و باردار نیستید).',
        'در صورت غش، سرگیجه‌ی شدید یا درد ناگهانی و شدید فوراً به اورژانس مراجعه کنید.']],
      en: ['When to talk to a doctor', [
        'Your cycles are regularly shorter than 21 or longer than 35 days, or they vary a lot from month to month.',
        'Your period lasts longer than 7 days, or you soak through a pad or tampon every hour for several hours.',
        'You have pain that gets in the way of daily life, bleeding between periods or after sex, or no period for more than 3 months (and you’re not pregnant).',
        'Seek urgent care for fainting, severe dizziness or sudden, severe pain.']],
      de: ['Wann zur Ärztin oder zum Arzt?', [
        'Deine Zyklen sind dauerhaft kürzer als 21 oder länger als 35 Tage oder schwanken stark von Monat zu Monat.',
        'Deine Periode dauert länger als 7 Tage, oder du durchtränkst mehrere Stunden lang jede Stunde eine Binde oder einen Tampon.',
        'Du hast Schmerzen, die den Alltag beeinträchtigen, Blutungen zwischen den Perioden oder nach dem Sex, oder länger als 3 Monate keine Periode (und bist nicht schwanger).',
        'Bei Ohnmacht, starkem Schwindel oder plötzlichen, starken Schmerzen such sofort ärztliche Hilfe.']] }
  ];

  var MOODS = [['happy', '😊'], ['calm', '😌'], ['energetic', '🤩'], ['sensitive', '🥺'], ['irritable', '😠'], ['anxious', '😰'], ['sad', '😢']];
  var SYMPTOMS = [['cramps', '😖'], ['headache', '🤕'], ['bloating', '🎈'], ['backache', '💢'], ['breast', '🍒'],
                  ['acne', '🔴'], ['fatigue', '😴'], ['nausea', '🤢'], ['cravings', '🍫'], ['sleep', '🌙']];

  function t(key) {
    var v = D[key];
    if (!v) return key;
    var s = v[IDX[lang]];
    if (typeof s === 'function') return s.apply(null, Array.prototype.slice.call(arguments, 1));
    return s;
  }
  function pick(obj) { return obj[lang]; }

  function dateParts(n) {
    var d = new Date(n * 86400000);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() };
  }
  var fmt = {
    dayMonth: function (n) {
      var p = dateParts(n);
      if (lang === 'fa') return num(p.d) + ' ' + MONTHS.fa[p.m];
      if (lang === 'en') return MONTHS_S.en[p.m] + ' ' + p.d;
      return p.d + '. ' + MONTHS_S.de[p.m];
    },
    full: function (n) {
      var p = dateParts(n);
      if (lang === 'fa') return num(p.d) + ' ' + MONTHS.fa[p.m] + ' ' + num(p.y);
      if (lang === 'en') return MONTHS_S.en[p.m] + ' ' + p.d + ', ' + p.y;
      return p.d + '. ' + MONTHS_S.de[p.m] + ' ' + p.y;
    },
    weekdayLong: function (n) {
      var p = dateParts(n);
      var wd = WD[lang][p.wd];
      if (lang === 'fa') return wd + '، ' + num(p.d) + ' ' + MONTHS.fa[p.m];
      if (lang === 'en') return wd + ', ' + MONTHS.en[p.m] + ' ' + p.d;
      return wd + ', ' + p.d + '. ' + MONTHS.de[p.m];
    },
    monthYear: function (y, m) {
      if (lang === 'fa') return MONTHS.fa[m] + ' ' + num(y);
      return MONTHS.en && lang === 'en' ? MONTHS.en[m] + ' ' + y : MONTHS.de[m] + ' ' + y;
    }
  };

  root.I18N = {
    LANGS: LANGS,
    setLang: function (l) { if (IDX[l] !== undefined) lang = l; },
    getLang: function () { return lang; },
    isRTL: function () { return lang === 'fa'; },
    t: t, num: num, pick: pick, fmt: fmt,
    weekdayShort: function (wd) { return WD_S[lang][wd]; },
    monthShort: function (m) { return MONTHS_S[lang][m]; },
    weekdayName: function (wd) { return WD[lang][wd]; },
    TIPS: TIPS, ARTICLES: ARTICLES, MOODS: MOODS, SYMPTOMS: SYMPTOMS
  };
})(typeof self !== 'undefined' ? self : this);
