// Throwaway prototype. Data inlined from ../worlds.json (pairs flattened) and ../items.json.
// World rows: [id, name, side, hasData, matchedWithId]
const RAW_REGIONS = [{"code":"NAE","name":"North America East","worlds":[[11101,"Siel","Elyos",true,12101],[12101,"Israphel","Asmodian",true,11101],[11102,"Nezekan","Elyos",true,12102],[12102,"Zikel","Asmodian",true,11102],[11103,"Vaizel","Elyos",true,12103],[12103,"Triniel","Asmodian",true,11103],[11104,"Kaisinel","Elyos",true,12104],[12104,"Lumiel","Asmodian",true,11104],[11105,"Yustiel","Elyos",true,12105],[12105,"Marchutan","Asmodian",true,11105],[11106,"Ariel","Elyos",true,12106],[12106,"Azphel","Asmodian",true,11106],[11107,"Fregion","Elyos",true,12107],[12107,"Ereshkigal","Asmodian",true,11107],[11108,"Meslamtaeda","Elyos",true,12108],[12108,"Beritra","Asmodian",true,11108],[11109,"Hithanya","Elyos",true,12109],[12109,"Nemon","Asmodian",true,11109]]},{"code":"NAW","name":"North America West","worlds":[[11201,"Siel","Elyos",true,12201],[12201,"Israphel","Asmodian",true,11201],[11202,"Nezekan","Elyos",true,12202],[12202,"Zikel","Asmodian",true,11202],[11203,"Vaizel","Elyos",true,12203],[12203,"Triniel","Asmodian",true,11203],[11204,"Kaisinel","Elyos",true,12204],[12204,"Lumiel","Asmodian",true,11204],[11205,"Yustiel","Elyos",true,12205],[12205,"Marchutan","Asmodian",true,11205]]},{"code":"EU","name":"Europe","worlds":[[11301,"Siel","Elyos",true,12301],[12301,"Israphel","Asmodian",true,11301],[11302,"Nezekan","Elyos",true,12302],[12302,"Zikel","Asmodian",true,11302],[11303,"Vaizel","Elyos",true,12303],[12303,"Triniel","Asmodian",true,11303],[11304,"Kaisinel","Elyos",true,12304],[12304,"Lumiel","Asmodian",true,11304],[11305,"Yustiel","Elyos",true,12305],[12305,"Marchutan","Asmodian",true,11305],[11306,"Ariel","Elyos",true,12306],[12306,"Azphel","Asmodian",true,11306],[11307,"Fregion","Elyos",true,12307],[12307,"Ereshkigal","Asmodian",true,11307],[11308,"Meslamtaeda","Elyos",true,12308],[12308,"Beritra","Asmodian",true,11308],[11309,"Hithanya","Elyos",true,12309],[12309,"Nemon","Asmodian",true,11309],[11310,"Nania","Elyos",true,12310],[12310,"Hadala","Asmodian",true,11310],[11311,"Tahavatha","Elyos",true,12311],[12311,"Ludra","Asmodian",true,11311],[11312,"Luteros","Elyos",true,12312],[12312,"Ulgorn","Asmodian",true,11312],[11313,"Phernos","Elyos",true,12313],[12313,"Munin","Asmodian",true,11313],[11314,"Daminu","Elyos",true,12314],[12314,"Odar","Asmodian",true,11314],[11315,"Kasaka","Elyos",true,12315],[12315,"Zemurru","Asmodian",true,11315],[11316,"Bakarma","Elyos",true,12316],[12316,"Kromede","Asmodian",true,11316],[11317,"Tsenka","Elyos",true,12317],[12317,"Quai","Asmodian",true,11317],[11318,"Kochi","Elyos",true,12318],[12318,"Baba","Asmodian",true,11318],[11319,"Ishtar","Elyos",true,12319],[12319,"Fafnir","Asmodian",true,11319],[11320,"Tiamat","Elyos",true,12320],[12320,"Indnath","Asmodian",true,11320],[11321,"Gauss","Elyos",true,12321],[12321,"Agnita","Asmodian",true,11321],[11322,"Lamuatan","Elyos",true,12322],[12322,"Atiel","Asmodian",true,11322],[11323,"Nathara","Elyos",true,12323],[12323,"Tassin","Asmodian",true,11323]]},{"code":"LA","name":"Latin America","worlds":[[11401,"Siel","Elyos",true,12401],[12401,"Israphel","Asmodian",true,11401],[11402,"Nezekan","Elyos",true,12402],[12402,"Zikel","Asmodian",true,11402],[11403,"Vaizel","Elyos",true,12403],[12403,"Triniel","Asmodian",true,11403],[11404,"Kaisinel","Elyos",true,12404],[12404,"Lumiel","Asmodian",true,11404],[11405,"Yustiel","Elyos",true,12405],[12405,"Marchutan","Asmodian",true,11405],[11406,"Ariel","Elyos",true,12406],[12406,"Azphel","Asmodian",true,11406]]},{"code":"AS","name":"Asia","worlds":[[11501,"Siel","Elyos",true,12501],[12501,"Israphel","Asmodian",true,11501],[11502,"Nezekan","Elyos",true,12502],[12502,"Zikel","Asmodian",true,11502],[11503,"Vaizel","Elyos",true,12503],[12503,"Triniel","Asmodian",true,11503],[11504,"Kaisinel","Elyos",true,12504],[12504,"Lumiel","Asmodian",true,11504],[11505,"Yustiel","Elyos",true,12505],[12505,"Marchutan","Asmodian",true,11505],[11506,"Ariel","Elyos",true,12506],[12506,"Azphel","Asmodian",true,11506],[11507,"Fregion","Elyos",true,12507],[12507,"Ereshkigal","Asmodian",true,11507],[11508,"Meslamtaeda","Elyos",true,12508],[12508,"Beritra","Asmodian",true,11508],[11509,"Hithanya","Elyos",true,12509],[12509,"Nemon","Asmodian",true,11509],[11510,"Nania","Elyos",true,12510],[12510,"Hadala","Asmodian",true,11510]]}];
const ITEMS = [
 {
  "name": "Artisan's Splendent Orichalcum Greaves",
  "grade": "Unique",
  "icon": "https://aion2t.com/db-item-icons/Icon_GM_0148_T03_Pants.webp"
 },
 {
  "name": "Artisan's Splendent Orichalcum Helm",
  "grade": "Unique",
  "icon": "https://aion2t.com/db-item-icons/Icon_GM_0148_T03_Helmet.webp"
 },
 {
  "name": "True Dragon Lord Helm",
  "grade": "Unique",
  "icon": "https://aion2t.com/db-item-icons/Icon_GM_0061_T05_Helmet.webp"
 },
 {
  "name": "Expert's Splendent Orichalcum Helm",
  "grade": "Legend",
  "icon": "https://aion2t.com/db-item-icons/Icon_Equip_AR_L_0004_T05_Helmet.webp"
 },
 {
  "name": "Artisan's Splendent Orichalcum Gloves",
  "grade": "Unique",
  "icon": "https://aion2t.com/db-item-icons/Icon_GM_0148_T03_Gloves.webp"
 },
 {
  "name": "True Dragon Lord Boots",
  "grade": "Unique",
  "icon": "https://aion2t.com/db-item-icons/Icon_GM_0061_T05_Boots.webp"
 },
 {
  "name": "Refining Stone",
  "grade": "Common",
  "icon": "https://aion2t.com/db-item-icons/Icon_Item_Craft_SmeltStone_Equip_A_l_001.webp"
 },
 {
  "name": "Expert's Refining Stone",
  "grade": "Rare",
  "icon": "https://aion2t.com/db-item-icons/Icon_Item_Craft_SmeltStone_Equip_A_u_001.webp"
 },
 {
  "name": "Artisan's Refining Stone",
  "grade": "Legend",
  "icon": "https://aion2t.com/db-item-icons/Icon_Item_Craft_SmeltStone_Equip_A_e_001.webp"
 },
 {
  "name": "Raw Leather",
  "grade": "Common",
  "icon": "https://aion2t.com/db-item-icons/Icon_BMShop_Craft_Skin_L_lv1_01.webp"
 },
 {
  "name": "Odyle",
  "grade": "Common",
  "icon": "https://aion2t.com/db-item-icons/Icon_Item_Gather_Od_L_lv2_02a.webp"
 },
 {
  "name": "Fine Odyle",
  "grade": "Rare",
  "icon": "https://aion2t.com/db-item-icons/Icon_Item_Gather_Od_L_lv4_02a.webp"
 },
 {
  "name": "Pure Odyle",
  "grade": "Legend",
  "icon": "https://aion2t.com/db-item-icons/Icon_Item_Gather_Od_L_lv4_04a.webp"
 },
 {
  "name": "Fine Orichalcum Ore",
  "grade": "Rare",
  "icon": "https://aion2t.com/db-item-icons/Icon_Item_Gather_Ore_A_r_002.webp"
 },
 {
  "name": "Pure Orichalcum Ore",
  "grade": "Legend",
  "icon": "https://aion2t.com/db-item-icons/Icon_Item_Gather_Ore_A_l_002.webp"
 },
 {
  "name": "Orichalcum Ingot",
  "grade": "Common",
  "icon": "https://aion2t.com/db-item-icons/Icon_Item_Craft_Ore_Ingot_A_c_001.webp"
 }
];

