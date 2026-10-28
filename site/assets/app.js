/* Side Mission (Alabama events map) — site script.
   Events live in data/events.json and site settings in site.json; edit those, not this file. */
(async function(){
const GEO=window.GEO;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const mobile=()=>window.matchMedia("(max-width:820px)").matches;
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
function toast(msg){const t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2200)}

let SITE={siteName:"Side Mission",tiles:null,sponsor:null},EVENTS=[];
try{SITE=Object.assign(SITE,await (await fetch("site.json",{cache:"no-cache"})).json())}catch(e){}
try{EVENTS=await (await fetch("data/events.json",{cache:"no-cache"})).json()}catch(e){$("list").innerHTML='<p class="empty">Events could not load. Refresh the page to try again.</p>';return}
$("siteNameText").textContent=SITE.siteName;

const CATS={
  festival:{name:"Festivals",one:"Festival",g:'<path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"/>'},
  market:{name:"Markets",one:"Market & vendors",g:'<path fill-rule="evenodd" d="M6 7V6a6 6 0 0 1 12 0v1h3l-1 15H4L3 7zm2 0h8V6a4 4 0 0 0-8 0z"/>'},
  kids:{name:"Kids & trunk-or-treat",one:"Kids & trunk-or-treat",g:'<path d="M12 2a7 7 0 0 1 7 7c0 4.4-3.6 8-7 8s-7-3.6-7-8a7 7 0 0 1 7-7zm-1 15.5h2l-.4 1.4c1 .8 1 2.3 0 3.1l-1-.6c.5-.4.5-1.1 0-1.5z"/>'},
  yard:{name:"Yard sales",one:"Yard sale",g:'<path fill-rule="evenodd" d="M3 3h8l10 10-8 8L3 11zm4.5 2.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>'},
  church:{name:"Church",one:"Church event",g:'<path d="M10.5 2h3v5h5v3h-5v12h-3V10h-5V7h5z"/>'},
  community:{name:"Community & food",one:"Community",g:'<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>'}
};
const HEART='<svg class="heart" viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>';
const THEMES=[
 {id:"halloween",name:"Halloween",note:"Oct",months:[9],sw:["#ff7a1a","#17111e"]},
 {id:"harvest",name:"Fall harvest",note:"Sep, Nov",months:[8,10],sw:["#b4441c","#f6ecd9"]},
 {id:"christmas",name:"Christmas",note:"Dec",months:[11],sw:["#e0453f","#133128"]},
 {id:"winter",name:"Winter",note:"Jan–Feb",months:[0,1],sw:["#2c6cb0","#f5f9fc"]},
 {id:"spring",name:"Spring",note:"Mar–May",months:[2,3,4],sw:["#c2406f","#f7fbf1"]},
 {id:"summer",name:"Summer",note:"Jun–Aug",months:[5,6,7],sw:["#d94b22","#8fd0e1"]}
];

// ---------- dates ----------
const D=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const today=new Date();today.setHours(0,0,0,0);
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const FAR=new Date(2100,0,1);
const endOf=e=>e.end?D(e.end):(e.openEnded?FAR:D(e.start));
const fmt=d=>d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const dow=today.getDay();
const wkStart=(dow===5||dow===6||dow===0)?today:addDays(today,5-dow);
const wkEnd=dow===0?today:addDays(wkStart,(7-wkStart.getDay())%7);
const overlaps=(e,a,b)=>D(e.start)<=b&&endOf(e)>=a;
const upcoming=EVENTS.filter(e=>endOf(e)>=today);
const isFree=e=>/^free/i.test(e.cost||"");

// ---------- state ----------
const monthTheme=THEMES.find(t=>t.months.includes(new Date().getMonth())).id;
let themePref=store.get("al-theme")||"auto";
let when="all",query="",onlySaved=false,me=null;
const on=new Set(Object.keys(CATS));
let saved=new Set();try{saved=new Set(JSON.parse(store.get("al-saved")||"[]"))}catch(e){}
const saveSaved=()=>store.set("al-saved",JSON.stringify([...saved]));

// ---------- phone bottom sheet ----------
const panel=document.querySelector(".panel");let sheet="peek";
const PEEK=()=>{const h=$("siteName");return Math.min(Math.max(Math.round(h.offsetTop+h.offsetHeight+16),96),panel.offsetHeight)};
function sheetY(s){const H=panel.offsetHeight;return s==="full"?0:s==="half"?Math.round(H*.48):H-PEEK()}
function sheetVisible(){return mobile()?panel.offsetHeight-sheetY(sheet):0}
function setSheet(s){sheet=s;if(!mobile()){panel.style.removeProperty("--sheet-y");return}
  const y=sheetY(s);panel.style.setProperty("--sheet-y",y+"px");
  document.documentElement.style.setProperty("--sheet-peek",(Math.min(panel.offsetHeight-y,panel.offsetHeight-sheetY("half"))+8)+"px");
  $("grab").setAttribute("aria-expanded",s!=="peek")}
(function(){
  let y0=0,t0=0,start=0,moved=false,drag=false;
  const startDrag=ev=>{if(!mobile())return;if(ev.target.closest("a,button:not(.grab),input,select,textarea"))return;
    drag=true;moved=false;y0=ev.clientY;t0=performance.now();start=sheetY(sheet);panel.classList.add("dragging");ev.target.setPointerCapture&&ev.target.setPointerCapture(ev.pointerId)};
  const move=ev=>{if(!drag)return;const dy=ev.clientY-y0;if(Math.abs(dy)>4)moved=true;
    const y=Math.max(0,Math.min(panel.offsetHeight-PEEK(),start+dy));panel.style.setProperty("--sheet-y",y+"px")};
  const end=ev=>{if(!drag)return;drag=false;panel.classList.remove("dragging");
    if(!moved){if(ev.target.closest(".grab"))setSheet(sheet==="peek"?"half":sheet==="half"?"full":"peek");else setSheet(sheet);return}
    const dy=ev.clientY-y0,v=dy/Math.max(1,performance.now()-t0),y=start+dy,H=panel.offsetHeight;
    const stops=[["full",0],["half",sheetY("half")],["peek",sheetY("peek")]];
    let target=stops.reduce((a,b)=>Math.abs(b[1]-y)<Math.abs(a[1]-y)?b:a)[0];
    if(v<-.5)target=sheet==="peek"?"half":"full";else if(v>.5)target=sheet==="full"?"half":"peek";
    setSheet(target)};
  [$("grab"),document.querySelector(".p-head")].forEach(el=>el.addEventListener("pointerdown",startDrag));
  window.addEventListener("pointermove",move);window.addEventListener("pointerup",end);window.addEventListener("pointercancel",end);
  $("q").addEventListener("focus",()=>{if(mobile()&&sheet!=="full")setSheet("full")});
  window.addEventListener("resize",()=>setSheet(sheet));
})();

// ---------- map (MapLibre: smooth GPU zoom like Google/Apple Maps) ----------
const T=SITE.tiles||{};const KEY=T.cartoKey||"";const kq=KEY?"?key="+encodeURIComponent(KEY):"";
const OSM_STYLE={version:8,sources:{osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,maxzoom:19,
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}},layers:[{id:"osm",type:"raster",source:"osm"}]};
const STYLES={light:T.lightStyle||("https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"+kq),
              dark:T.darkStyle||("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"+kq)};
