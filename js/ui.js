let zeusChartInstance = null;
let elipseStatusChartInstance = null;
let elipseCurrentsChartInstance = null;
let comparisonChartZeusInstance = null;
let comparisonChartElipseInstance = null;
let statusChartInstance = null;

// Mapa de variáveis globais para a aba Comparativo
const variableOptions = {
    // Zeus
    'Zeus Vazão (L/s)': { color: '#1890ff', yAxisID: 'yVazao', source: 'zeus', dataKey: 'vazao' },
    'Zeus Pres. Rec. (mca)': { color: '#27ae60', yAxisID: 'yPressao', source: 'zeus', dataKey: 'pressao_rec' },
    'Zeus Pres. Suc. (mca)': { color: '#f39c12', yAxisID: 'yPressao', source: 'zeus', dataKey: 'pressao_suc' },
    // Elipse
    'Elipse Pres. Suc. (mca)': { color: '#f39c12', yAxisID: 'yPressao', borderDash: [5, 5], source: 'elipse', dataKey: 'pressao_suc' },
    'Elipse Pres. Rec. (mca)': { color: '#e74c3c', yAxisID: 'yPressao', borderDash: [5, 5], source: 'elipse', dataKey: 'pressao_rec' },
    'Elipse Nível Sup. (m)': { color: '#3498db', yAxisID: 'yNivel', source: 'elipse', dataKey: 'nivel_rsv_superior' },
    'Elipse Nível Inf. (m)': { color: '#8e44ad', yAxisID: 'yNivel', source: 'elipse', dataKey: 'nivel_rsv_inferior', borderDash: [5, 5] },
    'Elipse Corr. B1 (A)': { color: '#3498db', yAxisID: 'yCorrente', borderDash: [5, 5], source: 'elipse', dataKey: 'corrente_gmb1' },
    'Elipse Corr. B2 (A)': { color: '#2ecc71', yAxisID: 'yCorrente', borderDash: [5, 5], source: 'elipse', dataKey: 'corrente_gmb2' },
    'Elipse Corr. B3 (A)': { color: '#9b59b6', yAxisID: 'yCorrente', borderDash: [5, 5], source: 'elipse', dataKey: 'corrente_gmb3' },
    'Elipse Modo Controle': { color: '#7f8c8d', yAxisID: 'yStatus', source: 'elipse', dataKey: 'modo_controle' },
    'Elipse Falha Comunicação': { color: '#c0392b', yAxisID: 'yStatus', source: 'elipse', dataKey: 'falha_comunicacao' }
};

const elements = {
    analiseTbody: document.getElementById('analise-tbody'),
    analiseThead: document.getElementById('analise-thead'),
    alertsTbody: document.getElementById('alertas-tbody'),
    stationsMenu: document.getElementById('stations-menu'),
    kpiAlertas: document.getElementById('kpi-alertas'),
    kpiEbats: document.getElementById('kpi-ebats'),
    kpiDados: document.getElementById('kpi-dados-percent'), // KPI Global
    kpiDadosCard: document.getElementById('kpi-dados-card'), // Card KPI Global
    detalhePage: document.getElementById('detalhe-estacao'),
    detalheTabs: document.querySelectorAll('#detalhe-estacao .modal-tabs .tab-link'),
    detalheTabContents: document.querySelectorAll('#detalhe-estacao .tab-content'),
    allPages: document.querySelectorAll('.page')
};

// --- Funções Auxiliares ---

function getStatusClass(commPercent) {
    if (commPercent == null) return 'critico';
    if (commPercent > 99) return 'normal'; // 100% = verde
    if (commPercent >= 85) return 'atencao'; // 85-99% = amarelo
    return 'critico'; // < 85% = vermelho
}

export function populateStationsMenu(stations) {
    if (!elements.stationsMenu || !Array.isArray(stations)) return;
    elements.stationsMenu.innerHTML = stations
        .filter(s => s && s.name)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(station => {
            const stationId = station.id ?? Math.random();
            return `<li class="station-item" data-id="${stationId}"><span class="status-dot ${getStatusClass(station.comm_percent)}"></span> ${station.name}</li>`;
        }).join('');
}

export function populateAnaliseTable(stations) {
    if (!elements.analiseTbody) return;
    elements.analiseTbody.innerHTML = '';
    if (!stations || stations.length === 0) {
        elements.analiseTbody.innerHTML = '<tr><td colspan="4">Nenhuma estação encontrada.</td></tr>';
        return;
    }
    stations.forEach(station => {
         if (!station) return;
        const commStatusClass = getStatusClass(station.comm_percent) === 'normal' ? 'status-ok' : 'status-fail';
        const stationId = station.id ?? Math.random();
        elements.analiseTbody.innerHTML += `<tr data-id="${stationId}"><td><a href="#" class="station-link" data-id="${stationId}">${station.name ?? 'Nome Indefinido'}</a></td><td><span class="status ${commStatusClass}">${station.comm_percent?.toFixed(1) ?? 'N/A'}%</span></td><td>${station.vazao_ult?.toFixed(1) ?? 'N/A'}</td><td>${station.vazao_med?.toFixed(1) ?? 'N/A'}</td></tr>`;
    });
}

