// ESM化: タブごとに分割したモジュールを読み込み、DOMを動的構築
import { createRoaTab } from './tabs/roaTab.js';
import { createOperatingCostTab } from './tabs/operatingCostTab.js';
import { createIncomeTaxTab } from './tabs/incomeTaxTab.js';
import { createInheritanceTaxTab } from './tabs/inheritanceTaxTab.js';
import { createBorrowingTab } from './tabs/borrowingTab.js';



let radarChart = null;
let barChart = null;

// 汎用設定
const METRICS = ['roa','operatingCost','incomeTax','inheritanceTax','borrowing'];
const FIELDS = ['current','average','forecast'];
const CHART_LABELS = ['ROA(%)','運営コスト率・NOI(%)','所得税率(%)','相続税率(%)','借り入れ状況(%)'];
const DATASET_STYLE = [
    { label: '現状', border: 'rgb(52, 152, 219)', bgRadar: 'rgba(52, 152, 219, 0.2)', bgBar: 'rgba(52, 152, 219, 0.8)', bwRadar: 2, bwBar: 1 },
    { label: '平均', border: 'rgb(231, 76, 60)', bgRadar: 'rgba(231, 76, 60, 0.2)', bgBar: 'rgba(231, 76, 60, 0.8)', bwRadar: 2, bwBar: 1 },
    { label: '試算', border: 'rgb(46, 204, 113)', bgRadar: 'rgba(46, 204, 113, 0.2)', bgBar: 'rgba(46, 204, 113, 0.8)', bwRadar: 2, bwBar: 1 }
];

// データオブジェクト: Kintoneから取得するように変更するため削除
// const data = { ... };
let data = {}; // グローバルで保持

// Kintoneイベントでマウント（モックでも実機でも動く）
document.addEventListener('DOMContentLoaded', () => {
    if (window.kintone && window.kintone.events && typeof window.kintone.events.on === 'function') {
        window.kintone.events.on('app.record.detail.show', () => {
            fetchDataAndMountApp();
        });
    } else {
        // フォールバック: 直接マウント（スタンドアロン動作）
        fetchDataAndMountApp();
    }
});

async function fetchDataAndMountApp() {
    try {
        // アプリIDを設定
        const propertyAppId = 1;
        const ownerAppId = 2;

        // Kintone APIからデータを並行して取得
        const [propertyResponse, ownerResponse] = await Promise.all([
            kintone.api('/k/v1/records.json', 'GET', { app: propertyAppId }),
            kintone.api('/k/v1/records.json', 'GET', { app: ownerAppId })
        ]);

        // 取得したデータを加工
        const processedData = processKintoneData(propertyResponse.records, ownerResponse.records);
        data = processedData; // グローバル変数に格納

        // UIを構築してアプリをマウント
        mountApp(processedData);

    } catch (error) {
        console.error('Failed to fetch or process kintone data:', error);
        // エラー発生時の処理をここに記述（例: エラーメッセージを表示）
        const spaceRoot = document.getElementById('space-dashboard') || (window.kintone && window.kintone.app.record.getSpaceElement('dashboard'));
        if (spaceRoot) {
            spaceRoot.innerHTML = '<p>データの取得に失敗しました。</p>';
        }
    }
}

