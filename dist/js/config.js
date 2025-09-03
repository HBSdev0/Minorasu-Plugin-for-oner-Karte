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

  // タブ切り替え
  $('.tab-button').on('click', function() {
    const tabName = $(this).data('tab');
    $('.tab-button').removeClass('active');
    $(this).addClass('active');
    $('.tab-pane').removeClass('active');
    $(`#${tabName}Tab`).addClass('active');
  });

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
  }

  // フォームから設定を収集
  function collectConfig() {
    const newConfig = {
      spaceId: $spaceId.val(),
      currentAppOwnerId: $currentAppOwnerId.val(),
      ownerAppId: $ownerAppId.val(),
      propertyAppId: $propertyAppId.val(),
    };

    $('.kintone-field-select').each(function() {
      const $this = $(this);
      const key = $this.data('key');
      if (key) {
        newConfig[key] = $this.val();
      }
    });

    return newConfig;
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

      kintone.plugin.app.setConfig(newConfig, function() {
        alert('プラグインの設定を保存しました。アプリを更新してください。');
        window.location.href = '../../' + kintone.app.getId() + '/plugin/';
      });
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
