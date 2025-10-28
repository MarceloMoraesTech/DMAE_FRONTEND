// Importa os dados do nosso backend simulado (usado como fallback)
import * as backend from './backend-simulator.js';

// --- API REAL ---
// URL base da API que eles passaram
const API_BASE_URL = 'https://dmae-api.onrender.com/api';

function aggregateZeusData(zeusRows) {
    if (zeusRows.length === 0) {
        return { vazao_ult: 0, vazao_med: 0, pressao_succao_ult: 0, pressao_recal_ult: 0 };
    }
    
    // Assume-se que o primeiro registro é o mais recente
    const latestRow = zeusRows[0]; 
    
    // Converte os campos chave para número
    const vazao_ult = parseFloat(latestRow.vazao_media) || 0;
    const pressao_succao_ult = parseFloat(latestRow.pressao_succao) || 0;
    const pressao_recal_ult = parseFloat(latestRow.pressao_recal) || 0;
    
    // Cálculo da Vazão Média
    const vazao_media_total = zeusRows.reduce((sum, row) => sum + (parseFloat(row.vazao_media) || 0), 0);
    const vazao_med = vazao_media_total / zeusRows.length;
    
    return {
        isReal: true,
        vazao_ult: parseFloat(vazao_ult.toFixed(2)),
        vazao_med: parseFloat(vazao_med.toFixed(2)),
        pressao_succao_ult: parseFloat(pressao_succao_ult.toFixed(2)),
        pressao_recal_ult: parseFloat(pressao_recal_ult.toFixed(2))
    };
}

// NOVO: Refinando a função aggregateElipseData
function aggregateElipseData(elipseRows) {
    if (elipseRows.length === 0) {
        return { isReal: false };
    }
    
    // Assume-se que o primeiro registro é o mais recente
    const latestRow = elipseRows[0]; 

    // O modo_controle parece ser um código (2.0000). 
    // Mapeamos para a string esperada ("Remoto Automático")
    const modoControleCode = parseFloat(latestRow.modo_controle);
    const modoControleStr = modoControleCode === 2 ? "Remoto Automático" : (modoControleCode === 1 ? "Local" : "N/D");
    
    // Extrai valores, convertendo para float e tratando NULL
    const pressao_suc = parseFloat(latestRow.pressao_succao) || 0;
    const nivel = parseFloat(latestRow.nivel) || 0;
    const nivel_rvz = parseFloat(latestRow.nivel_rvz) || 0;
    const corrente = parseFloat(latestRow.corrente) || 0;

    return {
        isReal: true,
        nome_estacao: latestRow.nome_estacao,
        pressao_suc: parseFloat(pressao_suc.toFixed(2)),
        // A pressão de recalque não está no Elipse, usaremos a do Zeus mais tarde.
        modo_controle: modoControleStr, 
        // Mapeamento para os campos do Mock
        nivel_rsv_inferior: parseFloat(nivel_rvz.toFixed(2)), 
        nivel_rsv_superior_nome: "RVZ", // Baseado no campo nivel_rvz
        nivel_rsv_superior_valor: nivel, 
        alarme_ativo: latestRow.falha_comunicacao ? "Falha de Comunicação" : "OK",
        
        // Mock dos outros campos Elipse esperados pelo Frontend
        bombas: { b1: corrente > 0, b2: false, b3: false }, 
        horimetro_b1: 1000, partidas_b1_24h: 5, 
        horimetro_b2: 1000, partidas_b2_24h: 5, 
        horimetro_b3: 1000, partidas_b3_24h: 5, 
        limites: { pressao_rec_max: 95, nivel_sup_min: 1.0 }, 
        station_alerts: [],
    };
}

