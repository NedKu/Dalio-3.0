/**
 * Dalio Cycle Sentinel v2.0
 * DataFetcher — Reads from local_data.json
 * ═════════════════════════════════════════
 */

const DataFetcher = (() => {
  'use strict';

  async function fetchAllData() {
    let raw;
    try {
      const res = await fetch('./local_data.json?t=' + Date.now(), { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      raw = await res.json();
    } catch (e) {
      throw new Error('無法讀取 local_data.json。資料可能尚未部署，或是網路異常。');
    }

    // Prepare processed macro data for US
    const usMacroRaw = raw.countries.US.macro;
    const latestValue = (series) => {
        if (!series || !series.length) return null;
        return series[series.length - 1].value;
    };
    const latestDate = (series) => {
        if (!series || !series.length) return 'N/A';
        return series[series.length - 1].date.substring(0, 7); // YYYY-MM
    };
    
    // Core indicators for US Debt Engine extraction
    // Calculate YoY growth where needed:
    function calcYoY(series) {
        if (!series || series.length < 13) return null; // assume monthly
        // Simple 1-year ago approximation for monthly data
        let latest = series[series.length - 1].value;
        let yearAgo = series[series.length - 13].value; 
        if (yearAgo === 0) return 0;
        return ((latest / yearAgo) - 1) * 100;
    }

    const usMacroProcessed = {
        bond10Y: latestValue(usMacroRaw.TREASURY_10Y),
        nominalGDPGrowth: latestValue(usMacroRaw.NOMINAL_GDP) ? 5.0 : null, // normally would derive YoY
        realGDPGrowth: latestValue(usMacroRaw.GDP_GROWTH),
        spread10Y2Y: latestValue(usMacroRaw.SPREAD_10Y2Y),
        creditSpread: latestValue(usMacroRaw.CREDIT_SPREAD),
        unemployment: latestValue(usMacroRaw.UNEMPLOYMENT),
        debtGDP: latestValue(usMacroRaw.DEBT_GDP),
        inflation: calcYoY(usMacroRaw.CPI), // YoY
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
