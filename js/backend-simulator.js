const stationNames = [
    "BALNEARIOS 250", "BELEM VELHO II", "BOA VISTA 700", "BORDINI 400", "CAIEIRAS 300", "CARLOS GOMES", "CASCATINHA CAIERA 500", "CASCATINHA CATUMBI 900", "CATUMBI - ORFANATROFIO", "CATUMBI CLEMENTE PINTO 200", "CIDADE JARDIM", "COTA 137", "CRISTIANO FISCHER 500", "DOLORES DURAN", "FERNANDO MACHADO 400", "GIOCONDA - BALTAZAR DE BEM 300", "GIOCONDA - IPIRANGA 3 350", "GUTEMBERG", "IPIRANGA 1 600", "IPIRANGA II 600", "JARDIM IPE", "JARDIM ISABEL 200", "JARDIM ISABEL II", "JAU 200", "JOAO DE OLIVEIRA REMIAO III", "JUVENAL CRUZ", "LUZITANA 450", "MANOEL ELIAS 1 600", "MANOEL ELIAS II", "MANOEL ELIAS III", "MENINO DEUS 1600", "MORRO DO OSSO 400", "NONGAI I", "OSCAR PEREIRA 300", "OSCAR PEREIRA 1 DE MAIO 400", "OURO PRETO 1000", "OURO PRETO JAU 200", "PADRE CACIQUE 400", "PITINGA", "PRIMEIRO DE MAIO", "RESTINGA 1000", "RESTINGA II - PITINGA 500", "RESTINGA II - REMIAO III 500", "SANTA RITA I 150", "SANTA RITA II 350", "SANTA TEREZA I 400", "SANTA TEREZA II 300", "SANTA TEREZA III", "SAO CAETANO I", "SAO JOAO 1200", "SAO JOAO III", "SAO JORGE - BELEM VELHO II 300", "SAO JORGE - SAO JORGE II 325", "SAO JOSE II", "SAO LUIZ 700", "SAO MANOEL 800", "SARANDI 350", "TRISTEZA 600", "VILA ASSUNCAO 150", "VILA BRASILIA"
];

const generateMockStation = (id, name) => {
    const vazao_ult = Math.random() * 450 + 50;
    const vazao_max = vazao_ult * (1.1 + Math.random() * 0.3);
    const comm = Math.random() * 20 + 80; // Média de 90%
    const lat = -30.07 + (Math.random() - 0.5) * 0.15;
    const lon = -51.18 + (Math.random() - 0.5) * 0.10;
    const b1_active = Math.random() > 0.3;
    const b2_active = Math.random() > 0.5;
    return {
        id, name, lat, lon, comm_percent: parseFloat(comm.toFixed(1)), vazao_ult: parseFloat(vazao_ult.toFixed(1)), vazao_med: vazao_ult * (0.8 + Math.random() * 0.2), vazao_max: vazao_max, leitura: `23/10/2025 14:${Math.floor(Math.random()*60).toString().padStart(2,'0')}:${Math.floor(Math.random()*60).toString().padStart(2,'0')}`, eficiencia_energetica: parseFloat((Math.random() * 0.2 + 0.5).toFixed(2)), tempo_operacao_24h: parseFloat((Math.random() * 10 + 8).toFixed(1)), vazao_pico_24h: parseFloat((vazao_max * (1.05 + Math.random() * 0.1)).toFixed(1)), 
        zeus: { 
            isReal: false, 
            limites: { pressao_max: 95 } 
        }, 
        elipse: { 
            isReal: false, 
            pressao_suc: parseFloat((Math.random() * 10 + 15).toFixed(1)), 
            pressao_rec: parseFloat((Math.random() * 20 + 70).toFixed(1)), 
            modo_controle: Math.random() > 0.1 ? "Remoto Automático" : "Local", 
            nivel_rsv_inferior: parseFloat((Math.random() * 1.5 + 2.5).toFixed(2)), 
            nivel_rsv_superior_nome: "RSV Superior", 
            nivel_rsv_superior_valor: parseFloat((Math.random() * 2 + 1.5).toFixed(2)), 
            bombas: { b1: b1_active, b2: b2_active, b3: Math.random() > 0.5 }, 
            alarme_ativo: Math.random() > 0.95 ? "Pressão Alta Recalque" : "OK", 
            horimetro_b1: Math.floor(Math.random() * 10000 + 5000), partidas_b1_24h: Math.floor(Math.random() * 20 + 5), 
            horimetro_b2: Math.floor(Math.random() * 10000 + 5000), partidas_b2_24h: Math.floor(Math.random() * 20 + 5), 
            horimetro_b3: Math.floor(Math.random() * 10000 + 5000), partidas_b3_24h: Math.floor(Math.random() * 20 + 5), 
            limites: { pressao_rec_max: 95, nivel_sup_min: 1.0 }, 
            station_alerts: Math.random() > 0.7 ? [{ event: "Falha Bomba 1", status: "Crítica" }] : [], // Alertas por estação genéricos
            chartData: { labels: [], gmb1: [], gmb2: [], gmb3: [] }, 
            historyChartData: { labels: [], pressao_suc: [], pressao_rec: [], nivel_rsv_superior: [], corrente_gmb2: [], corrente_gmb3: [] } 
        }, 
        siges: { 
            ativos: [
                { pos: "GERAL", desc: "ATIVO GENÉRICO", spec: "ESPECIFICAÇÃO GENÉRICA" }
            ] 
        }
    };
};

