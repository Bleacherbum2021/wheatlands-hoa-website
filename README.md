# Wheatlands HOA website

Source for the Wheatlands Homeowners Association website, hosted on Netlify.

- **Board members:** edit the site at `/admin` (sign in with your invite). You don't need to touch anything in this repository.
- **Content** lives in `src/_data/*.json` (meetings, minutes, news, documents, board, contacts, site settings).
- **Pages** are Nunjucks templates in `src/`; shared layout in `src/_includes/`.
- **Documents** are in `src/uploads/`. New uploads from the editor go to `src/uploads/docs/`.
- **Editor config** is `src/admin/config.yml` (Decap CMS, approval workflow).

Build locally: `npm install && npm start`, then open http://localhost:8080.
Netlify builds with `npm run build` and publishes `_site/`.
