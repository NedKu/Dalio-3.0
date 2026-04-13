/**
 * Dalio Cycle Sentinel v2.0
 * MacroEngine — 4-Quadrant Bridgewater Framework
 * ═══════════════════════════════════════════════
 */

const MacroEngine = (() => {
  'use strict';

  // Constants / Thresholds
  const T = {
    GDP_HIGH: 2.5,
    GDP_LOW: 1.5,
    CPI_HIGH_GROWTH_INF_THRESHOLD: 4.5,
    CPI_LOW_GROWTH_INF_THRESHOLD: 3.5,
    CPI_GOLDILOCKS: 3.0,
    CPI_DEFLATION: 2.5
  };

  const QUADRANTS = {
    GOLDILOCKS: {
      key: 'GOLDILOCKS', label: '高增長 / 低通脹', desc: '金髮女孩經濟', color: '#22c55e',
      tilt: { stocks: +0.10, bonds: +0.05, gold: -0.05, commodities: -0.05, tips:  0.00, cash:  0.00 }
    },
    OVERHEATING: {
      key: 'OVERHEATING', label: '高增長 / 高通脹', desc: '經濟過熱', color: '#f59e0b',
      tilt: { stocks: -0.05, bonds: -0.10, gold: +0.05, commodities: +0.10, tips:  0.05, cash: -0.05 }
    },
    DEFLATIONARY_BUST: {
      key: 'DEFLATIONARY_BUST', label: '低增長 / 低通脹', desc: '通縮性衰退', color: '#3b82f6',
      tilt: { stocks: -0.15, bonds: +0.15, gold:  0.00, commodities: -0.05, tips: -0.05, cash: +0.10 }
    },
    STAGFLATION: {
      key: 'STAGFLATION', label: '低增長 / 高通脹', desc: '停滯性通膨', color: '#ef4444',
      tilt: { stocks: -0.15, bonds: -0.10, gold: +0.10, commodities: +0.05, tips: +0.10, cash: +0.05 }
    },
    NEUTRAL: {
      key: 'NEUTRAL', label: '過渡區間', desc: '宏觀動能中性', color: '#94a3b8',
      tilt: { stocks: 0, bonds: 0, gold: 0, commodities: 0, tips: 0, cash: 0 }
    }
  };

  function determineQuadrant(macroData, macroMeta = {}) {
    if (!macroData || macroData.realGDPGrowth == null || macroData.inflation == null) {
      return _fallback();
    }

    const gdp = macroData.realGDPGrowth;
    const cpi = macroData.inflation;
    let quad = QUADRANTS.NEUTRAL;
    let isDataLagging = false;

    // Simple heuristic for demo: If data is older than X (here we just assume it's up to date for now)
    // Actually, in fetch_data.py, FRED gets the latest. Let's assume data is fresh.

    // High Growth logic
    if (gdp >= T.GDP_HIGH) {
      if (cpi >= T.CPI_HIGH_GROWTH_INF_THRESHOLD) {
        quad = QUADRANTS.OVERHEATING;
      } else if (cpi <= T.CPI_GOLDILOCKS) {
        quad = QUADRANTS.GOLDILOCKS;
      } else {
        quad = QUADRANTS.OVERHEATING; // Bias upwards
      }
    } 
    // Low Growth logic
    else if (gdp <= T.GDP_LOW) {
      if (cpi >= T.CPI_LOW_GROWTH_INF_THRESHOLD) {
        quad = QUADRANTS.STAGFLATION;
      } else if (cpi <= T.CPI_DEFLATION) {
        quad = QUADRANTS.DEFLATIONARY_BUST;
      } else {
        quad = QUADRANTS.STAGFLATION; // Bias towards danger
      }
    } 
    // Muddling through (1.5 to 2.5 GDP)
    else {
      if (cpi >= 4.0) quad = QUADRANTS.STAGFLATION;
      else quad = QUADRANTS.NEUTRAL;
    }

    // Link helper
    function _link(id, date) {
      if (!date || date === 'N/A') return '確認最新';
      return `<a href="https://fred.stlouisfed.org/series/${id}" target="_blank" title="前往 FRED 查證">最新至 ${date}</a>`;
    }

    // Build evidence string
    let evidence = `GDP YoY: ${gdp.toFixed(1)}% (界線 ${T.GDP_LOW}~${T.GDP_HIGH}%, ${_link('A191RL1Q225SBEA', macroMeta.realGDPGrowth)}) | ` +
                   `CPI: ${cpi.toFixed(1)}% (${_link('CPIAUCSL', macroMeta.inflation)})`;
    let lagWarning = isDataLagging ? ' ⚠️ 數據滯後(採用均線估值)' : '';

    return {
      quadrantKey: quad.key,
      details: quad,
      evidence: evidence + lagWarning,
      tilt: quad.tilt
    };
  }

  function _fallback() {
    return {
      quadrantKey: 'NEUTRAL',
      details: QUADRANTS.NEUTRAL,
      evidence: '等待 FRED 指標更新...',
      tilt: QUADRANTS.NEUTRAL.tilt
    };
  }

  return Object.freeze({
    determineQuadrant,
    QUADRANTS
  });

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MacroEngine;
}
