/* Abra settings you may need to edit.
   googleClientId: the OAuth Client ID created in Google Cloud Console
   (see README-fa.txt, section "پشتیبان‌گیری ابری"). Leave empty to hide cloud backup. */
self.ABRORA_CONFIG = {
  /* The Abra Core API (accounts, consent, release/legal). Example: 'https://abraapi.nazaritechnologies.com'. Leave '' until it is deployed:
     the app then works on this device only and explains it on the sign-in screen. */
  coreApi: '',
  appleClientId: '',
  googleClientId: '',
  /* Where the articles come from. 'content/' = the files inside this app (GitHub).
     When you move to your own server, put its address here (it must end with the same file layout). */
  contentBase: 'content/',
  /* Your own server (the WordPress plugin "Abrora Content API"). The app asks it first; if it cannot be reached,
     it uses contentBase above, so the app always has articles. Leave '' to use only the files inside the app. */
  contentApi: 'https://abroraapi.nazaritechnologies.com/wp-json/abrora/v1/'
};