const RINGS=GEO.al.map(r=>{const c=r.map(p=>[p[1],p[0]]);c.push(c[0]);return c});
const lngs=RINGS.flat().map(p=>p[0]),lats=RINGS.flat().map(p=>p[1]);
const AL_BBOX=[[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]];
const MASK={type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]],...RINGS]}};
const EDGE={type:"Feature",properties:{},geometry:{type:"MultiLineString",coordinates:RINGS}};
const activeTheme=()=>themePref==="auto"?monthTheme:themePref;
const isDark=a=>a==="halloween"||a==="christmas"||(a==="none"&&(document.documentElement.getAttribute("data-theme")==="dark"||(document.documentElement.getAttribute("data-theme")!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)));
const TINT={harvest:"sepia(.3) saturate(.95)",winter:"saturate(.65) hue-rotate(-8deg) brightness(1.02)",spring:"saturate(.9) hue-rotate(-6deg)",summer:"sepia(.15) saturate(1.05)",
};
function pad(x){x=x||0;return mobile()?{top:64+x,bottom:sheetVisible()+16+x,left:16+x,right:16+x}:{top:76+x,bottom:30+x,left:440+x,right:30+x}}
let styleKind=isDark(activeTheme())?"dark":"light",usingOSM=false,styleReady=false;
const map=new maplibregl.Map({container:"map",style:STYLES[styleKind],bounds:AL_BBOX,fitBoundsOptions:{padding:pad(0)},
  maxBounds:[[AL_BBOX[0][0]-4,AL_BBOX[0][1]-2.5],[AL_BBOX[1][0]+4,AL_BBOX[1][1]+2.5]],minZoom:5,maxZoom:18.5,
  dragRotate:false,pitchWithRotate:false,touchPitch:false,renderWorldCopies:false,attributionControl:false,fadeDuration:120,
  maxTileCacheZoomLevels:6,refreshExpiredTiles:false});
map.touchZoomRotate.disableRotation();map.keyboard.disableRotation();
map.addControl(new maplibregl.NavigationControl({showCompass:false}),"bottom-right");
map.addControl(new maplibregl.AttributionControl({compact:true}),"bottom-right");
map.on("error",ev=>{ // CARTO unreachable before the first style loads: fall back to OpenStreetMap
  if(!styleReady&&!usingOSM){usingOSM=true;map.setStyle(OSM_STYLE)}});

// ---------- map views: Map / Satellite / Hybrid (+ optional TomTom traffic) ----------
const SAT_SRC={type:"raster",tiles:["https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}"],tileSize:256,maxzoom:16,
  attribution:'Imagery: <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map" target="_blank" rel="noopener">USGS The National Map</a> (USDA NAIP)'};
const TT_KEY=T.tomtomKey||"";
const TRAFFIC_SRC=TT_KEY?{type:"raster",tiles:["https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?tileSize=256&key="+encodeURIComponent(TT_KEY)],tileSize:256,
  attribution:'Traffic &copy; <a href="https://www.tomtom.com" target="_blank" rel="noopener">TomTom</a>'}:null;
