/**
 * Dalio Cycle Sentinel v2.0
 * CountryPowerEngine — 18-Indicator National Strength Scoring
 * ═══════════════════════════════════════════════════════════
 * Calculates the overall strength of a country based on the 
 * Changing World Order framework.
 */

const CountryPowerEngine = (() => {
  'use strict';

  const CP = SentinelConfig.COUNTRY_POWER;

  /**
   * Calculate the 18-indicator power core.
   *
   * @param {string} countryCode - e.g., 'US', 'CN'
   * @param {object} countryData - Specifically data.countries[countryCode]
   * @param {object} manualOverrides - User UI tweaks dict
   * @returns {object} { totalScore, subScores, missingCount }
   */
  function calculatePowerScore(countryCode, countryData, manualOverrides = {}) {
    if (!countryData) return _defaultFallback();

    const worldbank = countryData.worldbank || {};
    const subScores = {};
    let totalWeightedScore = 0;
    let missingCount = 0;
    let totalWeightUsed = 0;

    // Helper: Safely get the latest value from a World Bank timeseries array
    const getLatest = (wbArray) => {
      if (!Array.isArray(wbArray) || wbArray.length === 0) return null;
      // Array is sorted chronologically in fetcher, so last is latest
      return wbArray[wbArray.length - 1].value;
    };

    // Calculate score for each 18 indicator
    CP.INDICATORS.forEach(ind => {
      let rawValue = null;
      let score0to10 = null;

      // 1. Source the raw data
      if (ind.source === 'worldbank') {
        rawValue = getLatest(worldbank[ind.wbKey]);
      } else if (ind.source === 'manual' || ind.source === 'gdelt') {
        rawValue = manualOverrides[ind.key] ?? CP.MANUAL_DEFAULTS[ind.key]?.[countryCode];
      }

      // 2. Normalize to 0-10 score
      if (rawValue != null) {
        if (ind.source === 'manual') {
          // Manual inputs are already scaled 0-10
          score0to10 = Math.max(0, Math.min(10, rawValue));
        } else {
          score0to10 = _normalizeValue(rawValue, ind.key);
        }
      }

      // 3. Aggregate
      if (score0to10 != null) {
        subScores[ind.key] = { value: score0to10, raw: rawValue };
        totalWeightedScore += score0to10 * ind.weight;
        totalWeightUsed += ind.weight;
      } else {
        subScores[ind.key] = { value: null, raw: null };
        missingCount++;
      }
    });

    // 4. Adjust the total score to be out of 100
    // If we missed some data, we extrapolate based on what we have
    let finalScore100 = 0;
    if (totalWeightUsed > 0) {
      finalScore100 = (totalWeightedScore / totalWeightUsed) * 10; 
      // Multiplied by 10 because our max sub-score is 10, so max weighted is 10.
      // E.g., if we hit 10 across the board, totalWeightedScore = 10 * 1.0 = 10.
      // So final is 10 * 10 = 100.
    }

    return {
      countryCode,
      totalScore: Math.round(finalScore100 * 10) / 10,
      subScores,
      missingCount,
      reliabilityPct: Math.round((totalWeightUsed / 1.0) * 100)
    };
  }

  /**
   * Normalizes a raw World Bank value to a 0-10 scale based on Config benchmarks.
   */
  function _normalizeValue(raw, indicatorKey) {
    const bench = CP.SCORE_BENCHMARKS[indicatorKey];
    if (!bench) return 5.0; // fallback to average if no benchmark

    let score = 0;
    
    if (bench.inverse) {
      // Lower is better (e.g., Debt)
      // Score = 10 * (max - raw) / (max - min)
      score = 10 * (bench.max - raw) / (bench.max - bench.min);
    } else {
      // Higher is better
      score = 10 * (raw - bench.min) / (bench.max - bench.min);
    }

    return Math.max(0, Math.min(10, score));
  }

  function _defaultFallback() {
    return {
      countryCode: 'UNKNOWN',
      totalScore: 0,
      subScores: {},
      missingCount: 18,
      reliabilityPct: 0
    };
  }

  return Object.freeze({
    calculatePowerScore
  });
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CountryPowerEngine;
}
