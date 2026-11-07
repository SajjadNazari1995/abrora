/* Abra — legal texts (Privacy Policy + Terms of Use). One source for the in-app screens, the first-run consent gate and
   privacy.html (built by tools/build-privacy.js), so they can never disagree. Keep it true: change this file whenever the app
   does something new with data, and bump VERSION (a new VERSION makes everyone accept again).
   DRAFT: written for the product as built; it still needs a lawyer's review before public launch. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Privacy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var VERSION = "2026-11-07";
  var PRIVACY = [
 {
  "h": {
   "fa": "خلاصه",
   "en": "In short",
   "de": "Kurz gesagt"
  },
  "p": {
   "fa": "اطلاعات چرخه‌ی شما (تاریخ‌ها، علائم، خلق‌وخو، یادداشت‌ها) روی همین دستگاه و به‌صورت رمزشده نگه داشته می‌شود. حساب کاربری فقط برای ورود و تنظیمات حساب است و داده‌های سلامتی شما را به سرور ما نمی‌فرستد. تبلیغ و ردیاب تبلیغاتی وجود ندارد.",
   "en": "Your cycle information (dates, symptoms, mood, notes) is kept on this device, encrypted. An account is only for signing in and for account settings; it does not send your health data to our server. There are no ads and no advertising trackers.",
   "de": "Deine Zyklusdaten (Daten, Beschwerden, Stimmung, Notizen) bleiben verschlüsselt auf diesem Gerät. Ein Konto dient nur der Anmeldung und den Kontoeinstellungen und sendet deine Gesundheitsdaten nicht an unseren Server. Es gibt keine Werbung und keine Werbe-Tracker."
  }
 },
 {
  "h": {
   "fa": "چه کسی مسئول است؟",
   "en": "Who is responsible",
   "de": "Wer verantwortlich ist"
  },
  "p": {
   "fa": "این برنامه را Nazari Technologies می‌سازد و اداره می‌کند و مسئول پردازش داده‌های حساب شما است. راه تماس در بخش «درباره» و در صفحه‌ی برنامه آمده است.",
   "en": "This app is built and operated by Nazari Technologies, which is responsible for processing your account data. Contact details are in the About section and on the app’s website.",
   "de": "Diese App wird von Nazari Technologies entwickelt und betrieben; das Unternehmen ist für die Verarbeitung deiner Kontodaten verantwortlich. Kontaktdaten findest du unter „Über uns“ und auf der Website der App."
  }
 },
 {
  "h": {
   "fa": "داده‌ی سلامتی روی دستگاه",
   "en": "Health data on your device",
   "de": "Gesundheitsdaten auf deinem Gerät"
  },
  "p": {
   "fa": "تاریخ‌های پریود، علائم، خلق‌وخو، درد و یادداشت‌ها فقط در حافظه‌ی همین دستگاه ذخیره می‌شوند و با کلیدی رمز می‌شوند که از دستگاه بیرون نمی‌رود. این رمزگذاری جلوی خوانده‌شدن ساده‌ی فایل‌های ذخیره‌شده را می‌گیرد؛ جایگزین قفل صفحه‌ی گوشی شما نیست. اگر مرورگر یا دستگاه از رمزگذاری پشتیبانی نکند، برنامه کار می‌کند ولی داده بدون رمزگذاری می‌ماند و در تنظیمات به شما گفته می‌شود.",
   "en": "Period dates, symptoms, mood, pain and notes are stored only in this device’s storage and are encrypted with a key that never leaves the device. This stops stored files from being read casually; it does not replace your phone’s screen lock. If a browser or device cannot encrypt, the app still works but the data stays unencrypted, and Settings tells you so.",
   "de": "Perioden-Daten, Beschwerden, Stimmung, Schmerzen und Notizen werden nur im Speicher dieses Geräts abgelegt und mit einem Schlüssel verschlüsselt, der das Gerät nie verlässt. Das verhindert, dass gespeicherte Dateien beiläufig gelesen werden; es ersetzt nicht die Bildschirmsperre deines Handys. Kann ein Browser oder Gerät nicht verschlüsseln, funktioniert die App weiter, die Daten bleiben aber unverschlüsselt – das zeigen die Einstellungen an."
  }
 },
 {
  "h": {
   "fa": "داده‌های حساب روی سرور",
   "en": "Account data on our server",
   "de": "Kontodaten auf unserem Server"
  },
  "p": {
   "fa": "اگر وارد حساب شوید، این موارد روی سرور ما ذخیره می‌شود: ایمیل (یا شناسه‌ی ورود Google/Apple)، رمز عبور به‌صورت هش‌شده، زبان و تقویم دلخواه، فهرست دستگاه‌های وارد‌شده، نشست‌های ورود و سابقه‌ی موافقت‌ها با متن شرایط. داده‌ی سلامتی در این فهرست نیست.",
   "en": "If you sign in, our server stores: your e-mail (or Google/Apple sign-in identifier), your password as a hash, your preferred language and calendar, the list of signed-in devices, login sessions, and the record of which terms you accepted. Health data is not in this list.",
   "de": "Wenn du dich anmeldest, speichert unser Server: deine E-Mail (oder Google-/Apple-Kennung), dein Passwort als Hash, bevorzugte Sprache und Kalender, die Liste angemeldeter Geräte, Anmelde-Sitzungen und den Nachweis, welchen Bedingungen du zugestimmt hast. Gesundheitsdaten gehören nicht dazu."
  }
 },
 {
  "h": {
   "fa": "موافقت‌ها",
   "en": "Consent records",
   "de": "Einwilligungen"
  },
  "p": {
   "fa": "وقتی شرایط استفاده و حریم خصوصی را می‌پذیرید، نسخه‌ی متن، زبان و زمان پذیرش ثبت می‌شود تا بتوانیم نشان دهیم چه چیزی را پذیرفته‌اید و هنگام تغییر متن دوباره از شما بپرسیم. این سابقه پس از حذف حساب بدون ایمیل و شناسه‌ی شما و فقط برای اثبات قانونی نگه داشته می‌شود.",
   "en": "When you accept the Terms and this Privacy Policy, we record the text version, the language and the time, so we can show what you accepted and ask again when the text changes. After you delete your account this record is kept without your e-mail or identifiers, only as legal proof.",
   "de": "Wenn du Nutzungsbedingungen und Datenschutzerklärung akzeptierst, speichern wir Textversion, Sprache und Zeitpunkt, um nachweisen zu können, was du akzeptiert hast, und bei Änderungen erneut zu fragen. Nach der Kontolöschung wird dieser Nachweis ohne E-Mail und Kennungen nur als rechtlicher Beleg aufbewahrt."
  }
 },
 {
  "h": {
   "fa": "اتصال به سرور",
   "en": "Contact with our servers",
   "de": "Verbindung zu unseren Servern"
  },
  "p": {
   "fa": "برنامه مقاله‌ها، برنامه‌های ورزشی، پیام‌ها و فونت‌ها را از سرور ما می‌گیرد. مثل هر وب‌سایت، سرور هنگام این دانلود آدرس IP شما را می‌بیند. هیچ داده‌ی چرخه یا اسمی همراه آن فرستاده نمی‌شود. برای محافظت از ورود، تعداد تلاش‌های ورود به‌طور موقت شمرده می‌شود.",
   "en": "The app downloads articles, workouts, messages and fonts from our server. Like any website, the server sees your IP address during that download. No cycle data or name is sent with it. To protect sign-in, login attempts are counted temporarily.",
   "de": "Die App lädt Artikel, Workouts, Nachrichten und Schriften von unserem Server. Wie bei jeder Website sieht der Server dabei deine IP-Adresse. Es werden keine Zyklusdaten oder Namen mitgesendet. Zum Schutz der Anmeldung werden Anmeldeversuche vorübergehend gezählt."
  }
 },
 {
  "h": {
   "fa": "پشتیبان‌گیری اختیاری",
   "en": "Optional backup",
   "de": "Optionales Backup"
  },
  "p": {
   "fa": "اگر خودتان وصل کنید، یک نسخه‌ی پشتیبان در بخش پنهان Google Drive خودتان ذخیره می‌شود که فقط همین برنامه می‌بیند. با قطع اتصال می‌توانید آن را پاک کنید. این بخش تابع سیاست حریم خصوصی Google است.",
   "en": "Only if you connect it yourself, a backup is kept in the hidden app area of your own Google Drive, visible only to this app. You can disconnect and delete it at any time. This part is covered by Google’s privacy policy.",
   "de": "Nur wenn du es selbst verbindest, liegt ein Backup im versteckten App-Bereich deines eigenen Google Drive, sichtbar nur für diese App. Du kannst es jederzeit trennen und löschen. Dieser Teil unterliegt der Datenschutzerklärung von Google."
  }
 },
 {
  "h": {
   "fa": "حذف حساب و داده",
   "en": "Deleting your account and data",
   "de": "Konto und Daten löschen"
  },
  "p": {
   "fa": "در تنظیمات می‌توانید حساب را حذف کنید. سرور فوراً حساب، ایمیل، رمز، نشست‌ها و دستگاه‌ها را پاک می‌کند و برنامه داده‌ی همین دستگاه را پاک می‌کند. نسخه‌های پشتیبان سرور طبق چرخه‌ی خود (حدود ۳۵ روز) از بین می‌روند. دستگاه‌های دیگر در اولین ارتباط پاک می‌شوند. فایل‌هایی که خودتان خروجی گرفته‌اید از راه دور پاک نمی‌شوند.",
   "en": "You can delete your account in Settings. The server immediately erases the account, e-mail, password, sessions and devices, and the app erases the data on this device. Server backups disappear on their own rotation (about 35 days). Other devices erase on their next contact. Files you exported yourself cannot be erased remotely.",
   "de": "In den Einstellungen kannst du dein Konto löschen. Der Server löscht sofort Konto, E-Mail, Passwort, Sitzungen und Geräte, und die App löscht die Daten auf diesem Gerät. Server-Backups verschwinden im eigenen Turnus (etwa 35 Tage). Andere Geräte löschen beim nächsten Kontakt. Von dir exportierte Dateien lassen sich nicht aus der Ferne löschen."
  }
 },
 {
  "h": {
   "fa": "حقوق شما",
   "en": "Your rights",
   "de": "Deine Rechte"
  },
  "p": {
   "fa": "می‌توانید درباره‌ی داده‌های حساب خود دسترسی، اصلاح، حذف و محدودسازی بخواهید و رضایت را پس بگیرید. بیشتر این کارها مستقیم در برنامه ممکن است؛ برای بقیه با ما تماس بگیرید.",
   "en": "You may ask for access, correction, deletion and restriction of your account data, and withdraw consent. Most of this works directly in the app; for the rest, contact us.",
   "de": "Du kannst Auskunft, Berichtigung, Löschung und Einschränkung deiner Kontodaten verlangen und Einwilligungen widerrufen. Das meiste geht direkt in der App; für den Rest melde dich bei uns."
  }
 },
 {
  "h": {
   "fa": "تغییرات",
   "en": "Changes",
   "de": "Änderungen"
  },
  "p": {
   "fa": "اگر این متن تغییر کند، نسخه‌ی تازه نمایش داده می‌شود و پیش از ادامه باید دوباره آن را بپذیرید.",
   "en": "If this text changes, the new version is shown and you must accept it again before continuing.",
   "de": "Ändert sich dieser Text, wird die neue Fassung angezeigt und du musst sie vor dem Weitermachen erneut akzeptieren."
  }
 }
];
  var TERMS = [
 {
  "h": {
   "fa": "پذیرش شرایط",
   "en": "Accepting these terms",
   "de": "Annahme der Bedingungen"
  },
  "p": {
   "fa": "با استفاده از این برنامه و ایجاد حساب، این شرایط را می‌پذیرید. اگر نمی‌پذیرید، از برنامه استفاده نکنید.",
   "en": "By using this app and creating an account you accept these terms. If you do not accept them, please do not use the app.",
   "de": "Mit der Nutzung der App und dem Anlegen eines Kontos akzeptierst du diese Bedingungen. Wenn du nicht einverstanden bist, nutze die App bitte nicht."
  }
 },
 {
  "h": {
   "fa": "برنامه چیست؟",
   "en": "What the app is",
   "de": "Was die App ist"
  },
  "p": {
   "fa": "این برنامه ثبت و تخمین چرخه‌ی قاعدگی است. همه‌ی پیش‌بینی‌ها تخمین هستند، نه قطعیت. برنامه روش پیشگیری از بارداری نیست، برای تشخیص یا درمان پزشکی ساخته نشده و جایگزین پزشک نیست. در صورت درد شدید، خونریزی غیرعادی یا نگرانی، با پزشک تماس بگیرید.",
   "en": "This app records and estimates the menstrual cycle. All predictions are estimates, not certainty. It is not a method of contraception, is not made for medical diagnosis or treatment, and does not replace a doctor. With severe pain, unusual bleeding or any worry, contact a doctor.",
   "de": "Diese App erfasst und schätzt den Menstruationszyklus. Alle Vorhersagen sind Schätzungen, keine Gewissheit. Sie ist kein Verhütungsmittel, nicht für Diagnose oder Behandlung gedacht und ersetzt keine Ärztin und keinen Arzt. Bei starken Schmerzen, ungewöhnlichen Blutungen oder Sorgen wende dich an eine Ärztin oder einen Arzt."
  }
 },
 {
  "h": {
   "fa": "حساب شما",
   "en": "Your account",
   "de": "Dein Konto"
  },
  "p": {
   "fa": "اطلاعات درست وارد کنید، رمز و دسترسی حساب را محرمانه نگه دارید و اگر فکر می‌کنید کسی به حساب دسترسی یافته، از تنظیمات از همه‌ی دستگاه‌ها خارج شوید. شما مسئول فعالیت‌هایی هستید که با حساب شما انجام می‌شود.",
   "en": "Give correct details, keep your password and access private, and if you think someone gained access, sign out of all devices in Settings. You are responsible for activity done with your account.",
   "de": "Gib korrekte Angaben an, halte Passwort und Zugang geheim und melde dich in den Einstellungen von allen Geräten ab, wenn du glaubst, jemand habe Zugriff erlangt. Du bist für Aktivitäten mit deinem Konto verantwortlich."
  }
 },
 {
  "h": {
   "fa": "داده‌های شما",
   "en": "Your data",
   "de": "Deine Daten"
  },
  "p": {
   "fa": "داده‌های سلامتی شما متعلق به شما است و روی دستگاه شما می‌ماند. شما با پشتیبان‌گیری و خروجی گرفتن از آن مسئول نگه‌داری نسخه‌هاید. شرح کامل در سیاست حریم خصوصی آمده است.",
   "en": "Your health data belongs to you and stays on your device. You are responsible for keeping the backups and exports you make. The privacy policy describes this in full.",
   "de": "Deine Gesundheitsdaten gehören dir und bleiben auf deinem Gerät. Für Backups und Exporte, die du anlegst, bist du selbst verantwortlich. Die Datenschutzerklärung beschreibt das ausführlich."
  }
 },
 {
  "h": {
   "fa": "استفاده‌ی درست",
   "en": "Fair use",
   "de": "Faire Nutzung"
  },
  "p": {
   "fa": "از برنامه برای آسیب به دیگران، دور زدن امنیت، آزمودن سرور بدون اجازه یا ساختن حساب‌های جعلی استفاده نکنید. ممکن است حسابی را که امنیت را به خطر بیندازد، مسدود کنیم.",
   "en": "Do not use the app to harm others, bypass security, probe the server without permission or create fake accounts. We may suspend an account that endangers security.",
   "de": "Nutze die App nicht, um anderen zu schaden, Sicherheit zu umgehen, den Server ohne Erlaubnis zu testen oder gefälschte Konten anzulegen. Ein Konto, das die Sicherheit gefährdet, können wir sperren."
  }
 },
 {
  "h": {
   "fa": "محتوا و مقاله‌ها",
   "en": "Content and articles",
   "de": "Inhalte und Artikel"
  },
  "p": {
   "fa": "مقاله‌ها و پیام‌ها برای آگاهی عمومی هستند و توصیه‌ی پزشکی شخصی نیستند. با اینکه سعی می‌کنیم درست باشند، ممکن است تغییر کنند یا ناقص باشند.",
   "en": "Articles and messages are general information, not personal medical advice. We try to keep them accurate, but they may change or be incomplete.",
   "de": "Artikel und Hinweise sind allgemeine Informationen, keine persönliche medizinische Beratung. Wir bemühen uns um Richtigkeit, sie können sich aber ändern oder unvollständig sein."
  }
 },
 {
  "h": {
   "fa": "دسترسی و به‌روزرسانی",
   "en": "Availability and updates",
   "de": "Verfügbarkeit und Updates"
  },
  "p": {
   "fa": "برنامه «همان‌طور که هست» عرضه می‌شود و ممکن است گاهی در دسترس نباشد. نسخه‌های تازه ممکن است برای ادامه‌ی کار لازم شوند. بخش‌های بدون اینترنت روی دستگاه همچنان کار می‌کنند.",
   "en": "The app is provided “as is” and may sometimes be unavailable. New versions may become necessary to continue. Offline parts on your device keep working.",
   "de": "Die App wird „wie sie ist“ bereitgestellt und kann zeitweise nicht verfügbar sein. Neue Versionen können zum Weiterarbeiten nötig werden. Offline-Teile auf deinem Gerät funktionieren weiter."
  }
 },
 {
  "h": {
   "fa": "حذف حساب",
   "en": "Deleting your account",
   "de": "Konto löschen"
  },
  "p": {
   "fa": "هر زمان می‌توانید حساب را از تنظیمات حذف کنید. حذف کامل شرح داده‌شده در سیاست حریم خصوصی انجام می‌شود.",
   "en": "You can delete your account in Settings at any time. Deletion happens as described in the privacy policy.",
   "de": "Du kannst dein Konto jederzeit in den Einstellungen löschen. Die Löschung erfolgt wie in der Datenschutzerklärung beschrieben."
  }
 },
 {
  "h": {
   "fa": "مسئولیت",
   "en": "Liability",
   "de": "Haftung"
  },
  "p": {
   "fa": "تا حدی که قانون اجازه می‌دهد، Nazari Technologies برای تصمیم‌هایی که تنها بر پایه‌ی تخمین‌های برنامه گرفته شود مسئول نیست. این بند حقوق قانونی غیرقابل‌چشم‌پوشی شما را کم نمی‌کند.",
   "en": "To the extent the law allows, Nazari Technologies is not liable for decisions made only on the basis of the app’s estimates. This does not reduce legal rights you cannot waive.",
   "de": "Soweit gesetzlich zulässig, haftet Nazari Technologies nicht für Entscheidungen, die allein auf den Schätzungen der App beruhen. Unverzichtbare gesetzliche Rechte bleiben unberührt."
  }
 },
 {
  "h": {
   "fa": "تغییر شرایط",
   "en": "Changes",
   "de": "Änderungen"
  },
  "p": {
   "fa": "اگر شرایط تغییر کند، نسخه‌ی تازه نمایش داده می‌شود و برای ادامه باید دوباره بپذیرید.",
   "en": "If the terms change, the new version is shown and you must accept it again to continue.",
   "de": "Ändern sich die Bedingungen, wird die neue Fassung angezeigt und du musst sie zum Weitermachen erneut akzeptieren."
  }
 }
];
  var TITLES = {
    privacy: { fa: 'سیاست حریم خصوصی', en: 'Privacy Policy', de: 'Datenschutzerklärung' },
    terms: { fa: 'شرایط استفاده', en: 'Terms of Use', de: 'Nutzungsbedingungen' }
  };
  var WHO = { fa: 'Nazari Technologies', en: 'Nazari Technologies', de: 'Nazari Technologies' };
  var UPDATED_LABEL = { fa: 'آخرین به‌روزرسانی', en: 'Last updated', de: 'Zuletzt aktualisiert' };
  return {
    VERSION: VERSION,
    docs: { terms: { id: 'terms', version: VERSION, title: TITLES.terms, sections: TERMS }, privacy: { id: 'privacy', version: VERSION, title: TITLES.privacy, sections: PRIVACY } },
    REQUIRED: ['terms', 'privacy'],
    /* backward-compatible shape used by tools/build-privacy.js and the in-app privacy page */
    sections: PRIVACY, title: TITLES.privacy, who: WHO, updated: VERSION, updatedLabel: UPDATED_LABEL
  };
});
