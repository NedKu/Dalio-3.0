/**
 * Dalio Cycle Sentinel v2.0
 * DalioPrinciples — Principle Citation Database from 3 Books
 * ═══════════════════════════════════════════════════════════
 * Every investment recommendation traces back to a specific
 * principle from one of Dalio's three books.
 */

const DalioPrinciples = (() => {
  'use strict';

  // ─────────────────────────────────────────────────────
  //  BOOK 1: Big Debt Crises (《債務危機》)
  // ─────────────────────────────────────────────────────
  const BIG_DEBT = {
    DEBT_INCOME_DIVERGENCE: {
      id: 'BDC-001',
      book: '《債務危機》Big Debt Crises',
      chapter: '第一部分：原型大債務週期',
      principle: '當債務增速持續超過收入增速時，槓桿累積將不可持續。這是所有大債務危機的前兆。',
      principleEn: 'When debts rise relative to incomes faster than incomes rise, the leveraging is unsustainable.',
      trigger: 'debtGrowth > incomeGrowth',
      actionAdvice: '降低槓桿敞口，增加防禦性資產（公債、現金）',
    },
    RATE_EXCEEDS_GROWTH: {
      id: 'BDC-002',
      book: '《債務危機》Big Debt Crises',
      chapter: '第二部分：大債務週期的頂部',
      principle: '當利率（債務服務成本）超過名義GDP增長率時，債務人無法透過收入增長還債，泡沫頂部出現。',
      principleEn: 'When interest rates exceed the nominal growth rate, debtors cannot service debts from income growth—the top is near.',
      trigger: 'bond10Y > nominalGDP',
      actionAdvice: '大幅減少股票部位，增加黃金和長債',
    },
    YIELD_CURVE_INVERSION: {
      id: 'BDC-003',
      book: '《債務危機》Big Debt Crises',
      chapter: '第二部分：識別泡沫',
      principle: '殖利率曲線倒掛是經濟衰退的最可靠先行指標之一。短期利率高於長期利率意味著市場預期未來經濟放緩。',
      principleEn: 'Yield curve inversions are among the most reliable leading indicators of economic downturns.',
      trigger: 'spread10Y2Y < 0',
      actionAdvice: '轉向防禦配置，增加債券與現金權重',
    },
    BEAUTIFUL_DELEVERAGING: {
      id: 'BDC-004',
      book: '《債務危機》Big Debt Crises',
      chapter: '第一部分：和諧的去槓桿化',
      principle: '和諧的去槓桿需要四個工具的平衡運用：縮減支出、債務重組、財富轉移、貨幣印刷。名義增長必須超過名義利率。',
      principleEn: 'A beautiful deleveraging requires the right balance of austerity, debt restructuring, transfers, and money printing.',
      trigger: 'debtCycleStage === STAGE_5',
      actionAdvice: '溫和增加風險資產，配置通膨敏感資產',
    },
    INFLATIONARY_DEPRESSION: {
      id: 'BDC-005',
      book: '《債務危機》Big Debt Crises',
      chapter: '第一部分：通膨型蕭條',
      principle: '在通膨型蕭條中，央行面臨兩難——收緊貨幣政策會加深衰退，放鬆則加劇通膨。黃金和通膨保值資產是最佳避風港。',
      principleEn: 'In inflationary depressions, central banks face a dilemma—tightening deepens recession, loosening worsens inflation.',
      trigger: 'stage === DEPRESSION && inflation > 3%',
      actionAdvice: '大幅增加黃金(+10%)、TIPS(+8%)，減少股票(-12%)',
    },
    CREDIT_SPREAD_WARNING: {
      id: 'BDC-006',
      book: '《債務危機》Big Debt Crises',
      chapter: '第二部分：信用泡沫指標',
      principle: '信用利差擴大是市場對違約風險定價變化的直接反映。利差急速擴大通常先於經濟衰退。',
      principleEn: 'Widening credit spreads directly reflect market repricing of default risk.',
      trigger: 'creditSpread > 5.0',
      actionAdvice: '減少高收益債券敞口，增加投資級債券和現金',
    },
  };

  // ─────────────────────────────────────────────────────
  //  BOOK 2: Changing World Order (《變動中的世界秩序》)
  // ─────────────────────────────────────────────────────
  const WORLD_ORDER = {
    BIG_CYCLE_RISE: {
      id: 'CWO-001',
      book: '《變動中的世界秩序》Changing World Order',
      chapter: '第一章：大週期概述',
      principle: '帝國的崛起始於教育和創新的卓越，其次是經濟和軍事實力的增強，最終體現在儲備貨幣地位的獲得。',
      principleEn: 'Empire rises start with excellence in education & innovation, followed by economic & military strength, culminating in reserve currency status.',
      trigger: 'countryTrend === RISING',
      actionAdvice: '增加該國資產敞口，特別是科技和創新相關板塊',
    },
    BIG_CYCLE_DECLINE: {
      id: 'CWO-002',
      book: '《變動中的世界秩序》Changing World Order',
      chapter: '第二章：帝國興衰的決定因素',
      principle: '衰落始於過度支出和借貸、貧富差距擴大、內部衝突加劇。儲備貨幣地位的喪失是最後一個倒下的骨牌。',
      principleEn: 'Decline begins with overspending, growing wealth gaps, and internal conflicts. Loss of reserve currency status is the last domino.',
      trigger: 'countryTrend === DECLINING',
      actionAdvice: '減少該國資產敞口，分散至崛起國家',
    },
    RESERVE_CURRENCY_SHIFT: {
      id: 'CWO-003',
      book: '《變動中的世界秩序》Changing World Order',
      chapter: '第三章：貨幣與債務週期',
      principle: '當一個國家的債務以其自身貨幣計價且該貨幣是世界儲備貨幣時，它可以更長時間維持赤字——但代價是未來的通膨和貨幣貶值。',
      principleEn: 'A reserve currency country can sustain deficits longer—but at the cost of future inflation and currency devaluation.',
      trigger: 'reserveCurrencyShare declining',
      actionAdvice: '增加黃金和非本幣計價資產的配置',
    },
    INTERNAL_CONFLICT_RISE: {
      id: 'CWO-004',
      book: '《變動中的世界秩序》Changing World Order',
      chapter: '第五章：內部秩序與混亂的週期',
      principle: '當財富差距過大、價值觀分裂嚴重時，民主制度面臨壓力，可能轉向民粹主義或威權政治。',
      principleEn: 'Large wealth gaps and value conflicts stress democratic institutions, potentially leading to populism or authoritarianism.',
      trigger: 'internalConflictIndex > 7',
      actionAdvice: '增加該國以外的分散配置，降低國家集中風險',
    },
    EXTERNAL_CONFLICT_RISE: {
      id: 'CWO-005',
      book: '《變動中的世界秩序》Changing World Order',
      chapter: '第六章：外部秩序與混亂的週期',
      principle: '大國衝突通常發生在新興霸權挑戰現有霸權時（修昔底德陷阱），貿易戰常是軍事衝突的前奏。',
      principleEn: 'Great power conflicts arise when rising powers challenge existing ones (Thucydides Trap). Trade wars often precede military conflicts.',
      trigger: 'externalConflictIndex > 7',
      actionAdvice: '增加黃金、減少受地緣政治影響的股票',
    },
    EIGHTEEN_INDICATORS: {
      id: 'CWO-006',
      book: '《變動中的世界秩序》Changing World Order',
      chapter: '第二章：衡量帝國實力的18個指標',
      principle: '一個國家的相對實力可以用18個指標來衡量，其中教育和創新是領先指標，儲備貨幣和軍事是滯後指標。',
      principleEn: 'A country\'s relative power can be measured by 18 indicators. Education & innovation are leading; reserve currency & military are lagging.',
      trigger: 'always',
      actionAdvice: '根據國家實力趨勢調整區域配置',
    },
  };

  // ─────────────────────────────────────────────────────
  //  BOOK 3: How Countries Go Broke (《國家如何破產》)
  // ─────────────────────────────────────────────────────
  const GO_BROKE = {
    CURRENCY_DEBASEMENT: {
      id: 'HCB-001',
      book: '《國家如何破產》How Countries Go Broke',
      chapter: '第三章：貨幣貶值的機制',
      principle: '當國家無法削減支出或增加收入時，通常會選擇印鈔——這是一種對貨幣持有者的隱性稅收。M2增速遠超GDP增速是貨幣貶值的領先指標。',
      principleEn: 'When countries cannot cut spending or raise revenue, they print money—an implicit tax on currency holders.',
      trigger: 'M2Growth > GDPGrowth * 1.5',
      actionAdvice: '增加黃金和商品配置，減少該國貨幣計價的長期債券',
    },
    DEBT_SPIRAL: {
      id: 'HCB-002',
      book: '《國家如何破產》How Countries Go Broke',
      chapter: '第一章：大週期中的債務螺旋',
      principle: '當政府債務/GDP持續攀升且利息支出佔預算比例增加時，國家進入債務螺旋——借新還舊最終不可持續。',
      principleEn: 'When government debt/GDP rises continuously and interest expense consumes more of the budget, a debt spiral ensues.',
      trigger: 'debtGDP > 120 && trending up',
      actionAdvice: '減少該國國債持有，增加實物資產（黃金、不動產、商品）',
    },
    WEALTH_TRANSFER: {
      id: 'HCB-003',
      book: '《國家如何破產》How Countries Go Broke',
      chapter: '第五章：財富分配衝擊',
      principle: '通膨是最隱蔽的財富轉移方式——從儲蓄者轉向債務人，從固定收入者轉向資產持有者。',
      principleEn: 'Inflation is the most covert wealth transfer—from savers to debtors, from fixed-income earners to asset holders.',
      trigger: 'inflation > 5%',
      actionAdvice: '持有實物資產而非現金，增加TIPS和黃金',
    },
    TECH_DISRUPTION: {
      id: 'HCB-004',
      book: '《國家如何破產》How Countries Go Broke',
      chapter: '第七章：技術突破與財富重分配',
      principle: '技術突破既能創造巨大財富，也能造成大規模失業和社會動盪。歷史上，工業革命和數位革命都伴隨著劇烈的財富重分配。',
      principleEn: 'Technological breakthroughs create wealth but also cause unemployment and social upheaval.',
      trigger: 'techDisruptionIndex > threshold',
      actionAdvice: '配置科技創新領域，但分散於多個國家以避免集中風險',
    },
    NATURAL_DISASTER: {
      id: 'HCB-005',
      book: '《國家如何破產》How Countries Go Broke',
      chapter: '第八章：自然災害與黑天鵝',
      principle: '自然災害（疫情、氣候事件）可以加速大週期的轉折，特別是暴露已經過度槓桿的經濟體的脆弱性。',
      principleEn: 'Natural disasters can accelerate Big Cycle turning points, especially by exposing vulnerabilities in over-leveraged economies.',
      trigger: 'naturalDisasterEvent',
      actionAdvice: '增加黃金和現金儲備，降低整體風險敞口',
    },
    EXTERNAL_DEBT_RISK: {
      id: 'HCB-006',
      book: '《國家如何破產》How Countries Go Broke',
      chapter: '第四章：外債與主權違約',
      principle: '以外國貨幣計價的債務最為危險，因為債務國無法透過印鈔來還債。阿根廷、土耳其等國的歷史教訓反覆印證。',
      principleEn: 'Foreign-currency-denominated debt is most dangerous because the debtor country cannot print money to repay.',
      trigger: 'externalDebtRatio > 50%',
      actionAdvice: '避免持有高外債國家的貨幣和債券',
    },
  };

  // ═══════════════════════════════════════════════════
  //  LOOKUP FUNCTIONS
  // ═══════════════════════════════════════════════════

  const ALL_PRINCIPLES = { ...BIG_DEBT, ...WORLD_ORDER, ...GO_BROKE };

  /**
   * Get principle by ID (e.g., 'BDC-001')
   */
  function getById(id) {
    return Object.values(ALL_PRINCIPLES).find(p => p.id === id) || null;
  }

  /**
   * Get all principles triggered by a condition key
   */
  function getByTrigger(triggerKey) {
    return Object.values(ALL_PRINCIPLES).filter(p =>
      p.trigger.includes(triggerKey)
    );
  }

  /**
   * Get all principles from a specific book
   */
  function getByBook(bookKey) {
    const books = { BIG_DEBT, WORLD_ORDER, GO_BROKE };
    return books[bookKey] ? Object.values(books[bookKey]) : [];
  }

  /**
   * Format a principle citation for display
   */
  function formatCitation(principle) {
    if (!principle) return '';
    return `📖 ${principle.book}｜${principle.chapter}\n` +
           `「${principle.principle}」\n` +
           `💡 建議：${principle.actionAdvice}`;
  }

  /**
   * Get top-N relevant principles for the current market state
   */
  function getRelevantPrinciples(state) {
    const results = [];

    // Check debt cycle triggers
    if (state.bond10Y > state.nominalGDP) {
      results.push({ principle: BIG_DEBT.RATE_EXCEEDS_GROWTH, severity: 'HIGH' });
    }
    if (state.yieldCurveSpread < 0) {
      results.push({ principle: BIG_DEBT.YIELD_CURVE_INVERSION, severity: 'HIGH' });
    }
    if (state.creditSpread > 5.0) {
      results.push({ principle: BIG_DEBT.CREDIT_SPREAD_WARNING, severity: 'HIGH' });
    }
    if (state.debtCycleStage === 'STAGE_4_DEPRESSION' && state.inflation > 3) {
      results.push({ principle: BIG_DEBT.INFLATIONARY_DEPRESSION, severity: 'CRITICAL' });
    }
    if (state.debtCycleStage === 'STAGE_5_BEAUTIFUL') {
      results.push({ principle: BIG_DEBT.BEAUTIFUL_DELEVERAGING, severity: 'MEDIUM' });
    }

    // Check country power triggers
    if (state.internalConflictIndex > 7) {
      results.push({ principle: WORLD_ORDER.INTERNAL_CONFLICT_RISE, severity: 'HIGH' });
    }
    if (state.externalConflictIndex > 7) {
      results.push({ principle: WORLD_ORDER.EXTERNAL_CONFLICT_RISE, severity: 'HIGH' });
    }

    // Check currency triggers
    if (state.m2Growth > state.gdpGrowth * 1.5) {
      results.push({ principle: GO_BROKE.CURRENCY_DEBASEMENT, severity: 'MEDIUM' });
    }
    if (state.debtGDP > 120) {
      results.push({ principle: GO_BROKE.DEBT_SPIRAL, severity: 'HIGH' });
    }
    if (state.inflation > 5) {
      results.push({ principle: GO_BROKE.WEALTH_TRANSFER, severity: 'HIGH' });
    }

    // Sort by severity
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    results.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

    return results;
  }

  return Object.freeze({
    BIG_DEBT, WORLD_ORDER, GO_BROKE,
    ALL: ALL_PRINCIPLES,
    getById, getByTrigger, getByBook,
    formatCitation, getRelevantPrinciples,
  });
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DalioPrinciples;
}
