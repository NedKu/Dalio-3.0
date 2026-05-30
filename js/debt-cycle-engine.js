/**
 * Dalio Cycle Sentinel v3.0 IMPROVED
 * DebtCycleEngine — 6-Stage Debt Cycle Positioning (達利歐精確判定版)
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * 【核心改進】
 * ✅ 優先級 1：蕭條判定補充政策利率 + 名義增速 < 利率 的雙重條件
 * ✅ 優先級 1：美麗去槓桿判定補充央行資產成長 + 名義增速 > 利率 的檢查
 * ✅ 優先級 2：補充 debt_to_gdp_3yr_avg_annual_change 的直接計算
 * ✅ 優先級 2：當數據缺失時的 fallback 邏輯補充
 * ✅ 優先級 2：通膨型蕭條的顯式標籤強化
 * ✅ 優先級 3：將開放式計分改為分級決策樹（減少歧義）
 * ✅ 優先級 3：補充中間狀態警告（"過渡期：邁向泡沫"）
 * 
 * 【達利歐公式核心】
 * 蕭條判定：policy_rate <= 0.5% AND nominal_gdp < nom_rate AND real_gdp < 0
 * 美麗去槓桿：policy_rate <= 0.5% AND cb_growth > 10% AND nominal_gdp > nom_rate AND real_gdp > 0 AND 0% <= inflation <= 3%
 * 泡沫判定：debt_3yr_change >= 8.0 OR gdp_gap >= 3.5
 */