export function populateAlertsTable(alerts) {
     if (!elements.alertsTbody) return;
    elements.alertsTbody.innerHTML = '';
    if (!alerts || alerts.length === 0) {
        elements.alertsTbody.innerHTML = '<tr><td colspan="4">Nenhum alerta recente.</td></tr>';
        return;
    }
    alerts.forEach(alert => {
        elements.alertsTbody.innerHTML += `<tr><td>${alert?.date ?? 'N/A'}</td><td>${alert?.ebat ?? 'N/A'}</td><td>${alert?.event ?? 'N/A'}</td><td><span class="status status-${alert?.status ?? 'unknown'}">${alert?.status ?? 'Desconhecido'}</span></td></tr>`;
    });
}

export function updateDashboardGeral(alerts, stations) {
    if(elements.kpiEbats) elements.kpiEbats.textContent = stations?.length ?? 0;
    const criticalAlerts = alerts?.filter(a => a?.status === 'Crítica').length ?? 0;
    if(elements.kpiAlertas) elements.kpiAlertas.textContent = criticalAlerts;

    // --- LÓGICA PARA KPI "DADOS ENTREGUES" (Global) ---
    if (elements.kpiDados && elements.kpiDadosCard && stations && stations.length > 0) {
        const validStations = stations.filter(s => s?.comm_percent != null);
        const totalComm = validStations.reduce((sum, s) => sum + s.comm_percent, 0);
        const avgComm = validStations.length > 0 ? (totalComm / validStations.length) : 0;

        elements.kpiDados.textContent = `${avgComm.toFixed(1)}%`;

        elements.kpiDadosCard.classList.remove('success-kpi', 'warning-kpi', 'alert-kpi');

        if (avgComm > 99) {
            elements.kpiDadosCard.classList.add('success-kpi');
        } else if (avgComm >= 85) {
            elements.kpiDadosCard.classList.add('warning-kpi');
        } else {
            elements.kpiDadosCard.classList.add('alert-kpi');
        }
    } else if (elements.kpiDados) {
         elements.kpiDados.textContent = '0%';
    }
}

export function showPage(pageId) {
    if (!elements.allPages) return;
    elements.allPages.forEach(page => page.classList.remove('active'));
    const newPage = document.getElementById(pageId);
    if (newPage) newPage.classList.add('active');
}

export function activateTab(tabId) {
    const tabs = document.querySelectorAll('#detalhe-estacao .modal-tabs .tab-link');
    const contents = document.querySelectorAll('#detalhe-estacao .tab-content');
    tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabId));
    contents.forEach(content => content.classList.toggle('active', content.id.includes(tabId)));
}

export function toggleLoading(element, show) {
    if (element) element.style.display = show ? 'block' : 'none';
}

export function updateSortIcons(sortKey, sortOrder) {
    if (!elements.analiseThead) return;
    elements.analiseThead.querySelectorAll('th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        const icon = th.querySelector('i');
        if (icon) {
            icon.className = 'fas';
        }
        if (th.dataset.sort === sortKey) {
            th.classList.add(sortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc');
            if (icon) icon.classList.add(`fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`);
        }
    });
}

// --- Funções de Renderização das Abas de Detalhe ---

