# Wheatlands HOA website

Public website of the Wheatlands Homeowners Association (991 homes, Aurora, IL). Maintained by Mike Hylek; board members edit content through an approval-gated editor.

## Where things live

| What | Where |
| --- | --- |
| Live site | https://www.wheatlandshoa.org (also https://wheatlands-hoa.netlify.app). DNS is at GoDaddy; the Weebly site is kept until the Board cancels it |
| Repo | github.com/Bleacherbum2021/wheatlands-hoa-website, branch `main`. **Public** (Netlify's free plan only builds one contributor's commits on private repos), so never commit anything that shouldn't be on the public site, drafts included. Ignore the stray `wheatlands-hoa` repo; Netlify does not use it. |
| Hosting | Netlify project `wheatlands-hoa`, site id `21ac6918-e487-4485-ba18-defaca57b937`, team `mhylek` (free plan) |
| Board editor | `/admin` (Decap CMS 3.16.3, git-gateway + Netlify Identity, invite-only, editorial workflow) |
| Contact form | Netlify Forms, form name `question`, posts to `/thanks.html` |

Every push to `main` builds and publishes automatically (about 20 s). Board-editor drafts live on `cms/*` branches until published.

### Preview first, then publish

Mike wants to see changes before they go live. For any site change:

1. Commit to a new branch (`claude/<short-topic>`), push it, and open a pull request into `main` (REST API: `gh api repos/Bleacherbum2021/wheatlands-hoa-website/pulls -f head=… -f base=main -f title=… -f body=…`).
2. Netlify builds a Deploy Preview for the pull request at `https://deploy-preview-<PR number>--wheatlands-hoa.netlify.app`. Wait for it (check with the Netlify connector, not GitHub), spot-check it, and send Mike that link.
3. Merge into `main` only after Mike approves. That is the publish.

Group related changes into one pull request: each publish to `main` uses 15 of the free plan's 300 monthly credits, and running out takes the site offline until the next month. Deploy previews are not listed as costing credits. Notes-only changes (this file, README) can go straight to `main`.

Local preview: `npm install && npm start`, then http://localhost:8080 (refreshes on save).

### Go easy on GitHub

The GitHub account was suspended 2026-11-06 to 11-09 after GitHub's abuse detection flagged a burst of activity from a Claude session (pushes, a pull request, a merge and commit-status polling every 10 seconds, all within minutes). To avoid a repeat:

- Clone once per session, shallow. Batch edits locally, commit once, push once per change.
- Check build and deploy status with the Netlify connector, never by polling GitHub (no `gh api …/statuses` loops).
- No retry loops against GitHub. If a GitHub call fails, stop and tell Mike.
- If GitHub is unavailable again: build the site and give Mike a zip to upload with the Netlify API (PowerShell `Invoke-RestMethod` POST to `/api/v1/sites/<site id>/deploys`, `Content-Type: application/zip`). Anything published that way must be ported back into this repo, or the next Git build undoes it.

## Email consent drive

- `/email-consent.html` (`src/email-consent.njk`) collects homeowners' written consent to email notices and e-voting (765 ILCS 160/1-85), using the Board's consent wording. Netlify form `email-consent`, thanks page `/email-consent-thanks.html`, paper form `/uploads/docs/wheatlands-email-consent-form.pdf`. One signature per home.
- Until the Board and attorney approve it, both pages are `noindex` and `eleventyExcludeFromCollections` (kept out of the sitemap) and nothing links to them. To launch: remove both front-matter flags and add a home-page notice, a footer link in `base.njk` and a line under Forms on the Documents page.
- Progress bar: `site.json` → `email_consent` (`count`, `updated`, `total`, `goal`), editable in /admin under Site settings. Count one sign-up per home: online submissions whose address is in `src/_data/hoa_addresses.json`, plus paper forms. Never publish which homes have or haven't signed up.
- `hoa_addresses.json` holds the 994 street addresses from the resident directory (Nov 2026); the address field only accepts these. It includes 2211, 2241 and 2261 S Eola Rd, which may not be HOA homes (the site says 991). Never add owner names, emails or phones.
- Amending the Declaration takes 75% of total votes (Declaration §10.02), about 744 of 991 homes; the page pitches sign-up around that. By-Laws are amended by 2/3 of the Directors (Article XII), not by homeowners.