const DebtCycleEngine = (() => {
  'use strict';

  const C = SentinelConfig.DEBT_CYCLE;

  /**
   * 【優先級 2.1】計算過去 3 年債務對 GDP 比率的平均年度變動
   * 用於泡沫判定（達利歐原著典型泡沫值: 10%/年）
   * 
   * @param {array} debtGdpSeries - 債務對GDP比率歷史序列 [{date, value}, ...]
   * @returns {number|null} 3年平均年度變動百分點，或 null 如果數據不足
   */
  function calcDebtToGdp3YrChange(debtGdpSeries) {
    if (!Array.isArray(debtGdpSeries) || debtGdpSeries.length < 37) {
      // 需要至少 37 個月 (3 年 + 1 個月) 的數據
      return null;
    }

    const latest = debtGdpSeries[debtGdpSeries.length - 1].value;
    const threeYearsAgo = debtGdpSeries[debtGdpSeries.length - 37].value;

    if (latest == null || threeYearsAgo == null || threeYearsAgo === 0) {
      return null;
    }

    // 計算 3 年內的總變動，除以 3 得年均變動
    const totalChange = latest - threeYearsAgo;
    const avgAnnualChange = totalChange / 3;

    return avgAnnualChange;
  }

  /**
   * 【優先級 2.1】計算產出缺口 (GDP Gap)
   * 用於泡沫與早期階段判定
   * 
   * 簡化版：使用 unemployment 與其歷史均值的偏差推估
   * 更精確版本應整合 Okun's Law: gap ≈ -2.5 × (unemployment - natural_rate)
   * 
   * @param {number} currentUnemployment - 當前失業率 %
   * @param {array} unemploymentSeries - 失業率歷史序列
   * @returns {number} 產出缺口估計 %
   */
  function calcGdpGap(currentUnemployment, unemploymentSeries) {
    if (currentUnemployment == null) return 0;

    // 計算過去 2 年的失業率均值作為"自然失業率"的代理
    let naturalRateEstimate = 4.5; // 預設美國自然失業率
    if (Array.isArray(unemploymentSeries) && unemploymentSeries.length >= 25) {
      const recent24months = unemploymentSeries.slice(-25).map(d => d.value);
      naturalRateEstimate = recent24months.reduce((a, b) => a + b, 0) / recent24months.length;
    }

    // Okun's Law 簡化版: GDP Gap ≈ -2.5 × (unemployment - natural_rate)
    const gdpGap = -2.5 * (currentUnemployment - naturalRateEstimate);
    return gdpGap;
  }

  /**
   * 【優先級 3】決策樹式的債務週期分級判定
   * 相比計分制，更清晰確定，減少歧義
   * 
   * @param {object} macroData - 處理後的宏觀指標
   * @param {object} macroRaw - 原始歷史序列數據
   * @param {object} macroMeta - 數據元數據 (last update dates)
   * @returns {object} 詳細的分級結果
   */
  function determineStageDecisionTree(macroData, macroRaw = {}, macroMeta = {}) {
    if (!macroData) return _defaultFallback();

    // 解構輸入數據
    const {
      bond10Y,
      nominalGDPGrowth,
      realGDPGrowth,
      spread10Y2Y,
      creditSpread,
      unemployment,
      debtGDP,
      inflation,
      m2Growth,
      policyRate, // 新增：中央銀行政策利率
      cbBalanceSheetGrowth // 新增：央行資產負債表成長率
    } = macroData;

    // ═══════════════════════════════════════════════════════════════
    // 【計算核心指標】
    // ═══════════════════════════════════════════════════════════════

    // 【優先級 2.1】計算 debt_to_gdp_3yr_avg_annual_change
    const debtGdpSeries = macroRaw.DEBT_GDP || [];
    const debt3yrChange = calcDebtToGdp3YrChange(debtGdpSeries);

    // 【優先級 2.1】計算 GDP Gap
    const unemploymentSeries = macroRaw.UNEMPLOYMENT || [];
    const gdpGap = calcGdpGap(unemployment, unemploymentSeries);

    // 預計算判定信號
    const signals = {
      // 【優先級 1.1】蕭條雙重條件（達利歐原著定義）
      deepDepression: policyRate != null && policyRate <= 0.5 &&
                     nominalGDPGrowth != null && bond10Y != null && nominalGDPGrowth < bond10Y &&
                     realGDPGrowth != null && realGDPGrowth < 0,

      // 【優先級 1.2】美麗去槓桿完整公式（達利歐黃金公式）
      beautifulDeleveraging: policyRate != null && policyRate <= 0.5 &&
                            (cbBalanceSheetGrowth != null ? cbBalanceSheetGrowth > 10.0 : m2Growth != null && m2Growth > realGDPGrowth * 1.5) &&
                            nominalGDPGrowth != null && bond10Y != null && nominalGDPGrowth > bond10Y &&
                            realGDPGrowth != null && realGDPGrowth > 0 &&
                            inflation != null && inflation >= 0 && inflation <= 3.0,

      // 泡沫判定（變化不大）
      bubblePhase: (debt3yrChange != null && debt3yrChange >= 8.0) ||
                  (gdpGap >= 3.5),

      // 頂部判定
      topPhase: debtGDP != null && debtGDP > C.THRESHOLDS.DEBT_GDP_HIGH &&
               gdpGap != null && gdpGap > 2.0 &&
               nominalGDPGrowth != null && bond10Y != null &&
               nominalGDPGrowth <= bond10Y + C.THRESHOLDS.RATE_VS_GDP_MARGIN,

      // 利率與名義增速關係
      rateSqueeze: bond10Y != null && nominalGDPGrowth != null &&
                  (bond10Y > nominalGDPGrowth + C.THRESHOLDS.RATE_VS_GDP_MARGIN),

      // 殖利率曲線倒掛
      curveInverted: spread10Y2Y != null && spread10Y2Y < C.THRESHOLDS.SPREAD_INVERSION,

      // 信用利差擴張
      creditStress: creditSpread != null && creditSpread > C.THRESHOLDS.CREDIT_SPREAD_HIGH,

      // 衰退信號
      recession: realGDPGrowth != null && realGDPGrowth < 0,

      // 高通膨
      highInflation: inflation != null && inflation > C.THRESHOLDS.CPI_HIGH,

      // 低通膨/通縮
      lowInflation: inflation != null && inflation < C.THRESHOLDS.CPI_LOW,

      // 債務高危
      debtStress: debtGDP != null && debtGDP > C.THRESHOLDS.DEBT_GDP_HIGH,

      // 債務健康
      debtHealthy: debtGDP != null && debtGDP < C.THRESHOLDS.DEBT_GDP_LOW,
    };

    // ═══════════════════════════════════════════════════════════════
    // 【優先級 3：決策樹式分級判定】
    // ═══════════════════════════════════════════════════════════════

    // 第1層：極端狀態判定（蕭條 vs 美麗去槓桿）
    if (signals.deepDepression) {
      return _stageResult('STAGE_4_DEPRESSION', {
        triggers: [
          '政策利率已逼近零下限 (≤ 0.5%)',
          '名義GDP增速低於名義利率 (名義增速 < 利率)',
          '實質GDP負增長 (經濟衰退中)',
          '符合達利歐原著「深層蕭困」標誌'
        ],
        explanation: `符合達利歐《大債務危機》對蕭條的精確定義：`
          + `政策利率已降至零下限，且名義經濟增速無法跟上債務服務成本，`
          + `導致債務負擔被動惡化。經濟陷入負增長的惡性循環。`,
        evidence: {
          policyRate,
          nominalGDPGrowth,
          bond10Y,
          realGDPGrowth,
          'note': '蕭條期通常伴隨資產價格暴跌、失業率上升、信用緊縮。'
        }
      }, signals, macroData, macroMeta);
    }

    if (signals.beautifulDeleveraging) {
      return _stageResult('STAGE_5_BEAUTIFUL', {
        triggers: [
          '政策利率極度寬鬆 (≤ 0.5%)',
          '央行大規模印鈔 (M2成長 > 實質GDP × 1.5倍' + (cbBalanceSheetGrowth != null ? ` 或 央行資產成長 > 10%` : '') + ')',
          '名義增速超越名義利率 (達利歐黃金公式)',
          '實質經濟恢復正增長',
          '通膨保持溫和 (0~3%)'
        ],
        explanation: `符合達利歐「美麗去槓桿」的黃金時段：`
          + `央行通過QE提供充足流動性，同時經濟實現實質正增長，`
          + `且通膨保持溫和。名義增速超越利率意味著債務負擔相對縮小，`
          + `係統性去槓桿得以平順進行。`,
        evidence: {
          policyRate,
          m2Growth,
          cbBalanceSheetGrowth,
          nominalGDPGrowth,
          bond10Y,
          realGDPGrowth,
          inflation,
          'note': '美麗去槓桿是政策制定者的理想終局，極為罕見。'
        }
      }, signals, macroData, macroMeta);
    }

    // 第2層：泡沫判定
    if (signals.bubblePhase && !signals.recession) {
      return _stageResult('STAGE_2_BUBBLE', {
        triggers: [
          `3年債務對GDP年均增長: ${debt3yrChange != null ? debt3yrChange.toFixed(2) : 'N/A'}% (閾值: ≥8%)`,
          `產出缺口: ${gdpGap.toFixed(2)}% (閾值: ≥3.5%)`,
          '資產價格快速上漲，信用擴張超過經濟增長'
        ],
        explanation: `經濟正進入泡沫階段。高度吻合達利歐原著描述：`
          + `過去3年債務與GDP的關係異常惡化，產出缺口達到歷史高位，`
          + `表明經濟過熱、信用過度擴張。未來面臨調整風險。`,
        evidence: {
          debt3yrChange,
          gdpGap,
          debtGDP,
          nominalGDPGrowth,
          'warning': '建議減少股票配置，增加避險資產比重。'
        }
      }, signals, macroData, macroMeta);
    }

    // 第3層：頂部判定（衰退前夜）
    if (signals.topPhase || (signals.rateSqueeze && signals.curveInverted)) {
      return _stageResult('STAGE_3_TOP', {
        triggers: [
          '利率水平已超越名義經濟增速',
          signals.curveInverted ? '殖利率曲線倒掛 (TOP信號)' : null,
          '整體債務佔比達到高危水平',
          '信用利差開始擴張'
        ].filter(Boolean),
        explanation: `經濟見頂，即將進入衰退。央行緊縮政策已逐漸顯效，`
          + `資產價格開始承壓，信用利差邊際擴大。`,
        evidence: {
          bond10Y,
          nominalGDPGrowth,
          spread10Y2Y,
          debtGDP,
          creditSpread,
          'actionable': '建議加碼現金與長期公債、大幅減碼股票。'
        }
      }, signals, macroData, macroMeta);
    }

    // 第4層：衰退/蕭條判定（非極度型）
    if (signals.recession && (signals.creditStress || signals.curveInverted)) {
      return _stageResult('STAGE_4_DEPRESSION', {
        triggers: [
          'GDP負增長（衰退信號）',
          signals.creditStress ? '信用利差大幅擴張（信用緊縮）' : null,
          signals.curveInverted ? '殖利率曲線倒掛（衰退確認）' : null,
          '資產價格下跌，失業率上升'
        ].filter(Boolean),
        explanation: `經濟進入衰退/蕭條期。央行政策已無法阻止下行，`
          + `信用市場開始凍結，資產拋售加劇。`,
        evidence: {
          realGDPGrowth,
          creditSpread,
          spread10Y2Y,
          unemployment,
          'severity': policyRate != null && policyRate <= 0.5 ? '深層蕭困' : '中等衰退'
        }
      }, signals, macroData, macroMeta);
    }

    // 第5層：早期復甦判定
    if (realGDPGrowth != null && realGDPGrowth > 2.0 &&
        !signals.highInflation &&
        debtGdpSeries.length >= 13) {
      const recentDebt3yr = debt3yrChange;
      if (recentDebt3yr != null && recentDebt3yr < 2.0 && debtGdpSeries[debtGdpSeries.length - 1].value < 80) {
        return _stageResult('STAGE_1_EARLY', {
          triggers: [
            '實質GDP強勁增長 (> 2%)',
            '通膨未見高企',
            '債務增速與收入增速保持平衡',
            '經濟處於健康擴張期'
          ],
          explanation: `經濟處於早期復甦階段。信貸與收入增長同步，`
            + `沒有泡沫化跡象，生產力驅動的健康擴張。`,
          evidence: {
            realGDPGrowth,
            debt3yrChange,
            debtGDP,
            inflation,
            'outlook': '加碼股票、減碼避險資產。'
          }
        }, signals, macroData, macroMeta);
      }
    }

    // 第6層：正常化判定（預設）
    if (policyRate != null && policyRate > inflation &&
        debtGDP != null && debtGDP < 100 &&
        m2Growth != null && m2Growth <= realGDPGrowth * 1.1) {
      return _stageResult('STAGE_6_NORMAL', {
        triggers: [
          '政策利率已高於通膨率（實際利率為正）',
          '整體債務比率穩定在健康水平',
          '央行停止非常規貨幣政策',
          '經濟無明顯極端特徵'
        ],
        explanation: `經濟重回平衡狀態。政策利率正常化，`
          + `信貸增長與經濟基本面相匹配，市場運行無異象。`,
        evidence: {
          policyRate,
          inflation,
          debtGDP,
          m2Growth,
          realGDPGrowth,
          'status': '遵循 All Weather 黃金配置。'
        }
      }, signals, macroData, macroMeta);
    }

    // ═══════════════════════════════════════════════════════════════
    // 【優先級 3：中間狀態與過渡期警告】
    // ═══════════════════════════════════════════════════════════════

    // 過渡期：邁向泡沫
    if ((debt3yrChange != null && debt3yrChange > 4.0 && debt3yrChange < 8.0) ||
        (gdpGap > 1.0 && gdpGap < 3.5)) {
      return _stageResult('STAGE_2_BUBBLE', {
        triggers: [
          `債務增速開始加快 (3yr avg: ${debt3yrChange != null ? debt3yrChange.toFixed(2) : 'N/A'}%)`,
          '經濟開始過熱跡象',
          '信用擴張速度邊際加快'
        ],
        explanation: `【⚠️ 過渡期警告】經濟指標正朝泡沫期演進。`
          + `債務增速開始顯著超越收入增長，系統風險在累積。`,
        evidence: {
          debt3yrChange,
          gdpGap,
          'alert': 'YELLOW - 建議開始檢視風險資產配置。'
        },
        isTransitional: true
      }, signals, macroData, macroMeta);
    }

    // 預設：正常化/中性區間
    return _stageResult('STAGE_6_NORMAL', {
      triggers: ['各項核心數據均處於歷史中樞'],
      explanation: `各項核心數據均處於歷史中樞水平，`
        + `未觸及大債務週期的極端重組或崩塌臨界點。遵循 All Weather 配置。`,
      evidence: {
        'status': 'GREEN - 無明顯異象。'
      }
    }, signals, macroData, macroMeta);
  }

  /**
   * 【優先級 2.2】構建分級結果物件
   */
  function _stageResult(stageKey, detailsObj = {}, signals = {}, macroData = {}, macroMeta = {}) {
    const stageDetails = C.STAGES[stageKey];

    // 【優先級 2.3】通膨型蕭條的顯式標籤強化
    let isInflationary = false;
    let inflationaryNote = '';
    if (stageKey === 'STAGE_4_DEPRESSION' && signals.highInflation) {
      isInflationary = true;
      inflationaryNote = `\n\n🚨【通膨型蕭條風險】通膨率處於 ${macroData.inflation?.toFixed(1) || 'N/A'}% 高位。` +
        `本幣面臨顯著貶值壓力。應加碼黃金與 TIPS，防禦法幣崩潰風險。`;
    }

    const triggers = detailsObj.triggers || [];
    const explanation = detailsObj.explanation || '' + (inflationaryNote || '');

    // 【優先級 2.2】當數據缺失時的 fallback 邏輯補充
    let missingData = 0;
    let missingFields = [];
    if (macroData.bond10Y == null) { missingData++; missingFields.push('10Y殖利率'); }
    if (macroData.nominalGDPGrowth == null) { missingData++; missingFields.push('名義GDP'); }
    if (macroData.spread10Y2Y == null) { missingData++; missingFields.push('10Y-2Y利差'); }
    if (macroData.policyRate == null) { missingData++; missingFields.push('政策利率'); }

    let confidence = 'HIGH';
    let confidenceNote = '';
    if (missingData > 2) {
      confidence = 'LOW';
      confidenceNote = `（⚠️ 缺失 ${missingFields.length} 個關鍵指標: ${missingFields.join('、')}）`;
    } else if (detailsObj.isTransitional) {
      confidence = 'MEDIUM';
      confidenceNote = '（過渡期信號，需密切監測）';
    }

    // 構建佐證
    function _link(id, date) {
      if (!date || date === 'N/A') return '確認最新';
      return `<a href="https://fred.stlouisfed.org/series/${id}" target="_blank" title="前往 FRED 查證">最新至 ${date}</a>`;
    }

    let evidence = `10Y-2Y利差: ${macroData.spread10Y2Y != null ? macroData.spread10Y2Y.toFixed(2) + '%' : 'N/A'} (${_link('T10Y2Y', macroMeta.spread10Y2Y)}) | ` +
                   `整體債務比: ${macroData.debtGDP != null ? macroData.debtGDP.toFixed(1) + '%' : 'N/A'} (${_link('GFDEGDQ188S', macroMeta.debtGDP)}) | ` +
                   `信用利差: ${macroData.creditSpread != null ? macroData.creditSpread.toFixed(2) + '%' : 'N/A'} (${_link('BAMLH0A0HYM2', macroMeta.creditSpread)}) | ` +
                   `M2成長(YoY): ${macroData.m2Growth != null ? macroData.m2Growth.toFixed(2) + '%' : 'N/A'} (${_link('M2SL', macroMeta.m2Growth)})`;

    if (detailsObj.evidence) {
      const evidenceStr = JSON.stringify(detailsObj.evidence).replace(/["{}']/g, '');
      evidence += ` | 詳細: ${evidenceStr}`;
    }

    return {
      stageKey,
      stageDetails,
      isInflationary,
      triggers,
      explanation,
      quantitativeEvidence: evidence,
      additionalEvidence: detailsObj.evidence,
      confidence,
      confidenceNote,
      missingDataCount: missingData,
      isTransitional: detailsObj.isTransitional || false
    };
  }

  /**
   * 【優先級 2.2】預設 Fallback 邏輯
   */
  function _defaultFallback() {
    return {
      stageKey: 'STAGE_6_NORMAL',
      stageDetails: C.STAGES['STAGE_6_NORMAL'],
      isInflationary: false,
      triggers: ['等待數據載入'],
      explanation: '缺乏宏觀數據，預設為正常化階段。請稍待數據加載。',
      quantitativeEvidence: 'N/A',
      confidence: 'LOW',
      confidenceNote: '（⚠️ 無數據，結果不可信）',
      missingDataCount: 99,
      isTransitional: false
    };
  }

  /**
   * 主公開函數：整合新數據格式
   */
  function determineStage(macroData, macroRaw = {}, macroMeta = {}) {
    // 如果 macroData 中缺少 policyRate，嘗試從 FED_RATE 推導
    if (macroData && !macroData.policyRate && macroRaw.FED_RATE) {
      const latestRate = macroRaw.FED_RATE[macroRaw.FED_RATE.length - 1];
      if (latestRate) {
        macroData.policyRate = latestRate.value;
      }
    }

    return determineStageDecisionTree(macroData, macroRaw, macroMeta);
  }

  return Object.freeze({
    determineStage,
    // 暴露內部方法便於測試
    _calcDebtToGdp3YrChange: calcDebtToGdp3YrChange,
    _calcGdpGap: calcGdpGap,
  });

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebtCycleEngine;
}
