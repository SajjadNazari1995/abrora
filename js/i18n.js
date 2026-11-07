/* Abra — translations (fa / en / de), numerals and Gregorian date names. */
(function (root) {
  'use strict';

  var LANGS = ['fa', 'en', 'de'];
  var IDX = { fa: 0, en: 1, de: 2 };
  var lang = 'en'; /* English is the default (V2) */

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
    'app.name': ['%APP%', '%APP%', '%APP%'],
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
    'st.private': ['اطلاعات چرخه‌ی شما رمزگذاری‌شده روی همین دستگاه ذخیره می‌شود و برنامه آفلاین کار می‌کند. حساب فقط برای ورود است. فقط اگر خودتان پشتیبان‌گیری ابری را روشن کنید، یک نسخه در Google Drive شخصی شما نگه داشته می‌شود.',
                   'Your cycle data is stored encrypted on this device and the app works offline. An account is only for signing in. Only if you turn on cloud backup is a copy kept in your own Google Drive.',
                   'Deine Zyklusdaten liegen verschlüsselt auf diesem Gerät und die App funktioniert offline. Ein Konto dient nur der Anmeldung. Nur wenn du das Cloud-Backup einschaltest, wird eine Kopie in deinem eigenen Google Drive abgelegt.'],
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
    'st.privacy': ['حریم خصوصی', 'Privacy', 'Datenschutz'],
    'nt.title': ['یادآوری', 'Reminders', 'Erinnerungen'],
    'nt.on': ['روشن', 'On', 'An'],
    'nt.off': ['خاموش', 'Off', 'Aus'],
    'nt.web': ['یادآوری در نسخه‌ی اندروید و iOS برنامه فعال می‌شود. در مرورگر امکان ندارد.', 'Reminders work in the Android and iOS app, not in the browser.', 'Erinnerungen funktionieren in der Android- und iOS-App, nicht im Browser.'],
    'nt.time': ['ساعت یادآوری', 'Reminder time', 'Uhrzeit'],
    'nt.pre': ['چند روز زودتر', 'How early', 'Wie früh'],
    'nt.pre0': ['همان روز', 'Same day', 'Am Tag'],
    'nt.pre1': ['۱ روز', '1 day', '1 Tag'],
    'nt.pre2': ['۲ روز', '2 days', '2 Tage'],
    'nt.pre3': ['۳ روز', '3 days', '3 Tage'],
    'nt.hint': ['متن اعلان عمداً عمومی و مهربان است و روی صفحه‌ی قفل چیزی درباره‌ی چرخه نمی‌گوید. زمان‌ها از پیش‌بینی برنامه ساخته می‌شود و فقط روی همین گوشی می‌ماند.', 'The text is deliberately generic and kind, and never says anything about your cycle on the lock screen. Times come from the app’s prediction and stay on this phone.', 'Der Text ist bewusst allgemein und freundlich und verrät auf dem Sperrbildschirm nichts über deinen Zyklus. Die Zeiten stammen aus der Vorhersage der App und bleiben auf diesem Handy.'],
    'nt.denied': ['اجازه‌ی اعلان داده نشد. از تنظیمات گوشی می‌توانید فعالش کنید.', 'Notifications were not allowed. You can turn them on in your phone’s settings.', 'Benachrichtigungen wurden nicht erlaubt. Du kannst sie in den Handy-Einstellungen aktivieren.'],
    'st.disclaimer': ['این برنامه فقط برای ثبت و آگاهی است و جایگزین مشورت پزشک نیست. پیش‌بینی‌ها تخمینی‌اند و روش پیشگیری از بارداری محسوب نمی‌شوند.',
                      'This app is for tracking and awareness only and doesn’t replace medical advice. Predictions are estimates and are not a method of contraception.',
                      'Diese App dient nur zum Eintragen und zur Orientierung und ersetzt keine ärztliche Beratung. Die Vorhersagen sind Schätzungen und keine Verhütungsmethode.'],
    'st.install': ['نصب روی صفحه‌ی اصلی', 'Add to Home Screen', 'Zum Home-Bildschirm hinzufügen'],
    'st.install_d': ['آیفون: در Safari دکمه‌ی اشتراک‌گذاری را بزنید و «Add to Home Screen» را انتخاب کنید. اندروید: در Chrome منوی سه‌نقطه را بزنید و «Install app» یا «Add to Home screen» را انتخاب کنید. بعد از آن برنامه بدون اینترنت هم باز می‌شود.',
                     'iPhone: in Safari tap Share, then “Add to Home Screen”. Android: in Chrome open the ⋮ menu and choose “Install app” or “Add to Home screen”. After that the app opens without internet.',
                     'iPhone: Tippe in Safari auf Teilen und wähle „Zum Home-Bildschirm“. Android: Öffne in Chrome das ⋮-Menü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“. Danach öffnet sich die App auch ohne Internet.'],
    'st.version': ['نسخه', 'Version', 'Version'],

    /* app updates */
    'u.title': ['نسخه‌ی جدید %APP% آماده است', 'A new version of %APP% is ready', 'Eine neue Version von %APP% ist bereit'],
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
    'cl.desc': ['نسخه‌ی پشتیبان در بخش اختصاصی و پنهان Google Drive خودتان ذخیره می‌شود. فقط %APP% به آن دسترسی دارد و در برنامه‌ی Drive هم دیده نمی‌شود. روی گوشی جدید فقط با ورود به همین حساب، اطلاعاتتان برمی‌گردد.',
                'Your backup is kept in a private, hidden area of your own Google Drive. Only %APP% can access it and it doesn’t show up in the Drive app. On a new phone, just sign in with the same account to get your data back.',
                'Dein Backup liegt in einem privaten, versteckten Bereich deines eigenen Google Drive. Nur %APP% hat Zugriff, und es erscheint nicht in der Drive-App. Auf einem neuen Telefon meldest du dich einfach mit demselben Konto an.'],
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
    'o.welcome': ['به %APP% خوش آمدید', 'Welcome to %APP%', 'Willkommen bei %APP%'],
    'o.welcome_d': ['چرخه‌ی خود را ساده و خصوصی دنبال کنید. داده‌های سلامتی شما روی همین دستگاه می‌ماند.',
                    'Follow your cycle simply and privately. Your health data stays on this device.',
                    'Verfolge deinen Zyklus einfach und privat. Deine Gesundheitsdaten bleiben auf diesem Gerät.'],
    'o.start': ['شروع', 'Get started', 'Los geht’s'],
    'o.last_t': ['آخرین پریود شما کی شروع شد؟', 'When did your last period start?', 'Wann hat deine letzte Periode begonnen?'],
    'o.last_d': ['روز اول را در تقویم انتخاب کنید.', 'Tap the first day in the calendar.', 'Tippe im Kalender auf den ersten Tag.'],
    'o.skip': ['یادم نیست', 'I don’t remember', 'Weiß ich nicht mehr'],
    'o.len_t': ['چرخه و پریود معمول شما', 'Your usual cycle and period', 'Dein üblicher Zyklus'],
    'o.len_d': ['چرخه از روز اول یک پریود تا روز قبل از پریود بعدی است. اگر مطمئن نیستید، همین مقادیر را نگه دارید؛ برنامه خودش با ثبت‌های شما دقیق‌تر می‌شود.',
                'A cycle runs from the first day of one period to the day before the next. If you’re not sure, keep these values; the app sharpens them as you log.',
                'Ein Zyklus reicht vom ersten Tag einer Periode bis zum Tag vor der nächsten. Wenn du unsicher bist, lass die Werte stehen – die App wird mit deinen Einträgen genauer.'],
    'o.next': ['ادامه', 'Continue', 'Weiter'],
    'o.finish': ['ورود به برنامه', 'Open %APP%', '%APP% öffnen'],
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
    'lang.de': ['Deutsch', 'Deutsch', 'Deutsch'],

    /* ---- v1.3: name, calendar, lock, articles, pain ---- */
    'g.hello': [function (n) { return 'سلام ' + n + ' جان'; }, function (n) { return 'Hi, ' + n; }, function (n) { return 'Hallo, ' + n; }],
    'o.name_l': ['اسم شما', 'Your name', 'Dein Name'],
    'o.name_ph': ['مثلاً سارا', 'e.g. Sara', 'z. B. Sara'],
    'o.name_h': ['اختیاری است و فقط روی همین گوشی می‌ماند.', 'Optional, and it stays on this phone only.', 'Optional – und er bleibt nur auf diesem Handy.'],
    'o.lang_l': ['زبان', 'Language', 'Sprache'],
    'o.cal_l': ['نوع تقویم', 'Calendar', 'Kalender'],
    'cal.gregorian': ['میلادی', 'Gregorian', 'Gregorianisch'],
    'cal.jalali': ['شمسی', 'Persian', 'Persisch'],
    'st.profile': ['پروفایل', 'Profile', 'Profil'],
    'st.name': ['اسم', 'Name', 'Name'],
    'st.calendar': ['تقویم', 'Calendar', 'Kalender'],
    'st.cal_hint': ['فقط شکل نمایش تاریخ‌ها عوض می‌شود. چیزی از اطلاعات ثبت‌شده‌ی شما تغییر نمی‌کند.',
                    'Only the way dates are shown changes. Nothing you logged is touched.',
                    'Nur die Darstellung der Daten ändert sich. Nichts von dem, was du eingetragen hast, wird verändert.'],

    'lock.title': ['قفل برنامه', 'App lock', 'App-Sperre'],
    'lock.row': ['قفل با قفل گوشی', 'Lock with your phone’s screen lock', 'Mit der Displaysperre sperren'],
    'lock.desc': ['%APP% با Face ID، اثر انگشت یا رمز گوشی شما قفل می‌شود. این قفل فقط ورود به برنامه را می‌بندد؛ داده‌ها جدا از قفل برنامه، رمزگذاری‌شده روی دستگاه نگه داشته می‌شوند.',
                  '%APP% locks with Face ID, your fingerprint or your phone’s passcode. The lock only closes the way into the app; your data is kept encrypted on the device separately from this lock.',
                  '%APP% wird mit Face ID, Fingerabdruck oder dem Code deines Handys gesperrt. Die Sperre schließt nur den Zugang zur App; deine Daten liegen davon unabhängig verschlüsselt auf dem Gerät.'],
    'lock.none': ['این گوشی یا مرورگر قفل صفحه‌ی فعال ندارد یا از قفل برنامه پشتیبانی نمی‌کند. ابتدا در تنظیمات گوشی یک رمز، Face ID یا اثر انگشت فعال کنید.',
                  'This phone or browser has no active screen lock, or it does not support app lock. First turn on a passcode, Face ID or fingerprint in your phone settings.',
                  'Dieses Handy oder dieser Browser hat keine aktive Displaysperre oder unterstützt keine App-Sperre. Aktiviere zuerst in den Handy-Einstellungen einen Code, Face ID oder Fingerabdruck.'],
    'lock.on': ['قفل برنامه روشن شد', 'App lock is on', 'App-Sperre ist an'],
    'lock.off': ['قفل برنامه خاموش شد', 'App lock is off', 'App-Sperre ist aus'],
    'lock.fail': ['قفل فعال نشد. دوباره امتحان کنید.', 'Could not turn on the lock. Try again.', 'Die Sperre konnte nicht aktiviert werden. Versuche es erneut.'],
    'lock.off_fail': ['قفل خاموش نشد.', 'Could not turn the lock off.', 'Die Sperre konnte nicht ausgeschaltet werden.'],
    'lock.locked': ['%APP% قفل است', '%APP% is locked', '%APP% ist gesperrt'],
    'lock.unlock': ['باز کردن قفل', 'Unlock', 'Entsperren'],
    'lock.retry': ['قفل باز نشد. دوباره امتحان کنید.', 'Not unlocked. Try again.', 'Nicht entsperrt. Versuche es erneut.'],
    'lock.help': ['مشکل دارید؟', 'Trouble unlocking?', 'Probleme beim Entsperren?'],
    'lock.reset_t': ['قفل از نو راه‌اندازی شود؟', 'Reset the lock?', 'Sperre zurücksetzen?'],
    'lock.reset_d': ['اگر قفل گوشی عوض شده یا باز نمی‌شود، تنها راه برداشتن این قفل پاک‌کردن اطلاعات %APP% روی همین گوشی است. اگر پشتیبان دارید، بعداً می‌توانید بازیابی کنید.',
                     'If your phone’s lock changed or will not open, the only way to remove this lock is to erase %APP%’s data on this phone. If you have a backup, you can restore it afterwards.',
                     'Wenn sich die Sperre deines Handys geändert hat oder nicht aufgeht, lässt sich diese Sperre nur entfernen, indem die Daten von %APP% auf diesem Handy gelöscht werden. Hast du ein Backup, kannst du es danach wiederherstellen.'],
    'lock.reset_yes': ['پاک کردن و برداشتن قفل', 'Erase and remove lock', 'Löschen und Sperre entfernen'],

    'art.recommended': ['پیشنهاد برای امروز', 'Picked for today', 'Für heute ausgewählt'],
    'art.all': ['همه', 'All', 'Alle'],
    'art.saved': ['ذخیره‌شده‌ها', 'Saved', 'Gespeichert'],
    'art.search': ['جست‌وجو در مقاله‌ها', 'Search articles', 'Artikel durchsuchen'],
    'art.min': [function (n) { return num(n) + ' دقیقه مطالعه'; }, function (n) { return n + ' min read'; }, function (n) { return n + ' Min. Lesezeit'; }],
    'art.read_full': ['مشاهده‌ی کامل مقاله', 'Read the full article', 'Ganzen Artikel lesen'],
    'art.back': ['بازگشت به خلاصه', 'Back to summary', 'Zurück zur Zusammenfassung'],
    'art.save': ['ذخیره', 'Save', 'Speichern'],
    'art.unsave': ['برداشتن ذخیره', 'Remove from saved', 'Aus Gespeichert entfernen'],
    'art.sources': ['منابع', 'Sources', 'Quellen'],
    'art.updated': [function (d) { return 'آخرین بروزرسانی: ' + d; }, function (d) { return 'Last updated: ' + d; }, function (d) { return 'Zuletzt aktualisiert: ' + d; }],
    'art.loading': ['در حال بارگذاری…', 'Loading…', 'Wird geladen …'],
    'art.fail': ['مقاله باز نشد. اتصال اینترنت را بررسی کنید و دوباره امتحان کنید.',
                 'The article could not be opened. Check your connection and try again.',
                 'Der Artikel konnte nicht geöffnet werden. Prüfe deine Verbindung und versuche es erneut.'],
    'art.retry': ['تلاش دوباره', 'Try again', 'Erneut versuchen'],
    'art.none': ['مقاله‌ای پیدا نشد.', 'No articles found.', 'Keine Artikel gefunden.'],
    'art.none_saved': ['هنوز مقاله‌ای ذخیره نکرده‌اید.', 'You have not saved any articles yet.', 'Du hast noch keine Artikel gespeichert.'],
    'art.unavailable': ['مقاله‌ها هنوز بارگذاری نشده‌اند. یک بار برنامه را با اینترنت باز کنید تا برای استفاده‌ی آفلاین ذخیره شوند.',
                        'Articles have not loaded yet. Open the app once with an internet connection so they are saved for offline use.',
                        'Die Artikel sind noch nicht geladen. Öffne die App einmal mit Internetverbindung, damit sie für die Offline-Nutzung gespeichert werden.'],
    'art.why.symptom': ['برای علائم امروز', 'For today’s symptoms', 'Für deine Beschwerden heute'],
    'art.why.mood': ['برای حال امروز', 'For how you feel', 'Für deine Stimmung'],
    'art.why.phase': ['مناسب این مرحله', 'Fits this phase', 'Passt zu dieser Phase'],
    'art.disclaimer': ['این متن برای آگاهی است و جایگزین مشورت پزشک نیست.', 'This text is for information and is not a substitute for medical advice.', 'Dieser Text dient der Information und ersetzt keine ärztliche Beratung.'],
    'art.see_all': ['همه‌ی مقاله‌ها', 'All articles', 'Alle Artikel'],
    'h.recommended': ['مقاله‌ی پیشنهادی', 'Suggested read', 'Lesetipp'],
    'tips.read': ['مقاله‌ها', 'Articles', 'Artikel'],
    'tips.move': ['ورزش', 'Movement', 'Bewegung'],
    'wk.recommended': ['ورزش پیشنهادی برای امروز', 'Movement picked for today', 'Bewegung für heute'],
    'wk.library': ['برنامه‌های ورزشی', 'Workouts', 'Workouts'],
    'wk.all': ['همه', 'All', 'Alle'],
    'wk.kind.stretch': ['کششی', 'Stretching', 'Dehnen'],
    'wk.kind.yoga': ['یوگا', 'Yoga', 'Yoga'],
    'wk.kind.strength': ['قدرتی', 'Strength', 'Kraft'],
    'wk.kind.cardio': ['هوازی', 'Cardio', 'Ausdauer'],
    'wk.kind.mobility': ['تحرک', 'Mobility', 'Mobilität'],
    'wk.where.home': ['خانه', 'Home', 'Zuhause'],
    'wk.where.gym': ['باشگاه', 'Gym', 'Gym'],
    'wk.where.any': ['هرجا', 'Anywhere', 'Überall'],
    'wk.level.beginner': ['مبتدی', 'Beginner', 'Anfänger'],
    'wk.level.intermediate': ['متوسط', 'Intermediate', 'Fortgeschritten'],
    'wk.level.advanced': ['پیشرفته', 'Advanced', 'Profi'],
    'wk.min': [function (n) { return num(n) + ' دقیقه'; }, function (n) { return n + ' min'; }, function (n) { return n + ' Min.'; }],
    'wk.steps': ['حرکت‌ها', 'Exercises', 'Übungen'],
    'wk.tap': ['برای دیدن طرز انجام روی هر حرکت بزنید.', 'Tap an exercise to see how to do it.', 'Tippe auf eine Übung, um zu sehen, wie sie geht.'],
    'wk.how': ['طرز انجام', 'How to do it', 'So geht’s'],
    'wk.safety': ['این برنامه‌ها عمومی‌اند و جایگزین توصیه‌ی پزشک یا مربی نیستند. اگر درد شدید، سرگیجه یا ضعف دارید، ورزش را متوقف کنید.', 'These routines are general and no substitute for advice from a doctor or trainer. Stop if you feel severe pain, dizziness or weakness.', 'Diese Programme sind allgemein gehalten und ersetzen keinen ärztlichen oder trainerischen Rat. Hör bei starken Schmerzen, Schwindel oder Schwäche auf.'],
    'wk.loading': ['در حال بارگذاری…', 'Loading…', 'Wird geladen …'],
    'wk.fail': ['برنامه باز نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.', 'Could not open this workout. Check your connection and try again.', 'Das Workout ließ sich nicht öffnen. Prüfe die Verbindung und versuche es erneut.'],
    'wk.none': ['برنامه‌ای پیدا نشد.', 'No workouts found.', 'Keine Workouts gefunden.'],
    'wk.why.symptom': ['مناسب علائم امروز', 'Fits how you feel', 'Passt zu deinem Befinden'],
    'wk.why.phase': ['مناسب این روزهای چرخه', 'Suits this part of your cycle', 'Passt zu dieser Zyklusphase'],
    'wk.equipment': ['وسیله', 'Equipment', 'Ausrüstung'],

    'pain.btn': ['امروز درد دارم', 'I have pain today', 'Ich habe heute Schmerzen'],
    'pain.title': ['امروز چه دردی دارید؟', 'What hurts today?', 'Was tut dir heute weh?'],
    'pain.desc': ['انتخاب شما در ثبت امروز هم ذخیره می‌شود و مقاله‌های مفید را بالا می‌آورد.',
                  'Your choice is saved in today’s log too and brings up helpful articles.',
                  'Deine Auswahl wird auch im heutigen Eintrag gespeichert und bringt hilfreiche Artikel nach oben.'],
    'pain.for': ['مقاله‌های مفید برای امروز', 'Helpful reads for today', 'Hilfreiche Artikel für heute'],
    'pain.warn': ['اگر درد ناگهانی و شدید است یا با تب، غش یا خونریزی زیاد همراه است، فوراً به پزشک یا اورژانس مراجعه کنید.',
                  'If the pain is sudden and severe, or comes with fever, fainting or heavy bleeding, get medical help right away.',
                  'Sind die Schmerzen plötzlich und stark oder kommen Fieber, Ohnmacht oder starke Blutung dazu, such sofort ärztliche Hilfe.'],
    'pain.pick': ['برای دیدن مقاله‌ها، نوع درد را انتخاب کنید.', 'Pick what hurts to see articles.', 'Wähle aus, was weh tut, um Artikel zu sehen.']
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

  /* A short kind line for the home screen. One is picked per day (see I18N.kind). */
  var KIND = {
    menstrual: [
      { fa: 'امروز آروم‌تر باش عزیزم؛ یه نوشیدنی گرم و کمی استراحت لازم داری.', en: 'Take today a little slower. A warm drink and some rest are well deserved.', de: 'Geh den Tag etwas ruhiger an. Ein warmes Getränk und etwas Ruhe hast du dir verdient.' },
      { fa: 'اگه انرژیت کمه، طبیعیه عزیزم. بدنت داره کار مهمی انجام می‌ده.', en: 'If your energy is lower, that is normal; your body is doing important work.', de: 'Wenn du weniger Energie hast, ist das normal; dein Körper leistet gerade viel.' },
      { fa: 'امروز با خودت مهربون باش. هر کاری که از دستت بربیاد کافیه.', en: 'Be kind to yourself. Whatever you manage today is enough.', de: 'Sei lieb zu dir. Was immer du heute schaffst, ist genug.' }
    ],
    follicular: [
      { fa: 'انرژیت داره کم‌کم برمی‌گرده؛ وقت خوبیه برای یه شروع تازه.', en: 'Your energy is slowly rising, a good time to start something new.', de: 'Deine Energie steigt langsam – eine gute Zeit, etwas Neues zu beginnen.' },
      { fa: 'یه پیاده‌روی کوتاه می‌تونه روزت رو سبک‌تر کنه.', en: 'A short walk can make your day feel lighter.', de: 'Ein kurzer Spaziergang kann deinen Tag leichter machen.' },
      { fa: 'از حال بهترت لذت ببر و یه کم وقت بذار برای خودت.', en: 'Enjoy feeling a bit brighter today and give yourself some time.', de: 'Genieß es, dich heute etwas besser zu fühlen, und nimm dir Zeit für dich.' }
    ],
    fertile: [
      { fa: 'تو این روزها خیلی‌ها انرژی و حال اجتماعی بیشتری دارن؛ شاید تو هم همین‌طور باشی.', en: 'Many people feel more energetic and sociable around now.', de: 'Viele fühlen sich in diesen Tagen energiegeladener und kontaktfreudiger.' },
      { fa: 'به بدنت گوش بده عزیزم؛ هر کسی حال خودش رو داره.', en: 'Listen to your body; everyone feels different.', de: 'Hör auf deinen Körper; jeder fühlt sich anders.' },
      { fa: 'آب کافی بخور و برای خودت وقت بذار.', en: 'Drink enough water and make time for yourself.', de: 'Trink genug Wasser und nimm dir Zeit für dich.' }
    ],
    luteal: [
      { fa: 'ممکنه زودتر خسته بشی و اشکالی نداره؛ سرعتت رو با خودت تنظیم کن.', en: 'You may tire sooner. That is okay; adjust your pace.', de: 'Du wirst vielleicht schneller müde. Das ist okay; passe dein Tempo an.' },
      { fa: 'یه وعده‌ی مقوی و خواب خوب امشب حسابی کمکت می‌کنه.', en: 'A nourishing meal and enough sleep tonight will help.', de: 'Eine nahrhafte Mahlzeit und genug Schlaf heute Nacht helfen dir.' },
      { fa: 'اگه حال و هوات بالا پایین می‌شه، به چرخه‌ات ربط داره و موقتیه.', en: 'If your mood swings, it is linked to your cycle and it is temporary.', de: 'Wenn deine Stimmung schwankt, hängt das mit dem Zyklus zusammen und geht vorbei.' }
    ],
    pms: [
      { fa: 'پریودت نزدیکه. امروز با خودت مهربون باش و کارهای سنگین رو سبک کن عزیزم.', en: 'Your period is close. Be kind to yourself today and lighten the heavy tasks.', de: 'Deine Periode ist nah. Sei heute lieb zu dir und mach die schweren Aufgaben leichter.' },
      { fa: 'اگه حساس‌تر شدی تنها نیستی؛ تو این روزها خیلی‌ها همین حس رو دارن.', en: 'If you feel more sensitive, you are not alone; many people do around now.', de: 'Wenn du empfindlicher bist, bist du nicht allein; vielen geht es jetzt so.' },
      { fa: 'یه کم گرما، آب و استراحت؛ ساده‌ترین مراقبت برای امروز.', en: 'A little warmth, water and rest: the simplest care for today.', de: 'Etwas Wärme, Wasser und Ruhe: die einfachste Fürsorge für heute.' }
    ],
    late: [
      { fa: 'پریودت یه کم دیر کرده. چند روز جابه‌جایی تو چرخه پیش میاد؛ نگران نباش.', en: 'Your period is a little late. A few days of change in the cycle happens; try not to worry.', de: 'Deine Periode ist etwas verspätet. Ein paar Tage Abweichung kommen vor; mach dir nicht zu viele Sorgen.' },
      { fa: 'استرس و کم‌خوابی می‌تونه چرخه رو جابه‌جا کنه. به خودت فشار نیار.', en: 'Stress and little sleep can shift your cycle. Do not put pressure on yourself.', de: 'Stress und wenig Schlaf können den Zyklus verschieben. Setz dich nicht unter Druck.' },
      { fa: 'اگه دیرکرد ادامه پیدا کرد، یه بار با پزشک مشورت کن.', en: 'If the delay continues, talk to a doctor once.', de: 'Wenn die Verspätung anhält, sprich einmal mit einer Ärztin bzw. einem Arzt.' }
    ]
  };
  /* Daily messages written on the server replace the built-in ones for the keys that have any. */
  var SERVER_KIND = null;
  function setKind(map) { SERVER_KIND = map && typeof map === 'object' ? map : null; }
  function kind(key, day) {
    var a = (SERVER_KIND && SERVER_KIND[key] && SERVER_KIND[key].length) ? SERVER_KIND[key] : KIND[key];
    return a ? a[((day % a.length) + a.length) % a.length][lang] : '';
  }

  var MOODS = [['happy', '😊'], ['calm', '😌'], ['energetic', '🤩'], ['sensitive', '🥺'], ['irritable', '😠'], ['anxious', '😰'], ['sad', '😢']];
  var SYMPTOMS = [['cramps', '😖'], ['headache', '🤕'], ['bloating', '🎈'], ['backache', '💢'], ['breast', '🍒'],
                  ['acne', '🔴'], ['fatigue', '😴'], ['nausea', '🤢'], ['cravings', '🍫'], ['sleep', '🌙']];

  /* %APP% is the product name (Abra / Aurora / Abrora). Brand names are never translated. */
  function brand(s) { return typeof s === 'string' && s.indexOf('%APP%') >= 0 ? s.split('%APP%').join(root.Brand ? root.Brand.name() : 'Abra') : s; }
  function t(key) {
    var v = D[key];
    if (!v) return key;
    var s = v[IDX[lang]];
    if (typeof s === 'function') s = s.apply(null, Array.prototype.slice.call(arguments, 1));
    return brand(s);
  }
  function extend(map) { Object.keys(map).forEach(function (k) { D[k] = map[k]; }); }
  function pick(obj) { return obj[lang]; }

  /* Persian (Jalali) month names */
  var JMONTHS = {
    fa: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'],
    en: ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar', 'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'],
    de: ['Farwardin', 'Ordibehescht', 'Chordad', 'Tir', 'Mordad', 'Schahriwar', 'Mehr', 'Aban', 'Asar', 'Dei', 'Bahman', 'Esfand']
  };
  var cal = 'gregorian';
  function names(c) { return (c || cal) === 'jalali' ? JMONTHS : MONTHS; }
  function namesShort(c) { return (c || cal) === 'jalali' ? JMONTHS : MONTHS_S; }
  function dateParts(n, c) { return Cal.fromN(c || cal, n); }

  var fmt = {
    dayMonth: function (n, c) {
      var p = dateParts(n, c);
      if (lang === 'fa') return num(p.d) + ' ' + names(c).fa[p.m];
      if (lang === 'en') return namesShort(c).en[p.m] + ' ' + p.d;
      return p.d + '. ' + namesShort(c).de[p.m];
    },
    full: function (n, c) {
      var p = dateParts(n, c);
      if (lang === 'fa') return num(p.d) + ' ' + names(c).fa[p.m] + ' ' + num(p.y);
      if (lang === 'en') return namesShort(c).en[p.m] + ' ' + p.d + ', ' + p.y;
      return p.d + '. ' + namesShort(c).de[p.m] + ' ' + p.y;
    },
    weekdayLong: function (n, c) {
      var p = dateParts(n, c);
      var wd = WD[lang][p.wd];
      if (lang === 'fa') return wd + '، ' + num(p.d) + ' ' + names(c).fa[p.m];
      if (lang === 'en') return wd + ', ' + names(c).en[p.m] + ' ' + p.d;
      return wd + ', ' + p.d + '. ' + names(c).de[p.m];
    },
    monthYear: function (y, m, c) {
      return names(c)[lang][m] + ' ' + num(y);
    },
    monthOf: function (n, c) { return dateParts(n, c).m; }
  };

  root.I18N = {
    LANGS: LANGS,
    setLang: function (l) { if (IDX[l] !== undefined) lang = l; },
    getLang: function () { return lang; },
    isRTL: function () { return lang === 'fa'; },
    t: t, extend: extend, brand: brand, num: num, pick: pick, fmt: fmt,
    setCalendar: function (c) { cal = c === 'jalali' ? 'jalali' : 'gregorian'; },
    getCalendar: function () { return cal; },
    weekdayShort: function (wd) { return WD_S[lang][wd]; },
    monthShort: function (m, c) { return namesShort(c)[lang][m]; },
    weekdayName: function (wd) { return WD[lang][wd]; },
    kind: kind, setKind: setKind,
    TIPS: TIPS, MOODS: MOODS, SYMPTOMS: SYMPTOMS
  };
})(typeof self !== 'undefined' ? self : this);
