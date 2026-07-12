export const translations = {
  English: {
    // AuthGate
    "auth.command": "Command the Chain",
    "auth.google": "Continue with Google",
    "auth.metamask": "Continue with MetaMask",
    "auth.guest": "Continue without account",
    "auth.byContinuing": "By continuing, you acknowledge Bugglo's",
    "auth.privacy": "Privacy Policy",
    "auth.terms": "Terms of Service",
    
    // Sidebar
    "sidebar.newChat": "New Chat",
    "sidebar.recent": "RECENT",
    "sidebar.suggested": "SUGGESTED",
    "sidebar.sentiment": "SENTIMENT",
    "sidebar.market": "MARKET",
    "sidebar.theme": "Theme",
    "sidebar.incognito": "Incognito mode",
    "sidebar.demo": "Demo mode",
    
    // HoodScopeApp
    "app.incognitoTitle": "You're incognito",
    "app.incognitoDesc1": "Incognito chats aren't saved to history or used to train models.",
    "app.incognitoDesc2": "about how your data is used.",
    "app.learnMore": "Learn more",
    "app.heroSub1": "What's moving on",
    "app.heroSub2": "Robinhood Chain",
    "app.tryThese": "Try one of these",
    "app.shareX": "Share a Robinhood Chain question on 𝕏",
    "app.infoWarning": "Information provided may be inaccurate or incorrect.",
    "app.byMessaging": "By messaging Bugglo, you agree to our",
    
    // InputBar
    "input.placeholder": "What do you want to know? ( / for commands )",
    
    // SettingsModal
    "settings.title": "Settings",
    "settings.sub": "Connect Bugglo to a live backend (Claude API + robinx-mcp) or run in demo mode.",
    "settings.backendUrl": "BACKEND URL",
    "settings.backendPlaceholder": "https://my-backend.example.com — leave empty for this Next.js app",
    "settings.status": "STATUS",
    "settings.status.live": "Live data — answers are coming from Claude plus RobinX MCP.",
    "settings.status.ready": "Live ready — backend is configured and waiting for a chat request.",
    "settings.status.offline": "Backend unreachable — the browser is using the built-in demo agent.",
    "settings.status.demo": "Demo mode — /api/chat is reachable but live credentials are not configured.",
    "settings.theme": "THEME",
    "settings.language": "LANGUAGE",
    "settings.clearChats": "Clear all chats",
    "settings.close": "Close",
    "settings.save": "Save & test"
  },
  Indonesian: {
    // AuthGate
    "auth.command": "Kuasai Jaringan",
    "auth.google": "Lanjutkan dengan Google",
    "auth.metamask": "Lanjutkan dengan MetaMask",
    "auth.guest": "Lanjutkan tanpa akun",
    "auth.byContinuing": "Dengan melanjutkan, Anda menyetujui",
    "auth.privacy": "Kebijakan Privasi",
    "auth.terms": "Ketentuan Layanan",
    
    // Sidebar
    "sidebar.newChat": "Obrolan Baru",
    "sidebar.recent": "TERBARU",
    "sidebar.suggested": "DISARANKAN",
    "sidebar.sentiment": "SENTIMEN",
    "sidebar.market": "PASAR",
    "sidebar.theme": "Tema",
    "sidebar.incognito": "Mode rahasia",
    "sidebar.demo": "Mode demo",
    
    // HoodScopeApp
    "app.incognitoTitle": "Mode Rahasia Aktif",
    "app.incognitoDesc1": "Obrolan rahasia tidak disimpan atau digunakan untuk melatih model.",
    "app.incognitoDesc2": "tentang penggunaan data Anda.",
    "app.learnMore": "Pelajari selengkapnya",
    "app.heroSub1": "Apa yang sedang tren di",
    "app.heroSub2": "Robinhood Chain",
    "app.tryThese": "Coba salah satu ini",
    "app.shareX": "Bagikan pertanyaan Robinhood Chain di 𝕏",
    "app.infoWarning": "Informasi yang diberikan mungkin tidak akurat atau salah.",
    "app.byMessaging": "Dengan mengirim pesan ke Bugglo, Anda menyetujui",
    
    // InputBar
    "input.placeholder": "Apa yang ingin Anda ketahui? ( / untuk perintah )",
    
    // SettingsModal
    "settings.title": "Pengaturan",
    "settings.sub": "Hubungkan Bugglo ke backend live (Claude API + robinx-mcp) atau jalankan mode demo.",
    "settings.backendUrl": "URL BACKEND",
    "settings.backendPlaceholder": "https://backend-saya.example.com — kosongkan untuk aplikasi Next.js ini",
    "settings.status": "STATUS",
    "settings.status.live": "Data langsung — jawaban berasal dari Claude dan RobinX MCP.",
    "settings.status.ready": "Siap — backend terkonfigurasi dan menunggu permintaan.",
    "settings.status.offline": "Backend tidak terjangkau — peramban menggunakan agen demo bawaan.",
    "settings.status.demo": "Mode demo — /api/chat dapat diakses tetapi kredensial live tidak diatur.",
    "settings.theme": "TEMA",
    "settings.language": "BAHASA",
    "settings.clearChats": "Hapus semua obrolan",
    "settings.close": "Tutup",
    "settings.save": "Simpan & tes"
  }
};

export function getTranslation(lang, key) {
  const dictionary = translations[lang] || translations["English"];
  return dictionary[key] || key;
}
