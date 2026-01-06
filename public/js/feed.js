// 🔐 reuse token from feed.html (DO NOT redeclare)
let loggedInUserId = null;

function resolveLoggedInUserFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const payload = JSON.parse(atob(token.split(".")[1]));
  loggedInUserId = payload.userId;
}


const authToken = localStorage.getItem("token");



const API_BASE = "http://localhost:5136/api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${authToken}`,
});

const feedContainer = document.getElementById("postFeed");
const loadingEl = document.getElementById("loading");

let skip = 0;
const take = 10;
let isLoading = false;
let hasMore = true; // Prevents infinite loop when no more posts

let currentHashtag = null;
let currentDomain = null;
let searchText = "";

let notifications = [];

// -----------------------
// RENDER POST
// -----------------------
function renderPost(post) {
  const div = document.createElement("div");
  div.id = `post-${post.id}`;
  div.className =
    "post-card bg-white p-6 rounded-lg shadow-md border border-gray-300";

  const userName = post.user?.name || "Unknown User";
  const initial = userName.charAt(0).toUpperCase();

  const domain = post.domain || "General";

  const hashtagsHtml = (post.hashtags || [])
    .map(
      t =>
        `<span class="hashtag" onclick="searchByHashtag('#${t}')">#${t}</span>`
    )
    .join("");

  const createdAt = new Date(post.createdAt).toLocaleString();

  let imageHtml = "";
  if (post.imageUrls?.length > 0) {
    imageHtml = `
      <img src="${post.imageUrls[0]}"
           class="w-40 h-40 object-cover rounded-lg mb-4 border border-gray-300"
           alt="Post Image" />
    `;
  }

  const roleBadge =
    post.user?.role === "STUDENT"
      ? `<span class="user-badge ml-1">Student</span>`
      : `<span class="user-badge ml-1">Alumni</span>`;

  div.innerHTML = `
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-900 font-medium">
          ${initial}
        </div>

        <div>
          <div class="font-semibold text-gray-800 flex items-center gap-2">
            ${userName}
            <span class="user-badge ml-1">${roleBadge}</span>
          </div>

          <div class="text-sm text-gray-500">
            <span class="domain-tag">${domain}</span>
            • ${createdAt}
            ${hashtagsHtml ? `<span class="ml-2 inline-flex gap-1">${hashtagsHtml}</span>` : ""}
          </div>
        </div>
      </div>

      ${loggedInUserId && String(post.user.id) === String(loggedInUserId)
      ? `
            <div class="relative">
              <button onclick="togglePostMenu('${post.id}')"
                      class="text-xl px-2 py-1 hover:bg-gray-100 rounded">
                ⋮
              </button>

              <div id="post-menu-${post.id}"
                  class="hidden absolute right-0 mt-2 w-32 bg-white border rounded-lg shadow-lg z-50">
                <button onclick="confirmDeletePost('${post.id}')"
                        class="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          `
      : ""
    }
    </div>


    <p class="text-gray-700 mb-2 font-medium">
      ${post.title || "Untitled Post"}
    </p>

    <p class="text-gray-600 mb-4">
      ${convertHashtags(post.content || "")}
    </p>

    ${imageHtml}

    <div class="flex gap-4 mb-4">
      <button class="flex items-center gap-1 text-gray-600 hover:text-red-500"
              onclick="toggleLike('${post.id}', this)">
        ❤️ Appreciate (<span id="${post.id}-likes">${post.likesCount}</span>)
      </button>

      <button class="flex items-center gap-1 text-gray-600 hover:text-indigo-500"
              onclick="openComments('${post.id}')">
        💬 Answer (<span id="${post.id}-comments">${post.commentsCount}</span>)
      </button>
    </div>

    <div id="comments-${post.id}"
        class="hidden mt-3 pt-3 border-t border-gray-200 bg-gray-50 rounded-md">
      <div id="comments-list-${post.id}" class="mb-3"></div>

      <textarea id="comment-input-${post.id}"
                class="w-full p-2 border border-gray-300 rounded-lg mb-2"
                placeholder="Type your answer..." rows="2"></textarea>

      <button class="button-primary" onclick="submitComment('${post.id}')">
        Submit Answer
      </button>
    </div>
  `;


  feedContainer.appendChild(div);
}

// -----------------------
// LOAD FEED
// -----------------------
async function loadFeed() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  loadingEl.style.display = "block";
  loadingEl.textContent = "Loading more posts...";

  try {
    let url = `${API_BASE}/posts?skip=${skip}&take=${take}`;

    if (currentDomain) url += `&domain=${encodeURIComponent(currentDomain)}`;
    if (currentHashtag) url += `&hashtag=${encodeURIComponent(currentHashtag)}`;

    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Unauthorized");

    const posts = await res.json();
    posts.forEach(renderPost);

    skip += posts.length;
    if (posts.length < take) {
      hasMore = false;
      loadingEl.textContent = "No more posts.";
      // Keep display block so the text is visible
    } else {
      loadingEl.style.display = "none";
    }
  } catch (err) {
    console.error(err);
    loadingEl.textContent = "Failed to load posts.";
  } finally {
    isLoading = false;
    // Don't hide loadingEl here if hasMore is false, it needs to show "No more posts"
    if (hasMore) {
      loadingEl.style.display = "none";
    }
  }
}

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    loadFeed();
  }
});


async function deletePost(postId) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/posts/${postId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    alert("Failed to delete post");
    return;
  }

  // Remove post from DOM immediately
  const postEl = document.getElementById(`post-${postId}`);
  if (postEl) postEl.remove();
}

function confirmDeletePost(postId) {
  const ok = confirm("Are you sure you want to delete this post?");
  if (!ok) return;

  deletePost(postId);
}

/// -----------------------
// LIKE (FIXED)
// -----------------------
async function toggleLike(postId) {
  const res = await fetch(`${API_BASE}/posts/like`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ postId }),
  });

  if (!res.ok) return;

  const { liked } = await res.json();
  const countSpan = document.getElementById(`${postId}-likes`);

  let count = Number(countSpan.textContent) || 0;
  countSpan.textContent = liked ? count + 1 : Math.max(count - 1, 0);
}

function togglePostMenu(postId) {
  const menu = document.getElementById(`post-menu-${postId}`);
  if (!menu) return;

  menu.classList.toggle("hidden");
}

// -----------------------
// CREATE POST (WITH FORM CLEAR FIX)
// -----------------------
async function uploadPost() {
  const titleEl = document.getElementById("postTitle");
  const contentEl = document.getElementById("postContent");
  const tagsEl = document.getElementById("postHashtags");
  const domainEl = document.getElementById("postDomain");
  const imageInput = document.getElementById("postImage");

  const title = titleEl.value.trim();
  const content = contentEl.value.trim();
  const rawTags = tagsEl.value.trim();
  const domain = domainEl.value;

  if (!content) return alert("Content required");
  if (!domain) return alert("Select a domain");

  const hashtags = rawTags
    ? rawTags
      .split(/[,\s]+/)
      .map(t => t.replace("#", "").trim())
      .filter(Boolean)
    : [];

  let imageUrls = [];

  // Upload image if present
  if (imageInput.files.length > 0) {
    const form = new FormData();
    form.append("image", imageInput.files[0]);

    const imgRes = await fetch(`${API_BASE}/posts/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: form,
    });

    if (!imgRes.ok) return alert("Image upload failed");

    const imgData = await imgRes.json();
    imageUrls.push(imgData.url);
  }

  // Create post
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      title,
      content,
      domain,
      hashtags,
      imageUrls,
    }),
  });

  if (!res.ok) return alert("Failed to post");

  // -----------------------
  // ✅ CLEAR FORM (THIS WAS MISSING)
  // -----------------------
  titleEl.value = "";
  contentEl.value = "";
  tagsEl.value = "";
  domainEl.selectedIndex = 0;
  imageInput.value = "";

  // -----------------------
  // REFRESH FEED
  // -----------------------
  feedContainer.innerHTML = "";
  skip = 0;
  hasMore = true; // Reset hasMore on reload
  loadFeed();
}

