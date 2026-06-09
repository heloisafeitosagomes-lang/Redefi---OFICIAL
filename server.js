const express  = require('express');
const cors     = require('cors');
const dotenv   = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

/* ── Supabase admin ── */
const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Redefi] Variáveis SUPABASE ausentes. Verifique .env.local');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

/* ── Resend ── */
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail    = process.env.RESEND_FROM_EMAIL || 'Redefi <onboarding@resend.dev>';
const resend       = resendApiKey ? new Resend(resendApiKey) : null;
if (!resend) console.warn('[Redefi] RESEND_API_KEY não encontrado — envio de e-mails desativado.');

/* ── Stores em memória ── */
const otpStore   = new Map(); // cadastro
const resetStore = new Map(); // redefinição de senha

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpStore)   if (v.expiresAt < now) otpStore.delete(k);
  for (const [k, v] of resetStore) if (v.expiresAt < now) resetStore.delete(k);
}, 60_000);

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getUserByEmail(email) {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return null;
    return users?.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
  } catch (_) { return null; }
}

/* ── Templates de e-mail ── */
function emailWrapper(body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:48px 0;">
    <tr><td align="center">
      <table width="460" cellpadding="0" cellspacing="0"
        style="background:#141414;border:1px solid rgba(245,197,24,0.22);border-radius:16px;
               padding:44px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
        <tr><td>
          <h1 style="font-size:1.9rem;letter-spacing:7px;color:#f5c518;margin:0 0 4px;">REDEFI</h1>
          <p style="color:rgba(255,255,255,0.35);font-size:0.75rem;letter-spacing:2px;margin:0 0 40px;">PLATAFORMA DE STREAMING</p>
          ${body}
          <p style="color:rgba(255,255,255,0.32);font-size:0.78rem;line-height:1.8;margin:0;">
            ⏱ Válido por <strong style="color:rgba(255,255,255,0.55);">10 minutos</strong>.<br>
            Se você não solicitou isso, ignore este e-mail.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildOtpEmail(code) {
  return emailWrapper(`
    <p style="color:rgba(255,255,255,0.78);font-size:0.95rem;margin:0 0 22px;">Use o código abaixo para confirmar seu cadastro:</p>
    <div style="background:#1e1e1e;border:1px solid rgba(245,197,24,0.35);border-radius:12px;padding:26px;text-align:center;margin-bottom:30px;">
      <span style="font-size:3.2rem;font-weight:800;letter-spacing:16px;color:#f5c518;font-family:'Courier New',monospace;">${code}</span>
    </div>`);
}

function buildResetEmail(code) {
  return emailWrapper(`
    <p style="color:rgba(255,255,255,0.78);font-size:0.95rem;margin:0 0 22px;">Use o código abaixo para redefinir sua senha:</p>
    <div style="background:#1e1e1e;border:1px solid rgba(245,197,24,0.35);border-radius:12px;padding:26px;text-align:center;margin-bottom:30px;">
      <span style="font-size:3.2rem;font-weight:800;letter-spacing:16px;color:#f5c518;font-family:'Courier New',monospace;">${code}</span>
    </div>`);
}

/* ══════════════════════════════════════════════
   POST /api/send-otp  (cadastro)
══════════════════════════════════════════════ */
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'E-mail inválido.' });
  if (!resend)
    return res.status(503).json({ error: 'Serviço de e-mail não configurado. Adicione RESEND_API_KEY no .env.local' });

  const existingUser = await getUserByEmail(email);
  if (existingUser?.email_confirmed_at)
    return res.status(409).json({ error: 'Este e-mail já está cadastrado. Use a tela "Olá novamente" para entrar.' });

  const stored = otpStore.get(email);
  if (stored && (stored.expiresAt - Date.now()) > 9 * 60_000)
    return res.status(429).json({ error: 'Código já enviado. Aguarde 1 minuto para solicitar outro. Se não chegou, verifique a pasta de spam.' });

  const code = generateCode();
  otpStore.set(email, { code, expiresAt: Date.now() + 10 * 60_000 });

  try {
    const { error } = await resend.emails.send({
      from: fromEmail, to: email,
      subject: `${code} — seu código de verificação Redefi`,
      html: buildOtpEmail(code)
    });
    if (error) { console.error('[Resend OTP]', error); return res.status(500).json({ error: 'Falha ao enviar e-mail.' }); }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[Resend OTP exception]', err);
    return res.status(500).json({ error: err.message || 'Falha ao enviar e-mail.' });
  }
});