## Build

- Eleventy 3.1.6, Nunjucks templates, ESM config (`eleventy.config.js`). `npm install && npm start` for local preview; Netlify runs `npm run build` and publishes `_site/`.
- `src/_data/*.json`: ALL editable content. The editor writes these files, so keep their shape stable and update `src/admin/config.yml` whenever a field is added, renamed or removed.
  - `meetings.json`: year, time, note, `meetings[]` (date ISO, title, type `open|work|none`, note, join_url, join_label, dial_in)
  - `minutes.json`: `years[]` with `entries[]` (label, file, note), portal_note, approval_note
  - `news.json`: `posts[]` (optional `home_until`: shown in the home-page Reminder banner through that day; optional `archive_after`: moves to the collapsed "Past news" section after that day; both handled client-side by `site.js` between builds, so nothing needs removing by hand), `events[]`, `updates[]` (status `in-progress|done`; first four show on the home page)
  - `documents.json`: forms, governing, resolutions, budgets, sub_associations
  - `board.json`, `contacts.json`, `site.json` (property manager, board email, assessment notice, stats, links)
  - `redirects.json`: old Weebly URLs → new pages (rendered as meta-refresh stubs by `src/redirects.njk`)
- `src/_includes/base.njk` (layout, nav, footer) and `macros.njk` (doc lists, next-meeting cards, minutes years, updates).
- Pages: `index`, `about`, `meetings`, `assessments`, `documents`, `news`, `contacts`, `thanks` (`.njk`, permalinks `/x.html`).
- Calendar: `src/meetings-ics.njk` builds `/meetings.ics` (subscribable feed, all meetings) and `src/calendar-event.njk` builds `/calendar/<date>.ics` per meeting, both from `meetings.json`; filters `ics`, `calFile`, `googleCalUrl` in `eleventy.config.js`. Entries are one hour, Central time; `siteUrl` comes from Netlify's `URL`, so links follow the custom domain after cutover.
- News posts: `src/news-post.njk` gives each `news.json` post its own page at `/news/<date>-<title-slug>.html` (slug from the `postSlug` filter) with Facebook link-preview tags; `shareRow` macro adds a Share button (device share menu, or copies the link where that isn't available). Changing a post's title or date changes its URL. Facebook doesn't allow apps to post to groups, so sharing to the HOA group is a manual tap.
- `src/assets/site.js`: mobile menu; marks past meetings "Held", shows the soonest upcoming meeting card, labels past events (runs client-side, Central time, so the site stays current between builds).
- `src/assets/styles.css`: design tokens on `:root` (wheat + prairie green, Source Serif 4 + Public Sans; flat, square-cornered, no shadows or uppercase labels). Reuse existing classes; don't add a framework.

## Rules

- **Never change document URLs.** Legacy files stay at `src/uploads/7/2/1/6/7216816/…` (same paths as Weebly, so emailed links keep working). New uploads go to `src/uploads/docs/`.
- Keep old Weebly page URLs working (`redirects.json`).
- Content changes go in the JSON data, not hard-coded in templates.
- Dates are ISO `YYYY-MM-DD` strings.
- No private homeowner information (balances, violations, personal phone numbers).
- Pin any CDN script to an exact version.
- Preview first (see above). After merging, confirm the Netlify deploy is `ready` and spot-check the changed page.
- Commit messages: plain English describing the content change (board members see the history).

## Open items

- The board email shown is Wheatlandshoa@gmail.com. The old Weebly site listed two other addresses; confirm with the Board before changing.
