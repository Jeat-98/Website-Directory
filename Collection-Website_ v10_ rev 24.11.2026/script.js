const SUPABASE_URL = "https://sdgjmpgiqmjlhkmazwfr.supabase.co";
const SUPABASE_KEY = "sb_publishable_b__dR4LyPZReGNwK1tyyqQ_BkeelgJ4";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let allItems = [];
let availableIPBrands = [];
let editingItemId = null;
window.editingImageUrls = null;
let formImageItems = [];
let originalEditImageUrls = [];
let originalEditStorageUrls = [];


/* ==============================
   LOAD IP / BRAND LABELS
============================== */

async function loadIPBrands() {
    const { data, error } = await supabaseClient
        .from("IPBrands")
        .select("id, name")
        .order("name", { ascending: true });

    if (error) {
        console.error("Unable to load IP / Brands:", error);
        return;
    }

    availableIPBrands = (data || [])
        .map(row => String(row.name || "").trim())
        .filter(Boolean);

    renderIPBrandCheckboxes();
    renderIPBrandFilter();
}

/* ==============================
   LOAD ITEMS
============================== */

async function loadItems() {

    const { data, error } = await supabaseClient
        .from("Stamps")
        .select("*")
        .order("collection_date", { ascending: false });

    if (error) {

        console.error("Supabase error:", error);

        document.getElementById("gallery").innerHTML = `
            <div class="empty">
                <h2>Unable to load collection</h2>
                <p>${error.message}</p>
            </div>
        `;

        return;
    }

    allItems = data || [];

    renderIPBrandFilter();
    renderIPBrandCheckboxes();

    displayItems(allItems);
}

/* ==============================
   FILTER + SORT
============================== */

function filterItems() {

    const searchText =
        document.getElementById("searchInput")
            .value
            .toLowerCase()
            .trim();

    const selectedCategories = Array.from(
        document.querySelectorAll('input[name="categoryFilterOption"]:checked:not([data-all])')
    ).map(input => input.value.trim().toLowerCase());

    const selectedIPBrands = Array.from(
        document.querySelectorAll('input[name="ipBrandFilterOption"]:checked:not([data-all])')
    ).map(input => input.value);

    const favoriteFilter =
        document.getElementById("favoriteFilter").value;

    const sortFilter =
        document.getElementById("sortFilter").value;


    let filtered = allItems.filter(item => {

        /* ==============================
           SEARCH
        ============================== */

        const matchesSearch =
            !searchText ||
            (item.name || "")
                .toLowerCase()
                .includes(searchText) ||

            (item.description || "")
                .toLowerCase()
                .includes(searchText) ||

            (item.location || "")
                .toLowerCase()
                .includes(searchText) ||

            (Array.isArray(item.ip_brands) ? item.ip_brands : [])
                .some(name => String(name || "").toLowerCase().includes(searchText));


        /* ==============================
           CATEGORY
        ============================== */

        const itemCategories =
            Array.isArray(item.category)
                ? item.category
                : typeof item.category === "string"
                    ? [item.category]
                    : [];


        const normalizedItemCategories =
            itemCategories
                .map(categoryName =>
                    String(categoryName || "")
                        .trim()
                        .toLowerCase()
                )
                .filter(Boolean);


        const matchesCategory =
            selectedCategories.length === 0 ||
            selectedCategories.some(category => normalizedItemCategories.includes(category));


        /* ==============================
           IP / BRAND
        ============================== */

        const itemIPBrands = Array.isArray(item.ip_brands)
            ? item.ip_brands
            : [];

        // OR logic: a collection matches if it has at least one selected IP / Brand.
        const matchesIPBrand =
            selectedIPBrands.length === 0 ||
            selectedIPBrands.some(name => itemIPBrands.includes(name));


        /* ==============================
           FAVORITE
        ============================== */

        let matchesFavorite = true;

        if (favoriteFilter === "favorite") {
            matchesFavorite =
                item.favorite === true;
        }

        if (favoriteFilter === "not-favorite") {
            matchesFavorite =
                item.favorite !== true;
        }


        /* ==============================
           FINAL MATCH
        ============================== */

        return (
            matchesSearch &&
            matchesCategory &&
            matchesIPBrand &&
            matchesFavorite
        );

    });


    /* ==============================
       SORT
    ============================== */

    filtered.sort((a, b) => {

        switch (sortFilter) {

            case "newest":
                return (
                    new Date(b.collection_date || 0) -
                    new Date(a.collection_date || 0)
                );

            case "oldest":
                return (
                    new Date(a.collection_date || 0) -
                    new Date(b.collection_date || 0)
                );

            case "name-asc":
                return (a.name || "")
                    .localeCompare(b.name || "");

            case "name-desc":
                return (b.name || "")
                    .localeCompare(a.name || "");

            case "price-low":
                return (a.price ?? 0) -
                       (b.price ?? 0);

            case "price-high":
                return (b.price ?? 0) -
                       (a.price ?? 0);

            default:
                return 0;
        }

    });


    displayItems(filtered);
}

/* ==============================
   FILTER FROM COLLECTION OVERVIEW
============================== */

function filterByOverviewCategory(category) {
    const cleanCategory =
        String(category || "").trim().toLowerCase();
    const checkboxes = Array.from(
        document.querySelectorAll('input[name="categoryFilterOption"]:checked:not([data-all])')
    );
    const matching = checkboxes.find(input => input.value.trim().toLowerCase() === cleanCategory);
    if (!matching) return;
    checkboxes.forEach(input => { input.checked = input === matching; });
    updateCategoryFilterLabel();
    filterItems();
}

/* ==============================
   DISPLAY ITEMS
============================== */

