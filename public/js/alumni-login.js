async function alumniLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const err = document.getElementById("err");

  err.innerText = "";

  if (!email || !password) {
    err.innerText = "Please enter email and USN";
    return;
  }

  try {
    const res = await fetch("http://localhost:5136/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
    err.innerText = data.message || "Invalid credentials";
    return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", "ALUMNI");
    localStorage.setItem("userId", data.user.id);

    // 🔁 Redirect based on backend flag
    if (data.passwordResetRequired) {
    window.location.href = "/pages/reset-password.html";
    } else {
    window.location.href = "/pages/profile.html";
    }
    
  } catch (e) {
    err.innerText = "Something went wrong. Try again.";
  }
}
