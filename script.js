
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

// Preferred display order.
// Any other folders will appear alphabetically afterward.
const folderOrder = [
  "Test-Website",
  "Collection-Gallery_v5",
  "Collection-Gallery_v6",
  "Collection-Gallery_v7"
];

// Encode each path segment safely.
function encodePath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

// Generate the URL for browsing a directory.
function getPageUrl(path) {
  return path
    ? `?path=${encodeURIComponent(path)}`
    : window.location.pathname;
}

// Retrieve the latest folder contents from GitHub.
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
      `Unable to read folder "${path || "root"}". HTTP ${response.status}`
    );
  }

  return response.json();
}

// Read the description from each folder's description.txt.
async function getDescription(path) {
  try {
    const filePath = path
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    const url = `./${filePath}/description.txt`;
    const response = await fetch(url, { cache: "no-store" });

    if (response.ok) {
      const text = (await response.text()).trim();

      if (text) {
        return text;
      }
    }
  } catch (error) {
    console.warn(
      `Description unavailable for "${path}"`,
      error
    );
  }

  return "Click to open";
}

// Create a folder or website card.
function createCard(name, description, url) {
  const card = document.createElement("a");
  card.className = "website-card";
  card.href = url;

  const title = document.createElement("h2");
  title.textContent = name;

  const detail = document.createElement("p");
  detail.textContent = description;

  card.append(title, detail);

  return card;
}

// Sort preferred folders first, then all other folders alphabetically.
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

// Detect and display websites and nested directories.
async function loadWebsites() {
  websiteList.innerHTML =
    '<p class="empty-message">Loading folders...</p>';

  try {
    // Get folders at the current repository location.
    const items = await getFolderContents(currentPath);

    const folders = items.filter(
      item => item.type === "dir"
    );

    // Inspect each folder to determine whether it is a website
    // or contains other folders.
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

          // Preserve the previous behavior:
          // show website folders or folders containing subfolders.
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
          console.warn(
            `Skipping folder "${folderPath}"`,
            error
          );

          return null;
        }
      })
    );

    // Remove invalid entries and sort the remaining folders.
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

      const backCard = createCard(
        "← Back",
        parentPath || "Return to main directory",
        getPageUrl(parentPath)
      );

      websiteList.appendChild(backCard);
    }

    // Display a message if no matching folders exist.
    if (entries.length === 0) {
      const message = document.createElement("p");
      message.className = "empty-message";
      message.textContent = "No website folders found here.";

      websiteList.appendChild(message);
      return;
    }

    // Build cards and load their descriptions.
    const cards = await Promise.all(
      entries.map(async entry => {
        const description = await getDescription(entry.path);

        // Preserve the previous behavior:
        // folders with index.html open their website directly.
        if (entry.hasIndex) {
          const websiteUrl =
            `./${encodePath(entry.path)}/`;

          return createCard(
            entry.name,
            description,
            websiteUrl
          );
        }

        // Folders without index.html open their directory listing.
        return createCard(
          `📁 ${entry.name}`,
          description === "Click to open"
            ? "Open to view subfolders"
            : description,
          getPageUrl(entry.path)
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
      "Unable to load folders. Check the repository, branch, and GitHub API availability.";

    websiteList.appendChild(message);
  }
}

// Start loading the directory.
loadWebsites();
