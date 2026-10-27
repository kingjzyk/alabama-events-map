# Alabama Events Map — your website

Everything in this folder is the website. There's no server or database to run.

## Where it's hosted

The site is on **Cloudflare Pages** (free), connected to the GitHub repo. Every push to `main` that changes the `site/` folder publishes automatically in a minute or two. Visitor numbers are under **Cloudflare → Workers & Pages → the project → Metrics / Web Analytics**.

## Get submissions by email

The "Submit an event" form sends each entry to your email through **Web3Forms** (free). The key is `form.web3formsKey` in `site.json`. To change the email address, get a new key at web3forms.com and replace it.

## Use your own domain later (optional)

Buy a name from Cloudflare (**Domain Registration → Register Domains**, sold at cost, about $10–15 a year). Then in the Pages project go to **Custom domains → Set up a domain**. Your `.pages.dev` address keeps working.

After you have your final address, open `site.json`, set `"siteUrl"` to it (for example `"https://alabamaevents.com"`), and rebuild (below) so Facebook shows the right preview images.

## Weekly updates

- Events live in **`data/events.json`**. Each event has a title, category, town, address, dates, hours, cost, description and map position.
- Categories: `festival`, `market`, `kids`, `yard`, `church`, `community`.
- Past events disappear from the map on their own. Each weekly rebuild also removes them from the site completely: ended yard sales are deleted so no home addresses stay online, and other ended events are saved to a private `archive/past-events.json` that is never uploaded.
- To make an event **Featured** (top of the list, badge, ringed pin), set `"featured": true`.
- To show a **sponsor** in the panel, set `"sponsor"` in `site.json` to `{"label": "Sponsored", "text": "Big Daddy's Bar-B-Q, Munford", "url": "https://..."}`. Set it back to `null` to show the "Your business here" ad spot.
- After editing events, run `python3 build.py` to refresh the share pages and preview images. Claude does this automatically in the Wednesday and Thursday scans and saves the changes to GitHub, and Cloudflare publishes them on its own.

## The Google/Apple-style map (one-time, free)

The map uses CARTO's "Voyager" street map, which looks like Google or Apple Maps. It needs a free key:

1. Go to **carto.com/basemaps/apikey** and click **Request a key**. No account or password is needed; the key arrives by email in about a minute.
2. Open `site.json` and paste it between the quotes after `"cartoKey"`.
3. Push to GitHub.

The free key covers up to 1 million map tiles a month for a business site, which is plenty to start. Until a key is added, the site uses the standard OpenStreetMap style instead.

## What's in here

| File | What it is |
|---|---|
| `index.html` | The map homepage |
| `submit.html`, `thanks.html` | Submission form and confirmation page |
| `data/events.json` | All events |
| `site.json` | Site name, web address, sponsor, map tiles |
| `assets/` | Styles, map code and the Alabama basemap |
| `e/` | One share page and preview image per event, made by `build.py` |
| `og.png` | Preview image for the homepage on Facebook |
