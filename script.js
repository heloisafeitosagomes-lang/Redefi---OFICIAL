/* ══════════════════════════════════════════════
   script.js — Redefi Streaming
══════════════════════════════════════════════ */

/* URL do site — injetada pelo servidor via /config.js
   Em produção (Railway): usa a variável SITE_URL do ambiente
   Em desenvolvimento: usa window.location.origin automaticamente */
const SITE_URL = window.SITE_URL || window.location.origin;

/* ─────────────────────────────────────────────
   1. DADOS
───────────────────────────────────────────── */
const HERO_ITEMS = {
  dmc: { title:'DEVIL MAY CRY', img:'imgs/devil-may-cry.png', desc:'Devil May Cry acompanha Dante, caçador de demônios meio-humano e meio-demônio. Filho do lendário cavaleiro negro Sparda, ele dedica sua vida a impedir invasões infernais com suas pistolas Ebony & Ivory e a espada Rebellion.', meta:'ANIME · 2024 · Ação / Sobrenatural · 12 eps' },
  dn:  { title:'DEATH NOTE',    img:'imgs/death-note.png',    desc:'Light Yagami encontra um caderno sobrenatural capaz de matar qualquer pessoa cujo nome seja escrito em suas páginas. Decidido a limpar o mundo dos criminosos como "Kira", ele é desafiado pelo genial detetive L.',                  meta:'ANIME · 2006 · Suspense / Psicológico · 37 eps' }
};
const ANIMES = [
  { title:'Naruto',             badge:'CLÁSSICO', badgeClass:'',     img:'imgs/naruto.png',           desc:'A história de Naruto Uzumaki, um jovem ninja que sonha em se tornar o Hokage e ser reconhecido por toda a aldeia.',             meta:'ANIME · 2002 · Aventura / Ninja · 220 eps' },
  { title:'Attack on Titan',    badge:'NOVO',     badgeClass:'novo', img:'imgs/attk.png',             desc:'A humanidade enfrenta gigantes comedores de humanos protegida por enormes muralhas. Eren Yeager jura exterminar todos os Titãs.', meta:'ANIME · 2013 · Ação / Drama · 87 eps' },
  { title:'One Piece',          badge:'CLÁSSICO', badgeClass:'',     img:'imgs/one-piece.png',        desc:'Monkey D. Luffy parte em busca do lendário tesouro One Piece para se tornar o Rei dos Piratas.',                                 meta:'ANIME · 1999 · Aventura / Fantasia · +1000 eps' },
  { title:'Demon Slayer',       badge:'NOVO',     badgeClass:'novo', img:'imgs/demon-slayer.png',     desc:'Tanjiro Kamado se torna um caçador de demônios para salvar sua irmã transformada em demônio.',                                  meta:'ANIME · 2019 · Ação / Sobrenatural · 4 Temp.' },
  { title:'Fullmetal Alchemist',badge:'',         badgeClass:'',     img:'imgs/fullmetal.png',        desc:'Dois irmãos alquimistas buscam a Pedra Filosofal para recuperar o que perderam em um ritual proibido.',                         meta:'ANIME · 2009 · Ação / Drama · 64 eps' }
];
const FILMES = [
  { title:'Spirited Away',     badge:'CLÁSSICO', badgeClass:'',     img:'imgs/spirited-away.png',     desc:'Chihiro cai em um mundo mágico e deve trabalhar em uma casa de banhos para espíritos para salvar seus pais.',                   meta:'FILME · 2001 · Fantasia / Studio Ghibli · 2h 5min' },
  { title:'Princess Mononoke', badge:'',         badgeClass:'',     img:'imgs/princess-mononoke.png', desc:'Um jovem príncipe adentra a floresta onde humanos e espíritos da natureza travam uma batalha pelo futuro.',                     meta:'FILME · 1997 · Aventura / Studio Ghibli · 2h 14min' },
  { title:'Your Name',         badge:'NOVO',     badgeClass:'novo', img:'imgs/your-name.png',         desc:'Dois adolescentes se descobrem trocando de corpo enquanto dormem, conectando destinos opostos.',                                meta:'FILME · 2016 · Romance / Ficção · 1h 52min' },
  { title:'Akira',             badge:'CLÁSSICO', badgeClass:'',     img:'imgs/akira.png',             desc:'Em Neo-Tóquio cyberpunk, um motociclista rebelde descobre poderes psíquicos que podem mudar o mundo.',                          meta:'FILME · 1988 · Sci-Fi / Cyberpunk · 2h 4min' },
  { title:'Dragon Ball Super', badge:'NOVO',     badgeClass:'novo', img:'imgs/dragon-ball-super.png', desc:'Goku e seus aliados enfrentam ameaças multidimensionais e torneios entre universos.',                                           meta:'ANIME · 2015 · Ação · 131 eps' }
];

