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
  const selectedCategories = options.selectedCategories ?? new Set();
  const onDotClick = options.onDotClick ?? (() => {});
  const hasCompanySelection = selectedCompanies.size > 0;
  const hasCategorySelection = selectedCategories.size > 0;
  const hasActiveFilters = hasCompanySelection || hasCategorySelection;
  const chartWidth = Math.max(760, Math.floor(container.clientWidth || 960));
  const plotWidth = chartWidth - margin.left - margin.right;

  // Put years in chronological order.
  const yearLevels = Array.from(new Set(ads.map(({ year }) => year))).sort(
    d3.ascending
  );

  // Use a continuous year scale so both axes can be rescaled during zooming.
  const [firstYear, lastYear] = d3.extent(yearLevels);
  const x = d3
    .scaleLinear()
    .domain([firstYear - 0.5, lastYear + 0.5])
    .range([margin.left, chartWidth - margin.right]);

  // Keep y axis on the same log scale as visualization 2.
  const y = d3
    .scaleLog()
    .domain(yDomain)
    .range([chartHeight - margin.bottom, margin.top]);

  // Remove ads with missing, nonpositive, or fewer than 500 observed views.
  const scatterData = ads.filter(
    (d) => Number.isFinite(d.viewCount) && d.viewCount >= minViewCount
  );

  // Require every active filter to match.
  const matchesCompany = (ad) =>
    !hasCompanySelection || selectedCompanies.has(ad.brand);

  const matchesCategory = (ad) =>
    !hasCategorySelection ||
    Array.from(selectedCategories).some(
      (category) => ad.categories?.[category]
    );

  // Keep matching ads blue and fade every other advertisement.
  const isHighlighted = (ad) =>
    matchesCompany(ad) && matchesCategory(ad);

  // Create consistent horizontal jitter within each year.
  const random = d3.randomLcg(42);
  const yearSpacing = Math.abs(x(firstYear + 1) - x(firstYear));
  const jitterOffsets = new Map(
    scatterData.map((d) => [
      d,
      (random() - 0.5) * yearSpacing * 0.65
    ])
  );

  // Keep a reference list of major log-scale grid values.
  const majorLogTicks = d3.range(10).map((power) => 10 ** power);
  const baseDotRadius = 3;
  const minimumDotRadius = 2.75;

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
    .attr(
      "aria-label",
      "Zoomable scatterplot of observed YouTube views for individual advertisements by Super Bowl year"
    )
    .attr("aria-describedby", "scatterplot-description")
    .style("touch-action", "none");

  svg
    .append("desc")
    .attr("id", "scatterplot-description")
    .text(
      hasActiveFilters
        ? "Scroll or pinch to zoom, and drag to pan. Ads matching every active filter are blue, while all other advertisements are faded."
        : "Scroll or pinch to zoom, and drag to pan. Each blue dot represents one advertisement with at least 500 observed YouTube views."
    );

  const clipId = "scatterplot-clip";
  const plotBounds = [
    [margin.left, margin.top],
    [chartWidth - margin.right, chartHeight - margin.bottom]
  ];

  svg
    .append("defs")
    .append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", plotWidth)
    .attr("height", chartHeight - margin.top - margin.bottom);

  const titleLayer = svg.append("g").attr("class", "title-layer");
  const gridLayer = svg.append("g").attr("class", "grid-layer");
  const dotsLayer = svg
    .append("g")
    .attr("class", "dots-layer")
    .attr("clip-path", `url(#${clipId})`);
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
  const selectionMessage = hasActiveFilters
    ? "only ads matching every active filter are blue; all other ads are faded"
    : "choose companies or categories below to highlight their ads";

  titleLayer
    .append("text")
    .attr("x", margin.left)
    .attr("y", 48)
    .attr("font-size", 13)
    .attr("fill", "#4B5563")
    .text(
      `Only ads with at least ${d3.format(",")(minViewCount)} observed views are shown; ${selectionMessage}`
    );

  titleLayer
    .append("text")
    .attr("x", margin.left)
    .attr("y", 68)
    .attr("font-size", 12)
    .attr("fill", "#4B5563")
    .text("Scroll or pinch to zoom. Drag to pan.");

  // Draw one jittered blue dot for every remaining advertisement.
  const dots = dotsLayer
    .selectAll("circle")
    .data(scatterData, (d) => d.id)
    .join("circle")
    .attr("fill", "#1D4ED8")
    .attr("opacity", (d) => (isHighlighted(d) ? 1 : 0.2))
    .attr("cursor", "pointer")
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

  // Display the selected advertisement's video link after a dot is clicked.
  dots.on("click", (_, d) => onDotClick(d));

  // Redraw the axes, grid, and dots whenever the zoom transform changes.
  function updateZoom(transform) {
    const zoomedX = transform.rescaleX(x);
    const zoomedY = transform.rescaleY(y);
    const [firstVisibleYear, lastVisibleYear] = zoomedX
      .domain()
      .sort(d3.ascending);
    const visibleYears = yearLevels.filter(
      (year) =>
        year >= Math.ceil(firstVisibleYear) &&
        year <= Math.floor(lastVisibleYear)
    );
    const [minimumViewCount, maximumViewCount] = zoomedY
      .domain()
      .sort(d3.ascending);

    // Include ticks on the scale boundaries despite floating-point rounding.
    const boundaryTolerance = 1e-9;
    const visibleMajorTicks = majorLogTicks.filter(
      (tick) =>
        tick >= minimumViewCount / (1 + boundaryTolerance) &&
        tick <= maximumViewCount * (1 + boundaryTolerance)
    );
    const yAxisTicks =
      visibleMajorTicks.length >= 2 ? visibleMajorTicks : zoomedY.ticks(5);

    // Draw major and minor horizontal log-scale grid lines.
    const grid = gridLayer
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(
        d3
          .axisLeft(zoomedY)
          .tickValues(zoomedY.ticks(100))
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

    // Draw horizontal year labels for the current zoom level.
    xAxisLayer
      .attr("transform", `translate(0, ${chartHeight - margin.bottom})`)
      .call(
        d3
          .axisBottom(zoomedX)
          .tickValues(visibleYears)
          .tickFormat(d3.format("d"))
          .tickSizeOuter(0)
      );

    // Draw y-axis labels for the current log-scale range.
    yAxisLayer
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(
        d3
          .axisLeft(zoomedY)
          .tickValues(yAxisTicks)
          .tickFormat(d3.format(","))
      );

    // Shrink dots as the chart is zoomed in to keep nearby ads separate.
    dots
      .attr("cx", (d) =>
        transform.applyX(x(d.year) + jitterOffsets.get(d))
      )
      .attr("cy", (d) => transform.applyY(y(d.viewCount)))
      .attr(
        "r",
        Math.max(
          minimumDotRadius,
          baseDotRadius / Math.sqrt(transform.k)
        )
      );
  }

  // Let users scroll or pinch to zoom and drag to pan around the plot.
  const zoom = d3
    .zoom()
    .scaleExtent([1, 5])
    .extent(plotBounds)
    .translateExtent(plotBounds)
    .on("zoom", (event) => updateZoom(event.transform));

  svg.call(zoom);
  updateZoom(d3.zoomIdentity);

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




