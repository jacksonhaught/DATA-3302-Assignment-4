import { loadAds } from "./data.js";
import { renderScatterplot } from "./chart.js";

const chartContainer = document.querySelector("#chart");
const chartStatus = document.querySelector("#chart-status");
const companyFilter = document.querySelector("#company-filter");
const companyFilterButton = document.querySelector("#company-filter-button");
const companyFilterLabel = document.querySelector("#company-filter-label");
const companyFilterMenu = document.querySelector("#company-filter-menu");
const companyOptions = document.querySelector("#company-options");
const categoryFilter = document.querySelector("#category-filter");
const categoryFilterButton = document.querySelector("#category-filter-button");
const categoryFilterLabel = document.querySelector("#category-filter-label");
const categoryFilterMenu = document.querySelector("#category-filter-menu");
const categoryOptions = document.querySelector("#category-options");
const videoLinkLabel = document.querySelector("#video-link-label");
const videoLinkDisplay = document.querySelector("#video-link-display");
const copyLinkButton = document.querySelector("#copy-link-button");
const openLinkButton = document.querySelector("#open-link-button");
const videoLinkStatus = document.querySelector("#video-link-status");

const categoryDefinitions = [
  { value: "funny", label: "Funny" },
  { value: "show_product_quickly", label: "Show product quickly" },
  { value: "patriotic", label: "Patriotic" },
  { value: "celebrity", label: "Celebrity" },
  { value: "danger", label: "Danger" },
  { value: "animals", label: "Animals" },
  { value: "use_sex", label: "Use sex" }
];

// Keep application data and controls in one state object.
// Future input controls can update state and call render().
const state = {
  ads: [],
  minViewCount: 500,
  selectedCompanies: new Set(),
  selectedCategories: new Set()
};

function render() {
  if (!state.ads.length) return;

  const { visibleCount, totalCount, highlightedCount } = renderScatterplot(
    chartContainer,
    state.ads,
    {
      minViewCount: state.minViewCount,
      selectedCompanies: state.selectedCompanies,
      selectedCategories: state.selectedCategories,
      onDotClick: displayVideoLink
    }
  );

  const hasActiveFilters =
    state.selectedCompanies.size > 0 || state.selectedCategories.size > 0;

  chartStatus.textContent =
    hasActiveFilters
      ? `${highlightedCount} of ${visibleCount} displayed advertisements match the selected filters.`
      : `${visibleCount} of ${totalCount} advertisements are displayed.`;
}

function displayVideoLink(ad) {
  const videoUrl = String(ad.youtubeUrl ?? "").trim();
  const videoTitle = String(ad.title ?? "").trim() || ad.brand;
  const hasVideoUrl = videoUrl !== "";

  videoLinkLabel.textContent = `Video link: ${videoTitle}`;
  videoLinkDisplay.value = videoUrl;
  copyLinkButton.disabled = !hasVideoUrl;
  openLinkButton.disabled = !hasVideoUrl;
  copyLinkButton.textContent = "Copy link";

  videoLinkStatus.textContent = hasVideoUrl
    ? `Video link selected for ${ad.brand}.`
    : `${ad.brand} does not have a video link.`;
}

let copyButtonTimeout;

async function copyVideoLink() {
  const videoUrl = videoLinkDisplay.value;
  if (!videoUrl) return;

  let copied = false;

  try {
    await navigator.clipboard.writeText(videoUrl);
    copied = true;
  } catch {
    videoLinkDisplay.select();
    copied = document.execCommand("copy");
  }

  if (copied) {
    copyLinkButton.textContent = "Copied";
    videoLinkStatus.textContent = "Video link copied to the clipboard.";

    window.clearTimeout(copyButtonTimeout);
    copyButtonTimeout = window.setTimeout(() => {
      copyLinkButton.textContent = "Copy link";
    }, 1500);
  } else {
    videoLinkStatus.textContent = "The video link could not be copied.";
  }
}

function openVideoLink() {
  const videoUrl = videoLinkDisplay.value;
  if (!videoUrl) return;

  window.open(videoUrl, "_blank", "noopener,noreferrer");
}

function updateFilterLabel(label, selectedValues, singular, plural) {
  const selectedCount = selectedValues.size;

  label.textContent =
    selectedCount === 0
      ? `Select ${plural}`
      : `${selectedCount} ${selectedCount === 1 ? singular : plural} selected`;
}

function updateSelectedValues(selectedValues, value, isSelected) {
  if (isSelected) {
    selectedValues.add(value);
  } else {
    selectedValues.delete(value);
  }
}

