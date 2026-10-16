# Aster — India-first finance daily

A standalone, login-free website for GitHub Pages or any static host. There is no ChatGPT hosting integration, account system, visitor login, paid data key or paid AI dependency. Open the site normally on your own domain.

## Run locally

Install Node.js 24 LTS, then run:

```sh
npm ci
npm test
npm run preview
```

Open http://127.0.0.1:8788. The preview now fetches feeds on startup and automatically refreshes them every 15 minutes while the server runs. No manual rebuild is needed for normal local reading. Stop it with Ctrl+C; set REFRESH_MINUTES to change the local interval (minimum 5 minutes). `site/` is the deployable website. `node scripts/build.mjs --offline` rebuilds using the last successful local snapshots; the UI labels fallback data. Fresh builds fetch upstream sources on the build machine, avoiding browser CORS restrictions. Opening index.html through file:// is not supported; use the preview server.

## Deploy on your GitHub account

1. Create a **public** repository under `arpitagarwala`, using `main` as the default branch. Public GitHub Pages and standard Actions runners work with GitHub Free; your custom domain registration is separate.
2. Upload this project's source files, including `.github/workflows/pages.yml`, `package.json`, `package-lock.json`, `worker/`, `scripts/`, `tests/` and `data/`. Do not upload `node_modules`, `.cache`, `.git` or `site`.
3. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**.
4. Push to main or run **Actions → Refresh finance edition and deploy → Run workflow**. The workflow builds and deploys `site/`. It also runs hourly at minute 17 UTC, including while the website is closed. Each hour corresponds to minute 47 IST. This covers every day; it is not instant/streaming news.
5. Add your domain in **Settings → Pages → Custom domain**, configure the DNS records GitHub provides, and enable **Enforce HTTPS**. Optionally set the repository Actions variable `CUSTOM_DOMAIN` to your hostname (no https:// or path); the build will generate CNAME. Relative data URLs also support a repository subpath such as `/aster-news/`.

No personal access token, data API key or visitor credentials are needed. GitHub supplies its own short-lived workflow deployment token automatically. Only you, as repository owner, use normal GitHub administration to enable Pages and configure your domain.

GitHub schedules are best effort and may be delayed. Scheduled workflows in inactive public repositories may be disabled after 60 days without repository activity; re-enable them in Actions if necessary. A push or manual run refreshes immediately. The app shows the edition timestamp and flags updates older than 30 hours. The browser still hides news older than seven days even if scheduled updates stop.

Official hosting references:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule

## Focus and freshness

The edition selects up to eight headlines using transparent rules: Indian policy, macro, regulatory and major-company developments rank above general foreign stories. Speculative stock tips, routine auctions, repeat company coverage and duplicate rupee stories receive lower priority. Critical policy or market-disruption stories can exceed the eight-story cap and remain visible despite topic preferences. This is deterministic ranking, not a claim that every important market event can be detected.

Stories must have a valid published time, must not be future-dated and cannot be older than seven days. The browser repeats the age check while the page is open; old unsaved stories disappear. Saved stories deliberately remain in the device-local reading list. News dates are displayed so yesterday's reporting is not presented as today's release. Upcoming events are separate from published news.

The front page puts Indian CPI, GDP, IIP, RBI meetings and company results before headlines. The calendar defaults to India. Global calendars remain available via the country filter. Company results default to the official Nifty 100 universe, Results filter and next seven days. All 100 companies are tracked without manual watchlist entry; a coverage table lists members without a date in the available feeds. Choose All listed companies to broaden the diary. The official index CSV is refreshed on each build with a validated cached fallback. Exact exchange symbols, ISINs and normalized company names determine membership; broad brand keywords are not used. Times are shown in IST, with no invented time for date-only schedules.

## Reliable free Indian sources

- **RBI:** published FY 2026–27 MPC schedule, refreshed from https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=62422. Each record preserves the full meeting period and final scheduled day. The scheduled build watches RBI RSS for newly announced annual meeting schedules and retains the latest discovered official URL. If a new announcement is missed while the workflow is disabled, update RBI_URL in scripts/india-calendar.mjs. No future meetings are extrapolated.
- **MoSPI:** the build discovers the latest official advance-release PDF through https://www.mospi.gov.in/api/documents/get-latest-release-calender and parses CPI/GDP/IIP dates. The public release-calendar API is also used. The PDF parser validates fiscal year and required indicators; a layout change triggers a clearly labelled last-verified snapshot instead of guessed dates.
- The checked-in Indian snapshot was verified on 16 October 2026 and covers scheduled releases through March 2027. Its source URL and fetchedAt are stored per event. Weekend dates are moved to Monday using the calendar's next-working-day instruction, and remain marked planned: public holidays and official revisions can still shift them. No release time is invented.
- **Company dates:** BSE forthcoming results, NSE board meetings and NSE corporate actions. Results meetings are not published earnings figures. Corporate actions use ex-dates with record dates described separately. Source links, retrieval timestamps and duplicate merging are retained.
- **News:** Economic Times markets/economy RSS, RBI and Federal Reserve RSS, with Moneycontrol attempted only if fresh. A responding but stale RSS endpoint is marked unavailable.
- **Global fallback:** official BLS and BEA calendars plus Forex Factory's weekly feed. Forecasts appear only when a source supplies them; actual outcomes are not fabricated.

Public feed availability and automated access are not guaranteed, and exchange website endpoints can change or block GitHub datacenter traffic. Workflow caching and the checked-in data/bootstrap snapshots preserve last successful data through temporary failures, with original timestamps and stale labels. Bootstrap news still expires after seven days. If all sources fail, the app reports the gap; it does not manufacture headlines or events. No free source arrangement guarantees exchange-grade real-time coverage. Review source redistribution terms for any public/commercial use.

## Project layout

- `worker/index.js`: upstream adapters plus the embedded website. Used only during the Node build; visitors receive static HTML and JSON.
- `worker/priorities.mjs`: headline freshness, deduplication and priority rules.
- `scripts/india-calendar.mjs`: official RBI HTML and MoSPI PDF parsing.
- `scripts/build.mjs`: source collection, fallbacks and static export.
- `scripts/serve.mjs`: local static preview.
- `data/india-schedule.json`: last verified official Indian calendar snapshot.
- `.github/workflows/pages.yml`: tests, hourly updates and Pages deployment.

Tests cover priority limits, critical overflow, seven-day expiry, future-date rejection, Indian weighting, routine-auction suppression, official meeting periods, DST conversion, corporate duplicate merging, calendar source outages and cached recovery. The build validates the embedded browser script before exporting.


## Table views and automatic tracking

The economic diary uses Date/IST, Event, Impact, Actual, Forecast and Previous columns; unavailable values are dashes, never fabricated. Company rows show dates, names, sectors, event type, schedule and source. Details expand inline for evidence and explanations. Phone layouts stack the essential fields instead of squeezing seven columns. Update timing is listed under Sources. Locally, the server must stay running; deployed GitHub updates run independently of your computer. Scheduling is best effort and source availability can cause delays.


## Published calendar figures and recent releases

`scripts/calendar-values.mjs` reads the public Trading Economics calendar HTML without an API key. It validates the page’s UTC timezone, converts display times to IST, and preserves actual, previous, consensus and model forecasts independently. The Forecast column prefers consensus and labels model estimates as TE model. Rows retain reference periods and source links. Different measured series never share values just because they have the same release date. Public-page access is best effort, not a guaranteed free API.

The economic diary includes yesterday plus the selected future range. `.cache/calendar-history.json` preserves yesterday’s events through feed rollovers; the existing GitHub Actions cache carries this between scheduled builds. Older calendar history expires automatically. Official Indian schedules stay as fallbacks when figure sources are unavailable. Unknown release times have no time label.
