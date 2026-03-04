(function () {
  const apiInput = document.getElementById("apiBase");
  const runInput = document.getElementById("runId");
  const symbolInput = document.getElementById("symbol");
  const loadBtn = document.getElementById("loadBtn");
  const statsEl = document.getElementById("stats");
  const rangesEl = document.getElementById("ranges");
  const zonesEl = document.getElementById("zones");
  const chartHost = document.getElementById("chart");

  const savedApi = localStorage.getItem("inplay_viewer_api");
  const savedRunId = localStorage.getItem("inplay_viewer_runid");
  const savedSymbol = localStorage.getItem("inplay_viewer_symbol");
  apiInput.value = savedApi || window.location.origin;
  runInput.value = savedRunId || "";
  symbolInput.value = savedSymbol || "";

  const chart = LightweightCharts.createChart(chartHost, {
    autoSize: true,
    layout: {
      background: { color: "#fffdf7" },
      textColor: "#1d2028",
    },
    rightPriceScale: { borderColor: "#d9d4c6" },
    timeScale: {
      borderColor: "#d9d4c6",
      timeVisible: true,
      secondsVisible: false,
    },
    grid: {
      vertLines: { color: "#efe8d8" },
      horzLines: { color: "#efe8d8" },
    },
  });

  const candlesSeries = chart.addCandlestickSeries({
    upColor: "#188169",
    downColor: "#c25634",
    borderVisible: false,
    wickUpColor: "#188169",
    wickDownColor: "#c25634",
  });
  const rangeSeries = [];
  const zoneSeries = [];
  const zoneMarkers = [];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function toUnixSeconds(ms) {
    return Math.floor(Number(ms) / 1000);
  }

  function intervalToMs(interval) {
    const map = {
      "1m": 60_000,
      "3m": 180_000,
      "5m": 300_000,
      "15m": 900_000,
      "30m": 1_800_000,
      "1h": 3_600_000,
      "2h": 7_200_000,
      "4h": 14_400_000,
      "1d": 86_400_000,
    };
    return map[interval] || 60_000;
  }

  function toBarOpenSeconds(ms, interval) {
    const intervalMs = intervalToMs(interval);
    const alignedMs = Math.floor(Number(ms) / intervalMs) * intervalMs;
    return Math.floor(alignedMs / 1000);
  }

  function reasonColor(reason) {
    if (reason === "volume_only") return "#d07a00";
    if (reason === "volatility_only") return "#cc5a38";
    return "#2a65d9";
  }

  function renderStats(payload, symbol, ranges) {
    const run = payload || {};
    const cards = [
      ["Run ID", run.id || "-"],
      ["Status", run.status || "-"],
      ["Symbol", symbol || "-"],
      ["Interval", run.interval || (ranges[0] && ranges[0].interval) || "-"],
      ["Ranges", String(ranges.length)],
      ["Processed/Total", `${run.processedSymbols ?? "-"} / ${run.totalSymbols ?? "-"}`],
      ["Volume Threshold", run.quoteVolumeThreshold || "-"],
      ["Volatility Threshold", run.volatilityThreshold || "-"],
      ["Activation Mode", run.activationMode || "-"],
    ];
    statsEl.innerHTML = cards
      .map(
        ([k, v]) =>
          `<article class="stat"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v)}</div></article>`,
      )
      .join("");
  }

  function renderRangesTable(ranges) {
    if (!ranges.length) {
      rangesEl.innerHTML = "<p>No in-play ranges returned.</p>";
      return;
    }
    const rows = ranges
      .map((range) => {
        const reason = range.activationReason || "both";
        return `
          <tr>
            <td>${escapeHtml(range.symbol)}</td>
            <td>${new Date(Number(range.startTime)).toISOString()}</td>
            <td>${new Date(Number(range.endTime)).toISOString()}</td>
            <td>${escapeHtml(range.lowPrice)}</td>
            <td>${escapeHtml(range.highPrice)}</td>
            <td>${escapeHtml(range.activeWindows)}</td>
            <td>${escapeHtml(range.avgQuoteVolume)}</td>
            <td>${escapeHtml(range.maxVolatilityPercent)}</td>
            <td><span class="reason ${escapeHtml(reason)}">${escapeHtml(reason)}</span></td>
          </tr>
        `;
      })
      .join("");
    rangesEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Start</th>
            <th>End</th>
            <th>Low</th>
            <th>High</th>
            <th>Windows</th>
            <th>Avg Quote Vol</th>
            <th>Max Volatility %</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function clearRangeOverlays() {
    while (rangeSeries.length > 0) {
      chart.removeSeries(rangeSeries.pop());
    }
  }

  function clearZoneOverlays() {
    while (zoneSeries.length > 0) {
      chart.removeSeries(zoneSeries.pop());
    }
    zoneMarkers.length = 0;
    candlesSeries.setMarkers([]);
  }

  function renderRangeOverlays(interval, ranges) {
    clearRangeOverlays();
    for (const range of ranges) {
      const startSec = toBarOpenSeconds(range.startTime, interval);
      const endSec = toBarOpenSeconds(range.endTime, interval);
      const color = reasonColor(range.activationReason || "both");

      const highLine = chart.addLineSeries({
        color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dotted,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      highLine.setData([
        { time: startSec, value: Number(range.highPrice) },
        { time: endSec, value: Number(range.highPrice) },
      ]);
      rangeSeries.push(highLine);

      const lowLine = chart.addLineSeries({
        color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dotted,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      lowLine.setData([
        { time: startSec, value: Number(range.lowPrice) },
        { time: endSec, value: Number(range.lowPrice) },
      ]);
      rangeSeries.push(lowLine);
    }
  }

  function zoneColor(direction) {
    return direction === "bullish" ? "#168b6f" : "#cc5a38";
  }

  function renderZonesTable(zones) {
    if (!zones.length) {
      zonesEl.innerHTML = "<p>No FVG zones returned.</p>";
      return;
    }

    const rows = zones
      .map((zone) => {
        return `
          <tr>
            <td>${escapeHtml(zone.rangeId)}</td>
            <td>${escapeHtml(zone.direction)}</td>
            <td>${new Date(Number(zone.startTime)).toISOString()}</td>
            <td>${zone.mitigatedTime ? new Date(Number(zone.mitigatedTime)).toISOString() : "-"}</td>
            <td>${escapeHtml(zone.lowerBound)}</td>
            <td>${escapeHtml(zone.upperBound)}</td>
            <td>${escapeHtml(zone.description)}</td>
          </tr>
        `;
      })
      .join("");

    zonesEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Range</th>
            <th>Direction</th>
            <th>Created</th>
            <th>Mitigated</th>
            <th>Low</th>
            <th>High</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderZoneOverlays(interval, zones) {
    clearZoneOverlays();
    const limited = zones.length > 200 ? zones.slice(zones.length - 200) : zones;
    const minDeltaSec = Math.max(1, Math.floor(intervalToMs(interval) / 1000));
    for (const zone of limited) {
      const startSec = toBarOpenSeconds(zone.startTime, interval);
      const rawEndSec = toBarOpenSeconds(zone.endTime || zone.startTime, interval);
      const endSec = rawEndSec <= startSec ? startSec + minDeltaSec : rawEndSec;
      const color = zoneColor(zone.direction);

      const highLine = chart.addLineSeries({
        color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      highLine.setData([
        { time: startSec, value: Number(zone.upperBound) },
        { time: endSec, value: Number(zone.upperBound) },
      ]);
      zoneSeries.push(highLine);

      const lowLine = chart.addLineSeries({
        color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      lowLine.setData([
        { time: startSec, value: Number(zone.lowerBound) },
        { time: endSec, value: Number(zone.lowerBound) },
      ]);
      zoneSeries.push(lowLine);

      if (zone.mitigatedCandleOpenTime && zone.mitigatedPrice) {
        zoneMarkers.push({
          time: toBarOpenSeconds(zone.mitigatedCandleOpenTime, interval),
          position: zone.direction === "bullish" ? "belowBar" : "aboveBar",
          color,
          shape: zone.direction === "bullish" ? "arrowUp" : "arrowDown",
          text: "mitigated",
        });
      }
    }

    if (zoneMarkers.length > 0) {
      candlesSeries.setMarkers(zoneMarkers);
    }
  }

  async function fetchRunStatus(apiBase, runId) {
    const response = await fetch(`${apiBase}/backtesting/in-play/runs/${runId}`);
    if (!response.ok) {
      throw new Error(`In-play run status failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  async function fetchRanges(apiBase, runId, symbol) {
    const url = new URL(`${apiBase}/backtesting/in-play/runs/${runId}/ranges`);
    if (symbol) {
      url.searchParams.set("symbol", symbol);
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`In-play ranges request failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  async function fetchFvgZones(apiBase, runId, symbol) {
    const url = new URL(`${apiBase}/backtesting/in-play/runs/${runId}/fvg-zones`);
    if (symbol) {
      url.searchParams.set("symbol", symbol);
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`In-play FVG zones request failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  async function fetchKlines(symbol, interval, startMs, endMs) {
    const limit = 1000;
    const records = [];
    let cursor = Number(startMs);
    const end = Number(endMs);
    let rounds = 0;
    while (cursor <= end && rounds < 200) {
      rounds += 1;
      const url = new URL("https://fapi.binance.com/fapi/v1/klines");
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("interval", interval);
      url.searchParams.set("startTime", String(cursor));
      url.searchParams.set("endTime", String(end));
      url.searchParams.set("limit", String(limit));

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Binance klines failed: HTTP ${response.status}`);
      }
      const chunk = await response.json();
      if (!Array.isArray(chunk) || chunk.length === 0) {
        break;
      }
      records.push(...chunk);
      const lastOpenMs = Number(chunk[chunk.length - 1][0]);
      if (!Number.isFinite(lastOpenMs) || lastOpenMs <= cursor) {
        break;
      }
      cursor = lastOpenMs + 1;
      if (chunk.length < limit) {
        break;
      }
    }

    return records.map((row) => ({
      time: toUnixSeconds(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
    }));
  }

  async function loadInPlay() {
    const apiBase = apiInput.value.trim().replace(/\/+$/, "");
    const runId = runInput.value.trim();
    const symbol = symbolInput.value.trim().toUpperCase();
    if (!apiBase || !runId || !symbol) {
      alert("Please provide API base, run ID and symbol.");
      return;
    }

    localStorage.setItem("inplay_viewer_api", apiBase);
    localStorage.setItem("inplay_viewer_runid", runId);
    localStorage.setItem("inplay_viewer_symbol", symbol);

    loadBtn.disabled = true;
    loadBtn.textContent = "Loading...";
    try {
      const [runStatus, rangesResponse, zonesResponse] = await Promise.all([
        fetchRunStatus(apiBase, runId),
        fetchRanges(apiBase, runId, symbol),
        fetchFvgZones(apiBase, runId, symbol),
      ]);
      const ranges = Array.isArray(rangesResponse.items)
        ? rangesResponse.items
        : [];
      const zones = Array.isArray(zonesResponse.items) ? zonesResponse.items : [];
      renderRangesTable(ranges);
      renderZonesTable(zones);
      renderStats(runStatus, symbol, ranges);

      if (!ranges.length) {
        candlesSeries.setData([]);
        clearRangeOverlays();
        clearZoneOverlays();
        return;
      }

      const interval = ranges[0].interval || runStatus.interval || "15m";
      const startMs = Math.min(...ranges.map((range) => Number(range.startTime)));
      const endMs = Math.max(...ranges.map((range) => Number(range.endTime)));
      const candles = await fetchKlines(symbol, interval, startMs, endMs);
      candlesSeries.setData(candles);
      renderRangeOverlays(interval, ranges);
      renderZoneOverlays(interval, zones);
      chart.timeScale().fitContent();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(message);
    } finally {
      loadBtn.disabled = false;
      loadBtn.textContent = "Load In-Play";
    }
  }

  loadBtn.addEventListener("click", () => {
    void loadInPlay();
  });
  runInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void loadInPlay();
    }
  });
  symbolInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void loadInPlay();
    }
  });

  if (runInput.value && symbolInput.value) {
    void loadInPlay();
  }
})();