const mockStations = Array.from({ length: 60 }, (_, index) => {
    const id = index + 1;
    const name = index === 3 ? "BORDINI 400" : (stationNames[index] || `Estação Teste ${id}`);
    return generateMockStation(id, name);
});

const bordiniIndex = mockStations.findIndex(s => s.name === "BORDINI 400");
const bordiniId = mockStations[bordiniIndex].id;

mockStations[bordiniIndex] = {
    id: bordiniId, name: "BORDINI 400", lat: -30.035, lon: -51.175, comm_percent: 99.8, vazao_ult: 108.2, vazao_med: 73.5, vazao_max: 153.4, leitura: "16/09/2025 08:35:00", eficiencia_energetica: 0.62, tempo_operacao_24h: 16.5, vazao_pico_24h: 155.1,
    zeus: { 
        isReal: true, 
        chartData: { 
            labels: ["2025-09-16T07:50:00", "2025-09-16T07:55:00", "2025-09-16T08:00:00", "2025-09-16T08:05:00", "2025-09-16T08:10:00", "2025-09-16T08:15:00", "2025-09-16T08:20:00", "2025-09-16T08:25:00", "2025-09-16T08:30:00", "2025-09-16T08:35:00"], 
            vazao: [0, 75.3, 153.4, 150.1, 148.9, 142.3, 110.8, 109.1, 108.5, 108.2], 
            pressao_rec: [61.1, 86.8, 88.1, 88.0, 87.9, 87.8, 87.6, 87.5, 87.5, 87.5], 
            pressao_suc: [20.5, 21.0, 21.1, 21.2, 21.2, 21.3, 21.2, 21.1, 21.2, 21.2] 
        }, 
        limites: { pressao_max: 90.0 } 
    },
    elipse: { 
        isReal: true, pressao_suc: 21.2, pressao_rec: 87.5, modo_controle: "Remoto Automático", nivel_rsv_inferior: 3.81, nivel_rsv_superior_nome: "Bela Vista", nivel_rsv_superior_valor: 2.53, bombas: { b1: false, b2: true, b3: true }, alarme_ativo: "OK", horimetro_b1: 15240, partidas_b1_24h: 8, horimetro_b2: 18910, partidas_b2_24h: 12, horimetro_b3: 12560, partidas_b3_24h: 12, limites: { pressao_rec_max: 90.0, nivel_sup_min: 1.5 }, 
        // --- ALERTAS ESPECÍFICOS DA ESTAÇÃO ---
        station_alerts: [
            { event: "Falha na Bomba 1", status: "Crítica", date: "23/10/2025 10:00" },
            { event: "Corrente Alta B2", status: "Atenção", date: "23/10/2025 10:15" }
        ],
        chartData: { 
            labels: ["2025-09-15T22:59:00", "2025-09-15T22:59:05", "2025-09-15T22:59:15", "2025-09-15T22:59:25", "2025-09-15T22:59:35", "2025-09-15T22:59:45"], 
            gmb1: [0, 0, 0, 0, 0, 0], gmb2: [33.0, 33.1, 33.1, 33.1, 33.1, 33.1], gmb3: [33.6, 33.6, 33.7, 33.7, 33.7, 33.7] 
        }, 
        historyChartData: { 
            labels: ["2025-09-15T22:59:00", "2025-09-15T22:59:05", "2025-09-15T22:59:15", "2025-09-15T22:59:25", "2025-09-15T22:59:35", "2025-09-15T22:59:45"], 
            pressao_suc: [21.1, 21.2, 21.2, 21.2, 21.1, 21.2], 
            pressao_rec: [87.4, 87.5, 87.5, 87.5, 87.4, 87.5], 
            nivel_rsv_superior: [2.55, 2.54, 2.54, 2.53, 2.53, 2.53], 
            corrente_gmb1: [0, 0, 0, 0, 0, 0],
            corrente_gmb2: [33.0, 33.1, 33.1, 33.1, 33.1, 33.1], 
            corrente_gmb3: [33.6, 33.6, 33.7, 33.7, 33.7, 33.7],
            modo_controle: [1, 1, 1, 1, 1, 1], // 1 = Remoto, 0 = Local
            falha_comunicacao: [0, 0, 0, 0, 0, 0], // 1 = Falha, 0 = OK
            nivel_rsv_inferior: [3.8, 3.81, 3.81, 3.8, 3.8, 3.81]
        } 
    },
    siges: { 
        ativos: [
            { pos: "GERAL", desc: "CONTROLADOR LOGICO PROGRAMAVEL CLP", spec: "AUTOMAÇÃO/CLP" },
            { pos: "POS 01", desc: "BOMBA KSB ETA 125-215", spec: "MECÂNICO/BOMBA CENTRÍFUGA" },
            { pos: "POS 01", desc: "CHAVE ESTRELA TRIANGULO 380V", spec: "ELÉTRICO/CHAVE ESTRELA TRIANGULO" }
        ] 
    }
};

