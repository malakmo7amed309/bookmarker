const $ = (id) => document.getElementById(id);
const KEY = "bookmarks";
const COLORS = ["#d9482b", "#2a7f62", "#3a6ea5", "#8a5cb5", "#c07a12", "#b83a6b"];
const ICON = {
  pin: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 17v5M8 3h8l-1 7 3 3v2H6v-2l3-3z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  pinOff: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 17v5M8 3h8l-1 7 3 3v2H6v-2l3-3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

let bookmarks = load();
let editId = null;
let lastDeleted = null;
let toastTimer = null;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY)) || [];
    // v1 items had no id, tag, pin or date: upgrade them in place
    return raw.map((b, i) => ({ id: b.id || "b" + Date.now() + i, name: b.name, url: b.url, tag: b.tag || "", pinned: !!b.pinned, added: b.added || Date.now() - (raw.length - i) }));
  } catch { return []; }
}
const save = () => localStorage.setItem(KEY, JSON.stringify(bookmarks));
const isValidURL = (u) => /^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(:\d+)?(\/\S*)?$/.test(u);
const normalizeURL = (u) => (/^https?:\/\//i.test(u) ? u : "https://" + u);
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const colorFor = (s) => COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

function showError(m) { $("formError").textContent = m; $("formError").classList.remove("d-none"); }
function hideError() { $("formError").classList.add("d-none"); }

function toast(msg, undo) {
  $("toastMsg").textContent = msg;
  $("undoBtn").classList.toggle("d-none", !undo);
  $("toast").classList.remove("d-none");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").classList.add("d-none"); lastDeleted = null; }, 5000);
}

function visible() {
  const q = $("search").value.trim().toLowerCase();
  const tag = $("tagFilter").value;
  let list = bookmarks.filter((b) =>
    (!tag || b.tag === tag) && (!q || (b.name + " " + b.url + " " + b.tag).toLowerCase().includes(q)));
  const sort = $("sort").value;
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "pinned") list.sort((a, b) => b.pinned - a.pinned || b.added - a.added);
  else list.sort((a, b) => b.added - a.added);
  return list;
}

function renderTags() {
  const tags = [...new Set(bookmarks.map((b) => b.tag).filter(Boolean))].sort();
  const cur = $("tagFilter").value;
  $("tagFilter").innerHTML = '<option value="">All tags</option>' + tags.map((t) => `<option>${esc(t)}</option>`).join("");
  $("tagFilter").value = tags.includes(cur) ? cur : "";
  $("tagList").innerHTML = tags.map((t) => `<option value="${esc(t)}">`).join("");
}
function esc(v) { const d = document.createElement("div"); d.textContent = v; return d.innerHTML.replace(/"/g, "&quot;"); }

function render() {
  renderTags();
  const list = visible();
  $("empty").classList.toggle("d-none", bookmarks.length > 0);
  $("count").textContent = bookmarks.length ? `Showing ${list.length} of ${bookmarks.length}` : "";
  $("list").innerHTML = list.map((b) => `
    <li class="card${b.pinned ? " pinned" : ""}">
      <button class="pin" data-act="pin" data-id="${b.id}" aria-pressed="${b.pinned}" aria-label="${b.pinned ? "Unpin" : "Pin"} ${esc(b.name)}">${b.pinned ? ICON.pin : ICON.pinOff}</button>
      <div class="top">
        <span class="avatar" style="background:${colorFor(host(b.url))}" aria-hidden="true">${esc(b.name.trim()[0].toUpperCase())}</span>
        <div><div class="name">${esc(b.name)}</div><div class="host">${esc(host(b.url))}</div></div>
      </div>
      ${b.tag ? `<span class="tag">${esc(b.tag)}</span>` : ""}
      <div class="actions">
        <a class="visit" href="${esc(b.url)}" target="_blank" rel="noopener">Visit ${ICON.link}</a>
        <button data-act="copy" data-id="${b.id}">Copy link</button>
        <button data-act="edit" data-id="${b.id}">Edit</button>
        <button data-act="delete" data-id="${b.id}">Delete</button>
      </div>
    </li>`).join("");
}

function resetForm() {
  $("siteName").value = ""; $("siteUrl").value = ""; $("siteTag").value = "";
  editId = null;
  $("submitBtn").textContent = "Save bookmark";
  $("cancelBtn").classList.add("d-none");
}

$("bookmarkForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("siteName").value.trim();
  const rawUrl = $("siteUrl").value.trim();
  const tag = $("siteTag").value.trim().toLowerCase().slice(0, 20);
  if (name.length < 3) return showError("Site name must be at least 3 characters.");
  if (!isValidURL(rawUrl)) return showError("Enter a valid URL, for example example.com.");
  const url = normalizeURL(rawUrl);
  if (bookmarks.some((b) => b.id !== editId && b.url.replace(/\/$/, "").toLowerCase() === url.replace(/\/$/, "").toLowerCase()))
    return showError("That URL is already saved.");
  hideError();
  if (editId) {
    const b = bookmarks.find((x) => x.id === editId);
    Object.assign(b, { name, url, tag });
    toast("Bookmark updated");
  } else {
    bookmarks.push({ id: "b" + Date.now(), name, url, tag, pinned: false, added: Date.now() });
    toast("Bookmark saved");
  }
  save(); resetForm(); render();
});
$("bookmarkForm").addEventListener("input", hideError);
$("cancelBtn").addEventListener("click", () => { resetForm(); hideError(); });

$("list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const b = bookmarks.find((x) => x.id === btn.dataset.id);
  if (!b) return;
  const act = btn.dataset.act;
  if (act === "pin") { b.pinned = !b.pinned; save(); render(); }
  else if (act === "copy") {
    (navigator.clipboard ? navigator.clipboard.writeText(b.url) : Promise.reject()).then(() => toast("Link copied"), () => toast("Could not copy. Copy it from the address after Visit."));
  } else if (act === "edit") {
    editId = b.id;
    $("siteName").value = b.name; $("siteUrl").value = b.url; $("siteTag").value = b.tag;
    $("submitBtn").textContent = "Update bookmark";
    $("cancelBtn").classList.remove("d-none");
    $("siteName").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (act === "delete") {
    lastDeleted = { b, index: bookmarks.indexOf(b) };
    bookmarks = bookmarks.filter((x) => x.id !== b.id);
    save(); render();
    toast("Bookmark deleted", true);
  }
});
$("undoBtn").addEventListener("click", () => {
  if (!lastDeleted) return;
  bookmarks.splice(lastDeleted.index, 0, lastDeleted.b);
  lastDeleted = null; save(); render();
  $("toast").classList.add("d-none");
});

["search", "tagFilter", "sort"].forEach((id) => $(id).addEventListener("input", render));

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "bookmarks.json"; a.click();
  URL.revokeObjectURL(a.href);
});
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error();
    let added = 0;
    data.forEach((x, i) => {
      if (!x || typeof x.name !== "string" || typeof x.url !== "string" || !isValidURL(x.url)) return;
      const url = normalizeURL(x.url);
      if (bookmarks.some((b) => b.url.toLowerCase() === url.toLowerCase())) return;
      bookmarks.push({ id: "b" + Date.now() + i, name: x.name.trim().slice(0, 80) || host(url), url, tag: String(x.tag || "").slice(0, 20), pinned: !!x.pinned, added: Date.now() + i });
      added++;
    });
    save(); render(); toast(`Imported ${added} bookmark${added === 1 ? "" : "s"}`);
  } catch { toast("That file is not a valid bookmarks export."); }
});

save();
render();