/* ─────────────────────────────────────────────
   2. UTILITÁRIOS
───────────────────────────────────────────── */
const $id = id => document.getElementById(id);
const isValidEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const delay = ms => new Promise(r => setTimeout(r, ms));

async function ensureSupabase(timeout = 6000) {
  const start = Date.now();
  while (!window.supabase) {
    if (Date.now() - start > timeout) throw new Error('Supabase não inicializado');
    await delay(100);
  }
  return window.supabase;
}
function clearSupabaseAuthArtifacts() {
  try {
    const patterns = [/^sb-/, /^supabase\.auth\.token/, /^pkce_/, /^oauth_/, /^redefi-auth/];
    [localStorage, sessionStorage].forEach(s =>
      Object.keys(s).forEach(k => { if (patterns.some(p => p.test(k))) s.removeItem(k); })
    );
  } catch (_) {}
}

/* ─────────────────────────────────────────────
   3. CATÁLOGO
───────────────────────────────────────────── */
function buildStrip(containerId, items) {
  const container = $id(containerId);
  if (!container) return;
  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'mini-card';
    card.style.animationDelay = `${i * 0.07}s`;
    if (item.badge) {
      const b = document.createElement('span');
      b.className = `badge ${item.badgeClass}`; b.textContent = item.badge;
      card.appendChild(b);
    }
    const img = document.createElement('img');
    img.alt = item.title; img.src = item.img;
    img.onerror = function() { this.src = `https://via.placeholder.com/200x300/161616/f5c518?text=${encodeURIComponent(item.title)}`; };
    card.appendChild(img);
    const play = document.createElement('div'); play.className = 'mini-play'; card.appendChild(play);
    const t = document.createElement('div'); t.className = 'mini-card-title'; t.textContent = item.title; card.appendChild(t);
    card.addEventListener('click', () => openContentModal(item));
    container.appendChild(card);
  });
}

