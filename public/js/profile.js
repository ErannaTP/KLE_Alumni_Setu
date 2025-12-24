// public/js/profile.js

const API_BASE = "http://localhost:5136/api/user";

// -------------------------------
// AUTH CHECK
// -------------------------------
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/pages/login.html";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// -------------------------------
// DOM READY
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderDomainCheckboxes();
  loadProfile();
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
  box.innerHTML = "";

  availableDomains.forEach((d) => {
    box.innerHTML += `
      <label class="domain-checkbox-label flex items-center gap-2">
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
    const res = await fetch(`${API_BASE}/profile`, {
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error("Unauthorized");

    const user = await res.json();

    // Avatar
    document.getElementById("profile-avatar").textContent =
      (user.name || "U")[0].toUpperCase();

    // Display name (LOCKED)
    document.getElementById("profile-name-display").innerText = user.name;

    // Inputs
    document.getElementById("profile-name").value = user.name || "";
    document.getElementById("profile-bio").value = user.bio || "";
    document.getElementById("profile-company").value = user.company || "";
    document.getElementById("profile-position").value = user.position || "";
    document.getElementById("profile-batch").value = user.batchYear || "";

    // Domains
    const domains = user.domains || [];

    document.querySelectorAll('input[name="profile-domains"]').forEach((box) => {
      box.checked = domains.includes(box.value);
    });

  } catch (err) {
    console.error(err);
    alert("Error loading profile");
  }
}

async function loadConnectionStats() {
  const res = await fetch("http://localhost:5136/api/connections/stats", {
    headers: authHeaders(),
  });

  if (!res.ok) return;

  const data = await res.json();
  document.getElementById("connections-count").innerText = data.connections;
  document.getElementById("pending-count").innerText = data.pending;
}

function goToConnections() {
  window.location.href = "/pages/connections.html";
}

// -------------------------------
// EDIT PROFILE
// -------------------------------
function toggleEditProfile() {
  // ❌ DO NOT ENABLE NAME FIELD
  [
    "profile-bio",
    "profile-company",
    "profile-position",
    "profile-batch",
  ].forEach((id) => (document.getElementById(id).disabled = false));

  document
    .querySelectorAll('input[name="profile-domains"]')
    .forEach((box) => (box.disabled = false));

  document.getElementById("edit-profile-btn").classList.add("hidden");
  document.getElementById("save-profile-btn").classList.remove("hidden");
}

// -------------------------------
// SAVE PROFILE ✅ FIXED
// -------------------------------
async function saveProfile() {
  const bio = document.getElementById("profile-bio").value.trim();
  const company = document.getElementById("profile-company").value.trim();
  const position = document.getElementById("profile-position").value.trim();
  const batchYear = document.getElementById("profile-batch").value.trim();

  const domains = Array.from(
    document.querySelectorAll('input[name="profile-domains"]:checked')
  ).map((b) => b.value);

  if (!bio || domains.length === 0) {
    alert("Bio and at least one domain are required");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        bio,
        company,
        position,
        batchYear,
        domains,
      }),
    });

    if (!res.ok) throw new Error("Save failed");

    alert("Profile saved successfully!");
    window.location.replace("/pages/feed.html");

  } catch (err) {
    console.error(err);
    alert("Failed to save profile");
  }
}

// -------------------------------
// EXPORTS
// -------------------------------
window.toggleEditProfile = toggleEditProfile;
window.saveProfile = saveProfile;
