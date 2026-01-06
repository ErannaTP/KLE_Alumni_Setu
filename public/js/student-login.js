// public/js/student-login.js

const API_BASE = "http://localhost:5136/api";

async function studentLogin() {
  let email = document.getElementById("studentEmail").value.trim();
  const password = document.getElementById("studentPassword").value;
  const err = document.getElementById("studentErr");

  err.innerText = "";

  if (!email || !password) {
    err.innerText = "Please enter email and password";
    return;
  }

  email = email.toUpperCase(); // 🔥 FIX

  try {
    const res = await fetch(`${API_BASE}/auth/student/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });


    const data = await res.json();

    if (!res.ok) {
      err.innerText = data.message || "Invalid credentials";
      return;
    }

    // ✅ Save token
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", "STUDENT");
    localStorage.setItem("userId", data.user.id);

    // ✅ Redirect to profile (profile guard already exists)
    window.location.href = "/pages/profile.html";

  } catch (e) {
    console.error(e);
    err.innerText = "Something went wrong. Try again.";
  }
}
