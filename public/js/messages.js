// ======================================================
// AUTH GUARD
// ======================================================
let ably = null;
let ablyChannel = null;
let activeChatUserId = null;
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "/pages/alumni-login.html";
}

// ======================================================
// CONFIG
// ======================================================
const API_BASE = "http://localhost:5136/api";

let myUserId = null;

function loadMe() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("❌ No auth token found");
    return;
  }

  const payload = JSON.parse(atob(token.split(".")[1]));
  myUserId = payload.userId;

  console.log("👤 Logged in as:", myUserId);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

// ======================================================
let currentChatUserId = null;

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
  try {
    const res = await fetch(`${API_BASE}/chat/ably-token`, {
      headers: authHeaders(),
    });

    const tokenRequest = await res.json();

    ably = new Ably.Realtime({
      authCallback: (_, cb) => cb(null, tokenRequest),
    });

    ably.connection.on("connected", () => {
      console.log("✅ Ably connected as:", ably.auth.clientId);
    });

    ably.connection.on("failed", (err) => {
      console.error("❌ Ably failed", err);
    });
  } catch (err) {
    console.error("❌ Ably init error", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  connectAbly();
});

// ======================================================
// OPEN CHAT
// ======================================================
async function openChat(otherUserId, otherUserName, conversationId) {
  currentChatUserId = otherUserId;
  activeChatUserId = otherUserId;
  activeConversationId = conversationId; // 👈 IMPORTANT

  document.getElementById("chatUserName").innerText = otherUserName;
  document.getElementById("chatMessages").innerHTML = "";

  if (ablyChannel) {
    ablyChannel.unsubscribe();
    ablyChannel.detach();
  }

  await loadMessages();

  // 👀 MARK CONVERSATION AS SEEN (THIS WAS MISSING)
  await fetch(`${API_BASE}/chat/conversation/${conversationId}/seen`, {
    method: "POST",
    headers: authHeaders(),
  });

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
    return msgs;
  } catch (err) {
    console.error("Failed to load messages", err);
    return [];
  }
}

// ======================================================
// REALTIME (ABLY)
// ======================================================
function setupRealtime() {
  if (!ably || !activeChatUserId) return;

  const channelName =
    myUserId < activeChatUserId
      ? `chat:${myUserId}:${activeChatUserId}`
      : `chat:${activeChatUserId}:${myUserId}`;

  ablyChannel = ably.channels.get(channelName);

  // 🔁 Clear previous listeners safely
  ablyChannel.unsubscribe();

  ablyChannel.subscribe("delete-message", (msg) => {
    const { messageId } = msg.data;
    const el = document.getElementById(`msg-${messageId}`);
    if (el) el.remove();
  });

  // 📩 NEW MESSAGE
  ablyChannel.subscribe("new-message", async (msg) => {
    const message = msg.data;

    // Ignore messages not for this chat
    if (
      message.senderId !== activeChatUserId &&
      message.receiverId !== activeChatUserId
    ) return;

    addMessageToUI(message);

    // 🔔 Receiver acknowledges delivery
    if (message.receiverId === myUserId && !message.deliveredAt) {
      await fetch(`${API_BASE}/chat/${message.id}/delivered`, {
        method: "POST",
        headers: authHeaders(),
      });
    }

    loadConversations();
  });


  // ✅ DELIVERED listener (sender side)
  ablyChannel.subscribe("message-delivered", (msg) => {
    const { messageId } = msg.data;
    if (!messageId) return;

    const tick = document.querySelector(`#msg-${messageId} .tick`);
    if (!tick) return;

    tick.innerText = "✓✓";
    tick.classList.remove("text-blue-400");
  });

  // 👀 SEEN listener (authoritative from backend)
  ablyChannel.subscribe("message-seen", (msg) => {
    const { messageId } = msg.data;
    if (!messageId) return;

    const tick = document.querySelector(`#msg-${messageId} .tick`);
    if (!tick) return;

    tick.innerText = "✓✓";
    tick.classList.add("text-blue-400");
  });
  console.log("📡 Subscribed:", channelName);
}

// ======================================================
// SEND MESSAGE
// ======================================================
async function sendMessage() {
  const input = document.getElementById("msgInput");
  const content = input.value.trim();
  if (!content || !activeChatUserId) return;

  const res = await fetch(`${API_BASE}/chat/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      receiverId: activeChatUserId,
      content,
    }),
  });

  if (!res.ok) {
    console.error("Send failed");
    return;
  }

  const savedMessage = await res.json();

  // ✅ Optimistic UI
  addMessageToUI(savedMessage);
  input.value = "";

  // ✅ Realtime notify receiver
  if (ablyChannel) {
    ablyChannel.publish("new-message", savedMessage);
  }
}

// ======================================================
// MESSAGE BUBBLE UI
// ======================================================
function addMessageToUI(message) {
  const container = document.getElementById("chatMessages");

  if (document.getElementById(`msg-${message.id}`)) return;

  const isMine = String(message.senderId) === String(myUserId);

  const wrapper = document.createElement("div");
  wrapper.id = `msg-${message.id}`;
  wrapper.className = `flex w-full mb-3 ${isMine ? "justify-end" : "justify-start"}`;

  const bubble = document.createElement("div");
  bubble.className = `
    max-w-[65%] px-4 py-3 rounded-2xl text-sm
    ${isMine
      ? "bg-purple-600 text-white rounded-br-md"
      : "bg-[#1e1e28] text-white rounded-bl-md"}
  `;

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  bubble.innerHTML = `
    <div>${message.content}</div>
    <div class="text-[11px] mt-1 text-right text-gray-300">
      ${time}
      ${isMine
        ? `
          <span class="tick ml-1 ${message.seenAt ? "text-blue-400" : ""}">
            ${message.seenAt ? "✓✓" : "✓"}
          </span>
          <button
            onclick="deleteMessage('${message.id}')"
            class="ml-2 text-xs text-red-300 hover:text-red-500">
            🗑
          </button>
        `
        : ""}

    </div>
  `;

  wrapper.appendChild(bubble);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

async function deleteMessage(messageId) {
  const ok = confirm("Delete this message?");
  if (!ok) return;

  const res = await fetch(`${API_BASE}/chat/${messageId}/delete`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    alert("Failed to delete message");
    return;
  }

  const el = document.getElementById(`msg-${messageId}`);
  if (el) el.remove();
}

async function initMessagesPage() {
  await loadMe();
  await loadConversations();
}

initMessagesPage();

document.addEventListener("DOMContentLoaded", async () => {
  loadMe();                  // sync now
  await loadConversations(); // messages depend on myUserId
  connectAbly();
});

function appendMessage(message) {
  const isMine = message.senderId === myUserId;

  const bubble = document.createElement("div");
  bubble.className = `flex ${isMine ? "justify-end" : "justify-start"}`;

  bubble.innerHTML = `
    <div class="max-w-[65%] px-4 py-2 rounded-2xl text-sm
      ${isMine
        ? "bg-purple-600 text-white rounded-br-none"
        : "bg-[#1f1f2b] text-white rounded-bl-none"}">
      ${message.content}
    </div>
  `;

  document.getElementById("chatMessages").appendChild(bubble);
}
