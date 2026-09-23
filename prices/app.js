const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const twd = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0,
});

const WATCH_KEY = "spt-watchlist";
const RANGE_KEY = "spt-range";
const SOURCE_KEY = "spt-sources";

const RANGES = [
  { id: "30", label: "月", days: 30 },
  { id: "180", label: "半年", days: 180 },
  { id: "365", label: "一年", days: 365 },
];

const SOURCES = [
  { id: "legacy", label: "舊家", color: "#0052ff" },
  { id: "samurai_shrink", label: "有膜", color: "#05b169" },
  { id: "samurai_noshrink", label: "無膜", color: "#7a5af8" },
];

const SOURCE_LABEL = Object.fromEntries(SOURCES.map((s) => [s.id, s.label]));

const state = {
  history: { items: [] },
  route: { name: "home" },
  range: localStorage.getItem(RANGE_KEY) || "30",
  sources: loadSourceFilter(),
  search: "",
  watchlist: [],
};

function loadSourceFilter() {
  try {
    const raw = JSON.parse(localStorage.getItem(SOURCE_KEY) || "{}");
    return {
      legacy: raw.legacy !== false,
      samurai_shrink: raw.samurai_shrink !== false,
      samurai_noshrink: raw.samurai_noshrink !== false,
    };
  } catch {
    return { legacy: true, samurai_shrink: true, samurai_noshrink: true };
  }
}

function saveSourceFilter() {
  localStorage.setItem(SOURCE_KEY, JSON.stringify(state.sources));
}

function toggleSource(id) {
  const next = !state.sources[id];
  if (!next) {
    const stillOn = SOURCES.filter((s) => s.id !== id && state.sources[s.id]);
    if (!stillOn.length) return;
  }
  state.sources[id] = next;
  saveSourceFilter();
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function imageHtml(item, className) {
  if (item?.image) {
    return `<img class="${className}" src="${escapeHtml(item.image)}" alt="" loading="lazy" />`;
  }
  return `<span class="${className} thumb-ph"></span>`;
}

function normalizeItem(item) {
  if (!item) return item;
  if (item.sources) return item;
  return {
    ...item,
    sources: item.series?.length ? { legacy: { series: item.series } } : {},
  };
}

function itemSources(item) {
  return normalizeItem(item)?.sources || {};
}

function visibleSourceMeta(item) {
  return SOURCES.filter((source) => {
    if (!state.sources[source.id]) return false;
    return (itemSources(item)[source.id]?.series || []).length > 0;
  });
}

function activeSources() {
  return SOURCES.filter((source) => state.sources[source.id]);
}

function loadWatchlist(items) {
  try {
    const raw = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
    if (Array.isArray(raw) && raw.length) {
      const ids = new Set(items.map((i) => i.id));
      return raw.filter((id) => ids.has(id));
    }
  } catch {
    // ignore
  }
  const movers = computeChanges({ date: state.history.date, items })
    .filter((r) => r.type === "up" || r.type === "down")
    .map((r) => r.item.id);
  if (movers.length) return movers.slice(0, 12);
  return items.filter((i) => i.active !== false).slice(0, 9).map((i) => i.id);
}

function saveWatchlist() {
  localStorage.setItem(WATCH_KEY, JSON.stringify(state.watchlist));
}

function isWatched(id) {
  return state.watchlist.includes(id);
}

function toggleWatch(id) {
  if (isWatched(id)) state.watchlist = state.watchlist.filter((x) => x !== id);
  else state.watchlist = [...state.watchlist, id];
  saveWatchlist();
}

function swapElements(a, b) {
  if (!a || !b || a === b || a.parentNode !== b.parentNode) return;
  const parent = a.parentNode;
  const marker = document.createComment("");
  parent.insertBefore(marker, a);
  parent.insertBefore(a, b);
  parent.insertBefore(b, marker);
  marker.remove();
}

function syncWatchlistFromGrid(grid) {
  const visible = [...grid.querySelectorAll(".card[data-id]")].map((el) =>
    decodeURIComponent(el.dataset.id || ""),
  );
  if (!visible.length) return;
  const rest = state.watchlist.filter((id) => !visible.includes(id));
  state.watchlist = [...visible, ...rest];
  saveWatchlist();
}

function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, "");
  if (!hash || hash === "home") return { name: "home" };
  if (hash === "catalog") return { name: "catalog" };
  if (hash.startsWith("item/")) {
    return { name: "item", id: decodeURIComponent(hash.slice(5)) };
  }
  return { name: "home" };
}

