// public/js/login.js
const API = "http://localhost:5136/api";

loginBtn.onclick = async () => {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.value,
      password: password.value,
    }),
  });

  const data = await res.json();
  if (!res.ok) return showError(data.message);

  localStorage.setItem("token", data.token);
  window.location.href = "/pages/profile.html";
};
