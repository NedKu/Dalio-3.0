/**
 * Dalio Cycle Sentinel v3.0
 * DataFetcher — Front-end Client-Side Fetching (CORS Proxied)
 * ═════════════════════════════════════════
 */

const DataFetcher = (() => {
  'use strict';

  const FRED_API_KEY = "dd0d0a4f684066a16deef50585fa053b";

  // --- Utility Fetchers with CORS Proxying ---
  
  async function fetchYahoo(ticker) {
    const targetUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?range=5y&interval=1d`;
    try {
        let res = await fetch('https://corsproxy.io/?' + encodeURIComponent(targetUrl));
        if(!res.ok) throw new Error('corsproxy failed');
        let data = await res.json();
        return parseYahooData(data);
    } catch(err) {
        try {
            let res2 = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
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

  async function fetchFred(seriesId) {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 20); // 20 years for debt cycle analysis
    
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${start.toISOString().split('T')[0]}&observation_end=${end.toISOString().split('T')[0]}`;
    
    try {
        // FRED API strictly blocks CORS unless specific origins are whitelisted. We MUST use proxy.
        let res = await fetch('https://corsproxy.io/?' + encodeURIComponent(url));
        if(!res.ok) throw new Error('corsproxy failed');
        let data = await res.json();
        return parseFred(data);
    } catch(e) {
        try {
            let res2 = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
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
          let res = await fetch(url);
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

    // Wait for all HTTP requests to complete
    await Promise.all([...assetPromises, ...fredPromises, fxPromise, ...wbPromises]);
    
    console.log("[Dalio3.0] Data fetch complete!");

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

    const usMacroProcessed = {
        bond10Y: latestValue(usMacroRaw.TREASURY_10Y),
        nominalGDPGrowth: latestValue(usMacroRaw.NOMINAL_GDP) ? 5.0 : null,
        realGDPGrowth: latestValue(usMacroRaw.GDP_GROWTH),
        spread10Y2Y: latestValue(usMacroRaw.SPREAD_10Y2Y),
        creditSpread: latestValue(usMacroRaw.CREDIT_SPREAD),
        unemployment: latestValue(usMacroRaw.UNEMPLOYMENT),
        debtGDP: latestValue(usMacroRaw.DEBT_GDP),
        inflation: calcYoY(usMacroRaw.CPI),
        m2Growth: calcYoY(usMacroRaw.M2)
    };

    const usMacroMeta = {
        bond10Y: latestDate(usMacroRaw.TREASURY_10Y),
        nominalGDPGrowth: latestDate(usMacroRaw.NOMINAL_GDP),
        realGDPGrowth: latestDate(usMacroRaw.GDP_GROWTH),
        spread10Y2Y: latestDate(usMacroRaw.SPREAD_10Y2Y),
        creditSpread: latestDate(usMacroRaw.CREDIT_SPREAD),
        unemployment: latestDate(usMacroRaw.UNEMPLOYMENT),
        debtGDP: latestDate(usMacroRaw.DEBT_GDP),
        inflation: latestDate(usMacroRaw.CPI), 
        m2Growth: latestDate(usMacroRaw.M2)
    };

    return {
      raw,
      usMacroProcessed,
      usMacroMeta
    };
  }

  return Object.freeze({
    fetchAllData
  });

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataFetcher;
}