function buildCheckboxOptions(container, options, selectedValues, onChange) {
  const checkboxes = document.createDocumentFragment();

  options.forEach(({ value, label }) => {
    const option = document.createElement("label");
    option.className = "filter-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = value;
    checkbox.checked = selectedValues.has(value);

    checkbox.addEventListener("change", () => {
      onChange(value, checkbox.checked);
    });

    const optionLabel = document.createElement("span");
    optionLabel.textContent = label;

    option.append(checkbox, optionLabel);
    checkboxes.append(option);
  });

  container.replaceChildren(checkboxes);
}

function buildCompanyOptions() {
  const companies = Array.from(
    new Set(state.ads.map(({ brand }) => brand))
  )
    .sort((a, b) => a.localeCompare(b))
    .map((company) => ({ value: company, label: company }));

  buildCheckboxOptions(
    companyOptions,
    companies,
    state.selectedCompanies,
    (company, isSelected) => {
      updateSelectedValues(state.selectedCompanies, company, isSelected);
      updateFilterLabel(
        companyFilterLabel,
        state.selectedCompanies,
        "company",
        "companies"
      );
      render();
    }
  );

  companyFilterButton.disabled = false;
  updateFilterLabel(
    companyFilterLabel,
    state.selectedCompanies,
    "company",
    "companies"
  );
}

function buildCategoryOptions() {
  buildCheckboxOptions(
    categoryOptions,
    categoryDefinitions,
    state.selectedCategories,
    (category, isSelected) => {
      updateSelectedValues(state.selectedCategories, category, isSelected);
      updateFilterLabel(
        categoryFilterLabel,
        state.selectedCategories,
        "category",
        "categories"
      );
      render();
    }
  );

  categoryFilterButton.disabled = false;
  updateFilterLabel(
    categoryFilterLabel,
    state.selectedCategories,
    "category",
    "categories"
  );
}

function setDropdownOpen(button, menu, isOpen) {
  button.setAttribute("aria-expanded", String(isOpen));
  menu.hidden = !isOpen;
}

function toggleDropdown(button, menu, otherButton, otherMenu) {
  const isOpen = button.getAttribute("aria-expanded") === "true";
  setDropdownOpen(otherButton, otherMenu, false);
  setDropdownOpen(button, menu, !isOpen);
}

companyFilterButton.addEventListener("click", () => {
  toggleDropdown(
    companyFilterButton,
    companyFilterMenu,
    categoryFilterButton,
    categoryFilterMenu
  );
});

categoryFilterButton.addEventListener("click", () => {
  toggleDropdown(
    categoryFilterButton,
    categoryFilterMenu,
    companyFilterButton,
    companyFilterMenu
  );
});

document.addEventListener("click", (event) => {
  if (!companyFilter.contains(event.target)) {
    setDropdownOpen(companyFilterButton, companyFilterMenu, false);
  }

  if (!categoryFilter.contains(event.target)) {
    setDropdownOpen(categoryFilterButton, categoryFilterMenu, false);
  }
});

document.addEventListener("keydown", (event) => {
  const companyMenuOpen = !companyFilterMenu.hidden;
  const categoryMenuOpen = !categoryFilterMenu.hidden;

  if (event.key === "Escape" && (companyMenuOpen || categoryMenuOpen)) {
    setDropdownOpen(companyFilterButton, companyFilterMenu, false);
    setDropdownOpen(categoryFilterButton, categoryFilterMenu, false);
    (companyMenuOpen ? companyFilterButton : categoryFilterButton).focus();
  }
});

copyLinkButton.addEventListener("click", copyVideoLink);
openLinkButton.addEventListener("click", openVideoLink);

function showError(error) {
  const detail = error instanceof Error ? error.message : "Unknown error";
  chartContainer.replaceChildren();

  const message = document.createElement("p");
  message.className = "chart-error";
  message.textContent = `The visualization could not load: ${detail}`;
  chartContainer.append(message);
}

async function initialize() {
  try {
    // Load the CSV from the project root relative to this JavaScript file.
    const dataUrl = new URL("../youtube.csv", import.meta.url);
    state.ads = await loadAds(dataUrl);
    buildCompanyOptions();
    buildCategoryOptions();
    render();
  } catch (error) {
    showError(error);
  } finally {
    chartContainer.setAttribute("aria-busy", "false");
  }
}

let resizeFrame;

// Redraw the chart when the browser window changes size.
window.addEventListener("resize", () => {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(render);
});

initialize();