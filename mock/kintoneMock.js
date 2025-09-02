// Kintone 簡易モック（ローカル開発用）
// - kintone.events.on(event, handler)
// - kintone.events.mockTrigger(event, eventObject)
// - kintone.app.record.getSpaceElement(spaceCode)

/* eslint-disable */
(function() {
    if (!window.kintone) {
        window.kintone = {};
    }

    const eventHandlers = {};

    function on(events, handler) {
        if (Array.isArray(events)) {
            events.forEach(ev => on(ev, handler));
            return;
        }
        if (!eventHandlers[events]) eventHandlers[events] = [];
        eventHandlers[events].push(handler);
    }

    function mockTrigger(eventName, eventObject) {
        const handlers = eventHandlers[eventName] || [];
        handlers.forEach(h => {
            try {
                h(eventObject || {});
            } catch (e) {
                console.error('[kintoneMock] handler error for', eventName, e);
            }
        });
    }

    const app = window.kintone.app || (window.kintone.app = {});
    const record = app.record || (app.record = {});
    record.getSpaceElement = function(spaceCode) {
        return document.getElementById(`space-${spaceCode}`);
    };

    // Kintone REST API Client Mock
    function api(path, method, params) {
        return new Promise((resolve, reject) => {
            console.log('[kintoneMock] api called:', { path, method, params });
            // 物件マスタ (アプリID: 1)
            if (params.app === 1) {
                const resp = {
                    records: [
                        {
                            'property_name': { value: 'A棟' }, // 物件名
                            'market_price': { value: '300000000' }, // 実勢価格
                            'income': { value: '16500000' }, // 収支
                            'inheritance_tax_value': { value: '200000000' }, // 相続税評価額
                            'property_tax': { value: '1200000' }, // 固都税
                            'management_fee': { value: '800000' }, // 管理料
                            'building_repair_cost': { value: '600000' }, // 建物修繕費
                            'restoration_cost': { value: '400000' }, // 原状回復費
                            'maintenance_cost': { value: '300000' }, // メンテ経費
                            'net_income': { value: '15000000' }, // 実質収入
                            'full_rent': { value: '20000000' }, // 満室賃料
                        },
                        {
                            'property_name': { value: 'B棟' },
                            'market_price': { value: '180000000' }, // 実勢価格
                            'income': { value: '8000000' }, // 収支 (変更)
                            'inheritance_tax_value': { value: '130000000' }, // 相続税評価額 (変更)
                            'property_tax': { value: '720000' }, // 固都税
                            'management_fee': { value: '600000' }, // 管理料 (変更)
                            'building_repair_cost': { value: '360000' }, // 建物修繕費
                            'restoration_cost': { value: '240000' }, // 原状回復費
                            'maintenance_cost': { value: '180000' }, // メンテ経費
                            'net_income': { value: '9000000' }, // 実質収入
                            'full_rent': { value: '11000000' }, // 満室賃料 (変更)
                        },
                        {
                            'property_name': { value: 'C棟' },
                            'market_price': { value: '420000000' },
                            'income': { value: '22000000' },
                            'inheritance_tax_value': { value: '280000000' },
                            'property_tax': { value: '1680000' },
                            'management_fee': { value: '1120000' },
                            'building_repair_cost': { value: '840000' },
                            'restoration_cost': { value: '560000' },
                            'maintenance_cost': { value: '420000' },
                            'net_income': { value: '21000000' },
                            'full_rent': { value: '28000000' },
                        }
                    ]
                };
                setTimeout(() => resolve(resp), 100);
            }
            // オーナーマスタ (アプリID: 2)
            else if (params.app === 2) {
                const resp = {
                    records: [
                        {
                            'annual_rent': { value: '12000000' }, // 年賃料
                            'annual_management_fee': { value: '600000' }, // 年管理費
                            'land_property_tax': { value: '180000' }, // 土地固都税
                            'building_property_tax': { value: '120000' }, // 建物固都税
                            'long_term_repair_cost': { value: '300000' }, // 長期修繕計画経費
                            'maintenance_cost': { value: '240000' }, // メンテナンス経費
                            'loan_interest': { value: '800000' }, // 借入金利息
                            'depreciation': { value: '1500000' }, // 減価償却費
                            'annual_insurance_premium': { value: '120000' }, // 保険料年額
                            'inheritance_tax_rate': { value: '15.0' }, // 相続税率
                            'borrowing_rate': { value: '8.5' } // 借り入れ状況
                        }
                    ]
                };
                setTimeout(() => resolve(resp), 100);
            }
            // その他
            else {
                setTimeout(() => reject({ message: 'Mock not implemented for this app ID.' }), 100);
            }
        });
    }

    window.kintone.api = api;
    window.kintone.events = { on, mockTrigger };

    // モック：レコード詳細表示イベントを自動発火
    document.addEventListener('DOMContentLoaded', function() {
        // 少し遅延してから発火（スクリプトロード順配慮）
        setTimeout(function() {
            window.kintone.events.mockTrigger('app.record.detail.show', { record: {} });
        }, 0);
    });
})();


