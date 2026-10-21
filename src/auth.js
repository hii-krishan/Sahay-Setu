
import { supabase } from './supabase.js';
window.supabase = supabase;

document.addEventListener('DOMContentLoaded', async () => {
  // ─── DOM Elements ───
  const authNav = document.getElementById('authNav');
  const authUser = document.getElementById('authUser');
  const authUserEmail = document.getElementById('authUserEmail');

  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const profileBtn = document.getElementById('profileBtn');
  const profileUserBtn = document.getElementById('profileUserBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // Modal elements
  const overlay = document.getElementById('authOverlay');
  const backdrop = document.getElementById('authBackdrop');
  const closeBtn = document.getElementById('authClose');

  // Tabs
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const tabIndicator = document.getElementById('authTabIndicator');

  // Forms
  const loginForm = document.getElementById('authLoginForm');
  const signupForm = document.getElementById('authSignupForm');
  const loginSubmitBtn = document.getElementById('authLoginSubmit');
  const signupSubmitBtn = document.getElementById('authSignupSubmit');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const rememberMe = document.getElementById('rememberMe');
  const signupName = document.getElementById('signupName');
  const signupEmail = document.getElementById('signupEmail');
  const signupPassword = document.getElementById('signupPassword');
  const forgotPassword = document.getElementById('forgotPassword');

  // Footers
  const footerLogin = document.getElementById('authFooterLogin');
  const footerSignup = document.getElementById('authFooterSignup');

  // Switch links
  const switchToSignup = document.getElementById('switchToSignup');
  const switchToLogin = document.getElementById('switchToLogin');

  // Password toggles
  const toggleLoginPw = document.getElementById('toggleLoginPw');
  const toggleSignupPw = document.getElementById('toggleSignupPw');

  // Password strength
  const pwFill = document.getElementById('pwFill');
  const pwLabel = document.getElementById('pwLabel');

  // Social
  const googleSignIn = document.getElementById('googleSignIn');

  // Message
  const authMessage = document.getElementById('authMessage');

  // Auth particles container
  const authParticlesEl = document.getElementById('authParticles');

  if (!authNav || !authUser || !loginBtn || !signupBtn || !profileBtn || !profileUserBtn || !logoutBtn) {
    console.error('Authentication elements not found in index.html');
    return;
  }

  // ─── Generate auth particles ───
  function spawnAuthParticles() {
    if (!authParticlesEl) return;
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('div');
      p.className = 'auth-particle';
      const size = Math.random() * 3 + 1;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${Math.random() * 12 + 8}s`;
      p.style.animationDelay = `${Math.random() * 8}s`;
      const hue = Math.random() > 0.5 ? '174' : '187'; // teal or cyan
      p.style.background = `hsl(${hue}, 80%, ${50 + Math.random() * 30}%)`;
      authParticlesEl.appendChild(p);
    }
  }
  spawnAuthParticles();

  // ─── Modal Open / Close ───
  function openModal(tab = 'login') {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    switchTab(tab);
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    hideMessage();
    // Reset forms
    loginForm.reset();
    signupForm.reset();
    resetPwStrength();
  }

  loginBtn.addEventListener('click', () => openModal('login'));
  signupBtn.addEventListener('click', () => openModal('signup'));
  profileBtn.addEventListener('click', () => openModal('login'));
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeModal();
    }
  });

  // ─── Tab Switching ───
  function switchTab(tab) {
    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      tabIndicator.classList.remove('signup');
      loginForm.hidden = false;
      signupForm.hidden = true;
      footerLogin.hidden = false;
      footerSignup.hidden = true;
    } else {
      tabLogin.classList.remove('active');
      tabSignup.classList.add('active');
      tabIndicator.classList.add('signup');
      loginForm.hidden = true;
      signupForm.hidden = false;
      footerLogin.hidden = true;
      footerSignup.hidden = false;
    }
    hideMessage();
  }

  tabLogin.addEventListener('click', () => switchTab('login'));
  tabSignup.addEventListener('click', () => switchTab('signup'));
  switchToSignup.addEventListener('click', () => switchTab('signup'));
  switchToLogin.addEventListener('click', () => switchTab('login'));

  // ─── Password Visibility Toggle ───
  function setupPwToggle(toggleBtn, inputId) {
    if (!toggleBtn) return;
    toggleBtn.addEventListener('click', () => {
      const input = document.getElementById(inputId);
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      // Swap icon
      toggleBtn.innerHTML = isPassword
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  }
  setupPwToggle(toggleLoginPw, 'loginPassword');
  setupPwToggle(toggleSignupPw, 'signupPassword');

  // ─── Password Strength Meter ───
  const signupPwInput = document.getElementById('signupPassword');
  if (signupPwInput) {
    signupPwInput.addEventListener('input', () => {
      const val = signupPwInput.value;
      const { level, label } = evaluatePassword(val);
      pwFill.className = 'auth-pw-fill ' + level;
      pwLabel.className = 'auth-pw-label ' + level;
      pwLabel.textContent = val ? label : '';
    });
  }

  function evaluatePassword(pw) {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 'weak', label: 'Weak' };
    if (score === 2) return { level: 'fair', label: 'Fair' };
    if (score === 3) return { level: 'good', label: 'Good' };
    return { level: 'strong', label: 'Strong' };
  }

  function resetPwStrength() {
    if (pwFill) pwFill.className = 'auth-pw-fill';
    if (pwLabel) { pwLabel.className = 'auth-pw-label'; pwLabel.textContent = ''; }
  }

  // ─── Messages ───
  function showMessage(text, type = 'error') {
    authMessage.hidden = false;
    authMessage.className = `auth-message ${type}`;
    authMessage.textContent = text;
  }

  function hideMessage() {
    if (authMessage) authMessage.hidden = true;
  }

  // ─── Loading State ───
  function setLoading(btn, loading) {
    const textEl = btn.querySelector('.auth-submit-text');
    const loaderEl = btn.querySelector('.auth-submit-loader');
    const arrowEl = btn.querySelector('.auth-submit-arrow');
    if (loading) {
      btn.disabled = true;
      if (textEl) textEl.hidden = true;
      if (loaderEl) loaderEl.hidden = false;
      if (arrowEl) arrowEl.hidden = true;
    } else {
      btn.disabled = false;
      if (textEl) textEl.hidden = false;
      if (loaderEl) loaderEl.hidden = true;
      if (arrowEl) arrowEl.hidden = false;
    }
  }

  // ─── Login Form Submit ───
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
      showMessage('Please fill in all fields.');
      return;
    }

    setLoading(loginSubmitBtn, true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(loginSubmitBtn, false);

    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    if (rememberMe.checked) {
      localStorage.setItem('sahaySetuRememberedEmail', email);
    } else {
      localStorage.removeItem('sahaySetuRememberedEmail');
    }

    showMessage('Login successful! Redirecting...', 'success');
    setTimeout(() => {
      closeModal();
      updateAuthUI();
    }, 1200);
  });

  // ─── Password Reset ───
  forgotPassword.addEventListener('click', async (e) => {
    e.preventDefault();
    hideMessage();

    const email = loginEmail.value.trim();
    if (!email) {
      loginEmail.focus();
      showMessage('Enter your email address first, then choose “Forgot password?”.');
      return;
    }

    forgotPassword.setAttribute('aria-disabled', 'true');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`
    });
    forgotPassword.removeAttribute('aria-disabled');

    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    showMessage('Password reset instructions have been sent to your email.', 'success');
  });

  // ─── Signup Form Submit ───
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;

    if (!name || !email || !password) {
      showMessage('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(signupSubmitBtn, true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        },
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`
      }
    });

    setLoading(signupSubmitBtn, false);

    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    showMessage('Account created! Check your email to confirm.', 'success');
  });

  const rememberedEmail = localStorage.getItem('sahaySetuRememberedEmail');
  if (rememberedEmail) {
    loginEmail.value = rememberedEmail;
    rememberMe.checked = true;
  }
 
  // ─── Google Sign-In ───
  googleSignIn.addEventListener('click', async () => {
    hideMessage();
    googleSignIn.disabled = true;
    googleSignIn.setAttribute('aria-busy', 'true');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });

      if (error) {
        showMessage(error.message, 'error');
        googleSignIn.disabled = false;
        googleSignIn.removeAttribute('aria-busy');
      }
      // On success, Supabase redirects the browser to Google.
    } catch (error) {
      showMessage(
        error.message || 'Google sign-in could not start. Please try again.',
        'error'
      );
      googleSignIn.disabled = false;
      googleSignIn.removeAttribute('aria-busy');
    }
  });

  // ─── Logout ───
  logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    await updateAuthUI();
  });

  // ─── Auth UI Update ───
  async function updateAuthUI() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Could not retrieve auth session:', error.message);
      renderAuthState(null);
      return;
    }
    renderAuthState(data.session?.user || null);
  }

  function renderAuthState(user) {
    authNav.hidden = Boolean(user);
    authUser.hidden = !user;
    authUserEmail.textContent = user
      ? (user.user_metadata?.full_name || user.email || 'My Profile')
      : '';
  }

  // Update navbar after login, logout, or session restoration.
  supabase.auth.onAuthStateChange((_event, session) => {
    renderAuthState(session?.user || null);
  });

  await updateAuthUI();
});
