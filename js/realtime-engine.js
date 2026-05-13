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

  // Default constants (will be overridden by live Cleveland Fed data)
  const DEBT_CLOCK_BASE = 38981500000000; // ~$38.98 Trillion
  const DEBT_PER_SEC = 532.40;           // ~$532 USD per second
  const ESTIMATED_GDP = 28450000000000;   // Derived from 137% Debt-to-GDP ratio
  const CLEVELAND_FED_NOWCAST = 4.18;    // % YoY CPI as of May 13, 2026 (Inflation, year-over-year percent change)

  let startTime = Date.now();
  let liveClevelandFed = null;           // Live data from Cleveland Fed
  let liveDebtClock = null;              // Live data from US Debt Clock

  /**
   * Update with live Cleveland Fed data
   */
  function setClevelandFedData(data) {
    if (data && data.cpi !== null && data.cpi !== undefined) {
      liveClevelandFed = {
        cpi: data.cpi,
        coreCpi: data.coreCpi,
        pce: data.pce,
        corePce: data.corePce,
        sourceUrl: data.sourceUrl,
        updated: data.updated,
        month: data.month,
        timestamp: data.timestamp
      };
      console.log('[RealtimeEngine] Updated Cleveland Fed data:', liveClevelandFed);
    }
  }

  /**
   * Update with live US Debt Clock data
   */
  function setDebtClockData(data) {
    if (data && (data.debtAbsolute !== null || data.debtGDP !== null)) {
      liveDebtClock = {
        debtAbsolute: data.debtAbsolute,
        debtGDP: data.debtGDP,
        gdpAbsolute: data.gdpAbsolute,
        sourceUrl: data.sourceUrl,
        timestamp: new Date().toISOString()
      };
      console.log('[RealtimeEngine] Updated Debt Clock data:', liveDebtClock);
    }
  }

  /**
   * Calculate current metrics based on elapsed time.
   */
  function _getSimulatedMetrics() {
    const elapsedSec = (Date.now() - startTime) / 1000;
    
    // Use live debt clock if available, otherwise use simulated
    if (liveDebtClock && liveDebtClock.debtAbsolute !== null) {
      return {
        debtGDP: liveDebtClock.debtGDP,
        debtAbsolute: liveDebtClock.debtAbsolute
      };
    }

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
    
    // Use live Cleveland Fed CPI if available
    const inflationValue = liveClevelandFed && liveClevelandFed.cpi !== null 
      ? liveClevelandFed.cpi 
      : CLEVELAND_FED_NOWCAST;

    return {
      ...baseData,
      inflation: inflationValue,
      debtGDP: sim.debtGDP,
      _isRealtime: true,
      _sim: sim,
      _realtimeSources: {
        clevelandFed: liveClevelandFed,
        debtClock: liveDebtClock
      }
    };
  }

  /**
   * Resets the simulation start time (for sync).
   */
  function reset() {
    startTime = Date.now();
  }

  /**
   * Get current realtime data metadata for UI display
   */
  function getRealtimeMetadata() {
    return {
      clevelandFed: liveClevelandFed,
      debtClock: liveDebtClock
    };
  }

  return Object.freeze({
    getOverrideData,
    reset,
    setClevelandFedData,
    setDebtClockData,
    getRealtimeMetadata,
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
