# Alabama Events Map — your website

Everything in this folder is the website. There's no server or database to run.

## Put it online (about 10 minutes, free)

1. Go to **app.netlify.com** and sign up (free). Signing up with Google or email is fine.
2. Choose **Add new site → Deploy manually**.
3. Unzip this folder on your computer, then **drag the whole `site` folder** onto the upload box.
4. In about 30 seconds you get a live address like `random-name-123.netlify.app`.
5. To rename it: **Site configuration → Change site name**, then type what you want (for example `alabama-events`). Your address becomes `alabama-events.netlify.app`. You can change this anytime.

## Get submissions by email

The "Submit an event" form works on Netlify with no setup. To get an email for each entry:

1. In Netlify, open your site → **Forms**. Turn on form detection if asked, then upload the folder again.
2. Go to **Forms → Form notifications → Add notification → Email notification**, and enter your email.
3. You'll see every submission in the Forms tab too. The free plan includes 100 submissions a month.

## Use your own domain later (optional)

Buy a name (about $10–15 a year) from Netlify, Namecheap or Google Domains/Squarespace. Then in Netlify go to **Domain management → Add a domain** and follow the steps. Your `.netlify.app` address keeps working and sends people to the new one.

After you have your final address, open `site.json`, set `"siteUrl"` to it (for example `"https://alabamaevents.com"`), and rebuild (below) so Facebook shows the right preview images.

## Weekly updates

- Events live in **`data/events.json`**. Each event has a title, category, town, address, dates, hours, cost, description and map position.
- Categories: `festival`, `market`, `kids`, `yard`, `church`, `community`.
- Past events disappear from the map on their own. Each weekly rebuild also removes them from the site completely: ended yard sales are deleted so no home addresses stay online, and other ended events are saved to a private `archive/past-events.json` that is never uploaded.
- To make an event **Featured** (top of the list, badge, ringed pin), set `"featured": true`.
- To show a **sponsor** in the panel, set `"sponsor"` in `site.json` to `{"label": "Sponsored", "text": "Big Daddy's Bar-B-Q, Munford", "url": "https://..."}`. Set it back to `null` to show the "Your business here" ad spot.
- After editing events, run `python3 build.py` to refresh the share pages and preview images. Claude does this automatically in the Wednesday and Thursday scans and saves the changes to GitHub, and Netlify publishes them on its own. No more dragging folders.

## The Google/Apple-style map (one-time, free)

The map uses CARTO's "Voyager" street map, which looks like Google or Apple Maps. It needs a free key:

1. Go to **carto.com/basemaps/apikey** and click **Request a key**. No account or password is needed; the key arrives by email in about a minute.
2. Open `site.json` and paste it between the quotes after `"cartoKey"`.
3. Drag the folder onto Netlify again.

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
