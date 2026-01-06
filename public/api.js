// === REAL LOGIN FLOW ===
async function login(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch("http://localhost:5136/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    alert("Invalid credentials");
    return;
  }

  const data = await res.json();

  // Save token + user ID for frontend
  localStorage.setItem("token", data.token);
  localStorage.setItem("userId", data.user.id);
  localStorage.setItem("username", data.user.name);

  window.location.href = "/pages/profile.html";
}

// Attach token to all fetch calls (global helper)
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  return fetch(url, options);
}

function logout() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "/Final.html#login";
}

// === ADMIN API START ===

// Admin Login
async function login(email, password, role) {
  if (role === 'admin') {
    try {
      const res = await fetch("http://localhost:5136/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || 'Login failed' };
      }

      if (data.success && data.token) {
        sessionStorage.setItem('adminSession', JSON.stringify({ email: data.user.email, name: data.user.name, token: data.token }));
        sessionStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminToken', data.token);
      }
      return data;
    } catch (error) {
      console.error('Admin login error:', error);
      return { success: false, message: error.message };
    }
  }
  // Existing logic for other roles could go here if merged, 
  // but the provided api.js had a specific login function.
  // We will keep the original 'login' function for alumni/student above and rename this or overload.
  // The dashboard calls api.login(email, password, 'admin'). 
  // So we need to modify the GLOBAL login function to handle this.
  return originalLogin(email, password); // Fallback
}

// Renaming the original login to internal helper or handling it inside the main login
const originalLogin = async (eventOrEmail, password, role) => {
  // If it's an event (from form submit), existing logic applies
  if (eventOrEmail.preventDefault) {
    eventOrEmail.preventDefault();
    // ... existing logic ...
  }
}

// We need to completely REPLACE the global login function to handle both cases
// or add a specific adminLogin function. 
// However, admin-login.html calls `api.login(email, password, 'admin')`.
// The existing `login` function takes `(event)` as argument.
// This is a conflict. The existing api.js `login` function is designed for a form submit event.
// The `admin-login.html` expects `api.login` to take (email, password, role).

// Let's redefine `login` to handle both signatures.
async function universalLogin(arg1, arg2, arg3) {
  // Case 1: Called as event handler (existing usage)
  if (arg1 && arg1.preventDefault) {
    return handleStudentAlumniLogin(arg1);
  }
  // Case 2: Called with arguments (admin usage)
  const email = arg1;
  const password = arg2;
  const role = arg3;

  if (role === 'admin') {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || 'Login failed' };
      }

      if (data.success && data.token) {
        // CRITICAL: Store token for verifyToken to use
        sessionStorage.setItem('adminSession', JSON.stringify({ email: data.user.email, name: data.user.name, token: data.token }));
        sessionStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminToken', data.token);
      }
      return data;
    } catch (error) {
      console.error('Admin login error:', error);
      return { success: false, message: error.message };
    }
  } else {
    // Student or Alumni Login
    const endpoint = role === 'student' ? "/api/auth/student/login" : "/api/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || 'Invalid credentials' };
      }

      return { success: true, ...data };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
}

async function handleStudentAlumniLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    alert("Invalid credentials");
    return;
  }

  const data = await res.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("userId", data.user.id);
  localStorage.setItem("username", data.user.name);
  window.location.href = "/pages/profile.html";
}