function navigate(to) {
  location.hash = to.startsWith("#") ? to : `#/${to}`;
}

function filterSeries(series, rangeId) {
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[0];
  if (!series?.length) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range.days);
  const cut = cutoff.toISOString().slice(0, 10);
  const filtered = series.filter((p) => p.date >= cut);
  return filtered.length ? filtered : series.slice(-1);
}

function jpyTwdRate() {
  const n = Number(state.history.fx?.jpytwd);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toTwd(jpy, point) {
  if (point?.twd != null) return point.twd;
  const rate = jpyTwdRate();
  if (jpy == null || rate == null) return null;
  return Math.round(jpy * rate);
}

function money(jpy, point) {
  if (jpy == null) return "—";
  const ntd = toTwd(jpy, point);
  return `<span class="price-stack"><span class="price">${yen.format(jpy)}</span>${
    ntd == null ? "" : `<span class="price-twd">${twd.format(ntd)}</span>`
  }</span>`;
}

function lastTwo(series) {
  if (!series?.length) return { current: null, prev: null };
  return {
    current: series[series.length - 1],
    prev: series.length > 1 ? series[series.length - 2] : null,
  };
}

function changeText(from, to) {
  if (from == null || to == null) return "";
  const delta = to - from;
  if (delta === 0) return "持平";
  const pct = ((delta / from) * 100).toFixed(1);
  const sign = delta > 0 ? "+" : "";
  const ntdFrom = toTwd(from);
  const ntdTo = toTwd(to);
  const ntdBit =
    ntdFrom != null && ntdTo != null && ntdFrom !== ntdTo
      ? ` · ${sign}${twd.format(Math.abs(ntdTo - ntdFrom))}`
      : "";
  return `${sign}${yen.format(delta)} (${sign}${pct}%)${ntdBit}`;
}

function changeHtml(from, to) {
  if (from == null || to == null) return "—";
  const delta = to - from;
  if (delta === 0) return "持平";
  const pct = ((delta / from) * 100).toFixed(1);
  const sign = delta > 0 ? "+" : "";
  const ntdFrom = toTwd(from);
  const ntdTo = toTwd(to);
  const ntdDelta = ntdFrom != null && ntdTo != null ? ntdTo - ntdFrom : null;
  const twdLine =
    ntdDelta == null || ntdDelta === 0
      ? ""
      : `<span class="price-twd">${sign}${twd.format(Math.abs(ntdDelta))}</span>`;
  return `<span class="price-stack"><span class="price">${sign}${yen.format(delta)} <span class="change-pct">(${sign}${pct}%)</span></span>${twdLine}</span>`;
}

function changeClass(from, to) {
  if (from == null || to == null || from === to) return "flat";
  return to > from ? "up" : "down";
}

function visibleLines(item) {
  return visibleSourceMeta(item).map((source) => ({
    ...source,
    series: filterSeries(itemSources(item)[source.id]?.series || [], state.range),
  }));
}

function sourcePoint(item, sourceId) {
  const series = filterSeries(itemSources(item)[sourceId]?.series || [], state.range);
  return lastTwo(series);
}

function seriesLegendHtml(item, { showDelta = false, showTwd = false } = {}) {
  const chips = activeSources()
    .map((source) => {
      const { current, prev } = sourcePoint(item, source.id);
      if (!current) {
        return `<div class="series-chip is-empty">
          <span class="swatch" style="background:${source.color}"></span>
          <span class="series-name">${escapeHtml(source.label)}</span>
          <span class="price">—</span>
        </div>`;
      }
      const klass = changeClass(prev?.jpy, current.jpy);
      const ntd = showTwd ? toTwd(current.jpy, current) : null;
      const pct =
        showDelta && prev?.jpy
          ? `<span class="delta ${klass}">${current.jpy === prev.jpy ? "0%" : `${current.jpy > prev.jpy ? "+" : ""}${(((current.jpy - prev.jpy) / prev.jpy) * 100).toFixed(1)}%`}</span>`
          : "";
      return `<div class="series-chip">
        <span class="swatch" style="background:${source.color}"></span>
        <span class="series-name">${escapeHtml(source.label)}</span>
        <span class="price">${yen.format(current.jpy)}</span>
        ${ntd == null ? "" : `<span class="price-twd">${twd.format(ntd)}</span>`}
        ${pct}
      </div>`;
    })
    .join("");
  return `<div class="series-legend">${chips}</div>`;
}

function cheapestJpy(item, cols) {
  const values = cols
    .map((source) => sourcePoint(item, source.id).current?.jpy)
    .filter((n) => Number.isFinite(n));
  return values.length ? Math.min(...values) : null;
}

function compactPct(from, to) {
  if (from == null || to == null) return "";
  if (from === to) return "0%";
  const pct = ((to - from) / from) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function catalogPriceCell(item, source, best) {
  const { current, prev } = sourcePoint(item, source.id);
  if (!current) {
    return `<div class="catalog-quote is-empty"><span class="price">—</span></div>`;
  }
  const klass = changeClass(prev?.jpy, current.jpy);
  const ntd = toTwd(current.jpy, current);
  const isBest = best != null && current.jpy === best;
  return `<div class="catalog-quote ${isBest ? "is-best" : ""}">
    <span class="price">${yen.format(current.jpy)}</span>
    ${ntd == null ? "" : `<span class="price-twd">${twd.format(ntd)}</span>`}
    <span class="delta ${klass}">${prev ? compactPct(prev.jpy, current.jpy) : ""}</span>
  </div>`;
}

function computeChanges(history) {
  const date = history.date;
  const rows = [];
  for (const raw of history.items || []) {
    const item = normalizeItem(raw);
    for (const source of SOURCES) {
      const series = itemSources(item)[source.id]?.series || [];
      const today = series.find((p) => p.date === date);
      const prev = [...series].reverse().find((p) => p.date < date);
      if (today && !prev) {
        rows.push({ item, source: source.id, type: "new", from: null, to: today.jpy });
      } else if (today && prev && today.jpy !== prev.jpy) {
        rows.push({
          item,
          source: source.id,
          type: today.jpy > prev.jpy ? "up" : "down",
          from: prev.jpy,
          to: today.jpy,
        });
      } else if (!today && prev && item.active === false) {
        const last = series.at(-1);
        if (last && last.date < date) {
          rows.push({ item, source: source.id, type: "removed", from: last.jpy, to: null });
        }
      }
    }
  }
  const rank = { up: 0, down: 1, new: 2, removed: 3 };
  rows.sort((a, b) => rank[a.type] - rank[b.type] || a.item.nameEn.localeCompare(b.item.nameEn));
  return rows;
}

function hideTooltip() {
  const tip = document.getElementById("tooltip");
  tip.hidden = true;
}

function showTooltipHtml(clientX, clientY, html) {
  const tip = document.getElementById("tooltip");
  tip.hidden = false;
  tip.innerHTML = html;
  tip.style.left = `${clientX}px`;
  tip.style.top = `${clientY}px`;
}

function dateMs(date) {
  return new Date(`${date}T00:00:00`).getTime();
}

function monotonePath(pts) {
  if (!pts.length) return "";
  if (pts.length === 1) {
    return `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  }
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)} L${pts[1].x.toFixed(2)},${pts[1].y.toFixed(2)}`;
  }

  const n = pts.length;
  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = dx[i] ? (pts[i + 1].y - pts[i].y) / dx[i] : 0;
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  }
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(m[i]) < 1e-8) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const q = 3 / Math.sqrt(s);
      t[i] = q * a * m[i];
      t[i + 1] = q * b * m[i];
    }
  }

  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const x0 = pts[i].x;
    const y0 = pts[i].y;
    const x1 = pts[i + 1].x;
    const y1 = pts[i + 1].y;
    const h = dx[i];
    const cpx1 = x0 + h / 3;
    const cpy1 = y0 + (t[i] * h) / 3;
    const cpx2 = x1 - h / 3;
    const cpy2 = y1 - (t[i + 1] * h) / 3;
    d += ` C${cpx1.toFixed(2)},${cpy1.toFixed(2)} ${cpx2.toFixed(2)},${cpy2.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`;
  }
  return d;
}

