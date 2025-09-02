// 借り入れ状況タブ
export function createBorrowingTab(initial) {
    const root = document.createElement('div');
    root.className = 'tab-content';
    root.dataset.tab = 'borrowing';

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
