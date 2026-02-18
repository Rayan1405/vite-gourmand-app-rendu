let token = localStorage.getItem('token') || '';

const authStatus = document.querySelector('#auth-status');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const modeButtons = Array.from(document.querySelectorAll('[data-auth-mode]'));
const authForms = {
  login: document.querySelector('[data-auth-form="login"]'),
  register: document.querySelector('[data-auth-form="register"]')
};

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur API');
  return data;
}

function formToObject(form) {
  const fd = new FormData(form);
  return Object.fromEntries(fd.entries());
}

function redirectByRole(role) {
  if (role === 'user') {
    window.location.href = '/client.html';
    return;
  }
  if (role === 'employee' || role === 'admin') {
    window.location.href = '/staff.html';
  }
}

async function initSessionRedirect() {
  if (!token) return;
  try {
    const data = await api('/api/auth/me');
    redirectByRole(data.user.role);
  } catch {
    token = '';
    localStorage.removeItem('token');
  }
}

function setAuthMode(mode) {
  const nextMode = mode === 'register' ? 'register' : 'login';
  const login = authForms.login;
  const register = authForms.register;
  if (!login || !register) return;

  login.hidden = nextMode !== 'login';
  register.hidden = nextMode !== 'register';

  modeButtons.forEach((button) => {
    const isActive = button.dataset.authMode === nextMode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

for (const button of modeButtons) {
  button.addEventListener('click', () => {
    setAuthMode(button.dataset.authMode);
    authStatus.textContent = '';
  });
}

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const body = formToObject(e.target);
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
    token = data.token;
    localStorage.setItem('token', data.token);
    redirectByRole(data.user.role);
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const body = formToObject(e.target);
    await api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
    authStatus.textContent = 'Compte client cree. Vous pouvez maintenant vous connecter.';
    const loginEmail = document.querySelector('#login-email');
    const registerEmail = document.querySelector('#register-email');
    if (loginEmail && registerEmail) {
      loginEmail.value = registerEmail.value;
    }
    setAuthMode('login');
    e.target.reset();
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

await initSessionRedirect();
setAuthMode('login');
