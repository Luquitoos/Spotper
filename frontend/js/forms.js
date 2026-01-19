document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formId = form.id || form.getAttribute('data-form-type');
    if (!formId) {
        console.warn('Formulário sem ID ou data-form-type');
        return;
    }
    if ((formId === 'track-form' || formId === 'track') &&
        (form.dataset.albumDraftMode === 'true' ||
            (typeof window.isAddingTrackToAlbum === 'function' && window.isAddingTrackToAlbum()))) {
        console.log('[forms.js] Skipping track-form - handled by album draft flow');
        return;
    }
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    console.log(`%c[SpotPer API] Enviando dados de: ${formId}`, 'color: #f4c025; font-weight: bold;');
    console.log(data);
    if (!validateForm(formId, data)) {
        return;
    }
    await submitForm(formId, data, form);
});
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
function validateComposerForm(data) {
    if (!data.nome || data.nome.trim() === '') {
        showError('Nome do compositor é obrigatório');
        return false;
    }
    if (!data.data_nascimento) {
        showError('Data de nascimento é obrigatória');
        return false;
    }
    if (!data.cod_periodo && !data.cod_compositor) {
        showError('Período musical é obrigatório');
        return false;
    }
    if (data.data_morte && data.data_morte < data.data_nascimento) {
        showError('Data de morte deve ser posterior à data de nascimento');
        return false;
    }
    return true;
}
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
function validateLabelForm(data) {
    if (!data.nome || data.nome.trim() === '') {
        showError('Nome da gravadora é obrigatório');
        return false;
    }
    if (data.homepage && data.homepage.trim() !== '') {
        const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)$/;
        if (!urlPattern.test(data.homepage)) {
            showError('URL da homepage inválida. Use o formato: https://www.exemplo.com');
            return false;
        }
    }
    return true;
}
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
    if (typeof albumDraftTracks !== 'undefined' && albumDraftTracks.length > 0) {
        const tipoMidia = data.tipo_midia;
        if (tipoMidia === 'CD') {
            const invalidTracks = albumDraftTracks.filter(t => !t.tipo_gravacao || t.tipo_gravacao === '');
            if (invalidTracks.length > 0) {
                showError(`Faixas de CD devem ter tipo de gravação (ADD ou DDD). ${invalidTracks.length} faixa(s) sem tipo definido.`);
                return false;
            }
        } else if (tipoMidia === 'VINIL' || tipoMidia === 'DOWNLOAD') {
            const tracksWithType = albumDraftTracks.filter(t => t.tipo_gravacao && t.tipo_gravacao !== '');
            if (tracksWithType.length > 0) {
                albumDraftTracks.forEach(t => {
                    if (t.tipo_gravacao) {
                        console.log(`Clearing tipo_gravacao for track: ${t.descricao} (${tipoMidia} doesn't support recording type)`);
                        t.tipo_gravacao = null;
                    }
                });
            }
        }
    }
    return true;
}
function validatePlaylistForm(data) {
    if (!data.nome || data.nome.trim() === '') {
        showError('Nome da playlist é obrigatório');
        return false;
    }
    return true;
}
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
function validateTrackForm(data) {
    if (!data.descricao || data.descricao.trim() === '') {
        showError('Descrição da faixa é obrigatória');
        return false;
    }
    if (!data.cod_tipo_composicao && !data.tipo_composicao_texto) {
        showError('Tipo de composição é obrigatório');
        return false;
    }
    if (!data.tempo_execucao || isNaN(parseInt(data.tempo_execucao))) {
        showError('Tempo de execução é obrigatório (em segundos ou MM:SS no protótipo)');
        return false;
    }
    return true;
}
async function submitForm(formId, data, formElement) {
    const submitButton = formElement.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.innerHTML : '';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Enviando...';
    }
    try {
        const processedData = processFormData(formId, data);
        await sendToBackend(formId, processedData);
        await refreshCacheAfterSubmit(formId);
        if (submitButton) {
            submitButton.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Sucesso!';
            submitButton.classList.add('bg-green-600');
        }
        currentEditData = null;
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
function processFormData(formId, data) {
    const processed = { ...data };
    if (processed.cod_gravadora) processed.cod_gravadora = parseInt(processed.cod_gravadora);
    if (processed.cod_periodo) processed.cod_periodo = parseInt(processed.cod_periodo);
    if (processed.cod_tipo_composicao) processed.cod_tipo_composicao = parseInt(processed.cod_tipo_composicao);
    if (processed.preco_compra) processed.preco_compra = parseFloat(processed.preco_compra);
    if (processed.qtd_unidades) processed.qtd_unidades = parseInt(processed.qtd_unidades);
    if (processed.ano_inicio) processed.ano_inicio = parseInt(processed.ano_inicio);
    if (processed.ano_fim) processed.ano_fim = parseInt(processed.ano_fim);
    if (processed.tempo_execucao) processed.tempo_execucao = parseInt(processed.tempo_execucao);
    Object.keys(processed).forEach(key => {
        if (processed[key] === '' || processed[key] === null) {
            delete processed[key];
        }
    });
    if (formId === 'label-form' || formId === 'label') {
        return processLabelData(processed);
    }
    if (formId === 'track-form' || formId === 'track') {
        return processTrackData(processed);
    }
    if (formId === 'playlist-form' || formId === 'playlist') {
        return processPlaylistData(processed);
    }
    if (formId === 'album-form' || formId === 'album') {
        return processAlbumData(processed);
    }
    return processed;
}
async function simulateBackendCall(formId, data) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("%c[Backend Simulado] Resposta 201: Criado com sucesso!", "color: #22c55e");
            console.log("Dados que seriam enviados:", data);
            if (formId.includes('album') && data.tipo_midia === 'DOWNLOAD' && data.qtd_unidades > 1) {
                reject(new Error('Downloads só podem ter 1 unidade'));
                return;
            }
            resolve({ success: true, data });
        }, 1500);
    });
}
async function sendToBackend(endpoint, payload) {
    try {
        let response;
        const entityId = payload.cod_compositor || payload.cod_interprete || payload.cod_gravadora ||
            payload.cod_album || payload.cod_playlist || payload.cod_periodo ||
            (currentEditData && (currentEditData.cod_compositor || currentEditData.cod_interprete ||
                currentEditData.cod_gravadora || currentEditData.cod_album ||
                currentEditData.cod_playlist || currentEditData.cod_periodo || currentEditData.id));
        const isEditing = !!entityId;
        switch (endpoint) {
            case 'composer-form':
            case 'composer':
                response = isEditing
                    ? await api.updateComposer(entityId, payload)
                    : await api.createComposer(payload);
                break;
            case 'interpreter-form':
            case 'interpreter':
                response = isEditing
                    ? await api.updateInterpreter(entityId, payload)
                    : await api.createInterpreter(payload);
                break;
            case 'label-form':
            case 'label':
                response = isEditing
                    ? await api.updateLabel(entityId, payload)
                    : await api.createLabel(payload);
                break;
            case 'album-form':
            case 'album':
                response = await api.createAlbum(payload);
                break;
            case 'playlist-form':
            case 'playlist':
                response = isEditing
                    ? await api.updatePlaylist(entityId, payload)
                    : await api.createPlaylist(payload);
                break;
            case 'period-form':
            case 'period':
                response = isEditing
                    ? await api.updatePeriod(entityId, payload)
                    : await api.createPeriod(payload);
                break;
            case 'track-form':
            case 'track':
                response = isEditing
                    ? await api.updateTrack(entityId, payload)
                    : await api.createTrack(payload);
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
function showError(message) {
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
    setTimeout(() => {
        if (errorElement) {
            errorElement.remove();
        }
    }, 5000);
}
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
function processTrackData(data) {
    const processed = { ...data };
    if (processed.cod_tipo_composicao) processed.cod_tipo_composicao = parseInt(processed.cod_tipo_composicao);
    if (processed.tempo_execucao) {
        const tempoStr = String(processed.tempo_execucao);
        if (tempoStr.includes(':')) {
            const parts = tempoStr.split(':');
            processed.tempo_execucao = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else {
            processed.tempo_execucao = parseInt(tempoStr);
        }
    }
    if (processed.cod_album) processed.cod_album = parseInt(processed.cod_album);
    if (processed.numero_unidade) processed.numero_unidade = parseInt(processed.numero_unidade);
    if (processed.numero_faixa) processed.numero_faixa = parseInt(processed.numero_faixa);
    if (window.getSelectedComposers) {
        processed.compositores = window.getSelectedComposers();
    }
    if (window.getSelectedInterpreters) {
        processed.interpretes = window.getSelectedInterpreters();
    }
    return processed;
}
function processPlaylistData(data) {
    const processed = { ...data };
    if (window.getPlaylistDraftTracks) {
        const tracks = window.getPlaylistDraftTracks();
        processed.faixas = tracks.map(t => ({
            cod_album: t.cod_album,
            numero_unidade: t.numero_unidade,
            numero_faixa: t.numero_faixa
        }));
    }
    return processed;
}
function processLabelData(data) {
    const processed = { ...data };
    const phones = [];
    Object.keys(data).forEach(key => {
        const match = key.match(/telefones\[(\d+)\]\.(numero|tipo)/);
        if (match) {
            const index = parseInt(match[1]);
            const field = match[2];
            if (!phones[index]) phones[index] = {};
            phones[index][field] = data[key];
            delete processed[key];
        }
    });
    processed.telefones = phones.filter(p => p && p.numero && p.numero.trim() !== '');
    return processed;
}
function processAlbumData(data) {
    const processed = { ...data };
    console.log('[processAlbumData] albumDraftTracks:', typeof albumDraftTracks, albumDraftTracks);
    if (typeof albumDraftTracks !== 'undefined' && albumDraftTracks.length > 0) {
        console.log('[processAlbumData] Adding', albumDraftTracks.length, 'tracks to album data');
        processed.faixas = albumDraftTracks.map((track, idx) => ({
            numero_unidade: track.numero_unidade || 1,
            numero_faixa: track.numero_faixa || (idx + 1),
            descricao: track.descricao,
            cod_tipo_composicao: track.cod_tipo_composicao || null,
            tipo_composicao_texto: track.tipo_composicao_texto || null,
            tipo_gravacao: track.tipo_gravacao || null,
            tempo_execucao: track.tempo_execucao,
            compositores: track.compositores || [],
            interpretes: track.interpretes || []
        }));
        console.log('[processAlbumData] processed.faixas:', processed.faixas);
        albumDraftTracks = [];
    } else {
        console.log('[processAlbumData] No tracks in albumDraftTracks or variable undefined');
    }
    console.log('[processAlbumData] Final processed data:', processed);
    return processed;
}
