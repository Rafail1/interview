(function () {
  const apiInput = document.getElementById("apiBase");
  const runInput = document.getElementById("runId");
  const loadBtn = document.getElementById("loadBtn");
  const statsEl = document.getElementById("stats");
  const tradesEl = document.getElementById("trades");
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

  function toUnixSeconds(ms) {
    return Math.floor(Number(ms) / 1000);
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

  async function fetchRun(apiBase, runId) {
    const response = await fetch(`${apiBase}/backtesting/run/${runId}`);
    if (!response.ok) {
      throw new Error(`Run request failed: HTTP ${response.status}`);
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

    return records.map((row) => ({
      time: toUnixSeconds(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
    }));
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
      const candles = await fetchKlines(
        run.symbol,
        run.interval,
        Number(run.startTime),
        Number(run.endTime),
      );
      candlesSeries.setData(candles);
      setMarkers(run);
      chart.timeScale().fitContent();
      renderStats(run);
      renderTrades(run.trades || []);
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

  if (runInput.value) {
    void load();
  }
})();

