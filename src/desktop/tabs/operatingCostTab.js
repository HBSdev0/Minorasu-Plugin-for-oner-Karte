// 運営コスト率タブ
export function createOperatingCostTab(appData) {
    const { operatingCost: initial, propertyDetails } = appData;
    const root = document.createElement('div');
    root.className = 'tab-content';
    root.dataset.tab = 'operatingCost';

    const propertyRows = propertyDetails.map((prop, i) => `
        <tr data-prop-index="${i}" data-scenario="current" class="readonly-row">
            <td rowspan="2">${prop.property_name?.value ?? ''}</td>
            <td>現状</td>
            <td><input type="text" id="operatingCostProp_${i}_current_rate" value="0.0" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_current_noiRate" value="0.0" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_current_propertyTax" value="${prop.property_tax?.value ?? 0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_current_management" value="${prop.management_fee?.value ?? 0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_current_repair" value="${prop.building_repair_cost?.value ?? 0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_current_restoration" value="${prop.restoration_cost?.value ?? 0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_current_maintenance" value="${prop.maintenance_cost?.value ?? 0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_current_netIncome" value="${prop.net_income?.value ?? 0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_current_fullRent" value="${prop.full_rent?.value ?? 0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_current_totalCost" value="0" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_current_noi" value="0" readonly></td>
        </tr>
        <tr data-prop-index="${i}" data-scenario="forecast">
            <td>試算</td>
            <td><input type="text" id="operatingCostProp_${i}_forecast_rate" value="0.0" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_forecast_noiRate" value="0.0" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_forecast_propertyTax" value="${prop.property_tax?.value ?? 0}"></td>
            <td><input type="text" id="operatingCostProp_${i}_forecast_management" value="${prop.management_fee?.value ?? 0}"></td>
            <td><input type="text" id="operatingCostProp_${i}_forecast_repair" value="${prop.building_repair_cost?.value ?? 0}"></td>
            <td><input type="text" id="operatingCostProp_${i}_forecast_restoration" value="${prop.restoration_cost?.value ?? 0}"></td>
            <td><input type="text" id="operatingCostProp_${i}_forecast_maintenance" value="${prop.maintenance_cost?.value ?? 0}"></td>
            <td><input type="text" id="operatingCostProp_${i}_forecast_netIncome" value="${prop.net_income?.value ?? 0}"></td>
            <td><input type="text" id="operatingCostProp_${i}_forecast_fullRent" value="${prop.full_rent?.value ?? 0}"></td>
            <td><input type="text" id="operatingCostProp_${i}_forecast_totalCost" value="0" readonly></td>
            <td><input type="text" id="operatingCostProp_${i}_forecast_noi" value="0" readonly></td>
        </tr>
    `).join('');

    root.innerHTML = `
        <div class="form-container">
            <table class="operating-cost-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>運営コスト率(%)</th>
                        <th>NOI率(%)</th>
                        <th>固都税</th>
                        <th>管理料</th>
                        <th>建物修繕費</th>
                        <th>原状回復費</th>
                        <th>メンテ経費</th>
                        <th>実質収入</th>
                        <th>満室賃料</th>
                        <th>運営コスト合計</th>
                        <th>NOI</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="row-label">現状値</td>
                        <td><input type="text" id="operatingCostTblCurrentRate" value="0.0" readonly></td>
                        <td><input type="text" id="operatingCostTblCurrentNoiRate" value="0.0" readonly></td>
                        <td><input type="text" id="operatingCostTblCurrentPropertyTax" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblCurrentManagement" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblCurrentRepair" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblCurrentRestoration" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblCurrentMaintenance" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblCurrentNetIncome" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblCurrentFullRent" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblCurrentTotalCost" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblCurrentNoi" value="0" readonly></td>
                    </tr>
                    <tr>
                        <td class="row-label">試算値</td>
                        <td><input type="text" id="operatingCostTblForecastRate" value="0.0" readonly></td>
                        <td><input type="text" id="operatingCostTblForecastNoiRate" value="0.0" readonly></td>
                        <td><input type="text" id="operatingCostTblForecastPropertyTax" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblForecastManagement" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblForecastRepair" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblForecastRestoration" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblForecastMaintenance" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblForecastNetIncome" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblForecastFullRent" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblForecastTotalCost" value="0" readonly></td>
                        <td><input type="text" id="operatingCostTblForecastNoi" value="0" readonly></td>
                    </tr>
                </tbody>
            </table>

            <table class="operating-cost-pivot-table">
                <thead>
                    <tr>
                        <th>物件名</th>
                        <th>現状/試算</th>
                        <th>運営コスト率(%)</th>
                        <th>NOI率(%)</th>
                        <th>固都税</th>
                        <th>管理料</th>
                        <th>建物修繕費</th>
                        <th>原状回復費</th>
                        <th>メンテ経費</th>
                        <th>実質収入</th>
                        <th>満室賃料</th>
                        <th>運営コスト合計</th>
                        <th>NOI</th>
                    </tr>
                </thead>
                <tbody>
                    ${propertyRows}
                </tbody>
            </table>

            <div class="calculation-formula-container">
                <div class="formula-content">
                    <p>運営コスト合計 = 固都税 + 管理料 + 建物修繕費 + 原状回復費 + メンテ経費</p>
                    <p>運営コスト率 = 運営コスト合計 ÷ 満室賃料 × 100</p>
                    <p>NOI = 実質収入 - 運営コスト合計</p>
                    <p>NOI率 = NOI ÷ 満室賃料 × 100</p>
            </div>
            </div>

            <!-- トップ表/チャート連携用（非表示） -->
            <input type="number" id="operatingCostCurrent" value="${initial.current}" min="0" max="100" step="0.1" style="display:none;">
            <input type="number" id="operatingCostForecast" value="${initial.forecast}" min="0" max="100" step="0.1" style="display:none;">
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
            input.value = formatNumber(raw);
        }
    }

    // 下段ピボットテーブルの合計を上段に反映
    function updateSummaryTable() {
        const totalProps = propertyDetails.length;
        
        // 現状値の合計計算
        let currentPropertyTaxTotal = 0;
        let currentManagementTotal = 0;
        let currentRepairTotal = 0;
        let currentRestorationTotal = 0;
        let currentMaintenanceTotal = 0;
        let currentNetIncomeTotal = 0;
        let currentFullRentTotal = 0;
        
        // 試算値の合計計算
        let forecastPropertyTaxTotal = 0;
        let forecastManagementTotal = 0;
        let forecastRepairTotal = 0;
        let forecastRestorationTotal = 0;
        let forecastMaintenanceTotal = 0;
        let forecastNetIncomeTotal = 0;
        let forecastFullRentTotal = 0;
        
        for (let i = 0; i < totalProps; i++) {
            // 現状値の合計
            currentPropertyTaxTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_current_propertyTax`).value);
            currentManagementTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_current_management`).value);
            currentRepairTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_current_repair`).value);
            currentRestorationTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_current_restoration`).value);
            currentMaintenanceTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_current_maintenance`).value);
            currentNetIncomeTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_current_netIncome`).value);
            currentFullRentTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_current_fullRent`).value);
            
            // 試算値の合計
            forecastPropertyTaxTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_forecast_propertyTax`).value);
            forecastManagementTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_forecast_management`).value);
            forecastRepairTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_forecast_repair`).value);
            forecastRestorationTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_forecast_restoration`).value);
            forecastMaintenanceTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_forecast_maintenance`).value);
            forecastNetIncomeTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_forecast_netIncome`).value);
            forecastFullRentTotal += parseFormattedNumber(document.getElementById(`operatingCostProp_${i}_forecast_fullRent`).value);
        }
        
        // 上段テーブルに合計値を反映
        document.getElementById('operatingCostTblCurrentPropertyTax').value = formatNumber(currentPropertyTaxTotal);
        document.getElementById('operatingCostTblCurrentManagement').value = formatNumber(currentManagementTotal);
        document.getElementById('operatingCostTblCurrentRepair').value = formatNumber(currentRepairTotal);
        document.getElementById('operatingCostTblCurrentRestoration').value = formatNumber(currentRestorationTotal);
        document.getElementById('operatingCostTblCurrentMaintenance').value = formatNumber(currentMaintenanceTotal);
        document.getElementById('operatingCostTblCurrentNetIncome').value = formatNumber(currentNetIncomeTotal);
        document.getElementById('operatingCostTblCurrentFullRent').value = formatNumber(currentFullRentTotal);
        
        document.getElementById('operatingCostTblForecastPropertyTax').value = formatNumber(forecastPropertyTaxTotal);
        document.getElementById('operatingCostTblForecastManagement').value = formatNumber(forecastManagementTotal);
        document.getElementById('operatingCostTblForecastRepair').value = formatNumber(forecastRepairTotal);
        document.getElementById('operatingCostTblForecastRestoration').value = formatNumber(forecastRestorationTotal);
        document.getElementById('operatingCostTblForecastMaintenance').value = formatNumber(forecastMaintenanceTotal);
        document.getElementById('operatingCostTblForecastNetIncome').value = formatNumber(forecastNetIncomeTotal);
        document.getElementById('operatingCostTblForecastFullRent').value = formatNumber(forecastFullRentTotal);
        
        // 運営コスト合計の計算
        const currentTotalCost = currentPropertyTaxTotal + currentManagementTotal + currentRepairTotal + currentRestorationTotal + currentMaintenanceTotal;
        const forecastTotalCost = forecastPropertyTaxTotal + forecastManagementTotal + forecastRepairTotal + forecastRestorationTotal + forecastMaintenanceTotal;
        
        document.getElementById('operatingCostTblCurrentTotalCost').value = formatNumber(currentTotalCost);
        document.getElementById('operatingCostTblForecastTotalCost').value = formatNumber(forecastTotalCost);
        
        // 運営コスト率の計算
        const currentRate = currentFullRentTotal > 0 ? (currentTotalCost / currentFullRentTotal) * 100 : 0;
        const forecastRate = forecastFullRentTotal > 0 ? (forecastTotalCost / forecastFullRentTotal) * 100 : 0;
        
        document.getElementById('operatingCostTblCurrentRate').value = currentRate.toFixed(1);
        document.getElementById('operatingCostTblForecastRate').value = forecastRate.toFixed(1);
        
        // NOIの計算
        const currentNoi = currentNetIncomeTotal - currentTotalCost;
        const forecastNoi = forecastNetIncomeTotal - forecastTotalCost;
        
        document.getElementById('operatingCostTblCurrentNoi').value = formatNumber(currentNoi);
        document.getElementById('operatingCostTblForecastNoi').value = formatNumber(forecastNoi);
        
        // NOI率の計算
        const currentNoiRate = currentFullRentTotal > 0 ? (currentNoi / currentFullRentTotal) * 100 : 0;
        const forecastNoiRate = forecastFullRentTotal > 0 ? (forecastNoi / forecastFullRentTotal) * 100 : 0;
        
        document.getElementById('operatingCostTblCurrentNoiRate').value = currentNoiRate.toFixed(1);
        document.getElementById('operatingCostTblForecastNoiRate').value = forecastNoiRate.toFixed(1);
        
        // トップ連携: 隠し number 入力を更新し input イベントを発火
        const hiddenCurrent = document.getElementById('operatingCostCurrent');
        const hiddenForecast = document.getElementById('operatingCostForecast');
        if (hiddenCurrent) {
            hiddenCurrent.value = currentRate.toFixed(1);
            hiddenCurrent.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (hiddenForecast) {
            hiddenForecast.value = forecastRate.toFixed(1);
            hiddenForecast.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // 物件別テーブル: 単一物件・シナリオの再計算
    function recalcProperty(propIndex, scenario) {
        const propertyTaxEl = document.getElementById(`operatingCostProp_${propIndex}_${scenario}_propertyTax`);
        const managementEl = document.getElementById(`operatingCostProp_${propIndex}_${scenario}_management`);
        const repairEl = document.getElementById(`operatingCostProp_${propIndex}_${scenario}_repair`);
        const restorationEl = document.getElementById(`operatingCostProp_${propIndex}_${scenario}_restoration`);
        const maintenanceEl = document.getElementById(`operatingCostProp_${propIndex}_${scenario}_maintenance`);
        const netIncomeEl = document.getElementById(`operatingCostProp_${propIndex}_${scenario}_netIncome`);
        const fullRentEl = document.getElementById(`operatingCostProp_${propIndex}_${scenario}_fullRent`);
        const totalCostEl = document.getElementById(`operatingCostProp_${propIndex}_${scenario}_totalCost`);
        const noiEl = document.getElementById(`operatingCostProp_${propIndex}_${scenario}_noi`);
        const rateEl = document.getElementById(`operatingCostProp_${propIndex}_${scenario}_rate`);
        const noiRateEl = document.getElementById(`operatingCostProp_${propIndex}_${scenario}_noiRate`);
        
        if (!propertyTaxEl || !managementEl || !repairEl || !restorationEl || !maintenanceEl || 
            !netIncomeEl || !fullRentEl || !totalCostEl || !noiEl || !rateEl || !noiRateEl) return;

        const propertyTax = parseFormattedNumber(propertyTaxEl.value);
        const management = parseFormattedNumber(managementEl.value);
        const repair = parseFormattedNumber(repairEl.value);
        const restoration = parseFormattedNumber(restorationEl.value);
        const maintenance = parseFormattedNumber(maintenanceEl.value);
        const netIncome = parseFormattedNumber(netIncomeEl.value);
        const fullRent = parseFormattedNumber(fullRentEl.value);

        // 運営コスト合計 = 固都税 + 管理料 + 建物修繕費 + 原状回復費 + メンテ経費
        const totalCost = propertyTax + management + repair + restoration + maintenance;
        
        // 運営コスト率 = 運営コスト合計 ÷ 満室賃料 × 100
        const rate = fullRent > 0 ? (totalCost / fullRent) * 100 : 0;
        
        // NOI = 実質収入 - 運営コスト合計
        const noi = netIncome - totalCost;
        
        // NOI率 = NOI ÷ 満室賃料 × 100
        const noiRate = fullRent > 0 ? (noi / fullRent) * 100 : 0;

        totalCostEl.value = formatNumber(totalCost);
        rateEl.value = rate.toFixed(1);
        noiEl.value = formatNumber(noi);
        noiRateEl.value = noiRate.toFixed(1);
        
        // 上段テーブルの合計も更新
        updateSummaryTable();
    }

    function setupPivotEvents() {
        const totalProps = propertyDetails.length;
        // 試算値（forecast）のみ編集可能
        for (let i = 0; i < totalProps; i++) {
            ['propertyTax','management','repair','restoration','maintenance','netIncome','fullRent'].forEach(field => {
                const el = document.getElementById(`operatingCostProp_${i}_forecast_${field}`);
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

    // 初期表示: 現状の運営コスト率セルに初期値を反映
    const currentRateCell = document.getElementById('operatingCostTblCurrentRate');
    if (currentRateCell) currentRateCell.value = Number(initial.current || 0).toFixed(1);
    const forecastRateCell = document.getElementById('operatingCostTblForecastRate');
    if (forecastRateCell) forecastRateCell.value = Number(initial.forecast || 0).toFixed(1);

    // 初期計算（初期表示の運営コスト率値を保持しつつ）
    setTimeout(() => {
        updateSummaryTable();

        // ピボット用初期カンマ整形と計算
        const totalProps = propertyDetails.length;
        for (let i = 0; i < totalProps; i++) {
            // 現状値と試算値の両方にカンマ整形を適用
            ['current','forecast'].forEach(sc => {
                ['propertyTax','management','repair','restoration','maintenance','netIncome','fullRent'].forEach(field => {
                    const el = document.getElementById(`operatingCostProp_${i}_${sc}_${field}`);
                    if (el) applyCommaFormatting(el);
                });
                recalcProperty(i, sc);
            });
        }

        setupPivotEvents();
    }, 0);

    return root;
}


