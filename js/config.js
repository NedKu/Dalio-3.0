/**
 * Dalio Cycle Sentinel v2.0
 * Configuration — Constants, Thresholds, Countries, Principle Mappings
 * ════════════════════════════════════════════════════════════════════
 */

const SentinelConfig = (() => {
  'use strict';

  // ───── Countries ─────
  const COUNTRIES = {
    US: { name: '美國', nameEn: 'United States', flag: '🇺🇸', wbCode: 'USA', fredAvailable: true, currency: 'USD' },
    CN: { name: '中國', nameEn: 'China',         flag: '🇨🇳', wbCode: 'CHN', fredAvailable: false, currency: 'CNY' },
    EU: { name: '歐盟', nameEn: 'Eurozone',      flag: '🇪🇺', wbCode: 'DEU', fredAvailable: true,  currency: 'EUR' },
    JP: { name: '日本', nameEn: 'Japan',          flag: '🇯🇵', wbCode: 'JPN', fredAvailable: true,  currency: 'JPY' },
    UK: { name: '英國', nameEn: 'United Kingdom', flag: '🇬🇧', wbCode: 'GBR', fredAvailable: true,  currency: 'GBP' },
    IN: { name: '印度', nameEn: 'India',          flag: '🇮🇳', wbCode: 'IND', fredAvailable: false, currency: 'INR' },
    TW: { name: '台灣', nameEn: 'Taiwan',         flag: '🇹🇼', wbCode: 'TWN', fredAvailable: false, currency: 'TWD' },
  };

  // ───── FRED Series (US-focused, some international) ─────
  const FRED = {
    BASE_URL: 'https://api.stlouisfed.org/fred/series/observations',
    CSV_URL: 'https://fred.stlouisfed.org/graph/fredgraph.csv',
    SERIES: {
      // US Macro
      CPI:           'CPIAUCSL',
      CORE_PCE:      'PCEPILFE',
      GDP_GROWTH:    'A191RL1Q225SBEA',
      NOMINAL_GDP:   'GDP',
      DEBT_GDP:      'GFDEGDQ188S',
      FED_RATE:      'FEDFUNDS',
      SPREAD_10Y2Y:  'T10Y2Y',
      TREASURY_10Y:  'DGS10',
      UNEMPLOYMENT:  'UNRATE',
      M2:            'M2SL',
      CREDIT_SPREAD: 'BAMLH0A0HYM2',  // High Yield Spread
      // International Rates
      EU_RATE:       'ECBDFR',
      JP_RATE:       'IRSTCI01JPM156N',
      UK_RATE:       'IUDSOIA',
    },
    CACHE_TTL_MS: 24 * 60 * 60 * 1000,
  };

  // ───── World Bank API ─────
  const WORLD_BANK = {
    BASE_URL: 'https://api.worldbank.org/v2/country',
    INDICATORS: {
      GDP_PER_CAPITA:   'NY.GDP.PCAP.CD',
      GDP_PPP:          'NY.GDP.MKTP.PP.CD',
      EDUCATION_SPEND:  'SE.XPD.TOTL.GD.ZS',
      RD_SPEND:         'GB.XPD.RSDV.GD.ZS',
      MILITARY_SPEND:   'MS.MIL.XPND.GD.ZS',
      TRADE_BALANCE:    'NE.RSB.GNFS.ZS',
      MARKET_CAP:       'CM.MKT.LCAP.GD.ZS',
      DOMESTIC_CREDIT:  'FS.AST.DOMS.GD.ZS',
      LOGISTICS_INDEX:  'LP.LPI.OVRL.XQ',
      RULE_OF_LAW:      'RL.EST',
      ENERGY_INTENSITY: 'EG.USE.PCAP.KG.OE',
      NAT_RESOURCES:    'NY.GDP.TOTL.RT.ZS',
      WORKING_AGE_POP:  'SP.POP.1564.TO.ZS',
      GOVT_DEBT:        'GC.DOD.TOTL.GD.ZS',
      GINI:             'SI.POV.GINI',
      UNEMPLOYMENT:     'SL.UEM.TOTL.ZS',
      TOP10_INCOME:     'SI.DST.10TH.10',
    },
    FORMAT: 'json',
    PER_PAGE: 100,
  };

  // ───── GDELT ─────
  const GDELT = {
    API_URL: 'https://api.gdeltproject.org/api/v2/doc/doc',
    GEO_URL: 'https://api.gdeltproject.org/api/v2/geo/geo',
    MANUAL_URL: 'https://www.gdeltproject.org/',
    QUERY_TEMPLATE: '(conflict OR military OR war OR sanctions) AND ({country})',
    TIMESPAN: '3months',
  };

  // ───── Yahoo Finance ─────
  const YAHOO = {
    TICKERS: {
      SPY:    'SPY',
      IEI:    'IEI',
      TLT:    'TLT',
      GLD:    'GLD',
      DBC:    'DBC',
      TIP:    'TIP',
      VWRA:   'VWRA.L',
      TW0050: '0050.TW',
      // Currency pairs (vs USD)
      EURUSD: 'EURUSD=X',
      JPYUSD: 'JPY=X',
      GBPUSD: 'GBPUSD=X',
      CNYUSD: 'CNY=X',
      INRUSD: 'INR=X',
      TWDUSD: 'TWD=X',
      // Dollar Index
      DXY:    'DX-Y.NYB',
    },
    RANGE: '1y',
    INTERVAL: '1d',
  };

  // ───── Manual Data Reference Links ─────
  const MANUAL_LINKS = {
    RESERVE_CURRENCY: {
      label: '儲備貨幣佔比 (IMF COFER)',
      url: 'https://data.imf.org/regular.aspx?key=41175',
      updateFreq: 'Quarterly',
    },
    GDELT_CONFLICT: {
      label: '地緣政治衝突監測 (GDELT)',
      url: 'https://www.gdeltproject.org/',
      updateFreq: 'Real-time',
    },
    GINI_INDEX: {
      label: '基尼係數 (World Bank)',
      url: 'https://data.worldbank.org/indicator/SI.POV.GINI',
      updateFreq: 'Annual',
    },
    MILITARY_SPEND: {
      label: '軍事支出 (SIPRI)',
      url: 'https://www.sipri.org/databases/milex',
      updateFreq: 'Annual',
    },
    RULE_OF_LAW: {
      label: '法治指數 (World Justice Project)',
      url: 'https://worldjusticeproject.org/rule-of-law-index/',
      updateFreq: 'Annual',
    },
    EDUCATION: {
      label: '教育支出 (UNESCO)',
      url: 'https://data.uis.unesco.org/',
      updateFreq: 'Annual',
    },
    TRADE_DATA: {
      label: '貿易數據 (WTO)',
      url: 'https://stats.wto.org/',
      updateFreq: 'Annual',
    },
  };

  // ───── Debt Cycle: 6 Stages (Big Debt Crises) ─────
  const DEBT_CYCLE = {
    STAGES: {
      STAGE_1_EARLY: {
        id: 1, key: 'STAGE_1_EARLY',
        label: '早期復甦', labelEn: 'Early Recovery',
        emoji: '🌱', color: '#22c55e',
        desc: '債務水平低，信用開始擴張，利率低於GDP增長',
      },
      STAGE_2_BUBBLE: {
        id: 2, key: 'STAGE_2_BUBBLE',
        label: '泡沫形成', labelEn: 'Bubble',
        emoji: '🎈', color: '#3b82f6',
        desc: '資產價格快速上漲，債務增速超過收入增速',
      },
      STAGE_3_TOP: {
        id: 3, key: 'STAGE_3_TOP',
        label: '頂部', labelEn: 'The Top',
        emoji: '⛰️', color: '#f59e0b',
        desc: '利率上升，收益率超過名義GDP，信用利差擴大',
      },
      STAGE_4_DEPRESSION: {
        id: 4, key: 'STAGE_4_DEPRESSION',
        label: '蕭條', labelEn: 'Depression/Deleveraging',
        emoji: '📉', color: '#ef4444',
        desc: '資產下跌，失業上升，信用緊縮',
      },
      STAGE_5_BEAUTIFUL: {
        id: 5, key: 'STAGE_5_BEAUTIFUL',
        label: '和諧去槓桿', labelEn: 'Beautiful Deleveraging',
        emoji: '⚖️', color: '#8b5cf6',
        desc: '貨幣寬鬆+財政刺激，名義增長>利率，通膨溫和',
      },
      STAGE_6_NORMAL: {
        id: 6, key: 'STAGE_6_NORMAL',
        label: '正常化', labelEn: 'Normalization',
        emoji: '✅', color: '#06b6d4',
        desc: '債務比率回落，信用恢復正常，利率趨向中性',
      },
    },
    THRESHOLDS: {
      DEBT_GDP_HIGH:       120,   // % — late-cycle warning
      DEBT_GDP_LOW:        60,    // % — healthy level
      RATE_VS_GDP_MARGIN:  0.5,   // when 10Y > nomGDP + margin → top signal
      SPREAD_INVERSION:    0,     // yield curve inversion
      CREDIT_SPREAD_HIGH:  5.0,   // high yield spread % — stress signal
      CREDIT_SPREAD_LOW:   3.0,   // normal
      UNEMPLOYMENT_SPIKE:  2.0,   // % increase from trough → depression
      M2_GDP_DIVERGENCE:   1.5,   // M2 growth > 1.5× GDP growth → monetary expansion
      CPI_HIGH:            4.0,   // inflation concern
      CPI_LOW:             1.0,   // deflation concern
      GDP_NEGATIVE:        0,     // negative GDP → recession
    },
  };

  // ───── Country Power: 18 Indicators (Changing World Order) ─────
  const COUNTRY_POWER = {
    INDICATORS: [
      { key: 'education',        label: '教育品質',       weight: 0.06, source: 'worldbank', wbKey: 'EDUCATION_SPEND' },
      { key: 'innovation',       label: '科技/創新',      weight: 0.08, source: 'worldbank', wbKey: 'RD_SPEND' },
      { key: 'competitiveness',  label: '經濟競爭力',     weight: 0.07, source: 'worldbank', wbKey: 'GDP_PER_CAPITA' },
      { key: 'military',         label: '軍事力量',       weight: 0.05, source: 'worldbank', wbKey: 'MILITARY_SPEND' },
      { key: 'trade',            label: '貿易地位',       weight: 0.06, source: 'worldbank', wbKey: 'TRADE_BALANCE' },
      { key: 'output',           label: '經濟產出',       weight: 0.08, source: 'worldbank', wbKey: 'GDP_PPP' },
      { key: 'financial_center', label: '金融中心地位',   weight: 0.05, source: 'worldbank', wbKey: 'MARKET_CAP' },
      { key: 'reserve_currency', label: '儲備貨幣地位',   weight: 0.08, source: 'manual',    manualLink: 'RESERVE_CURRENCY' },
      { key: 'capital_market',   label: '資本市場深度',   weight: 0.05, source: 'worldbank', wbKey: 'DOMESTIC_CREDIT' },
      { key: 'infrastructure',   label: '基礎設施',       weight: 0.04, source: 'worldbank', wbKey: 'LOGISTICS_INDEX' },
      { key: 'governance',       label: '治理/法治',      weight: 0.06, source: 'worldbank', wbKey: 'RULE_OF_LAW' },
      { key: 'resource_eff',     label: '資源效率',       weight: 0.04, source: 'worldbank', wbKey: 'ENERGY_INTENSITY' },
      { key: 'natural_resource', label: '自然資源',       weight: 0.03, source: 'worldbank', wbKey: 'NAT_RESOURCES' },
      { key: 'geography',        label: '地理優勢',       weight: 0.03, source: 'manual',    manualLink: null },
      { key: 'workforce',        label: '人口/勞動力',    weight: 0.05, source: 'worldbank', wbKey: 'WORKING_AGE_POP' },
      { key: 'debt_burden',      label: '債務負擔',       weight: 0.06, source: 'worldbank', wbKey: 'GOVT_DEBT' },
      { key: 'internal_order',   label: '內部秩序',       weight: 0.05, source: 'worldbank', wbKey: 'GINI' },
      { key: 'external_order',   label: '外部秩序',       weight: 0.06, source: 'gdelt',     manualLink: 'GDELT_CONFLICT' },
    ],
    // Static manual scores (0–10), user can override in UI
    MANUAL_DEFAULTS: {
      reserve_currency: { US: 9.5, CN: 2.5, EU: 7.0, JP: 4.5, UK: 3.5, IN: 0.5, TW: 0.2 },
      geography:        { US: 9.0, CN: 7.5, EU: 7.0, JP: 5.0, UK: 6.0, IN: 7.0, TW: 4.0 },
    },
    // Normalization benchmarks for converting raw data to 0–10 scores
    SCORE_BENCHMARKS: {
      education:        { min: 2, max: 8 },       // % GDP
      innovation:       { min: 0.5, max: 4.0 },   // % GDP R&D
      competitiveness:  { min: 2000, max: 80000 }, // GDP per capita USD
      military:         { min: 0.5, max: 5.0 },   // % GDP
      trade:            { min: -10, max: 15 },     // % GDP trade balance
      output:           { min: 0.5e12, max: 30e12 },// GDP PPP total
      financial_center: { min: 20, max: 200 },     // market cap % GDP
      capital_market:   { min: 30, max: 200 },     // domestic credit % GDP
      infrastructure:   { min: 2.5, max: 4.5 },    // LPI score
      governance:       { min: -1.0, max: 2.0 },   // rule of law estimate
      resource_eff:     { min: 500, max: 8000, inverse: true }, // lower is better
      natural_resource: { min: 0, max: 15 },       // % GDP
      workforce:        { min: 55, max: 72 },      // % total pop
      debt_burden:      { min: 20, max: 250, inverse: true },  // lower is better
      internal_order:   { min: 25, max: 45, inverse: true },   // Gini, lower is better
    },
  };

  // ───── Conflict Monitor (How Countries Go Broke) ─────
  const CONFLICT = {
    INTERNAL: {
      GINI_WEIGHT:          0.40,
      TOP10_WEIGHT:         0.30,
      UNEMPLOYMENT_WEIGHT:  0.30,
      // Thresholds
      GINI_DANGER:      45,   // Above = high inequality
      GINI_SAFE:        30,   // Below = low inequality
      UNEMP_DANGER:     8,    // %
    },
    EXTERNAL: {
      GDELT_WEIGHT:   0.60,
      TRADE_WEIGHT:   0.40,
    },
    CURRENCY: {
      DEVALUE_THRESHOLD:  -10,  // % 12-month change = significant devaluation
      M2_GDP_THRESHOLD:   1.5,  // M2 growth > 1.5× GDP growth
    },
  };

  // ───── Portfolio: All Weather + Holy Grail (Synthesized from 3 books) ─────
  const PORTFOLIO = {
    ASSETS: {
      STOCKS:  { key: 'stocks',  label: '全球股票',     tickers: ['VWRA', 'SPY', 'TW0050'], color: '#3b82f6' },
      BONDS:   { key: 'bonds',   label: '長期公債',     tickers: ['IEI', 'TLT'],            color: '#22c55e' },
      GOLD:    { key: 'gold',    label: '黃金',         tickers: ['GLD'],                    color: '#d4a539' },
      COMMODITIES: { key: 'commodities', label: '商品', tickers: ['DBC'],                     color: '#f59e0b' },
      TIPS:    { key: 'tips',    label: '通膨保值債券', tickers: ['TIP'],                     color: '#8b5cf6' },
      CASH:    { key: 'cash',    label: '現金',         tickers: [],                          color: '#94a3b8' },
    },
    // All Weather base allocation
    ALL_WEATHER_BASE: {
      stocks: 0.30,
      bonds:  0.40,
      gold:   0.15,
      commodities: 0.075,
      tips:   0.075,
      cash:   0.00,
    },
    // Tilt rules per debt cycle stage
    STAGE_TILTS: {
      STAGE_1_EARLY:      { stocks: +0.10, bonds: -0.05, gold:  0.00, commodities: -0.03, tips: -0.02, cash:  0.00 },
      STAGE_2_BUBBLE:     { stocks: +0.05, bonds: -0.08, gold: +0.03, commodities: +0.02, tips: -0.02, cash:  0.00 },
      STAGE_3_TOP:        { stocks: -0.10, bonds: +0.03, gold: +0.05, commodities: -0.03, tips: +0.03, cash: +0.02 },
      STAGE_4_DEPRESSION: { stocks: -0.15, bonds: +0.05, gold: +0.08, commodities: -0.05, tips: +0.05, cash: +0.02 },
      STAGE_5_BEAUTIFUL:  { stocks: +0.05, bonds: +0.02, gold: +0.02, commodities: -0.04, tips: -0.03, cash: -0.02 },
      STAGE_6_NORMAL:     { stocks: +0.05, bonds:  0.00, gold: -0.03, commodities:  0.00, tips: -0.02, cash:  0.00 },
    },
    // Extra tilt for inflationary depression (AC3)
    INFLATIONARY_DEPRESSION_TILT: {
      stocks: -0.12, bonds: -0.10, gold: +0.10, commodities: +0.05, tips: +0.08, cash: -0.01,
    },
    CASH_FLOOR: 0.05,
    MAX_SINGLE_ASSET: 0.55,
  };

  // ───── UI Constants ─────
  const UI = {
    ANIMATION_DURATION: 800,
    CHART_COLORS: {
      stocks:      '#3b82f6',
      bonds:       '#22c55e',
      gold:        '#d4a539',
      commodities: '#f59e0b',
      tips:        '#8b5cf6',
      cash:        '#94a3b8',
    },
    RADAR_COLORS: {
      US: 'rgba(59,130,246,0.7)',
      CN: 'rgba(239,68,68,0.7)',
      EU: 'rgba(34,197,94,0.7)',
      JP: 'rgba(245,158,11,0.7)',
      UK: 'rgba(139,92,246,0.7)',
      IN: 'rgba(249,115,22,0.7)',
      TW: 'rgba(6,182,212,0.7)',
    },
  };

  return Object.freeze({
    COUNTRIES, FRED, WORLD_BANK, GDELT, YAHOO,
    MANUAL_LINKS, DEBT_CYCLE, COUNTRY_POWER, CONFLICT, PORTFOLIO, UI,
  });
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SentinelConfig;
}
