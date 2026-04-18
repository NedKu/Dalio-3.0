/**
 * Dalio Cycle Sentinel v2.0
 * Narrative Generator
 * ═════════════════════════
 */

const Narrative = (() => {
  'use strict';

  function generateBriefing(regime, powerInfo, portfolioInfo, principlesSys) {
    let title = `${regime.stageDetails.emoji} 當前週期：${regime.stageDetails.label}`;
    
    let parts = [];
    parts.push(regime.explanation);
    
    if (powerInfo) {
      parts.push(`國家綜合實力評分（US）：${powerInfo.totalScore}/100。\n可靠度：${powerInfo.reliabilityPct}%。`);
    }

    parts.push(`投資配置調整：\n` + portfolioInfo.auditLog.map(x => `- ${x}`).join('\n'));

    // Formatting relevant principles 
    let pList = principlesSys.getRelevantPrinciples({
        bond10Y: 4.5, nominalGDP: 5.0, // dummies for rendering
        yieldCurveSpread: -0.5,
        creditSpread: 3.5,
        debtCycleStage: regime.stageKey,
        inflation: regime.isInflationary ? 5.0 : 2.0,
        internalConflictIndex: 8.0, externalConflictIndex: 6.0,
        m2Growth: 8, gdpGrowth: 2,
        debtGDP: 130
    });

    let disclaimer = "⚠️ 免責聲明：本工具基於 Ray Dalio 三本著作之框架建構，僅供教育與研究參考，不構成投資建議。";

    return {
      title,
      body: parts.join('\n\n'),
      disclaimer,
      relevantPrinciples: pList
    };
  }

  return Object.freeze({
    generateBriefing
  });
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Narrative;
}
