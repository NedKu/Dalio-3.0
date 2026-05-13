/**
 * Dalio Cycle Sentinel v3.0
 * DataFetcher — Front-end Client-Side Fetching (CORS Proxied)
 * ═════════════════════════════════════════
 */

const DataFetcher = (() => {
  'use strict';

  const FRED_API_KEY = "dd0d0a4f684066a16deef50585fa053b";
  const CLEVELAND_FED_BASE = 'https://www.clevelandfed.org/-/media/files/webcharts/inflationnowcasting';
  const CLEVELAND_FED_QUARTER = 'nowcast_quarter.json';
  const US_DEBT_CLOCK_URL = 'https://www.usdebtclock.org/';
  const CORS_PROXY = 'https://corsproxy.io/?';
  const ALL_ORIGINS = 'https://api.allorigins.win/get?url=';

  // --- Utility Fetchers with CORS Proxying ---
  
  async function fetchYahoo(ticker) {
    const targetUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?range=5y&interval=1d`;
    try {
        let res = await fetch('https://corsproxy.io/?' + encodeURIComponent(targetUrl), { signal: AbortSignal.timeout(8000) });
        if(!res.ok) throw new Error('corsproxy failed');
        let data = await res.json();
        return parseYahooData(data);
    } catch(err) {
        try {
            let res2 = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, { signal: AbortSignal.timeout(8000) });
            let data2 = await res2.json();
            return parseYahooData(JSON.parse(data2.contents));
        } catch(e) {
            console.warn(`[Dalio3.0] Error fetching Yahoo ${ticker}:`, e);
            return { closes: [] };
        }
    }
  }

  function parseYahooData(jsonObj) {
      if(!jsonObj || !jsonObj.chart || !jsonObj.chart.result) return { closes: [] };
      let result = jsonObj.chart.result[0];
      let timestamps = result.timestamp || [];
      let closes = result.indicators.quote[0].close || [];
      let validData = [];
      for(let i=0; i<timestamps.length; i++) {
          if(closes[i] !== null && closes[i] !== undefined) {
              let d = new Date(timestamps[i] * 1000);
              validData.push({ date: d.toISOString().split('T')[0], value: closes[i] });
          }
      }
      return { closes: validData };
  }

  async function fetchTextWithProxy(url) {
      try {
          let res = await fetch(CORS_PROXY + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
          if (res.ok) return await res.text();
          throw new Error('CORS proxy failed for text fetch');
      } catch(err) {
          try {
              let res = await fetch(ALL_ORIGINS + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
              if (!res.ok) throw new Error('AllOrigins failed for text fetch');
              let payload = await res.json();
              if (payload && payload.contents != null) return payload.contents;
              throw new Error('AllOrigins returned invalid payload');
          } catch(e) {
              console.warn(`[Dalio3.0] Proxy text fetch failed for ${url}:`, e);
              throw e;
          }
      }
  }

  async function fetchJsonWithProxy(url) {
      try {
          let res = await fetch(CORS_PROXY + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
          if (res.ok) return await res.json();
          throw new Error('CORS proxy failed for JSON fetch');
      } catch(err) {
          try {
              let res = await fetch(ALL_ORIGINS + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
              if (!res.ok) throw new Error('AllOrigins failed for JSON fetch');
              let payload = await res.json();
              return JSON.parse(payload.contents);
          } catch(e) {
              console.warn(`[Dalio3.0] Proxy JSON fetch failed for ${url}:`, e);
              throw e;
          }
      }
  }

  function parseClevelandNowcastTable(html) {
      if (!html || typeof html !== 'string') return null;
      
      // CRITICAL: Extract YEAR-OVER-YEAR table ONLY (not month-over-month)
      // Look for caption mentioning "year-over-year" to ensure we get the right table
      const yoyTableMatch = html.match(/<table[^>]*>[\s\S]*?<caption>([^<]*year-over-year[^<]*)<\/caption>[\s\S]*?<\/table>/i);
      if (!yoyTableMatch) return null;
      
      const tableHtml = yoyTableMatch[0];
      
      // Extract the first row (most recent month) after headers
      const rowMatch = tableHtml.match(/<tr><td>([^<]+)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/);
      if (!rowMatch) return null;
      
      return {
          month: rowMatch[1].trim(),      // e.g., "May 2026"
          cpi: rowMatch[2].trim(),        // "4.18" (year-over-year YoY)
          coreCpi: rowMatch[3].trim(),    // "2.82"
          pce: rowMatch[4].trim(),        // PCE YoY
          corePce: rowMatch[5].trim(),    // Core PCE YoY
          updated: rowMatch[6].trim(),    // "05/13"
      };
  }

  function parseClevelandNowcast(jsonData) {
      if (!Array.isArray(jsonData)) return null;
      for (let item of jsonData) {
          if (!item || !Array.isArray(item.dataset)) continue;
          let series = item.dataset.find(s => s && typeof s.seriesname === 'string' && s.seriesname.toLowerCase().includes('cpi inflation'));
          if (!series || !Array.isArray(series.data)) continue;
          for (let i = series.data.length - 1; i >= 0; i--) {
              let value = series.data[i] && series.data[i].value;
              if (value !== '' && value != null && !Number.isNaN(parseFloat(value))) {
                  return parseFloat(value);
              }
          }
      }
      return null;
  }

  async function fetchClevelandNowcast() {
      const pageUrl = 'https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting';
      try {
          // First try to fetch the HTML page to get the latest table data
          let html = await fetchTextWithProxy(pageUrl);
          let tableData = parseClevelandNowcastTable(html);
          
          if (tableData) {
              return {
                  cpi: parseFloat(tableData.cpi) || null,
                  coreCpi: parseFloat(tableData.coreCpi) || null,
                  pce: parseFloat(tableData.pce) || null,
                  corePce: parseFloat(tableData.corePce) || null,
                  month: tableData.month,
                  updated: tableData.updated,
                  sourceUrl: pageUrl,
                  timestamp: new Date().toISOString()
              };
          }
          
          // Fallback 1: try the JSON endpoint
          try {
              const jsonUrl = `${CLEVELAND_FED_BASE}/${CLEVELAND_FED_QUARTER}`;
              let data = await fetchJsonWithProxy(jsonUrl);
              let value = parseClevelandNowcast(data);
              if (value !== null) {
                  return {
                      cpi: value,
                      sourceUrl: jsonUrl,
                      fallback: true,
                      timestamp: new Date().toISOString()
                  };
              }
          } catch(fallbackErr) {
              console.warn('[Dalio3.0] JSON endpoint also failed:', fallbackErr);
          }
          
          // Fallback 2: Return success with cpi=null to trigger default constant in RealtimeEngine
          console.warn('[Dalio3.0] Both Cleveland Fed methods failed, will use default CPI constant');
          return {
              cpi: null,
              coreCpi: null,
              pce: null,
              corePce: null,
              sourceUrl: pageUrl,
              error: 'Unable to parse Cleveland Fed data - using default',
              timestamp: new Date().toISOString()
          };
      } catch(err) {
          console.warn('[Dalio3.0] Error fetching Cleveland Fed nowcast:', err);
          return {
              cpi: null,
              coreCpi: null,
              pce: null,
              corePce: null,
              sourceUrl: pageUrl,
              error: err.message,
              timestamp: new Date().toISOString()
          };
      }
  }

  function safeEvaluateDebtExpression(raw) {
      if (!raw || typeof raw !== 'string') return null;
      const cleaned = raw.replace(/[^0-9.\*+\-\/()\s]/g, ' ');
      const tokens = cleaned.split(/\s+/).filter(Boolean);
      for (let start = 0; start < tokens.length; start++) {
          const expr = tokens.slice(start).join('');
          try {
              const value = eval(expr);
              if (typeof value === 'number' && Number.isFinite(value) && value > 1e8 && value < 1e11) {
                  return value;
              }
          } catch (e) {
              continue;
          }
      }
      return null;
  }

  function parseUSDebtClock(html) {
      if (!html || typeof html !== 'string') return null;

      function extractBlock(startToken, endToken) {
          const start = html.indexOf(startToken);
          if (start === -1) return null;
          const end = html.indexOf(endToken, start + startToken.length);
          return html.substring(start, end > start ? end : start + 400);
      }

      const debtBlock = extractBlock('var X1a890 =', "document.getElementById('X1a890')");
      const gdpBlock = extractBlock('var X1a942 =', "document.getElementById('X1a942')");
      if (!debtBlock || !gdpBlock) return null;

      const parseValue = (regexp, block) => {
          const match = block.match(regexp);
          return match ? parseFloat(match[1]) : null;
      };

      const debtBase = parseValue(/var X1a890 = ([0-9.]+);/, debtBlock);
      const debtRate = parseValue(/var R[0-9a-zA-Z]+ = ([0-9.]+);/, debtBlock);
      const debtOffset = safeEvaluateDebtExpression((debtBlock.match(/var Y[0-9a-zA-Z]+ = ([^;]+);/) || [])[1]);

      const gdpBase = parseValue(/var X1a942 = ([0-9.]+);/, gdpBlock);
      const gdpRate = parseValue(/var R[0-9a-zA-Z]+ = ([0-9.]+);/, gdpBlock);
      const gdpOffset = safeEvaluateDebtExpression((gdpBlock.match(/var Y[0-9a-zA-Z]+ = ([^;]+);/) || [])[1]);

      if (!debtBase || !debtRate || !debtOffset || !gdpBase || !gdpRate || !gdpOffset) {
          return null;
      }

      const nowSec = Date.now() / 1000;
      const debtAbsolute = debtBase + (nowSec - debtOffset) * debtRate;
      const gdpAbsolute = gdpBase + (nowSec - gdpOffset) * gdpRate;
      const debtGDP = gdpAbsolute > 0 ? (debtAbsolute / gdpAbsolute) * 100 : null;

      return {
          debtBase,
          debtRate,
          debtOffset,
          gdpBase,
          gdpRate,
          gdpOffset,
          debtAbsolute,
          gdpAbsolute,
          debtGDP,
          sourceUrl: US_DEBT_CLOCK_URL
      };
  }

  async function fetchUSDebtClock() {
      try {
          const html = await fetchTextWithProxy(US_DEBT_CLOCK_URL);
          const parsed = parseUSDebtClock(html);
          return parsed || { debtAbsolute: null, debtGDP: null, gdpAbsolute: null, sourceUrl: US_DEBT_CLOCK_URL, error: 'Parse failed' };
      } catch(err) {
          console.warn('[Dalio3.0] Error fetching US Debt Clock:', err);
          return { debtAbsolute: null, debtGDP: null, gdpAbsolute: null, sourceUrl: US_DEBT_CLOCK_URL, error: err.message };
      }
  }

  async function fetchRealtimeSources() {
      const [cleveland, debtClock] = await Promise.all([
          fetchClevelandNowcast(),
          fetchUSDebtClock()
      ]);
      return {
          clevelandNowcast: cleveland,
          usDebtClock: debtClock,
          lastUpdated: new Date().toISOString()
      };
  }

  async function fetchFred(seriesId) {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 20); // 20 years for debt cycle analysis
    
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${start.toISOString().split('T')[0]}&observation_end=${end.toISOString().split('T')[0]}`;
    
    try {
        // FRED API strictly blocks CORS unless specific origins are whitelisted. We MUST use proxy.
        let res = await fetch('https://corsproxy.io/?' + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
        if(!res.ok) throw new Error('corsproxy failed');
        let data = await res.json();
        return parseFred(data);
    } catch(e) {
        try {
            let res2 = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) });
            let data2 = await res2.json();
            return parseFred(JSON.parse(data2.contents));
        } catch(err) {
            console.warn(`[Dalio3.0] Error fetching FRED ${seriesId}:`, err);
            return [];
        }
    }
  }

  function parseFred(data) {
      if(!data || !data.observations) return [];
      let obs = [];
      for(let item of data.observations) {
          if(item.value !== '.' && item.value !== '') {
              obs.push({ date: item.date, value: parseFloat(item.value) });
          }
      }
      return obs;
  }

  async function fetchWB(indicator) {
      const url = `https://api.worldbank.org/v2/country/USA/indicator/${indicator}?format=json&per_page=100`;
      try {
          // WorldBank API natively supports CORS! No proxy needed.
          let res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          let data = await res.json();
          return parseWB(data);
      } catch(e) {
          console.warn(`[Dalio3.0] Error fetching WB ${indicator}:`, e);
          return [];
      }
  }

  function parseWB(data) {
      if(!data || data.length < 2 || !Array.isArray(data[1])) return [];
      let records = data[1].sort((a,b) => a.date.localeCompare(b.date)); // chronological
      let obs = [];
      for(let r of records) {
          if(r.value !== null) {
              obs.push({ date: r.date, value: parseFloat(r.value) });
          }
      }
      return obs;
  }

  // --- Main Data Orchestrator ---

  async function fetchAllData() {
    console.log("[Dalio3.0] Start fetching live data via browser...");

    // Setup Parallel Tasks
    const assets = ["SPY", "IEI", "TLT", "GLD", "DBC", "TIP", "VWRA.L", "0050.TW"];
    const fredSeries = {
        CPI: "CPIAUCSL", GDP_GROWTH: "A191RL1Q225SBEA", NOMINAL_GDP: "GDP",
        DEBT_GDP: "GFDEGDQ188S", FED_RATE: "FEDFUNDS", SPREAD_10Y2Y: "T10Y2Y",
        TREASURY_10Y: "DGS10", UNEMPLOYMENT: "UNRATE", M2: "M2SL", CREDIT_SPREAD: "BAMLH0A0HYM2"
    };
    const wbIndicators = {
        GDP_TOTAL: "NY.GDP.MKTP.CD", RD_SPEND: "GB.XPD.RSDV.GD.ZS", MILITARY_SPEND: "MS.MIL.XPND.GD.ZS",
        TRADE_BALANCE: "NE.RSB.GNFS.ZS", GINI: "SI.POV.GINI"
    };

    let raw = {
        last_updated: new Date().toISOString(),
        countries: {
            US: { macro: {}, market: {}, worldbank: {} }
            // For Dalio 3.0 MVP, we fetch US only, as other nations require heavy WB loading.
        },
        portfolio_assets: {},
        gdelt: { NOTE: "API integration deferred" }
    };

    // 1. Fetch Assets
    let assetPromises = assets.map(async tkr => {
        raw.portfolio_assets[tkr] = await fetchYahoo(tkr);
    });

    // 2. Fetch FRED Macro
    let fredPromises = Object.keys(fredSeries).map(async key => {
        raw.countries.US.macro[key] = await fetchFred(fredSeries[key]);
    });

    // 3. Fetch Currency DXY
    let fxPromise = fetchYahoo("DX-Y.NYB").then(d => {
        raw.countries.US.market.DXY = d;
    });

    // 4. Fetch World Bank
    let wbPromises = Object.keys(wbIndicators).map(async key => {
        raw.countries.US.worldbank[key] = await fetchWB(wbIndicators[key]);
    });

    // Master 15-second timeout — dashboard MUST render within this time
    // even when CORS proxies are blocked or the network is slow.
    const masterTimeout = new Promise(resolve => setTimeout(() => {
        console.warn("[Dalio3.0] Master fetch timeout (15s). Rendering with partial/fallback data.");
        resolve('timeout');
    }, 15000));

    await Promise.race([
        Promise.all([...assetPromises, ...fredPromises, fxPromise, ...wbPromises]),
        masterTimeout
    ]);

    console.log("[Dalio3.0] Data fetch phase complete (live or partial).");

    // --- Prepare Processed Metrics for the Internal Engine ---
    const usMacroRaw = raw.countries.US.macro;
    const latestValue = (series) => {
        if (!series || !series.length) return null;
        return series[series.length - 1].value;
    };
    const latestDate = (series) => {
        if (!series || !series.length) return 'N/A';
        return series[series.length - 1].date.substring(0, 7); // YYYY-MM
    };

    function calcYoY(series) {
        if (!series || series.length < 13) return null;
        let latest = series[series.length - 1].value;
        let yearAgo = series[series.length - 13].value;
        if (yearAgo === 0) return 0;
        return ((latest / yearAgo) - 1) * 100;
    }

    // --- Fallback Static Data (FRED public estimates circa Q1 2025) ---
    // Applied via ?? so live data always wins when available.
    const FALLBACK = {
        bond10Y:          4.28,
        nominalGDPGrowth: 27360.0,
        realGDPGrowth:    2.8,
        spread10Y2Y:      0.28,
        creditSpread:     3.10,
        unemployment:     4.1,
        debtGDP:          120.8,
        inflation:        3.0,
        m2Growth:         2.5,
    };

    const liveDebtGDP    = latestValue(usMacroRaw.DEBT_GDP);
    const liveBond10Y    = latestValue(usMacroRaw.TREASURY_10Y);
    const usingFallback  = liveBond10Y === null;

    const usMacroProcessed = {
        bond10Y:          liveBond10Y                           ?? FALLBACK.bond10Y,
        nominalGDPGrowth: latestValue(usMacroRaw.NOMINAL_GDP)  ?? FALLBACK.nominalGDPGrowth,
        realGDPGrowth:    latestValue(usMacroRaw.GDP_GROWTH)   ?? FALLBACK.realGDPGrowth,
        spread10Y2Y:      latestValue(usMacroRaw.SPREAD_10Y2Y) ?? FALLBACK.spread10Y2Y,
        creditSpread:     latestValue(usMacroRaw.CREDIT_SPREAD)?? FALLBACK.creditSpread,
        unemployment:     latestValue(usMacroRaw.UNEMPLOYMENT) ?? FALLBACK.unemployment,
        debtGDP:          liveDebtGDP                          ?? FALLBACK.debtGDP,
        inflation:        calcYoY(usMacroRaw.CPI)              ?? FALLBACK.inflation,
        m2Growth:         calcYoY(usMacroRaw.M2)               ?? FALLBACK.m2Growth,
        _usingFallback:   usingFallback,
    };

    const usMacroMeta = {
        bond10Y:          latestDate(usMacroRaw.TREASURY_10Y),
        nominalGDPGrowth: latestDate(usMacroRaw.NOMINAL_GDP),
        realGDPGrowth:    latestDate(usMacroRaw.GDP_GROWTH),
        spread10Y2Y:      latestDate(usMacroRaw.SPREAD_10Y2Y),
        creditSpread:     latestDate(usMacroRaw.CREDIT_SPREAD),
        unemployment:     latestDate(usMacroRaw.UNEMPLOYMENT),
        debtGDP:          latestDate(usMacroRaw.DEBT_GDP),
        inflation:        latestDate(usMacroRaw.CPI),
        m2Growth:         latestDate(usMacroRaw.M2),
    };

    return {
      raw,
      usMacroProcessed,
      usMacroMeta
    };
  }

  return Object.freeze({
    fetchAllData,
    fetchRealtimeSources
  });

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataFetcher;
}