/* ─────────────────────────────────────────────
   4. MODAL DE CONTEÚDO
───────────────────────────────────────────── */
const contentOverlay = $id('modal');
function openContentModal(item) {
  $id('modal-img').src = item.img; $id('modal-img').alt = item.title;
  $id('modal-title').textContent = item.title;
  $id('modal-desc').textContent  = item.desc;
  $id('modal-meta').textContent  = item.meta || '';
  contentOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeContentModal() { contentOverlay.classList.remove('open'); document.body.style.overflow = ''; }
$id('btn-close-modal').addEventListener('click', closeContentModal);
contentOverlay.addEventListener('click', e => { if (e.target === contentOverlay) closeContentModal(); });
document.querySelectorAll('[data-key]').forEach(card =>
  card.addEventListener('click', () => { const k = card.dataset.key; if (HERO_ITEMS[k]) openContentModal(HERO_ITEMS[k]); })
);

/* ─────────────────────────────────────────────
   4.5 — FORÇA DA SENHA
───────────────────────────────────────────── */
const PWD_RULES = {
  len:     { test: p => p.length >= 8,                                     label: 'Mínimo 8 caracteres' },
  upper:   { test: p => /[A-Z]/.test(p),                                    label: 'Uma letra maiúscula (A-Z)' },
  lower:   { test: p => /[a-z]/.test(p),                                    label: 'Uma letra minúscula (a-z)' },
  num:     { test: p => /[0-9]/.test(p),                                    label: 'Um número (0-9)' },
  special: { test: p => /[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]/.test(p),   label: 'Um caractere especial (!@#$%...)' }
};
function isPasswordStrong(p) { return Object.values(PWD_RULES).every(r => r.test(p)); }

function updateStrengthUI(password) {
  const box = $id('pwd-strength');
  if (!box) return;
  if (!password) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  let passed = 0;
  Object.entries(PWD_RULES).forEach(([key, rule]) => {
    const ok = rule.test(password);
    if (ok) passed++;
    const el = $id(`rule-${key}`);
    if (el) { el.classList.toggle('ok', ok); el.textContent = `${ok ? '✓' : '✗'} ${rule.label}`; }
  });
  const fill = $id('pwd-fill');
  if (fill) {
    fill.style.width = `${(passed / 5) * 100}%`;
    fill.style.background = passed <= 1 ? '#e74c3c' : passed <= 2 ? '#e67e22' : passed <= 3 ? '#f1c40f' : passed <= 4 ? '#2ecc71' : '#27ae60';
  }
}
function hideStrengthUI() {
  const box = $id('pwd-strength');
  if (box) box.classList.add('hidden');
}

/* ─────────────────────────────────────────────
   5. MODAL DE LOGIN
───────────────────────────────────────────── */
const loginOverlay    = $id('login-overlay');
const loginHeading    = $id('login-heading');
const loginAlert      = $id('login-alert');
const loginEmail      = $id('login-email');
const loginSenha      = $id('login-senha');
const loginCodigo     = $id('login-codigo');
const fieldSenha      = $id('field-senha');
const fieldCodigo     = $id('field-codigo');
const loginBtnSubmit  = $id('login-btn-submit');
const loginBtnGoogle  = $id('login-btn-google');
const loginForgot     = $id('login-forgot');
const fieldForgot     = $id('field-forgot');
const loginToggle     = $id('login-theme-toggle');
const loginCloseText  = $id('login-close-text');
const loginSwitchLink = $id('login-switch-link');
const loginSwitchMsg  = $id('login-switch-msg');
const senhaLabel      = fieldSenha ? fieldSenha.querySelector('label') : null;

/* ── Olhinho — mostrar/ocultar senha ── */
const eyeToggle  = $id('eye-toggle');
const eyeOpen    = $id('eye-open');
const eyeClosed  = $id('eye-closed');
if (eyeToggle) {
  eyeToggle.addEventListener('click', () => {
    const isPassword = loginSenha.type === 'password';
    loginSenha.type = isPassword ? 'text' : 'password';
    if (eyeOpen)   eyeOpen.style.display   = isPassword ? 'none' : '';
    if (eyeClosed) eyeClosed.style.display = isPassword ? '' : 'none';
  });
}

/* Estado */
const LS = { open:false, screen:'new', step:'form', loading:false };
let pendingSignup = null;   // { email, password }
let pendingReset  = null;   // { email }

/* ── Abrir / Fechar ── */
function openLoginModal(startScreen) {
  LS.open = true; LS.loading = false;
  setScreen(startScreen || 'new');
  loginOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => loginEmail.focus(), 280);
}
function closeLoginModal() {
  LS.open = false; pendingSignup = null; pendingReset = null;
  loginEmail.readOnly = false; loginEmail.style.opacity = '';
  if (senhaLabel) senhaLabel.textContent = 'senha:';
  loginSenha.type = 'password';
  if (eyeOpen)   eyeOpen.style.display   = '';
  if (eyeClosed) eyeClosed.style.display = 'none';
  if (fieldForgot) fieldForgot.style.display = '';
  hideStrengthUI();
  loginOverlay.classList.remove('open');
  document.body.style.overflow = '';
  clearLoginAlert();
}
loginOverlay.addEventListener('click', e => { if (e.target === loginOverlay) closeLoginModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (LS.open) closeLoginModal(); else closeContentModal(); }
});

