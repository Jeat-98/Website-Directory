
const GITHUB_USERNAME = "Jeat-98";
const REPOSITORY_NAME = "Website-Directory";
const BRANCH = "main";

const websiteList = document.getElementById("website-list");

// Read the current folder path from the URL.
// Example: ?path=Versions
const params = new URLSearchParams(window.location.search);
const currentPath = (params.get("path") || "")
  .split("/")
  .filter(Boolean)
  .join("/");

const API_BASE =
  `https://api.github.com/repos/${GITHUB_USERNAME}/${REPOSITORY_NAME}/contents`;

function encodePath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function getPageUrl(path) {
  return path
    ? `?path=${encodeURIComponent(path)}`
    : window.location.pathname;
}

async function getFolderContents(path) {
  const encodedPath = encodePath(path);

  const endpoint = encodedPath
    ? `${API_BASE}/${encodedPath}?ref=${BRANCH}`
    : `${API_BASE}?ref=${BRANCH}`;

  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Unable to read folder: ${path || "root"} (HTTP ${response.status})`
    );
  }

  return response.json();
}

async function getDescription(path) {
  try {
    const filePath = path
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    const url = `./${filePath}/description.txt`;
    const response = await fetch(url);

    if (response.ok) {
      const text = (await response.text()).trim();

      if (text) return text;
    }
  } catch (error) {
    console.warn(`Description unavailable for ${path}`, error);
  }

  return "Click to open";
}

function createCard(name, description, url) {
const card = document.createElement("div");
card.className = "website-card";

  const title = document.createElement("h2");
  title.textContent = name;

  const detail = document.createElement("p");
  detail.textContent = description;

const link = document.createElement("a");
link.className = "website-card-link";
link.href = url;

link.append(title, detail);
card.appendChild(link);

return card;
}

async function loadWebsites() {
  websiteList.innerHTML =
    '<p class="empty-message">Loading folders...</p>';

  try {
    const items = await getFolderContents(currentPath);

    const folders = items.filter(item => item.type === "dir");

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

          // Display websites and folders containing subfolders.
if (contents.length > 0) {
  return {
    name: folder.name,
    path: folderPath,
    hasIndex,
    hasSubfolders
  };
}

return null;
        } catch (error) {
          console.warn(`Skipping ${folderPath}`, error);
          return null;
        }
      })
    );

const folderOrder = [
  "Test-Website",
  "Collection-Gallery_v5",
  "Collection-Gallery_v6",
  "Collection-Gallery_v7"
];

const entries = results
  .filter(Boolean)
  .sort((a, b) => {
    const indexA = folderOrder.indexOf(a.name);
    const indexB = folderOrder.indexOf(b.name);

    // Put manually ordered folders first.
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // Automatically sort all other folders alphabetically.
    return a.name.localeCompare(b.name);
  });

    websiteList.innerHTML = "";

    // Add navigation back to the parent folder.
    if (currentPath) {
      const parentPath = currentPath.split("/").slice(0, -1).join("/");

      const backCard = createCard(
        "← Back",
        parentPath || "Return to main directory",
        getPageUrl(parentPath)
      );

      websiteList.appendChild(backCard);
    }

    if (entries.length === 0) {
      const message = document.createElement("p");
      message.className = "empty-message";
      message.textContent = "No website folders found here.";
      websiteList.appendChild(message);
      return;
    }

    const cards = await Promise.all(
      entries.map(async entry => {
        const description = await getDescription(entry.path);

// Always open the directory listing when clicking the card.
const card = createCard(
  `📁 ${entry.name}`,
  description === "Click to open"
    ? "Open folder to view contents"
    : description,
  getPageUrl(entry.path)
);

// Add a separate button to launch the website.
if (entry.hasIndex) {
  const openButton = document.createElement("button");
  openButton.className = "edit-description-button";
  openButton.textContent = "Open Website";
  openButton.type = "button";

  openButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();

    const websiteUrl = `./${entry.path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}/`;

    window.location.href = websiteUrl;
  });

  card.appendChild(openButton);
}

return card;
      })
    );

    cards.forEach(card => websiteList.appendChild(card));

  } catch (error) {
    console.error("Directory loading error:", error);

    websiteList.innerHTML =
      '<p class="empty-message">Unable to load folders. Please check the repository and try again.</p>';
  }
}

loadWebsites();