let mapView=store.get("al-view")||"map";if(!["map","satellite","hybrid"].includes(mapView))mapView="map";
let trafficOn=!!TRAFFIC_SRC&&store.get("al-traffic")==="1";
const firstLabelLayer=()=>{const L=(map.getStyle().layers||[]);const l=L.find(x=>x.type==="symbol"&&!["mask","al-glow","al-edge","events-src"].includes(x.id));return l?l.id:"mask"};
function applyLayers(){
  if(!map.getLayer("mask"))return;
  if(map.getLayer("sat"))map.removeLayer("sat");
  if(map.getLayer("traffic"))map.removeLayer("traffic");
  if(mapView!=="map"){
    if(!map.getSource("sat"))map.addSource("sat",SAT_SRC);
    map.addLayer({id:"sat",type:"raster",source:"sat",paint:{"raster-fade-duration":150}},mapView==="hybrid"?firstLabelLayer():"mask");
  }
  if(trafficOn&&TRAFFIC_SRC){
    if(!map.getSource("traffic"))map.addSource("traffic",TRAFFIC_SRC);
    map.addLayer({id:"traffic",type:"raster",source:"traffic",paint:{"raster-opacity":.9}},firstLabelLayer());
  }
  applyTint();
}
function setView(v){mapView=v;store.set("al-view",v);applyLayers();buildLayerMenu()}
function setTraffic(on){trafficOn=on;store.set("al-traffic",on?"1":"0");applyLayers();buildLayerMenu()}

function overlayColors(){
  if(!map.getLayer("mask"))return;
  map.setPaintProperty("mask","fill-color",css("--bg"));
  map.setPaintProperty("al-glow","line-color",css("--m-state"));map.setPaintProperty("al-edge","line-color",css("--m-state"));
}
function addOverlays(){
  if(!map.getSource("mask"))map.addSource("mask",{type:"geojson",data:MASK});
  if(!map.getSource("al"))map.addSource("al",{type:"geojson",data:EDGE});
  if(!map.getLayer("mask"))map.addLayer({id:"mask",type:"fill",source:"mask",paint:{"fill-color":css("--bg"),"fill-antialias":false}});
  if(!map.getLayer("al-glow"))map.addLayer({id:"al-glow",type:"line",source:"al",paint:{"line-color":css("--m-state"),"line-width":["interpolate",["linear"],["zoom"],5,5,12,12],"line-opacity":.14,"line-blur":4}});
  if(!map.getLayer("al-edge"))map.addLayer({id:"al-edge",type:"line",source:"al",paint:{"line-color":css("--m-state"),"line-width":["interpolate",["linear"],["zoom"],5,1.2,12,2.2],"line-opacity":.8}});
  if(!map.getSource("events")){
    const cp={};Object.keys(CATS).forEach(k=>cp[k]=["+",["case",["==",["get","cat"],k],1,0]]);
    map.addSource("events",{type:"geojson",data:fc(current),cluster:true,clusterRadius:46,clusterMaxZoom:13,clusterProperties:cp});
    map.addLayer({id:"events-src",type:"circle",source:"events",paint:{"circle-radius":1,"circle-opacity":0,"circle-stroke-opacity":0}});
  }
  overlayColors();applyLayers();
}
map.on("style.load",()=>{styleReady=true;addOverlays();clearClusters();applyTint()});
function applyTint(){
  const a=activeTheme(),dark=isDark(a);let f=mapView==="map"?(TINT[a]||""):"";
  if(usingOSM&&dark&&mapView==="map")f="invert(1) hue-rotate(180deg) brightness(.82) contrast(.92) saturate(.55) "+f;
  map.getCanvas().style.filter=f.trim()||"none";
}
function styleMap(){
  const want=isDark(activeTheme())?"dark":"light";
  if(!usingOSM&&want!==styleKind){styleKind=want;styleReady=false;map.setStyle(STYLES[want])}
  else{overlayColors();applyTint()}
}