/* ── Definir tela ── */
function setScreen(screen) {
  LS.screen = screen; LS.step = 'form'; pendingSignup = null; pendingReset = null;
  loginEmail.readOnly = false; loginEmail.style.opacity = '';
  if (senhaLabel) senhaLabel.textContent = 'senha:';
  loginSenha.type = 'password';
  if (eyeOpen)   eyeOpen.style.display   = '';
  if (eyeClosed) eyeClosed.style.display = 'none';
  if (fieldForgot) fieldForgot.style.display = '';
  hideStrengthUI();
  const isNew = screen === 'new';
  loginOverlay.classList.toggle('ltheme', isNew);
  loginOverlay.classList.toggle('dtheme', !isNew);
  loginHeading.textContent    = isNew ? 'Bem-Vindo' : 'Olá novamente!';
  loginBtnSubmit.textContent  = isNew ? 'CRIAR CONTA' : 'ENTRAR';
  loginToggle.textContent     = isNew ? '🌙 Já tenho conta' : '☀️ Primeira vez';
  fieldSenha.classList.remove('hidden');
  fieldCodigo.classList.add('hidden');
  loginSenha.placeholder = isNew ? 'crie uma senha forte' : '••••••••';
  loginSwitchMsg.textContent  = isNew ? 'Já tem uma conta?' : 'Primeira vez aqui?';
  loginSwitchLink.textContent = isNew ? 'Entrar →' : '← Criar conta';
  loginEmail.value = ''; loginSenha.value = ''; loginCodigo.value = '';
  clearLoginAlert();
  [loginEmail, loginSenha, loginCodigo].forEach(i => i.classList.remove('shake'));
}

/* ── Passo 2 — cadastro: digitar código ── */
function goToCodeStep(email) {
  LS.step = 'code';
  loginEmail.readOnly = true; loginEmail.style.opacity = '0.55';
  fieldSenha.classList.add('hidden');
  fieldCodigo.classList.remove('hidden');
  hideStrengthUI();
  loginCodigo.value = '';
  loginCodigo.setAttribute('inputmode','numeric'); loginCodigo.setAttribute('pattern','[0-9]*');
  loginHeading.textContent    = 'Verifique seu e-mail';
  loginBtnSubmit.textContent  = 'VERIFICAR CÓDIGO';
  loginSwitchMsg.textContent  = 'Não recebeu o código?';
  loginSwitchLink.textContent = '← Voltar';
  loginToggle.textContent     = '← Voltar ao início';
  setTimeout(() => loginCodigo.focus(), 150);
}

/* ── Passo reset — digitar código + nova senha ── */
function goToResetStep(email) {
  LS.step = 'reset';
  loginEmail.readOnly = true; loginEmail.style.opacity = '0.55';
  fieldCodigo.classList.remove('hidden');
  fieldSenha.classList.remove('hidden');
  if (senhaLabel) senhaLabel.textContent = 'nova senha:';
  loginSenha.placeholder = 'crie uma senha forte';
  /* Esconde "Esqueci minha senha" — não faz sentido no passo de reset */
  if (fieldForgot) fieldForgot.style.display = 'none';
  /* Garante que senha fique oculta ao entrar na tela */
  loginSenha.type = 'password';
  if (eyeOpen)   eyeOpen.style.display   = '';
  if (eyeClosed) eyeClosed.style.display = 'none';
  loginSenha.value = ''; loginCodigo.value = '';
  hideStrengthUI();
  loginCodigo.setAttribute('inputmode','numeric'); loginCodigo.setAttribute('pattern','[0-9]*');
  loginHeading.textContent    = 'Redefina sua senha';
  loginBtnSubmit.textContent  = 'REDEFINIR SENHA';
  loginSwitchMsg.textContent  = 'Lembrou a senha?';
  loginSwitchLink.textContent = '← Voltar ao login';
  loginToggle.textContent     = '← Voltar';
  setTimeout(() => loginCodigo.focus(), 150);
}

/* ── Alertas ── */
function showLoginAlert(msg, type='err') { loginAlert.textContent=msg; loginAlert.className=`login-alert show ${type}`; }
function clearLoginAlert() { loginAlert.className='login-alert'; loginAlert.textContent=''; }
function shakeInput(el) {
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  el.addEventListener('animationend', () => el.classList.remove('shake'), {once:true});
}