// Demo only: no world lacks data in worlds.json, so two are flipped to show the "no prices yet" state.
const NO_DATA_DEMO = new Set([12303, 12510]);
const MATCHED_SINCE = '4 Oct 2026';

const REGIONS = RAW_REGIONS.map((r) => ({ code: r.code, name: r.name, worlds: r.worlds.map(([id, name, side, hasData, mid]) => ({ id, name, side, hasData: hasData && !NO_DATA_DEMO.has(id), mid, region: r.code })) }));
const WORLDS = new Map(REGIONS.flatMap((r) => r.worlds).map((w) => [w.id, w]));
for (const w of WORLDS.values()) w.matchedWith = WORLDS.get(w.mid);
const icon = (name) => ITEMS.find((i) => i.name === name) ?? { icon: '', grade: 'Common' };

const PROFS = [
  { key: 'Blacksmithing', abbr: 'BS', game: 'Blacksmithing', count: 48 },
  { key: 'Tailoring', abbr: 'TL', game: 'Armorsmithing', count: 61 },
  { key: 'Jewelcrafting', abbr: 'JC', game: 'Handicrafting', count: 39 },
  { key: 'Alchemy', abbr: 'AL', game: 'Alchemy', count: 42 },
  { key: 'Cooking', abbr: 'CK', game: 'Cooking', count: 27 },
];

