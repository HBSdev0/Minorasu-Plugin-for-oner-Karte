// ROAタブ: 資産効率・ROA設定
export function createRoaTab(appData) {
    const { roa: initial, propertyDetails } = appData;
    const root = document.createElement('div');
    root.className = 'tab-content active';
    root.dataset.tab = 'roa';

    // 物件ごとの行を生成
    const propertyRows = propertyDetails.map((prop, i) => {
        // 初期値を計算
        const marketPrice = parseFloat(prop.market_price?.value || 0);
        const income = parseFloat(prop.income?.value || 0);
        const inheritanceValue = parseFloat(prop.inheritance_tax_value?.value || 0);
        
        // 資産効率 = 実勢価格 ÷ 相続税評価額 × 100
        const assetEfficiency = inheritanceValue > 0 ? (marketPrice / inheritanceValue) * 100 : 0;
        // ROA = 収支 ÷ 相続税評価額 × 100
        const roa = inheritanceValue > 0 ? (income / inheritanceValue) * 100 : 0;
        
        return `
        <tr data-prop-index="${i}" data-scenario="current" class="readonly-row">
            <td rowspan="2">${prop.property_name?.value ?? ''}</td>
            <td>現状</td>
            <td><input type="text" id="roaProp_${i}_current_market" value="${prop.market_price?.value ?? 0}" readonly></td>
            <td><input type="text" id="roaProp_${i}_current_income" value="${prop.income?.value ?? 0}" readonly></td>
            <td><input type="text" id="roaProp_${i}_current_inheritance" value="${prop.inheritance_tax_value?.value ?? 0}" readonly></td>
            <td><input type="text" id="roaProp_${i}_current_assetEfficiency" value="${assetEfficiency.toFixed(1)}" readonly></td>
            <td><input type="text" id="roaProp_${i}_current_roa" value="${roa.toFixed(1)}" readonly></td>
        </tr>
        <tr data-prop-index="${i}" data-scenario="forecast">
            <td>試算</td>
            <td><input type="text" id="roaProp_${i}_forecast_market" value="${prop.market_price?.value ?? 0}"></td>
            <td><input type="text" id="roaProp_${i}_forecast_income" value="${prop.income?.value ?? 0}"></td>
            <td><input type="text" id="roaProp_${i}_forecast_inheritance" value="${prop.inheritance_tax_value?.value ?? 0}"></td>
            <td><input type="text" id="roaProp_${i}_forecast_assetEfficiency" value="${assetEfficiency.toFixed(1)}" readonly></td>
            <td><input type="text" id="roaProp_${i}_forecast_roa" value="${roa.toFixed(1)}" readonly></td>
        </tr>
    `;
    }).join('');

    root.innerHTML = `
        <div class="form-container">
            <table class="roa-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>実勢価格</th>
                        <th>収支</th>
                        <th>相続税評価額</th>
                        <th>資産効率(%)</th>
                        <th>ROA(%)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="row-label">現状値</td>
                        <td><input type="text" id="roaTblCurrentMarketPrice" value="0" readonly></td>
                        <td><input type="text" id="roaTblCurrentIncome" value="0" readonly></td>
                        <td><input type="text" id="roaTblCurrentInheritance" value="0" readonly></td>
                        <td><input type="text" id="roaTblCurrentAssetEfficiency" value="0.0" readonly></td>
                        <td><input type="text" id="roaTblCurrentRoa" value="0.0" readonly></td>
                    </tr>
                    <tr>
                        <td class="row-label">試算値</td>
                        <td><input type="text" id="roaTblForecastMarketPrice" value="0" readonly></td>
                        <td><input type="text" id="roaTblForecastIncome" value="0" readonly></td>
                        <td><input type="text" id="roaTblForecastInheritance" value="0" readonly></td>
                        <td><input type="text" id="roaTblForecastAssetEfficiency" value="0.0" readonly></td>
                        <td><input type="text" id="roaTblForecastRoa" value="0.0" readonly></td>
                    </tr>
                </tbody>
            </table>

            <table class="roa-pivot-table">
                <thead>
                    <tr>
                        <th>物件名</th>
                        <th>現状/試算</th>
                        <th>実勢価格</th>
                        <th>収支</th>
                        <th>相続税評価額</th>
                        <th>資産効率(%)</th>
                        <th>ROA(%)</th>
                    </tr>
                </thead>
                <tbody>
                    ${propertyRows}
                </tbody>
            </table>

            <div class="calculation-formula-container">
                <div class="formula-content">
                    <p>資産効率 = 実勢価格 ÷ 相続税評価額 × 100</p>
                    <p>ROA = 収支 ÷ 相続税評価額 × 100</p>
                </div>
            </div>

            <!-- トップ表/チャート連携用（非表示） -->
            <!-- ROA（%） -->
            <input type="number" id="roaCurrent" value="${initial.current}" min="0" max="999" step="0.1" style="display:none;">
            <input type="number" id="roaForecast" value="${initial.forecast}" min="0" max="999" step="0.1" style="display:none;">
            <!-- 資産効率（%） -->
            <input type="number" id="assetEfficiencyCurrent" value="0" min="0" max="999" step="0.1" style="display:none;">
            <input type="number" id="assetEfficiencyForecast" value="0" min="0" max="999" step="0.1" style="display:none;">
        </div>
    `;

    // ユーティリティ
    function formatNumber(value) {
        const n = (value === null || value === undefined) ? '' : String(value);
        return n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function parseFormattedNumber(value) {
        const v = (value || '').toString().replace(/,/g, '');
        const num = parseFloat(v);
        return isNaN(num) ? 0 : num;
    }

    function applyCommaFormatting(input) {
        const raw = (input.value || '').replace(/,/g, '');
        if (raw && !isNaN(raw)) {
            // カーソル位置を保存
            const cursorPosition = input.selectionStart;
            const oldValue = input.value;
            const newValue = formatNumber(raw);
            
            // 値が変更された場合のみ更新
            if (oldValue !== newValue) {
                input.value = newValue;
                
                // カーソル位置を調整（カンマの数の差を考慮）
                const oldCommaCount = (oldValue.match(/,/g) || []).length;
                const newCommaCount = (newValue.match(/,/g) || []).length;
                const adjustedPosition = cursorPosition + (newCommaCount - oldCommaCount);
                
                // カーソル位置を復元
                input.setSelectionRange(Math.max(0, Math.min(adjustedPosition, newValue.length)), 
                                      Math.max(0, Math.min(adjustedPosition, newValue.length)));
            }
        }
    }

    // 下段ピボットテーブルの合計を上段に反映
    function updateSummaryTable() {
        const totalProps = propertyDetails.length;
        
        // 現状値の合計計算
        let currentMarketTotal = 0;
        let currentIncomeTotal = 0;
        let currentInheritanceTotal = 0;
        
        // 試算値の合計計算
        let forecastMarketTotal = 0;
        let forecastIncomeTotal = 0;
        let forecastInheritanceTotal = 0;
        
        for (let i = 0; i < totalProps; i++) {
            // 現状値の合計
            const currentMarket = parseFormattedNumber(document.getElementById(`roaProp_${i}_current_market`).value);
            const currentIncome = parseFormattedNumber(document.getElementById(`roaProp_${i}_current_income`).value);
            const currentInheritance = parseFormattedNumber(document.getElementById(`roaProp_${i}_current_inheritance`).value);
            
            currentMarketTotal += currentMarket;
            currentIncomeTotal += currentIncome;
            currentInheritanceTotal += currentInheritance;
            
            // 試算値の合計
            const forecastMarket = parseFormattedNumber(document.getElementById(`roaProp_${i}_forecast_market`).value);
            const forecastIncome = parseFormattedNumber(document.getElementById(`roaProp_${i}_forecast_income`).value);
            const forecastInheritance = parseFormattedNumber(document.getElementById(`roaProp_${i}_forecast_inheritance`).value);
            
            forecastMarketTotal += forecastMarket;
            forecastIncomeTotal += forecastIncome;
            forecastInheritanceTotal += forecastInheritance;
        }
        
        // 上段テーブルに合計値を反映
        document.getElementById('roaTblCurrentMarketPrice').value = formatNumber(currentMarketTotal);
        document.getElementById('roaTblCurrentIncome').value = formatNumber(currentIncomeTotal);
        document.getElementById('roaTblCurrentInheritance').value = formatNumber(currentInheritanceTotal);
        
        document.getElementById('roaTblForecastMarketPrice').value = formatNumber(forecastMarketTotal);
        document.getElementById('roaTblForecastIncome').value = formatNumber(forecastIncomeTotal);
        document.getElementById('roaTblForecastInheritance').value = formatNumber(forecastInheritanceTotal);
        
        // 資産効率とROAの計算
        // 資産効率 = 実勢価格 ÷ 相続税評価額 × 100
        const currentAssetEfficiency = currentInheritanceTotal > 0 ? (currentMarketTotal / currentInheritanceTotal) * 100 : 0;
        const forecastAssetEfficiency = forecastInheritanceTotal > 0 ? (forecastMarketTotal / forecastInheritanceTotal) * 100 : 0;
        
        // ROA = 収支 ÷ 相続税評価額 × 100
        const currentRoa = currentInheritanceTotal > 0 ? (currentIncomeTotal / currentInheritanceTotal) * 100 : 0;
        const forecastRoa = forecastInheritanceTotal > 0 ? (forecastIncomeTotal / forecastInheritanceTotal) * 100 : 0;
        
        document.getElementById('roaTblCurrentAssetEfficiency').value = currentAssetEfficiency.toFixed(1);
        document.getElementById('roaTblCurrentRoa').value = currentRoa.toFixed(1);
        document.getElementById('roaTblForecastAssetEfficiency').value = forecastAssetEfficiency.toFixed(1);
        document.getElementById('roaTblForecastRoa').value = forecastRoa.toFixed(1);
        
        // トップ連携: 隠し number 入力を更新し input イベントを発火
        // 1) ROA
        const hiddenRoaCurrent = document.getElementById('roaCurrent');
        const hiddenRoaForecast = document.getElementById('roaForecast');
        if (hiddenRoaCurrent) {
            hiddenRoaCurrent.value = currentRoa.toFixed(1);
            hiddenRoaCurrent.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (hiddenRoaForecast) {
            hiddenRoaForecast.value = forecastRoa.toFixed(1);
            hiddenRoaForecast.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // 2) 資産効率
        const hiddenAeCurrent = document.getElementById('assetEfficiencyCurrent');
        const hiddenAeForecast = document.getElementById('assetEfficiencyForecast');
        if (hiddenAeCurrent) {
            hiddenAeCurrent.value = currentAssetEfficiency.toFixed(1);
            hiddenAeCurrent.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (hiddenAeForecast) {
            hiddenAeForecast.value = forecastAssetEfficiency.toFixed(1);
            hiddenAeForecast.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // 計算: 資産効率(収支/相続税評価額) と ROA(収支/実勢価格)
    function recalcForecast() {
        // 上段テーブルは下段の合計から自動計算されるため、この関数は使用しない
        updateSummaryTable();
    }

    function recalcCurrent() {
        // 上段テーブルは下段の合計から自動計算されるため、この関数は使用しない
        updateSummaryTable();
    }

    // 物件別テーブル: 単一物件・シナリオの再計算
    function recalcProperty(propIndex, scenario) {
        const marketEl = document.getElementById(`roaProp_${propIndex}_${scenario}_market`);
        const incomeEl = document.getElementById(`roaProp_${propIndex}_${scenario}_income`);
        const inheritanceEl = document.getElementById(`roaProp_${propIndex}_${scenario}_inheritance`);
        const assetEffEl = document.getElementById(`roaProp_${propIndex}_${scenario}_assetEfficiency`);
        const roaEl = document.getElementById(`roaProp_${propIndex}_${scenario}_roa`);
        if (!marketEl || !incomeEl || !inheritanceEl || !assetEffEl || !roaEl) return;

        const market = parseFormattedNumber(marketEl.value);
        const income = parseFormattedNumber(incomeEl.value);
        const inheritanceVal = parseFormattedNumber(inheritanceEl.value);

        // 資産効率 = 実勢価格 ÷ 相続税評価額 × 100
        const assetEfficiency = inheritanceVal > 0 ? (market / inheritanceVal) * 100 : 0;
        // ROA = 収支 ÷ 相続税評価額 × 100
        const roaPercent = inheritanceVal > 0 ? (income / inheritanceVal) * 100 : 0;

        assetEffEl.value = assetEfficiency.toFixed(1);
        roaEl.value = roaPercent.toFixed(1);
        
        // 上段テーブルの合計も更新
        updateSummaryTable();
    }

    function setupPivotEvents() {
        const totalProps = propertyDetails.length;
        // 試算値（forecast）のみ編集可能
        for (let i = 0; i < totalProps; i++) {
            ['market','income','inheritance'].forEach(field => {
                const el = document.getElementById(`roaProp_${i}_forecast_${field}`);
                if (!el) return;
                el.addEventListener('input', (e) => {
                    applyCommaFormatting(e.target);
                    recalcProperty(i, 'forecast');
                });
                el.addEventListener('blur', (e) => {
                    applyCommaFormatting(e.target);
                });
            });
        }
    }

    // 初期表示: 現状のROAセルに初期値を反映
    const currentRoaCell = document.getElementById('roaTblCurrentRoa');
    if (currentRoaCell) currentRoaCell.value = Number(initial.current || 0).toFixed(1);
    const forecastRoaCell = document.getElementById('roaTblForecastRoa');
    if (forecastRoaCell) forecastRoaCell.value = Number(initial.forecast || 0).toFixed(1);

    // 試算値入力へのイベント設定
    [
        'roaTblForecastMarketPrice',
        'roaTblForecastIncome',
        'roaTblForecastInheritance'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', (e) => {
            applyCommaFormatting(e.target);
            recalcForecast();
        });
        el.addEventListener('blur', (e) => {
            applyCommaFormatting(e.target);
        });
    });

    // 現状値（表示用）に変更が入った場合も一応再計算可能にしておく（将来拡張想定）
    [
        'roaTblCurrentMarketPrice',
        'roaTblCurrentIncome',
        'roaTblCurrentInheritance'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', (e) => {
            applyCommaFormatting(e.target);
            recalcCurrent();
        });
        el.addEventListener('blur', (e) => {
            applyCommaFormatting(e.target);
        });
    });

    // 初期計算（初期表示のROA値を保持しつつ）
    setTimeout(() => {
        [
            'roaTblCurrentMarketPrice',
            'roaTblCurrentIncome',
            'roaTblCurrentInheritance',
            'roaTblForecastMarketPrice',
            'roaTblForecastIncome',
            'roaTblForecastInheritance'
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) applyCommaFormatting(el);
        });
        recalcCurrent();
        recalcForecast();

        // ピボット用初期カンマ整形と計算
        const totalProps = propertyDetails.length;
        for (let i = 0; i < totalProps; i++) {
            // 現状値と試算値の両方にカンマ整形を適用
            ['current','forecast'].forEach(sc => {
                ['market','income','inheritance'].forEach(field => {
                    const el = document.getElementById(`roaProp_${i}_${sc}_${field}`);
                    if (el) applyCommaFormatting(el);
                });
                recalcProperty(i, sc);
            });
        }

        setupPivotEvents();
    }, 0);

    return root;
}


