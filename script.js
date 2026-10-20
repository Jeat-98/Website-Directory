
const GITHUB_USERNAME = "Jeat-98";
const REPOSITORY_NAME = "Website-Directory";
const BRANCH = "main";

const websiteList = document.getElementById("website-list");

async function loadWebsites() {
  try {
    const apiUrl =
      `https://api.github.com/repos/${GITHUB_USERNAME}/${REPOSITORY_NAME}/contents/?ref=${BRANCH}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error("Unable to load repository folders.");
    }

    const items = await response.json();

    const folders = items.filter(
      item => item.type === "dir"
    );

    const results = await Promise.all(
      folders.map(async folder => {
        const folderUrl =
          `https://api.github.com/repos/${GITHUB_USERNAME}/${REPOSITORY_NAME}/contents/${encodeURIComponent(folder.name)}/index.html?ref=${BRANCH}`;

        const fileResponse = await fetch(folderUrl);

        return fileResponse.ok ? folder : null;
      })
    );

    const websites = results.filter(Boolean);

    websiteList.innerHTML = "";

    if (websites.length === 0) {
      websiteList.innerHTML =
        '<p class="empty-message">No websites found yet. Add a folder containing index.html.</p>';
      return;
    }

    websites.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    websites.forEach(folder => {
      const card = document.createElement("a");
      card.className = "website-card";
      card.href = `./${encodeURIComponent(folder.name)}/`;
      
      const title = document.createElement("h2");
      title.textContent = folder.name;

      const description = document.createElement("p");
      description.textContent = "Click to open this website";

      card.append(title, description);
      websiteList.appendChild(card);
    });
  } catch (error) {
    websiteList.innerHTML =
      '<p class="empty-message">Unable to load websites. Please check your GitHub settings and try again.</p>';

    console.error(error);
  }
}

loadWebsites();
