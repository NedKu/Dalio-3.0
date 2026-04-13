/**
 * Dalio Cycle Sentinel v2.0
 * App Main Controller
 * ═════════════════════════════
 */

const App = (() => {
  'use strict';

  let state = {
    currentCountryCode: 'US',
    rawLocalData: null,
    usMacroProc: null, // used as reference for cycle engine currently
    charts: {
      powerRadar: null,
      portfolioDoughnut: null
    }
  };

  async function init() {
    _bindEvents();
    await _loadData();
  }

  function _bindEvents() {
    const select = document.getElementById('country-select');
    if(select) {
      select.addEventListener('change', (e) => {
        state.currentCountryCode = e.target.value;
        _render();
      });
    }

    const refreshBtn = document.getElementById('btn-refresh');
    if(refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await _loadData();
      });
    }

    document.getElementById('gdelt-link').href = SentinelConfig.GDELT.MANUAL_URL;
    const rcLink = document.getElementById('reserve-currency-link');
    if(rcLink) rcLink.href = SentinelConfig.MANUAL_LINKS.RESERVE_CURRENCY.url;

    // --- Modal Events ---
    const btnDocs = document.getElementById('btn-docs');
    const modal = document.getElementById('docs-modal');
    const btnClose = document.getElementById('btn-close-modal');
    
    if (btnDocs && modal && btnClose) {
      btnDocs.addEventListener('click', () => modal.classList.add('active'));
      btnClose.addEventListener('click', () => modal.classList.remove('active'));
      modal.addEventListener('click', (e) => {
        if(e.target === modal) modal.classList.remove('active');
      });
    }

    const tabs = document.querySelectorAll('.modal-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.doc-panel').forEach(p => p.classList.remove('active'));
        
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.target).classList.add('active');
      });
    });

    // --- Simulator Events ---
    document.querySelectorAll('.simulator-input').forEach(input => {
      input.addEventListener('input', (e) => {
        if(!state.usMacroProc) return;
        const key = e.target.id.replace('sim-', '');
        const val = parseFloat(e.target.value);
        if(!isNaN(val)) {
          state.usMacroProc[key] = val;
          _render(); // Re-render instantly
        }
      });
    });
  }

  async function _loadData() {
    _setLoading(true);
    _setStatus('fetching', 'Loading local_data.json...');
    
    try {
      const data = await DataFetcher.fetchAllData();
      state.rawLocalData = data.raw;
      state.usMacroProc = data.usMacroProcessed;
      state.usMacroMeta = data.usMacroMeta;
      
      _populateSimulator(); // Fill auto-fetched data into input fields
      
      _setStatus('live', `Data Fresh: ${new Date().toLocaleTimeString()}`);
      _render();
    } catch(err) {
      console.error(err);
      _setStatus('error', err.message);
    } finally {
      setTimeout(() => _setLoading(false), 500); // 500ms min display for UX
    }
  }

  function _render() {
    if(!state.rawLocalData) return;

    const countryCode = state.currentCountryCode;
    const countryData = state.rawLocalData.countries[countryCode];
    
    // Defaulting cycle engine to US Macro for all currently if country lacks full FRED
    // In a real expanded app, we'd process each country's macro.
    const quadrantInfo = MacroEngine.determineQuadrant(state.usMacroProc, state.usMacroMeta);
    const cycleInfo = DebtCycleEngine.determineStage(state.usMacroProc, state.usMacroMeta);
    const powerInfo = CountryPowerEngine.calculatePowerScore(countryCode, countryData, {});
    const conflictInfo = ConflictMonitor.evaluate(countryCode, countryData, {});
    const portfolioInfo = PortfolioEngine.calculateAllocation(quadrantInfo, cycleInfo, conflictInfo);
    
    const narrativeData = Narrative.generateBriefing(cycleInfo, powerInfo, portfolioInfo, DalioPrinciples);

    _renderQuadrant(quadrantInfo);
    _renderDebtCycle(cycleInfo);
    _renderPowerRadar(powerInfo, countryCode);
    _renderConflict(conflictInfo);
    _renderPortfolio(portfolioInfo);
    _renderPrinciples(narrativeData.relevantPrinciples);
  }

  // ── Render Helpers ──

  function _populateSimulator() {
    if(!state.usMacroProc) return;
    for(const key of Object.keys(state.usMacroProc)) {
      const input = document.getElementById(`sim-${key}`);
      if(input && state.usMacroProc[key] != null) {
        // format to 1 or 2 decimals
        input.value = Number(state.usMacroProc[key]).toFixed(key.toLowerCase().includes('spread') || key.toLowerCase().includes('10y') ? 2 : 1);
      }
    }
  }

  function _renderQuadrant(info) {
    document.querySelectorAll('.quad-box').forEach(box => box.classList.remove('active'));
    const activeBox = document.getElementById(`quad-${info.quadrantKey}`);
    if(activeBox) activeBox.classList.add('active');
    
    const evBox = document.getElementById('quad-evidence');
    if(evBox) evBox.innerHTML = `佐證數據: ${info.evidence}`;
  }

  function _renderDebtCycle(info) {
    const container = document.getElementById('cycle-nodes-container');
    const stages = SentinelConfig.DEBT_CYCLE.STAGES;
    
    let html = '';
    for(let k of Object.keys(stages)) {
      let stg = stages[k];
      let isActive = (info.stageKey === k) ? 'active' : '';
      let colorStyle = isActive ? `style="--active-color:${stg.color}"` : '';
      
      html += `
        <div class="cycle-node ${isActive}" ${colorStyle}>
          <div class="cycle-node__point">${stg.emoji}</div>
          <div class="cycle-node__label">${stg.label}</div>
        </div>
      `;
    }
    container.innerHTML = html;

    document.getElementById('cycle-title').textContent = `${info.stageDetails.label} (${info.stageDetails.labelEn})`;
    document.getElementById('cycle-desc').textContent = info.explanation;

    const evBox = document.getElementById('cycle-evidence');
    if(evBox) {
      evBox.innerHTML = `佐證數據: ${info.quantitativeEvidence}`;
    }
  }

  function _renderPowerRadar(powerInfo, countryCode) {
    document.getElementById('power-score-badge').textContent = `${powerInfo.totalScore}/100`;

    const ctx = document.getElementById('power-radar-chart');
    if(!ctx) return;

    // Grouping into categories for simpler radar
    const keys = ['education', 'innovation', 'competitiveness', 'military', 'trade', 'output', 'reserve_currency', 'debt_burden'];
    const labels = keys.map(k => SentinelConfig.COUNTRY_POWER.INDICATORS.find(i=>i.key===k).label);
    
    const dataVals = keys.map(k => powerInfo.subScores[k]?.value || 0);

    const color = SentinelConfig.UI.RADAR_COLORS[countryCode] || 'rgba(59,130,246,0.7)';

    if(state.charts.powerRadar) {
      state.charts.powerRadar.data.datasets[0].data = dataVals;
      state.charts.powerRadar.data.datasets[0].backgroundColor = color.replace('0.7','0.2');
      state.charts.powerRadar.data.datasets[0].borderColor = color;
      state.charts.powerRadar.update();
    } else {
      Chart.defaults.color = 'rgba(255,255,255,0.7)';
      Chart.defaults.font.family = 'Inter';
      state.charts.powerRadar = new Chart(ctx, {
        type: 'radar',
        data: {
          labels,
          datasets: [{
            label: 'Strength Score',
            data: dataVals,
            backgroundColor: color.replace('0.7','0.2'),
            borderColor: color,
            pointBackgroundColor: color,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: { color: 'rgba(255,255,255,0.1)' },
              grid: { color: 'rgba(255,255,255,0.1)' },
              pointLabels: { font: { size: 10 } },
              ticks: { display: false, max: 10, min: 0 }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
  }

  function _renderConflict(conflict) {
    const iciStatus = document.getElementById('ici-status');
    document.getElementById('ici-value').innerHTML = `${conflict.ici} <span class="stat-unit" id="ici-status">/10</span>`;
    document.getElementById('eci-value').innerHTML = `${conflict.eci} <span class="stat-unit" id="eci-status">/10</span>`;
    
    const cRisk = document.getElementById('currency-risk');
    cRisk.textContent = conflict.devaluationRisk;
    cRisk.style.color = conflict.devaluationRisk === 'HIGH' ? 'var(--danger)' : 'var(--success)';
  }

  function _renderPortfolio(portInfo) {
    // 1. Chart
    const ctx = document.getElementById('portfolio-chart');
    const pKeys = Object.keys(SentinelConfig.PORTFOLIO.ASSETS);
    const labels = pKeys.map(k => SentinelConfig.PORTFOLIO.ASSETS[k].label);
    const colors = pKeys.map(k => SentinelConfig.PORTFOLIO.ASSETS[k].color);
    const dataVals = pKeys.map(k => portInfo.weightsPct[k.toLowerCase()]);

    if(state.charts.portfolioDoughnut) {
      state.charts.portfolioDoughnut.data.datasets[0].data = dataVals;
      state.charts.portfolioDoughnut.update();
    } else {
      state.charts.portfolioDoughnut = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: dataVals,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 5
          }]
        },
        options: {
          cutout: '75%',
          plugins: { legend: { display: false } }
        }
      });
    }

    // 2. Table
    const tbody = document.querySelector('#portfolio-table tbody');
    let html = '';
    
    // Sort logic to easily visualize
    for(let k of pKeys) {
        let lk = k.toLowerCase();
        let assetStr = SentinelConfig.PORTFOLIO.ASSETS[k].tickers.join('/');
        html += `
          <tr>
            <td>
              <div class="asset-name">
                <div class="asset-dot" style="background:${SentinelConfig.PORTFOLIO.ASSETS[k].color}"></div>
                <span>${SentinelConfig.PORTFOLIO.ASSETS[k].label} ${assetStr ? `<span style="color:var(--text-muted);font-size:0.7em">(${assetStr})</span>` : ''}</span>
              </div>
            </td>
            <td class="asset-weight">${portInfo.weightsPct[lk].toFixed(1)}%</td>
            <td>-</td>
          </tr>
        `;
    }
    tbody.innerHTML = html;
  }

  function _renderPrinciples(principlesArray) {
    const feed = document.getElementById('principles-feed');
    if(!principlesArray || principlesArray.length === 0) {
        feed.innerHTML = `<div style="color:var(--text-muted);padding:1rem;">暫無觸發預警原則。</div>`;
        return;
    }

    let html = '';
    for(let pObj of principlesArray) {
        let p = pObj.principle;
        let borderCol = pObj.severity === 'CRITICAL' ? 'var(--danger)' : pObj.severity === 'HIGH' ? 'var(--warning)' : 'var(--info)';
        html += `
            <div class="principle-card" style="border-left-color: ${borderCol}">
                <div class="principle-book">${p.book}</div>
                <div class="principle-text">「${p.principle}」</div>
                <div class="principle-advice">${p.actionAdvice}</div>
            </div>
        `;
    }
    feed.innerHTML = html;
  }

  function _setStatus(type, msg) {
    const el = document.getElementById('data-status');
    if(!el) return;
    
    // replace dot classes
    const dot = el.querySelector('.dot');
    dot.className = 'dot';
    if(type==='fetching') dot.classList.add('dot--pulse', 'dot--stale');
    if(type==='live') dot.classList.add('dot--live');
    if(type==='error') dot.classList.add('dot--error');

    el.querySelector('span:last-child').textContent = msg;
  }

  function _setLoading(isLoading) {
    const l = document.getElementById('loader-overlay');
    if(l) {
      if(isLoading) l.classList.add('active');
      else l.classList.remove('active');
    }
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', App.init);
