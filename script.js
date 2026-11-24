
const GITHUB_USERNAME = "Jeat-98";
const REPOSITORY_NAME = "Website-Directory";
const BRANCH = "main";

const websiteList = document.getElementById("website-list");

if (!websiteList) {
  throw new Error('Cannot find the element with id="website-list". Check index.html.');
}

// Read the current folder path from the URL.
const params = new URLSearchParams(window.location.search);
const currentPath = (params.get("path") || "")
  .split("/")
  .filter(Boolean)
  .join("/");

const API_BASE =
  `https://api.github.com/repos/${GITHUB_USERNAME}/${REPOSITORY_NAME}/contents`;

// Preferred display order.
// Other detected folders appear alphabetically afterward.
const folderOrder = [
  "Test-Website",
  "Collection-Gallery_v5",
  "Collection-Gallery_v7",
  "Collection-Website_ v8_ rev 20.10.2026",
  "Collection-Gallery_ Coming Soon"
];

// Encode each part of a folder path.
function encodePath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

// Generate the URL for browsing a folder.
function getPageUrl(path) {
  return path
    ? `?path=${encodeURIComponent(path)}`
    : window.location.pathname;
}

// Retrieve folder contents from GitHub.
async function getFolderContents(path) {
  const encodedPath = encodePath(path);

  const endpoint = encodedPath
    ? `${API_BASE}/${encodedPath}?ref=${BRANCH}`
    : `${API_BASE}?ref=${BRANCH}`;

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/vnd.github+json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API error ${response.status} while reading "${path || "root"}".`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(`Unexpected response while reading "${path || "root"}".`);
  }

  return data;
}

// Read descriptions embedded in index.html.
const descriptionData = document.getElementById("website-descriptions");
const descriptions = descriptionData ? JSON.parse(descriptionData.textContent) : {};

function getDescription(path) {
  return descriptions[path] || "";
}

// Build a card with an always-visible description and popup editing.
function createCard(name, description, url, descriptionKey = null) {
  const card = document.createElement("article");
  card.className = "website-card";

  const titleLink = document.createElement("a");
  titleLink.className = "card-title-link";
  titleLink.href = url;

  const title = document.createElement("h2");
  title.textContent = name;
  titleLink.appendChild(title);
  card.appendChild(titleLink);

  const storageKey = descriptionKey
    ? `website-description:${descriptionKey}`
    : null;
  const savedDescription = storageKey
    ? localStorage.getItem(storageKey)
    : null;
  const initialDescription = savedDescription ?? description;

  const descriptionSection = document.createElement("section");
  descriptionSection.className = "description-section";

  const preview = document.createElement("p");
  preview.className = "description-preview";
  preview.textContent = initialDescription;
  descriptionSection.appendChild(preview);

  if (storageKey) {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "description-edit-button";
    editButton.setAttribute("aria-label", `Edit description for ${name}`);
    editButton.title = "Edit description";
    editButton.textContent = "✎";

    const dialog = document.createElement("dialog");
    dialog.className = "description-dialog";

    const dialogTitle = document.createElement("h3");
    dialogTitle.textContent = `Edit description: ${name}`;

    const textarea = document.createElement("textarea");
    textarea.value = initialDescription;
    textarea.rows = 6;
    textarea.setAttribute("aria-label", `Description for ${name}`);

    const actions = document.createElement("div");
    actions.className = "dialog-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "dialog-cancel";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => dialog.close());

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "dialog-save";
    saveButton.textContent = "Save description";
    saveButton.addEventListener("click", () => {
      const updatedDescription = textarea.value.trim();
      localStorage.setItem(storageKey, updatedDescription);
      preview.textContent = updatedDescription;
      dialog.close();
    });

    actions.append(cancelButton, saveButton);
    dialog.append(dialogTitle, textarea, actions);

    editButton.addEventListener("click", () => {
      textarea.value = preview.textContent;
      dialog.showModal();
      textarea.focus();
    });

    descriptionSection.append(editButton);
    card.append(descriptionSection, dialog);
  } else {
    card.appendChild(descriptionSection);
  }

  return card;
}

// Sort preferred folders first, then other folders alphabetically.
function sortFolders(a, b) {
  const indexA = folderOrder.indexOf(a.name);
  const indexB = folderOrder.indexOf(b.name);

  if (indexA !== -1 && indexB !== -1) {
    return indexA - indexB;
  }

  if (indexA !== -1) return -1;
  if (indexB !== -1) return 1;

  return a.name.localeCompare(b.name);
}

// Detect and display folders from the repository.
async function loadWebsites() {
  websiteList.innerHTML =
    '<p class="empty-message">Loading folders...</p>';

  try {
    // Fetch folders at the current location.
    const items = await getFolderContents(currentPath);

    const folders = items.filter(
      item => item.type === "dir"
    );

    // Inspect every folder to identify websites and subdirectories.
    const results = await Promise.all(
      folders.map(async folder => {
        const folderPath = currentPath
          ? `${currentPath}/${folder.name}`
          : folder.name;

        try {
          const contents = await getFolderContents(folderPath);

          const hasIndex = contents.some(
            item =>
              item.type === "file" &&
              item.name.toLowerCase() === "index.html"
          );

          const hasSubfolders = contents.some(
            item => item.type === "dir"
          );

          // Display website folders or folders containing subfolders.
          if (hasIndex || hasSubfolders) {
            return {
              name: folder.name,
              path: folderPath,
              hasIndex,
              hasSubfolders
            };
          }

          return null;
        } catch (error) {
          console.warn(`Skipping folder "${folderPath}":`, error);
          return null;
        }
      })
    );

    // Keep valid folders and apply the display order.
    const entries = results
      .filter(Boolean)
      .sort(sortFolders);

    websiteList.innerHTML = "";

    // Add a Back card when browsing a nested directory.
    if (currentPath) {
      const parentPath = currentPath
        .split("/")
        .slice(0, -1)
        .join("/");

      websiteList.appendChild(
        createCard(
          "← Back",
          "",
          getPageUrl(parentPath)
        )
      );
    }

    // Show a message if no matching folders exist.
    if (entries.length === 0) {
      const message = document.createElement("p");

      message.className = "empty-message";
      message.textContent = "No website folders found here.";

      websiteList.appendChild(message);
      return;
    }

    // Create cards and load descriptions.
    const cards = await Promise.all(
      entries.map(async entry => {
        const description = getDescription(entry.path);

        // Preserve the previous behavior:
        // open the website directly when index.html exists.
        if (entry.hasIndex) {
          const websiteUrl = `./${encodePath(entry.path)}/`;

          return createCard(
            entry.name,
            description,
            websiteUrl,
            entry.path
          );
        }

        // Otherwise, open the directory to browse subfolders.
        return createCard(
          `📁 ${entry.name}`,
          description,
          getPageUrl(entry.path),
          entry.path
        );
      })
    );

    cards.forEach(card => {
      websiteList.appendChild(card);
    });

  } catch (error) {
    console.error("Directory loading error:", error);

    websiteList.innerHTML = "";

    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent =
      `Unable to load folders. ${error.message}`;

    websiteList.appendChild(message);
  }
}

// Start the directory.
loadWebsites();
