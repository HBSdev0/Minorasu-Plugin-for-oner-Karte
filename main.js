// グローバル変数
let radarChart = null;
let barChart = null;

// 汎用設定
const METRICS = ['roa','operatingCost','incomeTax','inheritanceTax','cfOperatingCost','cfnoi'];
const FIELDS = ['current','average','forecast'];
const CHART_LABELS = ['ROA(%)','運営コスト率(%)','所得税率(%)','相続税率(%)','CF運営コスト率(%)','CFNOI(%)'];
const DATASET_STYLE = [
    { label: '現状', border: 'rgb(52, 152, 219)', bgRadar: 'rgba(52, 152, 219, 0.2)', bgBar: 'rgba(52, 152, 219, 0.8)', bwRadar: 2, bwBar: 1 },
    { label: '平均', border: 'rgb(231, 76, 60)', bgRadar: 'rgba(231, 76, 60, 0.2)', bgBar: 'rgba(231, 76, 60, 0.8)', bwRadar: 2, bwBar: 1 },
    { label: '試算', border: 'rgb(46, 204, 113)', bgRadar: 'rgba(46, 204, 113, 0.2)', bgBar: 'rgba(46, 204, 113, 0.8)', bwRadar: 2, bwBar: 1 }
];

// データオブジェクト
const data = {
    roa: { 
        current: 5.5, 
        average: 4.5, 
        forecast: 6.0 
    },
    operatingCost: { 
        current: 25.0, 
        average: 27.9, 
        forecast: 23.0 
    },
    incomeTax: { 
        current: 20.0, 
        average: 22.5, 
        forecast: 18.0 
    },
    inheritanceTax: { 
        current: 15.0, 
        average: 20.0, 
        forecast: 12.0 
    },
    cfOperatingCost: { 
        current: 18.5, 
        average: 21.7, 
        forecast: 16.0 
    },
    cfnoi: { 
        current: 12.0, 
        average: 10.1, 
        forecast: 14.0 
    }
};

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    setupEventListeners();
    updateTable();
    setTimeout(() => {
        radarChart && radarChart.resize();
        barChart && barChart.resize();
    }, 0);
});

// チャートの初期化
function initializeCharts() {
    const radarCtx = document.getElementById('radarChart').getContext('2d');
    const barCtx = document.getElementById('barChart').getContext('2d');

    const radarDatasets = FIELDS.map((f, i) => ({
        label: DATASET_STYLE[i].label,
        data: getChartValues(f),
        borderColor: DATASET_STYLE[i].border,
        backgroundColor: DATASET_STYLE[i].bgRadar,
        borderWidth: DATASET_STYLE[i].bwRadar
    }));

    const barDatasets = FIELDS.map((f, i) => ({
        label: DATASET_STYLE[i].label,
        data: getChartValues(f),
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

// イベントリスナーの設定
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
        if (!key) return;
        const v = data[key];
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) return;
        cells[1].textContent = v.current.toFixed(1);
        cells[2].textContent = v.average.toFixed(1);
        cells[3].textContent = v.forecast.toFixed(1);
    });
}

// チャート更新関数
function getChartValues(field) {
    return METRICS.map(k => data[k][field]);
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

// タブ切り替え関数
function openTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}

// チャート切り替え関数
function switchChart(chartType) {
    document.querySelectorAll('.chart-toggle-button').forEach(b => b.classList.remove('active'));
    const radar = document.getElementById('radarChartContainer');
    const bar = document.getElementById('barChartContainer');
    radar.style.display = 'none';
    bar.style.display = 'none';
    if (chartType === 'radar') {
        radar.style.display = 'block';
        document.querySelectorAll('.chart-toggle-button')[0].classList.add('active');
        requestAnimationFrame(() => { if (radarChart) { radarChart.resize(); } });
    } else {
        bar.style.display = 'block';
        document.querySelectorAll('.chart-toggle-button')[1].classList.add('active');
        requestAnimationFrame(() => { if (barChart) { barChart.resize(); } });
    }
}

