import { loadAds } from "./data.js";
import { renderScatterplot } from "./chart.js";

const chartContainer = document.querySelector("#chart");
const chartStatus = document.querySelector("#chart-status");
const companyFilter = document.querySelector("#company-filter");
const companyFilterButton = document.querySelector("#company-filter-button");
const companyFilterLabel = document.querySelector("#company-filter-label");
const companyFilterMenu = document.querySelector("#company-filter-menu");
const companyOptions = document.querySelector("#company-options");

// Keep application data and controls in one state object.
// Future input controls can update state and call render().
const state = {
  ads: [],
  minViewCount: 500,
  selectedCompanies: new Set()
};

function render() {
  if (!state.ads.length) return;

  const { visibleCount, totalCount, highlightedCount } = renderScatterplot(
    chartContainer,
    state.ads,
    {
      minViewCount: state.minViewCount,
      selectedCompanies: state.selectedCompanies
    }
  );

  chartStatus.textContent =
    state.selectedCompanies.size > 0
      ? `${highlightedCount} of ${visibleCount} displayed advertisements are highlighted.`
      : `${visibleCount} of ${totalCount} advertisements are displayed.`;
}

function updateCompanyFilterLabel() {
  const selectedCount = state.selectedCompanies.size;

  companyFilterLabel.textContent =
    selectedCount === 0
      ? "Select companies"
      : `${selectedCount} ${selectedCount === 1 ? "company" : "companies"} selected`;
}

function buildCompanyOptions() {
  const companies = Array.from(
    new Set(state.ads.map(({ brand }) => brand))
  ).sort((a, b) => a.localeCompare(b));

  const options = document.createDocumentFragment();

  companies.forEach((company) => {
    const option = document.createElement("label");
    option.className = "company-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = company;
    checkbox.checked = state.selectedCompanies.has(company);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.selectedCompanies.add(company);
      } else {
        state.selectedCompanies.delete(company);
      }

      updateCompanyFilterLabel();
      render();
    });

    const label = document.createElement("span");
    label.textContent = company;

    option.append(checkbox, label);
    options.append(option);
  });

  companyOptions.replaceChildren(options);
  companyFilterButton.disabled = false;
  updateCompanyFilterLabel();
}

function setCompanyMenuOpen(isOpen) {
  companyFilterButton.setAttribute("aria-expanded", String(isOpen));
  companyFilterMenu.hidden = !isOpen;
}

companyFilterButton.addEventListener("click", () => {
  const isOpen = companyFilterButton.getAttribute("aria-expanded") === "true";
  setCompanyMenuOpen(!isOpen);
});

document.addEventListener("click", (event) => {
  if (!companyFilter.contains(event.target)) {
    setCompanyMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !companyFilterMenu.hidden) {
    setCompanyMenuOpen(false);
    companyFilterButton.focus();
  }
});

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