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
  window.location.href = "/pages/login.html";
}

window.login = login;
window.apiFetch = apiFetch;
window.logout = logout;