function displayItems(items) {

    const gallery = document.getElementById("gallery");

    updateCollectionOverview(items || []);

    if (!items || items.length === 0) {

    const hasCollection =
        allItems && allItems.length > 0;

    gallery.innerHTML = hasCollection
        ? `
            <div class="empty">
                <h2>No matching items</h2>
                <p>
                    Try changing your search or filters.
                </p>
            </div>
          `
        : `
            <div class="empty">
                <h2>No items yet</h2>
                <p>
                    Click "+ Add Item" to add your first item.
                </p>
            </div>
          `;

    return;
}


    gallery.innerHTML = items.map(item => {

        const imageUrls =
    Array.isArray(item.image_urls) &&
    item.image_urls.length > 0
        ? item.image_urls
        : item.image_url
            ? [item.image_url]
            : [];


const image =
    imageUrls.length > 0

        ? `
            <img
                id="main-image-${item.id}"
                src="${imageUrls[0]}"
                alt="${item.name || "Item"}"
            >

            ${imageUrls.length > 1 ? `<span class="image-count" aria-label="${imageUrls.length} images">📷 ${imageUrls.length}</span>` : ""}

            ${
                imageUrls.length > 1
                    ? `
                        <div class="image-thumbnails">

                            ${imageUrls.map((imageUrl, index) => `

                                <img
                                    src="${imageUrl}"
                                    class="
                                        image-thumbnail
                                        ${index === 0 ? "active" : ""}
                                    "
                                    alt="${item.name || "Item"} photo ${index + 1}"
                                    onclick="
                                        event.stopPropagation();
                                        changeMainImage(
                                            ${item.id},
                                            '${imageUrl.replace(/'/g, "\\'")}',
                                            this
                                        );
                                    "
                                >

                            `).join("")}

                        </div>
                      `
                    : ""
            }

          `

        : `
            <div class="no-image">
                No Image
            </div>
          `;


        const favoriteIcon =
            item.favorite ? "❤︎" : "♡";


        const price =
            item.price !== null &&
            item.price !== undefined
                ? `RM ${Number(item.price).toFixed(2)}`
                : "";


        /* Categories */

        const categories =
            Array.isArray(item.category)
                ? item.category.filter(
                    category =>
                        typeof category === "string" &&
                        category.trim() !== ""
                )
                : typeof item.category === "string" &&
                  item.category.trim() !== ""
                    ? [item.category]
                    : [];


        const categoryBadges =
    categories.length
        ? `
            <div class="card-categories">

                ${categories.map(category => {

                    const colors =
                        getCategoryColors(category);

                    return `
                        <span
                            class="category-badge"
                            style="
                                background: ${colors.background};
                                color: ${colors.color};
                            "
                        >
                            ${category}
                        </span>
                    `;

                }).join("")}

            </div>
          `
        : "";

        /* IP / Brand badges */
        const ipBrands = Array.isArray(item.ip_brands)
            ? item.ip_brands.filter(name => typeof name === "string" && name.trim())
            : [];

        const ipBrandBadges = ipBrands.length
            ? `
                <div class="card-ip-brands" aria-label="IP / Brand">
                    ${ipBrands.map(name => `
                        <span class="ip-brand-badge">#${escapeIPBrandHTML(name.replace(/^#+/, ""))}</span>
                    `).join("")}
                </div>
              `
            : "";


        return `

            <div class="card">

                <!-- IMAGE -->

           <div
             class="card-image"
             onclick="handleItemImageClick(event, ${item.id})"
           >
          ${image}
           </div>


                <!-- CONTENT -->

                <div class="card-content">


                    <!-- TITLE AND FAVORITE ON THE SAME LINE -->
                    <div class="card-title-row">
                        <div class="card-title">
                            ${item.name || "Unnamed Item"}
                        </div>

                        <button
                            class="favorite-button ${
                                item.favorite ? "active" : ""
                            }"
                            onclick="toggleFavorite(${item.id})"
                            title="Toggle favorite"
                            aria-label="Toggle favorite"
                        >
                            ${favoriteIcon}
                        </button>
                    </div>


                    <!-- CATEGORIES -->

                    ${categoryBadges}

                    ${ipBrandBadges}

                    <!-- DESCRIPTION -->

                    <div class="card-description">
                        ${item.description || ""}
                    </div>


                    <!-- INFORMATION -->

                    <div class="card-info">

                        ${
                            item.location
                                ? `
                                    <div class="info-row">
                                        <span class="info-icon">
                                            <svg viewBox="0 0 24 24">
                                                <path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"></path>
                                                <circle
                                                    cx="12"
                                                    cy="9"
                                                    r="2.5"
                                                ></circle>
                                            </svg>
                                        </span>

                                        <span>
                                            ${item.location}
                                        </span>
                                    </div>
                                `
                                : ""
                        }


                        ${
                            item.collection_date
                                ? `
                                    <div class="info-row">
                                        <span class="info-icon">
                                            <svg viewBox="0 0 24 24">
                                                <rect
                                                    x="3"
                                                    y="5"
                                                    width="18"
                                                    height="16"
                                                    rx="2"
                                                ></rect>

                                                <line
                                                    x1="7"
                                                    y1="3"
                                                    x2="7"
                                                    y2="7"
                                                ></line>

                                                <line
                                                    x1="17"
                                                    y1="3"
                                                    x2="17"
                                                    y2="7"
                                                ></line>

                                                <line
                                                    x1="3"
                                                    y1="9"
                                                    x2="21"
                                                    y2="9"
                                                ></line>
                                            </svg>
                                        </span>

                                        <span>
                                            ${formatDate(
                                                item.collection_date
                                            )}
                                        </span>
                                    </div>
                                `
                                : ""
                        }


                        ${
                            price
                                ? `
                                    <div class="info-row price-row">
                                        <span class="info-icon">
                                            <svg viewBox="0 0 24 24">
                                                <path d="M20 13 13 20H6a2 2 0 0 1-2-2v-7l7-7h7a2 2 0 0 1 2 2v7Z"></path>
                                                <circle
                                                    cx="15.5"
                                                    cy="8.5"
                                                    r="1.5"
                                                ></circle>
                                            </svg>
                                        </span>

                                        <span>
                                            ${price}
                                        </span>
                                    </div>
                                `
                                : ""
                        }

                    </div>


                    <!-- ACTIONS -->

                    <div class="card-actions">

                        <button
                            class="edit-button"
                            onclick="editItem(${item.id})"
                        >
                            ✏️ Edit
                        </button>


                        <button
                            class="delete-button"
                            onclick="deleteItem(${item.id})"
                        >
                            🗑️ Delete
                        </button>

                    </div>

                </div>

            </div>

        `;

    }).join("");
}

/* ==============================
   COLLECTION OVERVIEW
============================== */

function getCategoryColors(category) {

    const normalized =
        category
            .trim()
            .toLowerCase();

    /* Existing category colors */
    const fixedColors = {

        items: {
            background: "#E8E4DC",
            color: "#665F55"
        },

        lego: {
            background: "#f5dfdf",
            color: "#a34d4d"
        },

        pokemon: {
            background: "#fff3c4",
            color: "#8a6d1d"
        },

        "pokémon": {
            background: "#fff3c4",
            color: "#8a6d1d"
        },

        others: {
            background: "#dcecf7",
            color: "#52758c"
        }

    };


    if (fixedColors[normalized]) {
        return fixedColors[normalized];
    }


    /* Colors for new categories */
    const newCategoryColors = [

        {
            background: "#eadff2",
            color: "#76558a"
        },

        {
            background: "#dfeee3",
            color: "#55755d"
        },

        {
            background: "#f3e1cf",
            color: "#916844"
        },

        {
            background: "#dce8f4",
            color: "#55728f"
        },

        {
            background: "#f1dfeb",
            color: "#875b78"
        },

        {
            background: "#e3e1f1",
            color: "#625f8a"
        },

        {
            background: "#e8ecd9",
            color: "#697348"
        },

        {
            background: "#f1e4d8",
            color: "#87654c"
        }

    ];


    /*
       Generate a consistent number
       from the category name.
    */

    let hash = 0;

    for (let i = 0; i < normalized.length; i++) {

        hash =
            ((hash << 5) - hash) +
            normalized.charCodeAt(i);

        hash |= 0;
    }


    const index =
        Math.abs(hash) %
        newCategoryColors.length;


    return newCategoryColors[index];
}

/* ==============================
   COLLECTION OVERVIEW
============================== */

function updateCollectionOverview(visibleItems = allItems) {

    const collectionCount =
        document.getElementById("collectionCount");

    const categoryStats =
        document.getElementById("categoryStats");


    /* ==============================
       COLLECTION COUNT
    ============================== */

    if (collectionCount) {

        const favoriteCount =
            allItems.filter(
                item => item.favorite === true
            ).length;

        const visibleCount = visibleItems.length;
        collectionCount.textContent =
            `Showing ${visibleCount} of ${allItems.length} Items | ${favoriteCount} Favorites`;
    }


    if (!categoryStats) {
        return;
    }

    const hasActiveFilters = Boolean(
        document.getElementById("searchInput")?.value.trim() ||
        document.querySelector('input[name="categoryFilterOption"]:checked:not([data-all])') ||
        document.querySelector('input[name="ipBrandFilterOption"]:checked:not([data-all])') ||
        (document.getElementById("favoriteFilter")?.value || "all") !== "all"
    );
    categoryStats.style.display = hasActiveFilters ? "inline-flex" : "none";


    /* ==============================
       COUNT CATEGORIES
    ============================== */

    const categoryCounts = {};


    allItems.forEach(item => {

        const categories =
            Array.isArray(item.category)
                ? item.category
                : typeof item.category === "string"
                    ? [item.category]
                    : [];


        categories.forEach(category => {

            const cleanCategory =
                typeof category === "string"
                    ? category.trim()
                    : "";


            if (!cleanCategory) {
                return;
            }


            if (!categoryCounts[cleanCategory]) {
                categoryCounts[cleanCategory] = 0;
            }


            categoryCounts[cleanCategory]++;
        });

    });


    /* ==============================
       SORT CATEGORIES
    ============================== */

    const sortedCategories =
        Object.entries(categoryCounts)
            .sort(
                ([a], [b]) =>
                    a.localeCompare(b)
            );


    /* ==============================
       DISPLAY CATEGORY BADGES
    ============================== */

    categoryStats.innerHTML =
        sortedCategories
            .map(([category, count], index) => {

                const colors =
                    getCategoryColors(category);


                const selectedCategories = Array.from(
                    document.querySelectorAll('input[name="categoryFilterOption"]:checked:not([data-all])')
                ).map(input => input.value.toLowerCase());
                const isActive = selectedCategories.includes(category.toLowerCase());


return `
    <span
    class="
        category-stat
        category-stat-clickable
        ${isActive ? "active" : ""}
    "
    data-category-index="${index}"
    role="button"
    tabindex="0"

        style="
            background: ${colors.background};
            color: ${colors.color};
        "
        title="Filter by ${category}"
    >
                        ${category}

                        <span class="category-stat-count">
                            ${count}
                        </span>
                    </span>
                `;

            })
            .join("");


    /* ==============================
       CATEGORY CLICK EVENTS
    ============================== */

    const categoryBadges =
        categoryStats.querySelectorAll(
            ".category-stat-clickable"
        );


    categoryBadges.forEach(badge => {

        const index =
            Number(
                badge.dataset.categoryIndex
            );


        const category =
            sortedCategories[index]?.[0];


        badge.addEventListener(
    "click",
    () => {

        if (!category) {
            return;
        }

        filterByOverviewCategory(
            category
        );

    }
);


badge.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key !== "Enter" &&
            event.key !== " "
        ) {
            return;
        }

        event.preventDefault();

        if (!category) {
            return;
        }

        filterByOverviewCategory(
            category
        );

    }
);

    });

}

