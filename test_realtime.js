/**
 * Test Cleveland Fed Real-Time Data Fetching
 * Verifies parsing and live data retrieval
 */

// Minimal DataFetcher stub for testing
const testDataFetcher = {
  async fetchRealtimeSources() {
    // Simulate the proxy fetch and parsing
    const CORS_PROXY = 'https://corsproxy.io/?';
    const ALL_ORIGINS = 'https://api.allorigins.win/get?url=';
    const pageUrl = 'https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting';
    
    async function fetchTextWithProxy(url) {
      try {
        let res = await fetch(CORS_PROXY + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
        if (res.ok) return await res.text();
        throw new Error('CORS proxy failed for text fetch');
      } catch(err) {
        try {
          let res = await fetch(ALL_ORIGINS + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
          if (!res.ok) throw new Error('AllOrigins failed for text fetch');
          let payload = await res.json();
          if (payload && payload.contents != null) return payload.contents;
          throw new Error('AllOrigins returned invalid payload');
        } catch(e) {
          console.warn(`[Test] Proxy text fetch failed for ${url}:`, e);
          throw e;
        }
      }
    }

    function parseClevelandNowcastTable(html) {
      if (!html || typeof html !== 'string') return null;
      
      // CRITICAL: Extract YEAR-OVER-YEAR table ONLY (not month-over-month)
      const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
      if (!tables) return null;
      
      let yoyTableHtml = null;
      for (const table of tables) {
          if (table.match(/<caption>[^<]*year-over-year[^<]*<\/caption>/i)) {
              yoyTableHtml = table;
              break;
          }
      }
      
      if (!yoyTableHtml) return null;
      
      // Extract the first row (most recent month) after headers in the tbody
      const tbodyMatch = yoyTableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
      const searchArea = tbodyMatch ? tbodyMatch[1] : yoyTableHtml;
      
      const rowMatch = searchArea.match(/<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<\/tr>/i);
      if (!rowMatch) return null;
      
      return {
          month: rowMatch[1].trim(),
          cpi: rowMatch[2].trim(),
          coreCpi: rowMatch[3].trim(),
          pce: rowMatch[4].trim(),
          corePce: rowMatch[5].trim(),
          updated: rowMatch[6].trim(),
      };
    }

    try {
      let html = await fetchTextWithProxy(pageUrl);
      let tableData = parseClevelandNowcastTable(html);
      
      if (tableData) {
        console.log('✓ Cleveland Fed data parsed successfully:');
        console.log('  Month:', tableData.month);
        console.log('  CPI:', tableData.cpi);
        console.log('  Core CPI:', tableData.coreCpi);
        console.log('  PCE:', tableData.pce);
        console.log('  Core PCE:', tableData.corePce);
        console.log('  Updated:', tableData.updated);
        
        return {
          cpi: parseFloat(tableData.cpi) || null,
          coreCpi: parseFloat(tableData.coreCpi) || null,
          pce: parseFloat(tableData.pce) || null,
          corePce: parseFloat(tableData.corePce) || null,
          month: tableData.month,
          updated: tableData.updated,
          sourceUrl: pageUrl,
          timestamp: new Date().toISOString()
        };
      }
    } catch(err) {
      console.error('[Test] Error fetching Cleveland Fed nowcast:', err);
    }
  }
};

// Run test if in browser console
console.log('[Test] Starting Cleveland Fed real-time data test...');
testDataFetcher.fetchRealtimeSources().then(result => {
  if (result) {
    console.log('\n✓ TEST PASSED - Live data retrieved:');
    console.log(result);
    console.log('\n✓ Source URL:', result.sourceUrl);
    console.log('✓ All values present:', result.cpi && result.coreCpi && result.pce && result.corePce);
  } else {
    console.log('\n✗ TEST FAILED - No data returned');
  }
}).catch(err => {
  console.log('\n✗ TEST FAILED - Error:', err);
});
