/**
 * Dalio Cycle Sentinel v2.0
 * PortfolioEngine — All Weather + Holy Grail Auto-Tilting
 * ════════════════════════════════════════════════════════
 */

const PortfolioEngine = (() => {
  'use strict';

  const P = SentinelConfig.PORTFOLIO;

  /**
   * Determine optimal portfolio allocation based on macro condition.
   *
   * @param {object} macroInfo - Output from MacroEngine (4 quadrants)
   * @param {object} debtInfo - Output from DebtCycleEngine (6 stages)
   * @param {object} conflictInfo - Output from ConflictMonitor
   * @returns {object} { weights, triggers, principles }
   */
  function calculateAllocation(macroInfo, debtInfo, conflictInfo) {
    // 1. Start with All Weather Base
    let w = { ...P.ALL_WEATHER_BASE };
    let activePrinciples = [];
    let log = ['初始全天候基準配置 (All Weather Base)'];

    // 1.5. Apply 4-Quadrant Macro Tilt
    if (macroInfo && macroInfo.tilt) {
      const qTilt = macroInfo.tilt;
      w.stocks += qTilt.stocks;
      w.bonds += qTilt.bonds;
      w.gold += qTilt.gold;
      w.commodities += qTilt.commodities;
      w.tips += qTilt.tips;
      w.cash += qTilt.cash;
      log.push(`實施四象限宏觀偏移: ${macroInfo.details.label}`);
    }

    // 2. Apply Debt Cycle Tilt
    const stage = debtInfo.stageKey;
    if (P.STAGE_TILTS[stage]) {
      const tilt = P.STAGE_TILTS[stage];
      w.stocks += tilt.stocks;
      w.bonds += tilt.bonds;
      w.gold += tilt.gold;
      w.commodities += tilt.commodities;
      w.tips += tilt.tips;
      w.cash += tilt.cash;
      log.push(`實施債務週期偏移: ${stage}`);
    }

    // 3. Special Override: Inflationary Depression (AC3)
    if (debtInfo.isInflationary) {
      const ac3Tilt = P.INFLATIONARY_DEPRESSION_TILT;
      w.stocks += ac3Tilt.stocks;
      w.bonds += ac3Tilt.bonds;
      w.gold += ac3Tilt.gold;
      w.commodities += ac3Tilt.commodities;
      w.tips += ac3Tilt.tips;
      w.cash += ac3Tilt.cash;
      log.push(`觸發 AC3 條件：通膨型蕭條特殊傾斜 (黃金↑, TIPS↑, 股票↓)`);
      activePrinciples.push('BDC-005'); // INFLATIONARY_DEPRESSION
    }

    // 4. Special Override: Conflict Monitor
    if (conflictInfo.isInternalDanger || conflictInfo.isExternalDanger) {
      // Reduce equity risk, increase gold
      w.stocks -= 0.05;
      w.gold += 0.05;
      log.push(`衝突指數警示：降低 5% 股票，增加 5% 黃金避險`);
      if (conflictInfo.isInternalDanger) activePrinciples.push('CWO-004');
      if (conflictInfo.isExternalDanger) activePrinciples.push('CWO-005');
    }

    // 5. Ensure Cash Floor and Non-Negative
    if (w.cash < P.CASH_FLOOR) {
      let deficit = P.CASH_FLOOR - w.cash;
      w.cash = P.CASH_FLOOR;
      // take proportionally from others
      ['stocks', 'bonds', 'gold', 'commodities', 'tips'].forEach(k => {
          if (w[k] > 0) w[k] -= deficit * 0.2; 
      });
    }

    for (let k of Object.keys(w)) {
      w[k] = Math.max(0, w[k]);
    }

    // 6. Normalize to 1.0 (100%)
    const total = Object.values(w).reduce((sum, val) => sum + val, 0);
    for (let k of Object.keys(w)) w[k] = w[k] / total;

    // Convert to percentages for display
    let displayWeights = {};
    for (let k of Object.keys(w)) {
      displayWeights[k] = Math.round(w[k] * 1000) / 10;
    }

    return {
      weightsRaw: w,
      weightsPct: displayWeights,
      activePrinciples,
      auditLog: log
    };
  }

  return Object.freeze({
    calculateAllocation
  });

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PortfolioEngine;
}
