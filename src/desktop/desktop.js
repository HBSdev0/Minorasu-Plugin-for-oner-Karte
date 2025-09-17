import { createRoaTab } from './tabs/roaTab.js';
import { createOperatingCostTab } from './tabs/operatingCostTab.js';
import { createIncomeTaxTab } from './tabs/incomeTaxTab.js';
import { createInheritanceTaxTab } from './tabs/inheritanceTaxTab.js';
import { createBorrowingTab } from './tabs/borrowingTab.js';
import { updateGradeThresholdsFromConfig as updateGradeThresholdsFromConfigModule, getMaxGradeScore as getMaxGradeScoreModule, calculateGrade as calculateGradeModule, getGradeThresholds as getGradeThresholdsModule } from './grade.mjs';

(function() {
  'use strict';

  const PLUGIN_ID = kintone.$PLUGIN_ID;
  let config = kintone.plugin.app.getConfig(PLUGIN_ID);
  // 一部の環境で文字列で返るケースに備えてパース
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config);
    } catch (_) {
      config = {};
    }
  }

  // 設定値がなければ処理を終了
  if (!config || !config.spaceId || !config.ownerAppId || !config.propertyAppId) {
    console.log('BI Dashboard Plugin: プラグイン設定が完了していません。');
    return;
  }
  
  // import文はViteでのビルドに必要

  let radarChart = null;
  let barChart = null;
  let compressionMode = false; // 圧縮モードの状態
  let gradeMode = true; // ★成績表示モードの状態（デフォルトON）
  let averagesPending = false; // 平均集計がバックグラウンド中か
  let currentChartType = 'radar';

  // ★設定から成績基準を更新する（モジュール版）
  function updateGradeThresholdsFromConfig() {
    updateGradeThresholdsFromConfigModule(config);
  }

  // ★成績段階の最大スコアを取得（モジュール版）
  function getMaxGradeScore() { return getMaxGradeScoreModule(); }

  // 汎用設定
  const METRICS = ['assetEfficiency','roa','incomeTax','operatingCost','noi'];
  // 将来復活予定: 'inheritanceTax','borrowing'
  const FIELDS = ['current','average','forecast'];
  const CHART_LABELS = ['資産効率','ROA','所得税率','運営コスト率','NOI率'];
  // 将来復活予定: '相続税率(%)','借り入れ状況(%)'
  // カラー設定ユーティリティ
  function hexToRgb(color) {
    try {
      const m = /^#?([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/.exec(String(color || '').trim());
      if (!m) return null;
      return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
    } catch (_) { return null; }
  }
  function parseRgb(color) {
    try {
      const m = /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(String(color || '').trim());
      if (!m) return null;
      return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
    } catch (_) { return null; }
  }
  function toRgba(color, alpha) {
    const hex = hexToRgb(color);
    if (hex) return `rgba(${hex.r}, ${hex.g}, ${hex.b}, ${alpha})`;
    const rgb = parseRgb(color);
    if (rgb) return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    // フォールバック
    return color;
  }

  function getTemplateColors(name) {
    const tpl = String(name || 'classic');
    if (tpl === 'tealPurpleGray') {
      return ['#00897B', '#7E57C2', '#607D8B'];
    }
    if (tpl === 'redBlueYellow') {
      return ['#E53935', '#1E88E5', '#FDD835'];
    }
    if (tpl === 'colorblindSafe') {
      // Okabe-Ito (一例)
      return ['#0072B2', '#E69F00', '#009E73'];
    }
    // classic
    return ['#007BFF', '#FF5722', '#4CAF50'];
  }

  function buildDatasetStyleFromConfig() {
    // デフォルト色
    let currentColor = '#007BFF';
    let averageColor = '#FF5722';
    let forecastColor = '#4CAF50';
    
    // 設定画面で色が設定されている場合はそれを使用
    if (config?.colorCurrent) {
      currentColor = String(config.colorCurrent);
    }
    if (config?.colorAverage) {
      averageColor = String(config.colorAverage);
    }
    if (config?.colorForecast) {
      forecastColor = String(config.colorForecast);
    }
    const base = [
      { label: '現状', color: currentColor },
      { label: '平均', color: averageColor },
      { label: '試算', color: forecastColor }
    ];
    return base.map(e => ({
      label: e.label,
      border: toRgba(e.color, 1),
      bgRadar: toRgba(e.color, 0.2),
      bgBar: toRgba(e.color, 0.8),
      bwRadar: 2,
      bwBar: 1
    }));
  }
  const DATASET_STYLE = buildDatasetStyleFromConfig();

  // データオブジェクト: Kintoneから取得するように変更するため削除
  // const data = { ... };
  let data = {}; // グローバルで保持

  // Kintoneイベントでマウント
  const events = [
    'app.record.detail.show',
    'app.record.edit.show',
    'app.record.create.show'
  ];

  kintone.events.on(events, function(event) {
    // ハンドラ内でのレコード取得系を避けるためディファー
    setTimeout(() => {
      const spaceEl = kintone.app.record.getSpaceElement(config.spaceId);
      if (!spaceEl) {
        console.log(`BI Dashboard Plugin: スペースID '${config.spaceId}' が見つかりません。`);
        return;
      }
      fetchDataAndMountApp(spaceEl, event && event.record);
    }, 0);
    return event;
  });


  // ローディングインジケータを表示
  function showLoadingIndicator(spaceRoot) {
    spaceRoot.innerHTML = `
      <div class="loading-container" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div class="loading-spinner" style="
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        "></div>
        <div class="loading-text" style="
          color: #666;
          font-size: 14px;
          text-align: center;
        ">データを読み込み中...</div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
    `;
  }

  // シーク法で全レコードを取得する関数（$idシーク + order by + limit）
  async function fetchAllRecordsWithSeek(appId, baseQuery = '', batchSize = 500) {
    const allRecords = [];
    let lastRecordId = null;
    let hasMore = true;
    let totalFetched = 0;
    let retryCount = 0;
    const maxRetries = 3;

    console.log(`BI Dashboard Plugin: アプリ${appId}の全レコード取得を開始 (シーク法, バッチサイズ: ${batchSize})`);

    function buildQuery(q, lastId, size) {
      const parts = [];
      const trimmed = String(q || '').trim();
      if (trimmed) parts.push(`(${trimmed})`);
      if (lastId) parts.push(`$id > ${lastId}`);
      parts.push(`order by $id asc limit ${size}`);
      return parts.join(' ');
    }

    while (hasMore) {
      try {
        const params = {
          app: appId,
          query: buildQuery(baseQuery, lastRecordId, batchSize),
          fields: [], // 全フィールドを取得
          totalCount: true
        };

        const response = await kintone.api('/k/v1/records.json', 'GET', params);
        
        if (response.records && response.records.length > 0) {
          allRecords.push(...response.records);
          lastRecordId = response.records[response.records.length - 1].$id.value;
          totalFetched += response.records.length;
          
          // 進捗ログ（1000件ごと）
          if (totalFetched % 1000 === 0 || response.records.length < batchSize) {
            console.log(`BI Dashboard Plugin: アプリ${appId} - ${totalFetched}件取得済み`);
          }
          
          // 取得件数がバッチサイズより少ない場合は終了
          if (response.records.length < batchSize) {
            hasMore = false;
          }
          
          // リトライカウントをリセット
          retryCount = 0;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`BI Dashboard Plugin: アプリ${appId}のレコード取得エラー (試行${retryCount + 1}/${maxRetries}):`, error);
        
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error(`BI Dashboard Plugin: アプリ${appId}のレコード取得を最大リトライ回数に達したため終了`);
          hasMore = false;
        } else {
          // 指数バックオフでリトライ
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`BI Dashboard Plugin: ${delay}ms後にリトライします...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.log(`BI Dashboard Plugin: アプリ${appId}の全レコード取得完了 - 合計${allRecords.length}件`);
    return { records: allRecords };
  }

  // オフセット方式の並列全件取得
  async function fetchAllRecordsWithOffsetParallel(appId, baseQuery = '', pageSize = 500, concurrency = 5) {
    function buildOffsetQuery(q, size, offset) {
      const parts = [];
      const trimmed = String(q || '').trim();
      if (trimmed) parts.push(`(${trimmed})`);
      parts.push(`order by $id asc limit ${size} offset ${offset}`);
      return parts.join(' ');
    }

    // 総件数取得（取得に失敗した場合はシーク法へフォールバック）
    let totalCount = 0;
    try {
      const headParams = { app: appId, query: buildOffsetQuery(baseQuery, 1, 0), totalCount: true, fields: [] };
      const headResp = await kintone.api('/k/v1/records.json', 'GET', headParams);
      totalCount = Number(headResp.totalCount || 0);
    } catch (_) {}
    if (!totalCount || !isFinite(totalCount) || totalCount < 0) {
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

  // 並列で複数アプリの全レコードを取得（デフォルト: オフセット並列）
  async function fetchAllRecordsParallel(appIds, queries = {}, batchSize = 500, mode = 'offset', concurrency = 5) {
    const useOffset = String(mode || 'offset').toLowerCase() === 'offset';
    const promises = appIds.map(appId => {
      const q = queries[appId] || '';
      return useOffset
        ? fetchAllRecordsWithOffsetParallel(appId, q, batchSize, concurrency)
        : fetchAllRecordsWithSeek(appId, q, batchSize);
    });
    const results = await Promise.all(promises);
    const resultMap = {};
    appIds.forEach((appId, index) => { resultMap[appId] = results[index]; });
    return resultMap;
  }

  async function fetchDataAndMountApp(spaceRoot, currentRecord) {
    try {
        // ローディングインジケータを表示
        showLoadingIndicator(spaceRoot);

        // ★設定から成績基準を更新
        updateGradeThresholdsFromConfig();

        // アプリIDを設定画面から取得
        const propertyAppId = config.propertyAppId;
        const ownerAppId = config.ownerAppId;

        // 現在レコードのオーナーIDを取得（イベントから受領）
        const currentOwnerId = (currentRecord && config.currentAppOwnerId)
          ? (currentRecord[config.currentAppOwnerId]?.value || '')
          : '';

        // クエリを構築（オーナーIDで絞り込み）
        const queries = {};
        if (currentOwnerId && config.propertyOwnerId) {
          queries[propertyAppId] = `${config.propertyOwnerId} = "${currentOwnerId}"`;
        }
        if (currentOwnerId && config.ownerId) {
          queries[ownerAppId] = `${config.ownerId} = "${currentOwnerId}"`;
        }

        // 補助: クエリ型差異へのフォールバックを含む取得関数
        async function fetchWithQueryFallback(appId, fieldCode, val) {
          if (!appId) return { records: [] };
          const isNumeric = /^-?\d+(?:\.\d+)?$/.test(String(val || '').trim());
          // 1) クエリあり（文字列）
          if (fieldCode && val !== '' && val !== undefined && val !== null) {
            try {
              const respStr = await kintone.api('/k/v1/records.json', 'GET', { app: appId, query: `${fieldCode} = "${val}"` });
              if (Array.isArray(respStr.records) && respStr.records.length > 0) return respStr;
            } catch (e) {}
            // 2) 数値フィールドの可能性 → クオート無し
            if (isNumeric) {
              try {
                const respNum = await kintone.api('/k/v1/records.json', 'GET', { app: appId, query: `${fieldCode} = ${val}` });
                if (Array.isArray(respNum.records) && respNum.records.length > 0) return respNum;
              } catch (e) {}
            }
          }
          // 3) フォールバック: 全件（シーク法使用）
          try {
            return await fetchAllRecordsWithSeek(appId);
          } catch (e) {
            return { records: [] };
          }
        }

        // 全オーナーのデータを取得する関数（デフォルト: オフセット並列）
        async function fetchAllOwnersData() {
          try {
            console.log('BI Dashboard Plugin: 全オーナーデータの並列取得を開始');
            
            // 並列で全レコードを取得（queriesは空にして全レコードを取得）
            const allData = await fetchAllRecordsParallel([ownerAppId, propertyAppId], {}, 500, 'offset', 5);
            
            return {
              owners: allData[ownerAppId]?.records || [],
              properties: allData[propertyAppId]?.records || []
            };
          } catch (e) {
            console.error('全オーナーデータの取得に失敗:', e);
            return { owners: [], properties: [] };
          }
        }

        // まずは現オーナー分のみ取得
        const averageMode = String(config?.averageMode || 'compute');
        const useSavedAverageFields = (averageMode === 'savedField');
        averagesPending = !useSavedAverageFields; // savedFieldモードなら最初から平均表示可
        const [propertyResponse, ownerResponse] = await Promise.all([
            fetchWithQueryFallback(propertyAppId, config.propertyOwnerId, currentOwnerId),
            fetchWithQueryFallback(ownerAppId, config.ownerId, currentOwnerId)
        ]);

        // デバッグログ
        try {
          console.log('BI Dashboard Plugin: fetch summary', {
            currentOwnerId,
            ownerIdField: config.ownerId,
            propertyOwnerIdField: config.propertyOwnerId,
            propertyCount: propertyResponse.records?.length || 0,
            ownerCount: ownerResponse.records?.length || 0,
            allOwnersCount: allOwnersData.owners?.length || 0,
            allPropertiesCount: allOwnersData.properties?.length || 0,
          });
        } catch (_) {}

        // 取得したデータを加工（平均はモードに応じて後段で反映）
        const processedData = processKintoneData(propertyResponse.records, ownerResponse.records, { owners: [], properties: [] }, currentRecord);
        data = processedData; // グローバル変数に格納

        // UIを構築してアプリをマウント（平均列は「集計中」、グラフは平均非表示）
        mountApp(spaceRoot, processedData);

        if (useSavedAverageFields) {
          // 自アプリの平均値フィールドを利用するため、即表示更新
          averagesPending = false;
          updateTable();
          updateCharts();
        } else {
          // バックグラウンドで全オーナー平均を取得し再描画
          fetchAllOwnersData().then((allOwnersData) => {
            try {
              const updated = processKintoneData(propertyResponse.records, ownerResponse.records, allOwnersData, currentRecord);
              data = updated;
              averagesPending = false;
              updateTable();
              updateCharts();
            } catch (e) {
              console.error('平均再計算に失敗:', e);
              averagesPending = false;
            }
          }).catch(e => {
            console.error('全オーナー平均の取得に失敗:', e);
            averagesPending = false;
          });
        }

    } catch (error) {
        console.error('Failed to fetch or process kintone data:', error);
        // エラー発生時の処理をここに記述（例: エラーメッセージを表示）
        spaceRoot.innerHTML = '<p>データの取得に失敗しました。</p>';
    }
  }

  // Kintoneのデータをアプリ用に加工する
  function processKintoneData(propertyRecords, ownerRecords, allOwnersData, currentAppRecord) {
    // 正規化: 設定されたフィールドコードを、タブが期待する共通キーにマッピング
    function ensureField(field, defaultValue) {
      if (field && typeof field === 'object' && field !== null && ('value' in field)) return field;
      return { value: defaultValue };
    }

    function normalizePropertyRecord(r) {
      return {
        property_name: ensureField(r?.[config.propertyName], ''),
        market_price: ensureField(r?.[config.propMarketPrice], 0),
        income: ensureField(r?.[config.propIncome], 0),
        inheritance_tax_value: ensureField(r?.[config.propInheritanceTaxVal], 0),
        property_tax: ensureField(r?.[config.propPropTax], 0),
        management_fee: ensureField(r?.[config.propMgmtFee], 0),
        building_repair_cost: ensureField(r?.[config.propBldgRepair], 0),
        restoration_cost: ensureField(r?.[config.propRestoration], 0),
        maintenance_cost: ensureField(r?.[config.propMaint], 0),
        net_income: ensureField(r?.[config.propNetIncome], 0),
        full_rent: ensureField(r?.[config.propFullRent], 0),
      };
    }

    function normalizeOwnerRecord(r) {
      if (!r) return null;
      return {
        annual_rent: ensureField(r?.[config.ownerAnnRent], 0),
        annual_management_fee: ensureField(r?.[config.ownerAnnMgmtFee], 0),
        land_property_tax: ensureField(r?.[config.ownerLandPropTax], 0),
        building_property_tax: ensureField(r?.[config.ownerBldgPropTax], 0),
        long_term_repair_cost: ensureField(r?.[config.ownerLongTermRepair], 0),
        maintenance_cost: ensureField(r?.[config.ownerMaint], 0),
        loan_interest: ensureField(r?.[config.ownerLoanInterest], 0),
        depreciation: ensureField(r?.[config.ownerDepreciation], 0),
        annual_insurance_premium: ensureField(r?.[config.ownerAnnInsurance], 0),
        // 未マッピング項目は0でフォールバック
        inheritance_tax_rate: ensureField(undefined, 0),
        borrowing_rate: ensureField(undefined, 0),
      };
    }

    const normalizedProps = Array.isArray(propertyRecords)
      ? propertyRecords.map(normalizePropertyRecord)
      : [];
    const ownerRecord = Array.isArray(ownerRecords) && ownerRecords.length > 0
      ? normalizeOwnerRecord(ownerRecords[0])
      : null;

    try {
      console.log('BI Dashboard Plugin: sample normalized', {
        property: normalizedProps[0],
        owner: ownerRecord,
      });
    } catch (_) {}

    // ROAと運営コストの計算
    let totalMarketPrice = 0;
    let totalIncome = 0; // 収支（ROA用）
    let totalNetIncome = 0; // 実質収入（NOI用）
    let totalInheritanceValue = 0;
    let totalOperatingCost = 0;
    let totalFullRent = 0;

    const individualRoas = [];
    const individualOperatingCostRates = [];

    normalizedProps.forEach(p => {
        // 全体の合計値を計算（現状値用）
        totalMarketPrice += parseFloat(p.market_price?.value || 0);
        totalIncome += parseFloat(p.income?.value || 0);
        totalInheritanceValue += parseFloat(p.inheritance_tax_value?.value || 0);
        const propertyOperatingCost = parseFloat(p.property_tax?.value || 0) +
                                      parseFloat(p.management_fee?.value || 0) +
                                      parseFloat(p.building_repair_cost?.value || 0) +
                                      parseFloat(p.restoration_cost?.value || 0) +
                                      parseFloat(p.maintenance_cost?.value || 0);
        totalOperatingCost += propertyOperatingCost;
        const propertyFullRent = parseFloat(p.full_rent?.value || 0);
        totalFullRent += propertyFullRent;
        const propertyNetIncome = parseFloat(p.net_income?.value || 0);
        totalNetIncome += propertyNetIncome;

        // 物件ごとの指標を計算（平均値用）
        const incomeVal = parseFloat(p.income?.value || 0);
        const inheritanceValue = parseFloat(p.inheritance_tax_value?.value || 0);
        
        const roa = inheritanceValue > 0 ? (incomeVal / inheritanceValue) * 100 : 0;
        const operatingCostRate = propertyFullRent > 0 ? (propertyOperatingCost / propertyFullRent) * 100 : 0;

        individualRoas.push(roa);
        individualOperatingCostRates.push(operatingCostRate);
    });

    // 全オーナーの平均値を計算（最適化版）
    function calculateAllOwnersAverages(allOwnersData) {
      const { owners, properties } = allOwnersData;
      
      // 物件をオーナーIDでグループ化（パフォーマンス向上）
      const propertiesByOwner = {};
      properties.forEach(prop => {
        const ownerId = prop[config.propertyOwnerId]?.value;
        if (ownerId) {
          if (!propertiesByOwner[ownerId]) {
            propertiesByOwner[ownerId] = [];
          }
          propertiesByOwner[ownerId].push(prop);
        }
      });
      
      // オーナーごとの指標を計算
      const allOwnerMetrics = [];
      
      owners.forEach(owner => {
        // オーナーIDを取得
        const ownerId = owner[config.ownerId]?.value;
        if (!ownerId) return;
        
        // このオーナーの物件を取得（事前グループ化済み）
        const ownerProperties = propertiesByOwner[ownerId] || [];
        
        if (ownerProperties.length === 0) return;
        
        // このオーナーのROAと運営コスト率/NOI率を計算
        let ownerTotalIncome = 0; // 収支（ROA用）
        let ownerTotalNetIncome = 0; // 実質収入（NOI用）
        let ownerTotalInheritanceValue = 0;
        let ownerTotalOperatingCost = 0;
        let ownerTotalFullRent = 0;
        
        ownerProperties.forEach(prop => {
          const propIncome = parseFloat(prop[config.propIncome]?.value || 0);
          const propInheritanceValue = parseFloat(prop[config.propInheritanceTaxVal]?.value || 0);
          const propFullRent = parseFloat(prop[config.propFullRent]?.value || 0);
          const propNetIncome = parseFloat(prop[config.propNetIncome]?.value || 0);
          
          const propOperatingCost = parseFloat(prop[config.propPropTax]?.value || 0) +
                                   parseFloat(prop[config.propMgmtFee]?.value || 0) +
                                   parseFloat(prop[config.propBldgRepair]?.value || 0) +
                                   parseFloat(prop[config.propRestoration]?.value || 0) +
                                   parseFloat(prop[config.propMaint]?.value || 0);
          
          ownerTotalIncome += propIncome;
          ownerTotalNetIncome += propNetIncome;
          ownerTotalInheritanceValue += propInheritanceValue;
          ownerTotalOperatingCost += propOperatingCost;
          ownerTotalFullRent += propFullRent;
        });
        
        // オーナーレベルの指標を計算
        const ownerRoa = ownerTotalInheritanceValue > 0 ? (ownerTotalIncome / ownerTotalInheritanceValue) * 100 : 0;
        const ownerOperatingCostRate = ownerTotalFullRent > 0 ? (ownerTotalOperatingCost / ownerTotalFullRent) * 100 : 0;
        
        // 資産効率の計算（実勢価格の合計 ÷ 相続税評価額の合計 × 100）
        let ownerTotalMarketPrice = 0;
        ownerProperties.forEach(prop => {
          const propMarketPrice = parseFloat(prop[config.propMarketPrice]?.value || 0);
          ownerTotalMarketPrice += propMarketPrice;
        });
        const ownerAssetEfficiency = ownerTotalInheritanceValue > 0 ? (ownerTotalMarketPrice / ownerTotalInheritanceValue) * 100 : 0;
        
        // NOI率の計算（NOI = 実質収入 - 運営コスト合計）
        const ownerNoi = ownerTotalNetIncome - ownerTotalOperatingCost;
        const ownerNoiRate = ownerTotalFullRent > 0 ? (ownerNoi / ownerTotalFullRent) * 100 : 0;
        
        // 所得税率を計算
        const ownerData = normalizeOwnerRecord(owner);
        let ownerIncomeTaxable = 0;
        if (ownerData) {
          const totalExpenses = parseFloat(ownerData.annual_management_fee?.value || 0) +
                                parseFloat(ownerData.land_property_tax?.value || 0) +
                                parseFloat(ownerData.building_property_tax?.value || 0) +
                                parseFloat(ownerData.long_term_repair_cost?.value || 0) +
                                parseFloat(ownerData.maintenance_cost?.value || 0) +
                                parseFloat(ownerData.loan_interest?.value || 0) +
                                parseFloat(ownerData.depreciation?.value || 0) +
                                parseFloat(ownerData.annual_insurance_premium?.value || 0);
          ownerIncomeTaxable = parseFloat(ownerData.annual_rent?.value || 0) - totalExpenses;
        }
        
        let ownerIncomeTaxRate = 0;
        if (ownerIncomeTaxable > 40000000) ownerIncomeTaxRate = 45;
        else if (ownerIncomeTaxable > 18000000) ownerIncomeTaxRate = 40;
        else if (ownerIncomeTaxable > 9000000) ownerIncomeTaxRate = 33;
        else if (ownerIncomeTaxable > 6950000) ownerIncomeTaxRate = 23;
        else if (ownerIncomeTaxable > 3300000) ownerIncomeTaxRate = 20;
        else if (ownerIncomeTaxable > 1950000) ownerIncomeTaxRate = 10;
        else if (ownerIncomeTaxable > 0) ownerIncomeTaxRate = 5;
        
        // 相続税率と借り入れ状況
        const normalizedOwner = normalizeOwnerRecord(owner);
        const ownerInheritanceTaxRate = parseFloat(normalizedOwner?.inheritance_tax_rate?.value || 0);
        const ownerBorrowingRate = parseFloat(normalizedOwner?.borrowing_rate?.value || 0);
        
        allOwnerMetrics.push({
          assetEfficiency: ownerAssetEfficiency,
          roa: ownerRoa,
          operatingCostRate: ownerOperatingCostRate,
          incomeTaxRate: ownerIncomeTaxRate,
          inheritanceTaxRate: ownerInheritanceTaxRate,
          borrowingRate: ownerBorrowingRate,
          noiRate: ownerNoiRate
        });
      });
      
      // 平均値を計算（最適化版）
      const averages = {
        assetEfficiency: 0,
        roa: 0,
        operatingCost: 0,
        incomeTax: 0,
        inheritanceTax: 0,
        borrowing: 0,
        noi: 0
      };
      
      if (allOwnerMetrics.length > 0) {
        // 一度のループで全合計を計算
        const totals = allOwnerMetrics.reduce((acc, m) => {
          acc.assetEfficiency += m.assetEfficiency;
          acc.roa += m.roa;
          acc.operatingCost += m.operatingCostRate;
          acc.incomeTax += m.incomeTaxRate;
          acc.inheritanceTax += m.inheritanceTaxRate;
          acc.borrowing += m.borrowingRate;
          acc.noi += m.noiRate;
          return acc;
        }, { assetEfficiency: 0, roa: 0, operatingCost: 0, incomeTax: 0, inheritanceTax: 0, borrowing: 0, noi: 0 });
        
        const count = allOwnerMetrics.length;
        averages.assetEfficiency = totals.assetEfficiency / count;
        averages.roa = totals.roa / count;
        averages.operatingCost = totals.operatingCost / count;
        averages.incomeTax = totals.incomeTax / count;
        averages.inheritanceTax = totals.inheritanceTax / count;
        averages.borrowing = totals.borrowing / count;
        averages.noi = totals.noi / count;
      }
      
      return averages;
    }
    
    // 全オーナーの平均値を取得（設定により取得方法を切替）
    let allOwnersAverages = calculateAllOwnersAverages(allOwnersData || { owners: [], properties: [] });
    try {
      const mode = (config && typeof config.averageMode === 'string') ? config.averageMode : 'compute';
      if (mode === 'savedField') {
        // 自アプリ（現在レコード）の平均値フィールドから転記
        const rec = currentAppRecord || {};
        const readCurrentNumber = (fieldCode) => {
          if (!fieldCode) return 0;
          const f = rec[fieldCode];
          if (f && typeof f === 'object' && f !== null && 'value' in f) return parseFloat(f.value) || 0;
          return parseFloat(rec[fieldCode]) || 0;
        };
        const ae = readCurrentNumber(config?.avgAssetEfficiencyField);
        const roaAvg = readCurrentNumber(config?.avgRoaField);
        const it = readCurrentNumber(config?.avgIncomeTaxField);
        const op = readCurrentNumber(config?.avgOperatingCostField);
        const noiAvg = readCurrentNumber(config?.avgNoiField);
        allOwnersAverages = { assetEfficiency: ae, roa: roaAvg, operatingCost: op, incomeTax: it, inheritanceTax: 0, borrowing: 0, noi: noiAvg };
      }
    } catch (e) {
      console.warn('平均の取得方法切替で例外が発生しました。computeにフォールバックします。', e);
    }

    const roaCurrent = totalInheritanceValue > 0 ? (totalIncome / totalInheritanceValue) * 100 : 0;
    const operatingCostCurrent = totalFullRent > 0 ? (totalOperatingCost / totalFullRent) * 100 : 0;
    // 資産効率(現状) = 実勢価格合計 ÷ 相続税評価額合計 × 100
    const assetEfficiencyCurrent = totalInheritanceValue > 0 ? (totalMarketPrice / totalInheritanceValue) * 100 : 0;
    
    // NOI率の計算: (NOI / 満室賃料) * 100, NOI = 実質収入 - 運営コスト合計
    const totalNoi = totalNetIncome - totalOperatingCost;
    const noiRateCurrent = totalFullRent > 0 ? (totalNoi / totalFullRent) * 100 : 0;
    
    // 所得税・相続税・借り入れ状況の計算
    let incomeTaxable = 0;
    let inheritanceTaxRateValue = 0;
    let borrowingRateValue = 0;

    if (ownerRecord) {
        const totalExpenses = parseFloat(ownerRecord.annual_management_fee?.value || 0) +
                              parseFloat(ownerRecord.land_property_tax?.value || 0) +
                              parseFloat(ownerRecord.building_property_tax?.value || 0) +
                              parseFloat(ownerRecord.long_term_repair_cost?.value || 0) +
                              parseFloat(ownerRecord.maintenance_cost?.value || 0) +
                              parseFloat(ownerRecord.loan_interest?.value || 0) +
                              parseFloat(ownerRecord.depreciation?.value || 0) +
                              parseFloat(ownerRecord.annual_insurance_premium?.value || 0);
        incomeTaxable = parseFloat(ownerRecord.annual_rent?.value || 0) - totalExpenses;

        inheritanceTaxRateValue = parseFloat(ownerRecord.inheritance_tax_rate?.value || 0);
        borrowingRateValue = parseFloat(ownerRecord.borrowing_rate?.value || 0);
    }

    // 簡易的な税率計算ロジック
    let incomeTaxRate = 0;
    if (incomeTaxable > 40000000) incomeTaxRate = 45;
    else if (incomeTaxable > 18000000) incomeTaxRate = 40;
    else if (incomeTaxable > 9000000) incomeTaxRate = 33;
    else if (incomeTaxable > 6950000) incomeTaxRate = 23;
    else if (incomeTaxable > 3300000) incomeTaxRate = 20;
    else if (incomeTaxable > 1950000) incomeTaxRate = 10;
    else if (incomeTaxable > 0) incomeTaxRate = 5;


    return {
        assetEfficiency: { current: assetEfficiencyCurrent, average: allOwnersAverages.assetEfficiency, forecast: assetEfficiencyCurrent },
        roa: { current: roaCurrent, average: allOwnersAverages.roa, forecast: roaCurrent },
        incomeTax: { current: incomeTaxRate, average: allOwnersAverages.incomeTax, forecast: incomeTaxRate },
        inheritanceTax: { current: inheritanceTaxRateValue, average: allOwnersAverages.inheritanceTax, forecast: inheritanceTaxRateValue },
        borrowing: { current: borrowingRateValue, average: allOwnersAverages.borrowing, forecast: borrowingRateValue },
        operatingCost: { current: operatingCostCurrent, average: allOwnersAverages.operatingCost, forecast: operatingCostCurrent },
        noi: { current: noiRateCurrent, average: allOwnersAverages.noi, forecast: noiRateCurrent },
        // タブに渡す詳細データ（正規化済み）
        propertyDetails: normalizedProps,
        ownerDetails: ownerRecord,
        // 所得税計算結果を追加
        calculatedIncomeTaxable: incomeTaxable,
        calculatedIncomeTaxRate: incomeTaxRate,
    };
  }


  // 初期描画時のプラグイン幅を固定して、タブ切替時の横幅揺れを防止
  function lockAppWidth(containerEl) {
    if (!containerEl) return;
    requestAnimationFrame(() => {
      // 固定幅を強制設定（CSSと同じ値）
      containerEl.style.width = '1400px';
      containerEl.style.minWidth = '1400px';
      containerEl.style.maxWidth = '1400px';
      containerEl.style.boxSizing = 'border-box';
    });
  }

  function mountApp(spaceRoot, appData) {
    buildUI(spaceRoot, appData);
    // 幅を1400pxで確実に固定
    const container = spaceRoot.querySelector('.container');
    lockAppWidth(container);
    initializeCharts(appData);
    setupEventListeners();
    setupUiEvents();
    setupCrossTabSync();
    updateTable();
    setTimeout(() => {
        if (radarChart) radarChart.resize();
        if (barChart) barChart.resize();
    }, 0);
  }

  function buildUI(spaceRoot, appData) {
    spaceRoot.innerHTML = '';
    spaceRoot.classList.add('bi-dashboard-plugin'); // プレフィックス用クラス

    // コンテナ要素を作成（1400px幅の適用のため）
    const container = document.createElement('div');
    container.className = 'container';

    const top = document.createElement('div');
    top.className = 'top-section';
    top.appendChild(createTableSection(appData));
    top.appendChild(createChartSection());
    top.appendChild(createHelpSection()); // 説明欄を追加

    const bottom = document.createElement('div');
    bottom.className = 'bottom-section';
    const tabsBar = createTabsBar();
    bottom.appendChild(tabsBar);

    // タブコンテンツ
    const roa = createRoaTab(appData); roa.id = 'roaTab';
    const operatingCost = createOperatingCostTab(appData); operatingCost.id = 'operatingCostTab';
    const incomeTax = createIncomeTaxTab(appData); incomeTax.id = 'incomeTaxTab';
    const inheritanceTax = createInheritanceTaxTab(appData.inheritanceTax); inheritanceTax.id = 'inheritanceTaxTab';
    const borrowing = createBorrowingTab(appData.borrowing); borrowing.id = 'borrowingTab';

    bottom.appendChild(roa);
    bottom.appendChild(operatingCost);
    bottom.appendChild(incomeTax);
    bottom.appendChild(inheritanceTax);
    bottom.appendChild(borrowing);

    // コンテナに要素を追加
    container.appendChild(top);
    container.appendChild(bottom);
    
    // spaceRootにコンテナを追加
    spaceRoot.appendChild(container);
  }

  function createTableSection(appData) {
    const section = document.createElement('div');
    section.className = 'table-section';
    const rows = CHART_LABELS.map((label, i) => {
        const metricKey = METRICS[i];
        const v = appData[metricKey];
        const avgText = averagesPending ? '集計中' : String(Math.round(v.average)) + '%';
        return `<tr>
            <td>${label}</td>
            <td>${String(Math.round(v.current))}%</td>
            <td>${avgText}</td>
            <td>${String(Math.round(v.forecast))}%</td>
        </tr>`;
    }).join('');
    section.innerHTML = `
        <div class="table-container">
            <table id="dataTable">
                <thead>
                    <tr>
                        <th>項目名</th>
                        <th>現状</th>
                        <th>平均</th>
                        <th>試算</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
    return section;
  }

  function createChartSection() {
    const section = document.createElement('div');
    section.className = 'chart-section';
    section.innerHTML = `
        <div class="chart-container">
            <div class="chart-controls">
                <button id="chart-toggle-btn" class="chart-toggle-button">レーダーチャート</button>
                <div class="compression-control">
                    <input type="checkbox" id="compressionCheckbox" class="compression-checkbox">
                    <label for="compressionCheckbox">平均を1として比較する</label>
                </div>
                <div class="grade-control">
                    <input type="checkbox" id="gradeCheckbox" class="grade-checkbox" checked>
                    <label for="gradeCheckbox">成績で表示する</label>
                </div>
            </div>
            <div class="chart-item">
                <div id="radarChartContainer">
                    <div class="chart-canvas-wrap"><canvas id="radarChart"></canvas></div>
                </div>
                <div id="barChartContainer" style="display: none;">
                    <div class="chart-canvas-wrap"><canvas id="barChart"></canvas></div>
                </div>
            </div>
        </div>
    `;
    return section;
  }

  function createHelpSection() {
    const section = document.createElement('div');
    section.className = 'help-section';

    // 動的に成績基準テーブルを生成
    const thresholds = getReadableThresholds();
    const gradeTablesHtml = renderThresholdTablesForHelpSection(thresholds);

    section.innerHTML = `
        <h3>ℹ️ 表示項目について</h3>
        
        <h4>データの見方</h4>
        <p><strong>現状：</strong>現在の物件データから算出</p>
        <p><strong>平均：</strong>全オーナーの平均値</p>
        <p><strong>試算：</strong>試算欄に入力した値から算出された値</p>

        <h4>成績基準</h4>
        ${gradeTablesHtml}
        <p><small>※基準はプラグイン設定画面で変更できます</small></p>

        <h4>指標の算出方法</h4>
        <p><strong>資産効率：</strong><br>実勢価格 ÷ 相続税評価額 × 100</p>
        <p><strong>ROA：</strong><br>収支 ÷ 相続税評価額 × 100</p>
        <p><strong>運営コスト率：</strong><br>運営コスト合計 ÷ 満室賃料 × 100</p>
        <p><strong>NOI率：</strong><br>(実質収入 - 運営コスト) ÷ 満室賃料 × 100</p>
        <p><strong>所得税率：</strong><br>課税所得に応じた累進税率</p>

        <h4>データ取得元</h4>
        <ul>
            <li>物件データ：物件マスタアプリ</li>
            <li>オーナーデータ：オーナーマスタアプリ</li>
            <li>平均値：全オーナーから自動算出</li>
        </ul>
    `;
    return section;
  }

  function createTabsBar() {
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    const items = [
        { key: 'roa', label: '資産効率・ROA', active: true },
        { key: 'operatingCost', label: '運営コスト率・NOI' },
        { key: 'incomeTax', label: '所得税率' }
        // 将来復活予定: { key: 'inheritanceTax', label: '相続税率' },
        // 将来復活予定: { key: 'borrowing', label: '借り入れ状況' }
    ];
    tabs.innerHTML = items.map(i => `
        <button class="tab-button${i.active ? ' active' : ''}" data-tab="${i.key}">${i.label}</button>
    `).join('');
    return tabs;
  }

  // チャートの初期化
  function initializeCharts(appData) {
    try {
      console.log('Initializing charts with data:', appData);
      
      const radarCanvas = document.getElementById('radarChart');
      const barCanvas = document.getElementById('barChart');
      
      if (!radarCanvas || !barCanvas) {
        console.error('Chart canvas elements not found');
        return;
      }
      
      const radarCtx = radarCanvas.getContext('2d');
      const barCtx = barCanvas.getContext('2d');

      // データセットを安全に作成
      const radarDatasets = FIELDS.map((f, i) => {
        const data = getChartValues(f, appData);
        console.log(`Radar dataset ${i} (${f}) data:`, data);
        return {
          label: String(DATASET_STYLE[i].label), // 文字列であることを保証
          data: data.map(val => Number(val) || 0), // 数値であることを保証
          borderColor: String(DATASET_STYLE[i].border),
          backgroundColor: String(DATASET_STYLE[i].bgRadar),
          borderWidth: Number(DATASET_STYLE[i].bwRadar),
          hidden: (f === 'average' && averagesPending) ? true : false
        };
      });

      const barDatasets = FIELDS.map((f, i) => {
        const data = getChartValues(f, appData);
        console.log(`Bar dataset ${i} (${f}) data:`, data);
        return {
          label: String(DATASET_STYLE[i].label), // 文字列であることを保証
          data: data.map(val => Number(val) || 0), // 数値であることを保証
          backgroundColor: String(DATASET_STYLE[i].bgBar),
          borderColor: String(DATASET_STYLE[i].border),
          borderWidth: Number(DATASET_STYLE[i].bwBar),
          hidden: (f === 'average' && averagesPending) ? true : false
        };
      });

      console.log('Chart labels:', CHART_LABELS);
      
      radarChart = new Chart(radarCtx, {
          type: 'radar',
          data: { 
            labels: CHART_LABELS.map(label => String(label)), // 文字列であることを保証
            datasets: radarDatasets 
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              resizeDelay: 100,
              scales: { 
                r: { 
                  beginAtZero: true, 
                  max: 100, 
                  min: 0,
                  type: 'radialLinear'
                } 
              },
              plugins: { 
                legend: { 
                  position: 'bottom' 
                } 
              }
          }
      });

      barChart = new Chart(barCtx, {
          type: 'bar',
          data: { 
            labels: CHART_LABELS.map(label => String(label)), // 文字列であることを保証
            datasets: barDatasets 
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              resizeDelay: 100,
              scales: { 
                y: { 
                  beginAtZero: true, 
                  max: 100, 
                  min: 0,
                  type: 'linear'
                } 
              },
              plugins: { 
                legend: { 
                  position: 'bottom' 
                } 
              }
          }
      });
      
      console.log('Charts initialized successfully');
      
      // 初期化後にY軸設定を適用
      updateChartScales();
    } catch (error) {
      console.error('Error initializing charts:', error);
      console.error('Error stack:', error.stack);
    }
  }

  // イベントリスナーの設定（入力値→データ反映）
  function setupEventListeners() {
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', function() {
            const parsed = parseInputId(this.id);
            if (!parsed) return;
            const { metric, field } = parsed;
            data[metric][field] = parseFloat(this.value) || 0;
            updateTable();
            updateCharts();
        });
    });
  }

  // UIイベント（タブ切替・チャート切替）
  function setupUiEvents() {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => {
            openTabByKey(btn.dataset.tab);
        });
    });

    const chartToggleBtn = document.getElementById('chart-toggle-btn');
    if (chartToggleBtn) {
      chartToggleBtn.addEventListener('click', () => {
        toggleChart();
      });
    }

    document.querySelectorAll('.compression-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            toggleCompressionMode();
        });
    });

    document.querySelectorAll('.grade-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
          toggleGradeMode();
      });
    });
  }

  // タブ間連携（所得税タブ→トップ表/チャート）
  function setupCrossTabSync() {
    document.addEventListener('incomeTax:taxRateUpdated', (e) => {
        const detail = e && e.detail ? e.detail : {};
        const rowType = detail.rowType;
        const taxRate = Number(detail.taxRate) || 0;
        if (rowType === 'Current') {
            data.incomeTax.current = taxRate;
        } else if (rowType === 'Forecast') {
            data.incomeTax.forecast = taxRate;
        } else if (rowType === 'Average') {
            data.incomeTax.average = taxRate;
        }
        updateTable();
        updateCharts();
    });

    // 直接呼び出し用のグローバルフック（万一イベントが届かない環境向け）
    window.setIncomeTaxRate = function(rowKey, rate) {
        const key = (rowKey || '').toLowerCase();
        const val = Number(rate) || 0;
        if (key === 'current') data.incomeTax.current = val;
        if (key === 'forecast') data.incomeTax.forecast = val;
        if (key === 'average') data.incomeTax.average = val;
        updateTable();
        updateCharts();
    };

    document.addEventListener('operatingCost:rateUpdated', (e) => {
        const detail = e && e.detail ? e.detail : {};
        const rowType = detail.rowType;
        const rate = Number(detail.rate) || 0;
        if (rowType === 'Current') {
            data.operatingCost.current = rate;
        } else if (rowType === 'Forecast') {
            data.operatingCost.forecast = rate;
        }
        updateTable();
        updateCharts();
    });
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function parseInputId(id) {
    for (const f of FIELDS) {
        const suf = cap(f);
        if (id.endsWith(suf)) {
            const metric = id.slice(0, -suf.length);
            if (METRICS.includes(metric)) return { metric, field: f };
        }
    }
    return null;
  }

  // テーブル更新関数
  function updateTable() {
    const rows = document.querySelectorAll('#dataTable tbody tr');
    rows.forEach((row, i) => {
        const key = METRICS[i];
        if (!key || !data[key]) return; // dataの存在をチェック
        const v = data[key];
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) return;
        cells[1].textContent = String(Math.round(v.current)) + '%';
        cells[2].textContent = averagesPending ? '集計中' : String(Math.round(v.average)) + '%';
        cells[3].textContent = String(Math.round(v.forecast)) + '%';
    });
  }

  // チャート更新関数
  function getChartValues(field, appData = data) {
    try {
      if (gradeMode) {
        // ★成績モード: 数値を成績(1-5)に変換
        const grades = METRICS.map(k => {
          if (!appData[k]) {
            console.warn(`Missing data for metric: ${k}`);
            return 1;
          }
          const value = appData[k][field];
          if (value === null || value === undefined) {
            console.warn(`Missing value for ${k}.${field}:`, value);
            return 1;
          }
          return calculateGradeModule(k, value);
        });
        console.log('Grade mode values:', grades);
        return grades;
      } else if (compressionMode) {
        // 圧縮モード: 平均を1として比率を表示（数値で）
        return METRICS.map(k => {
          if (!appData[k]) {
            console.warn(`Missing data for metric: ${k}`);
            return 0;
          }
          const average = parseFloat(appData[k].average) || 0;
          const current = parseFloat(appData[k].current) || 0;
          const forecast = parseFloat(appData[k].forecast) || 0;
          
          if (field === 'current') {
            return average > 0 ? current / average : 0; // 現状 / 平均
          } else if (field === 'forecast') {
            return average > 0 ? forecast / average : 0; // 試算 / 平均
          } else {
            return 1; // 平均は基準なので1
          }
        });
      } else {
        // 通常モード: そのままの値を表示
        return METRICS.map(k => {
          if (!appData[k] || appData[k][field] === null || appData[k][field] === undefined) {
            console.warn(`Missing value for ${k}.${field}`);
            return 0;
          }
          return parseFloat(appData[k][field]) || 0;
        });
      }
    } catch (error) {
      console.error('Error in getChartValues:', error);
      console.log('appData:', appData, 'field:', field, 'gradeMode:', gradeMode, 'compressionMode:', compressionMode);
      // エラー時はデフォルト値を返す
      return METRICS.map(() => gradeMode ? 1 : 0);
    }
  }

  function updateCharts() {
    try {
      // Y軸設定を更新
      updateChartScales();
      
      FIELDS.forEach((f, i) => {
        const vals = getChartValues(f);
        if (vals && Array.isArray(vals) && vals.length === METRICS.length) {
          // データを数値に変換して安全性を確保
          const safeVals = vals.map(val => Number(val) || 0);
          const shouldHide = (f === 'average' && averagesPending) ? true : false;
          
          if (radarChart && radarChart.data && radarChart.data.datasets && radarChart.data.datasets[i]) {
            radarChart.data.datasets[i].data = safeVals;
            radarChart.data.datasets[i].hidden = shouldHide;
          }
          if (barChart && barChart.data && barChart.data.datasets && barChart.data.datasets[i]) {
            barChart.data.datasets[i].data = safeVals;
            barChart.data.datasets[i].hidden = shouldHide;
          }
        } else {
          console.warn(`Invalid chart values for field ${f}:`, vals);
        }
      });
      
      if (radarChart && radarChart.update) {
        radarChart.update();
      }
      if (barChart && barChart.update) {
        barChart.update();
      }
    } catch (error) {
      console.error('Error updating charts:', error);
    }
  }

  // タブ切り替え（キー指定）
  function openTabByKey(key) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));
    const content = document.querySelector(`.tab-content[data-tab="${key}"]`) || document.getElementById(`${key}Tab`);
    const button = document.querySelector(`.tab-button[data-tab="${key}"]`);
    if (content) content.classList.add('active');
    if (button) button.classList.add('active');
  }

  // チャート切り替え
  function toggleChart() {
    const radar = document.getElementById('radarChartContainer');
    const bar = document.getElementById('barChartContainer');
    const toggleBtn = document.getElementById('chart-toggle-btn');
    if (!radar || !bar || !toggleBtn) return;

    if (currentChartType === 'radar') {
        // レーダーから棒へ
        currentChartType = 'bar';
        radar.style.display = 'none';
        bar.style.display = 'block';
        toggleBtn.textContent = '棒グラフ';
        requestAnimationFrame(() => { if (barChart) barChart.resize(); });
    } else {
        // 棒からレーダーへ
        currentChartType = 'radar';
        bar.style.display = 'none';
        radar.style.display = 'block';
        toggleBtn.textContent = 'レーダーチャート';
        requestAnimationFrame(() => { if (radarChart) radarChart.resize(); });
    }
  }

  // 圧縮モード切り替え
  function toggleCompressionMode() {
    const checkbox = document.querySelector('.compression-checkbox');
    if (checkbox) {
      compressionMode = checkbox.checked;
    }
    
    // 排他制御: 圧縮モードがONになったら成績モードをOFFにする
    if (compressionMode) {
      const gradeCb = document.querySelector('.grade-checkbox');
      if (gradeCb) {
        gradeCb.checked = false;
      }
      gradeMode = false;
    }
    
    // チャートのY軸設定を更新
    updateChartScales();
    
    // チャートを更新
    updateCharts();
  }

  // ★数値を成績に変換する関数（モジュール版）
  function calculateGrade(metric, value) { return calculateGradeModule(metric, value); }

  function renderThresholdTablesForHelpSection(map) {
    const labelMap = {
      assetEfficiency: '資産効率(%)',
      roa: 'ROA(%)',
      incomeTax: '所得税率(%)',
      operatingCost: '運営コスト率(%)',
      noi: 'NOI率(%)'
    };

    const sections = Object.keys(map).map(k => {
      if (!map[k] || map[k].length === 0) return '';
      
      const rows = map[k].map(r => {
        const cond = conditionText(r.min, r.includeLower, r.max, r.includeUpper);
        return `<tr>
          <td>${escapeHtml(r.gradeLabel)}</td>
          <td>${cond}</td>
        </tr>`;
      }).join('');

      return `
        <h4>${labelMap[k] || k}</h4>
        <table class="score-table">
          <thead><tr><th>成績</th><th>条件</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }).join('');
    return sections;
  }

  function conditionText(min, incL, max, incU) {
    const toMin = incL ? '以上' : '超過';
    const toMax = incU ? '以下' : '未満';
    const isMinInf = (min === -Infinity);
    const isMaxInf = (max === Infinity);
    if (isMinInf && isMaxInf) return '制限なし';
    if (isMinInf) return `${formatNumber(max)}${toMax}`;
    if (isMaxInf) return `${formatNumber(min)}${toMin}`;
    return `${formatNumber(min)}${toMin} かつ ${formatNumber(max)}${toMax}`;
  }

  function getReadableThresholds() {
    const result = {};
    const all = getGradeThresholdsSafe();
    Object.keys(all).forEach(metric => {
      const arr = Array.isArray(all[metric]) ? all[metric] : [];
      result[metric] = arr.map(t => ({
        gradeLabel: String(t.score ?? ''),
        min: t.min,
        max: t.max,
        includeLower: Boolean(t.includeLower),
        includeUpper: Boolean(t.includeUpper),
      }));
    });
    return result;
  }

  function getGradeThresholdsSafe() {
    try {
      return getGradeThresholdsModule();
    } catch (_) {
      try {
        const settingsRaw = (typeof config?.gradeSettings === 'string') ? JSON.parse(config.gradeSettings) : (config?.gradeSettings || {});
        return reconstructThresholdsFromSettings(settingsRaw);
      } catch (_) {
        return {};
      }
    }
  }

  function reconstructThresholdsFromSettings(gradeSettings) {
    const out = {};
    const metrics = ['assetEfficiency','roa','incomeTax','operatingCost','noi'];
    metrics.forEach(metric => {
      const m = gradeSettings?.[metric];
      if (!m || !Array.isArray(m.levels)) return;
      const includeLower = (typeof m.includeLower === 'boolean') ? m.includeLower : true;
      const includeUpper = (typeof m.includeUpper === 'boolean') ? m.includeUpper : false;
      out[metric] = m.levels.map(l => ({
        score: parseInt(l.grade, 10) || '',
        min: parseBoundForDisplay(l.min, true),
        max: parseBoundForDisplay(l.max, false),
        includeLower: (l.minType === 'gte') ? true : (l.minType === 'gt') ? false : includeLower,
        includeUpper: (l.maxType === 'lte') ? true : (l.maxType === 'lt') ? false : includeUpper,
      }));
    });
    return out;
  }

  function parseBoundForDisplay(value, isMin) {
    if (value === '' || value === null || value === undefined) return isMin ? -Infinity : Infinity;
    const n = Number(value);
    return isNaN(n) ? (isMin ? -Infinity : Infinity) : n;
  }

  function formatNumber(v) {
    if (v === Infinity) return '∞';
    if (v === -Infinity) return '-∞';
    if (typeof v !== 'number') return String(v ?? '');
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  // ★成績表示モード切り替え
  function toggleGradeMode() {
    const checkbox = document.querySelector('.grade-checkbox');
    if (checkbox) {
      gradeMode = checkbox.checked;
    }
    
    // 排他制御: 成績モードがONになったら圧縮モードをOFFにする
    if (gradeMode) {
      const compCb = document.querySelector('.compression-checkbox');
      if (compCb) {
        compCb.checked = false;
      }
      compressionMode = false;
    }
    updateChartScales();
    updateCharts();
  }

  // チャートのY軸設定を更新
  function updateChartScales() {
    try {
      if (gradeMode) {
        // ★成績モード: 軸の最小値を常に0に固定、上限は最大成績に合わせる
        const maxGrade = getMaxGradeScore();
        if (radarChart && radarChart.options && radarChart.options.scales && radarChart.options.scales.r) {
          radarChart.options.scales.r.max = maxGrade;
          radarChart.options.scales.r.min = 0;
          radarChart.options.scales.r.beginAtZero = true;
          if (!radarChart.options.scales.r.ticks) radarChart.options.scales.r.ticks = {};
          radarChart.options.scales.r.ticks.suggestedMin = 0;
          radarChart.options.scales.r.ticks.stepSize = 1;
        }
        if (barChart && barChart.options && barChart.options.scales && barChart.options.scales.y) {
          barChart.options.scales.y.max = maxGrade;
          barChart.options.scales.y.min = 0;
          barChart.options.scales.y.beginAtZero = true;
          if (!barChart.options.scales.y.ticks) barChart.options.scales.y.ticks = {};
          barChart.options.scales.y.ticks.suggestedMin = 0;
          barChart.options.scales.y.ticks.stepSize = 1;
        }
      } else if (compressionMode) {
      // 圧縮モード: 平均を1として中央に配置
      const maxValue = Math.max(...METRICS.map(k => {
        const current = data[k].current;
        const forecast = data[k].forecast;
        const average = data[k].average;
        const currentRatio = average > 0 ? current / average : 0;
        const forecastRatio = average > 0 ? forecast / average : 0;
        return Math.max(currentRatio, forecastRatio, 1);
      }));
      
      const minValue = Math.min(...METRICS.map(k => {
        const current = data[k].current;
        const forecast = data[k].forecast;
        const average = data[k].average;
        const currentRatio = average > 0 ? current / average : 0;
        const forecastRatio = average > 0 ? forecast / average : 0;
        return Math.min(currentRatio, forecastRatio, 1);
      }));
      
      // 1を中央に配置するため、上下対称に設定
      const range = Math.max(maxValue - 1, 1 - minValue);
      const padding = Math.max(range * 0.2, 0.2); // 20%の余裕
        const chartMax = 1 + range + padding;
        const chartMin = Math.max(1 - range - padding, 0);
        
        if (radarChart && radarChart.options && radarChart.options.scales && radarChart.options.scales.r) {
          radarChart.options.scales.r.max = chartMax;
          radarChart.options.scales.r.min = chartMin;
          radarChart.options.scales.r.beginAtZero = false;
        }
        if (barChart && barChart.options && barChart.options.scales && barChart.options.scales.y) {
          barChart.options.scales.y.max = chartMax;
          barChart.options.scales.y.min = chartMin;
          barChart.options.scales.y.beginAtZero = false;
        }
      } else {
        // 通常モード: レーダーチャートは固定上限100、棒グラフは自動調整
        if (radarChart && radarChart.options && radarChart.options.scales && radarChart.options.scales.r) {
          radarChart.options.scales.r.max = 100;
          radarChart.options.scales.r.min = 0;
          radarChart.options.scales.r.beginAtZero = true;
        }
        
        if (barChart && barChart.options && barChart.options.scales && barChart.options.scales.y) {
          // 棒グラフのみデータに応じて自動調整
          const maxValue = Math.max(...METRICS.map(k => {
            const current = parseFloat(data[k].current) || 0;
            const forecast = parseFloat(data[k].forecast) || 0;
            const average = parseFloat(data[k].average) || 0;
            return Math.max(current, forecast, average);
          }));
          
          const minValue = Math.min(...METRICS.map(k => {
            const current = parseFloat(data[k].current) || 0;
            const forecast = parseFloat(data[k].forecast) || 0;
            const average = parseFloat(data[k].average) || 0;
            return Math.min(current, forecast, average);
          }));
          
          // 上下に余裕を持たせる
          const padding = Math.max((maxValue - minValue) * 0.1, 5);
          const chartMax = maxValue + padding;
          const chartMin = Math.max(minValue - padding, 0);
          
          barChart.options.scales.y.max = chartMax;
          barChart.options.scales.y.min = chartMin;
          barChart.options.scales.y.beginAtZero = chartMin === 0;
        }
      }
    } catch (error) {
      console.error('Error updating chart scales:', error);
    }
  }
})();

