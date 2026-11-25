import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const defaultOptions = {
  chartHeight: 600,
  minViewCount: 500,
  yDomain: [1, 1_000_000_000],
  margin: {
    top: 80,
    right: 35,
    bottom: 70,
    left: 85
  }
};

// Draw the YouTube-view scatterplot inside the supplied container.
export function renderScatterplot(container, ads, options = {}) {
  const settings = {
    ...defaultOptions,
    ...options,
    margin: {
      ...defaultOptions.margin,
      ...options.margin
    }
  };

  const { chartHeight, minViewCount, yDomain, margin } = settings;
  const selectedCompanies = options.selectedCompanies ?? new Set();
  const hasSelection = selectedCompanies.size > 0;
  const chartWidth = Math.max(760, Math.floor(container.clientWidth || 960));
  const plotWidth = chartWidth - margin.left - margin.right;

  // Put years in chronological order.
  const yearLevels = Array.from(new Set(ads.map(({ year }) => year))).sort(
    d3.ascending
  );

  // Place years across x axis.
  const x = d3
    .scaleBand()
    .domain(yearLevels)
    .range([margin.left, chartWidth - margin.right])
    .padding(0.25);

  // Keep y axis on the same log scale as visualization 2.
  const y = d3
    .scaleLog()
    .domain(yDomain)
    .range([chartHeight - margin.bottom, margin.top]);

  // Remove ads with missing, nonpositive, or fewer than 500 observed views.
  const scatterData = ads.filter(
    (d) => Number.isFinite(d.viewCount) && d.viewCount >= minViewCount
  );

  // Keep selected companies blue and fade every other company.
  const isHighlighted = (ad) =>
    !hasSelection || selectedCompanies.has(ad.brand);

  // Create consistent horizontal jitter within each year.
  const random = d3.randomLcg(42);
  const jitterOffsets = new Map(
    scatterData.map((d) => [
      d,
      (random() - 0.5) * x.bandwidth() * 0.65
    ])
  );

  // Create major and minor log-scale grid values.
  const majorLogTicks = d3.range(10).map((power) => 10 ** power);
  const allLogTicks = y.ticks(100);

  // Replace the previous chart before drawing the updated version.
  container.replaceChildren();

  // Create SVG and layers for chart parts.
  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
    .attr("role", "img")
    .attr("aria-labelledby", "scatterplot-title scatterplot-description");

  svg
    .append("title")
    .attr("id", "scatterplot-title")
    .text("Observed YouTube Views for Individual Ads by Super Bowl Year");

  svg
    .append("desc")
    .attr("id", "scatterplot-description")
    .text(
      hasSelection
        ? "Selected companies are blue, while advertisements from other companies are faded."
        : "Each blue dot represents one advertisement with at least 500 observed YouTube views."
    );

  const titleLayer = svg.append("g").attr("class", "title-layer");
  const gridLayer = svg.append("g").attr("class", "grid-layer");
  const dotsLayer = svg.append("g").attr("class", "dots-layer");
  const xAxisLayer = svg.append("g").attr("class", "x-axis");
  const yAxisLayer = svg.append("g").attr("class", "y-axis");
  const axisLabelLayer = svg.append("g").attr("class", "axis-label-layer");

  // Add chart title.
  titleLayer
    .append("text")
    .attr("x", margin.left)
    .attr("y", 25)
    .attr("font-size", 20)
    .attr("font-weight", "bold")
    .text("Observed YouTube Views for Individual Ads by Super Bowl Year");

  // Explain filtering, selection, and dot meaning.
  const selectionMessage = hasSelection
    ? "selected companies are blue and all other ads are faded"
    : "choose companies above to highlight their ads";

  titleLayer
    .append("text")
    .attr("x", margin.left)
    .attr("y", 48)
    .attr("font-size", 13)
    .attr("fill", "#4B5563")
    .text(
      `Only ads with at least ${d3.format(",")(minViewCount)} observed views are shown; ${selectionMessage}`
    );

  // Draw major and minor horizontal log-scale grid lines.
  const grid = gridLayer
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(
      d3
        .axisLeft(y)
        .tickValues(allLogTicks)
        .tickSize(-plotWidth)
        .tickFormat("")
    );

  grid.select(".domain").remove();

  grid
    .selectAll(".tick line")
    .attr("stroke", (d) =>
      majorLogTicks.includes(d) ? "#E5E7EB" : "#F3F4F6"
    )
    .attr("stroke-width", 1);

  // Draw one jittered blue dot for every remaining advertisement.
  const dots = dotsLayer
    .selectAll("circle")
    .data(scatterData, (d) => d.id)
    .join("circle")
    .attr(
      "cx",
      (d) => x(d.year) + x.bandwidth() / 2 + jitterOffsets.get(d)
    )
    .attr("cy", (d) => y(d.viewCount))
    .attr("r", 3)
    .attr("fill", "#1D4ED8")
    .attr("opacity", (d) => (isHighlighted(d) ? 1 : 0.2))
    .sort((a, b) => Number(isHighlighted(a)) - Number(isHighlighted(b)));

  // Add hover text for each advertisement.
  dots
    .append("title")
    .text(
      (d) =>
        `${d.title || d.brand}\n${d.brand}\n${d.year}\n${d3.format(
          ",.0f"
        )(d.viewCount)} observed YouTube views`
    );

  // Draw horizontal year labels.
  xAxisLayer
    .attr("transform", `translate(0, ${chartHeight - margin.bottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  // Draw major y-axis labels.
  yAxisLayer
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(
      d3
        .axisLeft(y)
        .tickValues(majorLogTicks)
        .tickFormat(d3.format(","))
    );

  // Add vertical y-axis label.
  axisLabelLayer
    .append("text")
    .attr("transform", `translate(20, ${chartHeight / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("Observed YouTube views (log scale)");

  return {
    visibleCount: scatterData.length,
    totalCount: ads.length,
    highlightedCount: scatterData.filter(isHighlighted).length
  };
}