/* ==============================
   DATE
============================== */

function formatDate(date) {

    const d = new Date(date);

    const day =
        String(d.getDate()).padStart(2, "0");

    const month =
        String(d.getMonth() + 1).padStart(2, "0");

    const year =
        d.getFullYear();

    return `${day}/${month}/${year}`;
}


/* ==============================
   IMAGE PREVIEW + EDIT QUEUE
============================== */

const itemImageInput =
    document.getElementById("itemImage");

function itemImageUrls(item) {
    return Array.isArray(item?.image_urls) && item.image_urls.length
        ? [...item.image_urls]
        : item?.image_url ? [item.image_url] : [];
}

function clearFormImageItems() {
    formImageItems.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    formImageItems = [];
    originalEditImageUrls = [];
    originalEditStorageUrls = [];
    window.editingImageUrls = null;
}

function renderImagePreviews() {
    const oldContainer = document.getElementById("imagePreviewContainer");
    if (oldContainer) oldContainer.remove();
    if (!formImageItems.length) return;

    const container = document.createElement("div");
    container.id = "imagePreviewContainer";
    container.className = "image-preview-container image-management-list";

    formImageItems.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "image-preview-item";

        const preview = document.createElement("img");
        preview.className = "image-preview";
        preview.src = item.kind === "existing" ? item.url : item.previewUrl;
        preview.alt = `Item image ${index + 1}`;

        const actions = document.createElement("div");
        actions.className = "image-preview-actions";

        const replaceButton = document.createElement("button");
        replaceButton.type = "button";
        replaceButton.className = "image-action-button";
        replaceButton.textContent = "Change";
        replaceButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const picker = document.createElement("input");
            picker.type = "file";
            picker.accept = "image/*";
            picker.addEventListener("change", () => {
                const file = picker.files?.[0];
                if (!file) return;
                if (formImageItems[index]?.previewUrl) {
                    URL.revokeObjectURL(formImageItems[index].previewUrl);
                }
                formImageItems[index] = {
                    kind: "new",
                    file,
                    previewUrl: URL.createObjectURL(file)
                };
                renderImagePreviews();
            }, { once: true });
            picker.click();
        });

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-image-button";
        removeButton.textContent = "Remove";
        removeButton.setAttribute("aria-label", `Remove image ${index + 1}`);
        removeButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (formImageItems[index]?.previewUrl) {
                URL.revokeObjectURL(formImageItems[index].previewUrl);
            }
            formImageItems.splice(index, 1);
            window.editingImageUrls = formImageItems
                .filter(imageItem => imageItem.kind === "existing")
                .map(imageItem => imageItem.url);
            renderImagePreviews();
        });

        actions.append(replaceButton, removeButton);
        card.append(preview, actions);
        container.appendChild(card);
    });

    const addImageButton = document.getElementById("addImageButton");
    if (addImageButton) {
        // Keep the image previews above the action button so + New Image
        // stays at the bottom of the image section.
        addImageButton.before(container);
    } else {
        itemImageInput.parentElement.after(container);
    }
}

itemImageInput.addEventListener("change", () => {
    const files = Array.from(itemImageInput.files || []);
    files.forEach(file => formImageItems.push({
        kind: "new",
        file,
        previewUrl: URL.createObjectURL(file)
    }));
    itemImageInput.value = "";
    renderImagePreviews();
});

document.getElementById("addImageButton")?.addEventListener("click", () => {
    itemImageInput.click();
});


/* ==============================
   FORM ELEMENTS
============================== */

const addItemButton =
    document.getElementById("addItemButton");

const addForm =
    document.getElementById("addForm");

const itemForm =
    document.getElementById("itemForm");

const cancelButton =
    document.getElementById("cancelButton");

const editCloseButton =
    document.getElementById("editCloseButton");


/* ==============================
   CATEGORY MANAGER
============================== */

let availableCategories = [];


async function loadCategories() {

    const { data, error } =
        await supabaseClient
            .from("Categories")
            .select("id, name")
            .order("name", { ascending: true });

    if (error) {

        console.error(
            "Unable to load categories:",
            error
        );

        return;
    }

    availableCategories =
        (data || []).map(category => ({
            id: category.id,
            name: category.name.trim()
        }));


    console.log(
        "Categories loaded from Supabase:",
        availableCategories
    );

    renderCategoryCheckboxes();
    renderCategoryFilter();

}

document
    .getElementById("manageCategoriesButton")
    .addEventListener("click", () => {

        const container =
            document.getElementById("categoryOptions");

        if (!container) {
            return;
        }

        const isManaging =
            container.dataset.manageMode === "true";

        container.dataset.manageMode =
            isManaging ? "false" : "true";

        renderCategoryCheckboxes();
    });

/* ==============================
   EDIT CATEGORY
============================== */

async function editCategory(categoryId) {

    const category =
        availableCategories.find(
            item => item.id === categoryId
        );

    if (!category) {
        alert("Category not found.");
        return;
    }

    const oldName =
        String(category.name || "").trim();

    const newName =
        prompt(
            "Enter the new category name:",
            oldName
        );

    if (newName === null) {
        return;
    }

    const cleanName =
        newName.trim();

    if (!cleanName) {
        alert("Category name cannot be empty.");
        return;
    }

    if (
        cleanName.toLowerCase() ===
        oldName.toLowerCase()
    ) {
        return;
    }


    /* ==============================
       CHECK DUPLICATE CATEGORY
    ============================== */

    const alreadyExists =
        availableCategories.some(item =>
            item.id !== categoryId &&
            String(item.name || "")
                .trim()
                .toLowerCase() ===
            cleanName.toLowerCase()
        );

    if (alreadyExists) {
        alert("This category already exists.");
        return;
    }

/* ==============================
   UPDATE CATEGORIES TABLE
============================== */

const { data: updatedCategories, error: categoryError } =
    await supabaseClient
        .from("Categories")
        .update({
            name: cleanName
        })
        .eq("id", categoryId)
        .select();


if (categoryError) {

    console.error(
        "Unable to rename category:",
        categoryError
    );

    alert(
        "Unable to rename category: " +
        categoryError.message
    );

    return;
}


console.log(
    "CATEGORY UPDATE RESULT:",
    updatedCategories
);


/* ==============================
   CHECK WHETHER CATEGORY WAS UPDATED
============================== */

if (
    !updatedCategories ||
    updatedCategories.length === 0
) {

    console.error(
        "No category row was updated.",
        {
            categoryId: categoryId,
            oldName: oldName,
            newName: cleanName
        }
    );

    alert(
        "The category could not be updated.\n\n" +
        "No matching category row was found in Supabase."
    );

    return;
}


console.log(
    "CATEGORY UPDATED SUCCESSFULLY:",
    updatedCategories[0]
);
    


    /* ==============================
       GET ALL ITEMS DIRECTLY
    ============================== */

    const { data: items, error: itemsLoadError } =
        await supabaseClient
            .from("Stamps")
            .select("id, category");

        console.log("ITEMS FROM SUPABASE BEFORE CATEGORY UPDATE:", items);
        console.log("OLD CATEGORY:", oldName);
        console.log("NEW CATEGORY:", cleanName);


    if (itemsLoadError) {

        console.error(
            "Unable to load items:",
            itemsLoadError
        );

        alert(
            "Category was renamed, but items could not be checked: " +
            itemsLoadError.message
        );

        await loadCategories();

        return;
    }


    /* ==============================
       UPDATE ITEMS USING OLD NAME
    ============================== */

    let updatedItemCount = 0;

    for (const item of items || []) {

        const categories =
            Array.isArray(item.category)
                ? item.category
                : typeof item.category === "string"
                    ? [item.category]
                    : [];


        const hasOldCategory =
            categories.some(categoryName =>
                String(categoryName || "")
                    .trim()
                    .toLowerCase() ===
                oldName.toLowerCase()
            );


        if (!hasOldCategory) {
            continue;
        }


        const updatedCategories =
            categories.map(categoryName => {

                const currentName =
                    String(categoryName || "").trim();

                if (
                    currentName.toLowerCase() ===
                    oldName.toLowerCase()
                ) {
                    return cleanName;
                }

                return currentName;
            });


        const { error: itemError } =
            await supabaseClient
                .from("Stamps")
                .update({
                    category: updatedCategories
                })
                .eq("id", item.id);


        if (itemError) {

            console.error(
                "Unable to update item category:",
                itemError
            );

            alert(
                `Category was renamed, but item "${item.id}" could not be updated: ` +
                itemError.message
            );

            return;
        }


        updatedItemCount++;

        console.log(
         "ITEM CATEGORY UPDATED:",
         item.id,
         updatedCategories);
    }


    /* ==============================
       REFRESH EVERYTHING
    ============================== */

    await loadCategories();

    await loadItems();


    alert(
        `Category "${oldName}" has been renamed to "${cleanName}".\n\n` +
        `${updatedItemCount} item(s) updated.`
    );
}
    
function escapeIPBrandHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderIPBrandCheckboxes(selectedBrands = null) {
    const container = document.getElementById("ipBrandOptions");
    if (!container) return;

    if (selectedBrands === null) {
        selectedBrands = Array.from(
            document.querySelectorAll('input[name="itemIPBrand"]:checked')
        ).map(checkbox => checkbox.value);
    }

    const manageMode = container.dataset.manageMode === "true";

    if (container.dataset.manageClickGuard !== "true") {
        container.addEventListener("click", event => {
            if (container.dataset.manageMode === "true" &&
                !event.target.closest(".category-manage-button")) {
                event.preventDefault();
                event.stopPropagation();
            }
        });
        container.dataset.manageClickGuard = "true";
    }

    container.innerHTML = availableIPBrands.length
        ? availableIPBrands.map(name => {
            const safeName = escapeIPBrandHTML(name);
            const encodedName = encodeURIComponent(name);
            const checked = selectedBrands.includes(name) ? "checked" : "";
            return `
                <label>
                    <input
                        type="checkbox"
                        name="itemIPBrand"
                        value="${safeName}"
                        ${checked}
                        ${manageMode ? "disabled" : ""}
                    >
                    <span>${safeName}</span>
                    ${manageMode ? `
                        <span class="category-manage-actions">
                            <button
                                type="button"
                                class="category-manage-button edit-category-button"
                                title="Edit IP / Brand"
                                aria-label="Edit ${safeName}"
                                onclick="event.preventDefault(); event.stopPropagation(); editIPBrand(decodeURIComponent('${encodedName}'));"
                            >✏️</button>
                            <button
                                type="button"
                                class="category-manage-button delete-category-button"
                                title="Delete IP / Brand"
                                aria-label="Delete ${safeName}"
                                onclick="event.preventDefault(); event.stopPropagation(); deleteIPBrand(decodeURIComponent('${encodedName}'));"
                            >🗑️</button>
                        </span>
                    ` : ""}
                </label>
            `;
        }).join("")
        : '<p class="ip-brand-empty">No IP / Brand options yet. Use “Add IP / Brand” to create one.</p>';
}

/* Toggle the same edit/delete management mode used by Categories. */
document.getElementById("manageIPBrandsButton")?.addEventListener("click", () => {
    const container = document.getElementById("ipBrandOptions");
    if (!container) return;

    const selectedBrands = Array.from(
        container.querySelectorAll('input[name="itemIPBrand"]:checked')
    ).map(checkbox => checkbox.value);

    container.dataset.manageMode = container.dataset.manageMode === "true" ? "false" : "true";
    renderIPBrandCheckboxes(selectedBrands);
});

async function updateIPBrandOnCollections(oldName, newName) {
    const { data: affectedRows, error: loadError } = await supabaseClient
        .from("Stamps")
        .select("id, ip_brands")
        .contains("ip_brands", [oldName]);

    if (loadError) throw loadError;

    for (const row of affectedRows || []) {
        const current = Array.isArray(row.ip_brands) ? row.ip_brands : [];
        const updated = newName === null
            ? current.filter(name => name !== oldName)
            : current.map(name => name === oldName ? newName : name);

        const { error } = await supabaseClient
            .from("Stamps")
            .update({ ip_brands: updated })
            .eq("id", row.id);

        if (error) throw error;
    }
}

async function editIPBrand(oldName) {
    const newName = prompt("Enter the new IP / Brand name:", oldName);
    if (newName === null) return;

    const cleanName = newName.trim();
    if (!cleanName) {
        alert("IP / Brand name cannot be empty.");
        return;
    }
    if (cleanName.toLowerCase() === oldName.toLowerCase()) return;

    const duplicate = availableIPBrands.some(name =>
        name !== oldName && name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
        alert("This IP / Brand already exists.");
        return;
    }

    try {
        await updateIPBrandOnCollections(oldName, cleanName);
        const { data: renamedRows, error: renameError } = await supabaseClient
            .from("IPBrands")
            .update({ name: cleanName })
            .eq("name", oldName)
            .select("id");

        if (renameError) throw renameError;
        if (!renamedRows?.length) throw new Error("The IP / Brand catalog row was not found.");

        const selected = Array.from(
            document.querySelectorAll('input[name="itemIPBrand"]:checked')
        ).map(input => input.value).map(name => name === oldName ? cleanName : name);

        await loadIPBrands();
        await loadItems();
        const container = document.getElementById("ipBrandOptions");
        if (container) container.dataset.manageMode = "true";
        renderIPBrandCheckboxes(selected);
        alert(`IP / Brand renamed to “${cleanName}”.`);
    } catch (error) {
        console.error("Unable to rename IP / Brand:", error);
        alert("Unable to rename IP / Brand: " + error.message + "\n\nPlease check Supabase permissions and refresh the page.");
        await loadItems();
    }
}

async function deleteIPBrand(name) {
    const confirmed = confirm(
        `Delete “${name}” from your IP / Brand options?\n\nIt will also be removed from every collection that currently uses it.`
    );
    if (!confirmed) return;

    try {
        await updateIPBrandOnCollections(name, null);
        const { error: deleteError } = await supabaseClient
            .from("IPBrands")
            .delete()
            .eq("name", name);

        if (deleteError) throw deleteError;

        const selected = Array.from(
            document.querySelectorAll('input[name="itemIPBrand"]:checked')
        ).map(input => input.value).filter(value => value !== name);

        await loadIPBrands();
        await loadItems();
        const container = document.getElementById("ipBrandOptions");
        if (container) container.dataset.manageMode = "true";
        renderIPBrandCheckboxes(selected);
        alert(`“${name}” was deleted.`);
    } catch (error) {
        console.error("Unable to delete IP / Brand:", error);
        alert("Unable to delete IP / Brand: " + error.message + "\n\nPlease check Supabase permissions and refresh the page.");
        await loadItems();
    }
}

document.getElementById("addIPBrandButton")?.addEventListener("click", () => {
    const box = document.getElementById("newIPBrandBox");
    const input = document.getElementById("newIPBrandInput");
    box.style.display = "flex";
    input.focus();
});

document.getElementById("saveIPBrandButton")?.addEventListener("click", addNewIPBrand);

document.getElementById("newIPBrandInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        addNewIPBrand();
    }
});

async function addNewIPBrand() {
    const input = document.getElementById("newIPBrandInput");
    const name = input.value.trim();

    if (!name) {
        alert("Please enter an IP / Brand name.");
        input.focus();
        return;
    }

    const existing = availableIPBrands.find(
        item => item.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
        alert("This IP / Brand already exists.");
        input.focus();
        return;
    }

    const selectedBrands = Array.from(
        document.querySelectorAll('input[name="itemIPBrand"]:checked')
    ).map(checkbox => checkbox.value);

    const { data, error } = await supabaseClient
        .from("IPBrands")
        .insert({ name })
        .select("id, name")
        .single();

    if (error) {
        console.error("Unable to add IP / Brand:", error);
        alert("Unable to add IP / Brand: " + error.message);
        return;
    }

    availableIPBrands.push(data.name);
    availableIPBrands.sort((a, b) => a.localeCompare(b));
    selectedBrands.push(data.name);
    renderIPBrandCheckboxes(selectedBrands);
    renderIPBrandFilter();

    input.value = "";
    document.getElementById("newIPBrandBox").style.display = "none";
}

