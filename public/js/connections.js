const API = "http://localhost:5136/api";
const token = localStorage.getItem("token");

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

const loggedInUserId = localStorage.getItem("userId");
let searchTimeout = null;

/* ---------------- DOM READY ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");

  if (!input || !resultsBox) {
    console.error("Search input or results container not found");
    return;
  }

  input.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);

    if (query.length < 2) {
      resultsBox.innerHTML = "";
      return;
    }

    searchTimeout = setTimeout(() => searchUsers(query), 300);
  });

  loadRequests();
  loadConnections();
});

/* ---------------- SEARCH USERS ---------------- */
async function searchUsers(query) {
  const box = document.getElementById("searchResults");
  box.innerHTML = "<p class='text-gray-400 italic'>Searching...</p>";

  const res = await fetch(
    `${API}/user/search?q=${encodeURIComponent(query)}`,
    { headers }
  );

  if (!res.ok) {
    box.innerHTML = "<p class='text-red-500'>Search failed</p>";
    return;
  }

  const users = await res.json();
  box.innerHTML = "";

  if (!users.length) {
    box.innerHTML =
      "<p class='text-gray-400 italic'>No users found</p>";
    return;
  }

  users.forEach((user) => {
    if (user.id === loggedInUserId) return;

    box.innerHTML += `
      <div class="flex justify-between items-center border rounded-lg p-4 bg-white shadow-sm">
        <div>
          <p class="font-semibold">${user.name}</p>
          <p class="text-sm text-gray-500">${user.role}</p>
        </div>
        <button
          onclick="sendRequest('${user.id}')"
          class="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
          Connect
        </button>
      </div>
    `;
  });
}

/* ---------------- SEND REQUEST ---------------- */
async function sendRequest(receiverId) {
  const res = await fetch(`${API}/connections/request`, {
    method: "POST",
    headers,
    body: JSON.stringify({ receiverId }),
  });

  if (!res.ok) {
    alert("Failed to send request");
    return;
  }

  alert("Connection request sent!");
  document.getElementById("searchResults").innerHTML = "";
  document.getElementById("searchInput").value = "";
}

/* ---------------- LOAD PENDING REQUESTS ---------------- */
async function loadRequests() {
  const res = await fetch(`${API}/connections/requests`, { headers });
  const data = await res.json();
  const box = document.getElementById("requests");
  box.innerHTML = "";

  if (!data.length) {
    box.innerHTML =
      "<p class='text-gray-400 italic'>No pending requests</p>";
    return;
  }

  data.forEach((req) => {
    box.innerHTML += `
      <div class="flex justify-between items-center border rounded-lg p-4 bg-white shadow-sm">
        <span class="font-medium">${req.sender.name}</span>
        <div class="flex gap-2">
          <button
            onclick="accept('${req.id}')"
            class="bg-green-500 text-white px-4 py-1 rounded-lg hover:bg-green-600">
            Accept
          </button>
          <button
            onclick="remove('${req.id}')"
            class="bg-gray-200 px-4 py-1 rounded-lg hover:bg-gray-300">
            Remove
          </button>
        </div>
      </div>
    `;
  });
}

/* ---------------- LOAD CONNECTIONS ---------------- */
async function loadConnections() {
  const res = await fetch(`${API}/connections`, { headers });
  const data = await res.json();
  const box = document.getElementById("connections");
  box.innerHTML = "";

  if (!data.length) {
    box.innerHTML =
      "<p class='text-gray-400 italic'>No connections yet</p>";
    return;
  }

  data.forEach((c) => {
    const user = c.friend; // 👈 THIS IS THE KEY

    box.innerHTML += `
        <div class="border rounded-lg p-4 bg-white shadow-sm">
        <p class="font-semibold">${user.name}</p>
        <p class="text-sm text-gray-500">${user.role}</p>
        </div>
    `;
    });
}

/* ---------------- ACTIONS ---------------- */
async function accept(id) {
  const res = await fetch(
    `${API}/connections/accept/${id}`,
    {
      method: "POST",
      headers,
    }
  );

  if (!res.ok) {
    alert("Failed to accept request");
    return;
  }

  loadRequests();
  loadConnections();
}

async function remove(id) {
  const res = await fetch(
    `${API}/connections/decline/${id}`,
    {
      method: "POST",
      headers,
    }
  );

  if (!res.ok) {
    alert("Failed to remove request");
    return;
  }

  loadRequests();
}

setInterval(() => {
  loadRequests();
}, 5000);
