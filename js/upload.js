import * as api from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('upload-btn');
    const fileInputZeus = document.getElementById('file-input-zeus');
    const fileInputElipse = document.getElementById('file-input-elipse');
    const uploadStatus = document.getElementById('upload-status');

    /**
     * Função auxiliar para ler um arquivo (CSV, XLS, XLSX) com SheetJS.
     * Retorna uma Promise que resolve com os dados em formato JSON.
     */
    function parseFile(file) {
        return new Promise((resolve, reject) => {
            // Resolve como nulo se nenhum arquivo for fornecido
            if (!file) {
                resolve(null);
                return;
            }

            // Verifica se a biblioteca SheetJS (XLSX) foi carregada
            if (typeof XLSX === 'undefined') {
                reject(new Error("Biblioteca SheetJS (XLSX) não foi carregada. Verifique o <head> do index.html."));
                return;
            }

            const reader = new FileReader();

            // A SheetJS funciona melhor lendo ArrayBuffer
            reader.readAsArrayBuffer(file);

            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    
                    // Lê o arquivo (pasta de trabalho)
                    const workbook = XLSX.read(data, {
                        type: 'array',
                        cellDates: true // Tenta converter datas do Excel para objetos Date do JS
                    });

                    // Pega o nome da primeira planilha
                    const firstSheetName = workbook.SheetNames[0];
                    if (!firstSheetName) {
                        throw new Error("O arquivo está vazio ou não contém planilhas.");
                    }

                    // Pega a primeira planilha
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Converte a planilha para um array de objetos JSON
                    // Onde a primeira linha é usada como cabeçalho (chaves do objeto)
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                         defval: "" // Garante que células vazias virem strings vazias
                    });

                    // Retorna um objeto no mesmo formato que o PapaParse retornava,
                    // para manter a compatibilidade com a api.uploadData
                    resolve({ data: jsonData });

                } catch (err) {
                    console.error("Erro ao processar o arquivo com SheetJS:", err);
                    reject(new Error(`Erro ao ler o arquivo ${file.name}. Formato inválido ou corrompido?`));
                }
            };

            reader.onerror = (err) => {
                // Erro de leitura do arquivo
                reject(new Error(`Não foi possível ler o arquivo ${file.name}.`));
            };
        });
    }

    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const fileZeus = fileInputZeus.files[0];
            const fileElipse = fileInputElipse.files[0];

            if (!fileZeus && !fileElipse) {
                uploadStatus.textContent = 'Por favor, selecione pelo menos um arquivo (.csv, .xls, .xlsx).';
                uploadStatus.style.color = "var(--error-color)";
                return;
            }

            let fileNames = [];
            if (fileZeus) fileNames.push(`"${fileZeus.name}"`);
            if (fileElipse) fileNames.push(`"${fileElipse.name}"`);
            
            uploadStatus.textContent = `Processando ${fileNames.join(' e ')}...`;
            uploadStatus.style.color = "#555";
            uploadBtn.disabled = true;

            try {
                // Processa os dois arquivos em paralelo.
                const [zeusResult, elipseResult] = await Promise.allSettled([
                    parseFile(fileZeus),
                    parseFile(fileElipse)
                ]);

                const zeusData = zeusResult.status === 'fulfilled' ? zeusResult.value : null;
                const elipseData = elipseResult.status === 'fulfilled' ? elipseResult.value : null;

                if (zeusResult.status === 'rejected') throw zeusResult.reason;
                if (elipseResult.status === 'rejected') throw elipseResult.reason;

                uploadStatus.textContent = "Enviando dados para o servidor...";
                
                // Envia os dados processados (JSON) para a API simulada
                const apiResponse = await api.uploadData(zeusData, elipseData);

                if (apiResponse.success) {
                    uploadStatus.textContent = `Sucesso! (Simulado) ${apiResponse.message}`;
                    uploadStatus.style.color = "var(--success-color)";
                    fileInputZeus.value = "";
                    fileInputElipse.value = "";
                } else {
                    throw new Error(apiResponse.message || "A API retornou um erro.");
                }

            } catch (error) {
                console.error("Erro no processo de upload:", error);
                uploadStatus.textContent = `Erro: ${error.message}`;
                uploadStatus.style.color = "var(--error-color)";
            } finally {
                uploadBtn.disabled = false;
            }
        });
    }

    // Função para atualizar o status ao selecionar arquivos
    function updateFileStatus() {
        const fileZeus = fileInputZeus ? fileInputZeus.files[0] : null;
        const fileElipse = fileInputElipse ? fileInputElipse.files[0] : null;

        if (fileZeus || fileElipse) {
             let msg = "Pronto para carregar: ";
             if (fileZeus) msg += `[${fileZeus.name}] `;
             if (fileElipse) msg += `[${fileElipse.name}]`;
             uploadStatus.textContent = msg;
             uploadStatus.style.color = "#555";
        } else {
            uploadStatus.textContent = "";
        }
    }

    if (fileInputZeus) fileInputZeus.addEventListener('change', updateFileStatus);
    if (fileInputElipse) fileInputElipse.addEventListener('change', updateFileStatus);
});