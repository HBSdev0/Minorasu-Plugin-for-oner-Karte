jQuery.noConflict();
(function($) {
  'use strict';

  const PLUGIN_ID = kintone.$PLUGIN_ID;
  let config = kintone.plugin.app.getConfig(PLUGIN_ID);
  if (typeof config === 'string' && config.length > 0) {
    config = JSON.parse(config);
  }

  // DOM要素のキャッシュ
  const $spaceId = $('#spaceId');
  const $currentAppOwnerId = $('#currentAppOwnerId');
  const $ownerAppId = $('#ownerAppId');
  const $propertyAppId = $('#propertyAppId');
  const $ownerIdMappings = $('#ownerIdMappings');
  const $ownerFieldMappings = $('#ownerFieldMappings');
  const $propertyOwnerIdMappings = $('#propertyOwnerIdMappings');
  const $propertyNameMappings = $('#propertyNameMappings');
  const $propertyFieldMappings = $('#propertyFieldMappings');
  const $submitBtn = $('#plugin_submit');
  const $cancelBtn = $('#plugin_cancel');
  
  const OWNER_FIELD_MAP = {
    ownerId: 'オーナーID',
    ownerAnnRent: '年賃料',
    ownerAnnMgmtFee: '年管理費',
    ownerLandPropTax: '土地固都税',
    ownerBldgPropTax: '建物固都税',
    ownerLongTermRepair: '長期修繕契約経費',
    ownerMaint: 'メンテナンス計画経費',
    ownerLoanInterest: '借入金利息',
    ownerDepreciation: '減価償却費',
    ownerAnnInsurance: '保険料年額',
  };

  const PROPERTY_FIELD_MAP = {
    propertyOwnerId: 'オーナーID',
    propertyName: '物件名',
    propPropTax: '固都税',
    propMgmtFee: '管理料',
    propBldgRepair: '建物修繕費',
    propRestoration: '原状回復費',
    propMaint: 'メンテ経費',
    propNetIncome: '実質収入',
    propFullRent: '満室賃料',
    propMarketPrice: '実勢価格',
    propIncome: '収支',
    propInheritanceTaxVal: '相続税評価額',
  };

  // ★成績基準のデフォルト値
  const DEFAULT_GRADE_THRESHOLDS = {
    assetEfficiency: {
      grade5: { min: 120, max: 999 },
      grade4: { min: 100, max: 120 },
      grade3: { min: 80, max: 100 },
      grade2: { min: 60, max: 80 },
      grade1: { min: 0, max: 60 }
    },
    roa: {
      grade5: { min: 8, max: 100 },
      grade4: { min: 6, max: 8 },
      grade3: { min: 4, max: 6 },
      grade2: { min: 2, max: 4 },
      grade1: { min: 0, max: 2 }
    },
    incomeTax: {
      grade5: { min: 0, max: 10 },
      grade4: { min: 10, max: 20 },
      grade3: { min: 20, max: 30 },
      grade2: { min: 30, max: 40 },
      grade1: { min: 40, max: 100 }
    },
    operatingCost: {
      grade5: { min: 0, max: 15 },
      grade4: { min: 15, max: 20 },
      grade3: { min: 20, max: 25 },
      grade2: { min: 25, max: 30 },
      grade1: { min: 30, max: 100 }
    },
    noi: {
      grade5: { min: 8, max: 100 },
      grade4: { min: 6, max: 8 },
      grade3: { min: 4, max: 6 },
      grade2: { min: 2, max: 4 },
      grade1: { min: 0, max: 2 }
    }
  };

  // タブ切り替え
  $('.tab-button').on('click', function() {
    const tabName = $(this).data('tab');
    $('.tab-button').removeClass('active');
    $(this).addClass('active');
    $('.tab-pane').removeClass('active');
    $(`#${tabName}Tab`).addClass('active');
  });

  // ★成績（動的UI）用の共通定義とユーティリティ
  const METRICS_FOR_GRADES = ['assetEfficiency', 'roa', 'incomeTax', 'operatingCost', 'noi'];

  function createGradeRangeElement(metric, minVal, minType, maxVal, maxType, gradeVal) {
    const $row = $('<div class="grade-range"></div>');
    const $reorder = $('<div class="reorder-buttons"></div>');
    const $btnUp = $(`<button type="button" class="move-up-btn" data-metric="${metric}" title="上に移動">↑</button>`);
    const $btnDown = $(`<button type="button" class="move-down-btn" data-metric="${metric}" title="下に移動">↓</button>`);
    $reorder.append($btnUp, $btnDown);
    const $min = $('<input type="text" class="grade-min-input" placeholder="下限なし">').val(minVal != null ? minVal : '');
    const $minType = $(`<select class="grade-min-type-select"><option value="gte">以上</option><option value="gt">超過</option></select>`).val(minType || 'gte');
    const $max = $('<input type="text" class="grade-max-input" placeholder="上限なし">').val(maxVal != null ? maxVal : '');
    const $maxType = $(`<select class="grade-max-type-select"><option value="lte">以下</option><option value="lt">未満</option></select>`).val(maxType || 'lt');
    const minEmpty = (minVal === '' || minVal === null || typeof minVal === 'undefined');
    const maxEmpty = (maxVal === '' || maxVal === null || typeof maxVal === 'undefined');
    if (minEmpty) { $minType.prop('disabled', true).addClass('disabled-select'); }
    if (maxEmpty) { $maxType.prop('disabled', true).addClass('disabled-select'); }
    const $grade = $('<input type="number" class="grade-value-input" step="1" min="1" max="10" placeholder="成績">').val(gradeVal != null ? gradeVal : '');
    const $remove = $(`<button type="button" class="remove-range-btn" data-metric="${metric}">削除</button>`);
    $row.append($reorder, $min, $minType, $max, $maxType, $('<span class="grade-text">の成績は</span>'), $grade, $remove);
    return $row;
  }

  // 並べ替えボタンの無効/有効状態を更新（先頭の↑、末尾の↓を無効化）
  function refreshReorderButtonStateByContainer($container) {
    try {
      const $rows = $container.find('.grade-range');
      $rows.find('.move-up-btn, .move-down-btn').prop('disabled', false);
      $rows.first().find('.move-up-btn').prop('disabled', true);
      $rows.last().find('.move-down-btn').prop('disabled', true);
    } catch (_) {}
  }

  function getDefaultLevelsFromLegacy(metric) {
    const grades = ['grade5','grade4','grade3','grade2','grade1'];
    const defaults = DEFAULT_GRADE_THRESHOLDS[metric] || {};
    return grades.map(g => ({
      min: defaults[g] ? defaults[g].min : 0,
      max: defaults[g] ? defaults[g].max : 0
    }));
  }

  function renderMetricGradeUI(metric, metricSettings) {
    const $rowsContainer = $(`#${metric}_grade_ranges`);
    const includeLower = metricSettings && Object.prototype.hasOwnProperty.call(metricSettings, 'includeLower') ? !!metricSettings.includeLower : true; // 既定は下限含む
    const includeUpper = metricSettings && Object.prototype.hasOwnProperty.call(metricSettings, 'includeUpper') ? !!metricSettings.includeUpper : false; // 既定は上限含まない

    $rowsContainer.empty();
    const levels = (metricSettings && Array.isArray(metricSettings.levels)) ? metricSettings.levels : getDefaultLevelsFromLegacy(metric);
    const incL = metricSettings && Object.prototype.hasOwnProperty.call(metricSettings, 'includeLower') ? !!metricSettings.includeLower : true;
    const incU = metricSettings && Object.prototype.hasOwnProperty.call(metricSettings, 'includeUpper') ? !!metricSettings.includeUpper : false;
    levels.forEach(lv => {
      const useMinType = (lv && (lv.minType === 'gte' || lv.minType === 'gt')) ? lv.minType : (incL ? 'gte' : 'gt');
      const useMaxType = (lv && (lv.maxType === 'lte' || lv.maxType === 'lt')) ? lv.maxType : (incU ? 'lte' : 'lt');
      const $row = createGradeRangeElement(metric, lv.min, useMinType, lv.max, useMaxType, lv.grade);
      $rowsContainer.append($row);
    });
    // 初期表示時に端のボタンを無効化
    refreshReorderButtonStateByContainer($rowsContainer);
  }

  function restoreGradeSettings() {
    let gradeSettings = null;
    try {
      if (config && config.gradeSettings) {
        gradeSettings = typeof config.gradeSettings === 'string' ? JSON.parse(config.gradeSettings) : config.gradeSettings;
      } else if (config && config.gradeThresholds) {
        // 後方互換: 旧固定5段階から変換
        const old = typeof config.gradeThresholds === 'string' ? JSON.parse(config.gradeThresholds) : config.gradeThresholds;
        gradeSettings = {};
        METRICS_FOR_GRADES.forEach(metric => {
          const m = old && old[metric] ? old[metric] : null;
          const levels = m ? ['grade5','grade4','grade3','grade2','grade1'].map(k => ({ min: m[k]?.min ?? 0, max: m[k]?.max ?? 0 })) : getDefaultLevelsFromLegacy(metric);
          gradeSettings[metric] = {
            includeLower: true,
            includeUpper: false,
            levels: levels
          };
        });
      }
    } catch (e) {
      console.warn('Failed to parse grade settings. Using defaults.', e);
      gradeSettings = null;
    }

    METRICS_FOR_GRADES.forEach(metric => {
      const mset = gradeSettings && gradeSettings[metric] ? gradeSettings[metric] : null;
      renderMetricGradeUI(metric, mset);
    });
  }

  function collectGradeSettings() {
    const settings = {};
    METRICS_FOR_GRADES.forEach(metric => {
      const includeLower = true;
      const includeUpper = false;

      const levels = [];
      $(`#${metric}_grade_ranges .grade-range`).each(function() {
        const minRaw = $(this).find('.grade-min-input').val();
        const maxRaw = $(this).find('.grade-max-input').val();
        const minVal = (minRaw == null || String(minRaw).trim() === '') ? '' : String(minRaw).trim();
        const maxVal = (maxRaw == null || String(maxRaw).trim() === '') ? '' : String(maxRaw).trim();
        const minType = $(this).find('.grade-min-type-select').val() || 'gte';
        const maxType = $(this).find('.grade-max-type-select').val() || 'lt';
        const gradeRaw = $(this).find('.grade-value-input').val();
        levels.push({
          min: minVal,
          max: maxVal,
          minType: minType,
          maxType: maxType,
          grade: gradeRaw
        });
      });

      settings[metric] = {
        includeLower: includeLower,
        includeUpper: includeUpper,
        levels: levels
      };
    });
    return settings;
  }

  // 自アプリのフィールドを取得してセレクトボックスを生成
  function setCurrentAppFieldDropdown() {
    const currentAppId = kintone.app.getId();
    
    return kintone.api(kintone.api.url('/k/v1/app/form/fields', true), 'GET', { app: currentAppId })
      .then(function(resp) {
        const $currentAppSelect = $('.kintone-current-app-field-select');
        $currentAppSelect.empty();
        $currentAppSelect.append($('<option>', { value: '', text: 'フィールドを選択してください' }));
        
        const allFields = Object.values(resp.properties)
          .filter(p => ['SINGLE_LINE_TEXT', 'NUMBER', 'RECORD_NUMBER'].includes(p.type))
          .map(p => ({ code: p.code, label: p.label }));
        
        allFields.forEach(function(field) {
          $currentAppSelect.append($('<option>', {
            value: field.code,
            text: `${field.label} (${field.code})`
          }));
        });
      })
      .catch(function(err) {
        console.error('Failed to get current app fields:', err);
        alert('自アプリのフィールド情報の取得に失敗しました。');
      });
  }

  // Kintoneアプリ一覧を取得してセレクトボックスを生成（全件取得対応）
  function setAppDropdown() {
    const allApps = [];
    let offset = 0;
    const limit = 100;
    
    function fetchApps() {
      return kintone.api(kintone.api.url('/k/v1/apps', true), 'GET', {
        offset: offset,
        limit: limit
      }).then(function(resp) {
        allApps.push(...resp.apps);
        
        // まだ取得できるアプリがある場合は続行
        if (resp.apps.length === limit) {
          offset += limit;
          return fetchApps();
        }
        
        // 全アプリ取得完了
        const $appSelects = $('.kintone-app-select');
        $appSelects.each(function(i, el) {
          const $el = $(el);
          $el.append($('<option>', { value: '', text: '---' }));
          allApps.forEach(function(app) {
            $el.append($('<option>', {
              value: app.appId,
              text: `${app.name} (ID: ${app.appId})`
            }));
          });
        });
      });
    }
    
    return fetchApps().catch(function(err) {
      console.error('Failed to get apps list:', err);
      alert('アプリ一覧の取得に失敗しました。');
    });
  }

  // オーナーID設定用のフィールドを生成
  function populateOwnerIdMapping(appId, $container, fieldKey, fieldLabel) {
    $container.empty().append('<p class="loading-fields">フィールド情報を読み込み中...</p>');
    
    return kintone.api(kintone.api.url('/k/v1/app/form/fields', true), 'GET', { app: appId })
      .then(function(resp) {
        $container.empty();
        
        const allFields = Object.values(resp.properties)
          .filter(p => ['SINGLE_LINE_TEXT', 'NUMBER', 'RECORD_NUMBER'].includes(p.type))
          .map(p => ({ code: p.code, label: p.label }));

        const $fieldMapping = $('<div class="field-mapping"></div>');
        const $label = $(`<label>${fieldLabel}</label>`);
        const $select = $(`<select class="field-dropdown kintone-field-select" data-key="${fieldKey}"></select>`);

        $select.append($('<option>', { value: '', text: 'フィールドを選択' }));
        allFields.forEach(function(field) {
          $select.append($('<option>', {
            value: field.code,
            text: `${field.label} (${field.code})`
          }));
        });
        
        if (config && config[fieldKey]) {
          $select.val(config[fieldKey]);
        }
        
        $fieldMapping.append($label).append($select);
        $container.append($fieldMapping);
      })
      .catch(function(err) {
        console.error('Failed to get fields:', err);
        $container.empty().append('<p class="error-text">フィールド情報の取得に失敗しました。</p>');
      });
  }

  // 物件名設定用のフィールドを生成
  function populatePropertyNameMapping(appId, $container, fieldKey, fieldLabel) {
    $container.empty().append('<p class="loading-fields">フィールド情報を読み込み中...</p>');
    
    return kintone.api(kintone.api.url('/k/v1/app/form/fields', true), 'GET', { app: appId })
      .then(function(resp) {
        $container.empty();
        
        const textFields = Object.values(resp.properties)
          .filter(p => ['SINGLE_LINE_TEXT', 'MULTI_LINE_TEXT'].includes(p.type))
          .map(p => ({ code: p.code, label: p.label }));

        const $fieldMapping = $('<div class="field-mapping"></div>');
        const $label = $(`<label>${fieldLabel}</label>`);
        const $select = $(`<select class="field-dropdown kintone-field-select" data-key="${fieldKey}"></select>`);

        $select.append($('<option>', { value: '', text: 'フィールドを選択' }));
        textFields.forEach(function(field) {
          $select.append($('<option>', {
            value: field.code,
            text: `${field.label} (${field.code})`
          }));
        });
        
        if (config && config[fieldKey]) {
          $select.val(config[fieldKey]);
        }
        
        $fieldMapping.append($label).append($select);
        $container.append($fieldMapping);
      })
      .catch(function(err) {
        console.error('Failed to get fields:', err);
        $container.empty().append('<p class="error-text">フィールド情報の取得に失敗しました。</p>');
      });
  }

  // アプリのフィールドを取得し、マッピング用ドロップダウンを描画
  function populateFieldMappings(appId, $container, fieldMap) {
    $container.empty().append('<p class="loading-fields">フィールド情報を読み込み中...</p>');
    
    return kintone.api(kintone.api.url('/k/v1/app/form/fields', true), 'GET', { app: appId })
      .then(function(resp) {
        $container.empty();
        
        const numericFields = Object.values(resp.properties)
          .filter(p => ['NUMBER', 'CALC', 'SINGLE_LINE_TEXT'].includes(p.type))
          .map(p => ({ code: p.code, label: p.label }));

        Object.keys(fieldMap).forEach(function(key) {
          const label = fieldMap[key];
          const $fieldMapping = $('<div class="field-mapping"></div>');
          const $label = $(`<label>${label}</label>`);
          const $select = $(`<select class="field-dropdown kintone-field-select" data-key="${key}"></select>`);

          $select.append($('<option>', { value: '', text: 'フィールドを選択' }));
          numericFields.forEach(function(field) {
            $select.append($('<option>', {
              value: field.code,
              text: `${field.label} (${field.code})`
            }));
          });
          
          if (config && config[key]) {
            $select.val(config[key]);
          }
          
          $fieldMapping.append($label).append($select);
          $container.append($fieldMapping);
        });
      })
      .catch(function(err) {
        console.error('Failed to get fields:', err);
        $container.empty().append('<p class="error-text">フィールド情報の取得に失敗しました。</p>');
      });
  }

  // 設定をフォームに反映
  function restoreConfig() {
    if (config) {
      $spaceId.val(config.spaceId || '');
      $currentAppOwnerId.val(config.currentAppOwnerId || '');
      $ownerAppId.val(config.ownerAppId || '');
      $propertyAppId.val(config.propertyAppId || '');

      if (config.ownerAppId) {
        // オーナーID設定
        populateOwnerIdMapping(config.ownerAppId, $ownerIdMappings, 'ownerId', 'オーナーID');
        // フィールドマッピング（オーナーIDを除く）
        const ownerFieldMapWithoutId = Object.keys(OWNER_FIELD_MAP)
          .filter(key => key !== 'ownerId')
          .reduce((obj, key) => {
            obj[key] = OWNER_FIELD_MAP[key];
            return obj;
          }, {});
        populateFieldMappings(config.ownerAppId, $ownerFieldMappings, ownerFieldMapWithoutId);
      }
      if (config.propertyAppId) {
        // 物件のオーナーID設定
        populateOwnerIdMapping(config.propertyAppId, $propertyOwnerIdMappings, 'propertyOwnerId', 'オーナーID');
        // 物件名設定
        populatePropertyNameMapping(config.propertyAppId, $propertyNameMappings, 'propertyName', '物件名');
        // フィールドマッピング（オーナーIDと物件名を除く）
        const propertyFieldMapWithoutIdAndName = Object.keys(PROPERTY_FIELD_MAP)
          .filter(key => key !== 'propertyOwnerId' && key !== 'propertyName')
          .reduce((obj, key) => {
            obj[key] = PROPERTY_FIELD_MAP[key];
            return obj;
          }, {});
        populateFieldMappings(config.propertyAppId, $propertyFieldMappings, propertyFieldMapWithoutIdAndName);
      }
    }

    // ★成績基準設定の復元（動的UI）
    restoreGradeSettings();
  }

  // ★成績基準設定を復元する
  function restoreGradeThresholds() {
    const metrics = ['assetEfficiency', 'roa', 'incomeTax', 'operatingCost', 'noi'];
    const grades = ['grade5', 'grade4', 'grade3', 'grade2', 'grade1'];

    let gradeConfig = DEFAULT_GRADE_THRESHOLDS;
    if (config && config.gradeThresholds) {
      try {
        gradeConfig = typeof config.gradeThresholds === 'string'
          ? JSON.parse(config.gradeThresholds)
          : config.gradeThresholds;
      } catch (e) {
        console.warn('Failed to parse gradeThresholds. Using defaults.', e);
        gradeConfig = DEFAULT_GRADE_THRESHOLDS;
      }
    }

    metrics.forEach(metric => {
      grades.forEach(grade => {
        const savedThresholds = gradeConfig && gradeConfig[metric] && gradeConfig[metric][grade];
        const defaultThresholds = DEFAULT_GRADE_THRESHOLDS[metric][grade];

        const minValue = savedThresholds ? savedThresholds.min : defaultThresholds.min;
        const maxValue = savedThresholds ? savedThresholds.max : defaultThresholds.max;

        $(`#${metric}_${grade}_min`).val(minValue);
        $(`#${metric}_${grade}_max`).val(maxValue);
      });
    });
  }

  // フォームから設定を収集
  function collectConfig() {
    const newConfig = {
      spaceId: $spaceId.val() || '',
      currentAppOwnerId: $currentAppOwnerId.val() || '',
      ownerAppId: $ownerAppId.val() || '',
      propertyAppId: $propertyAppId.val() || '',
    };

    $('.kintone-field-select').each(function() {
      const $this = $(this);
      const key = $this.data('key');
      if (key) {
        newConfig[key] = $this.val() || '';
      }
    });

    // ★成績基準設定（動的UI）を収集（保存時は文字列化）
    newConfig.gradeSettings = JSON.stringify(collectGradeSettings());

    // setConfigに渡す値は全て文字列に統一
    Object.keys(newConfig).forEach(function(key) {
      if (typeof newConfig[key] !== 'string') {
        newConfig[key] = String(newConfig[key] == null ? '' : newConfig[key]);
      }
    });

    return newConfig;
  }

  // ★成績基準設定を収集する
  function collectGradeThresholds() {
    const thresholds = {};
    const metrics = ['assetEfficiency', 'roa', 'incomeTax', 'operatingCost', 'noi'];
    const grades = ['grade5', 'grade4', 'grade3', 'grade2', 'grade1'];
    
    console.log('Collecting grade thresholds...');
    
    metrics.forEach(metric => {
      thresholds[metric] = {};
      grades.forEach(grade => {
        const minSelector = `#${metric}_${grade}_min`;
        const maxSelector = `#${metric}_${grade}_max`;
        
        const $minElement = $(minSelector);
        const $maxElement = $(maxSelector);
        
        console.log(`Checking elements: ${minSelector} (exists: ${$minElement.length > 0}), ${maxSelector} (exists: ${$maxElement.length > 0})`);
        
        // 要素が存在しない場合はデフォルト値を使用
        let minInput, maxInput;
        if ($minElement.length > 0) {
          minInput = $minElement.val();
        } else {
          console.warn(`Element not found: ${minSelector}`);
          minInput = DEFAULT_GRADE_THRESHOLDS[metric] && DEFAULT_GRADE_THRESHOLDS[metric][grade] ? DEFAULT_GRADE_THRESHOLDS[metric][grade].min : 0;
        }
        
        if ($maxElement.length > 0) {
          maxInput = $maxElement.val();
        } else {
          console.warn(`Element not found: ${maxSelector}`);
          maxInput = DEFAULT_GRADE_THRESHOLDS[metric] && DEFAULT_GRADE_THRESHOLDS[metric][grade] ? DEFAULT_GRADE_THRESHOLDS[metric][grade].max : 0;
        }
        
        console.log(`${metric}_${grade}: minInput=${minInput}, maxInput=${maxInput}`);
        
        // parseFloatでNaNにならないように適切に処理
        const minVal = (typeof minInput === 'string' || typeof minInput === 'number') && !isNaN(parseFloat(minInput)) ? parseFloat(minInput) : 0;
        const maxVal = (typeof maxInput === 'string' || typeof maxInput === 'number') && !isNaN(parseFloat(maxInput)) ? parseFloat(maxInput) : 0;
        
        thresholds[metric][grade] = {
          min: minVal,
          max: maxVal
        };
        
        console.log(`${metric}_${grade}: final values min=${minVal}, max=${maxVal}`);
      });
    });
    
    console.log('Final thresholds object:', thresholds);
    return thresholds;
  }

  // 保存・キャンセルのイベントハンドラ
  function setupEventHandlers() {
    $ownerAppId.on('change', function() {
        const appId = $(this).val();
        if (appId) {
            // オーナーID設定
            populateOwnerIdMapping(appId, $ownerIdMappings, 'ownerId', 'オーナーID');
            // フィールドマッピング（オーナーIDを除く）
            const ownerFieldMapWithoutId = Object.keys(OWNER_FIELD_MAP)
              .filter(key => key !== 'ownerId')
              .reduce((obj, key) => {
                obj[key] = OWNER_FIELD_MAP[key];
                return obj;
              }, {});
            populateFieldMappings(appId, $ownerFieldMappings, ownerFieldMapWithoutId);
        } else {
            $ownerIdMappings.empty();
            $ownerFieldMappings.empty();
        }
    });

    $propertyAppId.on('change', function() {
        const appId = $(this).val();
        if (appId) {
            // 物件のオーナーID設定
            populateOwnerIdMapping(appId, $propertyOwnerIdMappings, 'propertyOwnerId', 'オーナーID');
            // 物件名設定
            populatePropertyNameMapping(appId, $propertyNameMappings, 'propertyName', '物件名');
            // フィールドマッピング（オーナーIDと物件名を除く）
            const propertyFieldMapWithoutIdAndName = Object.keys(PROPERTY_FIELD_MAP)
              .filter(key => key !== 'propertyOwnerId' && key !== 'propertyName')
              .reduce((obj, key) => {
                obj[key] = PROPERTY_FIELD_MAP[key];
                return obj;
              }, {});
            populateFieldMappings(appId, $propertyFieldMappings, propertyFieldMapWithoutIdAndName);
        } else {
            $propertyOwnerIdMappings.empty();
            $propertyNameMappings.empty();
            $propertyFieldMappings.empty();
        }
    });

    // 成績行の追加/削除（動的UI）
    $(document).on('click', '.add-range-btn', function() {
      const metric = $(this).data('metric');
      const $rows = $(`#${metric}_grade_ranges`);
      $rows.append(createGradeRangeElement(metric, '', 'gte', '', 'lt', ''));
      refreshReorderButtonStateByContainer($rows);
    });

    $(document).on('click', '.remove-range-btn', function() {
      $(this).closest('.grade-range').remove();
    });
    // 並べ替え（上へ）
    $(document).on('click', '.move-up-btn', function() {
      const $row = $(this).closest('.grade-range');
      const $prev = $row.prev('.grade-range');
      if ($prev.length) {
        $row.insertBefore($prev);
      }
      refreshReorderButtonStateByContainer($(this).closest('.grade-ranges'));
    });

    // 並べ替え（下へ）
    $(document).on('click', '.move-down-btn', function() {
      const $row = $(this).closest('.grade-range');
      const $next = $row.next('.grade-range');
      if ($next.length) {
        $row.insertAfter($next);
      }
      refreshReorderButtonStateByContainer($(this).closest('.grade-ranges'));
    });


    // 空欄時は対応する演算子セレクトを無効化＋打ち消し線風スタイル
    $(document).on('input', '.grade-min-input, .grade-max-input', function() {
      const $row = $(this).closest('.grade-range');
      const isMinEmpty = String($row.find('.grade-min-input').val() || '').trim() === '';
      const isMaxEmpty = String($row.find('.grade-max-input').val() || '').trim() === '';
      const $minSel = $row.find('.grade-min-type-select');
      const $maxSel = $row.find('.grade-max-type-select');
      $minSel.prop('disabled', isMinEmpty).toggleClass('disabled-select', isMinEmpty);
      $maxSel.prop('disabled', isMaxEmpty).toggleClass('disabled-select', isMaxEmpty);
    });

    $submitBtn.on('click', function() {
      const newConfig = collectConfig();
      
      let hasError = false;
      const errorMessages = [];

      if (!newConfig.spaceId) {
          errorMessages.push('・表示スペースIDを入力してください。');
          hasError = true;
      }
      if (!newConfig.currentAppOwnerId) {
          errorMessages.push('・自アプリ内のオーナーIDフィールドを選択してください。');
          hasError = true;
      }
      if (!newConfig.ownerAppId || !newConfig.propertyAppId) {
          errorMessages.push('・データソースとなるアプリを両方選択してください。');
          hasError = true;
      }

      $('.kintone-field-select').each(function() {
          if (!$(this).val()) {
              const fieldName = $(this).prev('label').text();
              errorMessages.push(`・「${fieldName}」のフィールドを選択してください。`);
              hasError = true;
          }
      });

      if (hasError) {
          alert('入力に不備があります。\n' + errorMessages.join('\n'));
          return;
      }

      // デバッグ情報を出力
      console.log('PLUGIN_ID:', PLUGIN_ID);
      console.log('newConfig type:', typeof newConfig);
      console.log('newConfig content:', newConfig);
      
      // 設定オブジェクトのJSONシリアライズテスト
      try {
        const testJson = JSON.stringify(newConfig);
        console.log('JSON serialization test passed. Length:', testJson.length);
      } catch (jsonError) {
        console.error('JSON serialization failed:', jsonError);
        alert('設定データにJSONとして保存できない値が含まれています: ' + jsonError.message);
        return;
      }
      
      // gradeSettingsのデバッグ
      if (newConfig.gradeSettings) {
        console.log('gradeSettings:', newConfig.gradeSettings);
      }
      
      try {
        kintone.plugin.app.setConfig(newConfig, function() {
          alert('プラグインの設定を保存しました。アプリを更新してください。');
          window.location.href = '../../' + kintone.app.getId() + '/plugin/';
        });
      } catch (error) {
        console.error('kintone.plugin.app.setConfig error:', error);
        console.error('Error stack:', error.stack);
        alert('設定保存中にエラーが発生しました: ' + error.message);
      }
    });

    $cancelBtn.on('click', function() {
      window.location.href = '../../' + kintone.app.getId() + '/plugin/';
    });
  }

  // 初期化処理
  $(document).ready(function() {
    // 古い設定データが文字列の場合JSONに変換
    if (typeof config === 'string' && config.length > 0) {
        try {
            config = JSON.parse(config);
        } catch(e) {
            console.error('Failed to parse config string:', e);
            config = {};
        }
    } else if (typeof config !== 'object' || config === null) {
        config = {};
    }

    Promise.all([
      setCurrentAppFieldDropdown(),
      setAppDropdown()
    ]).then(function() {
        restoreConfig();
    });
    setupEventHandlers();
  });

})(jQuery);




