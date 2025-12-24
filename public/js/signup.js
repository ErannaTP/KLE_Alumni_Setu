// public/js/signup.js

const API_BASE = "http://localhost:5136/api";

async function signup() {
  // ✅ Correctly get inputs by ID
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const errorBox = document.getElementById("err");

  errorBox.innerText = "";

  if (!name || !email || !password) {
    errorBox.innerText = "All fields are required";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorBox.innerText = data.message || "Signup failed";
      return;
    }

    // ✅ DO NOT AUTO LOGIN
    alert("Signup successful. Please login.");

    // ✅ Redirect to login page ONLY
    window.location.href = "/pages/login.html";

  } catch (err) {
    console.error(err);
    errorBox.innerText = "Something went wrong. Try again.";
  }
}
