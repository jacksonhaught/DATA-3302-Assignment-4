import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Convert CSV values into numbers.
// Blank cells and "NA" become NaN
export function parseNumber(value) {
  const text = String(value ?? "").trim();
  return text === "" || text === "NA" ? NaN : Number(text);
}

// Convert CSV TRUE and FALSE values into JavaScript booleans.
function parseBoolean(value) {
  return String(value ?? "").trim().toLowerCase() === "true";
}

// Clean the advertisement data before it reaches the chart.
export function cleanAds(rawAds) {
  // Set remembers full rows that have already appeared.
  // It lets us remove exact duplicate records.
  const seen = new Set();

  return rawAds
    .filter((row) => {
      // Turn whole row into text so it can be compared to prior rows.
      const key = JSON.stringify(row);

      // If we have already seen this identical row, remove it.
      if (seen.has(key)) return false;

      // Otherwise remember this row and keep it.
      seen.add(key);
      return true;
    })
    .map(({
      year,
      view_count,
      brand,
      id,
      youtube_url,
      title,
      funny,
      show_product_quickly,
      patriotic,
      celebrity,
      danger,
      animals,
      use_sex
    }) => {
      // Standardize the brand name.
      const rawBrand = String(brand ?? "").trim();

      // The source data misspells Hyundai as "Hynudai".
      const cleanedBrand =
        rawBrand === "Hynudai" ? "Hyundai" : rawBrand || "Unknown";

      return {
        // Convert these fields into numeric values.
        year: parseNumber(year),
        viewCount: parseNumber(view_count),

        // Use the corrected brand name.
        brand: cleanedBrand,

        // Keep each advertisement category for category filtering.
        categories: {
          funny: parseBoolean(funny),
          show_product_quickly: parseBoolean(show_product_quickly),
          patriotic: parseBoolean(patriotic),
          celebrity: parseBoolean(celebrity),
          danger: parseBoolean(danger),
          animals: parseBoolean(animals),
          use_sex: parseBoolean(use_sex)
        },

        // Keep identifiers and metadata for future interactive elements.
        id: String(id ?? "").trim(),
        youtubeUrl: String(youtube_url ?? "").trim(),
        title: String(title ?? "").trim()
      };
    })
    // Remove any row without a valid whole-number year.
    .filter(({ year }) => Number.isInteger(year));
}

// Load the CSV attached to the project.
export async function loadAds(url) {
  const rawAds = await d3.csv(url);
  return cleanAds(rawAds);
}