/* ── Validação passo 1 ── */
function validateLoginFields() {
  const email = loginEmail.value.trim();
  if (!email)               { shakeInput(loginEmail); showLoginAlert('Preencha o e-mail.','err');            return false; }
  if (!isValidEmail(email)) { shakeInput(loginEmail); showLoginAlert('E-mail inválido.','err');              return false; }
  if (!loginSenha.value)    { shakeInput(loginSenha); showLoginAlert('Preencha a senha.','err');             return false; }
  /* Cadastro exige senha forte: 8+ caracteres, maiúscula, minúscula, número e especial */
  if (LS.screen === 'new' && !isPasswordStrong(loginSenha.value)) {
    shakeInput(loginSenha);
    showLoginAlert('A senha não atende aos requisitos de segurança.','err');
    updateStrengthUI(loginSenha.value);
    return false;
  }
  /* Login: apenas garante que não está vazio (a força já foi exigida no cadastro) */
  if (LS.screen === 'user' && loginSenha.value.length < 1) {
    shakeInput(loginSenha); showLoginAlert('Preencha a senha.','err'); return false;
  }
  return true;
}

/* ── Submit principal ── */
async function handleLoginSubmit() {
  if (LS.loading) return;
  clearLoginAlert();

  /* Passo 2 cadastro */
  if (LS.screen === 'new' && LS.step === 'code') {
    LS.loading=true; loginBtnSubmit.disabled=true; loginBtnSubmit.textContent='VERIFICANDO...';
    await handleVerifyOtp();
    LS.loading=false; loginBtnSubmit.disabled=false;
    if (LS.open && LS.step==='code') loginBtnSubmit.textContent='VERIFICAR CÓDIGO';
    return;
  }

  /* Passo reset */
  if (LS.step === 'reset') {
    LS.loading=true; loginBtnSubmit.disabled=true; loginBtnSubmit.textContent='AGUARDE...';
    await handleResetVerify();
    LS.loading=false; loginBtnSubmit.disabled=false;
    if (LS.open && LS.step==='reset') loginBtnSubmit.textContent='REDEFINIR SENHA';
    return;
  }

  /* Passo 1 — criar conta ou entrar */
  if (!validateLoginFields()) return;
  const originalText = LS.screen==='new' ? 'CRIAR CONTA' : 'ENTRAR';
  LS.loading=true; loginBtnSubmit.disabled=true; loginBtnSubmit.textContent='AGUARDE...';
  await delay(600);
  if (LS.screen==='new') await handleNewUser(); else await handleSignIn();
  LS.loading=false; loginBtnSubmit.disabled=false;
  if (LS.open && LS.step==='form') loginBtnSubmit.textContent=originalText;
}