// Função que busca dados da porcentagem entregue
async function fetchFaturamentoForMonth(mesAno) {
    const url = `${API_BASE_URL}/data/faturamento-status?mes_ano=${mesAno}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error("Erro ao buscar faturamento:", response.status, response.statusText);
            return [];
        }
        const data = await response.json();
        return data; // Retorna o array de faturamento para todas as estações
    } catch (error) {
        console.error("Erro de rede ao buscar faturamento:", error);
        return [];
    }
}

/**
 * Função ESSENCIAL para transformar a resposta do DB na estrutura da UI (Array de Estações).
 * @param {object} rawData - { planilha_zeus: [...], planilha_elipse: [...] }
 * @param {Array<Object>} faturamentoData - Dados do endpoint /data/faturamento-status
 * @returns {Array<Object>} O Array de estações no formato esperado pela UI.
 */
function normalizeRawDataToStations(rawData, faturamentoData = []) {
    const { planilha_zeus, planilha_elipse } = rawData;
    
    // 1. Agregação dos KPIs
    const zeusAggregated = aggregateZeusData(planilha_zeus);
    const elipseAggregated = aggregateElipseData(planilha_elipse);
    
    // 2. Determinação do Nome da Estação Mestra (Usamos o nome do Elipse se disponível)
    const realStationName = elipseAggregated.nome_estacao || "Estação Agregada (Zeus)";
    const realStationId = 9999; 
    console.log(realStationName, 'real station name')

    // Busca o dado de faturamento para esta estação específica
    const faturamentoItem = faturamentoData.find(item => item.Estacao === realStationName);
    
    let percentualComms = planilha_zeus.length > 0 ? 90 : 0; 
    
    if (faturamentoItem && faturamentoItem.PercentualComms) {
        // Pega a string '31.56%', remove o '%' e converte para número (31.56)
        percentualComms = parseFloat(faturamentoItem.PercentualComms.replace('%', ''));
    }
    

    // 3. Criação da Estação Mestra (Agregada)
    const realStation = {
        id: realStationId, 
        name: realStationName, 
        lat: -30.03, lon: -51.20, // Mock Lat/Lon
        comm_percent: percentualComms,
        faturamento: faturamentoItem,
        
        // KPIs Principais (Zeus é a fonte para Vazão e Pressão)
        vazao_ult: zeusAggregated.vazao_ult, 
        vazao_med: zeusAggregated.vazao_med,
        vazao_max: zeusAggregated.vazao_ult * 1.5, // Mock do Max
        
        leitura: new Date().toLocaleTimeString(),
        eficiencia_energetica: 0.75, 
        tempo_operacao_24h: 18.0,
        vazao_pico_24h: zeusAggregated.vazao_ult * 1.6,
        
        // Estrutura ZEUS
        zeus: { 
            isReal: zeusAggregated.isReal, 
            limites: { pressao_max: 95 }, 
            // Mock de chartData, será atualizado por getHistoricalData
            chartData: { labels: [], vazao: [], pressao_rec: [], pressao_suc: [] } 
        }, 
        
        // Estrutura ELIPSE (Combinando dados agregados)
        elipse: { 
            ...elipseAggregated, // Propriedades do Elipse (modo_controle, nível, etc.)
            
            // Sobrescrevendo a pressão com os dados do Zeus (mais confiáveis para recalque)
            pressao_suc: zeusAggregated.pressao_succao_ult, 
            pressao_rec: zeusAggregated.pressao_recal_ult, 

            // Mantendo os mocks de ChartData para evitar quebrar a UI
            chartData: { labels: [], gmb1: [], gmb2: [], gmb3: [] }, 
            historyChartData: { labels: [], pressao_suc: [], pressao_rec: [], nivel_rsv_superior: [], corrente_gmb2: [], corrente_gmb3: [] } 
        }, 
        
        // Estrutura SIGES
        siges: { ativos: [{ pos: "GERAL", desc: "ATIVO GENÉRICO", spec: "REAL" }] }
    };

    // CORREÇÃO: Usando a variável 'backend' importada diretamente
    return [realStation];
}

/**
 * Funçao de Transformação de Dados Históricos
 * Mapeia os dados brutos da API para o formato de gráfico esperado pela UI.
 * * @param {object} rawChartData Objeto com a chave 'chart_data'
 * @returns {object} Estrutura { zeus: { chartData: {...} }, elipse: { historyChartData: {...} } }
 */
function transformChartRawData(rawChartData) {
    if (!rawChartData || !rawChartData.chart_data || rawChartData.chart_data.length === 0) {
        // Retornar uma estrutura vazia compatível se não houver dados
        return {
            zeus: { chartData: { labels: [], vazao: [], pressao_rec: [], pressao_suc: [] } },
            elipse: { historyChartData: { labels: [], pressao_suc: [], pressao_rec: [], nivel_rsv_superior: [], corrente_gmb1: [], corrente_gmb2: [], corrente_gmb3: [], modo_controle: [], falha_comunicacao: [] } }
        };
    }
    
    const zeusRows = rawChartData.chart_data;
    const dataLength = zeusRows.length; // Quantidade de pontos

    // 1. Mapeamento dos dados do Zeus (API) para o formato da UI
    const labels = zeusRows.map(r => r.data_hora);
    const vazao = zeusRows.map(r => parseFloat(r.vazao_media));
    const pressao_rec = zeusRows.map(r => parseFloat(r.pressao_recal));
    const pressao_suc = zeusRows.map(r => parseFloat(r.pressao_succao));
    
    // 2. Mapeamento/Mock dos dados do Elipse (historyChartData)
    // O ui.js espera que o Elipse tenha dados históricos, mesmo que sejam os mesmos do Zeus
    // ou valores mockados.

    // Criando arrays mockados para os campos do Elipse que não estão na API
    const createMockArray = (value) => Array(dataLength).fill(value);
    
    // Para o Elipse, usamos os dados do Zeus (Pressão) e criamos mocks para o resto
    const elipseHistoryData = {
        labels: labels,
        pressao_suc: pressao_suc, 
        pressao_rec: pressao_rec, 
        
        // Mocks dos campos Elipse:
        nivel_rsv_superior: createMockArray(2.5), 
        nivel_rsv_inferior: createMockArray(1.5), 
        corrente_gmb1: createMockArray(33.0), // Mock das Correntes
        corrente_gmb2: createMockArray(33.0), 
        corrente_gmb3: createMockArray(33.5), 
        modo_controle: createMockArray(2), // 2 = Remoto Automático (para o eixo Categoria 'yStatus')
        falha_comunicacao: createMockArray(0), // 0 = OK (para o eixo Categoria 'yStatus')
    };

    // Retorna a estrutura final esperada pela UI
    return {
        zeus: {
            chartData: { 
                labels: labels,
                vazao: vazao,
                pressao_rec: pressao_rec,
                pressao_suc: pressao_suc,
            }
        },
        elipse: {
            historyChartData: elipseHistoryData
        }
    };
}

/**
 * Busca todas as estações e seus dados detalhados.
 */
export async function fetchAllStations() {
    console.log("Usando API REAL: fetchAllStations");
    
    try {
        // Faz as duas chamadas em paralelo (melhor performance)
        const [allDataResponse, faturamentoData] = await Promise.all([
            fetch(`${API_BASE_URL}/data/all`),
            fetchFaturamentoForMonth('2025-09') // <-- Use o mês/ano que deseja faturar
        ]);

        if (!allDataResponse.ok) {
            throw new Error(`Erro na API ALL (${allDataResponse.status}): ${allDataResponse.statusText}`);
        }
        const data = await allDataResponse.json();
        console.log("Dados recebidos de /data/all:", data);
        console.log("Dados de faturamento recebidos:", faturamentoData);
        
        // CORREÇÃO: Chama a função de normalização
        return normalizeRawDataToStations(data);

    } catch (error) {
        console.error("Erro em fetchAllStations (API Real):", error);
        alert("Erro ao conectar à API real. Voltando aos dados simulados.");
        return backend.getAllStations(); // Fallback para o simulador
    }
}

/**
 * NÃO É MAIS NECESSÁRIA.
 * A lógica foi movida para 'main.js' para filtrar a lista 'allStations'
 * que já foi carregada.
 */
export async function fetchStationById(id) {
    console.warn("api.fetchStationById não é mais usada. A lógica de filtro está em main.js.");
    // Apenas para garantir que não quebre se for chamada por engano:
    return backend.getStationById(id);
}

/**
 * Busca os dados históricos (para a aba Comparativo)
 * usando o novo endpoint '/data/charts'.
 */
export async function getHistoricalData(stationId, startDate, endDate) {
    console.log(`Usando API REAL: getHistoricalData para ${stationId}`);

    const queryParams = new URLSearchParams({
        stationId: stationId, 
        start: startDate,     
        end: endDate          
    });
    
    const url = `${API_BASE_URL}/data/charts?${queryParams.toString()}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro na API (${response.status}): ${response.statusText}`);
        }
        const data = await response.json();
        
        // CORREÇÃO: Chama a função de normalização dos gráficos
        console.log("Dados recebidos de /data/charts:", data);
        return transformChartRawData(data); 

    } catch (error) {
        console.error("Erro ao buscar dados históricos da API (getHistoricalData):", error);
        // Retorna a estrutura vazia compatível em caso de erro de rede/API
        return {
            zeus: { chartData: { labels: [], vazao: [], pressao_rec: [], pressao_suc: [] } },
            elipse: { historyChartData: { labels: [], pressao_suc: [], pressao_rec: [], nivel_rsv_superior: [], corrente_gmb1: [], corrente_gmb2: [], corrente_gmb3: [], modo_controle: [], falha_comunicacao: [] } }
        };
    }
}

/**
 * PONTO DE ATENÇÃO: Nenhum link foi passado para os Alertas.
 * Esta função CONTINUA USANDO O SIMULADOR.
 */
export async function fetchAllAlerts() {
    console.warn("Usando SIMULADOR: fetchAllAlerts (Nenhum link de API real foi fornecido)");
    return backend.getAllAlerts();
}

/**
 * PONTO de ATENÇÃO: Nenhum link foi passado para o Upload.
 * Esta função CONTINUA USANDO O SIMULADOR.
 */
export async function uploadData(zeusData, elipseData) {
    console.warn("Usando SIMULADOR: uploadData (Nenhum link de API real foi fornecido)");
    
    // Simula o backend processando os dados
    return new Promise(resolve => {
        setTimeout(() => {
            let zeusRows = zeusData && zeusData.data ? zeusData.data.length : 0;
            let elipseRows = elipseData && elipseData.data ? elipseData.data.length : 0;

            console.log("SIMULADOR: Recebido", zeusRows, "linhas de dados Zeus.");
            console.log("SIMULADOR: Recebido", elipseRows, "linhas de dados Elipse.");

            resolve({ 
                success: true, 
                message: `Dados recebidos: ${zeusRows} linhas (Zeus) e ${elipseRows} linhas (Elipse).` 
            });
        }, 1000); 
    });
}