// BI Dashboard Plugin デバッグユーティリティ
// 開発者ツール（コンソール）にそのままコピペして動作します。
// 使い方:
//   await logBiDashboardMetrics();
//   // もしくは
//   const result = await calcBiDashboardMetrics(); result;
(function() {
  'use strict';

  function toNumber(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  async function fetchAllRecordsWithSeek(appId, baseQuery = '', batchSize = 500) {
    const allRecords = [];
    let lastRecordId = null;
    let hasMore = true;
    let iterations = 0;
    const maxLoops = 10000; // 安全弁

    function buildQuery(q, lastId, size) {
      const parts = [];
      const trimmed = String(q || '').trim();
      if (trimmed) parts.push(`(${trimmed})`);
      if (lastId) parts.push(`$id > ${lastId}`);
      return `${parts.join(' and ')} order by $id asc limit ${size}`.trim();
    }

    while (hasMore && iterations < maxLoops) {
      iterations++;
      const q = buildQuery(baseQuery, lastRecordId, batchSize);
      const params = { app: appId, query: q, totalCount: true, fields: [] };
      const resp = await kintone.api('/k/v1/records.json', 'GET', params);
      const recs = Array.isArray(resp.records) ? resp.records : [];
      allRecords.push(...recs);
      if (recs.length > 0) {
        lastRecordId = recs[recs.length - 1].$id.value;
      }
      hasMore = recs.length >= batchSize;
      if (!hasMore) break;
      // Kintoneのレート制限緩和
      await new Promise(r => setTimeout(r, 150));
    }
    return { records: allRecords };
  }

  // オフセット方式での並列取得（大量データは offset 制限に注意）
  async function fetchAllRecordsWithOffsetParallel(appId, baseQuery = '', pageSize = 500, concurrency = 5) {
    function buildOffsetQuery(q, size, offset) {
      const parts = [];
      const trimmed = String(q || '').trim();
      if (trimmed) parts.push(`(${trimmed})`);
      parts.push(`order by $id asc limit ${size} offset ${offset}`);
      return parts.join(' ');
    }

    // 総件数を先に取得
    const headParams = { app: appId, query: buildOffsetQuery(baseQuery, 1, 0), totalCount: true, fields: [] };
    const headResp = await kintone.api('/k/v1/records.json', 'GET', headParams);
    const totalCount = Number(headResp.totalCount || 0);
    if (!totalCount || !isFinite(totalCount) || totalCount < 0) {
      // totalCount が取れない環境ではシーク法にフォールバック
      return fetchAllRecordsWithSeek(appId, baseQuery, pageSize);
    }

    const offsets = [];
    for (let off = 0; off < totalCount; off += pageSize) offsets.push(off);

    const allRecords = [];
    for (let i = 0; i < offsets.length; i += concurrency) {
      const chunk = offsets.slice(i, i + concurrency);
      const reqs = chunk.map(off => {
        const params = { app: appId, query: buildOffsetQuery(baseQuery, pageSize, off), totalCount: false, fields: [] };
        return kintone.api('/k/v1/records.json', 'GET', params).then(r => r.records || []);
      });
      const results = await Promise.all(reqs);
      results.forEach(arr => { allRecords.push(...arr); });
      // 軽いウェイトでレート制限緩和
      await new Promise(r => setTimeout(r, 100));
    }
    return { records: allRecords };
  }

  function getPluginConfig(override, pluginId) {
    let cfg = {};
    try {
      const pid = pluginId || (typeof kintone !== 'undefined' && kintone && typeof kintone.$PLUGIN_ID === 'string' ? kintone.$PLUGIN_ID : null);
      if (pid && kintone && kintone.plugin && kintone.plugin.app && typeof kintone.plugin.app.getConfig === 'function') {
        cfg = kintone.plugin.app.getConfig(pid) || {};
        if (typeof cfg === 'string') {
          try { cfg = JSON.parse(cfg); } catch (_) { cfg = {}; }
        }
      }
    } catch (e) {
      console.warn('kintone.plugin.app.getConfig に失敗しました。override のみを使用します。', e);
    }
    return Object.assign({}, cfg, override || {});
  }

  function computeOwnerLevelMetricsForProperties(props, config) {
    let totalIncome = 0; // 収支（ROA用）
    let totalNetIncome = 0; // 実質収入（NOI用）
    let totalInheritance = 0;
    let totalOperatingCost = 0;
    let totalFullRent = 0;
    let totalMarketPrice = 0;

    props.forEach(p => {
      const income = toNumber(p?.[config.propIncome]?.value);
      const inheritanceVal = toNumber(p?.[config.propInheritanceTaxVal]?.value);
      const fullRent = toNumber(p?.[config.propFullRent]?.value);
      const marketPrice = toNumber(p?.[config.propMarketPrice]?.value);
      const netIncome = toNumber(p?.[config.propNetIncome]?.value);
      const operatingCost =
        toNumber(p?.[config.propPropTax]?.value) +
        toNumber(p?.[config.propMgmtFee]?.value) +
        toNumber(p?.[config.propBldgRepair]?.value) +
        toNumber(p?.[config.propRestoration]?.value) +
        toNumber(p?.[config.propMaint]?.value);

      totalIncome += income;
      totalNetIncome += netIncome;
      totalInheritance += inheritanceVal;
      totalFullRent += fullRent;
      totalMarketPrice += marketPrice;
      totalOperatingCost += operatingCost;
    });

    const roa = totalInheritance > 0 ? (totalIncome / totalInheritance) * 100 : 0;
    const assetEfficiency = totalInheritance > 0 ? (totalMarketPrice / totalInheritance) * 100 : 0;
    const operatingCostRate = totalFullRent > 0 ? (totalOperatingCost / totalFullRent) * 100 : 0;
    // NOI = 実質収入 - 運営コスト合計, NOI率 = NOI / 満室賃料 * 100
    const noiRate = totalFullRent > 0 ? ((totalNetIncome - totalOperatingCost) / totalFullRent) * 100 : 0;

    return {
      sums: { totalIncome, totalNetIncome, totalInheritance, totalOperatingCost, totalFullRent, totalMarketPrice },
      roa,
      assetEfficiency,
      operatingCost: operatingCostRate,
      noi: noiRate
    };
  }

  function computeIncomeTaxRateFromOwnerRecord(ownerRecord, config) {
    if (!ownerRecord) return 0;
    const annualRent = toNumber(ownerRecord?.[config.ownerAnnRent]?.value);
    const totalExpenses =
      toNumber(ownerRecord?.[config.ownerAnnMgmtFee]?.value) +
      toNumber(ownerRecord?.[config.ownerLandPropTax]?.value) +
      toNumber(ownerRecord?.[config.ownerBldgPropTax]?.value) +
      toNumber(ownerRecord?.[config.ownerLongTermRepair]?.value) +
      toNumber(ownerRecord?.[config.ownerMaint]?.value) +
      toNumber(ownerRecord?.[config.ownerLoanInterest]?.value) +
      toNumber(ownerRecord?.[config.ownerDepreciation]?.value) +
      toNumber(ownerRecord?.[config.ownerAnnInsurance]?.value);
    const taxable = annualRent - totalExpenses;
    if (taxable > 40000000) return 45;
    if (taxable > 18000000) return 40;
    if (taxable > 9000000) return 33;
    if (taxable > 6950000) return 23;
    if (taxable > 3300000) return 20;
    if (taxable > 1950000) return 10;
    if (taxable > 0) return 5;
    return 0;
  }

  async function calcBiDashboardMetrics(options = {}) {
    if (!window.kintone || !kintone.api) {
      console.error('kintone API が見つかりません。Kintone アプリ画面で実行してください。');
      return null;
    }

    const config = getPluginConfig(options.configOverride, options.pluginId);
    const ownerAppId = options.ownerAppId || config.ownerAppId;
    const propertyAppId = options.propertyAppId || config.propertyAppId;
    if (!ownerAppId || !propertyAppId) {
      console.error('ownerAppId / propertyAppId が未設定です。以下のいずれかで指定してください:\n' +
        '1) logBiDashboardMetrics({ pluginId: "<プラグインID>" }) を使用\n' +
        '2) logBiDashboardMetrics({ ownerAppId: <数値>, propertyAppId: <数値>, configOverride: { propertyOwnerId: "オーナーID", propMarketPrice: "実勢価格", propIncome: "収支", propNetIncome: "実質収入", propInheritanceTaxVal: "相続税評価額", propFullRent: "満室賃料", propPropTax: "固都税", propMgmtFee: "管理料", propBldgRepair: "建物修繕費", propRestoration: "原状回復費", propMaint: "メンテ経費", ownerId: "オーナーID", ownerAnnRent: "年賃料", ownerAnnMgmtFee: "年管理費", ownerLandPropTax: "土地固都税", ownerBldgPropTax: "建物固都税", ownerLongTermRepair: "長期修繕契約経費", ownerMaint: "メンテナンス計画経費", ownerLoanInterest: "借入金利息", ownerDepreciation: "減価償却費", ownerAnnInsurance: "保険料年額" } })');
      return null;
    }

    let currentOwnerId = '';
    try {
      const rec = kintone.app.record.get();
      currentOwnerId = rec?.record?.[config.currentAppOwnerId]?.value || '';
    } catch (_) {}

    const bs = Math.max(1, Math.min(500, Number(options.batchSize) || 500));
    const mode = String(options.fetchMode || 'seek').toLowerCase(); // 'seek' | 'offset'
    const cc = Math.max(1, Math.min(10, Number(options.concurrency) || 5));
    const fetchFn = (appId) => (mode === 'offset')
      ? fetchAllRecordsWithOffsetParallel(appId, '', bs, cc)
      : fetchAllRecordsWithSeek(appId, '', bs);

    const [{ records: owners }, { records: properties }] = await Promise.all([
      fetchFn(ownerAppId),
      fetchFn(propertyAppId)
    ]);

    const ownersById = {};
    owners.forEach(o => {
      const oid = o?.[config.ownerId]?.value;
      if (oid) ownersById[oid] = o;
    });

    const propsByOwner = {};
    properties.forEach(p => {
      const oid = p?.[config.propertyOwnerId]?.value;
      if (!oid) return;
      if (!propsByOwner[oid]) propsByOwner[oid] = [];
      propsByOwner[oid].push(p);
    });

    const perOwner = [];
    const denomZeroOwners = [];
    Object.keys(propsByOwner).forEach(oid => {
      const props = propsByOwner[oid] || [];
      if (props.length === 0) return;
      const metrics = computeOwnerLevelMetricsForProperties(props, config);
      const incomeTax = computeIncomeTaxRateFromOwnerRecord(ownersById[oid], config);
      perOwner.push({ ownerId: oid, ...metrics, incomeTax });
      if (metrics.sums.totalInheritance <= 0) denomZeroOwners.push(oid);
    });

    const count = perOwner.length || 1;
    const totals = perOwner.reduce((acc, m) => {
      acc.roa += m.roa;
      acc.assetEfficiency += m.assetEfficiency;
      acc.operatingCost += m.operatingCost;
      acc.incomeTax += m.incomeTax;
      acc.noi += m.noi;
      return acc;
    }, { roa: 0, assetEfficiency: 0, operatingCost: 0, incomeTax: 0, noi: 0 });

    const average = {
      roa: totals.roa / count,
      assetEfficiency: totals.assetEfficiency / count,
      operatingCost: totals.operatingCost / count,
      incomeTax: totals.incomeTax / count,
      noi: totals.noi / count
    };

    // 現在レコードのオーナー（現状値）
    let current = { roa: 0, assetEfficiency: 0, operatingCost: 0, incomeTax: 0, noi: 0 };
    if (currentOwnerId && propsByOwner[currentOwnerId]) {
      const m = computeOwnerLevelMetricsForProperties(propsByOwner[currentOwnerId], config);
      const it = computeIncomeTaxRateFromOwnerRecord(ownersById[currentOwnerId], config);
      current = { roa: m.roa, assetEfficiency: m.assetEfficiency, operatingCost: m.operatingCost, incomeTax: it, noi: m.noi };
    }

    return {
      currentOwnerId,
      counts: {
        owners: owners.length,
        properties: properties.length,
        ownersWithProperties: Object.keys(propsByOwner).length
      },
      current,
      average,
      perOwner,
      denomZeroOwners
    };
  }

  async function logBiDashboardMetrics(options = {}) {
    const r = await calcBiDashboardMetrics(options);
    if (!r) return r;
    console.group('BI Dashboard Metrics (Debug)');
    console.log('currentOwnerId:', r.currentOwnerId);
    console.log('Counts:', r.counts);
    console.log('CURRENT:', {
      assetEfficiency: Number(r.current.assetEfficiency || 0).toFixed(2),
      roa: Number(r.current.roa || 0).toFixed(2),
      operatingCost: Number(r.current.operatingCost || 0).toFixed(2),
      incomeTax: Number(r.current.incomeTax || 0).toFixed(2),
      noi: Number(r.current.noi || 0).toFixed(2)
    });
    console.log('AVERAGE:', {
      assetEfficiency: Number(r.average.assetEfficiency || 0).toFixed(2),
      roa: Number(r.average.roa || 0).toFixed(2),
      operatingCost: Number(r.average.operatingCost || 0).toFixed(2),
      incomeTax: Number(r.average.incomeTax || 0).toFixed(2),
      noi: Number(r.average.noi || 0).toFixed(2)
    });
    if (r.denomZeroOwners && r.denomZeroOwners.length) {
      console.warn('相続税評価額（分母）が0または未入力のオーナー一覧:', r.denomZeroOwners);
    }
    console.groupEnd();
    return r;
  }

  // グローバル公開
  window.calcBiDashboardMetrics = calcBiDashboardMetrics;
  window.logBiDashboardMetrics = logBiDashboardMetrics;
})();

await logBiDashboardMetrics({ pluginId: 'pjfkpmdodmiabilgchlppgkifgabpfhp' });
