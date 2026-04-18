/**
 * Dalio Cycle Sentinel v3.0
 * RealtimeEngine — Nowcasting & Live Debt Simulator
 * ════════════════════════════════════════════════
 * This module provides extrapolated "live" data based on
 * Cleveland Fed Nowcasting and US Debt Clock trends.
 */

const RealtimeEngine = (() => {
  'use strict';
  console.log('RealtimeEngine: Initializing sentinel data override...');

  // Constants based on research as of April 18, 2026
  const DEBT_CLOCK_BASE = 38981500000000; // ~$38.98 Trillion
  const DEBT_PER_SEC = 532.40;           // ~$532 USD per second
  const ESTIMATED_GDP = 28450000000000;   // Derived from 137% Debt-to-GDP ratio
  const CLEVELAND_FED_NOWCAST = 3.58;    // % YoY CPI as of latest daily release

  let startTime = Date.now();

  /**
   * Calculate current metrics based on elapsed time.
   */
  function _getSimulatedMetrics() {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const currentDebt = DEBT_CLOCK_BASE + (elapsedSec * DEBT_PER_SEC);
    const currentDebtGDP = (currentDebt / ESTIMATED_GDP) * 100;

    return {
      debtGDP: currentDebtGDP,
      debtAbsolute: currentDebt
    };
  }

  /**
   * Returns override metrics for the Macro Engine.
   * Matches the structure of usMacroProcessed.
   */
  function getOverrideData(baseData) {
    if (!baseData) return null;

    const sim = _getSimulatedMetrics();

    return {
      ...baseData,
      inflation: CLEVELAND_FED_NOWCAST, // Override with Nowcast
      debtGDP: sim.debtGDP,             // Override with simulated counter
      _isRealtime: true,
      _sim: sim // Include raw sim for specialized UI elements
    };
  }

  /**
   * Resets the simulation start time (for sync).
   */
  function reset() {
    startTime = Date.now();
  }

  return Object.freeze({
    getOverrideData,
    reset,
    CONSTANTS: {
        CPI_NOWCAST: CLEVELAND_FED_NOWCAST,
        BASE_DEBT: DEBT_CLOCK_BASE,
        DEBT_PER_SEC
    }
  });

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RealtimeEngine;
}
