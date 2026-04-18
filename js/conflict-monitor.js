/**
 * Dalio Cycle Sentinel v2.0
 * ConflictMonitor — Internal/External Conflict Indices
 * ════════════════════════════════════════════════════
 */

const ConflictMonitor = (() => {
  'use strict';

  const C = SentinelConfig.CONFLICT;

  /**
   * Monitor conflict parameters for a country.
   */
  function evaluate(countryCode, countryData, manualOverrides = {}) {
    if (!countryData) return _defaultFallback();

    const worldbank = countryData.worldbank || {};
    const macro = countryData.macro || {};

    // Helper
    const getLatest = (wbArray) => {
      if (!Array.isArray(wbArray) || wbArray.length === 0) return null;
      return wbArray[wbArray.length - 1].value;
    };

    // ── 1. Internal Conflict Index (0-10) ──
    const gini = getLatest(worldbank.GINI) || 35; // Default to moderate if null
    const unemployment = macro.UNEMPLOYMENT ? macro.UNEMPLOYMENT[macro.UNEMPLOYMENT.length-1]?.value : 5.0;
    
    // Scale GINI (min 25, max 50) => 0-10
    let giniScore = ((gini - 25) / 25) * 10;
    giniScore = Math.max(0, Math.min(10, giniScore));

    // Scale Unemployment (min 3, max 12) => 0-10
    let unempScore = ((unemployment - 3) / 9) * 10;
    unempScore = Math.max(0, Math.min(10, unempScore));

    // Blended ICI
    let ici = (giniScore * 0.6) + (unempScore * 0.4);
    
    // ── 2. External Conflict Index (0-10) ──
    // Relying on manual overrides or defaults for now, as GDELT is complex
    let eciValue = manualOverrides.gdeltScore ?? SentinelConfig.COUNTRY_POWER.MANUAL_DEFAULTS.external_order?.[countryCode] ?? 5.0;
    
    // ECI is essentially the external_order manually inputted, just raw.
    let eci = eciValue;

    // ── 3. Currency Devaluation Risk ──
    let devaluationRisk = 'LOW';
    let devTriggers = [];

    // Rule: M2 growing much faster than GDP
    if (macro.M2 && macro.NOMINAL_GDP) {
        // Need to calculate YoY growth for M2 and nominal GDP
        // Simplified fallback for demo:
        let m2G = 6.0; // dummy
        let gdpG = 3.0; // dummy
        if (m2G > gdpG * C.CURRENCY.M2_GDP_THRESHOLD) {
            devaluationRisk = 'HIGH';
            devTriggers.push(`M2增長顯著快於經濟增長 (印鈔稀釋)`);
        }
    }

    return {
      countryCode,
      ici: Math.round(ici * 10) / 10,
      eci: Math.round(eci * 10) / 10,
      giniUsed: gini,
      devaluationRisk,
      devTriggers,
      isInternalDanger: ici > 7.0,
      isExternalDanger: eci > 7.0
    };
  }

  function _defaultFallback() {
    return {
      ici: 0, eci: 0, 
      giniUsed: null,
      devaluationRisk: 'UNKNOWN',
      devTriggers: [],
      isInternalDanger: false,
      isExternalDanger: false
    };
  }

  return Object.freeze({
    evaluate
  });
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConflictMonitor;
}