function renderCategoryCheckboxes(selectedCategories = null) {

    const container =
        document.getElementById("categoryOptions");

    if (!container) {
        return;
    }

    /*
       If no selected categories were supplied,
       preserve the currently checked categories.
    */
    if (selectedCategories === null) {

        selectedCategories =
            Array.from(
                document.querySelectorAll(
                    'input[name="itemCategory"]:checked'
                )
            ).map(
                checkbox => checkbox.value
            );
    }

    const manageMode =
        container.dataset.manageMode === "true";

    // In management mode, category chips are read-only; only the pencil/trash
    // action buttons should act. Stop chip clicks from triggering surrounding UI.
    if (container.dataset.manageClickGuard !== "true") {
        container.addEventListener("click", (event) => {
            if (container.dataset.manageMode === "true" &&
                !event.target.closest(".category-manage-button")) {
                event.preventDefault();
                event.stopPropagation();
            }
        });
        container.dataset.manageClickGuard = "true";
    }

    container.innerHTML =
        availableCategories.map(category => {

            const checked =
                selectedCategories.includes(category.name)
                    ? "checked"
                    : "";

            return `
                <label>

                    <input
                        type="checkbox"
                        name="itemCategory"
                        value="${category.name}"
                        ${checked}
                        ${manageMode ? "disabled" : ""}
                    >

                    <span>
                        ${category.name}
                    </span>

                    ${
                        manageMode
                            ? `
                                <span class="category-manage-actions">

                                    <button
                                        type="button"
                                        class="category-manage-button edit-category-button"
                                        title="Edit category"
                                        onclick="
                                            event.preventDefault();
                                            event.stopPropagation();
                                            editCategory(${category.id});
                                        "
                                    >
                                        ✏️
                                    </button>

                                    <button
                                        type="button"
                                        class="category-manage-button delete-category-button"
                                        title="Delete category"
                                        onclick="
                                            event.preventDefault();
                                            event.stopPropagation();
                                            deleteCategory(${category.id});
                                        "
                                    >
                                        🗑️
                                    </button>

                                </span>
                              `
                            : ""
                    }

                </label>
            `;

        }).join("");
}

function renderIPBrandFilter() {
    const filter = document.getElementById("ipBrandFilter");
    const optionsContainer = document.getElementById("ipBrandFilterOptions");
    if (!filter || !optionsContainer) return;

    const previouslySelected = Array.from(
        optionsContainer.querySelectorAll('input[name="ipBrandFilterOption"]:checked:not([data-all])')
    ).map(input => input.value);

    const selected = previouslySelected.filter(name => availableIPBrands.includes(name));

    optionsContainer.innerHTML = `
        <label class="ip-brand-filter-option filter-all-option">
            <input type="checkbox" name="ipBrandFilterOption" data-all="true" value="all" ${selected.length ? "" : "checked"}>
            <span>All IP / Brands</span>
        </label>
        ${availableIPBrands.length
        ? availableIPBrands.map(name => {
            const safeName = escapeIPBrandHTML(name);
            const checked = selected.includes(name) ? "checked" : "";
            return `
                <label class="ip-brand-filter-option">
                    <input type="checkbox" name="ipBrandFilterOption" value="${safeName}" ${checked}>
                    <span>${safeName}</span>
                </label>
            `;
        }).join("")
        : '<p class="ip-brand-filter-empty">No IP / Brands available</p>'}
    `;

    updateIPBrandFilterLabel();
}

function updateIPBrandFilterLabel() {
    const filter = document.getElementById("ipBrandFilter");
    if (!filter) return;

    const summary = filter.querySelector("summary");
    if (!summary) return;

    const selected = Array.from(
        filter.querySelectorAll('input[name="ipBrandFilterOption"]:checked:not([data-all])')
    ).map(input => input.value);

    if (selected.length === 0) {
        summary.textContent = "▦ All IP / Brands";
    } else if (selected.length === 1) {
        summary.textContent = `▦ ${selected[0]}`;
    } else {
        summary.textContent = `▦ ${selected.length} IP / Brands selected`;
    }
}

function normalizeMultiSelectFilter(event, inputName, filterId) {
    const filter = document.getElementById(filterId);
    const allOption = filter?.querySelector(`input[name="${inputName}"][data-all]`);
    const specificOptions = Array.from(
        filter?.querySelectorAll(`input[name="${inputName}"]:not([data-all])`) || []
    );
    if (!allOption) return;

    if (event.target === allOption) {
        if (allOption.checked) {
            specificOptions.forEach(input => { input.checked = false; });
        } else if (!specificOptions.some(input => input.checked)) {
            allOption.checked = true;
        }
    } else if (event.target.matches(`input[name="${inputName}"]`)) {
        if (event.target.checked) {
            allOption.checked = false;
        } else if (!specificOptions.some(input => input.checked)) {
            allOption.checked = true;
        }
    }
}


function renderCategoryFilter() {
    const filter = document.getElementById("categoryFilter");
    const options = document.getElementById("categoryFilterOptions");
    if (!filter || !options) return;

    const previouslySelected = Array.from(
        options.querySelectorAll('input[name="categoryFilterOption"]:checked:not([data-all])')
    ).map(input => input.value.toLowerCase());

    options.innerHTML = `
        <label class="category-filter-option filter-all-option">
            <input type="checkbox" name="categoryFilterOption" data-all="true" value="all" ${previouslySelected.length ? "" : "checked"}>
            <span>All Categories</span>
        </label>
        ${availableCategories.length
        ? availableCategories.map(category => {
            const safeName = escapeIPBrandHTML(category.name);
            const checked = previouslySelected.includes(category.name.toLowerCase()) ? "checked" : "";
            return `
                <label class="category-filter-option">
                    <input type="checkbox" name="categoryFilterOption" value="${safeName}" ${checked}>
                    <span>${safeName}</span>
                </label>
            `;
        }).join("")
        : '<p class="category-filter-empty">No categories available</p>'}
    `;

    updateCategoryFilterLabel();
}

function updateCategoryFilterLabel() {
    const filter = document.getElementById("categoryFilter");
    const summary = filter?.querySelector("summary");
    if (!summary) return;

    const selected = Array.from(
        filter.querySelectorAll('input[name="categoryFilterOption"]:checked:not([data-all])')
    ).map(input => input.value);

    if (selected.length === 0) {
        summary.textContent = "▦ All Categories";
    } else if (selected.length === 1) {
        summary.textContent = `▦ ${selected[0]}`;
    } else {
        summary.textContent = `▦ ${selected.length} Categories selected`;
    }
}

document
    .getElementById("addCategoryButton")
    .addEventListener("click", () => {

        const box =
            document.getElementById(
                "newCategoryBox"
            );

        const input =
            document.getElementById(
                "newCategoryInput"
            );

        box.style.display = "flex";

        input.focus();
    });


document
    .getElementById("saveCategoryButton")
    .addEventListener("click", addNewCategory);


document
    .getElementById("newCategoryInput")
    .addEventListener("keydown", event => {

        if (event.key === "Enter") {

            event.preventDefault();

            addNewCategory();
        }
    });


async function addNewCategory() {

    const input =
        document.getElementById("newCategoryInput");

    const name =
        input.value.trim();

    if (!name) {

        alert("Please enter a category name.");

        input.focus();

        return;
    }


    // Check if category already exists
    const alreadyExists =
        availableCategories.some(
            category =>
                category.name.toLowerCase() ===
                name.toLowerCase()
        );

    if (alreadyExists) {

        alert("This category already exists.");

        input.focus();

        return;
    }


    // Remember currently selected categories
    const selectedCategories =
        Array.from(
            document.querySelectorAll(
                'input[name="itemCategory"]:checked'
            )
        ).map(
            checkbox => checkbox.value
        );


    // Add new category to Supabase
    const { data, error } =
        await supabaseClient
            .from("Categories")
            .insert([
                {
                    name: name
                }
            ])
            .select()
            .single();


    if (error) {

        console.error(
            "Unable to add category:",
            error
        );

        alert(
            "Unable to add category: " +
            error.message
        );

        return;
    }


    // Add new category to local list
    availableCategories.push(data);

    availableCategories.sort(
        (a, b) =>
            a.name.localeCompare(b.name)
    );


    // Keep existing selections
    selectedCategories.push(name);


    // Rebuild checkboxes
    renderCategoryCheckboxes(
        selectedCategories
    );


    // Clear and hide new category box
    input.value = "";

    document.getElementById(
        "newCategoryBox"
    ).style.display = "none";


    // Update the main category filter
    renderCategoryFilter();
}

/* ==============================
   RESET FORM
============================== */

