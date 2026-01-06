const API_BASE = "http://localhost:5136/api/auth";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

async function resetPassword(skip = false) {
  const token = localStorage.getItem("token");
  const err = document.getElementById("err");

  err.innerText = "";

  let newPassword = null;

  if (!skip) {
    newPassword = document.getElementById("password").value.trim();
    if (!newPassword) {
      err.innerText = "Please enter a new password or skip.";
      return;
    }
  }

  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword }),
    });

    if (!res.ok) throw new Error("Reset failed");

    // ✅ Always go to profile after reset/skip
    window.location.href = "/pages/profile.html";

  } catch (e) {
    err.innerText = "Something went wrong. Try again.";
  }
}

async function skipPassword() {
  try {
    await fetch(`${API_BASE}/reset-password`, {
      method: "POST",
      headers: authHeaders(),
    });

    window.location.href = "/pages/profile.html";
  } catch {
    alert("Failed to continue");
  }
}