// ---------- events on the map ----------
const glyph=c=>`<svg viewBox="0 0 24 24" aria-hidden="true">${CATS[c].g}</svg>`;
const fullAddr=e=>e.addr||[e.place,e.town,"AL"].filter(Boolean).join(", ");
const shareUrl=e=>new URL("e/"+e.id+".html",location.href).href;
function whenText(e){
  if(e.openEnded) return `Opened ${fmt(D(e.start))}. Closing date not posted`;
  const s=fmt(D(e.start));
  return `${e.end&&e.end!==e.start?`${s} – ${fmt(D(e.end))}`:s} · ${e.time}`;
}
function popup(e){
  const where=[e.place,e.addr||e.town].filter(Boolean).map(esc).join("<br>");
  const q=encodeURIComponent(fullAddr(e));
  const flags=(e.flags||[]).map(f=>`<div class="flag">${esc(f)}</div>`).join("");
  const sv=saved.has(e.id);
  return `<div class="pop" style="--pc:var(--c-${e.cat})"><div class="band">${e.featured?'<div class="feat">Featured</div><br>':""}<div class="cat"><i>${glyph(e.cat)}</i>${CATS[e.cat].one} · ${esc(e.town)}</div><h3>${esc(e.title)}</h3></div>
  <div class="bd"><dl><dt>When</dt><dd>${esc(whenText(e))}</dd><dt>Where</dt><dd>${where}</dd><dt>Cost</dt><dd>${esc(e.cost||"Not posted")}</dd></dl>
  <p>${esc(e.desc)}</p>${flags?`<div class="flags">${flags}</div>`:""}
  <div class="acts"><a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Directions</a>
  <a class="sec" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${e.lat}%2C${e.lng}" target="_blank" rel="noopener">Street View</a>
  <a class="sec" href="https://www.google.com/maps/@?api=1&map_action=map&center=${e.lat}%2C${e.lng}&zoom=14&layer=traffic" target="_blank" rel="noopener">Live traffic</a>
  <button type="button" data-act="save" data-id="${e.id}" class="${sv?"on":""}">${sv?"Saved":"Save"}</button>
  <button type="button" data-act="cal" data-id="${e.id}">Add to calendar</button>
  <button type="button" data-act="share" data-id="${e.id}">Share</button></div></div></div>`;
}
const byId={};
upcoming.forEach(e=>{
  byId[e.id]=e;
  const el=document.createElement("div");el.className="pin-wrap";el.setAttribute("role","button");el.setAttribute("aria-label",e.title);el.tabIndex=0;
  el.innerHTML=`<div class="pin${e.featured?" featured":""}"><svg class="drop" viewBox="0 0 30 40"><path d="M15 39S2 23.5 2 14a13 13 0 0 1 26 0c0 9.5-13 25-13 25z" style="fill:var(--c-${e.cat});stroke:var(--panel);stroke-width:2"/></svg><svg class="g" viewBox="0 0 24 24">${CATS[e.cat].g}</svg></div>`;
  const go=ev=>{ev.stopPropagation();showEvent(e,false)};
  el.addEventListener("click",go);el.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" ")go(ev)});
  e.marker=new maplibregl.Marker({element:el,anchor:"bottom"}).setLngLat([e.lng,e.lat]);
});
let current=upcoming.slice();
const fc=list=>({type:"FeatureCollection",features:list.map(e=>({type:"Feature",properties:{id:e.id,cat:e.cat},geometry:{type:"Point",coordinates:[e.lng,e.lat]}}))});
let clusterMarkers={},onScreen={};
function clearClusters(){Object.values(clusterMarkers).forEach(m=>m.remove());clusterMarkers={};Object.keys(onScreen).forEach(k=>{if(k[0]==="c")delete onScreen[k]})}
function clusterEl(p,coords){
  const total=p.point_count;let a=0;
  const stops=Object.keys(CATS).filter(k=>p[k]>0).map(k=>{const s=a;a+=p[k]/total*360;return `var(--c-${k}) ${s}deg ${a}deg`}).join(",");
  const el=document.createElement("div");el.className="clu";el.setAttribute("role","button");el.setAttribute("aria-label",total+" events here. Zoom in");
  el.innerHTML=`<div style="background:conic-gradient(${stops})"><span>${total}</span></div>`;
  el.addEventListener("click",async ev=>{ev.stopPropagation();
    let z=map.getZoom()+2;try{z=await map.getSource("events").getClusterExpansionZoom(p.cluster_id)+.6}catch(x){}
    map.easeTo({center:coords,zoom:Math.min(z,16),duration:650,padding:pad(0)})});
  return el;
}
let syncQueued=false;
function syncMarkers(){
  syncQueued=false;
  if(!map.getSource("events")||!map.isSourceLoaded("events"))return;
  const next={};
  for(const f of map.querySourceFeatures("events")){
    const p=f.properties;
    if(p.cluster){const id="c"+p.cluster_id;if(next[id])continue;
      let m=clusterMarkers[id];if(!m){m=clusterMarkers[id]=new maplibregl.Marker({element:clusterEl(p,f.geometry.coordinates),anchor:"center"}).setLngLat(f.geometry.coordinates)}
      next[id]=m}
    else if(byId[p.id]&&!next[p.id])next[p.id]=byId[p.id].marker;
  }
  for(const id in next)if(!onScreen[id])next[id].addTo(map);
  for(const id in onScreen)if(!next[id])onScreen[id].remove();
  onScreen=next;
}
map.on("render",()=>{if(!syncQueued){syncQueued=true;requestAnimationFrame(syncMarkers)}});
map.on("sourcedata",ev=>{if(ev.sourceId==="events"&&ev.isSourceLoaded)syncMarkers()});
function setMapEvents(list){current=list;const src=map.getSource("events");if(src){clearClusters();src.setData(fc(list))}}

const pop=new maplibregl.Popup({anchor:"bottom",offset:[0,-40],maxWidth:"330px",closeButton:true,closeOnClick:true,focusAfterOpen:false,className:"ev-pop"});
let openId=null;
pop.on("close",()=>{openId=null;document.querySelectorAll(".card.on").forEach(c=>c.classList.remove("on"));try{history.replaceState(null,"",location.pathname+location.search)}catch(x){}});
function framing(){const W=map.getContainer().clientWidth,H=map.getContainer().clientHeight,p=pad(0);
  const cx=(p.left+(W-p.right))/2,cy=p.top+(H-p.top-p.bottom)*(mobile()?.86:.8);return [cx-W/2,cy-H/2]}
