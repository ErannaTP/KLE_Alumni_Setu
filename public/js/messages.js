// ======================================================
// AUTH GUARD
// ======================================================
let ably = null;
let channel = null;
let activeChatUserId = null;
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "{}");

if (!token || !user.id) {
  window.location.href = "/pages/login.html";
}

// ======================================================
// CONFIG
// ======================================================
const API_BASE = "http://localhost:5136/api";
const ABLY_KEY = "8F8WYw.u7oJeg:HI5m6xpMA56JN1LKc_XWYIrAqmNkGQjxiUc04Iwk8PY";

const myUserId = user.id;

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

// ======================================================
let currentChatUserId = null;
let ablyClient = null;
let ablyChannel = null;

// ======================================================
// LOAD CONVERSATIONS
// ======================================================
async function loadConversations() {
  try {
    const res = await fetch(`${API_BASE}/chat/conversations`, {
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error("Unauthorized");

    const convos = await res.json();
    renderConversationList(convos);
  } catch (err) {
    console.error("Failed to load conversations", err);
  }
}

loadConversations();

// ======================================================
// RENDER CONVERSATION LIST
// ======================================================
function renderConversationList(convos) {
  const box = document.getElementById("conversationContainer");
  box.innerHTML = "";

  if (!convos.length) {
    box.innerHTML =
      `<div class="text-gray-400 text-sm">No conversations yet</div>`;
    return;
  }

  convos.forEach(c => {
    const div = document.createElement("div");
    div.className =
      "conversation-item cursor-pointer p-3 rounded hover:bg-[#1b1b23]";

    div.innerHTML = `
      <div class="font-semibold">${c.otherUserName}</div>
      <div class="text-sm text-gray-400">
        ${c.lastMessage?.content || "No messages yet"}
      </div>
      ${
        c.unreadCount > 0
          ? `<span class="bg-purple-600 px-2 py-1 rounded text-xs">${c.unreadCount}</span>`
          : ""
      }
    `;

    div.onclick = () => openChat(c.otherUserId, c.otherUserName);
    box.appendChild(div);
  });
}


async function connectAbly() {
  const token = localStorage.getItem("token");

  const res = await fetch("http://localhost:5136/api/chat/ably-token", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const tokenRequest = await res.json();

  ably = new Ably.Realtime({
    authUrl: null,
    token: tokenRequest,
  });

  ably.connection.on("connected", () => {
    console.log("✅ Ably connected");
  });

  ably.connection.on("failed", (err) => {
    console.error("❌ Ably failed", err);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  connectAbly();
});

// ======================================================
// OPEN CHAT
// ======================================================
async function openChat(otherUserId, otherUserName) {
  currentChatUserId = otherUserId;

  document.getElementById("chatUserName").innerText = otherUserName;
  document.getElementById("chatMessages").innerHTML = "";

  if (ablyChannel) ablyChannel.unsubscribe();
  if (ablyClient) ablyClient.close();

  await loadMessages();
  setupRealtime();
}

// ======================================================
// LOAD MESSAGES
// ======================================================
async function loadMessages() {
  try {
    const res = await fetch(
      `${API_BASE}/chat/messages?userId=${encodeURIComponent(currentChatUserId)}`,
      { headers: authHeaders() }
    );

    if (!res.ok) throw new Error("Unauthorized");

    const msgs = await res.json();
    msgs.forEach(addMessageToUI);
  } catch (err) {
    console.error("Failed to load messages", err);
  }
}

// ======================================================
// REALTIME (ABLY)
// ======================================================
function setupRealtime() {
  ablyClient = new Ably.Realtime(ABLY_KEY);

  const channelName =
    myUserId < currentChatUserId
      ? `chat:${myUserId}:${currentChatUserId}`
      : `chat:${currentChatUserId}:${myUserId}`;

  ablyChannel = ablyClient.channels.get(channelName);

  ablyChannel.subscribe("new-message", async (event) => {
    const msg = event.data;
    addMessageToUI(msg);

    if (msg.receiverId === myUserId) {
      await fetch(`${API_BASE}/chat/${msg.id}/seen`, {
        method: "POST",
        headers: authHeaders(),
      });
    }
  });

  ablyChannel.subscribe("seen-message", (event) => {
    const el = document.getElementById(`msg-${event.data.id}`);
    if (el) {
      el.querySelector(".msg-status").innerText = "✓✓ seen";
    }
  });
}

// ======================================================
// SEND MESSAGE
// ======================================================
async function sendMessage() {
  const messageInput = document.getElementById("msgInput");
  const text = messageInput.value.trim();
  if (!text || !currentChatUserId) return;

  messageInput.value = "";

  // 1️⃣ Send to backend
  const res = await fetch(`${API_BASE}/chat/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      receiverId: currentChatUserId,
      content: text,
    }),
  });

  if (!res.ok) {
    console.error("Failed to send message");
    return;
  }

  const msg = await res.json();

  // 2️⃣ Render instantly
  addMessageToUI(msg);

  // 3️⃣ Refresh conversation list
  loadConversations();
}

// ======================================================
// MESSAGE BUBBLE UI
// ======================================================
function addMessageToUI(msg) {
  if (document.getElementById(`msg-${msg.id}`)) return;

  const box = document.getElementById("chatMessages");
  const mine = msg.senderId === myUserId;

  const div = document.createElement("div");
  div.id = `msg-${msg.id}`;
  div.className =
    (mine ? "ml-auto bg-purple-600" : "mr-auto bg-[#1b1b23]") +
    " p-3 rounded-xl max-w-xl text-white mb-3";

  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  div.innerHTML = `
    <div>${msg.content}</div>
    <div class="msg-status text-xs opacity-60 mt-1">
      ${time} · ${msg.seenAt ? "✓✓ seen" : "✓ sent"}
    </div>
  `;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
