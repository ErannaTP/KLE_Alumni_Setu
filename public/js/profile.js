// public/js/profile.js

const API_BASE = "http://localhost:5136/api";

// -------------------------------
// AUTH
// -------------------------------
const token = localStorage.getItem("token");

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// -------------------------------
// DOM READY
// -------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const role = localStorage.getItem("role");

  if (!token || !role) {
    window.location.href = "/pages/alumni-login.html";
    return;
  }

  // Domains must exist for BOTH
  renderDomainCheckboxes();

  await loadProfile();
  setLoggedInRoleBadge();

  loadConnectionStats();
});

// -------------------------------
// DOMAINS
// -------------------------------
const availableDomains = [
  "Cybersecurity",
  "Data Science",
  "Artificial Intelligence",
  "Software Engineering",
  "Machine Learning",
  "Database Systems",
  "Web Development",
  "Mobile App Development",
  "Cloud Computing",
  "Networking",
];

function renderDomainCheckboxes() {
  const box = document.getElementById("profile-domains-checkboxes");
  if (!box) return;

  box.innerHTML = "";

  availableDomains.forEach(d => {
    box.innerHTML += `
      <label class="flex items-center gap-2">
        <input type="checkbox" name="profile-domains" value="${d}" disabled />
        ${d}
      </label>
    `;
  });
}

// -------------------------------
// LOAD PROFILE
// -------------------------------
async function loadProfile() {
  try {
    const role = localStorage.getItem("role");

    const endpoint =
      role === "STUDENT"
        ? `${API_BASE}/student/profile`
        : `${API_BASE}/user/profile`;

    const res = await fetch(endpoint, { headers: authHeaders() });
    if (!res.ok) throw new Error("Unauthorized");

    const user = await res.json();

    // Basic info
    document.getElementById("profile-avatar").innerText =
      (user.name || "U")[0].toUpperCase();

    document.getElementById("profile-name-display").innerText = user.name;
    document.getElementById("profile-name").value = user.name || "";
    document.getElementById("profile-bio").value = user.bio || "";
    document.getElementById("profile-batch").value = user.batchYear || "";

    // Domains (BOTH)
    const domains = user.domains || [];
    document
      .querySelectorAll('input[name="profile-domains"]')
      .forEach(box => {
        box.checked = domains.includes(box.value);
      });

    if (role === "STUDENT") {
      ["profile-company", "profile-position"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.closest("div").style.display = "none";
      });
    } else {
      document.getElementById("profile-company").value = user.company || "";
      document.getElementById("profile-position").value = user.position || "";
    }
  } catch (err) {
    console.error(err);
    alert("Error loading profile");
  }
}

// -------------------------------
// REMOVE STUDENT FIELDS
// -------------------------------
function removeStudentForbiddenFields() {
  ["profile-company", "profile-position"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.closest("div")?.remove();
  });
}

// -------------------------------
// EDIT PROFILE
// -------------------------------
function toggleEditProfile() {
  const role = localStorage.getItem("role");

  ["profile-bio", "profile-batch"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });

  // Domains editable for BOTH
  document
    .querySelectorAll('input[name="profile-domains"]')
    .forEach(box => (box.disabled = false));

  if (role === "ALUMNI") {
    ["profile-company", "profile-position"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });
  }

  document.getElementById("edit-profile-btn").classList.add("hidden");
  document.getElementById("save-profile-btn").classList.remove("hidden");
}

// -------------------------------
// SAVE PROFILE
// -------------------------------
async function saveProfile() {
  try {
    const role = localStorage.getItem("role");

    const endpoint =
      role === "STUDENT"
        ? `${API_BASE}/student/profile`
        : `${API_BASE}/user/profile`;

    const payload = {
      bio: document.getElementById("profile-bio").value,
      batchYear: document.getElementById("profile-batch").value,
      domains: Array.from(
        document.querySelectorAll('input[name="profile-domains"]:checked')
      ).map(b => b.value),
    };

    if (role === "ALUMNI") {
      payload.company = document.getElementById("profile-company").value;
      payload.position = document.getElementById("profile-position").value;
    }

    // VALIDATION: Bio + at least 2 domains required
    if (!payload.bio || payload.domains.length < 2) {
      alert("Please complete your profile:\n- Add a Bio\n- Select at least 2 Domains");
      return;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Unauthorized");

    alert("Profile saved successfully");
    window.location.href = "/pages/feed.html";

    if (role === "ALUMNI") {
      window.location.href = "/pages/feed.html";
    }
  } catch (err) {
    console.error(err);
    alert("Failed to save profile");
  }
}

// -------------------------------
// HEADER ROLE BADGE
// -------------------------------
function setLoggedInRoleBadge() {
  const role = localStorage.getItem("role");
  const el = document.getElementById("logged-role");
  if (!el) return;
  el.innerText =
    role === "STUDENT" ? "Logged in as Student" : "Logged in as Alumni";
}

// -------------------------------
// CONNECTION STATS (ALUMNI ONLY)
// -------------------------------
async function loadConnectionStats() {
  const res = await fetch(`${API_BASE}/connections/stats`, {
    headers: authHeaders(),
  });
  if (!res.ok) return;
  const data = await res.json();
  document.getElementById("connections-count").innerText = data.connections;
  document.getElementById("pending-count").innerText = data.pending;
}

// -------------------------------
// EXPORTS
// -------------------------------
window.toggleEditProfile = toggleEditProfile;
window.saveProfile = saveProfile;