function openPopup(e){
  openId=e.id;pop.setLngLat([e.lng,e.lat]).setHTML(popup(e)).addTo(map);
  document.querySelectorAll(".card.on").forEach(c=>c.classList.remove("on"));const c=$("ev-"+e.id);if(c){c.classList.add("on");if(!mobile())c.scrollIntoView({block:"nearest"})}
  try{history.replaceState(null,"","#"+e.id)}catch(x){}
}
function showEvent(e,fromList){
  if(mobile()&&sheet!=="peek")setSheet("peek");
  const z=fromList?Math.max(map.getZoom(),14.5):Math.max(map.getZoom(),11);
  const opts={center:[e.lng,e.lat],zoom:z,offset:framing(),essential:true};
  if(fromList){map.flyTo(Object.assign(opts,{speed:1.5,curve:1.4}));map.once("moveend",()=>openPopup(e))}
  else{map.easeTo(Object.assign(opts,{duration:450}));openPopup(e)}
}

// ---------- list ----------
const km=(a,b)=>{const R=6371,t=Math.PI/180,dl=(b[0]-a[0])*t,dn=(b[1]-a[1])*t,x=Math.sin(dl/2)**2+Math.cos(a[0]*t)*Math.cos(b[0]*t)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
const miles=e=>me?km(me,[e.lat,e.lng])*0.621371:null;
function visible(){
  const q=query.trim().toLowerCase();
  return upcoming.filter(e=>{
    if(onlySaved&&!saved.has(e.id))return false;
    if(!on.has(e.cat))return false;
    if(when==="weekend"&&!overlaps(e,wkStart,wkEnd))return false;
    if(when==="week"&&!overlaps(e,today,addDays(today,6)))return false;
    if(q&&![e.title,e.town,e.place,e.desc,e.addr].join(" ").toLowerCase().includes(q))return false;
    return true;
  });
}
function bucket(e){
  const s=D(e.start);
  if(s<=today)return "Happening now";
  if(s<=wkEnd&&s>=wkStart)return "This weekend";
  if(s<=addDays(today,7))return "Next 7 days";
  if(s<=addDays(today,21))return "Coming up";
  return "Later";
}
const ORDER=["Happening now","This weekend","Next 7 days","Coming up","Later"];
function tile(e){
  const s=D(e.start),m=s.toLocaleDateString("en-US",{month:"short"}),wd=d=>d.toLocaleDateString("en-US",{weekday:"short"});
  if(e.openEnded)return `<span class="dt"><i>${m}</i><b>${s.getDate()}</b><em>Now</em></span>`;
  if(e.end&&e.end!==e.start){const en=D(e.end);return `<span class="dt"><i>${m}</i><b class="rng">${s.getDate()}–${en.getDate()}</b><em>${wd(s)}–${wd(en)}</em></span>`}
  return `<span class="dt"><i>${m}</i><b>${s.getDate()}</b><em>${wd(s)}</em></span>`;
}
function card(e){
  const meta=e.openEnded?"Ongoing":e.time,mi=miles(e);
  return `<button type="button" class="card${e.featured?" is-feat":""}" id="ev-${e.id}" data-id="${e.id}">${tile(e)}
  <span style="min-width:0">${e.featured?'<span class="feat">Featured</span>':""}<span class="t">${esc(e.title)}</span><span class="m"><i class="dot" style="background:var(--c-${e.cat})"></i><span>${esc(e.town)} · ${esc(meta)}${mi!=null?` · <span class="dist">${mi<10?mi.toFixed(1):Math.round(mi)} mi</span>`:""}</span>${saved.has(e.id)?HEART:""}</span></span>
  ${e.cost?`<span class="cost${isFree(e)?" free":""}">${esc(isFree(e)?"Free":e.cost.split(" ")[0])}</span>`:""}</button>`;
}
function render(){
  const vis=visible();
  setMapEvents(vis);
  $("sTotal").textContent=upcoming.length;
  $("sWeekend").textContent=upcoming.filter(e=>overlaps(e,wkStart,wkEnd)).length;
  $("sFree").textContent=upcoming.filter(isFree).length;
  let h="";
  if(!vis.length)h=`<p class="empty">${onlySaved&&!saved.size?"You haven’t saved any events yet. Open an event and tap Save.":"No events match. Clear the search, pick “All upcoming,” or turn a category back on."}</p>`;
  else if(me){
    const list=vis.slice().sort((a,b)=>(b.featured?1:0)-(a.featured?1:0)||miles(a)-miles(b));
    h+=`<div class="grp"><span>Closest to you</span><span>${list.length}</span></div>`+list.map(card).join("");
  } else {
    const g=new Map(ORDER.map(k=>[k,[]]));
    vis.slice().sort((a,b)=>(b.featured?1:0)-(a.featured?1:0)||Math.max(D(a.start),today)-Math.max(D(b.start),today)||a.title.localeCompare(b.title)).forEach(e=>g.get(bucket(e)).push(e));
    for(const[k,list]of g){if(!list.length)continue;h+=`<div class="grp"><span>${k}</span><span>${list.length}</span></div>`+list.map(card).join("")}
  }
  h+=`<div class="notes"><span>Pins are placed as close as the post allows. Use the address or Directions to get there.</span><span>Details come from public posts and organizers and can change, so check before you go. Past events drop off automatically.</span></div>
  <div class="site-foot"><a href="submit.html">Submit an event</a><a href="submit.html?type=correction">Report a mistake</a><a href="submit.html?type=removal">Remove a listing</a><a href="submit.html?type=featured">Advertise</a></div>`;
  $("list").innerHTML=h;
}
function buildCats(){
  $("cats").innerHTML=Object.entries(CATS).map(([k,c])=>{const n=upcoming.filter(e=>e.cat===k).length;if(!n)return "";
    return `<button type="button" class="chip" id="cat-${k}" data-c="${k}" aria-pressed="${on.has(k)}"><i style="background:var(--c-${k})">${glyph(k)}</i>${c.name}<span class="n">${n}</span></button>`}).join("")
   +`<button type="button" class="chip saved" id="cat-saved" aria-pressed="${onlySaved}">${HEART}Saved<span class="n" id="nSaved">${saved.size}</span></button>`;
}
function buildSponsor(){
  const s=SITE.sponsor,active=themePref==="auto"?monthTheme:themePref;
  if(s&&s.text){$("sponsorSlot").innerHTML=`<a class="sponsor live" href="${esc(s.url||"#")}" target="_blank" rel="noopener sponsored"><span><small>${esc(s.label||"Sponsored")}</small><b>${esc(s.text)}</b></span></a>`}
  else{$("sponsorSlot").innerHTML=`<a class="sponsor" href="submit.html?type=featured"><span><small>Sponsor spot</small><b>Your business here.</b> Reach local families every week.</span></a>`}
}

// ---------- themes ----------
const CHECK='<svg class="ck" viewBox="0 0 24 24"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/></svg>';
function buildMenu(){
  const mt=THEMES.find(t=>t.id===monthTheme);
  const item=(id,name,small,sw)=>`<button type="button" role="menuitemradio" id="th-${id}" data-t="${id}" aria-checked="${themePref===id}"><span class="sw" style="background:${sw}"></span><span class="lab">${name}${small?`<small>${small}</small>`:""}</span>${CHECK}</button>`;
  $("themeMenu").innerHTML=item("auto","Match the month",`Now: ${mt.name}`,`conic-gradient(${THEMES.map((t,i)=>`${t.sw[0]} ${i*60}deg ${(i+1)*60}deg`).join(",")})`)
   +item("none","No theme","Clean map, follows light/dark","linear-gradient(135deg,#faf8f4 50%,#1a2026 50%)")+"<hr>"
   +THEMES.map(t=>item(t.id,t.name,t.note,`linear-gradient(135deg,${t.sw[0]} 50%,${t.sw[1]} 50%)`)).join("");
}
function applyTheme(){
  const active=themePref==="auto"?monthTheme:themePref;
  if(active==="none")document.documentElement.removeAttribute("data-season");else document.documentElement.setAttribute("data-season",active);
  const t=THEMES.find(x=>x.id===active);
  $("themeName").textContent=active==="none"?"No theme":t.name;
  $("themeSw").style.background=active==="none"?"linear-gradient(135deg,#faf8f4 50%,#1a2026 50%)":`linear-gradient(135deg,${t.sw[0]} 50%,${t.sw[1]} 50%)`;
  document.querySelectorAll("#themeMenu button").forEach(b=>b.setAttribute("aria-checked",b.dataset.t===themePref));
  $("eyebrow").textContent=`Week of ${wkStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} · Alabama`;
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=css("--panel")||"#ffffff";
  styleMap();fx.set(active);
}

// ---------- actions ----------
function ics(e){
  const d=s=>s.replace(/-/g,"");const endEx=addDays(endOf(e)>=FAR?D(e.start):endOf(e),1);
  const p=n=>String(n).padStart(2,"0");const de=`${endEx.getFullYear()}${p(endEx.getMonth()+1)}${p(endEx.getDate())}`;
  const clean=s=>String(s||"").replace(/[\\,;]/g,m=>"\\"+m).replace(/\n/g,"\\n");
  const now=new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//"+clean(SITE.siteName)+"//EN","BEGIN:VEVENT","UID:"+e.id+"@alabama-events","DTSTAMP:"+now,
    "DTSTART;VALUE=DATE:"+d(e.start),"DTEND;VALUE=DATE:"+de,"SUMMARY:"+clean(e.title),"LOCATION:"+clean(fullAddr(e)),
    "DESCRIPTION:"+clean(`${e.time}. ${e.desc} Cost: ${e.cost||"not posted"}. ${shareUrl(e)}`),"URL:"+shareUrl(e),"END:VEVENT","END:VCALENDAR"].join("\r\n");
}
function download(name,text){const b=new Blob([text],{type:"text/calendar"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
async function share(e){
  const url=shareUrl(e);
  if(navigator.share){try{await navigator.share({title:e.title,text:`${e.title} · ${whenText(e)}`,url});return}catch(x){if(x&&x.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(url);toast("Link copied")}catch(x){prompt("Copy this link:",url)}
}
function openEvent(e){showEvent(e,true)}
document.addEventListener("click",ev=>{
  if(!ev.target.closest("#themeMenu")&&!ev.target.closest("#themeBtn")){$("themeMenu").hidden=true;$("themeBtn").setAttribute("aria-expanded","false")}
  const b=ev.target.closest("[data-act]");if(!b)return;const e=upcoming.find(x=>x.id===b.dataset.id);if(!e)return;
  if(b.dataset.act==="save"){saved.has(e.id)?saved.delete(e.id):saved.add(e.id);saveSaved();b.classList.toggle("on",saved.has(e.id));b.textContent=saved.has(e.id)?"Saved":"Save";$("nSaved").textContent=saved.size;render();const c=$("ev-"+e.id);if(c)c.classList.add("on")}
  if(b.dataset.act==="cal")download(e.id+".ics",ics(e));
  if(b.dataset.act==="share")share(e);
});
$("themeBtn").addEventListener("click",e=>{e.stopPropagation();const m=$("themeMenu");m.hidden=!m.hidden;$("themeBtn").setAttribute("aria-expanded",!m.hidden)});
$("themeMenu").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;themePref=b.dataset.t;store.set("al-theme",themePref);applyTheme();$("themeMenu").hidden=true;$("themeBtn").setAttribute("aria-expanded","false")});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$("themeMenu").hidden=true;$("themeBtn").setAttribute("aria-expanded","false")}});
$("when").addEventListener("click",ev=>{const b=ev.target.closest("button");if(!b)return;when=b.dataset.w;document.querySelectorAll("#when button").forEach(x=>x.setAttribute("aria-pressed",x===b));render();fitEvents()});
$("cats").addEventListener("click",ev=>{const b=ev.target.closest(".chip");if(!b)return;
  if(b.id==="cat-saved"){onlySaved=!onlySaved;b.setAttribute("aria-pressed",onlySaved);render();return}
  const c=b.dataset.c;on.has(c)?on.delete(c):on.add(c);b.setAttribute("aria-pressed",on.has(c));render()});
