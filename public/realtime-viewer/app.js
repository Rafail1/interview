(function () {
  const apiInput = document.getElementById("apiBase");
  const intervalInput = document.getElementById("interval");
  const limitInput = document.getElementById("limit");
  const refreshSecInput = document.getElementById("refreshSec");
  const showMitigatedInput = document.getElementById("showMitigated");
  const refreshBtn = document.getElementById("refreshBtn");
  const trackedListEl = document.getElementById("trackedList");
  const selectedMetaEl = document.getElementById("selectedMeta");
  const chartHost = document.getElementById("chart");

  const savedApi = localStorage.getItem("rt_viewer_api");
  const savedShowMitigated = localStorage.getItem("rt_viewer_show_mitigated");
  apiInput.value = savedApi || window.location.origin;
  showMitigatedInput.checked = savedShowMitigated === "1";

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
  const zoneSeries = [];
  const maxZonesToRender = 120;

  let tracked = [];
  let currentZones = [];
  let selectedSymbol = null;
  let timer = null;
  let klineSocket = null;
  let klineReconnectTimer = null;
  let streamSymbol = null;
  let streamInterval = null;

  function toUnixSeconds(ms) {
    return Math.floor(Number(ms) / 1000);
  }

  function intervalToMs(interval) {
    const map = {
      "1m": 60_000,
      "5m": 300_000,
      "15m": 900_000,
      "1h": 3_600_000,
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

  function renderTrackedList() {
    if (!tracked.length) {
      trackedListEl.innerHTML = "<div class='meta'>No tracked symbols</div>";
      return;
    }

    trackedListEl.innerHTML = tracked
      .map((item) => {
        const active = item.symbol === selectedSymbol ? "active" : "";
        return `
          <button class="tracked-item ${active}" data-symbol="${escapeHtml(item.symbol)}" type="button">
            <span class="symbol">${escapeHtml(item.symbol)}</span>
            <span class="meta">active FVG: ${escapeHtml(item.activeFvgCount)}</span>
            <span class="meta">started: ${new Date(item.startedAt).toLocaleString()}</span>
          </button>
        `;
      })
      .join("");

    for (const button of trackedListEl.querySelectorAll(".tracked-item")) {
      button.addEventListener("click", () => {
        const symbol = button.getAttribute("data-symbol");
        if (!symbol || symbol === selectedSymbol) {
          return;
        }
        selectedSymbol = symbol;
        renderTrackedList();
        void (async () => {
          await refreshZones();
          await refreshChart();
        })();
      });
    }
  }

  async function fetchTracked(apiBase) {
    const response = await fetch(`${apiBase}/realtime-signals/tracked`);
    if (!response.ok) {
      throw new Error(`Tracked symbols request failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  async function fetchKlines(symbol, interval, limit) {
    const url = new URL("https://fapi.binance.com/fapi/v1/klines");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Binance klines failed: HTTP ${response.status}`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row) => ({
      time: toUnixSeconds(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
    }));
  }

  function clearKlineStream() {
    if (klineReconnectTimer) {
      clearTimeout(klineReconnectTimer);
      klineReconnectTimer = null;
    }
    if (klineSocket) {
      klineSocket.onopen = null;
      klineSocket.onmessage = null;
      klineSocket.onerror = null;
      klineSocket.onclose = null;
      klineSocket.close();
      klineSocket = null;
    }
    streamSymbol = null;
    streamInterval = null;
  }

  function scheduleKlineReconnect(symbol, interval) {
    if (klineReconnectTimer) {
      clearTimeout(klineReconnectTimer);
    }
    klineReconnectTimer = setTimeout(() => {
      if (selectedSymbol !== symbol || intervalInput.value !== interval) {
        return;
      }
      void ensureKlineStream(symbol, interval);
    }, 1500);
  }

  function handleKlineMessage(payload) {
    const data = payload && payload.data ? payload.data : payload;
    if (!data || !data.k) {
      return;
    }
    const k = data.k;
    const point = {
      time: toUnixSeconds(k.t),
      open: Number(k.o),
      high: Number(k.h),
      low: Number(k.l),
      close: Number(k.c),
    };
    candlesSeries.update(point);
    chart.timeScale().scrollToRealTime();
  }

  async function ensureKlineStream(symbol, interval) {
    if (!symbol) {
      return;
    }
    if (
      klineSocket &&
      streamSymbol === symbol &&
      streamInterval === interval &&
      klineSocket.readyState <= 1
    ) {
      return;
    }

    clearKlineStream();
    streamSymbol = symbol;
    streamInterval = interval;

    const limit = Math.max(100, Math.min(1500, Number(limitInput.value) || 500));
    const candles = await fetchKlines(symbol, interval, limit);
    candlesSeries.setData(candles);
    renderZoneOverlays();
    chart.timeScale().fitContent();
    chart.timeScale().scrollToRealTime();

    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    const wsUrl = `wss://fstream.binance.com/ws/${streamName}`;
    klineSocket = new WebSocket(wsUrl);

    klineSocket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleKlineMessage(payload);
      } catch (error) {
        console.error("Failed to parse kline message", error);
      }
    };

    klineSocket.onerror = () => {
      if (selectedSymbol === symbol && intervalInput.value === interval) {
        scheduleKlineReconnect(symbol, interval);
      }
    };

    klineSocket.onclose = () => {
      if (selectedSymbol === symbol && intervalInput.value === interval) {
        scheduleKlineReconnect(symbol, interval);
      }
    };
  }

  async function fetchFvgZones(apiBase, symbol) {
    const url = new URL(`${apiBase}/realtime-signals/fvg-zones`);
    if (symbol) {
      url.searchParams.set("symbol", symbol);
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Realtime zones request failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  function clearZoneOverlays() {
    while (zoneSeries.length > 0) {
      chart.removeSeries(zoneSeries.pop());
    }
  }

  function renderZoneOverlays() {
    clearZoneOverlays();
    if (!selectedSymbol || !Array.isArray(currentZones) || currentZones.length === 0) {
      return;
    }

    const visibleZones = showMitigatedInput.checked
      ? currentZones
      : currentZones.filter((zone) => !zone.mitigated);
    const interval = intervalInput.value;
    const limitedZones =
      visibleZones.length > maxZonesToRender
        ? visibleZones.slice(visibleZones.length - maxZonesToRender)
        : visibleZones;

    const nowSec = Math.floor(Date.now() / 1000);
    for (const zone of limitedZones) {
      const startSec = toBarOpenSeconds(zone.startTime, interval);
      const endSec = zone.endTime
        ? toBarOpenSeconds(zone.endTime, interval)
        : nowSec;
      const isBull = zone.direction === "bullish";
      const color = isBull ? "#188169" : "#c25634";

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

  function updateMeta() {
    if (!selectedSymbol) {
      selectedMetaEl.textContent = "No symbol selected";
      return;
    }

    const info = tracked.find((x) => x.symbol === selectedSymbol);
    if (!info) {
      selectedMetaEl.textContent = `${selectedSymbol} (not in tracked list)`;
      return;
    }

    const visibleCount = showMitigatedInput.checked
      ? currentZones.length
      : currentZones.filter((zone) => !zone.mitigated).length;
    selectedMetaEl.textContent = `${selectedSymbol} | active FVG: ${info.activeFvgCount} | zones shown: ${visibleCount} | interval: ${intervalInput.value}`;
  }

  async function refreshZones() {
    if (!selectedSymbol) {
      currentZones = [];
      return;
    }
    const apiBase = apiInput.value.trim().replace(/\/+$/, "");
    const zoneResponse = await fetchFvgZones(apiBase, selectedSymbol);
    currentZones = Array.isArray(zoneResponse.items) ? zoneResponse.items : [];
  }

  async function refreshTracked() {
    const apiBase = apiInput.value.trim().replace(/\/+$/, "");
    if (!apiBase) {
      throw new Error("API Base is required");
    }

    localStorage.setItem("rt_viewer_api", apiBase);
    const data = await fetchTracked(apiBase);
    tracked = Array.isArray(data.tracked) ? data.tracked : [];

    if (!selectedSymbol || !tracked.some((x) => x.symbol === selectedSymbol)) {
      selectedSymbol = tracked[0]?.symbol || null;
    }

    renderTrackedList();
    updateMeta();
  }

  async function refreshChart() {
    if (!selectedSymbol) {
      candlesSeries.setData([]);
      clearZoneOverlays();
      clearKlineStream();
      updateMeta();
      return;
    }

    const interval = intervalInput.value;
    await ensureKlineStream(selectedSymbol, interval);
    chart.timeScale().fitContent();
    chart.timeScale().scrollToRealTime();
    updateMeta();
  }

  async function refreshAll() {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Refreshing...";
    try {
      await refreshTracked();
      await refreshZones();
      await refreshChart();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(message);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = "Refresh Now";
    }
  }

  function restartTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    const seconds = Math.max(5, Math.min(120, Number(refreshSecInput.value) || 15));
    timer = setInterval(() => {
      void refreshAll();
    }, seconds * 1000);
  }

  refreshBtn.addEventListener("click", () => {
    void refreshAll();
  });

  intervalInput.addEventListener("change", () => {
    renderZoneOverlays();
    void refreshChart();
  });

  limitInput.addEventListener("change", () => {
    void refreshChart();
  });

  refreshSecInput.addEventListener("change", () => {
    restartTimer();
  });

  showMitigatedInput.addEventListener("change", () => {
    localStorage.setItem(
      "rt_viewer_show_mitigated",
      showMitigatedInput.checked ? "1" : "0",
    );
    renderZoneOverlays();
    updateMeta();
  });

  apiInput.addEventListener("change", () => {
    void refreshAll();
  });

  window.addEventListener("beforeunload", () => {
    clearKlineStream();
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  });

  restartTimer();
  void refreshAll();
})();