const state = {
  view: 'calc', tab: 'buy', worldId: 11304, recent: [11304, 11101, 12304],
  mastery: { Blacksmithing: 100, Tailoring: 100, Jewelcrafting: 100, Alchemy: 100, Cooking: 100 }, tax: 5,
  pick: { q: '', region: 'EU', side: 'all', active: 0 },
  scan: { prof: 'All', q: '', sort: 'margin', dir: -1, showHidden: false },
};

const $ = (s, el = document) => el.querySelector(s);
const fmt = (n) => n.toLocaleString('en-US');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sideBadge = (side) => `<span class="side ${side === 'Elyos' ? 'el' : 'as'}" title="${side}">${side === 'Elyos' ? 'EL' : 'AS'}</span>`;
const itemCell = (name, sub = '', small = '') => {
  const it = icon(name);
  return `<div class="cell-item"><span class="icon sm g-${it.grade.toLowerCase()}"><img src="${it.icon}" alt="" loading="lazy"></span><span><b>${esc(name)}</b>${small ? `<small>${small}</small>` : ''}${sub ? `<span class="sub">${sub}</span>` : ''}</span></div>`;
};

/* ---------- header ---------- */
function renderHeader() {
  const w = WORLDS.get(state.worldId);
  $('#cRegion').textContent = w.region;
  $('#cWorld').textContent = w.name;
  $('#cSide').textContent = w.side;
  $('#cTax').textContent = state.tax.toFixed(1) + '%';
  $('#cMastery').innerHTML = PROFS.map((p) => `<span class="m" title="${p.key} (in game: ${p.game}) mastery"><span class="k" aria-hidden="true">${p.abbr}</span><span class="v">${state.mastery[p.key]}</span><span class="sr">${p.key} mastery</span></span>`).join('');
  document.querySelectorAll('.views a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.view === state.view) || a.removeAttribute('aria-current'));
  document.querySelectorAll('.views a').forEach((a) => { if (a.dataset.view === state.view) a.setAttribute('aria-current', 'page'); });
  $('#view-calc').hidden = state.view !== 'calc';
  $('#view-scanner').hidden = state.view !== 'scanner';
}

/* ---------- calculator tabs ---------- */
const BUY = [
  ["Artisan's Refining Stone", 141, '8.26', 523000, 4320654],
  ['Raw Leather', 44, '453.83', 4888, 2218323],
  ["Expert's Refining Stone", 200, '34.92', 63000, 2199893],
  ['Pure Odyle', 129, '20.65', 29994, 619473],
  ['Odyle', 246, '75.00', 2600, 194991],
  ['Orichalcum Ingot', 15, '75.00', 2200, 164993],
  ['Refining Stone', 42, '149.99', 495, 74247],
  ['Fine Orichalcum Ore', 19, '52.38', 650, 34046],
  ['Fine Odyle', 41, '17.46', 1750, 30554],
];
const TOTAL = 9857173;
const STEPS = [
  [0, "Artisan's Splendent Orichalcum Helm", '<b>Craft</b>, 4.13 attempts at 96.8% with a 25% combo', '1', 9857173, 9857173],
  [1, "Expert's Splendent Orichalcum Helm", '<b>Craft</b>, 17.46 attempts at 94.6% with a 25% combo', '4.13', 1190383, 4917046],
  [1, "Artisan's Refining Stone", '<b>Buy</b> on the Market', '8.26', 523000, 4320654],
  [1, 'Pure Orichalcum Ore', '<b>Morph</b> from Odyle, 12.39 attempts at 100%', '12.39', 29994, 371684],
  [1, 'Pure Odyle', '<b>Buy</b> on the Market', '8.26', 29994, 247789],
];
function renderTabs() {
  $('#p-buy').innerHTML = `<table class="grid"><thead><tr><th scope="col">item</th><th scope="col" class="hide-m">source</th><th scope="col" class="num hide-m">expected</th><th scope="col" class="num hide-m">unit price</th><th scope="col" class="num">subtotal</th><th scope="col" class="hide-m">share</th></tr></thead><tbody>${BUY.map(([n, l, e, u, s]) => `<tr><td>${itemCell(n, `${e} &times; ${fmt(u)}, ${l} listings`)}</td><td class="src hide-m">Market, ${l} listings</td><td class="num hide-m">${e}</td><td class="num hide-m">${fmt(u)}</td><td class="num">${fmt(s)}</td><td class="hide-m"><span class="share" title="${((s / TOTAL) * 100).toFixed(1)}% of total"><i style="width:${(s / TOTAL) * 100}%"></i></span></td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="hide-m"></td><td class="hide-m"></td><td class="hide-m"></td><td class="num">${fmt(TOTAL)}</td><td class="hide-m"></td></tr></tfoot></table>`;
  $('#p-steps').innerHTML = `<table class="grid ladder"><thead><tr><th scope="col">step</th><th scope="col" class="hide-m">how</th><th scope="col" class="num hide-m">qty</th><th scope="col" class="num hide-m">each</th><th scope="col" class="num">subtotal</th></tr></thead><tbody>${STEPS.map(([d, n, how, q, u, s]) => `<tr data-depth="${d}" style="--depth:${d}"><td>${itemCell(n, `${how.replace(/<\/?b>/g, '')}. ${q} &times; ${fmt(u)}`)}</td><td class="how hide-m">${how}</td><td class="num hide-m">${q}</td><td class="num hide-m">${fmt(u)}</td><td class="num">${fmt(s)}</td></tr>`).join('')}</tbody></table>`;
  $('#p-rates').innerHTML = `<dl class="rates">
    <dt>Success</dt><dd>96.8%<small>mastery 100 against recipe level 30, level difference +70</small></dd>
    <dt>Combo chance</dt><dd>25%</dd>
    <dt>Combo success</dt><dd>100%</dd>
    <dt>Splendent per attempt</dt><dd>0.25</dd>
    <dt>Attempts for one Splendent</dt><dd>4.13</dd>
    <dt>Curve</dt><dd>metabot.gg<small>Tailoring, level 30</small></dd>
    <dt>aion2.exchange estimate</dt><dd>9,857,161<small>matches to 0.000%</small></dd></dl>`;
  document.querySelectorAll('.tabs [role=tab]').forEach((t) => {
    const on = t.id === 't-' + state.tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    $('#' + t.getAttribute('aria-controls')).hidden = !on;
  });
}

/* ---------- scanner ---------- */
const SCAN = [
  { name: "Artisan's Splendent Orichalcum Helm", prof: 'Tailoring', lvl: 30, craft: 10330435, market: 19999999, margin: 8669564, pct: 83.9, chg: 4.2, spark: [16.2, 17.8, 17.1, 18.9, 19.5, 19.2, 20.0] },
  { name: 'True Dragon Lord Helm', prof: 'Tailoring', lvl: 55, craft: 33568697, market: 45333333, margin: 7597969, pct: 22.6, chg: -6.8, spark: [49, 48.2, 47.9, 48.8, 46.5, 45.9, 45.3] },
  { name: "Artisan's Splendent Orichalcum Greaves", prof: 'Tailoring', lvl: 35, craft: 10626390, market: 18999990, margin: 7423601, pct: 69.9, chg: 1.1, spark: [18.1, 18.6, 18.4, 19.4, 18.7, 18.8, 19.0] },
  { name: 'True Dragon Lord Boots', prof: 'Tailoring', lvl: 60, craft: 37289586, market: 45555555, margin: 5988191, pct: 16.1, chg: -2.4, spark: [47.4, 46.9, 47.1, 46.2, 46.6, 45.9, 45.6] },
  { name: "Artisan's Splendent Orichalcum Gloves", prof: 'Tailoring', lvl: 35, craft: 9490777, market: 14980000, margin: 4740223, pct: 49.9, chg: 9.6, spark: [13.2, 13.4, 13.1, 13.9, 14.3, 14.6, 14.98] },
];
const HIDDEN = [
  { name: "Expert's Splendent Orichalcum Helm", prof: 'Tailoring', lvl: 25, craft: 1190383, why: 'needs a price' },
  { name: 'Orichalcum Ingot', prof: 'Blacksmithing', lvl: 15, craft: 2050, why: 'needs a price' },
  { name: 'Pure Orichalcum Ore', prof: 'Alchemy', lvl: 40, craft: null, why: 'needs mastery 110' },
];
const lerp = (a, b, t) => Math.round(a + (b - a) * t);
// Heat ramp #FF6A00 -> #FFD400; alpha grows with the margin so a low margin stays a faint tint.
// Text colour is whichever of light or dark contrasts more with the composited cell.
function heat(h) {
  const t = Math.max(0, Math.min(1, h)), a = 0.14 + 0.86 * t, g = lerp(106, 212, t);
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(255 * a + 6 * (1 - a)) + 0.7152 * lin(g * a + 8 * (1 - a)) + 0.0722 * lin(10 * (1 - a));
  const dark = (L + 0.05) / 0.0535 > 0.87 / (L + 0.05);
  return `background:rgb(255 ${g} 0 / ${a.toFixed(2)});color:${dark ? '#0A0B0C' : '#E6EBF0'}`;
}
function spark(pts, up) {
  const min = Math.min(...pts), max = Math.max(...pts), w = 72, h = 20;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / (max - min || 1)) * (h - 6)]);
  const [lx, ly] = xy[xy.length - 1];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-label="7 day price trend, ${up ? 'rising' : 'falling'}"><polyline fill="none" stroke="${up ? '#FFB000' : '#7F8B97'}" stroke-width="1.5" stroke-linejoin="round" points="${xy.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}"/><circle cx="${lx}" cy="${ly}" r="2" fill="${up ? '#FFD400' : '#7F8B97'}"/></svg>`;
}
function renderRail() {
  const all = PROFS.reduce((a, p) => a + p.count, 0);
  $('.rail').innerHTML = [{ key: 'All', count: all }, ...PROFS].map((p) => `<button aria-pressed="${state.scan.prof === p.key}" data-prof="${p.key}"><span>${p.key === 'All' ? 'All professions' : p.key}</span><span class="cnt">${p.count}</span></button>`).join('');
}
function renderScanner() {
  renderRail();
  const { prof, q, sort, dir, showHidden } = state.scan;
  const match = (r) => (prof === 'All' || r.prof === prof) && r.name.toLowerCase().includes(q.toLowerCase());
  const rows = SCAN.filter(match).sort((a, b) => (a[sort] - b[sort]) * dir);
  document.querySelectorAll('.scan th[data-sort]').forEach((th) => {
    if (th.dataset.sort === sort) th.setAttribute('aria-sort', dir < 0 ? 'descending' : 'ascending');
    else th.removeAttribute('aria-sort');
  });
  let html = rows.map((r) => {
    const h = r.pct / 100;
    return `<tr><td class="c-item">${itemCell(r.name, '', `${r.prof} ${r.lvl}`)}</td><td class="c-spark">${spark(r.spark, r.chg > 0)}</td><td class="num c-craft">${fmt(r.craft)}</td><td class="num c-market">${fmt(r.market)}</td><td class="num c-margin gain">+${fmt(r.margin)}</td><td class="num c-pct heat" style="${heat(h)}">+${r.pct.toFixed(1)}%</td><td class="num c-chg"><span class="chg ${r.chg > 0 ? 'up' : 'down'}">${r.chg > 0 ? '+' : ''}${r.chg.toFixed(1)}%</span></td></tr>`;
  }).join('');
  if (!rows.length) html = `<tr><td colspan="7" class="empty">No ${prof === 'All' ? '' : prof + ' '}recipe shows a margin${q ? ` for "${esc(q)}"` : ''} yet. Rows that need a price or more mastery are hidden.</td></tr>`;
  if (showHidden) html += HIDDEN.filter(match).map((r) => `<tr class="off"><td class="c-item">${itemCell(r.name, '', `${r.prof} ${r.lvl}`)}</td><td class="c-spark"></td><td class="num c-craft">${r.craft ? fmt(r.craft) : '-'}</td><td class="num c-market">-</td><td class="num c-margin" colspan="2">${r.why}</td><td class="c-chg"></td></tr>`).join('');
  $('#scanBody').innerHTML = html;
  $('#hiddenToggle').textContent = showHidden ? 'Hide them' : 'Show them';
  $('#hiddenToggle').setAttribute('aria-pressed', showHidden);
}

/* ---------- world picker ---------- */
function pickRows() {
  const { q, region, side } = state.pick;
  const needle = q.trim().toLowerCase();
  const okSide = (w) => side === 'all' || w.side === side;
  const groups = [];
  if (!needle) {
    groups.push({ label: '<b>Recent</b>', note: '', worlds: state.recent.map((id) => WORLDS.get(id)).filter(okSide), showRegion: true });
  }
  for (const r of REGIONS) {
    if (!needle && region !== 'all' && r.code !== region) continue;
    const ws = r.worlds.filter((w) => okSide(w) && (!needle || w.name.toLowerCase().includes(needle)));
    if (ws.length) groups.push({ label: `<b>${r.code}</b> ${r.name}`, note: needle ? `${ws.length} match${ws.length > 1 ? 'es' : ''}` : `${ws.length} worlds, pairs since ${MATCHED_SINCE.replace(' 2026', '')}`, worlds: ws });
  }
  return { groups, needle };
}
function hl(name, needle) {
  if (!needle) return esc(name);
  const i = name.toLowerCase().indexOf(needle);
  return i < 0 ? esc(name) : esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + needle.length)) + '</mark>' + esc(name.slice(i + needle.length));
}
function renderPicker() {
  const { groups, needle } = pickRows();
  const regionOpts = ['all', ...REGIONS.map((r) => r.code)];
  $('#regionSeg').innerHTML = regionOpts.map((c) => `<button role="radio" data-region="${c}" aria-checked="${(needle ? 'all' : state.pick.region) === c}">${c}</button>`).join('');
  $('#sideSeg').innerHTML = [['all', 'both'], ['Elyos', 'Elyos'], ['Asmodian', 'Asmodian']].map(([v, l]) => `<button role="radio" data-side="${v}" aria-checked="${state.pick.side === v}">${l}</button>`).join('');
  let idx = 0;
  const flat = [];
  $('#worldList').innerHTML = groups.map((g) => `<div role="group" aria-label="${g.label.replace(/<[^>]+>/g, '')}"><div class="grp"><span>${g.label}</span><span>${g.note}</span></div>${g.worlds.map((w) => {
    const i = idx++; flat.push(w);
    const sel = w.id === state.worldId;
    const full = sel && (g.showRegion || needle);
    const reg = needle || g.showRegion ? `<span class="reg">${w.region}</span>` : '';
    return `<div class="w${sel ? '' : ''}${w.hasData ? '' : ' nodata'}${i === state.pick.active ? ' active' : ''}" role="option" id="opt-${i}" data-id="${w.id}" aria-selected="${sel}"><span><span class="nm">${hl(w.name, needle)}</span>${reg}${w.hasData ? '' : ' <span class="nop">no prices yet</span>'}</span><span class="id" title="Matched with ${w.matchedWith.name} (${w.matchedWith.side}) since ${MATCHED_SINCE}">vs ${w.matchedWith.name}</span>${sideBadge(w.side)}${full ? `<span class="note">Matched with ${w.matchedWith.name}, ${w.matchedWith.side}, since ${MATCHED_SINCE}. Server ${w.id}. The market stays per world.</span>` : ''}</div>`;
  }).join('')}</div>`).join('') || `<p class="empty">No world matches "${esc(q)}". World names are the same in every region, so try the name without the region.</p>`;
  state.pick.flat = flat;
  $('#worldQ').setAttribute('aria-activedescendant', flat.length ? 'opt-' + state.pick.active : '');
}
function openPicker(q = '') {
  closeAll();
  state.pick.q = q; state.pick.active = 0;
  $('#worldQ').value = q;
  const r = $('#worldChip').getBoundingClientRect();
  $('#picker').style.setProperty('--px', Math.min(r.left, innerWidth - 456) + 'px');
  $('#picker').hidden = false;
  renderPicker();
  $('#worldQ').focus();
}
function choose(id) {
  state.worldId = id;
  state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 3);
  state.pick.region = WORLDS.get(id).region;
  closeAll(); renderHeader();
  $('#worldChip').focus();
}

