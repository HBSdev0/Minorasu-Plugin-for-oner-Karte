(function(){"use strict";function _t(X){const{roa:c,propertyDetails:x}=X,E=document.createElement("div");E.className="tab-content active",E.dataset.tab="roa";const tt=x.map((i,n)=>`
        <tr data-prop-index="${n}" data-scenario="current" class="readonly-row">
            <td rowspan="2">${i.property_name?.value??""}</td>
            <td>現状</td>
            <td><input type="text" id="roaProp_${n}_current_market" value="${i.market_price?.value??0}" readonly></td>
            <td><input type="text" id="roaProp_${n}_current_income" value="${i.income?.value??0}" readonly></td>
            <td><input type="text" id="roaProp_${n}_current_inheritance" value="${i.inheritance_tax_value?.value??0}" readonly></td>
            <td><input type="text" id="roaProp_${n}_current_assetEfficiency" value="0.0" readonly></td>
            <td><input type="text" id="roaProp_${n}_current_roa" value="0.0" readonly></td>
        </tr>
        <tr data-prop-index="${n}" data-scenario="forecast">
            <td>試算</td>
            <td><input type="text" id="roaProp_${n}_forecast_market" value="${i.market_price?.value??0}"></td>
            <td><input type="text" id="roaProp_${n}_forecast_income" value="${i.income?.value??0}"></td>
            <td><input type="text" id="roaProp_${n}_forecast_inheritance" value="${i.inheritance_tax_value?.value??0}"></td>
            <td><input type="text" id="roaProp_${n}_forecast_assetEfficiency" value="0.0" readonly></td>
            <td><input type="text" id="roaProp_${n}_forecast_roa" value="0.0" readonly></td>
        </tr>
    `).join("");E.innerHTML=`
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
                    ${tt}
                </tbody>
            </table>

            <div class="calculation-formula-container">
                <div class="formula-content">
                    <p>資産効率 = 実勢価格 ÷ 相続税評価額 × 100</p>
                    <p>ROA = 収支 ÷ 相続税評価額 × 100</p>
                </div>
            </div>

            <!-- トップ表/チャート連携用（非表示） -->
            <input type="number" id="roaCurrent" value="${c.current}" min="0" max="50" step="0.1" style="display:none;">
            <input type="number" id="roaForecast" value="${c.forecast}" min="0" max="50" step="0.1" style="display:none;">
        </div>
    `;function u(i){return(i==null?"":String(i)).replace(/\B(?=(\d{3})+(?!\d))/g,",")}function m(i){const n=(i||"").toString().replace(/,/g,""),l=parseFloat(n);return isNaN(l)?0:l}function T(i){const n=(i.value||"").replace(/,/g,"");n&&!isNaN(n)&&(i.value=u(n))}function P(){const i=x.length;let n=0,l=0,y=0,b=0,F=0,$=0;for(let w=0;w<i;w++){const V=m(document.getElementById(`roaProp_${w}_current_market`).value),U=m(document.getElementById(`roaProp_${w}_current_income`).value),rt=m(document.getElementById(`roaProp_${w}_current_inheritance`).value);n+=V,l+=U,y+=rt;const z=m(document.getElementById(`roaProp_${w}_forecast_market`).value),G=m(document.getElementById(`roaProp_${w}_forecast_income`).value),at=m(document.getElementById(`roaProp_${w}_forecast_inheritance`).value);b+=z,F+=G,$+=at}document.getElementById("roaTblCurrentMarketPrice").value=u(n),document.getElementById("roaTblCurrentIncome").value=u(l),document.getElementById("roaTblCurrentInheritance").value=u(y),document.getElementById("roaTblForecastMarketPrice").value=u(b),document.getElementById("roaTblForecastIncome").value=u(F),document.getElementById("roaTblForecastInheritance").value=u($);const M=y>0?n/y*100:0,D=$>0?b/$*100:0,C=y>0?l/y*100:0,_=$>0?F/$*100:0;document.getElementById("roaTblCurrentAssetEfficiency").value=M.toFixed(1),document.getElementById("roaTblCurrentRoa").value=C.toFixed(1),document.getElementById("roaTblForecastAssetEfficiency").value=D.toFixed(1),document.getElementById("roaTblForecastRoa").value=_.toFixed(1);const B=document.getElementById("roaCurrent"),A=document.getElementById("roaForecast");B&&(B.value=C.toFixed(1),B.dispatchEvent(new Event("input",{bubbles:!0}))),A&&(A.value=_.toFixed(1),A.dispatchEvent(new Event("input",{bubbles:!0})))}function h(){P()}function et(){P()}function j(i,n){const l=document.getElementById(`roaProp_${i}_${n}_market`),y=document.getElementById(`roaProp_${i}_${n}_income`),b=document.getElementById(`roaProp_${i}_${n}_inheritance`),F=document.getElementById(`roaProp_${i}_${n}_assetEfficiency`),$=document.getElementById(`roaProp_${i}_${n}_roa`);if(!l||!y||!b||!F||!$)return;const M=m(l.value),D=m(y.value),C=m(b.value),_=C>0?M/C*100:0,B=C>0?D/C*100:0;F.value=_.toFixed(1),$.value=B.toFixed(1),P()}function W(){const i=x.length;for(let n=0;n<i;n++)["market","income","inheritance"].forEach(l=>{const y=document.getElementById(`roaProp_${n}_forecast_${l}`);y&&(y.addEventListener("input",b=>{T(b.target),j(n,"forecast")}),y.addEventListener("blur",b=>{T(b.target)}))})}const s=document.getElementById("roaTblCurrentRoa");s&&(s.value=Number(c.current||0).toFixed(1));const t=document.getElementById("roaTblForecastRoa");return t&&(t.value=Number(c.forecast||0).toFixed(1)),["roaTblForecastMarketPrice","roaTblForecastIncome","roaTblForecastInheritance"].forEach(i=>{const n=document.getElementById(i);n&&(n.addEventListener("input",l=>{T(l.target),h()}),n.addEventListener("blur",l=>{T(l.target)}))}),["roaTblCurrentMarketPrice","roaTblCurrentIncome","roaTblCurrentInheritance"].forEach(i=>{const n=document.getElementById(i);n&&(n.addEventListener("input",l=>{T(l.target),et()}),n.addEventListener("blur",l=>{T(l.target)}))}),setTimeout(()=>{["roaTblCurrentMarketPrice","roaTblCurrentIncome","roaTblCurrentInheritance","roaTblForecastMarketPrice","roaTblForecastIncome","roaTblForecastInheritance"].forEach(n=>{const l=document.getElementById(n);l&&T(l)}),et(),h();const i=x.length;for(let n=0;n<i;n++)["current","forecast"].forEach(l=>{["market","income","inheritance"].forEach(y=>{const b=document.getElementById(`roaProp_${n}_${l}_${y}`);b&&T(b)}),j(n,l)});W()},0),E}function Tt(X){const{operatingCost:c,propertyDetails:x}=X,E=document.createElement("div");E.className="tab-content",E.dataset.tab="operatingCost";const tt=x.map((s,t)=>`
        <tr data-prop-index="${t}" data-scenario="current" class="readonly-row">
            <td rowspan="2">${s.property_name?.value??""}</td>
            <td>現状</td>
            <td><input type="text" id="operatingCostProp_${t}_current_rate" value="0.0" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_current_noiRate" value="0.0" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_current_propertyTax" value="${s.property_tax?.value??0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_current_management" value="${s.management_fee?.value??0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_current_repair" value="${s.building_repair_cost?.value??0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_current_restoration" value="${s.restoration_cost?.value??0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_current_maintenance" value="${s.maintenance_cost?.value??0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_current_netIncome" value="${s.net_income?.value??0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_current_fullRent" value="${s.full_rent?.value??0}" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_current_totalCost" value="0" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_current_noi" value="0" readonly></td>
        </tr>
        <tr data-prop-index="${t}" data-scenario="forecast">
            <td>試算</td>
            <td><input type="text" id="operatingCostProp_${t}_forecast_rate" value="0.0" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_forecast_noiRate" value="0.0" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_forecast_propertyTax" value="${s.property_tax?.value??0}"></td>
            <td><input type="text" id="operatingCostProp_${t}_forecast_management" value="${s.management_fee?.value??0}"></td>
            <td><input type="text" id="operatingCostProp_${t}_forecast_repair" value="${s.building_repair_cost?.value??0}"></td>
            <td><input type="text" id="operatingCostProp_${t}_forecast_restoration" value="${s.restoration_cost?.value??0}"></td>
            <td><input type="text" id="operatingCostProp_${t}_forecast_maintenance" value="${s.maintenance_cost?.value??0}"></td>
            <td><input type="text" id="operatingCostProp_${t}_forecast_netIncome" value="${s.net_income?.value??0}"></td>
            <td><input type="text" id="operatingCostProp_${t}_forecast_fullRent" value="${s.full_rent?.value??0}"></td>
            <td><input type="text" id="operatingCostProp_${t}_forecast_totalCost" value="0" readonly></td>
            <td><input type="text" id="operatingCostProp_${t}_forecast_noi" value="0" readonly></td>
        </tr>
    `).join("");E.innerHTML=`
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
                    ${tt}
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
            <input type="number" id="operatingCostCurrent" value="${c.current}" min="0" max="100" step="0.1" style="display:none;">
            <input type="number" id="operatingCostForecast" value="${c.forecast}" min="0" max="100" step="0.1" style="display:none;">
        </div>
    `;function u(s){return(s==null?"":String(s)).replace(/\B(?=(\d{3})+(?!\d))/g,",")}function m(s){const t=(s||"").toString().replace(/,/g,""),i=parseFloat(t);return isNaN(i)?0:i}function T(s){const t=(s.value||"").replace(/,/g,"");t&&!isNaN(t)&&(s.value=u(t))}function P(){const s=x.length;let t=0,i=0,n=0,l=0,y=0,b=0,F=0,$=0,M=0,D=0,C=0,_=0,B=0,A=0;for(let a=0;a<s;a++)t+=m(document.getElementById(`operatingCostProp_${a}_current_propertyTax`).value),i+=m(document.getElementById(`operatingCostProp_${a}_current_management`).value),n+=m(document.getElementById(`operatingCostProp_${a}_current_repair`).value),l+=m(document.getElementById(`operatingCostProp_${a}_current_restoration`).value),y+=m(document.getElementById(`operatingCostProp_${a}_current_maintenance`).value),b+=m(document.getElementById(`operatingCostProp_${a}_current_netIncome`).value),F+=m(document.getElementById(`operatingCostProp_${a}_current_fullRent`).value),$+=m(document.getElementById(`operatingCostProp_${a}_forecast_propertyTax`).value),M+=m(document.getElementById(`operatingCostProp_${a}_forecast_management`).value),D+=m(document.getElementById(`operatingCostProp_${a}_forecast_repair`).value),C+=m(document.getElementById(`operatingCostProp_${a}_forecast_restoration`).value),_+=m(document.getElementById(`operatingCostProp_${a}_forecast_maintenance`).value),B+=m(document.getElementById(`operatingCostProp_${a}_forecast_netIncome`).value),A+=m(document.getElementById(`operatingCostProp_${a}_forecast_fullRent`).value);document.getElementById("operatingCostTblCurrentPropertyTax").value=u(t),document.getElementById("operatingCostTblCurrentManagement").value=u(i),document.getElementById("operatingCostTblCurrentRepair").value=u(n),document.getElementById("operatingCostTblCurrentRestoration").value=u(l),document.getElementById("operatingCostTblCurrentMaintenance").value=u(y),document.getElementById("operatingCostTblCurrentNetIncome").value=u(b),document.getElementById("operatingCostTblCurrentFullRent").value=u(F),document.getElementById("operatingCostTblForecastPropertyTax").value=u($),document.getElementById("operatingCostTblForecastManagement").value=u(M),document.getElementById("operatingCostTblForecastRepair").value=u(D),document.getElementById("operatingCostTblForecastRestoration").value=u(C),document.getElementById("operatingCostTblForecastMaintenance").value=u(_),document.getElementById("operatingCostTblForecastNetIncome").value=u(B),document.getElementById("operatingCostTblForecastFullRent").value=u(A);const w=t+i+n+l+y,V=$+M+D+C+_;document.getElementById("operatingCostTblCurrentTotalCost").value=u(w),document.getElementById("operatingCostTblForecastTotalCost").value=u(V);const U=F>0?w/F*100:0,rt=A>0?V/A*100:0;document.getElementById("operatingCostTblCurrentRate").value=U.toFixed(1),document.getElementById("operatingCostTblForecastRate").value=rt.toFixed(1);const z=b-w,G=B-V;document.getElementById("operatingCostTblCurrentNoi").value=u(z),document.getElementById("operatingCostTblForecastNoi").value=u(G);const at=F>0?z/F*100:0,e=A>0?G/A*100:0;document.getElementById("operatingCostTblCurrentNoiRate").value=at.toFixed(1),document.getElementById("operatingCostTblForecastNoiRate").value=e.toFixed(1);const r=document.getElementById("operatingCostCurrent"),o=document.getElementById("operatingCostForecast");r&&(r.value=U.toFixed(1),r.dispatchEvent(new Event("input",{bubbles:!0}))),o&&(o.value=rt.toFixed(1),o.dispatchEvent(new Event("input",{bubbles:!0})))}function h(s,t){const i=document.getElementById(`operatingCostProp_${s}_${t}_propertyTax`),n=document.getElementById(`operatingCostProp_${s}_${t}_management`),l=document.getElementById(`operatingCostProp_${s}_${t}_repair`),y=document.getElementById(`operatingCostProp_${s}_${t}_restoration`),b=document.getElementById(`operatingCostProp_${s}_${t}_maintenance`),F=document.getElementById(`operatingCostProp_${s}_${t}_netIncome`),$=document.getElementById(`operatingCostProp_${s}_${t}_fullRent`),M=document.getElementById(`operatingCostProp_${s}_${t}_totalCost`),D=document.getElementById(`operatingCostProp_${s}_${t}_noi`),C=document.getElementById(`operatingCostProp_${s}_${t}_rate`),_=document.getElementById(`operatingCostProp_${s}_${t}_noiRate`);if(!i||!n||!l||!y||!b||!F||!$||!M||!D||!C||!_)return;const B=m(i.value),A=m(n.value),w=m(l.value),V=m(y.value),U=m(b.value),rt=m(F.value),z=m($.value),G=B+A+w+V+U,at=z>0?G/z*100:0,e=rt-G,r=z>0?e/z*100:0;M.value=u(G),C.value=at.toFixed(1),D.value=u(e),_.value=r.toFixed(1),P()}function et(){const s=x.length;for(let t=0;t<s;t++)["propertyTax","management","repair","restoration","maintenance","netIncome","fullRent"].forEach(i=>{const n=document.getElementById(`operatingCostProp_${t}_forecast_${i}`);n&&(n.addEventListener("input",l=>{T(l.target),h(t,"forecast")}),n.addEventListener("blur",l=>{T(l.target)}))})}const j=document.getElementById("operatingCostTblCurrentRate");j&&(j.value=Number(c.current||0).toFixed(1));const W=document.getElementById("operatingCostTblForecastRate");return W&&(W.value=Number(c.forecast||0).toFixed(1)),setTimeout(()=>{P();const s=x.length;for(let t=0;t<s;t++)["current","forecast"].forEach(i=>{["propertyTax","management","repair","restoration","maintenance","netIncome","fullRent"].forEach(n=>{const l=document.getElementById(`operatingCostProp_${t}_${i}_${n}`);l&&T(l)}),h(t,i)});et()},0),E}function Ct(X){const{incomeTax:c,ownerDetails:x,calculatedIncomeTaxable:E,calculatedIncomeTaxRate:tt}=X,u=document.createElement("div");u.className="tab-content",u.dataset.tab="incomeTax",u.innerHTML=`
        <div class="form-container">
            <table class="roa-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>年賃料</th>
                        <th>年管理費</th>
                        <th>土地固都税</th>
                        <th>建物固都税</th>
                        <th>長期修繕計画経費</th>
                        <th>メンテナンス経費</th>
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
                        <td><input type="text" id="incomeTaxCurrentRent" value="${x?.annual_rent?.value??0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentManagement" value="${x?.annual_management_fee?.value??0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentLandTax" value="${x?.land_property_tax?.value??0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentBuildingTax" value="${x?.building_property_tax?.value??0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentRepair" value="${x?.long_term_repair_cost?.value??0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentMaintenance" value="${x?.maintenance_cost?.value??0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentInterest" value="${x?.loan_interest?.value??0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentDepreciation" value="${x?.depreciation?.value??0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentInsurance" value="${x?.annual_insurance_premium?.value??0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentIncome" value="${E||0}" readonly></td>
                        <td><input type="text" id="incomeTaxCurrentTaxRate" value="${tt||0}" readonly></td>
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
                <p>課税所得 = 年賃料 - (年管理費 + 土地固都税 + 建物固都税 + 長期修繕計画経費 + メンテナンス経費 + 借入金利息 + 減価償却費 + 保険料年額)</p>
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
    `;function m(t){return t.toString().replace(/\B(?=(\d{3})+(?!\d))/g,",")}function T(t){return parseFloat(t.replace(/,/g,""))||0}function P(t){const i=t.value.replace(/,/g,"");i&&!isNaN(i)&&(t.value=m(i))}function h(t){return t<=0?0:t<=195e4?5:t<=33e5?10:t<=695e4?20:t<=9e6?23:t<=18e6?33:t<=4e7?40:45}function et(t,i){const n=[{rate:5,min:0,max:195e4},{rate:10,min:1950001,max:33e5},{rate:20,min:3300001,max:695e4},{rate:23,min:6950001,max:9e6},{rate:33,min:9000001,max:18e6},{rate:40,min:18000001,max:4e7},{rate:45,min:40000001,max:1/0}];let l=n.findIndex(M=>t>=M.min&&t<=M.max);if(l===-1&&(l=n.findIndex(M=>M.rate===i)),l===-1)return{lowerDiff:"0円",upperDiff:"0円"};const y=l>0?n[l-1]:null,b=l<n.length-1?n[l+1]:null,F=y?Math.max(0,t-y.max):0,$=b?Math.max(0,b.min-t):0;return{lowerDiff:m(F)+"円",upperDiff:m($)+"円"}}function j(){const t=T(document.getElementById("incomeTaxCurrentIncome").value),i=parseInt(document.getElementById("incomeTaxCurrentTaxRate").value)||0,n=T(document.getElementById("incomeTaxForecastIncome").value),l=parseInt(document.getElementById("incomeTaxForecastTaxRate").value)||0;document.getElementById("currentIncomeDisplay").textContent=m(t)+"円",document.getElementById("currentRateDisplay").textContent=i+"%";const y=et(t,i);document.getElementById("currentLowerAmount").textContent=y.lowerDiff,document.getElementById("currentUpperAmount").textContent=y.upperDiff,document.getElementById("forecastIncomeDisplay").textContent=m(n)+"円",document.getElementById("forecastRateDisplay").textContent=l+"%";const b=et(n,l);document.getElementById("forecastLowerAmount").textContent=b.lowerDiff,document.getElementById("forecastUpperAmount").textContent=b.upperDiff}function W(){document.querySelectorAll(".tax-rate-table tbody tr").forEach(n=>{n.classList.remove("highlighted-current","highlighted-forecast")});const t=parseInt(document.getElementById("incomeTaxCurrentTaxRate").value)||0,i=parseInt(document.getElementById("incomeTaxForecastTaxRate").value)||0;if(t>0){const n=document.querySelector(`.tax-rate-table tbody tr[data-rate="${t}"]`);n&&n.classList.add("highlighted-current")}if(i>0){const n=document.querySelector(`.tax-rate-table tbody tr[data-rate="${i}"]`);n&&n.classList.add("highlighted-forecast")}}function s(t){const i=T(document.getElementById(`incomeTax${t}Rent`).value),n=T(document.getElementById(`incomeTax${t}Management`).value),l=T(document.getElementById(`incomeTax${t}LandTax`).value),y=T(document.getElementById(`incomeTax${t}BuildingTax`).value),b=T(document.getElementById(`incomeTax${t}Repair`).value),F=T(document.getElementById(`incomeTax${t}Maintenance`).value),$=T(document.getElementById(`incomeTax${t}Interest`).value),M=T(document.getElementById(`incomeTax${t}Depreciation`).value),D=T(document.getElementById(`incomeTax${t}Insurance`).value),C=n+l+y+b+F+$+M+D,_=i-C,B=h(_);document.getElementById(`incomeTax${t}Income`).value=m(_),document.getElementById(`incomeTax${t}TaxRate`).value=B;const A={rowType:t,taxRate:B};if(document.dispatchEvent(new CustomEvent("incomeTax:taxRateUpdated",{detail:A})),window&&typeof window.setIncomeTaxRate=="function")try{window.setIncomeTaxRate(t.toLowerCase(),B)}catch{}W(),j()}return setTimeout(()=>{["incomeTaxCurrentRent","incomeTaxCurrentManagement","incomeTaxCurrentLandTax","incomeTaxCurrentBuildingTax","incomeTaxCurrentRepair","incomeTaxCurrentMaintenance","incomeTaxCurrentInterest","incomeTaxCurrentDepreciation","incomeTaxCurrentInsurance","incomeTaxCurrentIncome","incomeTaxCurrentTaxRate"].forEach(C=>{const _=document.getElementById(C);_&&P(_)});const i=document.getElementById("incomeTaxCurrentIncome").value,n=document.getElementById("incomeTaxCurrentTaxRate").value;i==="0"&&n==="0"?s("Current"):(W(),j()),["Rent","Management","LandTax","BuildingTax","Repair","Maintenance","Interest","Depreciation","Insurance"].forEach(C=>{const _=document.getElementById(`incomeTaxCurrent${C}`),B=document.getElementById(`incomeTaxForecast${C}`);_&&B&&(B.value=_.value)});const y=document.getElementById("incomeTaxCurrentIncome"),b=document.getElementById("incomeTaxCurrentTaxRate"),F=document.getElementById("incomeTaxForecastIncome"),$=document.getElementById("incomeTaxForecastTaxRate");y&&F&&(F.value=y.value),b&&$&&($.value=b.value),["incomeTaxForecastRent","incomeTaxForecastManagement","incomeTaxForecastLandTax","incomeTaxForecastBuildingTax","incomeTaxForecastRepair","incomeTaxForecastMaintenance","incomeTaxForecastInterest","incomeTaxForecastDepreciation","incomeTaxForecastInsurance","incomeTaxForecastIncome","incomeTaxForecastTaxRate"].forEach(C=>{const _=document.getElementById(C);_&&P(_)}),s("Forecast"),["incomeTaxForecastRent","incomeTaxForecastManagement","incomeTaxForecastLandTax","incomeTaxForecastBuildingTax","incomeTaxForecastRepair","incomeTaxForecastMaintenance","incomeTaxForecastInterest","incomeTaxForecastDepreciation","incomeTaxForecastInsurance"].forEach(C=>{const _=document.getElementById(C);_&&(_.addEventListener("input",B=>{P(B.target),s("Forecast")}),_.addEventListener("blur",B=>{P(B.target)}))})},200),u}function It(X){const c=document.createElement("div");return c.className="tab-content",c.dataset.tab="inheritanceTax",c.innerHTML=`
        <div class="form-container">
            <div class="unimplemented-message">
                <h3>未実装</h3>
                <p>機能追加のご依頼をお待ちしております。<br>ほっとビジネスサポート(株)</p>
            </div>
        </div>
    `,c}function Et(X){const c=document.createElement("div");return c.className="tab-content",c.dataset.tab="borrowing",c.innerHTML=`
        <div class="form-container">
            <div class="unimplemented-message">
                <h3>未実装</h3>
                <p>機能追加のご依頼をお待ちしております。<br>ほっとビジネスサポート(株)</p>
            </div>
        </div>
    `,c}(function(){const X=kintone.$PLUGIN_ID;let c=kintone.plugin.app.getConfig(X);if(typeof c=="string")try{c=JSON.parse(c)}catch{c={}}if(!c||!c.spaceId||!c.ownerAppId||!c.propertyAppId){console.log("BI Dashboard Plugin: プラグイン設定が完了していません。");return}let x=null,E=null,tt=!1;const u=["assetEfficiency","roa","incomeTax","operatingCost","noi"],m=["current","average","forecast"],T=["資産効率(%)","ROA(%)","所得税率(%)","運営コスト率(%)","NOI率(%)"],P=[{label:"現状",border:"rgb(52, 152, 219)",bgRadar:"rgba(52, 152, 219, 0.2)",bgBar:"rgba(52, 152, 219, 0.8)",bwRadar:2,bwBar:1},{label:"平均",border:"rgb(231, 76, 60)",bgRadar:"rgba(231, 76, 60, 0.2)",bgBar:"rgba(231, 76, 60, 0.8)",bwRadar:2,bwBar:1},{label:"試算",border:"rgb(46, 204, 113)",bgRadar:"rgba(46, 204, 113, 0.2)",bgBar:"rgba(46, 204, 113, 0.8)",bwRadar:2,bwBar:1}];let h={};const et=["app.record.detail.show","app.record.edit.show","app.record.create.show"];kintone.events.on(et,function(e){return setTimeout(()=>{const r=kintone.app.record.getSpaceElement(c.spaceId);if(!r){console.log(`BI Dashboard Plugin: スペースID '${c.spaceId}' が見つかりません。`);return}t(r,e&&e.record)},0),e});function j(e){e.innerHTML=`
      <div class="loading-container" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div class="loading-spinner" style="
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        "></div>
        <div class="loading-text" style="
          color: #666;
          font-size: 14px;
          text-align: center;
        ">データを読み込み中...</div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
    `}async function W(e,r="",o=500){const a=[];let f=null,g=!0,p=0,v=0;const N=3;for(console.log(`BI Dashboard Plugin: アプリ${e}の全レコード取得を開始 (シーク法, バッチサイズ: ${o})`);g;)try{const R={app:e,query:r,fields:[],totalCount:!0};f&&(R.query=r?`${r} and $id > ${f}`:`$id > ${f}`);const I=await kintone.api("/k/v1/records.json","GET",R);I.records&&I.records.length>0?(a.push(...I.records),f=I.records[I.records.length-1].$id.value,p+=I.records.length,(p%1e3===0||I.records.length<o)&&console.log(`BI Dashboard Plugin: アプリ${e} - ${p}件取得済み`),I.records.length<o&&(g=!1),v=0):g=!1}catch(R){if(console.error(`BI Dashboard Plugin: アプリ${e}のレコード取得エラー (試行${v+1}/${N}):`,R),v++,v>=N)console.error(`BI Dashboard Plugin: アプリ${e}のレコード取得を最大リトライ回数に達したため終了`),g=!1;else{const I=Math.pow(2,v)*1e3;console.log(`BI Dashboard Plugin: ${I}ms後にリトライします...`),await new Promise(H=>setTimeout(H,I))}}return console.log(`BI Dashboard Plugin: アプリ${e}の全レコード取得完了 - 合計${a.length}件`),{records:a}}async function s(e,r={},o=500){const a=e.map(p=>W(p,r[p]||"",o)),f=await Promise.all(a),g={};return e.forEach((p,v)=>{g[p]=f[v]}),g}async function t(e,r){try{j(e);const o=c.propertyAppId,a=c.ownerAppId,f=r&&c.currentAppOwnerId&&r[c.currentAppOwnerId]?.value||"",g={};f&&c.propertyOwnerId&&(g[o]=`${c.propertyOwnerId} = "${f}"`),f&&c.ownerId&&(g[a]=`${c.ownerId} = "${f}"`);async function p(L,st,k){if(!L)return{records:[]};const lt=/^-?\d+(?:\.\d+)?$/.test(String(k||"").trim());if(st&&k!==""&&k!==void 0&&k!==null){try{const O=await kintone.api("/k/v1/records.json","GET",{app:L,query:`${st} = "${k}"`});if(Array.isArray(O.records)&&O.records.length>0)return O}catch{}if(lt)try{const O=await kintone.api("/k/v1/records.json","GET",{app:L,query:`${st} = ${k}`});if(Array.isArray(O.records)&&O.records.length>0)return O}catch{}}try{return await W(L)}catch{return{records:[]}}}async function v(){try{console.log("BI Dashboard Plugin: 全オーナーデータの並列取得を開始");const L=await s([a,o],g,500);return{owners:L[a]?.records||[],properties:L[o]?.records||[]}}catch(L){return console.error("全オーナーデータの取得に失敗:",L),{owners:[],properties:[]}}}const[N,R,I]=await Promise.all([p(o,c.propertyOwnerId,f),p(a,c.ownerId,f),v()]);try{console.log("BI Dashboard Plugin: fetch summary",{currentOwnerId:f,ownerIdField:c.ownerId,propertyOwnerIdField:c.propertyOwnerId,propertyCount:N.records?.length||0,ownerCount:R.records?.length||0,allOwnersCount:I.owners?.length||0,allPropertiesCount:I.properties?.length||0})}catch{}const H=i(N.records,R.records,I);h=H,l(e,H)}catch(o){console.error("Failed to fetch or process kintone data:",o),e.innerHTML="<p>データの取得に失敗しました。</p>"}}function i(e,r,o){function a(d,dt){return d&&typeof d=="object"&&d!==null&&"value"in d?d:{value:dt}}function f(d){return{property_name:a(d?.[c.propertyName],""),market_price:a(d?.[c.propMarketPrice],0),income:a(d?.[c.propIncome],0),inheritance_tax_value:a(d?.[c.propInheritanceTaxVal],0),property_tax:a(d?.[c.propPropTax],0),management_fee:a(d?.[c.propMgmtFee],0),building_repair_cost:a(d?.[c.propBldgRepair],0),restoration_cost:a(d?.[c.propRestoration],0),maintenance_cost:a(d?.[c.propMaint],0),net_income:a(d?.[c.propNetIncome],0),full_rent:a(d?.[c.propFullRent],0)}}function g(d){return d?{annual_rent:a(d?.[c.ownerAnnRent],0),annual_management_fee:a(d?.[c.ownerAnnMgmtFee],0),land_property_tax:a(d?.[c.ownerLandPropTax],0),building_property_tax:a(d?.[c.ownerBldgPropTax],0),long_term_repair_cost:a(d?.[c.ownerLongTermRepair],0),maintenance_cost:a(d?.[c.ownerMaint],0),loan_interest:a(d?.[c.ownerLoanInterest],0),depreciation:a(d?.[c.ownerDepreciation],0),annual_insurance_premium:a(d?.[c.ownerAnnInsurance],0),inheritance_tax_rate:a(void 0,0),borrowing_rate:a(void 0,0)}:null}const p=Array.isArray(e)?e.map(f):[],v=Array.isArray(r)&&r.length>0?g(r[0]):null;try{console.log("BI Dashboard Plugin: sample normalized",{property:p[0],owner:v})}catch{}let N=0,R=0,I=0,H=0,L=0;p.forEach(d=>{N+=parseFloat(d.market_price?.value||0),R+=parseFloat(d.income?.value||0),I+=parseFloat(d.inheritance_tax_value?.value||0);const dt=parseFloat(d.property_tax?.value||0)+parseFloat(d.management_fee?.value||0)+parseFloat(d.building_repair_cost?.value||0)+parseFloat(d.restoration_cost?.value||0)+parseFloat(d.maintenance_cost?.value||0);H+=dt;const yt=parseFloat(d.full_rent?.value||0);L+=yt,parseFloat(d.income?.value||0),parseFloat(d.inheritance_tax_value?.value||0)});function st(d){const{owners:dt,properties:yt}=d,pt={};yt.forEach(q=>{const S=q[c.propertyOwnerId]?.value;S&&(pt[S]||(pt[S]=[]),pt[S].push(q))});const mt=[];dt.forEach(q=>{const S=q[c.ownerId]?.value;if(!S)return;const Z=pt[S]||[];if(Z.length===0)return;let J=0,vt=0,xt=0,ut=0;Z.forEach(Y=>{const Nt=parseFloat(Y[c.propIncome]?.value||0),At=parseFloat(Y[c.propInheritanceTaxVal]?.value||0),Lt=parseFloat(Y[c.propFullRent]?.value||0),Dt=parseFloat(Y[c.propPropTax]?.value||0)+parseFloat(Y[c.propMgmtFee]?.value||0)+parseFloat(Y[c.propBldgRepair]?.value||0)+parseFloat(Y[c.propRestoration]?.value||0)+parseFloat(Y[c.propMaint]?.value||0);J+=Nt,vt+=At,xt+=Dt,ut+=Lt});const $t=vt>0?J/vt*100:0,Bt=ut>0?xt/ut*100:0,Rt=J-xt,wt=ut>0?Rt/ut*100:0,Q=g(q);let ot=0;if(Q){const Y=parseFloat(Q.annual_management_fee?.value||0)+parseFloat(Q.land_property_tax?.value||0)+parseFloat(Q.building_property_tax?.value||0)+parseFloat(Q.long_term_repair_cost?.value||0)+parseFloat(Q.maintenance_cost?.value||0)+parseFloat(Q.loan_interest?.value||0)+parseFloat(Q.depreciation?.value||0)+parseFloat(Q.annual_insurance_premium?.value||0);ot=parseFloat(Q.annual_rent?.value||0)-Y}let ct=0;ot>4e7?ct=45:ot>18e6?ct=40:ot>9e6?ct=33:ot>695e4?ct=23:ot>33e5?ct=20:ot>195e4?ct=10:ot>0&&(ct=5);const bt=g(q),Pt=parseFloat(bt?.inheritance_tax_rate?.value||0),Mt=parseFloat(bt?.borrowing_rate?.value||0);mt.push({roa:$t,operatingCostRate:Bt,incomeTaxRate:ct,inheritanceTaxRate:Pt,borrowingRate:Mt,noiRate:wt})});const it={roa:0,operatingCost:0,incomeTax:0,inheritanceTax:0,borrowing:0,noi:0};if(mt.length>0){const q=mt.reduce((Z,J)=>(Z.roa+=J.roa,Z.operatingCost+=J.operatingCostRate,Z.incomeTax+=J.incomeTaxRate,Z.inheritanceTax+=J.inheritanceTaxRate,Z.borrowing+=J.borrowingRate,Z.noi+=J.noiRate,Z),{roa:0,operatingCost:0,incomeTax:0,inheritanceTax:0,borrowing:0,noi:0}),S=mt.length;it.roa=q.roa/S,it.operatingCost=q.operatingCost/S,it.incomeTax=q.incomeTax/S,it.inheritanceTax=q.inheritanceTax/S,it.borrowing=q.borrowing/S,it.noi=q.noi/S}return it}const k=st(o||{owners:[],properties:[]}),lt=I>0?R/I*100:0,O=L>0?H/L*100:0,Ft=R-H,ht=L>0?Ft/L*100:0;let nt=0,gt=0,ft=0;if(v){const d=parseFloat(v.annual_management_fee?.value||0)+parseFloat(v.land_property_tax?.value||0)+parseFloat(v.building_property_tax?.value||0)+parseFloat(v.long_term_repair_cost?.value||0)+parseFloat(v.maintenance_cost?.value||0)+parseFloat(v.loan_interest?.value||0)+parseFloat(v.depreciation?.value||0)+parseFloat(v.annual_insurance_premium?.value||0);nt=parseFloat(v.annual_rent?.value||0)-d,gt=parseFloat(v.inheritance_tax_rate?.value||0),ft=parseFloat(v.borrowing_rate?.value||0)}let K=0;return nt>4e7?K=45:nt>18e6?K=40:nt>9e6?K=33:nt>695e4?K=23:nt>33e5?K=20:nt>195e4?K=10:nt>0&&(K=5),{assetEfficiency:{current:lt,average:k.roa,forecast:lt},roa:{current:lt,average:k.roa,forecast:lt},incomeTax:{current:K,average:k.incomeTax,forecast:K},inheritanceTax:{current:gt,average:k.inheritanceTax,forecast:gt},borrowing:{current:ft,average:k.borrowing,forecast:ft},operatingCost:{current:O,average:k.operatingCost,forecast:O},noi:{current:ht,average:k.noi,forecast:ht},propertyDetails:p,ownerDetails:v,calculatedIncomeTaxable:nt,calculatedIncomeTaxRate:K}}function n(e){e&&requestAnimationFrame(()=>{e.style.width="1400px",e.style.minWidth="1400px",e.style.maxWidth="1400px",e.style.boxSizing="border-box"})}function l(e,r){y(e,r);const o=e.querySelector(".container");n(o),M(r),D(),C(),_(),w(),setTimeout(()=>{x&&x.resize(),E&&E.resize()},0)}function y(e,r){e.innerHTML="",e.classList.add("bi-dashboard-plugin");const o=document.createElement("div");o.className="container";const a=document.createElement("div");a.className="top-section",a.appendChild(b(r)),a.appendChild(F());const f=document.createElement("div");f.className="bottom-section";const g=$();f.appendChild(g);const p=_t(r);p.id="roaTab";const v=Tt(r);v.id="operatingCostTab";const N=Ct(r);N.id="incomeTaxTab";const R=It(r.inheritanceTax);R.id="inheritanceTaxTab";const I=Et(r.borrowing);I.id="borrowingTab",f.appendChild(p),f.appendChild(v),f.appendChild(N),f.appendChild(R),f.appendChild(I),o.appendChild(a),o.appendChild(f),e.appendChild(o)}function b(e){const r=document.createElement("div");r.className="table-section";const o=T.map((a,f)=>{const g=u[f],p=e[g];return`<tr>
            <td>${a}</td>
            <td>${p.current.toFixed(1)}</td>
            <td>${p.average.toFixed(1)}</td>
            <td>${p.forecast.toFixed(1)}</td>
        </tr>`}).join("");return r.innerHTML=`
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
                    ${o}
                </tbody>
            </table>
        </div>
    `,r}function F(){const e=document.createElement("div");return e.className="chart-section",e.innerHTML=`
        <div class="chart-container">
            <div class="chart-controls">
                <button class="chart-toggle-button active" data-chart="radar">レーダーチャート</button>
                <button class="chart-toggle-button" data-chart="bar">棒グラフ</button>
                <div class="compression-control">
                    <input type="checkbox" id="compressionCheckbox" class="compression-checkbox">
                    <label for="compressionCheckbox">平均を1として比較する</label>
                </div>
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
    `,e}function $(){const e=document.createElement("div");e.className="tabs";const r=[{key:"roa",label:"資産効率・ROA",active:!0},{key:"operatingCost",label:"運営コスト率・NOI"},{key:"incomeTax",label:"所得税率"}];return e.innerHTML=r.map(o=>`
        <button class="tab-button${o.active?" active":""}" data-tab="${o.key}">${o.label}</button>
    `).join(""),e}function M(e){const r=document.getElementById("radarChart").getContext("2d"),o=document.getElementById("barChart").getContext("2d"),a=m.map((g,p)=>({label:P[p].label,data:V(g,e),borderColor:P[p].border,backgroundColor:P[p].bgRadar,borderWidth:P[p].bwRadar})),f=m.map((g,p)=>({label:P[p].label,data:V(g,e),backgroundColor:P[p].bgBar,borderColor:P[p].border,borderWidth:P[p].bwBar}));x=new Chart(r,{type:"radar",data:{labels:T,datasets:a},options:{responsive:!0,maintainAspectRatio:!1,animation:!1,resizeDelay:100,scales:{r:{beginAtZero:!0,max:100,min:0}},plugins:{legend:{position:"bottom"}}}}),E=new Chart(o,{type:"bar",data:{labels:T,datasets:f},options:{responsive:!0,maintainAspectRatio:!1,animation:!1,resizeDelay:100,scales:{y:{beginAtZero:!0,max:100,min:0}},plugins:{legend:{position:"bottom"}}}}),at()}function D(){document.querySelectorAll('input[type="number"]').forEach(e=>{e.addEventListener("input",function(){const r=A(this.id);if(!r)return;const{metric:o,field:a}=r;h[o][a]=parseFloat(this.value)||0,w(),U()})})}function C(){document.querySelectorAll(".tab-button").forEach(e=>{e.addEventListener("click",()=>{rt(e.dataset.tab)})}),document.querySelectorAll(".chart-toggle-button").forEach(e=>{e.addEventListener("click",()=>{z(e.dataset.chart)})}),document.querySelectorAll(".compression-checkbox").forEach(e=>{e.addEventListener("change",()=>{G()})})}function _(){document.addEventListener("incomeTax:taxRateUpdated",e=>{const r=e&&e.detail?e.detail:{},o=r.rowType,a=Number(r.taxRate)||0;o==="Current"?h.incomeTax.current=a:o==="Forecast"?h.incomeTax.forecast=a:o==="Average"&&(h.incomeTax.average=a),w(),U()}),window.setIncomeTaxRate=function(e,r){const o=(e||"").toLowerCase(),a=Number(r)||0;o==="current"&&(h.incomeTax.current=a),o==="forecast"&&(h.incomeTax.forecast=a),o==="average"&&(h.incomeTax.average=a),w(),U()},document.addEventListener("operatingCost:rateUpdated",e=>{const r=e&&e.detail?e.detail:{},o=r.rowType,a=Number(r.rate)||0;o==="Current"?h.operatingCost.current=a:o==="Forecast"&&(h.operatingCost.forecast=a),w(),U()})}function B(e){return e.charAt(0).toUpperCase()+e.slice(1)}function A(e){for(const r of m){const o=B(r);if(e.endsWith(o)){const a=e.slice(0,-o.length);if(u.includes(a))return{metric:a,field:r}}}return null}function w(){document.querySelectorAll("#dataTable tbody tr").forEach((r,o)=>{const a=u[o];if(!a||!h[a])return;const f=h[a],g=r.querySelectorAll("td");g.length<4||(g[1].textContent=f.current.toFixed(1),g[2].textContent=f.average.toFixed(1),g[3].textContent=f.forecast.toFixed(1))})}function V(e,r=h){return tt?u.map(o=>{const a=r[o].average,f=r[o].current,g=r[o].forecast;return e==="current"?a>0?f/a:0:e==="forecast"?a>0?g/a:0:1}):u.map(o=>r[o][e])}function U(){at(),m.forEach((e,r)=>{const o=V(e);x.data.datasets[r].data=o,E.data.datasets[r].data=o}),x.update(),E.update()}function rt(e){document.querySelectorAll(".tab-content").forEach(a=>a.classList.remove("active")),document.querySelectorAll(".tab-button").forEach(a=>a.classList.remove("active"));const r=document.querySelector(`.tab-content[data-tab="${e}"]`)||document.getElementById(`${e}Tab`),o=document.querySelector(`.tab-button[data-tab="${e}"]`);r&&r.classList.add("active"),o&&o.classList.add("active")}function z(e){document.querySelectorAll(".chart-toggle-button").forEach(a=>a.classList.remove("active"));const r=document.getElementById("radarChartContainer"),o=document.getElementById("barChartContainer");if(!(!r||!o))if(r.style.display="none",o.style.display="none",e==="radar"){r.style.display="block";const a=document.querySelector('.chart-toggle-button[data-chart="radar"]');a&&a.classList.add("active"),requestAnimationFrame(()=>{x&&x.resize()})}else{o.style.display="block";const a=document.querySelector('.chart-toggle-button[data-chart="bar"]');a&&a.classList.add("active"),requestAnimationFrame(()=>{E&&E.resize()})}}function G(){const e=document.querySelector(".compression-checkbox");e&&(tt=e.checked),at(),U()}function at(){if(tt){const e=Math.max(...u.map(p=>{const v=h[p].current,N=h[p].forecast,R=h[p].average,I=R>0?v/R:0,H=R>0?N/R:0;return Math.max(I,H,1)})),r=Math.min(...u.map(p=>{const v=h[p].current,N=h[p].forecast,R=h[p].average,I=R>0?v/R:0,H=R>0?N/R:0;return Math.min(I,H,1)})),o=Math.max(e-1,1-r),a=Math.max(o*.2,.2),f=1+o+a,g=Math.max(1-o-a,0);x&&(x.options.scales.r.max=f,x.options.scales.r.min=g),E&&(E.options.scales.y.max=f,E.options.scales.y.min=g)}else if(x&&(x.options.scales.r.max=100,x.options.scales.r.min=0),E){const e=Math.max(...u.map(g=>{const p=h[g].current,v=h[g].forecast,N=h[g].average;return Math.max(p,v,N)})),r=Math.min(...u.map(g=>{const p=h[g].current,v=h[g].forecast,N=h[g].average;return Math.min(p,v,N)})),o=Math.max((e-r)*.1,5),a=e+o,f=Math.max(r-o,0);E.options.scales.y.max=a,E.options.scales.y.min=f}}})()})();