/* ── Cadastro: passo 1 — enviar OTP ── */
async function handleNewUser() {
  const email=loginEmail.value.trim(), password=loginSenha.value;
  try {
    const res=await fetch('/api/send-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    const result=await res.json();
    if (res.status===409) { showLoginAlert(result.error,'err'); setTimeout(()=>{ if(LS.open&&LS.step==='form') setScreen('user'); },2500); return; }
    if (res.status===429) { showLoginAlert(result.error||'Aguarde antes de solicitar outro código.','err'); return; }
    if (!res.ok)          { showLoginAlert(result.error||'Erro ao enviar código. Verifique o servidor.','err'); return; }
    pendingSignup={email,password};
    goToCodeStep(email);
    showLoginAlert(`✓ Código enviado para ${email}. Válido por 10 minutos.`,'ok');
  } catch(err) { console.error('[OTP send]',err); showLoginAlert('Erro de conexão. Verifique se o servidor está rodando.','err'); }
}

/* ── Cadastro: passo 2 — verificar OTP ── */
async function handleVerifyOtp() {
  const code=loginCodigo.value.trim();
  if (!code||!/^\d{6}$/.test(code)) { shakeInput(loginCodigo); showLoginAlert('Digite o código de 6 dígitos.','err'); return; }
  if (!pendingSignup) { showLoginAlert('Sessão expirada. Feche e tente novamente.','err'); setScreen('new'); return; }
  try {
    const res=await fetch('/api/verify-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:pendingSignup.email,code,password:pendingSignup.password})});
    const result=await res.json();
    if (res.status===409) { shakeInput(loginCodigo); showLoginAlert(result.error,'err'); return; }
    if (!res.ok)          { shakeInput(loginCodigo); showLoginAlert(result.error||'Código inválido.','err'); return; }
    await ensureSupabase();
    const {error:signInError}=await window.supabase.auth.signInWithPassword({email:pendingSignup.email,password:pendingSignup.password});
    if (signInError) { showLoginAlert('✓ Conta criada! Faça login com suas credenciais.','ok'); pendingSignup=null; setTimeout(()=>setScreen('user'),1800); return; }
    showLoginAlert('✓ Conta verificada! Bem-vindo ao Redefi.','ok');
    pendingSignup=null;
    setTimeout(()=>closeLoginModal(),1200);
  } catch(err) { console.error('[OTP verify]',err); showLoginAlert('Erro ao verificar código.','err'); }
}

/* ── Login ── */
async function handleSignIn() {
  const email=loginEmail.value.trim(), password=loginSenha.value;
  try {
    await ensureSupabase();
    const {error}=await window.supabase.auth.signInWithPassword({email,password});
    if (error) { showLoginAlert(error.message?.includes('Invalid login')?'E-mail ou senha incorretos.':(error.message||'Credenciais inválidas.'),'err'); return; }
    showLoginAlert('✓ Login efetuado!','ok');
    setTimeout(()=>closeLoginModal(),900);
  } catch(err) { showLoginAlert('Erro ao conectar ao Supabase.','err'); }
}

/* ────────────────────────────────────────────────────────────
   REDEFINIÇÃO DE SENHA — via Gmail SMTP (sem rate limit do Supabase)

   Fluxo:
     1. Usuário digita o e-mail e clica "Esqueci minha senha"
     2. Servidor envia código pelo Gmail  (/api/send-reset)
     3. Modal muda para passo 'reset': campo código + nova senha
     4. Usuário preenche e clica "REDEFINIR SENHA"
     5. Servidor valida e atualiza a senha  (/api/verify-reset)
     6. Login automático com a nova senha
──────────────────────────────────────────────────────────── */
async function handlePasswordReset(emailOverride) {
  const email = emailOverride || loginEmail.value.trim();
  if (!email || !isValidEmail(email)) {
    if (!emailOverride) { shakeInput(loginEmail); showLoginAlert('Informe um e-mail válido para redefinição.','err'); }
    return;
  }
  showLoginAlert('Enviando código de redefinição...','ok');
  try {
    const res=await fetch('/api/send-reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    const result=await res.json();
    if (res.status===429) { showLoginAlert(result.error||'Aguarde antes de solicitar outro código.','err'); return; }
    if (!res.ok)          { showLoginAlert(result.error||'Erro ao enviar código.','err'); return; }
    /* Sucesso silencioso se e-mail não existe (segurança) */
    pendingReset={email};
    if (!LS.open) openLoginModal('user');
    loginEmail.value=email;
    goToResetStep(email);
    showLoginAlert(`✓ Código enviado para ${email}. Válido por 10 minutos.`,'ok');
  } catch(err) { console.error('[send-reset]',err); showLoginAlert('Erro de conexão ao enviar código.','err'); }
}

/* ── Reset: passo 2 — verificar código e atualizar senha ── */
async function handleResetVerify() {
  const code=loginCodigo.value.trim();
  const newPassword=loginSenha.value; /* NÃO faz trim — preserva intenção do usuário */
  if (!code||!/^\d{6}$/.test(code)) { shakeInput(loginCodigo); showLoginAlert('Digite o código de 6 dígitos.','err'); return; }
  if (!newPassword||!isPasswordStrong(newPassword)) {
    shakeInput(loginSenha);
    showLoginAlert('A nova senha não atende aos requisitos de segurança.','err');
    updateStrengthUI(newPassword);
    return;
  }
  if (!pendingReset) { showLoginAlert('Sessão expirada. Tente novamente.','err'); setScreen('user'); return; }
  try {
    const res=await fetch('/api/verify-reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:pendingReset.email,code,newPassword})});
    const result=await res.json();
    if (!res.ok) { shakeInput(loginCodigo); showLoginAlert(result.error||'Código inválido.','err'); return; }
    /* ✓ Senha atualizada no servidor — aguarda 800ms para propagar e então faz login */
    showLoginAlert('Senha redefinida! Fazendo login...','ok');
    await delay(800);
    await ensureSupabase();
    const {error:signInError}=await window.supabase.auth.signInWithPassword({email:pendingReset.email,password:newPassword});
    if (signInError) {
      showLoginAlert('✓ Senha redefinida! Use a nova senha para entrar.','ok');
      pendingReset=null;
      setTimeout(()=>setScreen('user'),2000);
      return;
    }
    showLoginAlert('✓ Senha redefinida com sucesso!','ok');
    pendingReset=null;
    setTimeout(()=>closeLoginModal(),1200);
  } catch(err) { console.error('[verify-reset]',err); showLoginAlert('Erro ao redefinir senha.','err'); }
}

/* ── Google OAuth ── */
async function handleGoogleLogin() {
  if (LS.loading) return;
  LS.loading=true; showLoginAlert('Conectando ao Google...','ok');
  try {
    clearSupabaseAuthArtifacts(); await ensureSupabase();
    const {error}=await window.supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:SITE_URL,queryParams:{access_type:'offline',prompt:'consent'}}});
    if (error) showLoginAlert(error.message||'Erro ao iniciar login com Google.','err');
  } catch(err) { showLoginAlert(err?.message||'Erro ao conectar ao Supabase.','err'); }
  finally { LS.loading=false; }
}

/* ── Navbar ── */
function updateNavAfterLogin(email) {
  const btn=$id('btn-login'); if (!btn) return;
  const ok=Boolean(email&&email.trim()!==''&&email.toLowerCase()!=='login');
  if (ok) {
    btn.textContent=email.charAt(0).toUpperCase(); btn.title=`Logado como ${email}`;
    btn.style.borderRadius='50%'; btn.style.width='36px'; btn.style.height='36px'; btn.style.padding='0'; btn.style.fontSize='1rem';
  } else {
    btn.textContent='LOGIN'; btn.title='';
    btn.style.borderRadius=btn.style.width=btn.style.height=btn.style.padding=btn.style.fontSize='';
  }
  const clone=btn.cloneNode(true);
  clone.addEventListener('click',()=>ok?openProfilePanel():openLoginModal('new'));
  btn.replaceWith(clone);
}

/* ── Eventos ── */
loginBtnSubmit.addEventListener('click',handleLoginSubmit);
loginBtnGoogle.addEventListener('click',handleGoogleLogin);
loginCloseText.addEventListener('click',closeLoginModal);
if (loginForgot) loginForgot.addEventListener('click',()=>handlePasswordReset());
loginToggle.addEventListener('click',()=>{ if(LS.step==='code'||LS.step==='reset'){setScreen('new');return;} setScreen(LS.screen==='new'?'user':'new'); });
loginSwitchLink.addEventListener('click',()=>{ if(LS.step==='code'||LS.step==='reset'){setScreen(LS.screen==='new'?'new':'user');return;} setScreen(LS.screen==='new'?'user':'new'); });
[loginEmail,loginSenha,loginCodigo].forEach(input=>{
  input.addEventListener('keydown',e=>{if(e.key==='Enter')handleLoginSubmit();});
  input.addEventListener('input',()=>{input.classList.remove('shake');clearLoginAlert();});
});

/* Indicador de força — ativo no cadastro (passo 1) e na redefinição (passo reset) */
loginSenha.addEventListener('input', () => {
  if ((LS.screen === 'new' && LS.step === 'form') || LS.step === 'reset') {
    updateStrengthUI(loginSenha.value);
  }
});

/* ─────────────────────────────────────────────
   6. PAINEL DE PERFIL
───────────────────────────────────────────── */
const profileOverlay=$id('profile-overlay');
const profileAlertEl=$id('profile-alert');

function showProfileAlert(msg,type='err') {
  if (!profileAlertEl) return;
  profileAlertEl.textContent=msg; profileAlertEl.className=`profile-alert show ${type}`;
  clearTimeout(showProfileAlert._t);
  showProfileAlert._t=setTimeout(()=>{if(profileAlertEl)profileAlertEl.className='profile-alert';},4000);
}
function openProfilePanel() {
  if (!profileOverlay) return;
  const el=$id('profile-email'); if(el) el.textContent=localStorage.getItem('redefi_email')||'Conta conectada';
  profileOverlay.classList.add('open'); profileOverlay.removeAttribute('aria-hidden');
  document.body.style.overflow='hidden';
}
function closeProfilePanel() {
  if (!profileOverlay) return;
  profileOverlay.classList.remove('open'); profileOverlay.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}

/* Redefinir senha a partir do perfil — fecha painel e abre modal com código */
async function handleProfileReset() {
  const email=localStorage.getItem('redefi_email');
  if (!email) { showProfileAlert('Sessão não encontrada. Faça login novamente.','err'); return; }
  closeProfilePanel();
  await handlePasswordReset(email);
}

async function handleProfileLogout() {
  try { await ensureSupabase(); await window.supabase.auth.signOut(); } catch(_) {}
  clearSupabaseAuthArtifacts();
  localStorage.removeItem('redefi_logged'); localStorage.removeItem('redefi_email');
  updateNavAfterLogin(''); closeProfilePanel();
}
async function handleProfileDelete() {
  const email=localStorage.getItem('redefi_email');
  if (!email) { showProfileAlert('Sessão não encontrada. Faça login novamente.','err'); return; }
  if (!confirm('Deseja realmente excluir sua conta? Esta ação não pode ser desfeita.')) return;
  try {
    const sb=await ensureSupabase();
    const {data:{session}}=await sb.auth.getSession();
    const token=session?.access_token;
    if (!token) throw new Error('Sessão inválida. Faça login novamente.');
    const {data:{user}}=await sb.auth.getUser();
    const res=await fetch('/api/delete-user',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({userId:user?.id})});
    const result=await res.json();
    if (!res.ok) throw new Error(result.error||'Falha ao excluir conta.');
    clearSupabaseAuthArtifacts();
    localStorage.removeItem('redefi_logged'); localStorage.removeItem('redefi_email');
    updateNavAfterLogin(''); closeProfilePanel();
  } catch(err) { showProfileAlert(err.message||'Não foi possível excluir a conta.','err'); }
}