export function showStationDetailPage(station) {
    if (!station) {
        console.error("showStationDetailPage chamada com dados de estação inválidos:", station);
        return;
    }

    showPage('detalhe-estacao');

    const card = elements.detalhePage.querySelector('.card');
    if (card) {
        const tabs = card.querySelector('.modal-tabs');

        const oldKpiGrid = card.querySelector('.station-kpi-grid');
        if (oldKpiGrid) oldKpiGrid.remove();

        const kpiGrid = document.createElement('div');
        kpiGrid.className = 'station-kpi-grid'; // Classe para o grid (definida no CSS)

        // KPI de "Dados Entregues"
        const commPercent = station.comm_percent;
        const commStatus = getStatusClass(commPercent);
        let commKpiClass = '';
        if (commStatus === 'normal') commKpiClass = 'success-kpi';
        else if (commStatus === 'atencao') commKpiClass = 'warning-kpi';
        else if (commStatus === 'critico') commKpiClass = 'alert-kpi';

        const kpiDadosHTML = `
            <div class="kpi-card ${commKpiClass}" id="station-comm-kpi-card">
                <div class="kpi-title">Dados Entregues (Esta Estação)</div>
                <div class="kpi-value">${commPercent?.toFixed(1) ?? 'N/A'}%</div>
                <div class="kpi-subtitle">Status de comunicação desta estação</div>
            </div>
        `;

        // KPI de "Alertas Ativos"
        const alertCount = station.elipse?.station_alerts?.length ?? 0;
        const alertClass = alertCount > 0 ? 'alert-kpi' : 'success-kpi';
        const alertText = alertCount === 1 ? 'Alerta Ativo' : 'Alertas Ativos';

        const kpiAlertasHTML = `
            <div class="kpi-card ${alertClass} ${alertCount > 0 ? 'clickable' : ''}" id="station-alerts-kpi-btn">
                <div class="kpi-title">${alertText}</div>
                <div class="kpi-value">${alertCount}</div>
                <div class="kpi-subtitle">Eventos críticos ou de atenção</div>
            </div>
        `;

        kpiGrid.innerHTML = kpiDadosHTML + kpiAlertasHTML;

        if (tabs) {
            card.insertBefore(kpiGrid, tabs);
        } else {
            card.appendChild(kpiGrid); // Fallback
        }

        // Adiciona o Event Listener para o KPI de Alertas (se houver alertas)
        if (alertCount > 0) {
            const kpiBtn = card.querySelector('#station-alerts-kpi-btn');
            if (kpiBtn) {
                kpiBtn.addEventListener('click', () => {
                    activateTab('station-alerts');
                });
            }
        }

        // Gerencia a exibição e o texto da ABA de Alertas
        const alertTabBtn = document.getElementById('station-alerts-tab-btn');
        if (alertTabBtn) {
            if (alertCount > 0) {
                alertTabBtn.style.display = 'inline-block';
                alertTabBtn.classList.add('has-alerts');
                alertTabBtn.textContent = `Alertas da Estação (${alertCount})`;
            } else {
                alertTabBtn.style.display = 'none';
                alertTabBtn.classList.remove('has-alerts');
            }
        }
    }

    const zeusContentEl = document.getElementById('modal-zeus-content');
    const elipseContentEl = document.getElementById('modal-elipse-content');
    const sigesContentEl = document.getElementById('modal-siges-content');
    const comparativoContentEl = document.getElementById('modal-comparativo-content');
    const stationAlertsContentEl = document.getElementById('modal-station-alerts-content');

    if(zeusContentEl) zeusContentEl.innerHTML = `<div class="info-grid" id="zeus-kpis"></div><div class="info-grid" id="zeus-kpis-extra"></div><h4>Histórico de Vazão e Pressão</h4><div class="chart-container"><canvas id="zeus-chart"></canvas></div>`;
    if(elipseContentEl) elipseContentEl.innerHTML = `<div class="info-grid" id="elipse-kpis"></div><div class="info-grid" id="elipse-kpis-extra"></div><h4>Monitoramento em Tempo Real</h4><div class="scada-diagram" id="elipse-diagram-container"></div><h4>Leituras Atuais (Pressão e Nível)</h4><div class="chart-container" style="height: 250px;"><canvas id="elipse-status-chart"></canvas></div><h4>Corrente das Bombas (Amperes)</h4><div class="chart-container"><canvas id="elipse-currents-chart"></canvas></div>`;
    if(sigesContentEl) sigesContentEl.innerHTML = `<h4>Lista de Ativos da Estação</h4><div class="table-container"><table class="data-table"><thead><tr><th>Posição</th><th>Descrição</th><th>Especificação</th></tr></thead><tbody id="modal-siges-tbody"></tbody></table></div>`;
    if(comparativoContentEl) comparativoContentEl.innerHTML = `
        <h4>Comparativo Histórico</h4>
        <div class="comparison-controls">
            <div class="date-range">
                <label for="comp-start-date">De:</label>
                <input type="date" id="comp-start-date" placeholder="dd/mm/aaaa">
                <label for="comp-end-date">Até:</label>
                <input type="date" id="comp-end-date" placeholder="dd/mm/aaaa">
                <small style="margin-left: 10px; color: #777;" id="date-filter-info">(Filtro funcional com dados reais)</small>
            </div>
            <button id="update-comparison-charts-btn" class="update-btn">Atualizar Gráficos</button>
        </div>

        <div class="comparison-charts-grid">
            <div class="chart-section">
                <h5>Dados Históricos ZEUS</h5>
                <div class="form-group comparison-select-group">
                     <label for="comp-select-zeus">Selecione a Variável:</label>
                     <select id="comp-select-zeus">
                         <option value="">-- Selecione (Zeus) --</option>
                     </select>
                </div>
                <div class="chart-container" style="height: 350px;"><canvas id="comparison-chart-zeus"></canvas></div>
            </div>
             <div class="chart-section">
                <h5>Dados Históricos ELIPSE</h5>
                 <div class="form-group comparison-select-group">
                     <label for="comp-select-elipse">Selecione as Variáveis (Ctrl+Click):</label>
                     <select id="comp-select-elipse" multiple size="5">
                         </select>
                </div>
                <div class="chart-container" style="height: 350px;"><canvas id="comparison-chart-elipse"></canvas></div>
            </div>
        </div>`;

    if(stationAlertsContentEl) stationAlertsContentEl.innerHTML = '';


    // Renderiza os dados nas abas correspondentes
    if (station.zeus?.isReal && zeusContentEl) { renderZeusData(station); }
    else if (zeusContentEl) { zeusContentEl.innerHTML = '<p>Não há dados detalhados do ZEUS para esta estação.</p>'; }

    if (station.elipse?.isReal && elipseContentEl) { renderElipseData(station); }
    else if (elipseContentEl) { elipseContentEl.innerHTML = '<p>Não há dados detalhados do Elipse para esta estação.</p>'; }

    if (station.siges?.ativos?.length > 0 && sigesContentEl) { renderSigesData(station); }
    else {
        const sigesTbody = document.getElementById('modal-siges-tbody');
        if(sigesTbody) {
            sigesTbody.innerHTML = '<tr><td colspan="3">Nenhum ativo SIGES encontrado.</td></tr>';
        } else if (sigesContentEl) {
             sigesContentEl.innerHTML = `<h4>Lista de Ativos da Estação</h4><p>Nenhum ativo SIGES encontrado.</p>`;
        }
    }

    renderStationAlertsData(station); // Renderiza a aba de Alertas

    // Renderiza os CONTROLES da aba comparativo
    if (comparativoContentEl) {
        if (!station.zeus?.isReal && !station.elipse?.isReal) {
             comparativoContentEl.innerHTML = '<p>Não há dados históricos de Zeus ou Elipse para comparação nesta estação.</p>';
        } else {
             renderComparisonControls(station);
        }
    } else {
        console.error("Elemento #modal-comparativo-content não encontrado.");
    }

    activateTab('zeus'); 
}