function resetItemForm() {

    editingItemId = null;

    itemForm.reset();
    clearFormImageItems();
    itemImageInput.value = "";

    const newCategoryBox = document.getElementById("newCategoryBox");
    const newCategoryInput = document.getElementById("newCategoryInput");
    const categoryOptions = document.getElementById("categoryOptions");
    const ipBrandOptions = document.getElementById("ipBrandOptions");
    const newIPBrandBox = document.getElementById("newIPBrandBox");
    const newIPBrandInput = document.getElementById("newIPBrandInput");
    if (newCategoryBox) newCategoryBox.style.display = "none";
    if (newCategoryInput) newCategoryInput.value = "";
    if (categoryOptions) categoryOptions.dataset.manageMode = "false";
    if (ipBrandOptions) ipBrandOptions.dataset.manageMode = "false";
    if (newIPBrandBox) newIPBrandBox.style.display = "none";
    if (newIPBrandInput) newIPBrandInput.value = "";

    // Dynamic checked attributes from an edit must not become the next
    // form's default checkbox state.
    renderCategoryCheckboxes([]);
    renderIPBrandCheckboxes([]);

    addForm.classList.remove("editing-mode");

    addForm.style.display = "none";

    addItemButton.style.display = "block";

    document.body.classList.remove(
        "editing-popup-open"
    );


    const formTitle =
        document.querySelector("#addForm h2");

    if (formTitle) {
        formTitle.textContent =
            "Add New Item";
    }


    const submitButton =
        itemForm.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {
        submitButton.textContent =
            "Save Item";
    }


    const previewContainer =
    document.getElementById("imagePreviewContainer");

if (previewContainer) {
    previewContainer.remove();
}

}

/* ==============================
   CLOSE ADD / EDIT POPUP WHEN
   CLICKING OUTSIDE
============================== */

document.addEventListener("click", (event) => {

    const addForm =
        document.getElementById("addForm");

    const addItemButton =
        document.getElementById("addItemButton");

    // Popup is not open
    if (
        !addForm ||
        addForm.style.display === "none"
    ) {
        return;
    }

    // Click inside popup
    if (addForm.contains(event.target)) {
        return;
    }

    // Click Add Item button
    if (
        addItemButton &&
        addItemButton.contains(event.target)
    ) {
        return;
    }

    // Click Edit button
    // Let editItem() handle opening the popup
    if (event.target.closest(".edit-button")) {
        return;
    }

    // Click Delete button
    // Let deleteItem() handle the action
    if (event.target.closest(".delete-button")) {
        return;
    }

    // Anything else outside → close popup
    resetItemForm();
});

/* ==============================
   ADD ITEM
============================== */


addItemButton.addEventListener("click", () => {

    editingItemId = null;
    clearFormImageItems();

    itemForm.reset();
    const categoryOptions = document.getElementById("categoryOptions");
    if (categoryOptions) categoryOptions.dataset.manageMode = "false";
    renderCategoryCheckboxes([]);
    renderIPBrandCheckboxes([]);

    const newIPBrandBox = document.getElementById("newIPBrandBox");
    const newIPBrandInput = document.getElementById("newIPBrandInput");
    if (newIPBrandBox) newIPBrandBox.style.display = "none";
    if (newIPBrandInput) newIPBrandInput.value = "";

    const formTitle =
        document.querySelector("#addForm h2");

    if (formTitle) {
        formTitle.textContent =
            "Add New Item";
    }


    const submitButton =
        itemForm.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {
        submitButton.textContent =
            "Save Item";
    }


    const previewContainer =
    document.getElementById("imagePreviewContainer");

if (previewContainer) {
    previewContainer.remove();
}


    /* Open popup */

    addForm.classList.add(
        "editing-mode"
    );

    addForm.style.display =
        "block";

    addItemButton.style.display =
        "none";


    /* Prevent background scrolling */

    document.body.classList.add(
        "editing-popup-open"
    );
});

/* ==============================
   CANCEL
============================== */
editCloseButton.addEventListener(
    "click",
    () => {
        resetItemForm();
    }
);

cancelButton.addEventListener("click", () => {

    resetItemForm();
});


/* ==============================
   SAVE / UPDATE ITEM
============================== */

function getOwnedItemStoragePath(rawUrl) {
    try {
        const parsedUrl = new URL(String(rawUrl));
        const prefix = "/storage/v1/object/public/collections/";
        if (parsedUrl.host !== new URL(SUPABASE_URL).host || !parsedUrl.pathname.startsWith(prefix)) return null;
        const path = decodeURIComponent(parsedUrl.pathname.slice(prefix.length));
        return path && !path.startsWith("/") && !path.split("/").includes("..") ? path : null;
    } catch {
        return null;
    }
}

async function removeUnreferencedItemImages(candidateUrls, keepUrls = [], excludedItemId = null) {
    const paths = new Set(candidateUrls.map(getOwnedItemStoragePath).filter(Boolean));
    for (const url of keepUrls) {
        const path = getOwnedItemStoragePath(url);
        if (path) paths.delete(path);
    }
    allItems
        .filter(item => item.id !== excludedItemId)
        .flatMap(itemImageUrls)
        .map(getOwnedItemStoragePath)
        .filter(Boolean)
        .forEach(path => paths.delete(path));
    if (!paths.size) return null;
    try {
        const { error } = await supabaseClient.storage.from("collections").remove([...paths]);
        return error || null;
    } catch (error) {
        return error;
    }
}

async function rollbackUploadedItemImages(paths) {
    if (!paths.length) return null;
    try {
        const { error } = await supabaseClient.storage.from("collections").remove(paths);
        return error || null;
    } catch (error) {
        return error;
    }
}

itemForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const uploadedPaths = [];
    const imageUrls = [];
    try {
        for (const item of formImageItems) {
            if (item.kind === "existing") {
                imageUrls.push(item.url);
                continue;
            }

            const imageFile = item.file;
            const extension = imageFile.name.includes(".")
                ? imageFile.name.split(".").pop().toLowerCase()
                : "img";
            const filePath = `stamps/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
            const { error: uploadError } = await supabaseClient.storage
                .from("collections")
                .upload(filePath, imageFile);
            if (uploadError) throw new Error(`Unable to upload image ${imageFile.name}: ${uploadError.message}`);
            uploadedPaths.push(filePath);

            const { data: publicUrlData } = supabaseClient.storage
                .from("collections")
                .getPublicUrl(filePath);
            if (!publicUrlData?.publicUrl) throw new Error(`Uploaded ${imageFile.name}, but its public URL could not be created.`);
            imageUrls.push(publicUrlData.publicUrl);
        }
    } catch (uploadFailure) {
        const rollbackError = await rollbackUploadedItemImages(uploadedPaths);
        console.error("Image upload failed:", uploadFailure, rollbackError);
        alert(`${uploadFailure.message}${rollbackError ? `\nNewly uploaded files could not all be removed: ${rollbackError.message}` : ""}`);
        return;
    }


/* ==============================
   MAIN IMAGE
============================== */

const imageUrl =
    imageUrls.length > 0
        ? imageUrls[0]
        : null;


console.log(
    "FINAL IMAGE URLS:",
    imageUrls
);

    /* ==============================
       GET SELECTED CATEGORIES
    ============================== */

    const selectedCategories =
        Array.from(
            document.querySelectorAll(
                '#categoryOptions input[name="itemCategory"]:checked'
            )
        )
        .map(input => input.value.trim())
        .filter(value => value !== "");


    console.log(
        "Selected categories:",
        selectedCategories
    );

    const selectedIPBrands = Array.from(
        document.querySelectorAll('input[name="itemIPBrand"]:checked')
    ).map(checkbox => checkbox.value);

    /* ==============================
       BUILD ITEM DATA
    ============================== */

    const item = {

        name:
            document.getElementById("itemName")
                .value
                .trim(),

        description:
            document.getElementById("itemDescription")
                .value
                .trim(),

        price:
            document.getElementById("itemPrice")
                .value
                ? Number(
                    document.getElementById("itemPrice")
                        .value
                  )
                : null,

        location:
            document.getElementById("itemLocation")
                .value
                .trim(),

        category:
            selectedCategories,

        ip_brands:
            selectedIPBrands,

        collection_date:
            document.getElementById("itemDate")
                .value || null,

        favorite:
            document.getElementById("itemFavorite")
                .checked,

        image_url:
            imageUrl,

        image_urls:
            imageUrls
};


    console.log(
        "Saving item:",
        item
    );


    /* ==============================
       UPDATE EXISTING ITEM
    ============================== */

    let saveResult;
    try {
        saveResult = editingItemId !== null
            ? await supabaseClient.from("Stamps").update(item).eq("id", editingItemId).select().single()
            : await supabaseClient.from("Stamps").insert([item]).select().single();
    } catch (saveFailure) {
        saveResult = { error: saveFailure };
    }

    if (saveResult?.error) {
        const rollbackError = await rollbackUploadedItemImages(uploadedPaths);
        console.error("Unable to save item:", saveResult.error, rollbackError);
        alert(`Unable to ${editingItemId !== null ? "update" : "add"} item: ${saveResult.error.message || saveResult.error}${rollbackError ? `\nNewly uploaded files could not all be removed: ${rollbackError.message}` : ""}`);
        return;
    }

    console.log("Item saved successfully:", saveResult.data);

    let cleanupError = null;
    if (editingItemId !== null) {
        const retained = new Set(imageUrls);
        const noLongerUsed = originalEditStorageUrls.filter(url => !retained.has(url));
        cleanupError = await removeUnreferencedItemImages(noLongerUsed, imageUrls, editingItemId);
    }

    if (cleanupError) {
        console.error("Item saved, but old image cleanup failed:", cleanupError);
        alert(`Item saved, but one or more old images could not be removed from Storage: ${cleanupError.message}`);
    } else {
        alert(editingItemId !== null ? "Item updated successfully!" : "Item added successfully!");
    }


    /* ==============================
       RESET + RELOAD
    ============================== */

    resetItemForm();

    await loadItems();
});


/* ==============================
   FILTER EVENTS
============================== */

document.getElementById("searchInput")
    .addEventListener(
        "input",
        filterItems
    );


document.getElementById("categoryFilter")
    .addEventListener(
        "change",
        event => {
            normalizeMultiSelectFilter(event, "categoryFilterOption", "categoryFilter");
            updateCategoryFilterLabel();
            filterItems();
        }
    );


document.getElementById("ipBrandFilter")
    .addEventListener("change", event => {
        normalizeMultiSelectFilter(event, "ipBrandFilterOption", "ipBrandFilter");
        updateIPBrandFilterLabel();
        filterItems();
    });

document.addEventListener("click", event => {
    ["categoryFilter", "ipBrandFilter"].forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter?.open && !filter.contains(event.target)) {
            filter.open = false;
        }
    });
});


document.getElementById("favoriteFilter")
    .addEventListener(
        "change",
        filterItems
    );


document.getElementById("sortFilter")
    .addEventListener(
        "change",
        filterItems
    );


/* ==============================
   CLEAR FILTERS
============================== */

document.getElementById("clearFiltersButton")
    .addEventListener("click", () => {

        document.getElementById("searchInput").value = "";

        document.querySelectorAll('input[name="categoryFilterOption"]:not([data-all])')
            .forEach(input => { input.checked = false; });
        const allCategoriesOption = document.querySelector('input[name="categoryFilterOption"][data-all]');
        if (allCategoriesOption) allCategoriesOption.checked = true;
        updateCategoryFilterLabel();

        document.querySelectorAll('input[name="ipBrandFilterOption"]:not([data-all])')
            .forEach(input => { input.checked = false; });
        const allIPBrandsOption = document.querySelector('input[name="ipBrandFilterOption"][data-all]');
        if (allIPBrandsOption) allIPBrandsOption.checked = true;
        updateIPBrandFilterLabel();

        document.getElementById("favoriteFilter").value = "all";

        document.getElementById("sortFilter").value = "newest";

        filterItems();
    });

document.getElementById("exportCollectionButton")
    .addEventListener("click", () => {
        const fields = [
            "id", "name", "description", "price", "location", "category", "ip_brands",
            "collection_date", "favorite", "image_url", "image_urls"
        ];
        const collection = allItems.map(item =>
            Object.fromEntries(fields.map(field => [field, item[field] ?? null]))
        );
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        // Keep legacy JSON property names for compatibility with existing backups.
        const backup = {
            metadata: {
                application: "My Personal Collection Gallery",
                exportVersion: 1,
                exportedAt: new Date().toISOString(),
                stampCount: collection.length
            },
            stamps: collection
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `collection-backup-${today}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        const exportStatus = document.getElementById("exportStatus");
        if (exportStatus) {
            exportStatus.textContent = "JSON backup downloaded.";
            setTimeout(() => { exportStatus.textContent = ""; }, 4000);
        }
    });

/* ==============================
   EDIT ITEM
============================== */

function editItem(id) {

    const item =
        allItems.find(
            item => item.id === id
        );


    if (!item) {

        alert("Item not found.");

        return;
    }

    clearFormImageItems();
    itemImageInput.value = "";

    editingItemId = id;


    /* Change title */

    const formTitle =
        document.querySelector("#addForm h2");

    if (formTitle) {
        formTitle.textContent =
            "Edit Item";
    }


    /* Change save button */

    const submitButton =
        itemForm.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {
        submitButton.textContent =
            "Save Changes";
    }


    /* Fill existing information */

    document.getElementById("itemName")
        .value =
            item.name || "";


    document.getElementById("itemDescription")
        .value =
            item.description || "";


    document.getElementById("itemPrice")
        .value =
            item.price ?? "";


    document.getElementById("itemLocation")
        .value =
            item.location || "";

    /* IP / Brand selections */
    const itemIPBrands = Array.isArray(item.ip_brands)
        ? item.ip_brands
        : [];
    renderIPBrandCheckboxes(itemIPBrands);

    const newIPBrandBox = document.getElementById("newIPBrandBox");
    const newIPBrandInput = document.getElementById("newIPBrandInput");
    if (newIPBrandBox) newIPBrandBox.style.display = "none";
    if (newIPBrandInput) newIPBrandInput.value = "";

    /* Categories */

    const itemCategories =
        Array.isArray(item.category)
            ? item.category
            : typeof item.category === "string"
                ? [item.category]
                : [];


    renderCategoryCheckboxes(itemCategories);


    /* Date */

    document.getElementById("itemDate")
        .value =
            item.collection_date || "";


    /* Favorite */

    document.getElementById("itemFavorite")
        .checked =
            item.favorite || false;


    /* Existing image */

    const oldPreview = document.getElementById("imagePreviewContainer");
    if (oldPreview) oldPreview.remove();
    originalEditImageUrls = itemImageUrls(item);
    originalEditStorageUrls = [...new Set([...originalEditImageUrls, item.image_url].filter(Boolean))];
    formImageItems = originalEditImageUrls.map(url => ({ kind: "existing", url }));
    window.editingImageUrls = [...originalEditImageUrls];
    renderImagePreviews();


    /* Open popup */

    addForm.classList.add(
        "editing-mode"
    );

    addForm.style.display =
        "block";

    addItemButton.style.display =
        "none";


    /* Prevent background scrolling */

    document.body.classList.add(
        "editing-popup-open"
    );
}


/* ==============================
   DELETE ITEM
============================== */

async function deleteItem(id) {

    const item =
        allItems.find(
            item => item.id === id
        );


    if (!item) {

        alert("Item not found.");

        return;
    }


    const confirmed =
        confirm(
            `Are you sure you want to delete "${item.name}"?`
        );


    if (!confirmed) {
        return;
    }


    let deleteError;
    try {
        ({ error: deleteError } = await supabaseClient
            .from("Stamps")
            .delete()
            .eq("id", id));
    } catch (error) {
        deleteError = error;
    }

    if (deleteError) {
        console.error("Error deleting item:", deleteError);
        alert("Unable to delete item: " + deleteError.message);
        return;
    }


    const storageError = await removeUnreferencedItemImages(itemImageUrls(item), [], id);
    if (storageError) {
        console.error("Item deleted, but Storage cleanup failed:", storageError);
        alert(`Item deleted, but one or more images could not be removed from Storage: ${storageError.message}`);
    } else {
        alert("Item and its images deleted successfully!");
    }


    await loadItems();
}


/* ==============================
   FAVORITE
============================== */

async function toggleFavorite(id) {

    const item =
        allItems.find(
            item => item.id === id
        );


    if (!item) {

        alert("Item not found.");

        return;
    }


    const newFavorite =
        !item.favorite;


    const { error } =
        await supabaseClient
            .from("Stamps")
            .update({
                favorite: newFavorite
            })
            .eq("id", id);


    if (error) {

        console.error(
            "Error updating favorite:",
            error
        );

        alert(
            "Unable to update favorite: " +
            error.message
        );

        return;
    }


    item.favorite =
        newFavorite;


    filterItems();
}

/* ==============================
   CHANGE MAIN CARD IMAGE
============================== */

function changeMainImage(
    itemId,
    imageUrl,
    thumbnail
) {

    const mainImage =
        document.getElementById(
            `main-image-${itemId}`
        );

    if (!mainImage) {
        return;
    }


    mainImage.src =
        imageUrl;


    const cardImage =
        thumbnail.closest(".card-image");


    if (!cardImage) {
        return;
    }


    cardImage
        .querySelectorAll(".image-thumbnail")
        .forEach(item => {

            item.classList.remove("active");

        });


    thumbnail.classList.add("active");
}

