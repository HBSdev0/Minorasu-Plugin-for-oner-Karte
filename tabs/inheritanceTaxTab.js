// 相続税率タブ
export function createInheritanceTaxTab(initial) {
    const root = document.createElement('div');
    root.className = 'tab-content';
    root.dataset.tab = 'inheritanceTax';

    root.innerHTML = `
        <div class="form-container">
            <div class="unimplemented-message">
                <h3>未実装</h3>
                <p>機能追加のご依頼をお待ちしております。<br>ほっとビジネスサポート(株)</p>
            </div>
        </div>
    `;

    return root;
}


