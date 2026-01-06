// public/js/signup.js

const API_BASE = "http://localhost:5136/api";

// ✅ EMAIL FORMAT: 01fe**bcs***@kletech.ac.in
const STUDENT_EMAIL_REGEX =
  /^01fe\d{2}bcs\d{3}@kletech\.ac\.in$/i;

// ✅ PASSWORD RULE
// - min 8 chars
// - must start with letter
// - must contain uppercase, lowercase, number, special char
const PASSWORD_REGEX =
  /^(?=[A-Za-z])(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

async function signup() {
  const name = document.getElementById("name").value.trim();
  let email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const errorBox = document.getElementById("err");
  errorBox.innerText = "";

  const branch = document.getElementById("branch").value.trim();
  const batchYear = document.getElementById("batchYear").value.trim();

  // ---------------- BASIC CHECK ----------------
  if (!name || !email || !password || !branch || !batchYear) {
    errorBox.innerText = "All fields are required";
    return;
  }

  // ---------------- EMAIL VALIDATION ----------------
  if (!STUDENT_EMAIL_REGEX.test(email)) {
    errorBox.innerText =
      "Email must be in the format 01fe**bcs***@kletech.ac.in";
    return;
  }

  // Convert email to uppercase before saving
  email = email.toUpperCase();

  // ---------------- PASSWORD VALIDATION ----------------
  if (!PASSWORD_REGEX.test(password)) {
    errorBox.innerText =
      "Password must be at least 8 characters, start with a letter, and include uppercase, lowercase, number, and special character.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/student/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        branch,
        batchYear: parseInt(batchYear),
        password,
        role: "STUDENT", // 🔥 explicit
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorBox.innerText = data.message || "Signup failed";
      return;
    }

    alert("Signup successful! Please login.");

    // Unified login page (student + alumni)
    window.location.href = "/Final.html#login";
  } catch (err) {
    console.error(err);
    errorBox.innerText = "Something went wrong. Try again.";
  }
}
