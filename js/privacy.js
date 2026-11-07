/* Abrora — privacy text. One source for the in-app page and for privacy.html (built by tools/build-privacy.js),
   so the two can never disagree. Keep it true: change this file whenever the app starts doing something new with data. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Privacy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var UPDATED = '2026-11-06';
  var S = [
    { h: { fa: 'خلاصه', en: 'In short', de: 'Kurz gesagt' },
      p: { fa: 'اطلاعات چرخه‌ی شما فقط روی همین گوشی می‌ماند. ابرورا حساب کاربری، تبلیغ، ردیاب یا تحلیل‌گر ندارد و داده‌های سلامتی شما را به هیچ سروری نمی‌فرستد.',
           en: 'Your cycle data stays on this phone. Abrora has no accounts, no ads, no trackers and no analytics, and it never sends your health data to any server.',
           de: 'Deine Zyklusdaten bleiben auf diesem Handy. Abrora hat keine Konten, keine Werbung, keine Tracker und keine Analyse und sendet deine Gesundheitsdaten an keinen Server.' } },
    { h: { fa: 'چه چیزی ذخیره می‌شود؟', en: 'What is stored', de: 'Was gespeichert wird' },
      p: { fa: 'تاریخ‌های پریود، علائم، خلق‌وخو، درد، یادداشت‌ها، اسم شما و تنظیمات برنامه. همه فقط در حافظه‌ی همین دستگاه (برنامه یا مرورگر) نگه داشته می‌شود.',
           en: 'Period dates, symptoms, mood, pain, notes, your name and the app’s settings. All of it is kept only in this device’s storage (the app or the browser).',
           de: 'Perioden-Daten, Beschwerden, Stimmung, Schmerzen, Notizen, dein Name und die App-Einstellungen. Alles wird nur im Speicher dieses Geräts (App oder Browser) gehalten.' } },
    { h: { fa: 'ارتباط با سرور', en: 'Contact with our server', de: 'Verbindung zu unserem Server' },
      p: { fa: 'برنامه مقاله‌ها، برنامه‌های ورزشی، پیام‌ها و فونت‌ها را از سرور ما دانلود می‌کند. مثل هر وب‌سایت، سرور هنگام این دانلود آدرس IP شما را می‌بیند؛ اما هیچ‌یک از داده‌های چرخه یا اسم شما فرستاده نمی‌شود.',
           en: 'The app downloads articles, workouts, messages and fonts from our server. Like any website, the server sees your IP address during that download, but none of your cycle data or your name is sent.',
           de: 'Die App lädt Artikel, Workouts, Nachrichten und Schriften von unserem Server. Wie bei jeder Website sieht der Server dabei deine IP-Adresse, aber keine deiner Zyklusdaten und nicht dein Name werden gesendet.' } },
    { h: { fa: 'پشتیبان‌گیری با Google Drive (اختیاری)', en: 'Google Drive backup (optional)', de: 'Google-Drive-Backup (optional)' },
      p: { fa: 'فقط اگر خودتان وصل کنید، یک فایل کوچک در پوشه‌ی پنهان برنامه در Drive شما ذخیره می‌شود که فقط ابرورا می‌بیند و در فهرست فایل‌های Drive نیست. با دکمه‌ی قطع اتصال می‌توانید هر زمان آن را قطع و پاک کنید. این بخش تابع سیاست حریم خصوصی Google است.',
           en: 'Only if you connect it yourself, one small file is stored in Abrora’s hidden app folder in your Google Drive. Only Abrora can see it and it does not appear in your Drive files. You can disconnect and delete it at any time. This part is covered by Google’s privacy policy.',
           de: 'Nur wenn du es selbst verbindest, wird eine kleine Datei im versteckten App-Ordner deines Google Drive gespeichert. Nur Abrora kann sie sehen, sie erscheint nicht in deinen Drive-Dateien. Du kannst jederzeit trennen und löschen. Dieser Teil unterliegt der Datenschutzerklärung von Google.' } },
    { h: { fa: 'قفل برنامه', en: 'App lock', de: 'App-Sperre' },
      p: { fa: 'قفل از قفل خود دستگاه (Face ID، اثر انگشت یا رمز) استفاده می‌کند و اطلاعات بیومتریک به ابرورا داده نمی‌شود. قفل فقط جلوی دیده‌شدن صفحه را می‌گیرد؛ داده‌ها رمزنگاری نمی‌شوند.',
           en: 'The lock uses your device’s own lock (Face ID, fingerprint or passcode); Abrora never receives biometric data. It only hides the screen; the data itself is not encrypted.',
           de: 'Die Sperre nutzt die Gerätesperre (Face ID, Fingerabdruck oder Code); Abrora erhält keine biometrischen Daten. Sie verdeckt nur den Bildschirm; die Daten selbst sind nicht verschlüsselt.' } },
    { h: { fa: 'کنترل با خودتان است', en: 'You are in control', de: 'Du hast die Kontrolle' },
      p: { fa: 'هر زمان می‌توانید از تنظیمات یک فایل پشتیبان بگیرید یا همه‌ی اطلاعات این گوشی را پاک کنید. حذف برنامه هم اطلاعات محلی را پاک می‌کند.',
           en: 'In Settings you can save a backup file or erase everything on this phone at any time. Uninstalling the app also removes the local data.',
           de: 'In den Einstellungen kannst du jederzeit eine Sicherungsdatei speichern oder alles auf diesem Handy löschen. Auch das Deinstallieren der App entfernt die lokalen Daten.' } },
    { h: { fa: 'یادآوری مهم', en: 'Important', de: 'Wichtig' },
      p: { fa: 'ابرورا یک ابزار ثبت و اطلاع‌رسانی است، نه وسیله‌ی پزشکی. پیش‌بینی‌ها تخمینی‌اند و برای پیشگیری از بارداری قابل اتکا نیستند. برای هر نگرانی با پزشک صحبت کنید.',
           en: 'Abrora is a tracking and information tool, not a medical device. Predictions are estimates and cannot be relied on to prevent pregnancy. Talk to a doctor about any concern.',
           de: 'Abrora ist ein Hilfsmittel zum Eintragen und Informieren, kein Medizinprodukt. Vorhersagen sind Schätzungen und nicht zur Verhütung geeignet. Sprich bei Sorgen mit einer Ärztin bzw. einem Arzt.' } }
  ];
  var TITLE = { fa: 'حریم خصوصی', en: 'Privacy', de: 'Datenschutz' };
  var WHO = { fa: 'ارائه‌دهنده: Nazari Technologies', en: 'Provider: Nazari Technologies', de: 'Anbieter: Nazari Technologies' };
  var UP = { fa: 'آخرین به‌روزرسانی', en: 'Last updated', de: 'Zuletzt aktualisiert' };
  return { sections: S, title: TITLE, who: WHO, updatedLabel: UP, updated: UPDATED };
});
