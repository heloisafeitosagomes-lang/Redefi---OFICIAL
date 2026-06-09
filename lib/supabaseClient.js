// lib/supabaseClient.js
// Inicializa o cliente Supabase com sessão persistente via localStorage.
// A sessão SÓ termina quando o usuário chama signOut() manualmente.
(async () => {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      console.error('[Supabase] Config ausente. Certifique-se de que supabase-config.js carrega antes.');
      return;
    }
    window.supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: {
        persistSession:   true,          // mantém sessão entre recarregamentos
        autoRefreshToken: true,          // renova o token automaticamente
        storageKey:       'redefi-auth', // chave no localStorage
        // Força uso do localStorage — sessão sobrevive ao fechar o browser
        storage: {
          getItem:    (key) => window.localStorage.getItem(key),
          setItem:    (key, value) => window.localStorage.setItem(key, value),
          removeItem: (key) => window.localStorage.removeItem(key)
        },
        flowType:         'pkce',
        detectSessionInUrl: true  // captura token após redirecionamento OAuth
      }
    });
    console.info('[Supabase] Cliente inicializado.');
  } catch (err) {
    console.error('[Supabase] Falha na inicialização:', err);
  }
})();