/* ==============================
   ITEM DETAILS POPUP
============================== */

function handleItemImageClick(event, id) {

    const addForm = document.getElementById("addForm");

    // If Add/Edit popup is open,
    // clicking an item image should only close the popup.
    if (
        addForm &&
        addForm.style.display !== "none"
    ) {
        event.stopPropagation();
        resetItemForm();
        return;
    }

    // Otherwise, open the image preview
    openItemModal(id);
}


function openItemModal(id) {

    const item =
        allItems.find(
            item => item.id === id
        );


    if (!item) {
        return;
    }

    window.currentModalItemId = id;
    window.currentModalImageIndex = 0;

    const modal =
        document.getElementById("itemModal");

    const modalContent =
        document.getElementById("modalContent");


    const imageUrls =
    Array.isArray(item.image_urls) &&
    item.image_urls.length > 0
        ? item.image_urls
        : item.image_url
            ? [item.image_url]
            : [];

const image =
    imageUrls.length > 0
        ? `
            <div class="modal-image-gallery">

                <div class="viewer-toolbar">
                    <span id="modalImageCounter" aria-live="polite">1 / ${imageUrls.length}</span>
                    <div class="viewer-tools">
                        <button type="button" onclick="toggleModalZoom()" aria-label="Zoom image">Zoom</button>
                    </div>
                </div>

                <div class="modal-main-image-container" id="modalImageStage">

    ${
        imageUrls.length > 1
            ? `
                <button type="button" aria-label="Previous image"
                    class="modal-arrow modal-arrow-left"
                    onclick="event.stopPropagation(); changeModalImageByStep(-1);"
                >
                    ‹
                </button>
              `
            : ""
    }

    <img
        id="modal-main-image"
        class="modal-main-image"
        src="${imageUrls[0]}"
        alt="${item.name || "Item"}"
    >

    ${
        imageUrls.length > 1
            ? `
                <button type="button" aria-label="Next image"
                    class="modal-arrow modal-arrow-right"
                    onclick="event.stopPropagation(); changeModalImageByStep(1);"
                >
                    ›
                </button>
              `
            : ""
    }

</div>

                ${
                    imageUrls.length > 1
                        ? `
                            <div class="modal-thumbnails">

                                ${imageUrls.map((imageUrl, index) => `
                                    <img
                                        class="
                                            modal-thumbnail
                                            ${index === 0 ? "active" : ""}
                                        "
                                        src="${imageUrl}"
                                        alt="${item.name || "Item"} photo ${index + 1}"
                                        tabindex="0"
                                        role="button"
                                        aria-label="Show image ${index + 1} of ${imageUrls.length}"
                                        onkeydown="if(event.key === 'Enter' || event.key === ' '){event.preventDefault(); changeModalImage('${imageUrl.replace(/'/g, "\\'")}', this);}"
                                        onclick="
                                            event.stopPropagation();
                                            changeModalImage(
                                                '${imageUrl.replace(/'/g, "\\'")}',
                                                this
                                            );
                                        "
                                    >
                                `).join("")}

                            </div>
                          `
                        : ""
                }

            </div>
          `
        : "";

    const price =
        item.price !== null &&
        item.price !== undefined

            ? `RM ${Number(item.price).toFixed(2)}`

            : "Not specified";


    const favorite =
        item.favorite
            ? "♥ Favorite"
            : "♡ Not a favorite";


    const categories =
        Array.isArray(item.category)
            ? item.category
            : typeof item.category === "string"
                ? [item.category]
                : [];


    const categoryText =
        categories.length
            ? categories.join(" · ")
            : "";

    const locationIcon = `<svg class="modal-info-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>`;
    const dateIcon = `<svg class="modal-info-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path></svg>`;
    const categoryIcon = `<svg class="modal-info-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m20.6 13.4-7.2 7.2a2 2 0 0 1-2.8 0L3 13V4h9l8.6 6.6a2 2 0 0 1 0 2.8Z"></path><circle cx="7.5" cy="8.5" r="1"></circle></svg>`;

    modalContent.innerHTML = `

        ${image}

        <div class="modal-title">
            ${item.name || "Unnamed Item"}
        </div>

        <div class="modal-description">
            ${item.description || "No description"}
        </div>

        <div class="modal-info">

            ${
                item.location
                    ? `${locationIcon} ${item.location}<br>`
                    : ""
            }

            ${
                item.collection_date
                    ? `${dateIcon} ${formatDate(
                        item.collection_date
                    )}<br>`
                    : ""
            }

            ${
                categoryText
                    ? `${categoryIcon} ${categoryText}<br>`
                    : ""
            }

            ${favorite}

        </div>

        <div class="modal-price">
            ${price}
        </div>
    `;


    modal.style.display = "flex";
    document.body.classList.add("item-modal-open");
}

function changeModalImage(imageUrl, thumbnail) {

    const mainImage =
        document.getElementById("modal-main-image");

    if (!mainImage) {
        return;
    }

    mainImage.src = imageUrl;
    mainImage.classList.remove("zoomed");

    const item = allItems.find(item => item.id === window.currentModalItemId);
    const urls = item
        ? (Array.isArray(item.image_urls) && item.image_urls.length ? item.image_urls : item.image_url ? [item.image_url] : [])
        : [];
    window.currentModalImageIndex = Math.max(0, urls.indexOf(imageUrl));
    updateModalImageCounter();

    const thumbnailContainer =
        thumbnail.closest(".modal-thumbnails");

    if (!thumbnailContainer) {
        return;
    }

    thumbnailContainer
        .querySelectorAll(".modal-thumbnail")
        .forEach(item => {
            item.classList.remove("active");
        });

    thumbnail.classList.add("active");
}

function changeModalImageByStep(step) {

    const itemId =
        window.currentModalItemId;

    if (!itemId) {
        return;
    }

    const item =
        allItems.find(
            item => item.id === itemId
        );

    if (!item) {
        return;
    }

    const imageUrls =
        Array.isArray(item.image_urls) &&
        item.image_urls.length > 0
            ? item.image_urls
            : item.image_url
                ? [item.image_url]
                : [];

    if (imageUrls.length <= 1) {
        return;
    }

    const mainImage =
        document.getElementById(
            "modal-main-image"
        );

    if (!mainImage) {
        return;
    }

    let currentIndex =
        imageUrls.indexOf(
            mainImage.src
        );

    if (currentIndex === -1) {
        currentIndex = 0;
    }

    let newIndex =
        currentIndex + step;

    if (newIndex < 0) {
        newIndex =
            imageUrls.length - 1;
    }

    if (newIndex >= imageUrls.length) {
        newIndex = 0;
    }

    mainImage.src =
        imageUrls[newIndex];
    mainImage.classList.remove("zoomed");
    window.currentModalImageIndex = newIndex;
    updateModalImageCounter();

    const thumbnails =
        document.querySelectorAll(
            ".modal-thumbnail"
        );

    thumbnails.forEach((thumbnail, index) => {
        thumbnail.classList.toggle(
            "active",
            index === newIndex
        );
    });
}

function updateModalImageCounter() {
    const counter = document.getElementById("modalImageCounter");
    const item = allItems.find(item => item.id === window.currentModalItemId);
    const urls = item
        ? (Array.isArray(item.image_urls) && item.image_urls.length ? item.image_urls : item.image_url ? [item.image_url] : [])
        : [];
    if (counter) counter.textContent = `${window.currentModalImageIndex + 1} / ${urls.length}`;
}

function toggleModalZoom() {
    document.getElementById("modal-main-image")?.classList.toggle("zoomed");
}

function closeItemModal() {
    document.getElementById("itemModal").style.display = "none";
    document.body.classList.remove("item-modal-open");
}

/* ==============================
   CLOSE DETAILS POPUP
============================== */

document.getElementById("modalClose")
    .addEventListener("click", closeItemModal);


document.getElementById("itemModal")
    .addEventListener("click", (event) => {

        if (
            event.target.id === "itemModal"
        ) {

            closeItemModal();
        }
    });

document.addEventListener("keydown", event => {
    if (document.getElementById("itemModal").style.display !== "flex") return;
    if (event.key === "Escape") closeItemModal();
    if (event.key === "ArrowLeft") changeModalImageByStep(-1);
    if (event.key === "ArrowRight") changeModalImageByStep(1);
});


/* ==============================
   START
============================== */

loadCategories();
loadIPBrands();
loadItems();
