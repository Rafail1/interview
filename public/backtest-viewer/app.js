(function () {
  const apiInput = document.getElementById("apiBase");
  const runInput = document.getElementById("runId");
  const loadBtn = document.getElementById("loadBtn");
  const showZonesInput = document.getElementById("showZones");
  const statsEl = document.getElementById("stats");
  const tradesEl = document.getElementById("trades");
  const zonesEl = document.getElementById("zones");
  const chartHost = document.getElementById("chart");

  const savedApi = localStorage.getItem("bt_viewer_api");
  const savedRunId = localStorage.getItem("bt_viewer_runid");
  apiInput.value = savedApi || window.location.origin;
  runInput.value = savedRunId || "";

  const chart = LightweightCharts.createChart(chartHost, {
    autoSize: true,
    layout: {
      background: { color: "#fffdf8" },
      textColor: "#1f2330",
    },
    rightPriceScale: {
      borderColor: "#d9d3c8",
    },
    timeScale: {
      borderColor: "#d9d3c8",
      timeVisible: true,
      secondsVisible: false,
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    grid: {
      vertLines: { color: "#efeade" },
      horzLines: { color: "#efeade" },
    },
  });

  const candlesSeries = chart.addCandlestickSeries({
    upColor: "#168b6f",
    downColor: "#cc5a38",
    borderVisible: false,
    wickUpColor: "#168b6f",
    wickDownColor: "#cc5a38",
  });
  const maxCandlesToRender = 8000;
  const maxZonesToRender = 120;
  const zoneSeries = [];
  let currentRun = null;
  let currentZones = [];

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
      "6h": 21_600_000,
      "8h": 28_800_000,
      "12h": 43_200_000,
      "1d": 86_400_000,
      "3d": 259_200_000,
      "1w": 604_800_000,
      "1mo": 2_592_000_000,
    };
    return map[interval] || 60_000;
  }

  function toBarOpenSeconds(ms, interval) {
    const intervalMs = intervalToMs(interval);
    const alignedMs = Math.floor(Number(ms) / intervalMs) * intervalMs;
    return Math.floor(alignedMs / 1000);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderStats(run) {
    const items = [
      ["Symbol", run.symbol],
      ["Interval", run.interval],
      ["Total Trades", run.totalTrades],
      ["Win Rate", `${run.winRate}%`],
      ["PnL", run.totalPnL],
      ["Max Drawdown", run.maxDrawdown],
      ["Profit Factor", run.profitFactor],
      ["Sharpe", run.sharpeRatio],
    ];

    statsEl.innerHTML = items
      .map(
        ([k, v]) =>
          `<article class="stat"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v)}</div></article>`,
      )
      .join("");
  }

  function renderTrades(trades) {
    const rows = trades
      .map((t) => {
        const cls = Number(t.pnl) >= 0 ? "pos" : "neg";
        return `
          <tr>
            <td>${escapeHtml(t.side)}</td>
            <td>${new Date(Number(t.entryTime)).toISOString()}</td>
            <td>${t.exitTime ? new Date(Number(t.exitTime)).toISOString() : "-"}</td>
            <td>${escapeHtml(t.entryPrice)}</td>
            <td>${escapeHtml(t.exitPrice ?? "-")}</td>
            <td class="${cls}">${escapeHtml(t.pnl)}</td>
            <td>${escapeHtml(t.pnlPercent)}</td>
          </tr>`;
      })
      .join("");

    tradesEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Side</th>
            <th>Entry Time</th>
            <th>Exit Time</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>PnL</th>
            <th>PnL %</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderZones(zones) {
    if (!zones.length) {
      zonesEl.innerHTML = "<p>No FVG zones returned for this run.</p>";
      return;
    }
    const rows = zones
      .map((z) => {
        const dirClass = z.direction === "bullish" ? "bull" : "bear";
        const endValue = z.endTime
          ? new Date(Number(z.endTime)).toISOString()
          : "-";
        return `
          <tr>
            <td>${escapeHtml(z.id)}</td>
            <td><span class="tag ${dirClass}">${escapeHtml(z.direction)}</span></td>
            <td>${new Date(Number(z.startTime)).toISOString()}</td>
            <td>${endValue}</td>
            <td>${escapeHtml(z.lowerBound)}</td>
            <td>${escapeHtml(z.upperBound)}</td>
            <td>${escapeHtml(z.description)}</td>
          </tr>
        `;
      })
      .join("");
    zonesEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Direction</th>
            <th>Start</th>
            <th>End</th>
            <th>Low</th>
            <th>High</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderZoneOverlays(run, zones) {
    while (zoneSeries.length > 0) {
      const series = zoneSeries.pop();
      chart.removeSeries(series);
    }
    if (!showZonesInput.checked || !zones.length || !run) {
      return;
    }

    const limitedZones =
      zones.length > maxZonesToRender
        ? zones.slice(zones.length - maxZonesToRender)
        : zones;

    const runEndSec = toBarOpenSeconds(run.endTime, run.interval);
    for (const zone of limitedZones) {
      const startSec = toBarOpenSeconds(zone.startTime, run.interval);
      const endSec = zone.endTime
        ? toBarOpenSeconds(zone.endTime, run.interval)
        : runEndSec;
      const isBull = zone.direction === "bullish";
      const color = isBull ? "#19836a" : "#bd4b2f";

      const upperSeries = chart.addLineSeries({
        color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      upperSeries.setData([
        { time: startSec, value: Number(zone.upperBound) },
        { time: endSec, value: Number(zone.upperBound) },
      ]);
      zoneSeries.push(upperSeries);

      const lowerSeries = chart.addLineSeries({
        color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      lowerSeries.setData([
        { time: startSec, value: Number(zone.lowerBound) },
        { time: endSec, value: Number(zone.lowerBound) },
      ]);
      zoneSeries.push(lowerSeries);
    }
  }

  async function fetchRun(apiBase, runId) {
    const response = await fetch(`${apiBase}/backtesting/run/${runId}`);
    if (!response.ok) {
      throw new Error(`Run request failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  async function fetchFvgZones(apiBase, runId) {
    const response = await fetch(`${apiBase}/backtesting/run/${runId}/fvg-zones`);
    if (!response.ok) {
      throw new Error(`FVG zones request failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  async function fetchKlines(symbol, interval, startMs, endMs) {
    const limit = 1000;
    const records = [];
    let cursor = Number(startMs);
    const end = Number(endMs);
    const maxRounds = 200;
    let rounds = 0;

    while (cursor <= end && rounds < maxRounds) {
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

    let candles = records.map((row) => ({
      time: toUnixSeconds(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
    }));

    if (candles.length > maxCandlesToRender) {
      const step = Math.ceil(candles.length / maxCandlesToRender);
      candles = candles.filter((_, index) => index % step === 0);
    }

    return candles;
  }

  function setMarkers(run) {
    const markers = [];
    for (const trade of run.trades || []) {
      markers.push({
        time: toUnixSeconds(trade.entryTime),
        position: trade.side === "BUY" ? "belowBar" : "aboveBar",
        color: trade.side === "BUY" ? "#168b6f" : "#cc5a38",
        shape: trade.side === "BUY" ? "arrowUp" : "arrowDown",
        text: `IN ${trade.side} ${trade.entryPrice}`,
      });
      if (trade.exitTime) {
        const positive = Number(trade.pnl) >= 0;
        markers.push({
          time: toUnixSeconds(trade.exitTime),
          position: trade.side === "BUY" ? "aboveBar" : "belowBar",
          color: positive ? "#168b6f" : "#cc5a38",
          shape: "circle",
          text: `OUT ${trade.exitPrice} PnL ${trade.pnl}`,
        });
      }
    }
    candlesSeries.setMarkers(markers);
  }

  async function load() {
    const apiBase = apiInput.value.trim().replace(/\/+$/, "");
    const runId = runInput.value.trim();
    if (!apiBase || !runId) {
      alert("Please provide API base and run id");
      return;
    }

    loadBtn.disabled = true;
    loadBtn.textContent = "Loading...";
    localStorage.setItem("bt_viewer_api", apiBase);
    localStorage.setItem("bt_viewer_runid", runId);

    try {
      const run = await fetchRun(apiBase, runId);
      const zonesResponse = await fetchFvgZones(apiBase, runId);
      const candles = await fetchKlines(
        run.symbol,
        run.interval,
        Number(run.startTime),
        Number(run.endTime),
      );
      candlesSeries.setData(candles);
      setMarkers(run);
      currentRun = run;
      currentZones = zonesResponse.items || [];
      renderZoneOverlays(run, currentZones);
      chart.timeScale().fitContent();
      renderStats(run);
      renderTrades(run.trades || []);
      renderZones(currentZones);

      if (
        candles.length > maxCandlesToRender ||
        currentZones.length > maxZonesToRender
      ) {
        console.warn(
          `Viewer limits applied: candles=${candles.length}/${maxCandlesToRender}, zones=${currentZones.length}/${maxZonesToRender}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(message);
    } finally {
      loadBtn.disabled = false;
      loadBtn.textContent = "Load";
    }
  }

  loadBtn.addEventListener("click", load);
  runInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void load();
    }
  });

  showZonesInput.addEventListener("change", () => {
    if (!currentRun) {
      return;
    }
    renderZoneOverlays(currentRun, currentZones);
  });

  if (runInput.value) {
    void load();
  }
})();
