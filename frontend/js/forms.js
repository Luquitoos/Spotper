// js/forms.js - Gerenciamento de formulários e submissão

/**
 * Captura o evento de submit de forma global (Event Delegation)
 * já que os modais são carregados dinamicamente.
 */
document.addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const formId = form.id || form.getAttribute('data-form-type');

    if (!formId) {
        console.warn('Formulário sem ID ou data-form-type');
        return;
    }

    // Transforma os dados do formulário em um objeto simples
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    console.log(`%c[SpotPer API] Enviando dados de: ${formId}`, 'color: #f4c025; font-weight: bold;');
    console.log(data);

    // Validação básica
    if (!validateForm(formId, data)) {
        return;
    }

    // Processa e envia os dados
    await submitForm(formId, data, form);
});

/**
 * Valida o formulário antes de enviar
 */
function validateForm(formId, data) {
    switch (formId) {
        case 'composer-form':
        case 'composer':
            return validateComposerForm(data);
        case 'interpreter-form':
        case 'interpreter':
            return validateInterpreterForm(data);
        case 'label-form':
        case 'label':
            return validateLabelForm(data);
        case 'album-form':
        case 'album':
            return validateAlbumForm(data);
        case 'playlist-form':
        case 'playlist':
            return validatePlaylistForm(data);
        case 'period-form':
        case 'period':
            return validatePeriodForm(data);
        case 'track-form':
        case 'track':
            return validateTrackForm(data);
        default:
            return true;
    }
}

/**
 * Valida formulário de compositor
 */
function validateComposerForm(data) {
    if (!data.nome || data.nome.trim() === '') {
        showError('Nome do compositor é obrigatório');
        return false;
    }
    if (!data.data_nascimento) {
        showError('Data de nascimento é obrigatória');
        return false;
    }
    if (!data.cod_periodo) {
        showError('Período musical é obrigatório');
        return false;
    }
    if (data.data_morte && data.data_morte < data.data_nascimento) {
        showError('Data de morte deve ser posterior à data de nascimento');
        return false;
    }
    return true;
}

/**
 * Valida formulário de intérprete
 */
function validateInterpreterForm(data) {
    if (!data.nome || data.nome.trim() === '') {
        showError('Nome do intérprete é obrigatório');
        return false;
    }
    if (!data.tipo || data.tipo.trim() === '') {
        showError('Tipo de intérprete é obrigatório');
        return false;
    }
    return true;
}

/**
 * Valida formulário de gravadora
 */
function validateLabelForm(data) {
    if (!data.nome || data.nome.trim() === '') {
        showError('Nome da gravadora é obrigatório');
        return false;
    }
    return true;
}

/**
 * Valida formulário de álbum
 */
function validateAlbumForm(data) {
    if (!data.nome || data.nome.trim() === '') {
        showError('Nome do álbum é obrigatório');
        return false;
    }
    if (!data.descricao || data.descricao.trim() === '') {
        showError('Descrição do álbum é obrigatória');
        return false;
    }
    if (!data.cod_gravadora) {
        showError('Gravadora é obrigatória');
        return false;
    }
    if (!data.preco_compra || parseFloat(data.preco_compra) <= 0) {
        showError('Preço de compra deve ser maior que zero');
        return false;
    }
    if (!data.data_compra) {
        showError('Data de compra é obrigatória');
        return false;
    }
    if (!data.data_gravacao) {
        showError('Data de gravação é obrigatória');
        return false;
    }
    const dataGravacao = new Date(data.data_gravacao);
    const dataMinima = new Date('2000-01-01');
    if (dataGravacao <= dataMinima) {
        showError('Data de gravação deve ser posterior a 01/01/2000');
        return false;
    }
    if (!data.tipo_midia) {
        showError('Tipo de mídia é obrigatório');
        return false;
    }
    return true;
}

/**
 * Valida formulário de playlist
 */
function validatePlaylistForm(data) {
    if (!data.nome || data.nome.trim() === '') {
        showError('Nome da playlist é obrigatório');
        return false;
    }
    return true;
}

/**
 * Valida formulário de período
 */
function validatePeriodForm(data) {
    if (!data.descricao || data.descricao.trim() === '') {
        showError('Descrição do período é obrigatória');
        return false;
    }
    if (!data.ano_inicio || !data.ano_fim) {
        showError('Ano de início e fim são obrigatórios');
        return false;
    }
    if (parseInt(data.ano_fim) < parseInt(data.ano_inicio)) {
        showError('Ano de fim deve ser maior ou igual ao ano de início');
        return false;
    }
    return true;
}

/**
 * Valida formulário de faixa (UI apenas)
 */
function validateTrackForm(data) {
    if (!data.descricao || data.descricao.trim() === '') {
        showError('Descrição da faixa é obrigatória');
        return false;
    }
    if (!data.cod_tipo_composicao) {
        showError('Tipo de composição é obrigatório');
        return false;
    }
    if (!data.tempo_execucao || isNaN(parseInt(data.tempo_execucao))) {
        showError('Tempo de execução é obrigatório (em segundos ou MM:SS no protótipo)');
        return false;
    }
    return true;
}

/**
 * Submete o formulário
 */
async function submitForm(formId, data, formElement) {
    const submitButton = formElement.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.innerHTML : '';

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Enviando...';
    }

    try {
        // Processa dados específicos do formulário
        const processedData = processFormData(formId, data);

        // Envia para o backend real
        await sendToBackend(formId, processedData);

        // Atualiza cache após sucesso
        await refreshCacheAfterSubmit(formId);

        // Feedback visual de sucesso
        if (submitButton) {
            submitButton.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Sucesso!';
            submitButton.classList.add('bg-green-600');
        }

        // Fecha o modal e re-renderiza após sucesso
        setTimeout(() => {
            closeModal();
            if (typeof renderAll === 'function') renderAll();
        }, 1000);

    } catch (error) {
        console.error('Erro ao enviar formulário:', error);
        showError(error.message || 'Erro ao enviar dados');

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }
}