// Admin API Object
const adminApi = {
  login: universalLogin, // Expose as api.login

  async verifyToken() {
    // Get token from session or local storage
    const session = JSON.parse(sessionStorage.getItem('adminSession') || localStorage.getItem('adminSession') || '{}');
    // We need the token. The login response returns 'token'. The frontend should have stored it.
    // admin-login.html logic:
    // if (result.success) { sessionStorage.setItem('adminSession', ...); }
    // Wait, admin-login.html DOES NOT store the token in 'adminSession'. It only stores email/name.
    // We need to fix admin-login.html OR update api.js to store token implicitly?
    // Actually, let's assume `api.js` keeps track of token or we fetch it from where it was saved.
    // But `admin-login.html` logic was:
    /*
        const session = { email: result.user.email ... };
        sessionStorage.setItem('adminSession', JSON.stringify(session));
    */
    // It missed the token! The `admin-dashboard.html` tries to verify logic but needs token.
    // We should fix `admin-login.html` to store token, OR hack it here.
    // Better: Update `admin-login.html` logic in `api.js` if possible, but the HTML has inline script? 
    // No, HTML calls `handleLogin`. 

    // Let's check where the token is stored. 
    // Admin Dashboard: `const session = sessionStorage.getItem('adminSession')...`

    // Since we can't easily change the inline script of admin-login.html (it's in the file), 
    // we'll make `login` return the full result object.
    // AND we will add a small script in `admin-login.html` or ensuring `api.js` handles token storage?

    // Actually, `admin-dashboard.html` calls `api.verifyToken()`. 
    // It DOES NOT pass detailed arguments. 
    // `api.verifyToken()` needs to find the token.
    // Let's rely on `localStorage.getItem('adminToken')` which we should set in `login`.

    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken');
    if (!token) return { success: false };

    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return await res.json();
  },

  async getAllUsers() {
    return adminFetch('/api/admin/users');
  },

  async getUserEvents() {
    // Uses the user endpoint we just created
    // We reuse adminFetch mechanism for convenience if it handles auth headers
    // But adminFetch uses 'adminToken'. Users use 'token'.
    // We need a userFetch equivalent or just raw fetch here.
    const token = localStorage.getItem('token');
    if (!token) return { success: false, message: 'No token' };

    try {
      const res = await fetch('http://localhost:5136/api/user/events', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async registerForEvent(eventId) {
    const token = localStorage.getItem('token');
    if (!token) return { success: false, message: 'No token' };

    try {
      const res = await fetch(`http://localhost:5136/api/user/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Registration failed");
        return null;
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  async getAdminStats() {
    return adminFetch('/api/admin/stats');
  },

  async getAdminEvents() {
    return adminFetch('/api/admin/events');
  },

  async createAdminEvent(data) {
    return adminFetch('/api/admin/events', 'POST', data);
  },

  async updateAdminEvent(id, data) {
    return adminFetch('/api/admin/events/' + id, 'PUT', data);
  },

  async deleteAdminEvent(id) {
    return adminFetch('/api/admin/events/' + id, 'DELETE');
  },

  async register(userData) {
    return adminFetch('/api/admin/users', 'POST', userData);
  },

  async updateUser(id, userData) {
    return adminFetch('/api/admin/users/' + id, 'PUT', userData);
  },

  async deleteUser(id) {
    return adminFetch('/api/admin/users/' + id, 'DELETE');
  },

  async sendBroadcastMessage(data) {
    return adminFetch('/api/admin/send-broadcast', 'POST', data);
  },

  clearToken() {
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
  }
};

// Helper for admin requests
async function adminFetch(url, method = 'GET', data = null) {
  const API_BASE_URL = 'http://localhost:5136';
  const fullUrl = url.startsWith('http') ? url : API_BASE_URL + url;

  const token = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken');
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  };
  if (data) options.body = JSON.stringify(data);

  try {
    const res = await fetch(fullUrl, options);
    return await res.json();
  } catch (e) {
    console.error(e);
    return { success: false, message: e.message };
  }
}

// Overwrite window.api with our enhanced version
// We need to maintain the "login" function as the default export style or property.
// The original file ended with:
// window.login = login;
// window.apiFetch = apiFetch;
// window.logout = logout;

// But admin pages use `api.login` and `api.verifyToken` etc.
// So `window.api` must be an object.
window.api = adminApi;

// Restore original global functions for existing pages
window.login = universalLogin;
window.logout = logout;