$("q").addEventListener("input",ev=>{query=ev.target.value;render()});
$("list").addEventListener("click",ev=>{const b=ev.target.closest(".card");if(!b)return;const e=upcoming.find(x=>x.id===b.dataset.id);if(e)openEvent(e)});
function boundsOf(pts){const b=new maplibregl.LngLatBounds();pts.forEach(p=>b.extend(p));return b}
function fitEvents(){const v=visible();if(!v.length)return;map.fitBounds(boundsOf(v.map(e=>[e.lng,e.lat])),{padding:pad(14),maxZoom:12,duration:900})}
const LAYER_ICONS={map:'<path d="M9 3l6 2 6-2v16l-6 2-6-2-6 2V5zm1 2.3v12.5l4 1.3V6.6z"/>',satellite:'<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 0 0-6.9 12l3.4-3.4 2 2 4.5-4.6 2.9 2.9A8 8 0 0 0 12 4z"/>',hybrid:'<path d="M12 2l10 5-10 5L2 7zm-7.8 8.9L12 15l7.8-4.1L22 12l-10 5-10-5zm0 5L12 20l7.8-4.1L22 17l-10 5-10-5z"/>'};
function buildLayerMenu(){
  const item=(v,name,small)=>`<button type="button" role="menuitemradio" id="view-${v}" data-v="${v}" aria-checked="${mapView===v}"><svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;flex:none">${LAYER_ICONS[v]}</svg><span class="lab">${name}<small>${small}</small></span>${CHECK}</button>`;
  $("layerMenu").innerHTML=item("map","Map","Streets and places")+item("satellite","Satellite","Aerial photos")+item("hybrid","Hybrid","Aerial photos with labels")
    +(TRAFFIC_SRC?`<hr><button type="button" role="menuitemcheckbox" id="view-traffic" data-t="traffic" aria-checked="${trafficOn}"><svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;flex:none"><path d="M9 2h6a2 2 0 0 1 2 2v1h3c0 2-1.3 3.3-3 3.8V10h3c0 2-1.3 3.3-3 3.8V15h3c0 2-1.3 3.3-3 3.8V20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-1.2C5.3 18.3 4 17 4 15h3v-1.2C5.3 13.3 4 12 4 10h3V8.8C5.3 8.3 4 7 4 5h3V4a2 2 0 0 1 2-2zm3 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg><span class="lab">Traffic<small>Live road conditions</small></span>${CHECK}</button>`:"");
  $("layerName").textContent=mapView==="map"?"Map":mapView==="satellite"?"Satellite":"Hybrid";
  $("layerIcon").innerHTML=LAYER_ICONS[mapView];
}
$("layerBtn").addEventListener("click",e=>{e.stopPropagation();const m=$("layerMenu");m.hidden=!m.hidden;$("layerBtn").setAttribute("aria-expanded",!m.hidden);$("themeMenu").hidden=true});
$("layerMenu").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.t==="traffic")setTraffic(!trafficOn);else setView(b.dataset.v);$("layerMenu").hidden=true;$("layerBtn").setAttribute("aria-expanded","false")});
document.addEventListener("click",ev=>{if(!ev.target.closest("#layerMenu")&&!ev.target.closest("#layerBtn")){$("layerMenu").hidden=true;$("layerBtn").setAttribute("aria-expanded","false")}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$("layerMenu").hidden=true;$("layerBtn").setAttribute("aria-expanded","false")}});
$("stateBtn").addEventListener("click",()=>map.fitBounds(AL_BBOX,{padding:pad(0),duration:900}));
let meMarker=null;
$("nearBtn").addEventListener("click",()=>{
  if(!navigator.geolocation){toast("Your browser can’t share location");return}
  $("nearBtn").disabled=true;
  navigator.geolocation.getCurrentPosition(p=>{
    $("nearBtn").disabled=false;me=[p.coords.latitude,p.coords.longitude];
    if(meMarker)meMarker.remove();
    const dot=document.createElement("div");dot.className="me-dot";meMarker=new maplibregl.Marker({element:dot,anchor:"center"}).setLngLat([me[1],me[0]]).addTo(map);
    render();const near=visible().sort((a,b)=>miles(a)-miles(b)).slice(0,6);
    map.fitBounds(boundsOf([[me[1],me[0]],...near.map(e=>[e.lng,e.lat])]),{padding:pad(24),maxZoom:12.5,duration:1000});
    toast("Sorted by distance from you");
  },()=>{$("nearBtn").disabled=false;toast("Location is off. Turn it on to sort by distance.")},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
});


// ---------- seasonal atmosphere ----------
const fx=(()=>{
  const cv=$("fx"),ctx=cv.getContext("2d");let parts=[],cfg=null,raf=0,W=0,H=0;
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches||window.matchMedia("(pointer: coarse)").matches;
  const CFG={halloween:{n:26,kind:"ember",colors:["#ff7a1a","#ffb15c"]},harvest:{n:16,kind:"leaf",colors:["#c0501f","#d69a1e","#8a3b3b","#b5761f"]},
    christmas:{n:60,kind:"snow",colors:["#ffffff"]},winter:{n:46,kind:"snow",colors:["#9fb9d0","#c6d7e6"]},
    spring:{n:16,kind:"leaf",colors:["#f2a7c3","#f7c6d8","#ffffff"]},summer:{n:14,kind:"ember",colors:["#ffd36b","#fff2b0"]}};
  function size(){const r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;W=r.width;H=r.height;cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0)}
  function mk(init){const c=cfg.colors[Math.floor(Math.random()*cfg.colors.length)];
    const p={x:Math.random()*W,y:init?Math.random()*H:(cfg.kind==="ember"?H+10:-10),c,rot:Math.random()*6,vr:(Math.random()-.5)*.03,ph:Math.random()*6};
    if(cfg.kind==="snow"){p.r=1+Math.random()*2.2;p.vy=.3+Math.random()*.6;p.a=.5+Math.random()*.4}
    if(cfg.kind==="leaf"){p.r=4+Math.random()*3;p.vy=.35+Math.random()*.45;p.a=.55+Math.random()*.3}
    if(cfg.kind==="ember"){p.r=.8+Math.random()*1.8;p.vy=-(.15+Math.random()*.35);p.a=.35+Math.random()*.45}
    return p}
  function tick(t){ctx.clearRect(0,0,W,H);
    for(const p of parts){p.y+=p.vy;p.x+=Math.sin(t/1400+p.ph)*.35;p.rot+=p.vr;
      ctx.globalAlpha=cfg.kind==="ember"?p.a*(.6+.4*Math.sin(t/500+p.ph)):p.a;ctx.fillStyle=p.c;
      if(cfg.kind==="leaf"){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.beginPath();ctx.ellipse(0,0,p.r,p.r*.5,0,0,7);ctx.fill();ctx.restore()}
      else{ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()}
      if(p.y>H+12||p.y<-12)Object.assign(p,mk(false))}
    raf=requestAnimationFrame(tick)}
  window.addEventListener("resize",()=>{if(cfg)size()});
  document.addEventListener("visibilitychange",()=>{cancelAnimationFrame(raf);if(!document.hidden&&cfg&&!reduce)raf=requestAnimationFrame(tick)});
  return{set(id){cancelAnimationFrame(raf);size();ctx.clearRect(0,0,W,H);cfg=CFG[id]||null;if(reduce||!cfg)return;parts=Array.from({length:cfg.n},()=>mk(true));raf=requestAnimationFrame(tick)}};
})();

// ---------- start ----------
setSheet("peek");buildLayerMenu();buildMenu();buildCats();buildSponsor();render();
applyTheme();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",styleMap);
new MutationObserver(styleMap).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
window.addEventListener("resize",()=>map.resize());
const want=(new URLSearchParams(location.search).get("e"))||location.hash.slice(1);
const target=want&&upcoming.find(e=>e.id===want);
if(target)map.once("load",()=>setTimeout(()=>openEvent(target),250));
else if(want&&EVENTS.some(e=>e.id===want))toast("That event has already happened");
})();
