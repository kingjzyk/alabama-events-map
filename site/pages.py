"""Static pages that help people (and Google) find events: one page per event and one page per town.

Used by build.py. Every page shares the header/footer below and assets/pages.css.
"""
import datetime, html, json, math, os, re

CAT_NAMES = {"festival": "Festival", "market": "Market & vendors", "kids": "Kids & trunk-or-treat",
             "yard": "Yard / estate sale", "church": "Church event", "community": "Community"}
STATE_NAMES = {"AL": "Alabama"}

esc = lambda s: html.escape(str(s or ""), quote=True)
D = datetime.date.fromisoformat


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("'", "").replace("’", "")).strip("-")


def town_slug(e):
    return slug(e["town"]) + "-" + state_of(e).lower()


def state_of(e):
    m = re.search(r",\s*([A-Z]{2})\s*\d{5}?\s*$", e.get("addr") or "")
    return m.group(1) if m else "AL"


def fmt(d):
    return d.strftime("%a, %b ") + str(d.day)


def when_line(e):
    if e.get("openEnded"):
        return "Ongoing, since " + fmt(D(e["start"]))
    s = fmt(D(e["start"]))
    if e.get("end") and e["end"] != e["start"]:
        s += " – " + fmt(D(e["end"]))
    return s


MARK = ('<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M12 70 C 44 72 50 54 32 48 C 14 42 20 31 58 32" fill="none" stroke="#e76f51" '
        'stroke-width="5" stroke-linecap="round" stroke-dasharray="1 8.5"/><circle cx="12" cy="70" r="5.5" fill="#1d3557"/>'
        '<path d="M58 32c0 0-13-12.5-13-20.5a13 13 0 0 1 26 0c0 8-13 20.5-13 20.5z" fill="#1d3557"/><circle cx="58" cy="11.5" r="5" fill="#f3f1ec"/></svg>')


def chrome(*, title, desc, canonical, up, body, head="", noindex=False, og_image=None, og_type="website"):
    """Wrap a page body in the shared header/footer. `up` is the path back to the site root ("" or "../")."""
    og = f'<meta property="og:image" content="{esc(og_image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' if og_image else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{'<meta name="robots" content="noindex">' if noindex else ''}
<link rel="canonical" href="{esc(canonical)}">
<meta property="og:type" content="{og_type}"><meta property="og:site_name" content="Side Mission">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{esc(canonical)}">
{og}<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1d3557">
<link rel="icon" href="{up}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Fraunces:opsz,wght@9..144,600..800&display=swap">
<link rel="stylesheet" href="{up}assets/pages.css">
{head}
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="{up or './'}" aria-label="Side Mission home">{MARK}side mission</a>
  <nav aria-label="Main"><a href="{up}towns.html">Towns</a><a href="{up}submit.html">Submit an event</a><a class="btn primary" href="{up}map.html">Open the map</a></nav>
</div></header>
<main>{body}</main>
<footer><div class="wrap">
  <span>Side Mission · local events on one map, updated every week · <a href="mailto:sidemissionmap@gmail.com">sidemissionmap@gmail.com</a></span>
  <nav aria-label="Footer"><a href="{up}map.html">Map</a><a href="{up}towns.html">Towns</a><a href="{up}about.html">About</a><a href="{up}privacy.html">Privacy</a><a href="{up}submit.html">Submit an event</a></nav>