function splitRuns(pts) {
  const runs = [];
  let run = [];
  for (const pt of pts) {
    const prev = run[run.length - 1];
    if (prev && pt.t - prev.t > 2.5 * 86400000) {
      if (run.length) runs.push(run);
      run = [];
    }
    run.push(pt);
  }
  if (run.length) runs.push(run);
  return runs;
}

function chartSvg(lines, { height = 88, interactive = false, chartId = "c" } = {}) {
  const usable = (lines || []).filter((line) => line.series?.length);
  if (!usable.length) {
    return `<div class="muted" style="padding:24px 0">尚無價格資料</div>`;
  }
  const dates = [...new Set(usable.flatMap((line) => line.series.map((p) => p.date)))].sort();
  const plotW = 360;
  const plotH = interactive ? height - 24 : height;
  const pad = interactive ? { top: 12, right: 12, bottom: 10, left: 8 } : { top: 6, right: 6, bottom: 6, left: 6 };
  const innerW = plotW - pad.left - pad.right;
  const innerH = plotH - pad.top - pad.bottom;
  const values = usable.flatMap((line) => line.series.map((p) => p.jpy));
  let min = Math.min(...values);
  let max = Math.max(...values);
  const padY = (max - min) * 0.12 || Math.max(max * 0.04, 1);
  min -= padY;
  max += padY;
  const span = max - min || 1;
  const t0 = dateMs(dates[0]);
  const t1 = dateMs(dates[dates.length - 1]);
  const xAtDate = (date) => {
    const t = dateMs(date);
    if (t1 === t0) return pad.left + innerW / 2;
    return pad.left + ((t - t0) / (t1 - t0)) * innerW;
  };
  const yAt = (v) => pad.top + (1 - (v - min) / span) * innerH;

  const ticks = interactive ? 4 : 0;
  const grid =
    ticks > 0
      ? Array.from({ length: ticks + 1 }, (_, i) => {
          const v = min + (span * i) / ticks;
          const y = yAt(v);
          return `<line class="chart-grid" x1="${pad.left}" y1="${y}" x2="${plotW - pad.right}" y2="${y}" />`;
        }).join("")
      : "";

  const paths = usable
    .map((line) => {
      const pts = [...line.series]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((point) => ({
          date: point.date,
          jpy: point.jpy,
          twd: point.twd,
          t: dateMs(point.date),
          x: xAtDate(point.date),
          y: yAt(point.jpy),
        }));
      if (!pts.length) return "";
      const last = pts[pts.length - 1];
      const d = splitRuns(pts).map(monotonePath).join(" ");
      const hoverDots = pts
        .map(
          (p) =>
            `<circle class="dot" data-chart="${escapeHtml(chartId)}" data-source="${escapeHtml(line.id)}" data-date="${p.date}" cx="${p.x}" cy="${p.y}" r="3.25" fill="${line.color}" opacity="0" />`,
        )
        .join("");
      const endDot = `<circle class="end-dot" cx="${last.x}" cy="${last.y}" r="3.25" fill="${line.color}" stroke="#ffffff" stroke-width="1.5" />`;
      return `<path class="chart-line" d="${d}" fill="none" stroke="${line.color}" stroke-width="${interactive ? 2 : 1.75}" stroke-linecap="round" stroke-linejoin="round"></path>${hoverDots}${endDot}`;
    })
    .join("");

  const payload = JSON.stringify(
    usable.map((line) => ({
      id: line.id,
      label: line.label,
      color: line.color,
      series: line.series,
    })),
  ).replace(/'/g, "&#39;");

  const svg = `<svg viewBox="0 0 ${plotW} ${plotH}" preserveAspectRatio="none" data-t0="${t0}" data-t1="${t1}" data-pad-left="${pad.left}" data-pad-right="${pad.right}" data-chart-id="${escapeHtml(chartId)}">
    ${grid}
    ${paths}
    ${
      interactive
        ? `<line class="scrubber" x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${(pad.top + innerH).toFixed(2)}" visibility="hidden" />`
        : ""
    }
  </svg>`;

  if (!interactive) {
    return `<div class="chart-frame chart-mini" data-lines='${payload}' data-chart-id="${escapeHtml(chartId)}">
      <div class="chart-plot">${svg}</div>
    </div>`;
  }

  const yLabels = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = min + (span * i) / ticks;
    const topPct = ((yAt(v) - pad.top) / innerH) * 100;
    return `<span class="chart-y-tick" style="top:${topPct.toFixed(2)}%">${escapeHtml(yen.format(v))}</span>`;
  }).join("");

  const labelIdx = dates
    .map((date, i) => i)
    .filter((i) => i === 0 || i === dates.length - 1 || i % Math.max(1, Math.ceil((dates.length - 1) / 4)) === 0);
  const xLabels = dates
    .map((date, i) => {
      if (!labelIdx.includes(i)) return "";
      const leftPct = ((xAtDate(date) - pad.left) / innerW) * 100;
      return `<span class="chart-x-tick" style="left:${leftPct.toFixed(2)}%">${escapeHtml(date.slice(5))}</span>`;
    })
    .join("");

  return `<div class="chart-frame chart-interactive" data-lines='${payload}' data-chart-id="${escapeHtml(chartId)}">
    <div class="chart-y-labels">${yLabels}</div>
    <div class="chart-plot">${svg}</div>
    <div class="chart-x-labels">${xLabels}</div>
  </div>`;
}

function bindChartHovers(root) {
  root.querySelectorAll(".chart-frame[data-lines]").forEach((frame) => {
    const svg = frame.querySelector("svg");
    if (!svg) return;
    let lines = [];
    try {
      lines = JSON.parse(frame.getAttribute("data-lines") || "[]");
    } catch {
      lines = [];
    }
    if (!lines.length) return;
    const dates = [...new Set(lines.flatMap((line) => line.series.map((p) => p.date)))].sort();
    const dots = [...svg.querySelectorAll(".dot")];
    const scrubber = svg.querySelector(".scrubber");
    const viewBox = (svg.getAttribute("viewBox") || "0 0 360 88").split(/\s+/).map(Number);
    const width = viewBox[2] || 360;
    const padLeft = Number(svg.dataset.padLeft || 8);
    const padRight = Number(svg.dataset.padRight || 12);
    const innerW = width - padLeft - padRight;
    const t0 = Number(svg.dataset.t0);
    const t1 = Number(svg.dataset.t1);

    const xAtDate = (date) => {
      const t = dateMs(date);
      if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 === t0) return padLeft + innerW / 2;
      return padLeft + ((t - t0) / (t1 - t0)) * innerW;
    };

    const showAt = (date, clientX, clientY) => {
      dots.forEach((d) => d.setAttribute("opacity", d.getAttribute("data-date") === date ? "1" : "0"));
      if (scrubber) {
        const cx = xAtDate(date);
        scrubber.setAttribute("x1", String(cx));
        scrubber.setAttribute("x2", String(cx));
        scrubber.setAttribute("visibility", "visible");
      }
      const rows = lines
        .map((line) => {
          const point = line.series.find((p) => p.date === date);
          if (!point) return "";
          const ntd = toTwd(point.jpy, point);
          return `<div class="t-row"><span class="t-label"><span class="swatch" style="background:${line.color}"></span>${escapeHtml(line.label)}</span><span>${yen.format(point.jpy)}${ntd == null ? "" : ` · ${twd.format(ntd)}`}</span></div>`;
        })
        .filter(Boolean);
      if (!rows.length) return;
      showTooltipHtml(clientX, clientY, `<div class="t-date">${escapeHtml(date)}</div>${rows.join("")}`);
    };

    svg.addEventListener("mousemove", (e) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      const x = ((e.clientX - rect.left) / rect.width) * width;
      let best = dates[0];
      let bestDist = Infinity;
      dates.forEach((date) => {
        const dist = Math.abs(xAtDate(date) - x);
        if (dist < bestDist) {
          bestDist = dist;
          best = date;
        }
      });
      showAt(best, e.clientX, e.clientY);
    });
    svg.addEventListener("mouseleave", () => {
      dots.forEach((d) => d.setAttribute("opacity", "0"));
      if (scrubber) scrubber.setAttribute("visibility", "hidden");
      hideTooltip();
    });
  });
}

function bindCardDrag(root) {
  const grid = root.querySelector("#watch-grid");
  if (!grid) return;

  let dragEl = null;
  let moved = false;

  grid.querySelectorAll(".card[data-id]").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      dragEl = card;
      moved = false;
      card.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      const id = decodeURIComponent(card.dataset.id || "");
      e.dataTransfer.setData("text/plain", id);
      try {
        e.dataTransfer.setData("application/x-spt-id", id);
      } catch {
        /* some browsers */
      }
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("is-dragging");
      grid.querySelectorAll(".is-drop-target").forEach((el) => el.classList.remove("is-drop-target"));
      if (moved) {
        const block = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          document.removeEventListener("click", block, true);
        };
        document.addEventListener("click", block, true);
        window.setTimeout(() => document.removeEventListener("click", block, true), 0);
      }
      dragEl = null;
      moved = false;
    });

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const over = e.currentTarget;
      if (!dragEl || over === dragEl) return;
      grid.querySelectorAll(".is-drop-target").forEach((el) => {
        if (el !== over) el.classList.remove("is-drop-target");
      });
      over.classList.add("is-drop-target");
    });

    card.addEventListener("dragleave", (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove("is-drop-target");
      }
    });

    card.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget;
      target.classList.remove("is-drop-target");
      if (!dragEl || target === dragEl) return;
      swapElements(dragEl, target);
      syncWatchlistFromGrid(grid);
      moved = true;
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate(`item/${card.dataset.open}`);
      }
    });
  });
}

function rangeControls() {
  return `<div class="segment" id="range">
    ${RANGES.map(
      (r) =>
        `<button type="button" data-range="${r.id}" class="${state.range === r.id ? "active" : ""}">${r.label}</button>`,
    ).join("")}
  </div>`;
}

function sourceControls() {
  return `<div class="segment source-segment" id="sources">
    ${SOURCES.map((source) => {
      const on = state.sources[source.id];
      return `<button type="button" data-source="${source.id}" class="${on ? "active" : ""}" aria-pressed="${on}">
        <span class="swatch" style="background:${source.color}"></span>${escapeHtml(source.label)}
      </button>`;
    }).join("")}
  </div>`;
}

function shell(content) {
  const route = state.route.name;
  return `<div class="shell">
    <header class="topnav">
      <a class="brand" href="#/">
        <span class="brand-mark" aria-hidden="true"></span>
        <div>
          <h1>供應商進價</h1>
          <p>Pokemon TCG · JPY / TWD</p>
        </div>
      </a>
      <nav class="nav-links">
        <button class="nav-link ${route === "home" ? "active" : ""}" data-nav="home">首頁</button>
        <button class="nav-link ${route === "catalog" ? "active" : ""}" data-nav="catalog">全部商品</button>
      </nav>
    </header>
    <main class="page">${content}</main>
  </div>`;
}

function renderHome() {
  const watched = state.watchlist
    .map((id) => state.history.items.find((i) => i.id === id))
    .filter(Boolean)
    .map(normalizeItem);
  const q = state.search.trim().toLowerCase();
  const cards = watched.filter((item) => {
    if (!q) return true;
    return (
      item.nameEn.toLowerCase().includes(q) ||
      (item.nameJa || "").toLowerCase().includes(q)
    );
  });

  const body = !watched.length
    ? `<div class="empty">
        <h3>還沒有追蹤中的商品</h3>
        <p>到「全部商品」把你想盯的盒子加進首頁。</p>
        <button class="btn btn-primary" data-nav="catalog">瀏覽商品</button>
      </div>`
    : `<div class="grid" id="watch-grid">
        ${cards
          .map((item) => {
            const lines = visibleLines(item);
            const id = encodeURIComponent(item.id);
            return `<article class="card" draggable="true" data-id="${id}" data-open="${id}" tabindex="0" role="link">
              <span class="card-grip" aria-hidden="true">⠿</span>
              <div class="card-top">
                ${imageHtml(item, "thumb")}
                <div class="card-meta">
                  <h3 class="card-title">${escapeHtml(item.nameEn)}</h3>
                  <p class="card-sub">${escapeHtml(item.nameJa || "")}</p>
                </div>
              </div>
              <div class="mini-chart">${chartSvg(lines, { height: 72, chartId: item.id })}</div>
              ${seriesLegendHtml(item)}
            </article>`;
          })
          .join("")}
      </div>`;

  return shell(`
    <div class="page-head">
      <div>
        <h2>追蹤中</h2>
        <p class="lede">${watched.length} 項商品 · 拖到目標卡片放開即可對調 · 快照 ${state.history.date || "—"}${
          jpyTwdRate() ? ` · 1 JPY ≈ ${jpyTwdRate().toFixed(4)} TWD` : ""
        }</p>
      </div>
      <div class="toolbar">
        ${rangeControls()}
        ${sourceControls()}
        <input class="search" id="search" type="search" placeholder="搜尋追蹤中的商品" value="${escapeHtml(state.search)}" />
        <button class="btn btn-secondary" data-nav="catalog">管理追蹤</button>
      </div>
    </div>
    ${body}
    ${renderChangesBlock()}
  `);
}

function renderChangesBlock() {
  const rows = computeChanges(state.history).filter((row) => state.sources[row.source]);
  if (!rows.length) return "";
  const labels = { up: "上漲", down: "下跌", new: "新品", removed: "下架" };
  return `<section class="changes">
    <h3>今日異動</h3>
    <p class="muted">與昨日 JPY 進價比較，台幣依當日匯率換算</p>
    ${rows
      .map((row) => {
        const delta =
          row.from != null && row.to != null ? changeText(row.from, row.to) : "";
        return `<div class="change-row">
          ${imageHtml(row.item, "thumb")}
          <span class="tag ${row.type}">${labels[row.type]}</span>
          <button class="btn btn-ghost btn-sm" data-open="${encodeURIComponent(row.item.id)}" style="justify-self:start;padding:0;height:auto">${escapeHtml(row.item.nameEn)}<div class="muted">${escapeHtml(SOURCE_LABEL[row.source] || row.source)}</div></button>
          <span>${row.from == null ? "—" : money(row.from)}</span>
          <span class="${row.type === "up" ? "price-up" : row.type === "down" ? "price-down" : ""}">${row.to == null ? "—" : money(row.to)}${delta ? `<div class="muted">${escapeHtml(delta)}</div>` : ""}</span>
        </div>`;
      })
      .join("")}
  </section>`;
}

function renderCatalog() {
  const q = state.search.trim().toLowerCase();
  const items = (state.history.items || []).map(normalizeItem).filter((item) => {
    if (item.active === false && !isWatched(item.id)) return false;
    if (!q) return true;
    return (
      item.nameEn.toLowerCase().includes(q) ||
      (item.nameJa || "").toLowerCase().includes(q)
    );
  });
  const cols = activeSources();
  const colTemplate = `40px minmax(240px, 1.8fr) ${cols.map(() => "minmax(132px, 1fr)").join(" ")} 108px`;

  return shell(`
    <div class="page-head">
      <div>
        <h2>全部商品</h2>
        <p class="lede">點列開啟走勢 · 已追蹤 ${state.watchlist.length} 項</p>
      </div>
      <div class="toolbar">
        ${sourceControls()}
        <input class="search" id="search" type="search" placeholder="搜尋英文或日文品名" value="${escapeHtml(state.search)}" />
      </div>
    </div>
    <div class="catalog-list">
      <div class="catalog-head" style="grid-template-columns:${colTemplate}">
        <span></span>
        <span class="catalog-label">商品</span>
        ${cols
          .map(
            (source) =>
              `<span class="catalog-label catalog-col"><span class="swatch" style="background:${source.color}"></span>${escapeHtml(source.label)}</span>`,
          )
          .join("")}
        <span></span>
      </div>
      ${items
        .map((item) => {
          const watched = isWatched(item.id);
          const best = cheapestJpy(item, cols);
          return `<div class="catalog-row" style="grid-template-columns:${colTemplate}" data-open="${encodeURIComponent(item.id)}" tabindex="0" role="link">
            ${imageHtml(item, "thumb catalog-thumb")}
            <div class="catalog-product">
              <strong>${escapeHtml(item.nameEn)}</strong>
              <span class="muted">${escapeHtml(item.nameJa || "")}</span>
            </div>
            ${cols.map((source) => catalogPriceCell(item, source, best)).join("")}
            <button class="badge ${watched ? "on" : ""}" data-toggle="${encodeURIComponent(item.id)}">${watched ? "追蹤中" : "追蹤"}</button>
          </div>`;
        })
        .join("")}
    </div>
  `);
}

function renderItem() {
  const item = normalizeItem(state.history.items.find((i) => i.id === state.route.id));
  if (!item) {
    return shell(`<div class="empty"><h3>找不到商品</h3><button class="btn btn-primary" data-nav="home">回首頁</button></div>`);
  }
  const lines = visibleLines(item);
  const values = lines.flatMap((line) => line.series.map((p) => p.jpy));
  const high = values.length ? Math.max(...values) : null;
  const low = values.length ? Math.min(...values) : null;
  const watched = isWatched(item.id);

  return shell(`
    <button class="btn btn-ghost back" data-nav="home">← 回首頁</button>
    <div class="detail-hero">
      ${imageHtml(item, "detail-art")}
      <div>
        <h2>${escapeHtml(item.nameEn)}</h2>
        <p class="lede">${escapeHtml([item.nameJa, item.note].filter(Boolean).join(" · "))}</p>
      </div>
      <button class="btn ${watched ? "btn-secondary" : "btn-primary"}" data-toggle="${encodeURIComponent(item.id)}">${watched ? "取消追蹤" : "加入追蹤"}</button>
    </div>
    <div class="toolbar" style="margin-bottom:16px">${rangeControls()}${sourceControls()}</div>
    <section class="panel chart-panel">
      ${seriesLegendHtml(item, { showDelta: true, showTwd: true })}
      <div class="detail-chart">${chartSvg(lines, { height: 360, interactive: true, chartId: "detail" })}</div>
      <p class="chart-caption muted">JPY 進價 · 區間 ${high == null ? "—" : yen.format(high)} 高 / ${low == null ? "—" : yen.format(low)} 低 · 滑過圖表可對齊同一天</p>
    </section>
  `);
}

function bindCatalogKeys(root) {
  root.querySelectorAll(".catalog-row[data-open]").forEach((row) => {
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate(`item/${row.dataset.open}`);
      }
    });
  });
}

function render() {
  state.route = parseRoute();
  const app = document.getElementById("app");
  hideTooltip();
  if (state.route.name === "catalog") app.innerHTML = renderCatalog();
  else if (state.route.name === "item") app.innerHTML = renderItem();
  else app.innerHTML = renderHome();
  bindChartHovers(app);
  bindCardDrag(app);
  bindCatalogKeys(app);
}

function onClick(e) {
  const nav = e.target.closest("[data-nav]");
  if (nav) {
    e.preventDefault();
    const name = nav.dataset.nav;
    navigate(name === "home" ? "" : name);
    return;
  }
  const open = e.target.closest("[data-open]");
  if (open) {
    e.preventDefault();
    navigate(`item/${open.dataset.open}`);
    return;
  }
  const toggle = e.target.closest("[data-toggle]");
  if (toggle) {
    e.preventDefault();
    e.stopPropagation();
    toggleWatch(decodeURIComponent(toggle.dataset.toggle));
    render();
    return;
  }
  const source = e.target.closest("[data-source]");
  if (source) {
    e.preventDefault();
    toggleSource(source.dataset.source);
    render();
    return;
  }
  const range = e.target.closest("[data-range]");
  if (range) {
    e.preventDefault();
    state.range = range.dataset.range;
    localStorage.setItem(RANGE_KEY, state.range);
    render();
  }
}

async function loadHistory() {
  if (window.__HISTORY__?.items?.length) return window.__HISTORY__;
  const res = await fetch("/api/prices", { credentials: "same-origin" });
  if (res.status === 401) {
    const next = `${location.pathname}${location.search}`;
    location.href = `/?next=${encodeURIComponent(next)}`;
    return null;
  }
  if (!res.ok) throw new Error("進價資料讀取失敗");
  return res.json();
}

async function boot() {
  let history;
  try {
    history = await loadHistory();
  } catch (err) {
    document.getElementById("app").innerHTML = shell(
      `<div class="empty"><h3>讀不到進價</h3><p>${escapeHtml(err.message || "請稍後再試")}</p></div>`,
    );
    return;
  }
  if (!history?.items?.length) {
    if (!history) return;
    document.getElementById("app").innerHTML = shell(
      `<div class="empty"><h3>尚無資料</h3><p>請先在本機執行 npm run snapshot</p></div>`,
    );
    return;
  }
  state.history = {
    ...history,
    items: (history.items || []).map(normalizeItem),
  };
  state.watchlist = loadWatchlist(state.history.items);
  saveWatchlist();
  document.addEventListener("click", onClick);
  document.addEventListener("input", (e) => {
    if (e.target.id === "search") {
      state.search = e.target.value;
      render();
      const input = document.getElementById("search");
      if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }
  });
  window.addEventListener("hashchange", render);
  render();
  loadFx();
}

async function loadFx() {
  if (jpyTwdRate()) return;
  const urls = [
    "https://open.er-api.com/v6/latest/JPY",
    "https://api.exchangerate-api.com/v4/latest/JPY",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const rate = Number((await res.json())?.rates?.TWD);
      if (Number.isFinite(rate) && rate > 0) {
        state.history.fx = { jpytwd: rate, fetchedAt: new Date().toISOString(), source: url };
        render();
        return;
      }
    } catch {
      // try next
    }
  }
}

boot();