const mockAlerts = [
    { date: "23/10/2025 10:30", ebat: "MENINO DEUS 1600", event: "Divergência de vazão detectada", status: "Crítica" },
    { date: "23/10/2025 09:15", ebat: "RESTINGA 1000", event: "Comunicação falhou por 2h", status: "Crítica" },
];

const networkDelay = 100; // Simula um pequeno atraso de rede

export function getAllStations() { 
    console.log("SIMULADOR: Buscando todas as estações...");
    return new Promise(resolve => setTimeout(() => {
        console.log("SIMULADOR: Retornando", mockStations.length, "estações.");
        resolve(mockStations);
    }, networkDelay)); 
}
export function getStationById(id) { 
    console.log(`SIMULADOR: Buscando estação por ID: ${id}`);
    const station = mockStations.find(e => e.id === parseInt(id));
    return new Promise(resolve => setTimeout(() => {
        console.log("SIMULADOR: Retornando dados para", station ? station.name : "Estação Padrão");
        resolve(station || mockStations[0]); // Retorna a estação ou a primeira como fallback
    }, networkDelay / 2)); 
}
export function getAllAlerts() { 
    console.log("SIMULADOR: Buscando alertas...");
    return new Promise(resolve => setTimeout(() => {
         console.log("SIMULADOR: Retornando", mockAlerts.length, "alertas.");
        resolve(mockAlerts);
    }, networkDelay)); 
}