/* ══════════════════════════════════════════════
   POST /api/verify-otp  (cadastro)
══════════════════════════════════════════════ */
app.post('/api/verify-otp', async (req, res) => {
  const { email, code, password } = req.body || {};
  if (!email || !code || !password) return res.status(400).json({ error: 'Dados incompletos.' });

  const stored = otpStore.get(email);
  if (!stored)                        return res.status(400).json({ error: 'Código não encontrado. Solicite um novo.' });
  if (Date.now() > stored.expiresAt)  { otpStore.delete(email); return res.status(400).json({ error: 'Código expirado. Solicite um novo.' }); }
  if (stored.code !== code.trim())    return res.status(400).json({ error: 'Código incorreto. Verifique e tente novamente.' });

  otpStore.delete(email);

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      if (existingUser.email_confirmed_at)
        return res.status(409).json({ error: 'Este e-mail já está cadastrado. Use a tela "Olá novamente" para entrar.' });
      const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, { email_confirm: true, password });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true, userId: data.user.id });
    }
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true, userId: data.user.id });
  } catch (err) {
    console.error('[verify-otp]', err);
    return res.status(500).json({ error: err.message || 'Erro ao criar conta.' });
  }
});

/* ══════════════════════════════════════════════
   POST /api/send-reset  (redefinição de senha via Resend)
   Não usa o Supabase para enviar e-mail — sem rate limit.
══════════════════════════════════════════════ */
app.post('/api/send-reset', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'E-mail inválido.' });
  if (!resend)
    return res.status(503).json({ error: 'Serviço de e-mail não configurado.' });

  /* Verifica se o usuário existe (sem revelar caso não exista) */
  const user = await getUserByEmail(email);
  if (!user || !user.email_confirmed_at) {
    /* Retorna sucesso silencioso para não expor quais e-mails existem */
    return res.json({ ok: true });
  }

  const stored = resetStore.get(email);
  if (stored && (stored.expiresAt - Date.now()) > 9 * 60_000)
    return res.status(429).json({ error: 'Código de redefinição já enviado. Aguarde 1 minuto para solicitar outro. Se não chegou, verifique a pasta de spam.' });

  const code = generateCode();
  resetStore.set(email, { code, userId: user.id, expiresAt: Date.now() + 10 * 60_000 });

  try {
    const { error } = await resend.emails.send({
      from: fromEmail, to: email,
      subject: `${code} — redefinição de senha Redefi`,
      html: buildResetEmail(code)
    });
    if (error) { console.error('[Resend Reset]', error); return res.status(500).json({ error: 'Falha ao enviar e-mail.' }); }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[Resend Reset exception]', err);
    return res.status(500).json({ error: err.message || 'Falha ao enviar e-mail.' });
  }
});

/* ══════════════════════════════════════════════
   POST /api/verify-reset  (confirma código e atualiza senha)
══════════════════════════════════════════════ */
app.post('/api/verify-reset', async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'Dados incompletos.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres.' });

  const stored = resetStore.get(email);
  if (!stored)                        return res.status(400).json({ error: 'Código não encontrado. Solicite um novo.' });
  if (Date.now() > stored.expiresAt)  { resetStore.delete(email); return res.status(400).json({ error: 'Código expirado. Solicite um novo.' }); }
  if (stored.code !== code.trim())    return res.status(400).json({ error: 'Código incorreto.' });

  resetStore.delete(email);

  try {
    /* Busca o usuário de novo (garante ID atualizado) */
    const freshUser = await getUserByEmail(email);
    if (!freshUser) return res.status(400).json({ error: 'Usuário não encontrado.' });

    const { error } = await supabase.auth.admin.updateUserById(freshUser.id, { password: newPassword });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[verify-reset]', err);
    return res.status(500).json({ error: err.message || 'Erro ao atualizar senha.' });
  }
});

/* ══════════════════════════════════════════════
   POST /api/delete-user
══════════════════════════════════════════════ */
app.post('/api/delete-user', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token ausente.' });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) return res.status(401).json({ error: 'Sessão inválida.' });
    const requestedId = req.body?.userId;
    if (!requestedId || requestedId !== userData.user.id)
      return res.status(403).json({ error: 'Você só pode apagar sua própria conta.' });
    const { error } = await supabase.auth.admin.deleteUser(requestedId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno.' });
  }
});

/* ── Injeta a URL do site dinamicamente para o frontend ──
   Em produção: defina SITE_URL nas variáveis do Railway
   Em desenvolvimento: cai no fallback window.location.origin */
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  const siteUrl = process.env.SITE_URL;
  if (siteUrl) {
    res.send(`window.SITE_URL = "${siteUrl}";`);
  } else {
    res.send(`window.SITE_URL = window.location.origin;`);
  }
});

app.use(express.static('.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Redefi] Servidor rodando na porta ${PORT}`));