/* ---------- settings ---------- */
function renderSettings() {
  $('#masteryRows').innerHTML = PROFS.map((p) => `<div class="mrow"><label class="pn" for="m-${p.abbr}">${p.key}<small>${p.game === p.key ? '' : 'in game: ' + p.game}</small></label><input id="m-${p.abbr}" type="number" min="0" max="100" value="${state.mastery[p.key]}" data-prof="${p.key}"><input type="range" min="0" max="100" value="${state.mastery[p.key]}" data-prof="${p.key}" aria-label="${p.key} mastery"></div>`).join('');
}
function openSettings(focus) {
  closeAll();
  $('#scrim').hidden = false; $('#drawer').hidden = false;
  const target = focus === 'tax' ? $('#setTax') : $('#setMastery');
  target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash');
  (focus === 'tax' ? $('#taxIn') : $('#drawer .close')).focus();
}
function closeAll() {
  $('#picker').hidden = true; $('#scrim').hidden = true; $('#drawer').hidden = true;
}

/* ---------- events ---------- */
document.addEventListener('click', (e) => {
  const t = e.target;
  const open = t.closest('[data-open]');
  if (open) return open.dataset.open === 'world' ? openPicker() : openSettings(open.dataset.focus);
  if (t.closest('[data-close]') || t === $('#scrim') || t === $('#picker')) return closeAll();
  const tab = t.closest('.tabs [role=tab]');
  if (tab) { state.tab = tab.id.slice(2); return renderTabs(); }
  const seg = t.closest('.item-head .seg button');
  if (seg) return seg.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', b === seg));
  const reg = t.closest('[data-region]');
  if (reg) { state.pick.region = reg.dataset.region; state.pick.q = ''; $('#worldQ').value = ''; state.pick.active = 0; return renderPicker(); }
  const side = t.closest('[data-side]');
  if (side) { state.pick.side = side.dataset.side; state.pick.active = 0; return renderPicker(); }
  const w = t.closest('.w');
  if (w) return choose(Number(w.dataset.id));
  const prof = t.closest('[data-prof]');
  if (prof && prof.closest('.rail')) { state.scan.prof = prof.dataset.prof; return renderScanner(); }
  const th = t.closest('th[data-sort]');
  if (th) { const k = th.dataset.sort; state.scan.dir = state.scan.sort === k ? -state.scan.dir : -1; state.scan.sort = k; return renderScanner(); }
  if (t.id === 'hiddenToggle') { state.scan.showHidden = !state.scan.showHidden; return renderScanner(); }
});
$('#worldQ').addEventListener('input', (e) => { state.pick.q = e.target.value; state.pick.active = 0; renderPicker(); });
$('#worldQ').addEventListener('keydown', (e) => {
  const n = state.pick.flat.length;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    state.pick.active = (state.pick.active + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
    renderPicker();
    $('#opt-' + state.pick.active)?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && n) choose(state.pick.flat[state.pick.active].id);
});
$('#scanFilter').addEventListener('input', (e) => { state.scan.q = e.target.value; renderScanner(); });
$('.tabs').addEventListener('keydown', (e) => {
  const order = ['buy', 'steps', 'rates'];
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  state.tab = order[(order.indexOf(state.tab) + (e.key === 'ArrowRight' ? 1 : 2)) % 3];
  renderTabs(); $('#t-' + state.tab).focus();
});
$('#drawer').addEventListener('input', (e) => {
  const p = e.target.dataset.prof;
  if (p) {
    state.mastery[p] = Math.max(0, Math.min(100, Number(e.target.value) || 0));
    e.target.closest('.mrow').querySelectorAll('input').forEach((i) => { if (i !== e.target) i.value = state.mastery[p]; });
  }
  if (e.target.id === 'taxIn') state.tax = Number(e.target.value) || 0;
  renderHeader();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAll();
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('.lookup input').focus(); }
});

/* ---------- hash routes: #scanner, #world, #world=siel, #settings, #tab=steps, #side=Asmodian, #hidden ---------- */
function route() {
  const parts = Object.fromEntries(location.hash.slice(1).split('&').filter(Boolean).map((p) => p.split('=')));
  state.view = 'scanner' in parts ? 'scanner' : 'calc';
  if (parts.tab) state.tab = parts.tab;
  if ('hidden' in parts) state.scan.showHidden = true;
  if (parts.side) state.pick.side = parts.side;
  if (parts.prof) state.scan.prof = parts.prof;
  renderHeader(); renderTabs(); renderScanner(); closeAll();
  if ('world' in parts) openPicker(decodeURIComponent(parts.world || ''));
  if ('settings' in parts) openSettings(parts.settings || 'mastery');
}
addEventListener('hashchange', route);
renderSettings();
document.querySelectorAll('[data-h]').forEach((el) => (el.style.cssText = heat(Number(el.dataset.h))));
route();
