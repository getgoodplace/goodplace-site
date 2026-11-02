# Goodplace website

The marketing site at **getgoodplace.com**: plain HTML in this repo, deployed by the Vercel project `goodplace-site` in the Goodplace team.

## How getgoodplace.com is shared with the app

The site owns the domain, and the Goodplace app (repo `getgoodplace/goodplace`) serves the buyer pages under it, like `getgoodplace.com/greatnorthern/fallview` (decision 0028 in the app repo).

`vercel.json` has one rewrite. Vercel serves this repo's own files first (`/`, `/builders`, `/assets/...`, `/api/waitlist`), and **any path the site doesn't have** goes to the app at `app.getgoodplace.com`. The buyer still sees getgoodplace.com in the address bar.

So when you add a page here, check its name isn't a builder handle. The app keeps a list of names builders can't take, in `src/lib/slug.ts` (`RESERVED_SLUGS`). Add any new top-level page or folder name there too.

## The waitlist form

`api/waitlist.js` adds sign-ups to the "Website waitlist" database in Notion. It needs two environment variables in Vercel: `NOTION_TOKEN` (the integration's secret) and `NOTION_WAITLIST_DB` (the database id). Open `/api/waitlist` in a browser to check every link in that chain.