/**
 * Processa dados do formulário antes de enviar
 */
function processFormData(formId, data) {
    const processed = { ...data };

    // Converte strings numéricas para números
    if (processed.cod_gravadora) processed.cod_gravadora = parseInt(processed.cod_gravadora);
    if (processed.cod_periodo) processed.cod_periodo = parseInt(processed.cod_periodo);
    if (processed.cod_tipo_composicao) processed.cod_tipo_composicao = parseInt(processed.cod_tipo_composicao);
    if (processed.preco_compra) processed.preco_compra = parseFloat(processed.preco_compra);
    if (processed.qtd_unidades) processed.qtd_unidades = parseInt(processed.qtd_unidades);
    if (processed.ano_inicio) processed.ano_inicio = parseInt(processed.ano_inicio);
    if (processed.ano_fim) processed.ano_fim = parseInt(processed.ano_fim);
    if (processed.tempo_execucao) processed.tempo_execucao = parseInt(processed.tempo_execucao);

    // Remove campos vazios opcionais
    Object.keys(processed).forEach(key => {
        if (processed[key] === '' || processed[key] === null) {
            delete processed[key];
        }
    });

    return processed;
}

/**
 * Simula chamada ao backend (será substituído quando backend estiver pronto)
 */
async function simulateBackendCall(formId, data) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("%c[Backend Simulado] Resposta 201: Criado com sucesso!", "color: #22c55e");
            console.log("Dados que seriam enviados:", data);

            // Simula validações do backend
            if (formId.includes('album') && data.tipo_midia === 'DOWNLOAD' && data.qtd_unidades > 1) {
                reject(new Error('Downloads só podem ter 1 unidade'));
                return;
            }

            resolve({ success: true, data });
        }, 1500);
    });
}

/**
 * Função que será usada quando o backend estiver pronto
 */
async function sendToBackend(endpoint, payload) {
    try {
        let response;

        switch (endpoint) {
            case 'composer-form':
            case 'composer':
                response = await api.createComposer(payload);
                break;
            case 'interpreter-form':
            case 'interpreter':
                response = await api.createInterpreter(payload);
                break;
            case 'label-form':
            case 'label':
                response = await api.createLabel(payload);
                break;
            case 'album-form':
            case 'album':
                response = await api.createAlbum(payload);
                break;
            case 'playlist-form':
            case 'playlist':
                response = await api.createPlaylist(payload);
                break;
            case 'period-form':
            case 'period':
                response = await api.createPeriod(payload);
                break;
            case 'track-form':
            case 'track':
                response = await api.createTrack(payload);
                break;
            case 'composition-type-form':
            case 'composition-type':
                response = await api.createCompositionType(payload);
                break;
            default:
                throw new Error(`Endpoint desconhecido: ${endpoint}`);
        }

        return response;
    } catch (error) {
        throw new Error(error.message || 'Erro ao comunicar com o servidor');
    }
}

/**
 * Mostra mensagem de erro
 */
function showError(message) {
    // Cria ou atualiza elemento de erro
    let errorElement = document.getElementById('form-error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'form-error-message';
        errorElement.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-2';
        document.body.appendChild(errorElement);
    }

    errorElement.innerHTML = `
        <span class="material-symbols-outlined">error</span>
        <span>${message}</span>
    `;

    // Remove após 5 segundos
    setTimeout(() => {
        if (errorElement) {
            errorElement.remove();
        }
    }, 5000);
}

/**
 * Mostra mensagem de sucesso
 */
function showSuccess(message) {
    let successElement = document.getElementById('form-success-message');
    if (!successElement) {
        successElement = document.createElement('div');
        successElement.id = 'form-success-message';
        successElement.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-2';
        document.body.appendChild(successElement);
    }

    successElement.innerHTML = `
        <span class="material-symbols-outlined">check_circle</span>
        <span>${message}</span>
    `;

    setTimeout(() => {
        if (successElement) {
            successElement.remove();
        }
    }, 3000);
}

/**
 * Atualiza o cache após submissão de formulário
 */
async function refreshCacheAfterSubmit(formId) {
    const cache = SpotPerState.cache;
    try {
        switch (formId) {
            case 'composer-form':
            case 'composer':
                cache.composers = await api.listComposers().catch(() => cache.composers);
                break;
            case 'interpreter-form':
            case 'interpreter':
                cache.interpreters = await api.listInterpreters().catch(() => cache.interpreters);
                break;
            case 'label-form':
            case 'label':
                cache.labels = await api.listLabels().catch(() => cache.labels);
                break;
            case 'album-form':
            case 'album':
                cache.albums = await api.listAlbums().catch(() => cache.albums);
                break;
            case 'playlist-form':
            case 'playlist':
                cache.playlists = await api.listPlaylists().catch(() => cache.playlists);
                break;
            case 'period-form':
            case 'period':
                cache.periods = await api.listPeriods().catch(() => cache.periods);
                break;
            case 'track-form':
            case 'track':
                cache.albums = await api.listAlbums().catch(() => cache.albums);
                break;
            case 'composition-type-form':
            case 'composition-type':
                cache.compositionTypes = await api.listCompositionTypes().catch(() => cache.compositionTypes);
                break;
        }
    } catch (error) {
        console.error('[SpotPer] Erro ao atualizar cache:', error);
    }
}
