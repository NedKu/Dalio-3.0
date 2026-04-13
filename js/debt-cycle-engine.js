/**
 * Dalio Cycle Sentinel v2.0
 * DebtCycleEngine — 6-Stage Debt Cycle Positioning
 * ════════════════════════════════════════════════
 * Analyzes macro indicators to determine the current
 * stage of the Archetypal Debt Cycle.
 */

const DebtCycleEngine = (() => {
  'use strict';

  // Local alias for readability
  const C = SentinelConfig.DEBT_CYCLE;

  /**
   * Determine the current debt cycle stage for a country.
   *
   * @param {object} macroData - Processed macro indicators from DataFetcher
   * @param {object} prevStage - Optional: previous stage to penalize bouncing
   * @returns {object} { stage, confidence, triggers, explanation }
   */
  function determineStage(macroData, macroMeta = {}) {
    if (!macroData) return _defaultFallback();

    const {
      bond10Y, nominalGDPGrowth, realGDPGrowth,
      spread10Y2Y, creditSpread, unemployment,
      debtGDP, inflation, m2Growth
    } = macroData;

    // ── Pre-calculate signals ──
    const debtStress = debtGDP > C.THRESHOLDS.DEBT_GDP_HIGH;
    const rateSqueeze = bond10Y != null && nominalGDPGrowth != null && 
                       (bond10Y > nominalGDPGrowth + C.THRESHOLDS.RATE_VS_GDP_MARGIN);
    const curveInverted = spread10Y2Y != null && spread10Y2Y < C.THRESHOLDS.SPREAD_INVERSION;
    const creditStress = creditSpread != null && creditSpread > C.THRESHOLDS.CREDIT_SPREAD_HIGH;
    const recession = realGDPGrowth != null && realGDPGrowth < C.THRESHOLDS.GDP_NEGATIVE;
    const highInflation = inflation != null && inflation > C.THRESHOLDS.CPI_HIGH;

    // We use a scoring system to map current conditions to archetypal stages
    const scores = {
      STAGE_1_EARLY: 0,
      STAGE_2_BUBBLE: 0,
      STAGE_3_TOP: 0,
      STAGE_4_DEPRESSION: 0,
      STAGE_5_BEAUTIFUL: 0,
      STAGE_6_NORMAL: 0
    };

    const triggers = [];

    // ── Scoring Logic ──

    // 1. GDP & Growth Trends
    if (realGDPGrowth > 2.0 && !highInflation) {
      scores.STAGE_1_EARLY += 2;
      scores.STAGE_6_NORMAL += 1;
    } else if (recession) {
      scores.STAGE_4_DEPRESSION += 4;
      triggers.push('GDP呈負增長 (衰退特徵)');
    }

    // 2. Interest Rates vs Nominal Growth
    if (rateSqueeze) {
      scores.STAGE_3_TOP += 4;
      scores.STAGE_4_DEPRESSION += 1;
      triggers.push('長端利率超過名義GDP增長 (頂部特徵)');
    } else if (bond10Y < nominalGDPGrowth && !recession) {
      scores.STAGE_1_EARLY += 2;
      scores.STAGE_5_BEAUTIFUL += 1;
    }

    // 3. Yield Curve
    if (curveInverted) {
      scores.STAGE_3_TOP += 3;
      triggers.push('殖利率曲線倒掛 (頂部特徵)');
    } else if (spread10Y2Y > 1.5) {
      scores.STAGE_1_EARLY += 1;
      scores.STAGE_5_BEAUTIFUL += 1;
    }

    // 4. Credit / Risk Spreads
    if (creditStress) {
      scores.STAGE_4_DEPRESSION += 2;
      scores.STAGE_3_TOP += 1;
      triggers.push('信用利差大幅擴張 (信用緊縮)');
    }

    // 5. Debt Levels
    if (debtStress) {
      scores.STAGE_3_TOP += 1;
      scores.STAGE_4_DEPRESSION += 1;
      scores.STAGE_5_BEAUTIFUL += 1;
      triggers.push('整體債務佔比超過高危險閾值');
    } else if (debtGDP < C.THRESHOLDS.DEBT_GDP_LOW) {
      scores.STAGE_1_EARLY += 2;
      scores.STAGE_6_NORMAL += 2;
    }

    // 6. Inflation & M2 (Beautiful Deleveraging features)
    if (m2Growth > realGDPGrowth * C.THRESHOLDS.M2_GDP_DIVERGENCE && inflation > 0 && inflation < 4) {
      scores.STAGE_5_BEAUTIFUL += 3;
      triggers.push('貨幣寬鬆且通膨溫和 (和諧去槓桿特徵)');
    }

    // Determine the highest scoring stage
    let highestScore = -1;
    let currentStage = 'STAGE_6_NORMAL'; // Default fallback

    for (const [stage, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        currentStage = stage;
      }
    }

    // Construct Explanation & Evidence
    const stageDetails = C.STAGES[currentStage];
    let explanation = `根據輸入數據，當前處於 ${stageDetails.label}。`;
    if (triggers.length > 0) {
      explanation += `關鍵驅動因素：` + triggers.join('、') + `。`;
    } else {
      explanation += `各項指標處於歷史中性範圍，無明顯極端異常。`;
    }

    // Link helper
    function _link(id, date) {
      if (!date || date === 'N/A') return '確認最新';
      return `<a href="https://fred.stlouisfed.org/series/${id}" target="_blank" title="前往 FRED 查證">最新至 ${date}</a>`;
    }

    let evidence = `10Y-2Y利差: ${spread10Y2Y != null ? spread10Y2Y.toFixed(2) + '%' : 'N/A'} (${_link('T10Y2Y', macroMeta.spread10Y2Y)}) | ` +
                   `整體債務比: ${debtGDP != null ? debtGDP.toFixed(1) + '%' : 'N/A'} (${_link('GFDEGDQ188S', macroMeta.debtGDP)}) | ` +
                   `信用利差: ${creditSpread != null ? creditSpread.toFixed(2) + '%' : 'N/A'} (${_link('BAMLH0A0HYM2', macroMeta.creditSpread)})`;

    // Check for Inflationary vs Deflationary Depression variant
    let isInflationary = false;
    if (currentStage === 'STAGE_4_DEPRESSION' && highInflation) {
      isInflationary = true;
      explanation += ` 特別注意：通膨率處於高位，顯示為「通膨型蕭條 (Inflationary Depression)」，本幣面臨顯著貶值壓力。`;
    }

    // Confidence metric based on data availability
    let missingData = 0;
    if (bond10Y == null) missingData++;
    if (nominalGDPGrowth == null) missingData++;
    if (spread10Y2Y == null) missingData++;
    
    let confidence = 'HIGH';
    if (missingData > 2) confidence = 'LOW';
    else if (highestScore < 3) confidence = 'MEDIUM'; // Weak signals

    return {
      stageKey: currentStage,
      stageDetails,
      isInflationary,
      triggers,
      explanation,
      quantitativeEvidence: evidence,
      confidence,
      missingDataCount: missingData
    };
  }

  function _defaultFallback() {
    return {
      stageKey: 'STAGE_6_NORMAL',
      stageDetails: C.STAGES['STAGE_6_NORMAL'],
      isInflationary: false,
      triggers: ['等待數據載入'],
      explanation: '缺乏宏觀數據，預設為正常化階段。',
      quantitativeEvidence: 'N/A',
      confidence: 'LOW',
      missingDataCount: 99
    };
  }

  return Object.freeze({
    determineStage,
  });

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebtCycleEngine;
}
