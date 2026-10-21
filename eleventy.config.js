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

// ------------------------------------------------------------ Calendar helpers
const CAL_TZ = "America/Chicago";
const MEETING_MINUTES = 60; // calendar entries are one hour long
const VTIMEZONE_CHICAGO = [
  "BEGIN:VTIMEZONE", "TZID:America/Chicago",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0600", "TZOFFSETTO:-0500", "TZNAME:CDT", "DTSTART:19700308T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:-0500", "TZOFFSETTO:-0600", "TZNAME:CST", "DTSTART:19701101T020000", "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU", "END:STANDARD",
  "END:VTIMEZONE",
];
const pad = (n) => String(n).padStart(2, "0");

// "7:00 PM" -> minutes after midnight (defaults to 7:00 PM)
function parseTime(t) {
  const m = String(t || "").match(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m/i);
  if (!m) return 19 * 60;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "p") h += 12;
  return h * 60 + Number(m[2] || 0);
}

// Local Central-time stamp (YYYYMMDDTHHMMSS) for a date plus minutes
function localStamp(iso, minutes) {
  const [y, mo, d] = String(iso).slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, 0, minutes));
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`;
}

function calEvent(m, time, siteUrl) {
  const iso = String(m.date).slice(0, 10);
  const startMin = parseTime(time);
  const kind = m.type === "open" ? "Open meeting, all homeowners welcome." : "Board work session.";
  const details = [
    m.note ? `${m.note}.`.replace(/\.\.$/, ".") : "",
    kind,
    m.join_url ? `Join: ${m.join_url}` : "The join link will be posted on the HOA website before the meeting.",
    m.dial_in || "",
    `Details: ${siteUrl}/meetings.html`,
  ].filter(Boolean).join("\n");
  return {
    uid: `meeting-${iso}@wheatlandshoa.org`,
    title: `Wheatlands HOA: ${m.title}`,
    start: localStamp(iso, startMin),
    end: localStamp(iso, startMin + MEETING_MINUTES),
    details,
    location: m.join_url || (/in person/i.test(m.note || "") ? "In person" : "Online"),
  };
}

// iCalendar text escaping and 75-octet line folding
const icsText = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function fold(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = "", len = 0, limit = 75;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, "utf8");
    if (len + n > limit) { out.push(cur); cur = ""; len = 0; limit = 74; }
    cur += ch; len += n;
  }
  out.push(cur);
  return out.join("\r\n ");
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

  // ---------------------------------------------------------------- Calendar
  // Public address of the site. Netlify sets URL to the primary domain, so this
  // becomes https://wheatlandshoa.org on its own once the domain is switched.
  eleventyConfig.addGlobalData("siteUrl", () => (process.env.URL || "https://wheatlands-hoa.netlify.app").replace(/\/$/, ""));

  // ---------------------------------------------------------------- News posts
  // Each news post gets its own page (/news/<date>-<title>.html) so it can be shared
  eleventyConfig.addFilter("postSlug", (p) => {
    const words = String(p.title || "post").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
    return `${String(p.date).slice(0, 10)}-${words || "post"}`;
  });
  // Plain-text summary of a markdown field (for link previews)
  eleventyConfig.addFilter("summary", (s, max = 200) => {
    const text = md.render(String(s || "")).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/\s+/g, " ").replace(/ ([.,;:!?])/g, "$1").trim();
    if (text.length <= max) return text;
    // Prefer ending on a whole sentence when one fits
    const sentence = (text.slice(0, max + 1).match(/^.*[.!?](?=\s)/) || [""])[0];
    if (sentence.length > max / 2) return sentence;
    return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  });

  // Meetings that belong on a calendar (skips "No meeting this month" entries)
  eleventyConfig.addFilter("calendarMeetings", (arr) =>
    [...(arr || [])].filter((m) => m.type !== "none" && m.date).sort((a, b) => String(a.date).localeCompare(String(b.date))));
  eleventyConfig.addFilter("calFile", (m) => `/calendar/${String(m.date).slice(0, 10)}.ics`);
  eleventyConfig.addFilter("googleCalUrl", (m, time, siteUrl) => {
    const ev = calEvent(m, time, siteUrl);
    const q = new URLSearchParams({
      action: "TEMPLATE",
      text: ev.title,
      dates: `${ev.start}/${ev.end}`,
      ctz: CAL_TZ,
      details: ev.details,
      location: ev.location,
    });
    return `https://calendar.google.com/calendar/render?${q}`;
  });
  // Full .ics calendar text for one or more meetings
  eleventyConfig.addFilter("ics", (arr, time, siteUrl, name) => {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wheatlands HOA//Meetings//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    if (name) lines.push(`X-WR-CALNAME:${icsText(name)}`, `X-WR-TIMEZONE:${CAL_TZ}`, "REFRESH-INTERVAL;VALUE=DURATION:PT12H", "X-PUBLISHED-TTL:PT12H");
    lines.push(...VTIMEZONE_CHICAGO);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    for (const m of arr || []) {
      const ev = calEvent(m, time, siteUrl);
      lines.push("BEGIN:VEVENT", `UID:${ev.uid}`, `DTSTAMP:${stamp}`,
        `DTSTART;TZID=${CAL_TZ}:${ev.start}`, `DTEND;TZID=${CAL_TZ}:${ev.end}`,
        `SUMMARY:${icsText(ev.title)}`, `DESCRIPTION:${icsText(ev.details)}`);
      if (ev.location) lines.push(`LOCATION:${icsText(ev.location)}`);
      if (m.join_url) lines.push(`URL:${m.join_url}`);
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.map(fold).join("\r\n") + "\r\n";
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    templateFormats: ["njk"],
  };
}