const pClose=$id('profile-close'), pReset=$id('profile-reset'), pLogout=$id('profile-logout'), pDelete=$id('profile-delete');
if(pClose)   pClose.addEventListener('click',closeProfilePanel);
if(pReset)   pReset.addEventListener('click',handleProfileReset);
if(pLogout)  pLogout.addEventListener('click',handleProfileLogout);
if(pDelete)  pDelete.addEventListener('click',handleProfileDelete);
if(profileOverlay) profileOverlay.addEventListener('click',e=>{if(e.target===profileOverlay)closeProfilePanel();});

/* ─────────────────────────────────────────────
   7. NAVBAR
───────────────────────────────────────────── */
$id('btn-login').addEventListener('click',()=>openLoginModal('new'));
$id('avatar-icon').addEventListener('click',()=>localStorage.getItem('redefi_logged')==='true'?openProfilePanel():openLoginModal('new'));
document.querySelectorAll('.nav-links a').forEach(link=>link.addEventListener('click',function(e){
  e.preventDefault();
  document.querySelectorAll('.nav-links a').forEach(l=>l.classList.remove('nav-active'));
  this.classList.add('nav-active');
}));
const navbar=$id('navbar');
window.addEventListener('scroll',()=>{ navbar.style.borderBottomColor=window.scrollY>40?'rgba(245,197,24,0.18)':'rgba(245,197,24,0.08)'; });

