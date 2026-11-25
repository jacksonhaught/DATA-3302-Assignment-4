import { loadAds } from "./data.js";
import { renderScatterplot } from "./chart.js";

const chartContainer = document.querySelector("#chart");
const chartStatus = document.querySelector("#chart-status");

// Keep application data and controls in one state object.
// Future input controls can update state and call render().
const state = {
  ads: [],
  minViewCount: 500
};

function render() {
  if (!state.ads.length) return;

  const { visibleCount, totalCount } = renderScatterplot(chartContainer, state.ads, {
    minViewCount: state.minViewCount
  });

  chartStatus.textContent = `${visibleCount} of ${totalCount} advertisements are displayed.`;
}

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
    // Load the CSV relative to this JavaScript file.
    const dataUrl = new URL("../data/youtube.csv", import.meta.url);
    state.ads = await loadAds(dataUrl);
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
