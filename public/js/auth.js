async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch("http://localhost:5136/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    document.getElementById("error").classList.remove("hidden");
    return;
  }

  const data = await res.json();

  localStorage.setItem("token", data.token);
  localStorage.setItem("userName", data.user.name);

  window.location.href = "/pages/feed.html";
}

// If already logged in → redirect to feed
if (localStorage.getItem("token")) {
  window.location.href = "/pages/feed.html";
}
