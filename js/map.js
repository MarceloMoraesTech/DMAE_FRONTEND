let map = null;
const poaCoords = [-30.0346, -51.2177];
const stationMarkers = new Map();

const iconNormal = L.divIcon({ html: '<i class="fas fa-map-marker-alt" style="color: #27ae60;"></i>', className: 'station-map-icon', iconSize: [24, 40], iconAnchor: [12, 40], popupAnchor: [0, -40] });
const iconAtencao = L.divIcon({ html: '<i class="fas fa-map-marker-alt" style="color: #f39c12;"></i>', className: 'station-map-icon', iconSize: [24, 40], iconAnchor: [12, 40], popupAnchor: [0, -40] });
const iconCritico = L.divIcon({ html: '<i class="fas fa-map-marker-alt" style="color: #e74c3c;"></i>', className: 'station-map-icon', iconSize: [24, 40], iconAnchor: [12, 40], popupAnchor: [0, -40] });

function getStationIcon(station) {
    if (!station || typeof station.comm_percent !== 'number') return iconCritico; // Fallback
    if (station.comm_percent > 95) return iconNormal;
    if (station.comm_percent >= 85) return iconAtencao;
    return iconCritico;
}

export function initMap(stations) {
    if (map) { map.remove(); }
    stationMarkers.clear();
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error("Elemento #map não encontrado no DOM.");
        return;
    }

    try {
        map = L.map(mapContainer).setView(poaCoords, 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'map-legend');
            div.innerHTML = `<strong>Status das EBATs</strong>
                <div><i class="fas fa-map-marker-alt" style="color:#27ae60;"></i> Normal</div>
                <div><i class="fas fa-map-marker-alt" style="color:#f39c12;"></i> Atenção</div>
                <div><i class="fas fa-map-marker-alt" style="color:#e74c3c;"></i> Crítico</div>`;
            return div;
        };
        legend.addTo(map);

        if (Array.isArray(stations)) { // Garante que stations é um array
            stations.forEach(station => {
                if (station && station.lat != null && station.lon != null) { 
                    const icon = getStationIcon(station);
                    const marker = L.marker([station.lat, station.lon], { icon: icon }).addTo(map);
                    marker.bindPopup(`<b>${station.name ?? 'Nome Indefinido'}</b><hr>Vazão: <b>${station.vazao_ult?.toFixed(1) ?? 'N/A'} L/s</b>`);
                    marker.on('click', () => {
                        const stationItem = document.querySelector(`.station-item[data-id="${station.id}"]`);
                        if (stationItem) {
                            stationItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            stationItem.classList.add('active');
                            setTimeout(() => stationItem.classList.remove('active'), 2500);
                        }
                    });
                    if (station.id != null) {
                        stationMarkers.set(station.id, marker);
                    } else {
                        console.warn("Estação sem ID encontrada:", station);
                    }
                } else {
                     // console.warn(`Estação ${station ? station.id : 'desconhecida'} sem coordenadas válidas.`);
                }
            });
        } else {
            console.error("initMap recebeu 'stations' que não é um array:", stations);
        }
        
        refreshMapSize();

    } catch (error) {
        console.error("Erro ao inicializar o mapa Leaflet:", error);
        if (mapContainer) mapContainer.innerHTML = '<p style="color: red; text-align: center;">Erro ao carregar o mapa.</p>';
    }
}


export function refreshMapSize() {
    if (map) {
        requestAnimationFrame(() => {
            try {
                 map.invalidateSize();
                 console.log("Map invalidated size."); // Log para depuração
            } catch(e) {
                 console.error("Erro ao chamar map.invalidateSize():", e);
            }
        });
    } else {
        console.warn("Tentativa de chamar refreshMapSize, mas o mapa não está inicializado.");
    }
}

export function highlightMarker(stationId, shouldHighlight) {
    if (stationId == null) return; 
    const marker = stationMarkers.get(stationId);
    if (marker && marker._icon) {
        if (shouldHighlight) {
            marker._icon.classList.add('station-map-icon-highlight');
        } else {
            marker._icon.classList.remove('station-map-icon-highlight');
        }
    }
}

export function filterMarkers(visibleStationIds) {
     if (!(visibleStationIds instanceof Set)) { 
         console.error("filterMarkers recebeu algo que não é um Set:", visibleStationIds);
         visibleStationIds = new Set(); 
     }
    stationMarkers.forEach((marker, id) => {
        if (map) {
            try {
                if (visibleStationIds.has(id)) {
                    if (!map.hasLayer(marker)) map.addLayer(marker);
                } else {
                    if (map.hasLayer(marker)) map.removeLayer(marker);
                }
            } catch(e) {
                console.error(`Erro ao adicionar/remover marcador ${id}:`, e);
            }
        }
    });
}