// Renderiza a tabela de alertas na nova aba "Alertas da Estação"
function renderStationAlertsData(station) {
    const contentEl = document.getElementById('modal-station-alerts-content');
    if (!contentEl) return;

    const alerts = station.elipse?.station_alerts;

    if (!alerts || alerts.length === 0) {
        contentEl.innerHTML = '<h4>Alertas da Estação</h4><p>Nenhum alerta ativo para esta estação.</p>';
        return;
    }

    let tableRows = alerts.map(alert => `
        <tr>
            <td>${alert.date ?? 'N/A'}</td>
            <td>${alert.event ?? 'N/A'}</td>
            <td><span class="status status-${alert.status ?? 'unknown'}">${alert.status ?? 'Desconhecido'}</span></td>
        </tr>
    `).join('');

    contentEl.innerHTML = `
        <h4>Alertas Ativos da Estação</h4>
        <div class="table-container">
            <table class="alert-table">
                <thead>
                    <tr>
                        <th>Data/Hora</th>
                        <th>Evento</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

function renderZeusData(station) {
    const kpiContainer = document.getElementById('zeus-kpis');
    const kpiExtraContainer = document.getElementById('zeus-kpis-extra');
    const kpiPressaoSuc = station.elipse?.pressao_suc ?? station.zeus?.pressao_suc ?? 'N/A';
    const kpiPressaoRec = station.elipse?.pressao_rec ?? station.zeus?.pressao_rec ?? 'N/A';

    if (kpiContainer) kpiContainer.innerHTML = `<div class="info-item"><span class="label">Vazão Atual</span><span class="value">${station.vazao_ult?.toFixed(1) ?? 'N/A'} L/s</span></div><div class="info-item"><span class="label">Pressão de Sucção</span><span class="value">${kpiPressaoSuc} mca</span></div><div class="info-item"><span class="label">Pressão de Recalque</span><span class="value">${kpiPressaoRec} mca</span></div><div class="info-item"><span class="label">Pico de Vazão (24h)</span><span class="value">${station.vazao_pico_24h?.toFixed(1) ?? 'N/A'} L/s</span></div>`;
    if (kpiExtraContainer) kpiExtraContainer.innerHTML = `<div class="info-item"><span class="label">Eficiência Energética</span><span class="value">${station.eficiencia_energetica ?? 'N/A'} kWh/m³</span></div><div class="info-item"><span class="label">Tempo de Operação (24h)</span><span class="value">${station.tempo_operacao_24h ?? 'N/A'} h</span></div><div class="info-item"><span class="label">Última Leitura</span><span class="value">${station.leitura ?? 'N/A'}</span></div>`;

    const canvas = document.getElementById('zeus-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (zeusChartInstance) zeusChartInstance.destroy();

    if (!station.zeus?.chartData?.labels || station.zeus.chartData.labels.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.font = '16px Roboto'; ctx.textAlign = 'center'; ctx.fillText('Dados históricos Zeus não disponíveis.', canvas.width / 2, canvas.height / 2); return;
    }

    const operationalLimitsPlugin = { id: 'operationalLimits', afterDraw: chart => { const { ctx, chartArea: { top, bottom, left, right }, scales: { yPressao } } = chart; const limites = station.zeus?.limites; ctx.save(); if (limites?.pressao_max && yPressao) { const y = yPressao.getPixelForValue(limites.pressao_max); if (y >= top && y <= bottom) { ctx.beginPath(); ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); ctx.fillStyle = '#e74c3c'; ctx.textAlign = 'right'; ctx.font = '12px Roboto'; ctx.fillText(`Pressão Máx: ${limites.pressao_max} mca`, right - 5, y - 5); ctx.setLineDash([]); } } ctx.restore(); } };

    zeusChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: station.zeus.chartData.labels,
            datasets: [
                { label: 'Vazão (L/s)', data: station.zeus.chartData.vazao || [], borderColor: '#1890ff', backgroundColor: 'rgba(24, 144, 255, 0.1)', yAxisID: 'yVazao', tension: 0.1, fill: true },
                { label: 'Pressão Recalque (mca)', data: station.zeus.chartData.pressao_rec || [], borderColor: '#27ae60', yAxisID: 'yPressao', tension: 0.1 },
                { label: 'Pressão Sucção (mca)', data: station.zeus.chartData.pressao_suc || [], borderColor: '#f39c12', yAxisID: 'yPressao', tension: 0.1, borderDash: [5, 5] }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'timeseries', time: { unit: 'minute', tooltipFormat: 'dd/MM/yyyy HH:mm', displayFormats: { minute: 'HH:mm', hour: 'dd/MM HH:00', day: 'dd/MM/yy' } }, title: { display: true, text: 'Data / Hora' } },
                yVazao: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Vazão (L/s)' } },
                yPressao: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Pressão (mca)' }, grid: { drawOnChartArea: false } }
            }
        },
        plugins: [operationalLimitsPlugin]
    });
}

function renderElipseData(station) {
    renderElipseKPIs(station);
    renderElipseDiagram(station);
    renderElipseStatusChart(station);
    renderElipseCurrentsChart(station);
}

function renderElipseKPIs(station) {
    const { elipse } = station;
    const kpiContainer = document.getElementById('elipse-kpis');
    const kpiExtraContainer = document.getElementById('elipse-kpis-extra');
    if (!kpiContainer || !kpiExtraContainer) return;

    kpiContainer.innerHTML = `
        <div class="info-item"><span class="label">Horímetro Bomba 1</span><span class="value">${elipse.horimetro_b1?.toLocaleString('pt-BR') ?? 'N/A'} h</span></div>
        <div class="info-item"><span class="label">Horímetro Bomba 2</span><span class="value">${elipse.horimetro_b2?.toLocaleString('pt-BR') ?? 'N/A'} h</span></div>
        <div class="info-item"><span class="label">Horímetro Bomba 3</span><span class="value">${elipse.horimetro_b3?.toLocaleString('pt-BR') ?? 'N/A'} h</span></div>
    `;

    kpiExtraContainer.innerHTML = `<div class="info-item"><span class="label">Partidas B1 (24h)</span><span class="value">${elipse.partidas_b1_24h ?? 'N/A'}</span></div><div class="info-item"><span class="label">Partidas B2 (24h)</span><span class="value">${elipse.partidas_b2_24h ?? 'N/A'}</span></div><div class="info-item"><span class="label">Partidas B3 (24h)</span><span class="value">${elipse.partidas_b3_24h ?? 'N/A'}</span></div>`;
}

function renderElipseDiagram(station) {
    const { elipse } = station;
    const diagramContainer = document.getElementById('elipse-diagram-container');
    const bombas = elipse.bombas || {};
    if (diagramContainer) {
        diagramContainer.innerHTML = `<div class="elipse-grid"><div class="elipse-item"><span class="elipse-label">Modo de Controle</span><span class="elipse-value">${elipse.modo_controle ?? 'N/A'}</span></div></div><div class="pump-station">${Object.keys(bombas).map((bombaKey, index) => `<div class="pump"><div class="pump-icon ${bombas[bombaKey] ? 'active' : 'inactive'}"><i class="fas fa-sync"></i></div><span>Bomba ${index + 1}</span><span class="pump-status">${bombas[bombaKey] ? 'Ligada' : 'Desligada'}</span></div>`).join('')}</div>`;
    }
}

function renderElipseStatusChart(station) {
    const { elipse } = station;
    const canvas = document.getElementById('elipse-status-chart');
    if (!canvas) return;
    const statusCtx = canvas.getContext('2d');
    if (elipseStatusChartInstance) elipseStatusChartInstance.destroy();

    const limites = elipse.limites || {};
    const alarmLimitsPlugin = { id: 'alarmLimits', afterDraw: chart => { const { ctx, scales: { y } } = chart; const meta = chart.getDatasetMeta(0); ctx.save(); meta.data.forEach((bar, index) => { const label = chart.data.labels[index]; let limitValue = null; if (label.includes('Pressão Recalque') && limites.pressao_rec_max) limitValue = limites.pressao_rec_max; if (label.includes('Nível') && limites.nivel_sup_min) limitValue = limites.nivel_sup_min; if (limitValue !== null) { const yPos = y.getPixelForValue(limitValue); ctx.beginPath(); ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.moveTo(bar.x - (bar.width / 2), yPos); ctx.lineTo(bar.x + (bar.width / 2), yPos); ctx.stroke(); } }); ctx.restore(); } };

    elipseStatusChartInstance = new Chart(statusCtx, { type: 'bar', data: { labels: ['Pressão Sucção (mca)', 'Pressão Recalque (mca)', 'Nível RSV Inf. (m)', `Nível ${elipse.nivel_rsv_superior_nome ?? 'RSV Sup.'} (m)`], datasets: [{ label: 'Valores Atuais', data: [elipse.pressao_suc, elipse.pressao_rec, elipse.nivel_rsv_inferior, elipse.nivel_rsv_superior_valor], backgroundColor: ['#3498db', '#2980b9', '#f1c40f', '#f39c12'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }, plugins: [alarmLimitsPlugin] });
}

function renderElipseCurrentsChart(station) {
    const canvas = document.getElementById('elipse-currents-chart');
     if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (elipseCurrentsChartInstance) elipseCurrentsChartInstance.destroy();

    const chartData = station.elipse?.chartData;
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.font = '16px Roboto'; ctx.textAlign = 'center'; ctx.fillText('Dados históricos de corrente não disponíveis.', canvas.width / 2, canvas.height / 2); return;
    }

    const datasets = [];
    if ('gmb1' in chartData) datasets.push({ label: 'Corrente GMB 1', data: chartData.gmb1 || [], borderColor: '#3498db', tension: 0.1 });
    if ('gmb2' in chartData) datasets.push({ label: 'Corrente GMB 2', data: chartData.gmb2 || [], borderColor: '#2ecc71', tension: 0.1 });
    if ('gmb3' in chartData) datasets.push({ label: 'Corrente GMB 3', data: chartData.gmb3 || [], borderColor: '#f1c40f', tension: 0.1 });

    elipseCurrentsChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: chartData.labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                 x: { type: 'timeseries', time: { unit: 'second', tooltipFormat: 'dd/MM/yyyy HH:mm:ss', displayFormats: { second: 'HH:mm:ss' } }, title: { display: true, text: 'Data / Hora' } }
            }
        }
    });
}

function renderComparisonControls(station) {
    const selectZeus = document.getElementById('comp-select-zeus');
    const selectElipse = document.getElementById('comp-select-elipse');
    const startDateInput = document.getElementById('comp-start-date');
    const endDateInput = document.getElementById('comp-end-date');
    const dateInfo = document.getElementById('date-filter-info');
    if (!selectZeus || !selectElipse || !startDateInput || !endDateInput || !dateInfo) return;

    selectZeus.innerHTML = ''; 
    selectElipse.innerHTML = '';

    const labelsZeus = station.zeus?.chartData?.labels ?? [];
    const labelsElipse = station.elipse?.historyChartData?.labels ?? [];
    const hasZeusData = station.zeus?.isReal && labelsZeus.length > 0;
    const hasElipseData = station.elipse?.isReal && labelsElipse.length > 0;

    console.log("DEBUG RENDER: Zeus isReal:", station.zeus?.isReal, "Labels Zeus Length:", labelsZeus.length);

    const controlsContainer = document.querySelector('.comparison-variable-selectors');
    if (!hasZeusData && !hasElipseData) {
       if(controlsContainer) controlsContainer.style.display = 'none';
        const ctxZeus = document.getElementById('comparison-chart-zeus')?.getContext('2d');
        const ctxElipse = document.getElementById('comparison-chart-elipse')?.getContext('2d');
        if(comparisonChartZeusInstance) comparisonChartZeusInstance.destroy();
        if(comparisonChartElipseInstance) comparisonChartElipseInstance.destroy();
        if(ctxZeus) { ctxZeus.clearRect(0,0,ctxZeus.canvas.width, ctxZeus.canvas.height); ctxZeus.fillText('Sem dados para comparar.', ctxZeus.canvas.width/2, ctxZeus.canvas.height/2); }
        if(ctxElipse) { ctxElipse.clearRect(0,0,ctxElipse.canvas.width, ctxElipse.canvas.height); ctxElipse.fillText('Sem dados para comparar.', ctxElipse.canvas.width/2, ctxElipse.canvas.height/2); }
        return;
    } else {
        if(controlsContainer) controlsContainer.style.display = 'grid';
    }

    const primaryLabels = hasZeusData ? labelsZeus : (hasElipseData ? labelsElipse : []);

    const allHistoricalData = {
        'Zeus Vazão (L/s)': hasZeusData ? station.zeus.chartData.vazao : null,
        'Zeus Pres. Rec. (mca)': hasZeusData ? station.zeus.chartData.pressao_rec : null,
        'Zeus Pres. Suc. (mca)': hasZeusData ? station.zeus.chartData.pressao_suc : null,
        'Elipse Pres. Suc. (mca)': hasElipseData ? station.elipse.historyChartData.pressao_suc : null,
        'Elipse Pres. Rec. (mca)': hasElipseData ? station.elipse.historyChartData.pressao_rec : null,
        'Elipse Nível Sup. (m)': hasElipseData ? station.elipse.historyChartData.nivel_rsv_superior : null,
        'Elipse Nível Inf. (m)': hasElipseData ? station.elipse.historyChartData.nivel_rsv_inferior : null,
        'Elipse Corr. B1 (A)': hasElipseData ? station.elipse.historyChartData.corrente_gmb1 : null,
        'Elipse Corr. B2 (A)': hasElipseData ? station.elipse.historyChartData.corrente_gmb2 : null,
        'Elipse Corr. B3 (A)': hasElipseData ? station.elipse.historyChartData.corrente_gmb3 : null,
        'Elipse Modo Controle': hasElipseData ? station.elipse.historyChartData.modo_controle : null,
        'Elipse Falha Comunicação': hasElipseData ? station.elipse.historyChartData.falha_comunicacao : null,
    };

    const availableVariables = Object.keys(allHistoricalData).filter(key => {
        if (!variableOptions[key]) return false;
        const source = variableOptions[key].source;
        const sourceLabels = source === 'zeus' ? labelsZeus : labelsElipse;
        return Array.isArray(allHistoricalData[key]) && allHistoricalData[key].length === sourceLabels.length;
    });

    availableVariables.forEach(key => {
        const option = variableOptions[key];
        const el = document.createElement('option');
        el.value = key;
        el.textContent = key.replace('Zeus ', '').replace('Elipse ', '');

        if (option.source === 'zeus') {
            selectZeus.appendChild(el);
        } else if (option.source === 'elipse') {
            selectElipse.appendChild(el);
        }
    });

    const defaultZeusOptions = ['Zeus Vazão (L/s)'];
    Array.from(selectZeus.options).forEach(opt => {
        if (defaultZeusOptions.includes(opt.value)) {
            opt.selected = true;
        }
    });

    const defaultElipseOptions = ['Elipse Pres. Rec. (mca)', 'Elipse Corr. B2 (A)'];
    Array.from(selectElipse.options).forEach(opt => {
        if (defaultElipseOptions.includes(opt.value)) {
            opt.selected = true;
        }
    });

    selectZeus.disabled = !hasZeusData;
    selectElipse.disabled = !hasElipseData;

    // --- Date Picker Logic ---
    const formatDate = (label) => { try { return new Date(label).toISOString().split('T')[0]; } catch { return null; } };
    const firstDate = primaryLabels.length > 0 ? formatDate(primaryLabels[0]) : null;
    const lastDate = primaryLabels.length > 0 ? formatDate(primaryLabels[primaryLabels.length - 1]) : null;

    if (firstDate && lastDate) {
        if (!startDateInput.value) startDateInput.value = firstDate;
        if (!endDateInput.value) endDateInput.value = lastDate;

        startDateInput.disabled = false;
        endDateInput.disabled = false;
        dateInfo.textContent = ''; 
    } else {
        startDateInput.disabled = true;
        endDateInput.disabled = true;
        startDateInput.value = ''; 
        endDateInput.value = '';
        dateInfo.textContent = '(Datas indisponíveis)';
        console.warn("Não foi possível definir as datas a partir dos labels.");
    }
}

export function renderComparisonCharts(station) {
    const selectZeus = document.getElementById('comp-select-zeus');
    const selectElipse = document.getElementById('comp-select-elipse');
    const canvasZeus = document.getElementById('comparison-chart-zeus');
    const canvasElipse = document.getElementById('comparison-chart-elipse');
    const startDateInput = document.getElementById('comp-start-date');
    const endDateInput = document.getElementById('comp-end-date');

    if (!selectZeus || !selectElipse || !canvasZeus || !canvasElipse || !startDateInput || !endDateInput) {
         console.error("Elementos da aba Comparativo não encontrados para renderizar gráficos.");
         if(comparisonChartZeusInstance) comparisonChartZeusInstance.destroy();
         if(comparisonChartElipseInstance) comparisonChartElipseInstance.destroy();
         return;
    }

    const labelsZeus = station.zeus?.chartData?.labels ?? [];
    const labelsElipse = station.elipse?.historyChartData?.labels ?? [];
    const hasZeusData = station.zeus?.isReal && labelsZeus.length > 0;
    const hasElipseData = station.elipse?.isReal && labelsElipse.length > 0;

    const startDate = startDateInput.valueAsDate;
    const endDate = endDateInput.valueAsDate;
    let filterIndicesZeus = null;
    let filterIndicesElipse = null;

    // A lógica de filtro de datas (para a simulação)
    if (startDate && endDate && !startDateInput.disabled) {
        // Adiciona um dia ao endDate para incluir o dia inteiro (até 23:59:59)
        const startTimestamp = startDate.getTime();
        // Clona a data final e ajusta para o fim do dia
        let endOfDay = new Date(endDate.getTime());
        endOfDay.setHours(23, 59, 59, 999);
        const endTimestamp = endOfDay.getTime();

        if(hasZeusData){
            filterIndicesZeus = labelsZeus.map((label, index) => {
                try { 
                    const labelTimestamp = new Date(label).getTime(); 
                    return (labelTimestamp >= startTimestamp && labelTimestamp <= endTimestamp) ? index : -1; 
                } catch { return -1; }
            }).filter(index => index !== -1);
        }
        if(hasElipseData){
             filterIndicesElipse = labelsElipse.map((label, index) => {
                try { 
                    const labelTimestamp = new Date(label).getTime(); 
                    return (labelTimestamp >= startTimestamp && labelTimestamp <= endTimestamp) ? index : -1; 
                } catch { return -1; }
            }).filter(index => index !== -1);
        }
    }

    const ctxZeus = canvasZeus.getContext('2d');
    if (comparisonChartZeusInstance) comparisonChartZeusInstance.destroy();
    const selectedZeusKey = selectZeus.value;

    if (hasZeusData && selectedZeusKey) {
        const option = variableOptions[selectedZeusKey];
        const activeZeusYAxes = new Set([option.yAxisID]);

        let filteredLabelsZeus = filterIndicesZeus ? filterIndicesZeus.map(i => labelsZeus[i]) : [...labelsZeus];
        let zeusData = (station.zeus.chartData[option.dataKey] || []);
        
        // Aplica o filtro aos dados
        if (filterIndicesZeus && zeusData.length === labelsZeus.length) { 
            zeusData = filterIndicesZeus.map(i => zeusData[i]); 
        } else if (filterIndicesZeus) { 
            // Se os dados não estiverem alinhados com os labels, não exibe nada
            zeusData = []; 
        }

        if (filteredLabelsZeus.length > 0) {
            comparisonChartZeusInstance = new Chart(ctxZeus, {
                type: 'line', data: { labels: filteredLabelsZeus, datasets: [{ label: selectedZeusKey.replace('Zeus ', ''), data: zeusData, borderColor: option.color, yAxisID: option.yAxisID, tension: 0.1, borderWidth: 2, pointRadius: 2, borderDash: option.borderDash || [], }] },
                options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { type: 'timeseries', time: { unit: 'minute', tooltipFormat: 'dd/MM/yyyy HH:mm', displayFormats: { minute: 'HH:mm', hour: 'dd/MM HH:00', day: 'dd/MM/yy' } }, title: { display: true, text: 'Data / Hora' } }, yVazao: { type: 'linear', display: activeZeusYAxes.has('yVazao'), position: 'left', title: { display: true, text: 'Vazão (L/s)' } }, yPressao: { type: 'linear', display: activeZeusYAxes.has('yPressao'), position: 'left', offset: activeZeusYAxes.has('yVazao'), title: { display: true, text: 'Pressão (mca)' } } } }
            });
        } else {
             ctxZeus.clearRect(0, 0, canvasZeus.width, canvasZeus.height); ctxZeus.font = '16px Roboto'; ctxZeus.textAlign = 'center'; ctxZeus.fillText('Não há dados Zeus para o período selecionado.', canvasZeus.width / 2, canvasZeus.height / 2);
        }
    } else {
        ctxZeus.clearRect(0, 0, canvasZeus.width, canvasZeus.height); ctxZeus.font = '16px Roboto'; ctxZeus.textAlign = 'center'; ctxZeus.fillText(hasZeusData ? 'Selecione uma variável.' : 'Não há dados Zeus para exibir.', canvasZeus.width / 2, canvasZeus.height / 2);
    }

    const ctxElipse = canvasElipse.getContext('2d');
    if (comparisonChartElipseInstance) comparisonChartElipseInstance.destroy();
    const selectedElipseKeys = Array.from(selectElipse.selectedOptions).map(opt => opt.value);

    if (hasElipseData && selectedElipseKeys.length > 0) {
        const activeElipseYAxes = new Set(selectedElipseKeys.map(key => variableOptions[key].yAxisID));
        let filteredLabelsElipse = filterIndicesElipse ? filterIndicesElipse.map(i => labelsElipse[i]) : [...labelsElipse];

        let datasetsElipse = selectedElipseKeys.map(key => {
             const option = variableOptions[key];
             let data = (station.elipse.historyChartData[option.dataKey] || []);
             
             // Aplica o filtro aos dados
             if (filterIndicesElipse && data.length === labelsElipse.length) { 
                 data = filterIndicesElipse.map(i => data[i]); 
             } else if (filterIndicesElipse) { 
                 data = []; 
             }
             
            return { label: key.replace('Elipse ', ''), data: data, borderColor: option.color, yAxisID: option.yAxisID, tension: 0.1, borderWidth: 2, pointRadius: 2, borderDash: option.borderDash || [], };
        });

        if (filteredLabelsElipse.length > 0) {
            comparisonChartElipseInstance = new Chart(ctxElipse, {
                type: 'line', data: { labels: filteredLabelsElipse, datasets: datasetsElipse },
                options: {
                    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                    scales: {
                         x: { type: 'timeseries', time: { unit: 'second', tooltipFormat: 'dd/MM/yyyy HH:mm:ss', displayFormats: { second: 'HH:mm:ss', minute: 'HH:mm', hour: 'dd/MM HH:00' } }, title: { display: true, text: 'Data / Hora' } },
                        yPressao: { type: 'linear', display: activeElipseYAxes.has('yPressao'), position: 'left', title: { display: true, text: 'Pressão (mca)' } },
                        yNivel: { type: 'linear', display: activeElipseYAxes.has('yNivel'), position: 'right', title: { display: true, text: 'Nível (m)' }, grid: { drawOnChartArea: false } },
                        yCorrente: { type: 'linear', display: activeElipseYAxes.has('yCorrente'), position: 'right', offset: activeElipseYAxes.has('yNivel'), title: { display: true, text: 'Corrente (A)' }, grid: { drawOnChartArea: false } },
                        yStatus: { type: 'category', labels: ['Local', 'Remoto', 'Falha', 'OK', 0, 1],
                            display: activeElipseYAxes.has('yStatus'), position: 'right', offset: activeElipseYAxes.has('yNivel') || activeElipseYAxes.has('yCorrente'), title: { display: true, text: 'Status' }, grid: { drawOnChartArea: false } }
                    }
                }
            });
        } else {
             ctxElipse.clearRect(0, 0, canvasElipse.width, canvasElipse.height); ctxElipse.font = '16px Roboto'; ctxElipse.textAlign = 'center'; ctxElipse.fillText('Não há dados Elipse para o período selecionado.', canvasElipse.width / 2, canvasElipse.height / 2);
        }
    } else {
        ctxElipse.clearRect(0, 0, canvasElipse.width, canvasElipse.height); ctxElipse.font = '16px Roboto'; ctxElipse.textAlign = 'center'; ctxElipse.fillText(hasElipseData ? 'Selecione uma ou mais variáveis.' : 'Não há dados Elipse para exibir.', canvasElipse.width / 2, canvasElipse.height / 2);
    }
}


function renderSigesData(station) {
    const sigesTbody = document.getElementById('modal-siges-tbody');
    if(!sigesTbody) return;
    sigesTbody.innerHTML = '';
     if (station.siges && station.siges.ativos && station.siges.ativos.length > 0){
         station.siges.ativos.forEach(ativo => { sigesTbody.innerHTML += `<tr><td>${ativo.pos ?? 'N/A'}</td><td>${ativo.desc ?? 'N/A'}</td><td>${ativo.spec ?? 'N/A'}</td></tr>`; });
     } else {
         sigesTbody.innerHTML = '<tr><td colspan="3">Nenhum ativo SIGES encontrado.</td></tr>';
     }
}

export function renderStatusChart(stations) {
    const canvas = document.getElementById('status-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (statusChartInstance) statusChartInstance.destroy();
    const counts = { normal: 0, atencao: 0, critico: 0 };
    if(stations && stations.length > 0) {
        stations.forEach(s => {
             if(s) counts[getStatusClass(s.comm_percent)]++;
        });
    }
    statusChartInstance = new Chart(ctx, { type: 'doughnut', data: { labels: ['Normal', 'Atenção', 'Crítico'], datasets: [{ label: 'Status das Estações', data: [counts.normal, counts.atencao, counts.critico], backgroundColor: ['#27ae60', '#f39c12', '#e74c3c'], borderColor: '#fff', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } } });
}