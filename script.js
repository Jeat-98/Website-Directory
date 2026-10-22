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
    : `${API_BASE}/?ref=${BRANCH}`;

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
@@ -111,106 +119,106 @@
);

// Display websites and folders containing subfolders.
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
console.warn(`Skipping ${folderPath}`, error);
return null;
}
})
);

const folderOrder = [
"Test-Website",
"Collection-Gallery_v5",
"Collection-Gallery_v7",
"Collection-Website_v8_ rev 20.10.2026",
"Collection-Gallery_Coming Soon"
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

// If a folder has index.html, open its website directly.
if (entry.hasIndex) {
return createCard(
entry.name,
description,
`./${entry.path
             .split("/")
             .map(encodeURIComponent)
             .join("/")}/`
);
}

// Otherwise, open the folder to browse its subfolders.
return createCard(
`📁 ${entry.name}`,
description === "Click to open"
? "Open to view subfolders"
: description,
getPageUrl(entry.path)
);
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
