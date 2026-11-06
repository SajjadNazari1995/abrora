/* Abrora settings you may need to edit.
   googleClientId: the OAuth Client ID created in Google Cloud Console
   (see README-fa.txt, section "پشتیبان‌گیری ابری"). Leave empty to hide cloud backup. */
self.ABRORA_CONFIG = {
  googleClientId: '',
  /* Where the articles come from. 'content/' = the files inside this app (GitHub).
     When you move to your own server, put its address here (it must end with the same file layout). */
  contentBase: 'content/'
};
