# Alabama Events Map

Weekly interactive map of community events across Alabama, live at https://alabama-events-map.netlify.app.
Netlify publishes the `site/` folder automatically on every push to `main`. `archive/` is private and never published.

## Layout
- `site/data/events.json`: every listed event. This is the file the scans edit.
- `site/build.py`: run `cd site && python3 build.py` after any change to events. It removes ended events (yard sales are deleted, others move to `archive/past-events.json`), rebuilds the share pages in `site/e/`, `og.png` and `sitemap.xml`. Needs Pillow.
- `site/site.json`: site name, web address, CARTO map key, sponsor.
- `site/assets/app.js`: map code (MapLibre). Don't change it during a scan.

## Event format
```json
{"id":"palmerfest-2026-10-25","title":"Palmerfest 2026","cat":"church","town":"Pinson",
 "place":"Palmerdale Cross Baptist Church","addr":"4950 Faucett Rd, Pinson, AL 35126",
 "start":"2026-10-25","end":"2026-10-25","time":"5–7pm","cost":"Free",
 "desc":"One or two plain sentences on what people will find there.",
 "lat":33.71427,"lng":-86.658317,"featured":false,"flags":["optional notes, e.g. Registration required"]}
```
- `cat` is one of: `festival`, `market`, `kids` (trunk-or-treats and kids' events), `yard` (yard, garage, estate sales), `church`, `community` (food, pets, career days, shows, everything else).
- `id`: lowercase title words joined by hyphens, then `-MM-DD` of the start date. Must be unique.
- `end` only when the event runs more than one day. `cost` may be omitted when the source doesn't say (the site shows "Not posted").
- `lat`/`lng` must come from looking up the street address (places search), never from a guess. Use 6 decimal places.

## Twice-weekly scan (Wednesday and Thursday)
1. `git pull`, then read `site/data/events.json` so you know what is already listed.
2. Search the public web for Alabama events in roughly the next 3 weeks: festivals, fall/holiday markets, craft and vendor fairs, trunk-or-treats, church and school events, community events, parades, estate sales and community/neighborhood yard sales. Good sources: city and county websites and calendars, Chambers of Commerce, church and school sites, library calendars, local news "things to do" lists (AL.com, Bham Now, Trussville Tribune, St. Clair News-Aegis, Cahaba Sun, Vestavia Voice, etc.), Eventbrite, estatesales.net, yardsalesearch.com. Facebook needs a login, so skip it. Cover the whole state, with extra attention to Jefferson and St. Clair counties.
3. Publish an event only if it has ALL of: name, date(s), start time, town, a street address that a places lookup confirms, and enough information to write a one-line description. Cost is the only detail allowed to be missing. If any other piece is missing, do not add the event; list it in the summary instead.
4. Use the event's own page or the organizer's site as the source whenever possible. Never guess or fill in a detail. If two sources disagree, use the organizer's and add a flag noting the difference.
5. Skip duplicates (same event, same date, even if worded differently) and anything already ended.
6. Privacy: never include a person's name, phone number, email or photo. For sales at a private home, list the street address only when the seller posted it publicly.
7. Write descriptions in plain words: what it is and what people will find there. No hype.
8. Run `cd site && python3 build.py`, check it prints no errors, then commit with a message like `Scan Oct 28: +6 events, -4 ended` and push to `main`. Netlify then publishes on its own.
9. Finish with a short summary for the owner: events added (title, town, date), events removed, and any events left out for missing details, with what was missing.

## Hard rules
- Never publish an event with a made-up or guessed date, time or address.
- Never delete or edit events added by hand unless they have ended or the organizer's own site shows a change.
- Keep `archive/` out of `site/`.