</div></footer>
</body>
</html>
"""


def card(e, up):
    d = D(e["start"])
    free = re.match(r"(?i)^free", e.get("cost") or "")
    time = "" if e.get("timeTBD") else (" · " + esc(e.get("time")) if e.get("time") else "")
    end = e.get("end") or e["start"]
    return (f'<a class="card" href="{up}e/{esc(e["id"])}.html" data-start="{e["start"]}" data-end="{"2100-01-01" if e.get("openEnded") else end}">'
            f'<div class="date"><small>{d.strftime("%b")}</small><b>{d.day}</b></div>'
            f'<div><div class="t">{esc(e["title"])}</div><div class="m"><i style="background:var(--c-{e["cat"]})"></i>{esc(CAT_NAMES.get(e["cat"], "Event"))}{time}'
            f'{" · Free" if free else ""}</div></div></a>')


# Hides events that ended since the last rebuild and marks this weekend's, using the visitor's own date.
LIVE_JS = """<script>
(function(){var t=new Date();t.setHours(0,0,0,0);var d=t.getDay(),s=(d===5||d===6||d===0)?t:new Date(t.getTime()+(5-d)*864e5),
e=d===0?t:new Date(s.getTime()+((7-s.getDay())%7)*864e5);var P=function(x){x=x.split("-");return new Date(+x[0],x[1]-1,+x[2])};
document.querySelectorAll(".card[data-end]").forEach(function(c){var a=P(c.dataset.start),b=P(c.dataset.end);
if(b<t){c.remove();return}if(a<=e&&b>=s){var m=c.querySelector(".m");m.insertAdjacentHTML("beforeend"," · <b style=\\"color:#b84a2f\\">This weekend</b>")}});
document.querySelectorAll(".list").forEach(function(l){if(!l.children.length)l.outerHTML='<p class="empty">No upcoming events here right now. <a href="'+(l.dataset.map||"map.html")+'">See the whole map</a>.</p>'});
})();
</script>"""


def json_ld(e, url, img):
    m = re.match(r"^(.*?),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?\s*$", e.get("addr") or "")
    addr = {"@type": "PostalAddress", "addressRegion": state_of(e), "addressCountry": "US", "addressLocality": e["town"]}
    if m:
        addr.update(streetAddress=m.group(1), addressLocality=m.group(2))
        if m.group(4): addr["postalCode"] = m.group(4)
    data = {"@context": "https://schema.org", "@type": "Event", "name": e["title"], "description": e.get("desc", ""),
            "startDate": e["start"], "endDate": e.get("end") or e["start"],
            "eventStatus": "https://schema.org/EventScheduled", "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
            "location": {"@type": "Place", "name": e.get("place") or e["town"], "address": addr,
                         "geo": {"@type": "GeoCoordinates", "latitude": e["lat"], "longitude": e["lng"]}},
            "image": [img], "url": url}
    if re.match(r"(?i)^free", e.get("cost") or ""):
        data["isAccessibleForFree"] = True
        data["offers"] = {"@type": "Offer", "price": "0", "priceCurrency": "USD", "availability": "https://schema.org/InStock", "url": url}
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + "</script>"


def event_page(e, base, all_events):
    """A real, readable page for one event (Google can index it), with buttons to the map and directions."""
    url = f"{base}/e/{e['id']}" if base else f"{e['id']}.html"
    img = f"{base}/e/{e['id']}.png" if base else f"{e['id']}.png"
    yard = e["cat"] == "yard"
    place = e.get("place") or ""
    where = esc(place) + (f"<small>{esc(e.get('addr'))}</small>" if e.get("addr") else "")
    q = e.get("addr") or ", ".join(x for x in [place, e["town"]] if x)
    directions = "https://www.google.com/maps/dir/?api=1&destination=" + html.escape(re.sub(r"\s+", "+", q))
    flags = "".join(f"<li>{esc(f)}</li>" for f in e.get("flags", []))
    tslug = town_slug(e)
    others = [x for x in all_events if x["town"] == e["town"] and x["id"] != e["id"]][:4]
    desc = f"{when_line(e)}{' · ' + e['time'] if e.get('time') and not e.get('timeTBD') else ''} in {e['town']}. {e.get('desc','')}"
    body = f"""<div class="wrap">
  <div class="crumbs"><a href="../towns.html">Towns</a> › <a href="../town/{tslug}.html">{esc(e['town'])}</a></div>
  <div class="ended" id="ended" hidden>This event has already happened. <a href="../map.html">See what’s coming up</a>.</div>
  <div class="event">
    <article class="ev-card">
      <span class="tag"><i style="background:var(--c-{e['cat']})"></i>{esc(CAT_NAMES.get(e['cat'], 'Event'))} · {esc(e['town'])}</span>
      <h1>{esc(e['title'])}</h1>
      <dl class="facts">
        <dt>When</dt><dd>{esc(when_line(e))}<small>{esc(e.get('time') or '')}</small></dd>
        <dt>Where</dt><dd>{where}</dd>
        <dt>Cost</dt><dd>{esc(e.get('cost') or 'Not posted')}</dd>
      </dl>
      <p class="desc">{esc(e.get('desc', ''))}</p>
      {f'<ul class="flags">{flags}</ul>' if flags else ''}
      <div class="btns"><a class="btn primary" href="../map.html?e={esc(e['id'])}">See it on the map</a><a class="btn" href="{directions}" target="_blank" rel="noopener">Directions</a></div>
      <p class="note">Details come from the organizer or a public listing and can change. Something wrong? <a href="../submit.html?type=correction">Tell us</a>.</p>
    </article>
    <aside class="side">
      <h2>More in {esc(e['town'])}</h2>
      <p>Other upcoming events nearby.</p>
      <div class="list" style="grid-template-columns:minmax(0,1fr);margin-top:0" data-map="../map.html?q={esc(e['town'])}">{''.join(card(x, '../') for x in others)}</div>
      <a class="btn" href="../town/{tslug}.html">All events in {esc(e['town'])}</a>
    </aside>
  </div>
</div>
<script>(function(){{var t=new Date();t.setHours(0,0,0,0);var x="{e.get('end') or e['start']}".split("-");if({'false' if e.get('openEnded') else 'true'}&&new Date(+x[0],x[1]-1,+x[2])<t)document.getElementById("ended").hidden=false}})();</script>
{LIVE_JS}"""
    return chrome(title=f"{e['title']} · {when_line(e)} · {e['town']}, {STATE_NAMES.get(state_of(e), state_of(e))}",
                  desc=desc[:300], canonical=url, up="../", body=body, og_image=img, og_type="article",
                  noindex=yard, head="" if yard else json_ld(e, url, img))


def dist(a, b):
    # miles between two (lat, lng) points
    r = 3958.8
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dl, dp = math.radians(b[1] - a[1]), p2 - p1
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def town_pages(root, base, events):
    """One page per town that has upcoming events, plus towns.html listing them all. Returns the page URLs."""
    outdir = os.path.join(root, "town"); os.makedirs(outdir, exist_ok=True)
    towns = {}
    for e in sorted(events, key=lambda e: (e["start"], e["title"])):
        towns.setdefault(town_slug(e), []).append(e)
    centers = {k: (sum(e["lat"] for e in v) / len(v), sum(e["lng"] for e in v) / len(v)) for k, v in towns.items()}
    urls = []
    for k, evs in towns.items():
        name, st = evs[0]["town"], state_of(evs[0]); sname = STATE_NAMES.get(st, st)
        near = sorted((dist(centers[k], centers[o]), o) for o in towns if o != k)
        near = [o for d_, o in near if d_ <= 30][:8]
        near_html = "".join(f'<a href="{o}.html">{esc(towns[o][0]["town"])} <span>{len(towns[o])}</span></a>' for o in near)
        cats = sorted({CAT_NAMES[e["cat"]].lower() for e in evs})
        url = f"{base}/town/{k}" if base else f"{k}.html"
        body = f"""<div class="wrap">
  <div class="crumbs"><a href="../towns.html">Towns</a> › {esc(name)}</div>
  <span class="eyebrow">{esc(sname)}</span>
  <h1>Things to do in {esc(name)}</h1>
  <p class="lede">Upcoming festivals, markets, yard sales, church and community events in and around {esc(name)}, {esc(sname)}. Checked and updated twice a week.</p>
  <div class="btns" style="margin-top:20px"><a class="btn primary" href="../map.html?q={esc(name)}">See {esc(name)} on the map</a><a class="btn" href="../submit.html">List an event here, free</a></div>
  <h2>Coming up in {esc(name)}</h2>
  <div class="list" data-map="../map.html?q={esc(name)}">{''.join(card(e, '../') for e in evs)}</div>
  {f'<h2>Nearby towns</h2><div class="towns">{near_html}</div>' if near_html else ''}
</div>
{LIVE_JS}"""
        desc = f"Things to do in {name}, {sname}: {len(evs)} upcoming events including {', '.join(cats[:3])}. Dates, times, addresses and directions."
        open(os.path.join(outdir, k + ".html"), "w").write(
            chrome(title=f"Things to do in {name}, {sname} this weekend · Side Mission", desc=desc, canonical=url, up="../", body=body))
        urls.append(f"{base}/town/{k}")
    for f in os.listdir(outdir):
        if f.endswith(".html") and f[:-5] not in towns: os.remove(os.path.join(outdir, f))
    # the towns index
    groups = {}
    for k, evs in towns.items(): groups.setdefault(state_of(evs[0]), []).append(k)
    sections = ""
    for st in sorted(groups):
        links = "".join(f'<a href="town/{k}.html">{esc(towns[k][0]["town"])} <span>{len(towns[k])}</span></a>'
                        for k in sorted(groups[st], key=lambda k: towns[k][0]["town"]))
        sections += f'<h2>{esc(STATE_NAMES.get(st, st))}</h2><div class="towns">{links}</div>'
    body = f"""<div class="wrap">
  <h1>Find things to do by town</h1>
  <p class="lede">Every town with upcoming events on Side Mission. Pick yours to see what’s coming up nearby.</p>
  {sections}
</div>"""
    open(os.path.join(root, "towns.html"), "w").write(
        chrome(title="Things to do by town · Side Mission", desc="Browse upcoming festivals, markets, yard sales and community events by town.",
               canonical=f"{base}/towns" if base else "towns.html", up="", body=body))
    return urls + [f"{base}/towns"]


def static_pages(root, base):
    """About and Privacy. Edit the wording here; build.py rewrites the files every run."""
    about = """<div class="wrap narrow prose">
  <span class="eyebrow">About</span>
  <h1>Your weekend, mapped</h1>
  <p class="lede">Side Mission is a free map of local events: festivals, fall and holiday markets, yard and estate sales, trunk-or-treats, church and school events, and community happenings.</p>
  <h2>How events get on the map</h2>
  <p>Twice a week we search public sources such as city and county calendars, chambers of commerce, libraries, churches, schools, local news and public listing sites. An event goes on the map only when it has a name, a date, a town and a street address we can confirm on a map, so every pin is a real place you can drive to.</p>
  <p>Organizers can also <a href="submit.html">submit events for free</a>. We check every submission, usually within a day.</p>
  <h2>Keeping it accurate</h2>
  <p>We use the organizer’s own page whenever we can and never guess a date, time or address. If a start time hasn’t been posted yet, the listing says so and we keep checking. Events disappear from the map on their own once they’re over. Spot something wrong? <a href="submit.html?type=correction">Send a correction</a> and we’ll fix it.</p>
  <h2>Where we are</h2>
  <p>Side Mission is live in Alabama, with more states on the way. Want it in your state? Pick it when you sign up for the weekend list on the <a href="./">home page</a>.</p>
  <h2>Businesses and organizers</h2>
  <p>Listing an event is free. Featured listings and sponsor spots help keep the map running. <a href="submit.html?type=featured">Ask about featuring</a>.</p>
  <h2>Contact</h2>
  <p><a href="mailto:sidemissionmap@gmail.com">sidemissionmap@gmail.com</a></p>
</div>"""
    privacy = """<div class="wrap narrow prose">
  <span class="eyebrow">Privacy</span>
  <h1>Privacy policy</h1>
  <p class="lede">Short version: you can use Side Mission without an account, we don’t sell your information, and we only collect what you choose to send us.</p>
  <p><small>Last updated October 29, 2026</small></p>
  <h2>What you send us</h2>
  <ul>
    <li><b>Event submissions and corrections.</b> The form asks for event details plus your name and email so we can follow up. Your name and email are never shown on the site.</li>
    <li><b>The weekend email list.</b> If you sign up, we keep your email and the state you picked, and use them only to send the weekend list and to tell you when Side Mission reaches your state. Every email will have a way to unsubscribe, or you can email us to be removed.</li>
  </ul>
  <p>Forms are delivered to our inbox by Web3Forms, a form service that processes the message to send it to us.</p>
  <h2>What stays on your device</h2>
  <p>Events you save, your theme and map type, and similar settings are stored in your own browser. They are not sent to us. Clearing your browser data removes them.</p>
  <h2>Location</h2>
  <p>“Near me” asks your browser for your location only when you tap it, and uses it on your device to center the map. It is not sent to us.</p>
  <h2>Visitor counts</h2>
  <p>We use Cloudflare Web Analytics to count visits and see which pages are popular. It does not use cookies and does not track you across other sites.</p>
  <h2>Services that load parts of the site</h2>
  <p>Like most websites, pages load some pieces from other companies, which receive your IP address and basic browser details as part of that request: the site is hosted by Cloudflare; map tiles come from CARTO and, in satellite view, the U.S. Geological Survey; fonts come from Google Fonts. Street View, Directions and Live traffic buttons open Google Maps, which has its own privacy policy.</p>
  <h2>Yard and estate sales</h2>
  <p>Sales at a private home show a street address only when the seller posted it publicly, are kept out of search engines, and are deleted from the site once the sale ends. To have a listing removed, <a href="submit.html?type=removal">ask here</a>.</p>
  <h2>Children</h2>
  <p>Side Mission is meant for a general audience and doesn’t knowingly collect information from children under 13.</p>
  <h2>Changes and contact</h2>
  <p>If this policy changes, we’ll update the date above. Questions or requests: <a href="mailto:sidemissionmap@gmail.com">sidemissionmap@gmail.com</a>.</p>
</div>"""
    open(os.path.join(root, "about.html"), "w").write(chrome(title="About · Side Mission", desc="How Side Mission finds, checks and maps local events.",
                                                             canonical=f"{base}/about" if base else "about.html", up="", body=about))
    open(os.path.join(root, "privacy.html"), "w").write(chrome(title="Privacy policy · Side Mission", desc="What Side Mission collects and how it is used.",
                                                               canonical=f"{base}/privacy" if base else "privacy.html", up="", body=privacy))