// -----------------------
// COMMENTS (🔥 FIXED)
// -----------------------
async function submitComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const text = input.value.trim();
  if (!text) return;

  const res = await fetch(`${API_BASE}/posts/comment`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ postId, text }),
  });

  if (!res.ok) return;

  input.value = "";

  const countSpan = document.getElementById(`${postId}-comments`);
  countSpan.textContent = Number(countSpan.textContent) + 1;

  openComments(postId);
}

async function openComments(postId) {
  const box = document.getElementById(`comments-${postId}`);
  box.classList.toggle("hidden");
  if (box.classList.contains("hidden")) return;

  const res = await fetch(
    `${API_BASE}/posts/comments?postId=${postId}`,
    { headers: authHeaders() }
  );

  const comments = await res.json();
  const list = document.getElementById(`comments-list-${postId}`);
  list.innerHTML = "";

  comments.forEach(c => {
    list.innerHTML += `
      <div class="border p-2 rounded mb-2">
        <div class="font-semibold">${c.user.name}</div>
        <p>${c.text}</p>
      </div>
    `;
  });
}

// -----------------------
// HASHTAGS & FILTERS
// -----------------------
function convertHashtags(text) {
  return text.replace(
    /#(\w+)/g,
    (_, t) =>
      `<span class="hashtag" onclick="searchByHashtag('#${t}')">#${t}</span>`
  );
}

function searchByHashtag(hash) {
  currentHashtag = hash.replace("#", "");
  feedContainer.innerHTML = "";
  skip = 0;
  hasMore = true; // Reset hasMore on new search
  loadFeed();
}

function filterPosts() {
  currentDomain = document.getElementById("domainFilter").value;
  feedContainer.innerHTML = "";
  skip = 0;
  hasMore = true; // Reset hasMore on filter change
  loadFeed();
}

function searchPosts() {
  searchText = document.getElementById("searchBar").value.toLowerCase();
  feedContainer.innerHTML = "";
  skip = 0;
  hasMore = true; // Reset hasMore on new search
  loadFeed();
}


document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.replace("/pages/alumni-login.html");
    return;
  }

  resolveLoggedInUserFromToken();

  console.log("Feed page loggedInUserId =", loggedInUserId);

  // Reset feed state (prevents duplicates)
  skip = 0;
  feedContainer.innerHTML = "";
  isLoading = false;

  loadFeed();
});

window.uploadPost = uploadPost;
window.togglePostMenu = togglePostMenu;
window.confirmDeletePost = confirmDeletePost;
window.deletePost = deletePost;
window.toggleLike = toggleLike;
window.openComments = openComments;
window.submitComment = submitComment;
window.searchByHashtag = searchByHashtag;
window.filterPosts = filterPosts;
window.searchPosts = searchPosts;