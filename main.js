const siteNameInput = document.getElementById("siteName");
const siteUrlInput = document.getElementById("siteUrl");
const submitBtn = document.getElementById("submitBtn");
const tableBody = document.querySelector(".table tbody");
const errorBox = document.getElementById("formError");

let bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || [];
let editIndex = null;

function isValidURL(url) {
  const pattern = /^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(\/\S*)?$/;
  return pattern.test(url);
}

function normalizeURL(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("d-none");
}

function hideError() {
  errorBox.classList.add("d-none");
}

function saveBookmarks() {
  localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
}

function renderBookmarks() {
  tableBody.innerHTML = "";
  bookmarks.forEach((bookmark, i) => {
    tableBody.innerHTML += `
      <tr>
        <th>${i + 1}</th>
        <td>${escapeHtml(bookmark.name)}</td>
        <td><a class="btn btn-success" href="${escapeHtml(bookmark.url)}" target="_blank" rel="noopener"><i class="fa fa-eye"></i> Visit</a></td>
        <td>
          <button class="btn btn-warning" onclick="editBookmark(${i})"><i class="fa fa-pen"></i> Edit</button>
          <button class="btn btn-danger" onclick="deleteBookmark(${i})"><i class="fa fa-trash"></i> Delete</button>
        </td>
      </tr>
    `;
  });
}

function handleSubmit(e) {
  e.preventDefault();
  const name = siteNameInput.value.trim();
  const url = siteUrlInput.value.trim();

  if (name.length < 3 || !isValidURL(url)) {
    showError("Site name must be at least 3 characters and the URL must be valid.");
    return;
  }
  hideError();

  const bookmark = { name, url: normalizeURL(url) };

  if (editIndex === null) {
    bookmarks.push(bookmark);
  } else {
    bookmarks[editIndex] = bookmark;
    editIndex = null;
    submitBtn.textContent = "Submit";
  }

  saveBookmarks();
  renderBookmarks();
  clearForm();
}

function editBookmark(index) {
  const bookmark = bookmarks[index];
  siteNameInput.value = bookmark.name;
  siteUrlInput.value = bookmark.url;
  editIndex = index;
  submitBtn.textContent = "Update";
  siteNameInput.focus();
}

function deleteBookmark(index) {
  bookmarks.splice(index, 1);
  saveBookmarks();
  renderBookmarks();
}

function clearForm() {
  siteNameInput.value = "";
  siteUrlInput.value = "";
}

submitBtn.addEventListener("click", handleSubmit);

renderBookmarks();

window.deleteBookmark = deleteBookmark;
window.editBookmark = editBookmark;
