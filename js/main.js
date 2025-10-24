import * as api from './api.js';
import * as ui from './ui.js';
import { initMap, highlightMarker, filterMarkers, refreshMapSize } from './map.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos ---
    const loginOverlay = document.getElementById('login-overlay');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const stationsMenu = document.getElementById('stations-menu');
    const navMenu = document.querySelector('.nav-menu');
    const pageTitle = document.getElementById('page-title');
    const searchInput = document.getElementById('search-input');
    const analiseThead = document.getElementById('analise-thead');
    const analiseTbody = document.getElementById('analise-tbody');
    const tableLoader = document.getElementById('table-loader');
    const timestampEl = document.getElementById('timestamp');
    const statusFilterButtons = document.getElementById('status-filter-buttons');
    const kpiAlertasCard = document.getElementById('kpi-alertas-card');

    let allStations = []; // Guarda TODOS os dados das estações (do /data/all)
    let currentSort = { key: 'name', order: 'asc' };
    let isAppInitialized = false;
    let currentStationData = null; // Guarda os dados detalhados da estação selecionada

    // --- Lógica de Autenticação ---
    loginBtn?.addEventListener('click', async () => {
         console.log("Botão Entrar clicado.");
        if (loginOverlay) loginOverlay.classList.remove('active');
        if (appContainer) appContainer.style.display = 'flex';

        if (!isAppInitialized) {
            console.log("Inicializando aplicação...");
            await initializeApp();
            isAppInitialized = true;
             console.log("Tentativa de inicialização completa.");
        }

        console.log("Chamando refreshMapSize...");
        refreshMapSize();
    });

    logoutBtn?.addEventListener('click', () => window.location.reload());

    // --- Função de Inicialização Principal ---
    async function initializeApp() {
        if (tableLoader) ui.toggleLoading(tableLoader, true);
        try {
            // Agora, fetchAllStations() busca os dados da API REAL.
            // O link de Alertas ainda usa o simulador.
            const [stations, alerts] = await Promise.all([
                api.fetchAllStations(),
                api.fetchAllAlerts()
            ]);

            allStations = stations; // Armazena a lista completa

            if (stations && stations.length > 0) {
                 ui.populateStationsMenu(stations);
                 ui.populateAnaliseTable(stations);
                 ui.updateDashboardGeral(alerts, stations);
                 ui.renderStatusChart(stations);
                 initMap(stations);
                 sortAndRenderTable();
            } else {
                 console.warn("Nenhuma estação processada para exibir.");
                 // ... (lógica de UI para 'nenhuma estação')
                 if(stationsMenu) stationsMenu.innerHTML = '';
                 if(analiseTbody) analiseTbody.innerHTML = '<tr><td colspan="4">Nenhuma estação encontrada.</td></tr>';
                 const kpiEbatsEl = document.getElementById('kpi-ebats');
                 if(kpiEbatsEl) kpiEbatsEl.textContent = '0';
                 initMap([]);
                 ui.renderStatusChart([]);
            }
            ui.populateAlertsTable(alerts);

            updateTimestamp();
            setInterval(updateTimestamp, 1000);

        } catch (error)
        {
            console.error("Falha CRÍTICA ao inicializar a aplicação:", error);
            alert("Não foi possível carregar os dados iniciais da aplicação. Verifique o console para mais detalhes.");
            // ... (lógica de UI para 'erro')
            const kpiEbatsEl = document.getElementById('kpi-ebats');
            if(kpiEbatsEl) kpiEbatsEl.textContent = 'Erro';
            if(analiseTbody) analiseTbody.innerHTML = '<tr><td colspan="4">Erro ao carregar dados.</td></tr>';

        } finally {
             if (tableLoader) ui.toggleLoading(tableLoader, false);
        }
    }

    // --- Gerenciamento de Eventos ---

    // Event listener para o KPI de Alertas no Dashboard Geral
    if (kpiAlertasCard) {
        kpiAlertasCard.addEventListener('click', () => {
            const alertsMenuItem = navMenu?.querySelector('.nav-item[data-page="alertas"]');
            if (alertsMenuItem) {
                alertsMenuItem.click();
            } else {
                console.error("Item de menu 'Alertas' não encontrado.");
            }
        });
    }

    // Event listener para os botões de filtro de status na página Análise
    if(statusFilterButtons) {
        statusFilterButtons.addEventListener('click', (e) => {
            const target = e.target.closest('.filter-btn');
            if (!target) return;
            statusFilterButtons.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
            applyFilters();
        });
    }
    // Event listener para o campo de busca na página Análise
     if(searchInput) {
        searchInput.addEventListener('input', applyFilters);
     }

    // Event listeners para highlight no mapa ao passar o mouse na lista/tabela
    [stationsMenu, analiseTbody].forEach(element => {
        if(element) {
            element.addEventListener('mouseover', (e) => {
                const target = e.target.closest('[data-id]');
                if (target?.dataset?.id) highlightMarker(parseInt(target.dataset.id), true);
            });
            element.addEventListener('mouseout', (e) => {
                const target = e.target.closest('[data-id]');
                 if (target?.dataset?.id) highlightMarker(parseInt(target.dataset.id), false);
            });
        }
    });

    // Event listener para navegação pelo menu lateral principal
    if(navMenu){
        navMenu.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                const pageId = navItem.dataset.page;
                // ... (lógica de UI de navegação)
                navMenu.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                navItem.classList.add('active');
                if(stationsMenu) stationsMenu.querySelectorAll('.station-item').forEach(item => item.classList.remove('active'));
                if(pageTitle) pageTitle.textContent = navItem.innerText.trim();
                ui.showPage(pageId);
                if (pageId === 'dashboard') {
                    refreshMapSize();
                }
            }
        });
    }

    // Event listener para cliques na lista de estações (barra lateral)
    if(stationsMenu) {
        stationsMenu.addEventListener('click', (e) => {
            const stationItem = e.target.closest('.station-item');
            if (stationItem && stationItem.dataset.id) {
                if(navMenu) navMenu.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                stationsMenu.querySelectorAll('.station-item').forEach(item => item.classList.remove('active'));
                stationItem.classList.add('active');
                
                const stationId = parseInt(stationItem.dataset.id);
                
                // Filtra a lista 'allStations' que já está na memória.
                currentStationData = allStations.find(s => s.id === stationId); 
                
                if (currentStationData) {

                    // 1. Garante que as sub-estruturas existam.
                    currentStationData.zeus = currentStationData.zeus || {};
                    currentStationData.elipse = currentStationData.elipse || {};
                    
                    // 2. Define isReal = true para permitir a renderização dos gráficos na aba 'comparativo' (ui.js).
                    currentStationData.zeus.isReal = true;
                    currentStationData.elipse.isReal = true;

                     if(pageTitle) pageTitle.textContent = currentStationData.name;
                     ui.showStationDetailPage(currentStationData); 
                } else {
                     alert(`Não foi possível encontrar os dados detalhados para a estação ID ${stationId} na lista carregada.`);
                     if(pageTitle) pageTitle.textContent = "Erro ao Carregar";
                }
            }
        });
    }

    if(analiseThead) {
        analiseThead.addEventListener('click', (e) => {
            // ... (lógica de ordenação)
            const header = e.target.closest('th');
            if (!header || !header.dataset.sort) return;
            const sortKey = header.dataset.sort;
            currentSort.order = (currentSort.key === sortKey && currentSort.order === 'asc') ? 'desc' : 'asc';
            currentSort.key = sortKey;
            sortAndRenderTable();
        });
    }

    if(analiseTbody) {
        analiseTbody.addEventListener('click', (e) => {
            const stationLink = e.target.closest('.station-link');
            if (stationLink && stationLink.dataset.id) {
                e.preventDefault();
                const stationId = parseInt(stationLink.dataset.id);

                // Filtra a lista 'allStations' que já está na memória.
                currentStationData = allStations.find(s => s.id === stationId);
                
                if (currentStationData) {
                    // 1. Garante que as sub-estruturas existam.
                    currentStationData.zeus = currentStationData.zeus || {};
                    currentStationData.elipse = currentStationData.elipse || {};
                    
                    // 2. Define isReal = true para permitir a renderização dos gráficos na aba 'comparativo' (ui.js).
                    currentStationData.zeus.isReal = true;
                    currentStationData.elipse.isReal = true;

                    if(pageTitle) pageTitle.textContent = currentStationData.name;
                    ui.showStationDetailPage(currentStationData);
                    
                    // Atualiza o menu lateral para refletir a seleção
                    if(stationsMenu){
                        stationsMenu.querySelectorAll('.station-item').forEach(item => item.classList.remove('active'));
                        const sidebarItem = stationsMenu.querySelector(`.station-item[data-id="${stationId}"]`);
                        if (sidebarItem) sidebarItem.classList.add('active');
                        if(navMenu) navMenu.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                    }
                } else {
                     alert(`Não foi possível encontrar os dados detalhados para a estação ID ${stationId} na lista carregada.`);
                     if(pageTitle) pageTitle.textContent = "Erro ao Carregar";
                }
            }
        });
    }

    // Listener para as abas DENTRO da página de detalhes da estação
    const modalTabsContainer = document.querySelector('#detalhe-estacao .modal-tabs');
    if(modalTabsContainer) {
        modalTabsContainer.addEventListener('click', (e) => {
            
            const tabLink = e.target.closest('.tab-link');
            if (tabLink) {
                const tabId = tabLink.dataset.tab;
                ui.activateTab(tabId);
                
                if (tabId === 'comparativo' && currentStationData) {
                    console.log("DEBUG: Chamando renderComparisonCharts diretamente na troca de aba.");
                    ui.renderComparisonCharts(currentStationData);
                }
            }
        });
    }

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('click', async (e) => {
            
            // *** LÓGICA DO GRÁFICO COMPARATIVO ***
            if (e.target && e.target.id === 'update-comparison-charts-btn') {
                 console.log("Botão Atualizar Gráficos clicado.");
                if (currentStationData) {
                    console.log("LÓGICA REAL: Buscando dados históricos do backend...");
                    
                    const startDateInput = document.getElementById('comp-start-date');
                    const endDateInput = document.getElementById('comp-end-date');
                    
                    if (startDateInput && endDateInput && !startDateInput.disabled) {
                        const startDate = startDateInput.value;
                        const endDate = endDateInput.value;
                        
                        try {
                            const historicalData = await api.getHistoricalData(currentStationData.id, startDate, endDate);
                            console.log("RESPOSTA COMPLETA DA API:", historicalData);
                            if (historicalData) {
                                if (historicalData.zeus && historicalData.zeus.chartData) {
                                    currentStationData.zeus.chartData = historicalData.zeus.chartData;
                                } else {
                                    currentStationData.zeus.chartData = { labels: [], vazao: [], pressao_rec: [], pressao_suc: [] };
                                }
                                
                                if (historicalData.elipse && historicalData.elipse.historyChartData) {
                                    currentStationData.elipse.historyChartData = historicalData.elipse.historyChartData;
                                } else {
                                    currentStationData.elipse.historyChartData = { labels: [] };
                                }
                                
                                console.log("LÓGICA REAL: Dados históricos recebidos, atualizando gráficos.");
                                ui.renderComparisonCharts(currentStationData);
                            } else {
                                throw new Error("A API não retornou dados históricos.");
                            }
                            
                        } catch (error) {
                            console.error("Erro ao buscar dados históricos da API:", error);
                            alert("Não foi possível carregar os dados históricos para este período.");
                        }
                        
                    } else {
                        console.warn("Datas de filtro não disponíveis.");
                    }

                } else {
                    console.warn("Botão Atualizar clicado, mas currentStationData está nulo.");
                }
            }
        });
    }

    // --- Funções Auxiliares ---
    function getFilteredStations() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const activeFilter = statusFilterButtons ? statusFilterButtons.querySelector('.active') : null;
        if (!Array.isArray(allStations) || allStations.length === 0) return [];
        if (!activeFilter) return allStations;

        const activeStatus = activeFilter.dataset.status;
        return allStations.filter(s => {
            if (!s) return false;
            const nameMatch = s.name?.toLowerCase().includes(searchTerm) ?? false;
            if (activeStatus === 'all') return nameMatch;

            const comm = s.comm_percent;
            if (comm == null) {
                 return activeStatus === 'critico';
            }
            const statusMatch =
                (activeStatus === 'normal' && comm > 99) ||
                (activeStatus === 'atencao' && comm >= 85 && comm <= 99) ||
                (activeStatus === 'critico' && comm < 85);

            return nameMatch && statusMatch;
        });
    }

    function applyFilters() {
        sortAndRenderTable();
        const filteredStations = getFilteredStations();
        filterMarkers(new Set(filteredStations.map(s => s.id).filter(id => id != null)));
    }

    function sortAndRenderTable() {
        const stationsToRender = getFilteredStations(); 
        stationsToRender.sort((a, b) => {
            const valA = a?.[currentSort.key];
            const valB = b?.[currentSort.key];
            const order = currentSort.order === 'asc' ? 1 : -1;
            if (valA == null && valB == null) return 0;
            if (valA == null) return order; 
            if (valB == null) return -order; 
            if (typeof valA === 'string' && typeof valB === 'string') {
                return valA.localeCompare(valB) * order;
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return (valA - valB) * order;
            }
            return String(valA).localeCompare(String(valB)) * order;
        });
        ui.populateAnaliseTable(stationsToRender);
        ui.updateSortIcons(currentSort.key, currentSort.order);
    }

    function updateTimestamp() {
       if(timestampEl) timestampEl.textContent = new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' });
    }

});