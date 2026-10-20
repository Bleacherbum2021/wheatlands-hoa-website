import markdownIt from "markdown-it";

const md = markdownIt({ html: false, linkify: true, typographer: true });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parts(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, dow };
}

export default function (eleventyConfig) {
  // Static files copied as-is
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/uploads");
  eleventyConfig.addPassthroughCopy("src/admin");

  // Markdown in content fields (bold, links, line breaks)
  eleventyConfig.addFilter("md", (s) => (s ? md.render(String(s)) : ""));
  eleventyConfig.addFilter("mdi", (s) => (s ? md.renderInline(String(s)) : ""));

  // Dates (ISO yyyy-mm-dd strings from the editor)
  eleventyConfig.addFilter("isoDate", (v) => {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v || "").slice(0, 10);
  });
  eleventyConfig.addFilter("shortDate", (iso) => { const p = parts(iso); return `${MONTHS[p.m - 1]} ${p.d}`; });
  eleventyConfig.addFilter("monthAbbr", (iso) => MONTHS[parts(iso).m - 1]);
  eleventyConfig.addFilter("monthName", (iso) => MONTHS_LONG[parts(iso).m - 1]);
  eleventyConfig.addFilter("dayNum", (iso) => parts(iso).d);
  eleventyConfig.addFilter("longDate", (iso) => { const p = parts(iso); return `${DAYS[p.dow]}, ${MONTHS_LONG[p.m - 1]} ${p.d}, ${p.y}`; });
  eleventyConfig.addFilter("niceDate", (iso) => { const p = parts(iso); return `${MONTHS_LONG[p.m - 1]} ${p.d}, ${p.y}`; });

  // Sorting helpers
  eleventyConfig.addFilter("byDate", (arr) => [...(arr || [])].sort((a, b) => String(a.date).localeCompare(String(b.date))));
  eleventyConfig.addFilter("byDateDesc", (arr) => [...(arr || [])].sort((a, b) => String(b.date).localeCompare(String(a.date))));
  eleventyConfig.addFilter("byYearDesc", (arr) => [...(arr || [])].sort((a, b) => Number(b.year) - Number(a.year)));
  eleventyConfig.addFilter("firstUpcoming", (arr, today) => {
    const up = [...(arr || [])].filter((m) => m.type !== "none" && String(m.date).slice(0, 10) >= today)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return up.length ? String(up[0].date).slice(0, 10) : "none";
  });
  eleventyConfig.addFilter("yearsFrom", (arr, y) => (arr || []).filter((e) => Number(e.year) >= y));
  eleventyConfig.addFilter("yearsBefore", (arr, y) => (arr || []).filter((e) => Number(e.year) < y));
  eleventyConfig.addFilter("withFile", (arr) => (arr || []).filter((e) => e.file));

  // File type badge from a file path
  eleventyConfig.addFilter("ext", (f) => {
    const m = String(f || "").toLowerCase().match(/\.([a-z0-9]+)(?:$|\?)/);
    return m ? m[1] : "file";
  });
  eleventyConfig.addFilter("initials", (n) => String(n || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join(""));
  eleventyConfig.addFilter("telHref", (p) => "tel:+1" + String(p || "").replace(/\D/g, "").replace(/^1/, "").slice(0, 10));

  eleventyConfig.addGlobalData("buildDate", () => new Date().toISOString().slice(0, 10));

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    templateFormats: ["njk"],
  };
}
