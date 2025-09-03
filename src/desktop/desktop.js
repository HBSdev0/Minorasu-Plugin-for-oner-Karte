import { createRoaTab } from './tabs/roaTab.js';
import { createOperatingCostTab } from './tabs/operatingCostTab.js';
import { createIncomeTaxTab } from './tabs/incomeTaxTab.js';
import { createInheritanceTaxTab } from './tabs/inheritanceTaxTab.js';
import { createBorrowingTab } from './tabs/borrowingTab.js';

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

  // 汎用設定
  const METRICS = ['assetEfficiency','roa','incomeTax','operatingCost','noi'];
  // 将来復活予定: 'inheritanceTax','borrowing'
  const FIELDS = ['current','average','forecast'];
  const CHART_LABELS = ['資産効率(%)','ROA(%)','所得税率(%)','運営コスト率(%)','NOI率(%)'];
  // 将来復活予定: '相続税率(%)','借り入れ状況(%)'
  const DATASET_STYLE = [
      { label: '現状', border: 'rgb(52, 152, 219)', bgRadar: 'rgba(52, 152, 219, 0.2)', bgBar: 'rgba(52, 152, 219, 0.8)', bwRadar: 2, bwBar: 1 },
      { label: '平均', border: 'rgb(231, 76, 60)', bgRadar: 'rgba(231, 76, 60, 0.2)', bgBar: 'rgba(231, 76, 60, 0.8)', bwRadar: 2, bwBar: 1 },
      { label: '試算', border: 'rgb(46, 204, 113)', bgRadar: 'rgba(46, 204, 113, 0.2)', bgBar: 'rgba(46, 204, 113, 0.8)', bwRadar: 2, bwBar: 1 }
  ];

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

  // シーク法で全レコードを取得する関数
  async function fetchAllRecordsWithSeek(appId, query = '', batchSize = 500) {
    const allRecords = [];
    let lastRecordId = null;
    let hasMore = true;
    let totalFetched = 0;
    let retryCount = 0;
    const maxRetries = 3;

    console.log(`BI Dashboard Plugin: アプリ${appId}の全レコード取得を開始 (シーク法, バッチサイズ: ${batchSize})`);

    while (hasMore) {
      try {
        const params = {
          app: appId,
          query: query,
          fields: [], // 全フィールドを取得
          totalCount: true
        };

        // シーク法: 前回の最後のレコードIDより大きいIDのレコードを取得
        if (lastRecordId) {
          params.query = query ? `${query} and $id > ${lastRecordId}` : `$id > ${lastRecordId}`;
        }

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

  // 並列で複数アプリの全レコードを取得
  async function fetchAllRecordsParallel(appIds, queries = {}, batchSize = 500) {
    const promises = appIds.map(appId => 
      fetchAllRecordsWithSeek(appId, queries[appId] || '', batchSize)
    );
    
    const results = await Promise.all(promises);
    
    // 結果をアプリIDをキーとしたオブジェクトに変換
    const resultMap = {};
    appIds.forEach((appId, index) => {
      resultMap[appId] = results[index];
    });
    
    return resultMap;
  }

  async function fetchDataAndMountApp(spaceRoot, currentRecord) {
    try {
        // ローディングインジケータを表示
        showLoadingIndicator(spaceRoot);

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

        // 全オーナーのデータを取得する関数（シーク法使用）
        async function fetchAllOwnersData() {
          try {
            console.log('BI Dashboard Plugin: 全オーナーデータの並列取得を開始');
            
            // 並列で全レコードを取得（バッチサイズを調整）
            const allData = await fetchAllRecordsParallel([ownerAppId, propertyAppId], queries, 500);
            
            return {
              owners: allData[ownerAppId]?.records || [],
              properties: allData[propertyAppId]?.records || []
            };
          } catch (e) {
            console.error('全オーナーデータの取得に失敗:', e);
            return { owners: [], properties: [] };
          }
        }

        // Kintone APIからデータを並行して取得（フォールバック付き）
        const [propertyResponse, ownerResponse, allOwnersData] = await Promise.all([
            fetchWithQueryFallback(propertyAppId, config.propertyOwnerId, currentOwnerId),
            fetchWithQueryFallback(ownerAppId, config.ownerId, currentOwnerId),
            fetchAllOwnersData()
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

        // 取得したデータを加工
        const processedData = processKintoneData(propertyResponse.records, ownerResponse.records, allOwnersData);
        data = processedData; // グローバル変数に格納

        // UIを構築してアプリをマウント
        mountApp(spaceRoot, processedData);

    } catch (error) {
        console.error('Failed to fetch or process kintone data:', error);
        // エラー発生時の処理をここに記述（例: エラーメッセージを表示）
        spaceRoot.innerHTML = '<p>データの取得に失敗しました。</p>';
    }
  }

  // Kintoneのデータをアプリ用に加工する
  function processKintoneData(propertyRecords, ownerRecords, allOwnersData) {
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
    let totalIncome = 0;
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
        
        // このオーナーのROAと運営コスト率を計算
        let ownerTotalIncome = 0;
        let ownerTotalInheritanceValue = 0;
        let ownerTotalOperatingCost = 0;
        let ownerTotalFullRent = 0;
        
        ownerProperties.forEach(prop => {
          const propIncome = parseFloat(prop[config.propIncome]?.value || 0);
          const propInheritanceValue = parseFloat(prop[config.propInheritanceTaxVal]?.value || 0);
          const propFullRent = parseFloat(prop[config.propFullRent]?.value || 0);
          
          const propOperatingCost = parseFloat(prop[config.propPropTax]?.value || 0) +
                                   parseFloat(prop[config.propMgmtFee]?.value || 0) +
                                   parseFloat(prop[config.propBldgRepair]?.value || 0) +
                                   parseFloat(prop[config.propRestoration]?.value || 0) +
                                   parseFloat(prop[config.propMaint]?.value || 0);
          
          ownerTotalIncome += propIncome;
          ownerTotalInheritanceValue += propInheritanceValue;
          ownerTotalOperatingCost += propOperatingCost;
          ownerTotalFullRent += propFullRent;
        });
        
        // オーナーレベルの指標を計算
        const ownerRoa = ownerTotalInheritanceValue > 0 ? (ownerTotalIncome / ownerTotalInheritanceValue) * 100 : 0;
        const ownerOperatingCostRate = ownerTotalFullRent > 0 ? (ownerTotalOperatingCost / ownerTotalFullRent) * 100 : 0;
        
        // NOI率の計算
        const ownerNoi = ownerTotalIncome - ownerTotalOperatingCost;
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
          acc.roa += m.roa;
          acc.operatingCost += m.operatingCostRate;
          acc.incomeTax += m.incomeTaxRate;
          acc.inheritanceTax += m.inheritanceTaxRate;
          acc.borrowing += m.borrowingRate;
          acc.noi += m.noiRate;
          return acc;
        }, { roa: 0, operatingCost: 0, incomeTax: 0, inheritanceTax: 0, borrowing: 0, noi: 0 });
        
        const count = allOwnerMetrics.length;
        averages.roa = totals.roa / count;
        averages.operatingCost = totals.operatingCost / count;
        averages.incomeTax = totals.incomeTax / count;
        averages.inheritanceTax = totals.inheritanceTax / count;
        averages.borrowing = totals.borrowing / count;
        averages.noi = totals.noi / count;
      }
      
      return averages;
    }
    
    // 全オーナーの平均値を取得
    const allOwnersAverages = calculateAllOwnersAverages(allOwnersData || { owners: [], properties: [] });

    const roaCurrent = totalInheritanceValue > 0 ? (totalIncome / totalInheritanceValue) * 100 : 0;
    const operatingCostCurrent = totalFullRent > 0 ? (totalOperatingCost / totalFullRent) * 100 : 0;
    
    // NOI率の計算: (NOI / 満室賃料) * 100
    const totalNoi = totalIncome - totalOperatingCost;
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
        assetEfficiency: { current: roaCurrent, average: allOwnersAverages.roa, forecast: roaCurrent },
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

    // コンテナ要素を作成（80%幅の適用のため）
    const container = document.createElement('div');
    container.className = 'container';

    const top = document.createElement('div');
    top.className = 'top-section';
    top.appendChild(createTableSection(appData));
    top.appendChild(createChartSection());

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
        return `<tr>
            <td>${label}</td>
            <td>${v.current.toFixed(1)}</td>
            <td>${v.average.toFixed(1)}</td>
            <td>${v.forecast.toFixed(1)}</td>
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
                <button class="chart-toggle-button active" data-chart="radar">レーダーチャート</button>
                <button class="chart-toggle-button" data-chart="bar">棒グラフ</button>
                <div class="compression-control">
                    <input type="checkbox" id="compressionCheckbox" class="compression-checkbox">
                    <label for="compressionCheckbox">平均を1として比較する</label>
                </div>
            </div>
            <div class="chart-item">
                <div id="radarChartContainer">
                    <h3>財務指標レーダーチャート</h3>
                    <div class="chart-canvas-wrap"><canvas id="radarChart"></canvas></div>
                </div>
                <div id="barChartContainer" style="display: none;">
                    <h3>財務指標棒グラフ</h3>
                    <div class="chart-canvas-wrap"><canvas id="barChart"></canvas></div>
                </div>
            </div>
        </div>
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
    const radarCtx = document.getElementById('radarChart').getContext('2d');
    const barCtx = document.getElementById('barChart').getContext('2d');

    const radarDatasets = FIELDS.map((f, i) => ({
        label: DATASET_STYLE[i].label,
        data: getChartValues(f, appData),
        borderColor: DATASET_STYLE[i].border,
        backgroundColor: DATASET_STYLE[i].bgRadar,
        borderWidth: DATASET_STYLE[i].bwRadar
    }));

    const barDatasets = FIELDS.map((f, i) => ({
        label: DATASET_STYLE[i].label,
        data: getChartValues(f, appData),
        backgroundColor: DATASET_STYLE[i].bgBar,
        borderColor: DATASET_STYLE[i].border,
        borderWidth: DATASET_STYLE[i].bwBar
    }));

    radarChart = new Chart(radarCtx, {
        type: 'radar',
        data: { labels: CHART_LABELS, datasets: radarDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            resizeDelay: 100,
            scales: { r: { beginAtZero: true, max: 100, min: 0 } },
            plugins: { legend: { position: 'bottom' } }
        }
    });

    barChart = new Chart(barCtx, {
        type: 'bar',
        data: { labels: CHART_LABELS, datasets: barDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            resizeDelay: 100,
            scales: { y: { beginAtZero: true, max: 100, min: 0 } },
            plugins: { legend: { position: 'bottom' } }
        }
    });
    
    // 初期化後にY軸設定を適用
    updateChartScales();
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

    document.querySelectorAll('.chart-toggle-button').forEach(btn => {
        btn.addEventListener('click', () => {
            switchChart(btn.dataset.chart);
        });
    });

    document.querySelectorAll('.compression-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            toggleCompressionMode();
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
        cells[1].textContent = v.current.toFixed(1);
        cells[2].textContent = v.average.toFixed(1);
        cells[3].textContent = v.forecast.toFixed(1);
    });
  }

  // チャート更新関数
  function getChartValues(field, appData = data) {
    if (compressionMode) {
      // 圧縮モード: 平均を基準として比率を表示（数値で）
      return METRICS.map(k => {
        const average = appData[k].average;
        const current = appData[k].current;
        const forecast = appData[k].forecast;
        
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
      return METRICS.map(k => appData[k][field]);
    }
  }

  function updateCharts() {
    // Y軸設定を更新
    updateChartScales();
    
    FIELDS.forEach((f, i) => {
        const vals = getChartValues(f);
        radarChart.data.datasets[i].data = vals;
        barChart.data.datasets[i].data = vals;
    });
    radarChart.update();
    barChart.update();
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
  function switchChart(chartType) {
    document.querySelectorAll('.chart-toggle-button').forEach(b => b.classList.remove('active'));
    const radar = document.getElementById('radarChartContainer');
    const bar = document.getElementById('barChartContainer');
    if (!radar || !bar) return;
    radar.style.display = 'none';
    bar.style.display = 'none';
    if (chartType === 'radar') {
        radar.style.display = 'block';
        const btn = document.querySelector('.chart-toggle-button[data-chart="radar"]');
        if (btn) btn.classList.add('active');
        requestAnimationFrame(() => { if (radarChart) { radarChart.resize(); } });
    } else {
        bar.style.display = 'block';
        const btn = document.querySelector('.chart-toggle-button[data-chart="bar"]');
        if (btn) btn.classList.add('active');
        requestAnimationFrame(() => { if (barChart) { barChart.resize(); } });
    }
  }

  // 圧縮モード切り替え
  function toggleCompressionMode() {
    const checkbox = document.querySelector('.compression-checkbox');
    if (checkbox) {
      compressionMode = checkbox.checked;
    }
    
    // チャートのY軸設定を更新
    updateChartScales();
    
    // チャートを更新
    updateCharts();
  }

  // チャートのY軸設定を更新
  function updateChartScales() {
    if (compressionMode) {
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
      
      if (radarChart) {
        radarChart.options.scales.r.max = chartMax;
        radarChart.options.scales.r.min = chartMin;
      }
      if (barChart) {
        barChart.options.scales.y.max = chartMax;
        barChart.options.scales.y.min = chartMin;
      }
    } else {
      // 通常モード: レーダーチャートは固定上限100、棒グラフは自動調整
      if (radarChart) {
        radarChart.options.scales.r.max = 100;
        radarChart.options.scales.r.min = 0;
      }
      
      if (barChart) {
        // 棒グラフのみデータに応じて自動調整
        const maxValue = Math.max(...METRICS.map(k => {
          const current = data[k].current;
          const forecast = data[k].forecast;
          const average = data[k].average;
          return Math.max(current, forecast, average);
        }));
        
        const minValue = Math.min(...METRICS.map(k => {
          const current = data[k].current;
          const forecast = data[k].forecast;
          const average = data[k].average;
          return Math.min(current, forecast, average);
        }));
        
        // 上下に余裕を持たせる
        const padding = Math.max((maxValue - minValue) * 0.1, 5);
        const chartMax = maxValue + padding;
        const chartMin = Math.max(minValue - padding, 0);
        
        barChart.options.scales.y.max = chartMax;
        barChart.options.scales.y.min = chartMin;
      }
    }
  }
})();