// Kintoneのデータをアプリ用に加工する
function processKintoneData(propertyRecords, ownerRecords) {
    // ROAと運営コストの計算
    let totalMarketPrice = 0;
    let totalIncome = 0;
    let totalInheritanceValue = 0;
    let totalOperatingCost = 0;
    let totalFullRent = 0;

    const individualRoas = [];
    const individualOperatingCostRates = [];

    propertyRecords.forEach(r => {
        // 全体の合計値を計算（現状値用）
        totalMarketPrice += parseFloat(r.market_price.value || 0);
        totalIncome += parseFloat(r.income.value || 0);
        totalInheritanceValue += parseFloat(r.inheritance_tax_value.value || 0);
        const propertyOperatingCost = parseFloat(r.property_tax.value || 0) +
                                    parseFloat(r.management_fee.value || 0) +
                                    parseFloat(r.building_repair_cost.value || 0) +
                                    parseFloat(r.restoration_cost.value || 0) +
                                    parseFloat(r.maintenance_cost.value || 0);
        totalOperatingCost += propertyOperatingCost;
        const propertyFullRent = parseFloat(r.full_rent.value || 0);
        totalFullRent += propertyFullRent;

        // 物件ごとの指標を計算（平均値用）
        const income = parseFloat(r.income.value || 0);
        const inheritanceValue = parseFloat(r.inheritance_tax_value.value || 0);
        
        const roa = inheritanceValue > 0 ? (income / inheritanceValue) * 100 : 0;
        const operatingCostRate = propertyFullRent > 0 ? (propertyOperatingCost / propertyFullRent) * 100 : 0;

        individualRoas.push(roa);
        individualOperatingCostRates.push(operatingCostRate);
    });

    // 平均値を計算
    const roaAverage = individualRoas.length > 0
        ? individualRoas.reduce((a, b) => a + b, 0) / individualRoas.length
        : 0;
    const operatingCostAverage = individualOperatingCostRates.length > 0
        ? individualOperatingCostRates.reduce((a, b) => a + b, 0) / individualOperatingCostRates.length
        : 0;

    const roaCurrent = totalInheritanceValue > 0 ? (totalIncome / totalInheritanceValue) * 100 : 0;
    const operatingCostCurrent = totalFullRent > 0 ? (totalOperatingCost / totalFullRent) * 100 : 0;
    
    // 所得税・相続税・借り入れ状況の計算
    const ownerRecord = ownerRecords[0];
    let incomeTaxable = 0;
    let inheritanceTaxRateValue = 0;
    let borrowingRateValue = 0;

    if(ownerRecord){
        const totalExpenses = parseFloat(ownerRecord.annual_management_fee.value || 0) +
                              parseFloat(ownerRecord.land_property_tax.value || 0) +
                              parseFloat(ownerRecord.building_property_tax.value || 0) +
                              parseFloat(ownerRecord.long_term_repair_cost.value || 0) +
                              parseFloat(ownerRecord.maintenance_cost.value || 0) +
                              parseFloat(ownerRecord.loan_interest.value || 0) +
                              parseFloat(ownerRecord.depreciation.value || 0) +
                              parseFloat(ownerRecord.annual_insurance_premium.value || 0);
        incomeTaxable = parseFloat(ownerRecord.annual_rent.value || 0) - totalExpenses;

        inheritanceTaxRateValue = parseFloat(ownerRecord.inheritance_tax_rate.value || 0);
        borrowingRateValue = parseFloat(ownerRecord.borrowing_rate.value || 0);
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
        roa: { current: roaCurrent, average: roaAverage, forecast: roaCurrent },
        operatingCost: { current: operatingCostCurrent, average: operatingCostAverage, forecast: operatingCostCurrent },
        incomeTax: { current: incomeTaxRate, average: incomeTaxRate, forecast: incomeTaxRate }, // オーナー単位のため現状値を平均とする
        inheritanceTax: { current: inheritanceTaxRateValue, average: inheritanceTaxRateValue, forecast: inheritanceTaxRateValue },
        borrowing: { current: borrowingRateValue, average: borrowingRateValue, forecast: borrowingRateValue },
        // タブに渡す詳細データ
        propertyDetails: propertyRecords,
        ownerDetails: ownerRecord,
    };
}


function mountApp(appData) {
    const spaceRoot = (window.kintone && window.kintone.app && window.kintone.app.record)
        ? window.kintone.app.record.getSpaceElement('dashboard')
        : document.getElementById('space-dashboard');
    if (!spaceRoot) return;

    buildUI(spaceRoot, appData);
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



    spaceRoot.appendChild(top);
    spaceRoot.appendChild(bottom);
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
        { key: 'incomeTax', label: '所得税率' },
        { key: 'inheritanceTax', label: '相続税率' },
        { key: 'borrowing', label: '借り入れ状況' }


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
            scales: { r: { beginAtZero: true, max: 50 } },
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
            scales: { y: { beginAtZero: true, max: 50 } },
            plugins: { legend: { position: 'bottom' } }
        }
    });
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
    return METRICS.map(k => appData[k][field]);
}

function updateCharts() {
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

