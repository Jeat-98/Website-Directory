
const GITHUB_USERNAME = "Jeat-98";
const REPOSITORY_NAME = "Website-Directory";
const BRANCH = "main";

const websiteList = document.getElementById("website-list");

async function loadWebsites() {
  try {
    websiteList.innerHTML =
      '<p class="empty-message">Loading websites...</p>';

    // Get all items in the repository root
    const apiUrl =
      `https://api.github.com/repos/${GITHUB_USERNAME}/${REPOSITORY_NAME}/contents/?ref=${BRANCH}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error("Unable to load repository folders.");
    }

    const items = await response.json();

    // Find folders only
    const folders = items.filter(
      item => item.type === "dir"
    );

    // Keep folders that contain index.html
    const results = await Promise.all(
      folders.map(async folder => {
        const folderUrl =
          `https://api.github.com/repos/${GITHUB_USERNAME}/${REPOSITORY_NAME}/contents/${encodeURIComponent(folder.name)}/index.html?ref=${BRANCH}`;

        const fileResponse = await fetch(folderUrl);

        return fileResponse.ok ? folder : null;
      })
    );

    const websites = results
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    websiteList.innerHTML = "";

    // Show a message if no websites are found
    if (websites.length === 0) {
      websiteList.innerHTML =
        '<p class="empty-message">No websites found yet. Add a folder containing index.html.</p>';
      return;
    }

    // Create website cards and load their descriptions
    const cards = await Promise.all(
      websites.map(async folder => {
        const card = document.createElement("a");
        card.className = "website-card";
        card.href =
          `./${encodeURIComponent(folder.name)}/`;

        const title = document.createElement("h2");
        title.textContent = folder.name;

        const description = document.createElement("p");
        description.textContent =
          "Click to open this website";

        // Read description.txt from the website folder
        try {
          const descriptionUrl =
            `./${encodeURIComponent(folder.name)}/description.txt`;

          const descriptionResponse =
            await fetch(descriptionUrl);

          if (descriptionResponse.ok) {
            const text =
              (await descriptionResponse.text()).trim();

            if (text) {
              description.textContent = text;
            }
          }
        } catch (error) {
          console.error(
            `Unable to load description for ${folder.name}:`,
            error
          );
        }

        card.append(title, description);
        return card;
      })
    );

    // Display all cards
    cards.forEach(card => {
      websiteList.appendChild(card);
    });

  } catch (error) {
    websiteList.innerHTML =
      '<p class="empty-message">Unable to load websites. Please check your GitHub settings and try again.</p>';

    console.error("Website loading error:", error);
  }
}

// Load websites when the page opens
loadWebsites();
