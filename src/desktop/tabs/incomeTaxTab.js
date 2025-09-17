// 所得税率タブ
export function createIncomeTaxTab(appData) {
    const { incomeTax: initial, ownerDetails, calculatedIncomeTaxable, calculatedIncomeTaxRate } = appData;
    const root = document.createElement('div');
    root.className = 'tab-content';
    root.dataset.tab = 'incomeTax';

    root.innerHTML = `
        <div class="form-container">
            <table class="roa-table income-tax-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>年賃料</th>
                        <th>年管理費</th>
                        <th>土地固都税</th>
                        <th>建物固都税</th>
                        <th>長期修繕計画経費</th>
                        <th>メンテ経費</th>
                        <th>借入金利息</th>
                        <th>減価償却費</th>
                        <th>保険料年額</th>
                        <th>所得税課税所得</th>
                        <th>所得税率</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="row-label">現状値</td>
                        <td><input type="text" id="incomeTaxCurrentRent" value="${ownerDetails?.annual_rent?.value ?? 0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentManagement" value="${ownerDetails?.annual_management_fee?.value ?? 0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentLandTax" value="${ownerDetails?.land_property_tax?.value ?? 0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentBuildingTax" value="${ownerDetails?.building_property_tax?.value ?? 0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentRepair" value="${ownerDetails?.long_term_repair_cost?.value ?? 0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentMaintenance" value="${ownerDetails?.maintenance_cost?.value ?? 0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentInterest" value="${ownerDetails?.loan_interest?.value ?? 0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentDepreciation" value="${ownerDetails?.depreciation?.value ?? 0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentInsurance" value="${ownerDetails?.annual_insurance_premium?.value ?? 0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentIncome" value="${calculatedIncomeTaxable || 0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentTaxRate" value="${calculatedIncomeTaxRate || 0}" readonly></td>
                    </tr>
                    <tr>
                        <td class="row-label">試算値</td>
                        <td><input type="text" id="incomeTaxForecastRent" value="0"></td>
                        <td><input type="text" id="incomeTaxForecastManagement" value="0"></td>
                        <td><input type="text" id="incomeTaxForecastLandTax" value="0"></td>
                        <td><input type="text" id="incomeTaxForecastBuildingTax" value="0"></td>
                        <td><input type="text" id="incomeTaxForecastRepair" value="0"></td>
                        <td><input type="text" id="incomeTaxForecastMaintenance" value="0"></td>
                        <td><input type="text" id="incomeTaxForecastInterest" value="0"></td>
                        <td><input type="text" id="incomeTaxForecastDepreciation" value="0"></td>
                        <td><input type="text" id="incomeTaxForecastInsurance" value="0"></td>
                        <td><input type="text" id="incomeTaxForecastIncome" value="0" readonly></td>
                        <td><input type="text" id="incomeTaxForecastTaxRate" value="0" readonly></td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="calculation-formula-container">
            <div class="formula-content">
                <p>課税所得 = 年賃料 - (年管理費 + 土地固都税 + 建物固都税 + 長期修繕計画経費 + メンテ経費 + 借入金利息 + 減価償却費 + 保険料年額)</p>
            </div>
        </div>
        
        <div class="tax-info-container">
            <div class="tax-rate-table-container">
                <table class="tax-rate-table">
                    <thead>
                        <tr>
                            <th>課税所得</th>
                            <th>税率</th>
                            <th>控除額</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr data-rate="5">
                            <td>0円から1,950,000円まで</td>
                            <td>5%</td>
                            <td>0円</td>
                        </tr>
                        <tr data-rate="10">
                            <td>1,950,001円から3,300,000円まで</td>
                            <td>10%</td>
                            <td>97,500円</td>
                        </tr>
                        <tr data-rate="20">
                            <td>3,300,001円から6,950,000円まで</td>
                            <td>20%</td>
                            <td>427,500円</td>
                        </tr>
                        <tr data-rate="23">
                            <td>6,950,001円から9,000,000円まで</td>
                            <td>23%</td>
                            <td>636,000円</td>
                        </tr>
                        <tr data-rate="33">
                            <td>9,000,001円から18,000,000円まで</td>
                            <td>33%</td>
                            <td>1,536,000円</td>
                        </tr>
                        <tr data-rate="40">
                            <td>18,000,001円から40,000,000円まで</td>
                            <td>40%</td>
                            <td>2,796,000円</td>
                        </tr>
                        <tr data-rate="45">
                            <td>40,000,001円から</td>
                            <td>45%</td>
                            <td>4,796,000円</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="tax-difference-container">
                <div class="difference-info">
                    <div class="current-info">
                        <h5>現状値</h5>
                        <div id="currentDifferenceInfo">
                            <p>課税所得: <span id="currentIncomeDisplay">0円</span></p>
                            <p>適用税率: <span id="currentRateDisplay">0%</span></p>
                            <p id="currentLowerDiff">一つ下の税率まで: <span id="currentLowerAmount">-</span></p>
                            <p id="currentUpperDiff">一つ上の税率まで: <span id="currentUpperAmount">-</span></p>
                        </div>
                    </div>
                    <div class="forecast-info">
                        <h5>試算値</h5>
                        <div id="forecastDifferenceInfo">
                            <p>課税所得: <span id="forecastIncomeDisplay">0円</span></p>
                            <p>適用税率: <span id="forecastRateDisplay">0%</span></p>
                            <p id="forecastLowerDiff">一つ下の税率まで: <span id="forecastLowerAmount">-</span></p>
                            <p id="forecastUpperDiff">一つ上の税率まで: <span id="forecastUpperAmount">-</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 数値をカンマ区切りでフォーマットする関数（小数点以下は区切らない）
    function formatNumber(value) {
        const str = (value === null || value === undefined) ? '' : String(value);
        if (str === '') return '';
        const [intPartRaw, decimalPart] = str.split('.');
        const sign = intPartRaw.startsWith('-') ? '-' : '';
        const intPart = intPartRaw.replace('-', '');
        const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return sign + withCommas + (decimalPart !== undefined ? '.' + decimalPart : '');
    }

    // カンマ区切りの数値を数値に変換する関数
    function parseFormattedNumber(value) {
        return parseFloat(value.replace(/,/g, '')) || 0;
    }

    // 入力フィールドにカンマ区切りを適用する関数
    function applyCommaFormatting(input) {
        const value = input.value.replace(/,/g, '');
        if (value && !isNaN(value)) {
            // カーソル位置を保存
            const cursorPosition = input.selectionStart;
            const oldValue = input.value;
            const newValue = formatNumber(value);
            
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

    // 所得税率計算関数
    function calculateTaxRate(income) {
        if (income <= 0) return 0;
        
        // 所得税率の計算（簡易版）
        if (income <= 1950000) {
            return 5; // 5%
        } else if (income <= 3300000) {
            return 10; // 10%
        } else if (income <= 6950000) {
            return 20; // 20%
        } else if (income <= 9000000) {
            return 23; // 23%
        } else if (income <= 18000000) {
            return 33; // 33%
        } else if (income <= 40000000) {
            return 40; // 40%
        } else {
            return 45; // 45%
        }
    }

    // 税率差額計算関数
    function calculateTaxDifference(income, taxRate) {
        const rateBrackets = [
            { rate: 5, min: 0, max: 1950000 },
            { rate: 10, min: 1950001, max: 3300000 },
            { rate: 20, min: 3300001, max: 6950000 },
            { rate: 23, min: 6950001, max: 9000000 },
            { rate: 33, min: 9000001, max: 18000000 },
            { rate: 40, min: 18000001, max: 40000000 },
            { rate: 45, min: 40000001, max: Infinity }
        ];
        
        // 所得から現在の税率区分インデックスを特定
        let currentIndex = rateBrackets.findIndex(b => income >= b.min && income <= b.max);
        if (currentIndex === -1) {
            currentIndex = rateBrackets.findIndex(b => b.rate === taxRate);
        }
        if (currentIndex === -1) {
            return { lowerDiff: '0円', upperDiff: '0円' };
        }
        
        const lowerBracket = currentIndex > 0 ? rateBrackets[currentIndex - 1] : null;
        const upperBracket = currentIndex < rateBrackets.length - 1 ? rateBrackets[currentIndex + 1] : null;
        
        const lowerDiffNum = lowerBracket ? Math.max(0, income - lowerBracket.max) : 0;
        const upperDiffNum = upperBracket ? Math.max(0, upperBracket.min - income) : 0;
        
        return {
            lowerDiff: formatNumber(lowerDiffNum) + '円',
            upperDiff: formatNumber(upperDiffNum) + '円'
        };
    }



    // 差額情報表示更新関数
    function updateDifferenceInfo() {
        const currentIncome = parseFormattedNumber(document.getElementById('incomeTaxCurrentIncome').value);
        const currentTaxRate = parseInt(document.getElementById('incomeTaxCurrentTaxRate').value) || 0;
        const forecastIncome = parseFormattedNumber(document.getElementById('incomeTaxForecastIncome').value);
        const forecastTaxRate = parseInt(document.getElementById('incomeTaxForecastTaxRate').value) || 0;
        
        // 現状値の差額情報
        document.getElementById('currentIncomeDisplay').textContent = formatNumber(currentIncome) + '円';
        document.getElementById('currentRateDisplay').textContent = String(Math.round(currentTaxRate)) + '%';
        
        const currentDiff = calculateTaxDifference(currentIncome, currentTaxRate);
        document.getElementById('currentLowerAmount').textContent = currentDiff.lowerDiff;
        document.getElementById('currentUpperAmount').textContent = currentDiff.upperDiff;
        
        // 試算値の差額情報
        document.getElementById('forecastIncomeDisplay').textContent = formatNumber(forecastIncome) + '円';
        document.getElementById('forecastRateDisplay').textContent = String(Math.round(forecastTaxRate)) + '%';
        
        const forecastDiff = calculateTaxDifference(forecastIncome, forecastTaxRate);
        document.getElementById('forecastLowerAmount').textContent = forecastDiff.lowerDiff;
        document.getElementById('forecastUpperAmount').textContent = forecastDiff.upperDiff;
    }

    // 速算表のハイライト更新関数
    function updateTaxRateHighlight() {
        // 全てのハイライトをクリア
        document.querySelectorAll('.tax-rate-table tbody tr').forEach(row => {
            row.classList.remove('highlighted-current', 'highlighted-forecast');
        });
        
        // 現状値と試算値の税率を取得
        const currentTaxRate = parseInt(document.getElementById('incomeTaxCurrentTaxRate').value) || 0;
        const forecastTaxRate = parseInt(document.getElementById('incomeTaxForecastTaxRate').value) || 0;
        
        // 現状値の税率をハイライト
        if (currentTaxRate > 0) {
            const currentRow = document.querySelector(`.tax-rate-table tbody tr[data-rate="${currentTaxRate}"]`);
            if (currentRow) {
                currentRow.classList.add('highlighted-current');
            }
        }
        
        // 試算値の税率をハイライト
        if (forecastTaxRate > 0) {
            const forecastRow = document.querySelector(`.tax-rate-table tbody tr[data-rate="${forecastTaxRate}"]`);
            if (forecastRow) {
                forecastRow.classList.add('highlighted-forecast');
            }
        }
    }

    // 所得税課税所得と所得税率の自動計算関数
    function calculateIncome(rowType) {
        const rent = parseFormattedNumber(document.getElementById(`incomeTax${rowType}Rent`).value);
        const management = parseFormattedNumber(document.getElementById(`incomeTax${rowType}Management`).value);
        const landTax = parseFormattedNumber(document.getElementById(`incomeTax${rowType}LandTax`).value);
        const buildingTax = parseFormattedNumber(document.getElementById(`incomeTax${rowType}BuildingTax`).value);
        const repair = parseFormattedNumber(document.getElementById(`incomeTax${rowType}Repair`).value);
        const maintenance = parseFormattedNumber(document.getElementById(`incomeTax${rowType}Maintenance`).value);
        const interest = parseFormattedNumber(document.getElementById(`incomeTax${rowType}Interest`).value);
        const depreciation = parseFormattedNumber(document.getElementById(`incomeTax${rowType}Depreciation`).value);
        const insurance = parseFormattedNumber(document.getElementById(`incomeTax${rowType}Insurance`).value);
        
        const totalExpenses = management + landTax + buildingTax + repair + maintenance + interest + depreciation + insurance;
        const income = rent - totalExpenses;
        const taxRate = calculateTaxRate(income);
        
        document.getElementById(`incomeTax${rowType}Income`).value = formatNumber(income);
        document.getElementById(`incomeTax${rowType}TaxRate`).value = taxRate + '%';

        // トップ表/チャートへ税率更新を通知
        const eventDetail = { rowType, taxRate };
        document.dispatchEvent(new CustomEvent('incomeTax:taxRateUpdated', { detail: eventDetail }));
        if (window && typeof window.setIncomeTaxRate === 'function') {
            try { window.setIncomeTaxRate(rowType.toLowerCase(), taxRate); } catch (_) {}
        }
        
        // 速算表のハイライトと差額情報を更新
        updateTaxRateHighlight();
        updateDifferenceInfo();
    }

    // 現状値の初期計算とカンマ区切り適用
    setTimeout(() => {
        // 現状値の全フィールドにカンマ区切りを適用
        const currentInputs = [
            'incomeTaxCurrentRent', 'incomeTaxCurrentManagement', 'incomeTaxCurrentLandTax', 
            'incomeTaxCurrentBuildingTax', 'incomeTaxCurrentRepair', 'incomeTaxCurrentMaintenance',
            'incomeTaxCurrentInterest', 'incomeTaxCurrentDepreciation', 'incomeTaxCurrentInsurance',
            'incomeTaxCurrentIncome', 'incomeTaxCurrentTaxRate'
        ];
        
        currentInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                applyCommaFormatting(input);
            }
        });
        
        // 計算された値が既に設定されている場合は再計算をスキップ
        const currentIncome = document.getElementById('incomeTaxCurrentIncome').value;
        const currentTaxRate = document.getElementById('incomeTaxCurrentTaxRate').value;
        
        if (currentIncome === '0' && currentTaxRate === '0') {
            calculateIncome('Current');
        } else {
            // 計算された値がある場合は、差額情報とハイライトを更新
            updateTaxRateHighlight();
            updateDifferenceInfo();
        }
        
        // 試算値の初期値を現状値でプリフィル
        const bases = [
            'Rent','Management','LandTax','BuildingTax','Repair','Maintenance','Interest','Depreciation','Insurance'
        ];
        bases.forEach(base => {
            const currentEl = document.getElementById(`incomeTaxCurrent${base}`);
            const forecastEl = document.getElementById(`incomeTaxForecast${base}`);
            if (currentEl && forecastEl) {
                forecastEl.value = currentEl.value;
            }
        });
        
        // 試算値の所得税課税所得と所得税率も現状値で初期化
        const currentIncomeEl = document.getElementById('incomeTaxCurrentIncome');
        const currentTaxRateEl = document.getElementById('incomeTaxCurrentTaxRate');
        const forecastIncomeEl = document.getElementById('incomeTaxForecastIncome');
        const forecastTaxRateEl = document.getElementById('incomeTaxForecastTaxRate');
        
        if (currentIncomeEl && forecastIncomeEl) {
            forecastIncomeEl.value = currentIncomeEl.value;
        }
        if (currentTaxRateEl && forecastTaxRateEl) {
            forecastTaxRateEl.value = currentTaxRateEl.value;
        }

        // 試算値のカンマ適用
        const forecastInputsInit = [
            'incomeTaxForecastRent', 'incomeTaxForecastManagement', 'incomeTaxForecastLandTax', 
            'incomeTaxForecastBuildingTax', 'incomeTaxForecastRepair', 'incomeTaxForecastMaintenance',
            'incomeTaxForecastInterest', 'incomeTaxForecastDepreciation', 'incomeTaxForecastInsurance',
            'incomeTaxForecastIncome', 'incomeTaxForecastTaxRate'
        ];
        forecastInputsInit.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                applyCommaFormatting(input);
            }
        });

        // 試算値の初期計算を実行
        calculateIncome('Forecast');

        // 試算値の入力フィールドにイベントリスナーを追加
        const forecastInputs = [
            'incomeTaxForecastRent', 'incomeTaxForecastManagement', 'incomeTaxForecastLandTax', 
            'incomeTaxForecastBuildingTax', 'incomeTaxForecastRepair', 'incomeTaxForecastMaintenance',
            'incomeTaxForecastInterest', 'incomeTaxForecastDepreciation', 'incomeTaxForecastInsurance'
        ];

        forecastInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                // 入力時のカンマ区切り適用
                input.addEventListener('input', (e) => {
                    applyCommaFormatting(e.target);
                    calculateIncome('Forecast');
                });
                
                // フォーカスアウト時のカンマ区切り適用
                input.addEventListener('blur', (e) => {
                    applyCommaFormatting(e.target);
                });
            }
        });
    }, 200);

    return root;
}