/* ─────────────────────────────────────────────
   8. SESSÃO PERSISTENTE
───────────────────────────────────────────── */
async function checkExistingSession() {
  try {
    await ensureSupabase(8000);
    const {data:{session}}=await window.supabase.auth.getSession();
    if (session?.user) {
      localStorage.setItem('redefi_logged','true'); localStorage.setItem('redefi_email',session.user.email);
      updateNavAfterLogin(session.user.email);
    }
    window.supabase.auth.onAuthStateChange((event,session)=>{
      if (session?.user) {
        localStorage.setItem('redefi_logged','true'); localStorage.setItem('redefi_email',session.user.email);
        updateNavAfterLogin(session.user.email);
      }
      if (event==='SIGNED_OUT') {
        localStorage.removeItem('redefi_logged'); localStorage.removeItem('redefi_email');
        updateNavAfterLogin('');
      }
    });
  } catch(err) {
    console.warn('[Session] Fallback localStorage:',err);
    if (localStorage.getItem('redefi_logged')==='true') updateNavAfterLogin(localStorage.getItem('redefi_email')||'');
  }
}

(function init() {
  buildStrip('strip-animes',ANIMES);
  buildStrip('strip-filmes',FILMES);
  loginOverlay.classList.add('ltheme');
  checkExistingSession();
})();
