// js/modals.js - Sistema de modais

let currentModal = null;
let currentEditData = null; // Store data when editing
let playlistDraftTracks = []; // Tracks being added to playlist

/**
 * Dependency validation rules for each entity type
 * Returns { valid: boolean, message: string, action: string, actionModal: string }
 */
function validateBeforeModal(modalName) {
    const state = typeof SpotPerState !== 'undefined' ? SpotPerState : null;
    const data = state?.cache || state?.data || {};
    const context = state?.context || {};

    switch (modalName) {
        case 'composer':
            // Compositor needs a period to exist OR be selected
            if (data.periods?.length === 0 && !context.periodId) {
                return {
                    valid: false,
                    message: 'Para criar um compositor, primeiro crie um período musical.',
                    action: 'Criar Período',
                    actionModal: 'period'
                };
            }
            return { valid: true };

        case 'album':
            // Album needs a gravadora (label) to exist
            if (data.labels?.length === 0) {
                return {
                    valid: false,
                    message: 'Para criar um álbum, primeiro cadastre uma gravadora.',
                    action: 'Criar Gravadora',
                    actionModal: 'label'
                };
            }
            return { valid: true };

        case 'track':
            // Track needs an album and tipo_composicao
            if (data.albums?.length === 0) {
                return {
                    valid: false,
                    message: 'Para adicionar faixas, primeiro crie um álbum.',
                    action: 'Criar Álbum',
                    actionModal: 'album'
                };
            }
            if (data.compositionTypes?.length === 0) {
                return {
                    valid: false,
                    message: 'Para adicionar faixas, cadastre os tipos de composição primeiro.',
                    action: 'Configurar',
                    actionModal: null
                };
            }
            return { valid: true };

        case 'playlist':
            // Playlist can be created empty, but warn if no tracks exist
            // This is optional - playlists can start empty
            return { valid: true };

        default:
            return { valid: true };
    }
}

/**
 * Shows a validation message modal when action is blocked
 */
function showValidationMessage(validation) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    if (!overlay || !content) return;

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');

    content.innerHTML = `
        <div class="relative w-full max-w-md bg-panel-light dark:bg-[#1c1914] rounded-xl shadow-2xl border border-border-light dark:border-[#393528] p-8 text-center animate-in fade-in zoom-in duration-300">
            <div class="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <span class="material-symbols-outlined text-amber-500 !text-[32px]">info</span>
            </div>
            <h2 class="text-ink-main dark:text-white text-xl font-display font-bold mb-3">Ação Necessária</h2>
            <p class="text-ink-muted dark:text-[#8e8672] text-sm mb-6">${validation.message}</p>
            <div class="flex items-center justify-center gap-3">
                <button onclick="closeModal()" class="px-4 py-2 text-ink-muted dark:text-[#8e8672] text-sm font-mono hover:text-ink-main dark:hover:text-white transition-colors">
                    Cancelar
                </button>
                ${validation.actionModal ? `
                    <button onclick="closeModal(); setTimeout(() => openModal('${validation.actionModal}'), 100);" 
                            class="px-6 py-2 rounded bg-gradient-to-b from-[#f4c025] to-[#b58d17] text-[#181611] text-sm font-mono font-bold tracking-wider shadow-amber-glow hover:brightness-110 active:scale-95 transition-all">
                        ${validation.action}
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Abre um modal específico
 */
async function openModal(modalName) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    if (!overlay || !content) {
        console.error('Elementos do modal não encontrados');
        return;
    }

    // Check dependencies before opening
    const validation = validateBeforeModal(modalName);
    if (!validation.valid) {
        showValidationMessage(validation);
        return;
    }

    currentModal = modalName;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');

    try {
        const response = await fetch(`components/modals/${modalName}-modal.html`);
        if (!response.ok) {
            throw new Error(`Modal ${modalName} não encontrado`);
        }
        const html = await response.text();
        content.innerHTML = html;

        // Inicializa componentes específicos do modal se necessário
        initModalComponents(modalName);
    } catch (err) {
        console.error("Erro ao carregar modal:", err);
        content.innerHTML = `
            <div class="bg-panel-light dark:bg-panel-dark rounded-lg p-8 text-center">
                <p class="text-text-muted">Erro ao carregar modal: ${modalName}</p>
                <button onclick="closeModal()" class="mt-4 px-4 py-2 bg-primary text-background-dark rounded">
                    Fechar
                </button>
            </div>
        `;
    }
}

/**
 * Fecha o modal atual
 */
function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.classList.add('hidden');
    overlay.classList.remove('flex');

    const content = document.getElementById('modal-content');
    if (content) {
        content.innerHTML = '';
    }

    currentModal = null;
    currentEditData = null; // Reset edit data
}

/**
 * Inicializa componentes específicos de cada modal
 */
function initModalComponents(modalName) {
    switch (modalName) {
        case 'album':
            initAlbumModal();
            break;
        case 'playlist':
            initPlaylistModal();
            break;
        case 'composer':
            initComposerModal();
            break;
        case 'interpreter':
            initInterpreterModal();
            break;
        case 'label':
            initLabelModal();
            break;
        case 'label-list':
            initLabelListModal();
            break;
        case 'period':
            initPeriodModal();
            break;
        case 'album-details':
            // details modals are populated by app.js, so no init needed
            break;
        case 'playlist-details':
            // details modals are populated by app.js, so no init needed
            break;
        case 'track':
            initTrackModal();
            break;
        case 'composition-type':
            initCompositionTypeModal();
            break;
    }
}

/**
 * Inicializa o modal de álbum
 */
function initAlbumModal() {
    // Carrega gravadoras para o select
    loadGravadorasForSelect();

    // Setup price validation for VALIDAR_PRECO_ALBUM
    setupAlbumPriceValidation();

    const form = document.getElementById('album-form');
    if (!form) return;

    // --- 1. Date Validation (> 01/01/2000) ---
    const dateInput = document.getElementById('album-data-gravacao');
    if (dateInput) {
        // Set min attribute logic just in case
        dateInput.min = "2000-01-02";

        const validateDate = () => {
            const dateVal = new Date(dateInput.value);
            const minDate = new Date('2000-01-01');
            if (dateInput.value && dateVal <= minDate) {
                if (!document.getElementById('date-error')) {
                    const error = document.createElement('p');
                    error.id = 'date-error';
                    error.className = 'text-xs text-red-500 mt-1';
                    error.textContent = 'Data de gravação deve ser posterior a 01/01/2000.';
                    dateInput.parentNode.appendChild(error);
                    dateInput.classList.add('border-red-500');
                }
                return false;
            } else {
                const err = document.getElementById('date-error');
                if (err) err.remove();
                dateInput.classList.remove('border-red-500');
                return true;
            }
        };

        dateInput.addEventListener('change', validateDate);
        form.addEventListener('submit', (e) => {
            if (!validateDate()) {
                e.preventDefault();
                alert('Erro: Data de gravação inválida.');
            }
        });
    }

    // --- 2. Media Type & Units Logic ---
    const mediaButtons = document.querySelectorAll('.media-type-btn');
    const tipoMidiaInput = document.getElementById('album-tipo-midia');
    const qtdUnidadesContainer = document.getElementById('album-qtd-unidades-container');
    const qtdUnidadesInput = document.getElementById('album-qtd-unidades');

    mediaButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            // Unselect all
            mediaButtons.forEach(b => {
                b.classList.remove('bg-primary', 'text-white');
                b.classList.add('text-ink-muted');
            });
            // Select clicked
            this.classList.add('bg-primary', 'text-white');
            this.classList.remove('text-ink-muted');

            const tipo = this.getAttribute('data-media-type');
            if (tipoMidiaInput) tipoMidiaInput.value = tipo;

            // Logic: Download -> Units = 1, Hide Input
            if (qtdUnidadesContainer && qtdUnidadesInput) {
                if (tipo === 'DOWNLOAD') {
                    qtdUnidadesContainer.style.display = 'none';
                    qtdUnidadesInput.value = 1;
                } else {
                    qtdUnidadesContainer.style.display = 'flex';
                }
            }
        });
    });

    // --- 3. Track Management (Migrated from dead inline script) ---
    // Initialize track counter
    let trackCounter = 0;
    const tracksContainer = document.getElementById('tracks-container');
    const addTrackBtn = document.querySelector('button[onclick="openModal(\'track\')"]'); // The button in the sidebar

    // Override the button action to add inline tracks instead of opening modal
    if (addTrackBtn) {
        addTrackBtn.removeAttribute('onclick');
        addTrackBtn.addEventListener('click', () => {
            addAlbumTrackRow(++trackCounter);
        });
    }

    // Function to add track row
    window.addAlbumTrackRow = (id) => {
        if (!tracksContainer) return;

        const trackDiv = document.createElement('div');
        trackDiv.className = 'flex items-center gap-3 group/track bg-white/5 dark:bg-black/20 p-2 rounded border border-transparent hover:border-primary/30 transition-all';
        trackDiv.dataset.id = id;
        trackDiv.innerHTML = `
           <span class="text-text-muted dark:text-[#8e8672] font-mono text-xs w-6 text-right font-bold">${id.toString().padStart(2, '0')}</span>
           <div class="flex-1 flex flex-col gap-2">
               <input name="tracks[${id}][descricao]" 
                      class="w-full bg-white dark:bg-[#e4e2d5] text-[#181611] border border-border-light dark:border-[#8e8672] rounded p-2 font-display text-sm focus:outline-none focus:border-primary shadow-sm" 
                      placeholder="Track name" type="text" required>
               <div class="grid grid-cols-2 gap-2">
                   <select name="tracks[${id}][cod_tipo_composicao]" 
                           class="w-full bg-white dark:bg-[#e4e2d5] text-[#181611] border border-border-light dark:border-[#8e8672] rounded p-1.5 text-xs focus:outline-none focus:border-primary" 
                           required>
                       <option value="">Tipo composição</option>
                   </select>
                   <input name="tracks[${id}][tempo_execucao]" 
                          type="number" min="1" placeholder="Tempo (seg)" 
                          class="w-full bg-white dark:bg-[#e4e2d5] text-[#181611] border border-border-light dark:border-[#8e8672] rounded p-1.5 font-mono text-xs focus:outline-none focus:border-primary" 
                          required>
               </div>
               <input type="hidden" name="tracks[${id}][numero_faixa]" value="${id}">
               <input type="hidden" name="tracks[${id}][numero_unidade]" value="1">
           </div>
           <button type="button" onclick="removeAlbumTrackRow(this)" 
                   class="size-8 rounded border border-border-light dark:border-[#393528] bg-white dark:bg-[#23201a] text-text-muted hover:text-red-500 transition-colors flex items-center justify-center">
               <span class="material-symbols-outlined !text-[16px]">close</span>
           </button>
       `;
        tracksContainer.appendChild(trackDiv);
        updateAlbumTrackCount();

        // Load composition types for this row
        const select = trackDiv.querySelector('select');
        loadCompositionTypesForSelectElement(select);
    };

    window.removeAlbumTrackRow = (btn) => {
        const row = btn.closest('.group\\/track');
        if (row) {
            row.remove();
            updateAlbumTrackCount();
            renumberAlbumTracks();
            trackCounter--;
        }
    };

    const updateAlbumTrackCount = () => {
        const count = tracksContainer.querySelectorAll('.group\\/track').length;
        const countEl = document.getElementById('track-count');
        if (countEl) countEl.textContent = `${count.toString().padStart(2, '0')} / 64`;
    };

    const renumberAlbumTracks = () => {
        // Renumbering logic if needed
        const rows = tracksContainer.querySelectorAll('.group\\/track');
        rows.forEach((row, idx) => {
            const num = idx + 1;
            const span = row.querySelector('span.font-mono');
            if (span) span.textContent = num.toString().padStart(2, '0');
            const hiddenInput = row.querySelector('input[name*="numero_faixa"]');
            if (hiddenInput) hiddenInput.value = num;
        });
    };

    // --- 4. Edit Mode Population ---
    if (currentEditData) {
        const titleEl = document.querySelector('#album-form')?.closest('[class*="bg-"]')?.querySelector('h2');
        const submitBtn = document.querySelector('#album-form button[type="submit"], button[form="album-form"]');

        if (titleEl) titleEl.textContent = 'Editar Álbum';
        if (submitBtn) {
            const label = submitBtn.querySelector('span.relative');
            if (label) label.textContent = 'Atualizar Álbum';
        }

        if (currentEditData.nome) form.querySelector('[name="nome"]').value = currentEditData.nome;
        if (currentEditData.descricao) form.querySelector('[name="descricao"]').value = currentEditData.descricao;

        if (currentEditData.cod_gravadora) {
            setTimeout(() => {
                const gravSelect = form.querySelector('[name="cod_gravadora"]');
                if (gravSelect) gravSelect.value = currentEditData.cod_gravadora;
            }, 150);
        }

        if (currentEditData.tipo_midia) {
            const mediaBtn = form.querySelector(`[data-media-type="${currentEditData.tipo_midia}"]`);
            if (mediaBtn) mediaBtn.click();

            // Block media type editing
            const hiddenInput = document.getElementById('album-tipo-midia');
            if (hiddenInput) {
                mediaButtons.forEach(btn => {
                    btn.disabled = true;
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                });

                // Show lock warning
                const mediaContainer = document.querySelector('[data-media-type]')?.parentElement;
                if (mediaContainer && !mediaContainer.querySelector('.media-lock-warning')) {
                    const warning = document.createElement('p');
                    warning.className = 'media-lock-warning text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1';
                    warning.innerHTML = '<span class="material-symbols-outlined !text-[14px]">lock</span> Tipo de mídia não pode ser alterado após criação.';
                    mediaContainer.parentElement.appendChild(warning);
                }
            }
        }

        // Populate additional fields
        if (currentEditData.preco_compra) form.querySelector('[name="preco_compra"]').value = currentEditData.preco_compra;
        if (currentEditData.data_compra) form.querySelector('[name="data_compra"]').value = currentEditData.data_compra;
        if (currentEditData.data_gravacao) form.querySelector('[name="data_gravacao"]').value = currentEditData.data_gravacao;
        if (currentEditData.tipo_compra) form.querySelector('[name="tipo_compra"]').value = currentEditData.tipo_compra;
        if (currentEditData.qtd_unidades) form.querySelector('[name="qtd_unidades"]').value = currentEditData.qtd_unidades;

        form.dataset.editId = currentEditData.id;
    }
}

/**
 * Helper to load composition types into a specific select element (for album rows)
 */
async function loadCompositionTypesForSelectElement(select) {
    if (!select) return;
    try {
        // Uses cache populated from API at app initialization
        const types = SpotPerState?.cache?.compositionTypes || [];
        select.innerHTML = '<option value="">Tipo composição</option>' +
            types.map(type => `<option value="${type.cod_tipo_composicao}">${type.descricao}</option>`).join('');
    } catch (err) {
        console.error(err);
    }
}

/**
 * Configura validação de preço do álbum (VALIDAR_PRECO_ALBUM)
 * Preço não pode exceder 3x a média dos álbuns DDD
 */
function setupAlbumPriceValidation() {
    const priceInput = document.getElementById('album-preco');
    if (!priceInput) return;

    // Calculate average DDD price from cache
    const dddAverage = calculateDDDAveragePrice();
    const maxPrice = dddAverage * 3;

    // Add price warning element if not exists
    let warningEl = document.getElementById('album-price-warning');
    if (!warningEl && priceInput.parentElement) {
        warningEl = document.createElement('p');
        warningEl.id = 'album-price-warning';
        warningEl.className = 'hidden text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1';
        warningEl.innerHTML = `<span class="material-symbols-outlined !text-[14px]">error</span> Preço excede 3x a média DDD (R$ ${maxPrice.toFixed(2)})`;
        priceInput.parentElement.appendChild(warningEl);
    }

    // Add hint about max price
    let hintEl = document.getElementById('album-price-hint');
    if (!hintEl && priceInput.parentElement && dddAverage > 0) {
        hintEl = document.createElement('p');
        hintEl.id = 'album-price-hint';
        hintEl.className = 'text-[10px] text-[#8a8060] mt-1';
        hintEl.innerHTML = `Máximo permitido: R$ ${maxPrice.toFixed(2)} (3x média DDD)`;
        priceInput.parentElement.appendChild(hintEl);
    }

    priceInput.addEventListener('input', function () {
        const price = parseFloat(this.value) || 0;
        if (dddAverage > 0 && price > maxPrice) {
            warningEl?.classList.remove('hidden');
            this.classList.add('border-red-500', 'dark:border-red-500');
        } else {
            warningEl?.classList.add('hidden');
            this.classList.remove('border-red-500', 'dark:border-red-500');
        }
    });

    // Form submit validation
    const form = document.getElementById('album-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            const price = parseFloat(priceInput.value) || 0;
            if (dddAverage > 0 && price > maxPrice) {
                e.preventDefault();
                alert(`Erro: O preço R$ ${price.toFixed(2)} excede o limite permitido de R$ ${maxPrice.toFixed(2)} (3x a média dos álbuns DDD).`);
                return false;
            }
        });
    }
}

/**
 * Cache para média DDD do backend
 */
let cachedDDDAverage = null;

/**
 * Busca a média DDD do backend (cacheada)
 */
async function fetchDDDAverage() {
    if (cachedDDDAverage === null) {
        try {
            const result = await api.getDDDAverage();
            cachedDDDAverage = result.media_ddd || 50;
        } catch {
            cachedDDDAverage = 50;
        }
    }
    return cachedDDDAverage;
}

/**
 * Calcula a média de preços dos álbuns com faixas DDD (usa cache ou backend)
 */
function calculateDDDAveragePrice() {
    // Usa valor cacheado se disponível
    if (cachedDDDAverage !== null) {
        return cachedDDDAverage;
    }

    // Fallback: calcular localmente
    const albums = SpotPerState?.cache?.albums || [];
    const dddAlbums = albums.filter(a => a.has_ddd_tracks || a.tipo_midia === 'CD');

    if (dddAlbums.length === 0) {
        return 50; // R$ 50,00 default
    }

    const total = dddAlbums.reduce((sum, a) => sum + (parseFloat(a.preco_compra) || 0), 0);
    return total / dddAlbums.length;
}

/**
 * Inicializa o modal de playlist
 */
function initPlaylistModal() {
    // Reset draft tracks
    playlistDraftTracks = [];

    // Load available albums
    loadAlbumsForPlaylist();

    // Update stats display
    updatePlaylistStats();

    // If editing, populate with existing data
    if (currentEditData) {
        const nameInput = document.getElementById('playlist-name-input');
        if (nameInput && currentEditData.nome) {
            nameInput.value = currentEditData.nome;
        }
        // Pre-load existing tracks if any
        if (currentEditData.tracks) {
            playlistDraftTracks = [...currentEditData.tracks];
            renderPlaylistDraftTracks();
            updatePlaylistStats();
        }
    }

    // Bind save button
    const saveBtn = document.getElementById('playlist-save-btn');
    if (saveBtn) {
        saveBtn.onclick = savePlaylist;
    }
}

/**
 * Inicializa o modal de compositor
 */
function initComposerModal() {
    // Carrega períodos musicais para o select
    loadPeriodsForSelect();

    // Auto-select period from context if set
    const context = typeof SpotPerState !== 'undefined' ? SpotPerState.context : null;
    if (context?.periodId) {
        const periodSelect = document.querySelector('select[name="cod_periodo"]');
        if (periodSelect) {
            // Wait a bit for the options to load
            setTimeout(() => {
                periodSelect.value = context.periodId;
            }, 100);
        }
    }

    // If editing, populate with existing data
    if (currentEditData) {
        const titleEl = document.querySelector('#composer-form')?.closest('[class*="bg-"]')?.querySelector('h2');
        const submitBtn = document.querySelector('#composer-form button[type="submit"]');

        if (titleEl) titleEl.textContent = 'Edit Composer';
        if (submitBtn) {
            const label = submitBtn.querySelector('span');
            if (label) label.textContent = 'Update Composer';
        }

        const form = document.getElementById('composer-form');
        if (form) {
            if (currentEditData.nome) form.querySelector('[name="nome"]').value = currentEditData.nome;
            if (currentEditData.cidade_nascimento) form.querySelector('[name="cidade_nascimento"]').value = currentEditData.cidade_nascimento;
            if (currentEditData.pais_nascimento) form.querySelector('[name="pais_nascimento"]').value = currentEditData.pais_nascimento;
            if (currentEditData.data_nascimento) form.querySelector('[name="data_nascimento"]').value = currentEditData.data_nascimento;
            if (currentEditData.data_morte) form.querySelector('[name="data_morte"]').value = currentEditData.data_morte;
            if (currentEditData.cod_periodo) {
                setTimeout(() => {
                    const periodSelect = form.querySelector('[name="cod_periodo"]');
                    if (periodSelect) periodSelect.value = currentEditData.cod_periodo;
                }, 150);
            }
            form.dataset.editId = currentEditData.id;
        }
    }
}

/**
 * Inicializa o modal de intérprete
 */
function initInterpreterModal() {
    // If editing, populate with existing data
    if (currentEditData) {
        const titleEl = document.querySelector('#interpreter-form')?.closest('div')?.querySelector('h2');
        const submitBtn = document.querySelector('#interpreter-form button[type="submit"]');

        if (titleEl) titleEl.textContent = 'Editar Intérprete';
        if (submitBtn) {
            submitBtn.textContent = 'Atualizar Intérprete';
        }

        const form = document.getElementById('interpreter-form');
        if (form) {
            if (currentEditData.nome) form.querySelector('[name="nome"]').value = currentEditData.nome;
            if (currentEditData.tipo) form.querySelector('[name="tipo"]').value = currentEditData.tipo;
            form.dataset.editId = currentEditData.id;
        }
    }
}

/**
 * Inicializa o modal de gravadora com suporte a múltiplos telefones
 */
function initLabelModal() {
    // If editing, populate with existing data
    if (currentEditData) {
        const titleEl = document.querySelector('#label-form')?.closest('.bg-parchment, [class*="bg-"]')?.querySelector('h2');
        const submitBtn = document.querySelector('#label-form button[type="submit"]');

        // Change title and button for edit mode
        if (titleEl) titleEl.textContent = 'Editar Gravadora';
        if (submitBtn) {
            submitBtn.innerHTML = '<span>Atualizar Gravadora</span><span class="material-symbols-outlined text-lg">save</span>';
        }

        // Pre-fill form fields
        const form = document.getElementById('label-form');
        if (form) {
            if (currentEditData.nome) form.querySelector('[name="nome"]').value = currentEditData.nome;
            if (currentEditData.endereco) form.querySelector('[name="endereco"]').value = currentEditData.endereco;
            if (currentEditData.homepage) form.querySelector('[name="homepage"]').value = currentEditData.homepage;

            // Load multiple phones if editing
            if (currentEditData.telefones && currentEditData.telefones.length > 0) {
                const phonesList = document.getElementById('phones-list');
                if (phonesList) {
                    phonesList.innerHTML = ''; // Clear default
                    currentEditData.telefones.forEach((tel, index) => {
                        addPhoneField(tel.numero, tel.tipo, index === 0);
                    });
                }
            }

            form.dataset.editId = currentEditData.id;
        }
    }
}

// Phone field counter
let phoneFieldCount = 1;

/**
 * Adiciona um novo campo de telefone
 */
function addPhoneField(numero = '', tipo = '', isFirst = false) {
    const phonesList = document.getElementById('phones-list');
    if (!phonesList) return;

    const index = phonesList.querySelectorAll('.phone-entry').length;

    const phoneEntry = document.createElement('div');
    phoneEntry.className = 'phone-entry grid grid-cols-[1fr,auto,auto] gap-2 items-end';
    phoneEntry.dataset.phoneIndex = index;
    phoneEntry.innerHTML = `
        <div class="flex flex-col gap-1">
            <input name="telefones[${index}].numero" type="tel" value="${numero}"
                class="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-[#262626] text-text-main dark:text-gray-200 placeholder:text-gray-400 h-10 px-3 shadow-sm font-mono text-sm"
                placeholder="+55 (11) 99999-0000">
        </div>
        <div class="flex flex-col gap-1">
            <select name="telefones[${index}].tipo"
                class="rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-[#262626] text-text-main dark:text-gray-200 h-10 px-2 text-sm appearance-none">
                <option value="" ${tipo === '' ? 'selected' : ''}>Tipo</option>
                <option value="Fixo" ${tipo === 'Fixo' ? 'selected' : ''}>Fixo</option>
                <option value="Celular" ${tipo === 'Celular' ? 'selected' : ''}>Celular</option>
                <option value="WhatsApp" ${tipo === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option>
                <option value="Comercial" ${tipo === 'Comercial' ? 'selected' : ''}>Comercial</option>
            </select>
        </div>
        <button type="button" onclick="removePhoneField(this)" 
            class="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors ${isFirst ? 'opacity-50 pointer-events-none' : ''}">
            <span class="material-symbols-outlined !text-[18px]">close</span>
        </button>
    `;

    phonesList.appendChild(phoneEntry);

    // Enable first phone's remove button if more than one
    updatePhoneRemoveButtons();

    phoneFieldCount++;
}

/**
 * Remove um campo de telefone
 */
function removePhoneField(button) {
    const phoneEntry = button.closest('.phone-entry');
    if (phoneEntry) {
        phoneEntry.remove();
        updatePhoneRemoveButtons();
    }
}

/**
 * Atualiza visibilidade dos botões de remover
 */
function updatePhoneRemoveButtons() {
    const phonesList = document.getElementById('phones-list');
    if (!phonesList) return;

    const entries = phonesList.querySelectorAll('.phone-entry');
    entries.forEach((entry, index) => {
        const removeBtn = entry.querySelector('button');
        if (removeBtn) {
            if (entries.length === 1) {
                removeBtn.classList.add('opacity-50', 'pointer-events-none');
            } else {
                removeBtn.classList.remove('opacity-50', 'pointer-events-none');
            }
        }
    });
}

// Make phone functions globally available
window.addPhoneField = addPhoneField;
window.removePhoneField = removePhoneField;

/**
 * Edita uma gravadora existente
 */
async function editLabel(labelId) {
    try {
        // Fetch fresh data from API
        const label = await api.getLabel(labelId);
        if (label) {
            openModalForEdit('label', labelId, label);
        }
    } catch (error) {
        // Fallback to cache if API fails
        const labels = SpotPerState?.cache?.labels || [];
        const label = labels.find(l => l.cod_gravadora === labelId);
        if (label) {
            openModalForEdit('label', labelId, label);
        }
    }
}

// Make editLabel globally available
window.editLabel = editLabel;

/**
 * Inicializa o modal de lista de gravadoras
 */
async function initLabelListModal() {
    try {
        // TODO: Substituir por chamada real da API
        // const labels = await api.listLabels();

        const labelsContainer = document.getElementById('labels-container');
        if (!labelsContainer) return;

        // TODO: Fetch from API - GET /api/gravadoras
        const labels = SpotPerState?.cache?.labels || [];

        labelsContainer.innerHTML = labels.map(label => `
            <div class="flex flex-col bg-white dark:bg-[#1f1f1f] rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm hover:border-primary transition-all p-6 relative group">
                <div class="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                <h3 class="text-2xl font-display font-bold text-text-main dark:text-white group-hover:text-primary transition-colors">${label.nome}</h3>
                <div class="flex flex-col gap-3 mt-6">
                    ${label.endereco ? `
                        <div class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-primary text-sm">location_on</span>
                            <p class="text-text-muted text-xs">${label.endereco}</p>
                        </div>
                    ` : ''}
                    ${label.homepage ? `
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-primary text-sm">language</span>
                            <a href="https://${label.homepage}" target="_blank" class="text-text-muted text-xs hover:underline">${label.homepage}</a>
                        </div>
                    ` : ''}
                </div>
                <button onclick="editLabel(${label.cod_gravadora})" 
                        class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 bg-primary text-background-dark p-2 rounded-full shadow-lg transition-all">
                    <span class="material-symbols-outlined !text-[18px]">edit</span>
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar gravadoras:', error);
    }
}

/**
 * Inicializa o modal de período
 */
function initPeriodModal() {
    // If editing, populate with existing data
    if (currentEditData) {
        const titleEl = document.querySelector('#period-form')?.closest('div')?.querySelector('h2');
        const submitBtn = document.querySelector('#period-form button[type="submit"], button[form="period-form"]');

        if (titleEl) titleEl.textContent = 'Editar Período';
        if (submitBtn) {
            submitBtn.innerHTML = `
                <div class="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-x-[-100%] group-hover:translate-x-[100%]"></div>
                <span class="material-symbols-outlined text-[20px] drop-shadow-sm text-[#2a0a00]">save</span>
                <span class="text-xs font-bold uppercase tracking-widest text-[#2a0a00]">Atualizar Período</span>
            `;
        }

        const form = document.getElementById('period-form');
        if (form) {
            if (currentEditData.descricao) form.querySelector('[name="descricao"]').value = currentEditData.descricao;
            if (currentEditData.ano_inicio) form.querySelector('[name="ano_inicio"]').value = currentEditData.ano_inicio;
            if (currentEditData.ano_fim) form.querySelector('[name="ano_fim"]').value = currentEditData.ano_fim;
            form.dataset.editId = currentEditData.id;
        }
    }
}

/**
 * Inicializa o modal de tipo de composição
 */
function initCompositionTypeModal() {
    const form = document.getElementById('composition-type-form');
    // If editing, populate with existing data
    if (currentEditData && form) {
        const titleEl = form.closest('.bg-white')?.querySelector('h3');
        const submitBtn = form.querySelector('button[type="submit"]');

        if (titleEl) titleEl.textContent = 'Editar Tipo de Composição';
        if (submitBtn) {
            submitBtn.innerHTML = '<span>Atualizar</span><span class="material-symbols-outlined !text-[16px]">save</span>';
        }

        if (currentEditData.descricao) form.querySelector('[name="descricao"]').value = currentEditData.descricao;
        form.dataset.editId = currentEditData.id;
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const descricao = form.descricao.value.trim();
            if (!descricao) return;

            // TODO: API call to save
            console.log('Salvar tipo de composição:', descricao);
            alert(`Tipo de composição "${descricao}" cadastrado/atualizado com sucesso!`);
            closeModal();
        });
    }
}

/**
 * Inicializa o modal de faixa com validações de trigger
 */
function initTrackModal() {
    // Clear chips selection state
    selectedComposers = [];
    selectedInterpreters = [];

    // Load selects
    loadCompositionTypes();
    loadComposersForTrack();
    loadInterpretersForTrack();

    // Set album ID from context
    const albumIdInput = document.getElementById('track-album-id');
    let parentAlbum = null;

    if (SpotPerState?.selection?.albumId) {
        if (albumIdInput) albumIdInput.value = SpotPerState.selection.albumId;
        // Check 64 track limit
        checkTrackLimit(SpotPerState.selection.albumId);

        // Find parent album to check media type
        if (SpotPerState.cache?.albums) {
            parentAlbum = SpotPerState.cache.albums.find(a => a.cod_album == SpotPerState.selection.albumId);
        }
    }

    // --- Business Rule: Recording Type based on Media Type ---
    // Rule: CD -> Must be ADD or DDD.
    // Rule: Vinyl/Download -> No recording type (None).
    const recordingTypeRadios = document.querySelectorAll('input[name="tipo_gravacao"]');
    const recordingContainer = document.getElementById('track-gravacao-container');
    const recordingInfo = document.getElementById('track-gravacao-info');
    const recordingHint = document.getElementById('track-gravacao-hint');
    const noneRadio = document.querySelector('input[name="tipo_gravacao"][value=""]');

    if (parentAlbum) {
        const isCD = parentAlbum.tipo_midia === 'CD';

        recordingTypeRadios.forEach(radio => {
            if (radio.value === 'ADD' || radio.value === 'DDD') {
                radio.disabled = !isCD;
                if (!isCD) {
                    radio.parentElement.classList.add('opacity-50', 'cursor-not-allowed');
                    radio.checked = false;
                } else {
                    radio.parentElement.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        });

        if (!isCD) {
            // If not CD, force "None" (empty value)
            if (noneRadio) noneRadio.checked = true;

            if (recordingContainer) recordingContainer.classList.add('opacity-50', 'pointer-events-none');
            if (recordingInfo) recordingInfo.classList.remove('hidden');
            if (recordingHint) recordingHint.style.display = 'none';
        } else {
            // If CD, enable interactions
            if (recordingContainer) recordingContainer.classList.remove('opacity-50', 'pointer-events-none');
            if (recordingInfo) recordingInfo.classList.add('hidden');
            if (recordingHint) {
                recordingHint.style.display = 'inline';
                recordingHint.textContent = '(obrigatório para CD)';
            }

            // Ensure one is checked if none is (default to DDD)
            const checked = document.querySelector('input[name="tipo_gravacao"]:checked');
            if (!checked || checked.value === '') {
                const ddd = document.querySelector('input[name="tipo_gravacao"][value="DDD"]');
                if (ddd) ddd.checked = true;
            }
        }
    }

    // Setup composer selection with Barroco check
    const composerSelect = document.getElementById('track-composer-select');
    if (composerSelect) {
        composerSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                addComposerChip(e.target.value, e.target.selectedOptions[0].textContent);
                e.target.value = '';
            }
        });
    }

    // Setup interpreter selection
    const interpreterSelect = document.getElementById('track-interpreter-select');
    if (interpreterSelect) {
        interpreterSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                addInterpreterChip(e.target.value, e.target.selectedOptions[0].textContent);
                e.target.value = '';
            }
        });
    }

    // If editing, populate with existing data
    if (currentEditData) {
        const titleEl = document.querySelector('#track-form')?.closest('div')?.querySelector('div > span + span'); // Adjust selector as needed
        const submitBtn = document.getElementById('track-submit-btn');

        // Note: Title might be harder to target specifically in track modal, so we'll rely on form population
        // If we want to change title:
        const headerTitle = document.querySelector('#track-form')?.parentElement?.previousElementSibling?.querySelector('h3');
        if (headerTitle) headerTitle.textContent = 'Editar Faixa';

        if (submitBtn) {
            submitBtn.textContent = 'Atualizar Faixa';
        }

        const form = document.getElementById('track-form');
        if (form) {
            if (currentEditData.descricao) form.querySelector('[name="descricao"]').value = currentEditData.descricao;
            if (currentEditData.numero_faixa) form.querySelector('[name="numero_faixa"]').value = currentEditData.numero_faixa;
            if (currentEditData.numero_unidade) form.querySelector('[name="numero_unidade"]').value = currentEditData.numero_unidade;

            // Radio buttons for type
            if (currentEditData.tipo_gravacao) {
                const radio = form.querySelector(`input[name="tipo_gravacao"][value="${currentEditData.tipo_gravacao}"]`);
                if (radio) radio.checked = true;
            }

            // Sync selects with timeouts to allow loading
            setTimeout(() => {
                if (currentEditData.cod_tipo_composicao) {
                    const typeSelect = form.querySelector('[name="cod_tipo_composicao"]');
                    if (typeSelect) typeSelect.value = currentEditData.cod_tipo_composicao;
                }
            }, 200);

            // Populate chips (M:N)
            // Expecting currentEditData.compositores = [{id: 1, nome: "Bach"}, ...]
            if (currentEditData.compositores) {
                // Short wait to ensure DOM container is ready (though it should be)
                setTimeout(() => {
                    currentEditData.compositores.forEach(c => {
                        addComposerChip(c.id || c.cod_compositor, c.nome);
                    });
                }, 100);
            }

            // Expecting currentEditData.interpretes = [{id: 1, nome: "Orquestra X"}, ...]
            if (currentEditData.interpretes) {
                setTimeout(() => {
                    currentEditData.interpretes.forEach(i => {
                        addInterpreterChip(i.id || i.cod_interprete, i.nome);
                    });
                }, 100);
            }

            form.dataset.editId = currentEditData.id;
        }
    }

    // Form submit
    const form = document.getElementById('track-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate Barroco DDD rule
            if (!validateBarrocoDDD()) {
                alert('Erro: Faixas com compositores do período Barroco devem ter tipo de gravação DDD.');
                return;
            }

            const formData = new FormData(form);
            console.log('Salvar/Atualizar faixa:', Object.fromEntries(formData));

            if (selectedComposers.length === 0) {
                // Optional warning?
            }

            alert(currentEditData ? 'Faixa atualizada com sucesso!' : 'Faixa cadastrada com sucesso!');
            closeModal();
        });
    }
}

// Track modal helper functions
let selectedComposers = [];
let selectedInterpreters = [];

function loadComposersForTrack() {
    const select = document.getElementById('track-composer-select');
    if (!select) return;

    // TODO: Fetch from API - GET /api/compositores
    const composers = SpotPerState?.cache?.composers || [];

    select.innerHTML = '<option value="">Selecionar compositor...</option>' +
        composers.map(c => `<option value="${c.cod_compositor}" data-period="${c.cod_periodo}">${c.nome}</option>`).join('');
}

function loadInterpretersForTrack() {
    const select = document.getElementById('track-interpreter-select');
    if (!select) return;

    // TODO: Fetch from API - GET /api/interpretes
    const interpreters = SpotPerState?.cache?.interpreters || [];

    select.innerHTML = '<option value="">Selecionar intérprete...</option>' +
        interpreters.map(i => `<option value="${i.cod_interprete}">${i.nome}</option>`).join('');
}

function addComposerChip(id, name) {
    if (selectedComposers.includes(id)) return;
    selectedComposers.push(id);

    const container = document.getElementById('track-composers-chips');
    if (!container) return;

    const chip = document.createElement('div');
    chip.className = 'flex items-center gap-1 bg-[#f5f3f0] dark:bg-[#1a1814] pl-3 pr-2 py-1 rounded-md border border-transparent dark:border-[#d4af37]/30 transition-colors';
    chip.dataset.composerId = id;
    chip.innerHTML = `
        <span class="text-[#181611] dark:text-parchment-white text-sm font-medium">${name}</span>
        <button onclick="removeComposerChip(${id})" class="text-[#8a8060] hover:text-red-500 flex items-center" type="button">
            <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
    `;
    container.appendChild(chip);

    // Check if Barroco and show warning
    checkBarrocoComposer(id);
}

function removeComposerChip(id) {
    selectedComposers = selectedComposers.filter(c => c != id);
    const chip = document.querySelector(`[data-composer-id="${id}"]`);
    if (chip) chip.remove();
    updateBarrocoWarning();
}

function addInterpreterChip(id, name) {
    if (selectedInterpreters.includes(id)) return;
    selectedInterpreters.push(id);

    const container = document.getElementById('track-interpreters-chips');
    if (!container) return;

    const chip = document.createElement('div');
    chip.className = 'flex items-center gap-1 bg-[#f5f3f0] dark:bg-[#1a1814] pl-3 pr-2 py-1 rounded-md border border-transparent dark:border-[#d4af37]/30 transition-colors';
    chip.dataset.interpreterId = id;
    chip.innerHTML = `
        <span class="text-[#181611] dark:text-parchment-white text-sm font-medium">${name}</span>
        <button onclick="removeInterpreterChip(${id})" class="text-[#8a8060] hover:text-red-500 flex items-center" type="button">
            <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
    `;
    container.appendChild(chip);
}

function removeInterpreterChip(id) {
    selectedInterpreters = selectedInterpreters.filter(i => i != id);
    const chip = document.querySelector(`[data-interpreter-id="${id}"]`);
    if (chip) chip.remove();
}

function checkBarrocoComposer(composerId) {
    // Check if composer is from Barroco period (cod_periodo = 1 assumed)
    const select = document.getElementById('track-composer-select');
    const option = select?.querySelector(`option[value="${composerId}"]`);
    const periodId = option?.dataset?.period;

    if (periodId === '1') { // Barroco
        const warning = document.getElementById('track-composer-barroco-warn');
        if (warning) warning.classList.remove('hidden');

        // Force DDD selection
        const dddRadio = document.querySelector('input[name="tipo_gravacao"][value="DDD"]');
        if (dddRadio) dddRadio.checked = true;

        const alert = document.getElementById('track-alert-barroco-ddd');
        const alertContainer = document.getElementById('track-validation-alerts');
        if (alert && alertContainer) {
            alert.classList.remove('hidden');
            alertContainer.classList.remove('hidden');
        }
    }
}

function updateBarrocoWarning() {
    // Check if any remaining composer is Barroco
    const hasBarroco = selectedComposers.some(id => {
        const option = document.querySelector(`#track-composer-select option[value="${id}"]`);
        return option?.dataset?.period === '1';
    });

    const warning = document.getElementById('track-composer-barroco-warn');
    const alert = document.getElementById('track-alert-barroco-ddd');

    if (!hasBarroco) {
        if (warning) warning.classList.add('hidden');
        if (alert) alert.classList.add('hidden');
    }
}

function validateBarrocoDDD() {
    const hasBarroco = selectedComposers.some(id => {
        const option = document.querySelector(`#track-composer-select option[value="${id}"]`);
        return option?.dataset?.period === '1';
    });

    if (hasBarroco) {
        const selectedGravacao = document.querySelector('input[name="tipo_gravacao"]:checked')?.value;
        return selectedGravacao === 'DDD';
    }
    return true;
}

function checkTrackLimit(albumId) {
    // TODO: Get actual track count from album
    const album = SpotPerState?.cache?.albums?.find(a => a.cod_album === albumId);
    const trackCount = album?.qtd_faixas || 0;

    if (trackCount >= 64) {
        const alert = document.getElementById('track-alert-limit');
        const alertContainer = document.getElementById('track-validation-alerts');
        const submitBtn = document.getElementById('track-submit-btn');

        if (alert && alertContainer) {
            alert.classList.remove('hidden');
            alertContainer.classList.remove('hidden');
        }
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

// Make track functions globally available
window.addComposerChip = addComposerChip;
window.removeComposerChip = removeComposerChip;
window.addInterpreterChip = addInterpreterChip;
window.removeInterpreterChip = removeInterpreterChip;

/**
 * Carrega gravadoras para select
 */
async function loadGravadorasForSelect() {
    try {
        // TODO: Substituir por chamada real da API
        // const labels = await api.listLabels();

        const select = document.querySelector('#label-select, select[name="cod_gravadora"]');
        if (!select) return;

        // TODO: Fetch from API - GET /api/gravadoras
        const labels = SpotPerState?.cache?.labels || [];

        select.innerHTML = labels.map(label =>
            `<option value="${label.cod_gravadora}">${label.nome}</option>`
        ).join('');
    } catch (error) {
        console.error('Erro ao carregar gravadoras:', error);
    }
}

/**
 * Carrega períodos musicais para select
 */
async function loadPeriodsForSelect() {
    try {
        // TODO: Substituir por chamada real da API
        // const periods = await api.listPeriods();

        const select = document.querySelector('#period-select, select[name="cod_periodo"]');
        if (!select) return;

        // TODO: Fetch from API - GET /api/periodos
        const periods = SpotPerState?.cache?.periods || [];

        select.innerHTML = periods.map(period =>
            `<option value="${period.cod_periodo}">${period.descricao}</option>`
        ).join('');
    } catch (error) {
        console.error('Erro ao carregar períodos:', error);
    }
}

/**
 * Carrega tipos de composição
 */
async function loadCompositionTypes() {
    try {
        // TODO: Substituir por chamada real da API
        // const types = await api.listCompositionTypes();

        const select = document.querySelector('#composition-type-select, select[name="cod_tipo_composicao"]');
        if (!select) return;

        // TODO: Fetch from API - GET /api/tipos-composicao
        const types = SpotPerState?.cache?.compositionTypes || [];

        select.innerHTML = types.map(type =>
            `<option value="${type.cod_tipo_composicao}">${type.descricao}</option>`
        ).join('');
    } catch (error) {
        console.error('Erro ao carregar tipos de composição:', error);
    }
}

/**
 * Carrega álbuns para seleção em playlist
 */
async function loadAlbumsForPlaylist() {
    const grid = document.getElementById('playlist-albums-grid');
    const countEl = document.getElementById('playlist-albums-count');
    if (!grid) return;

    // Get albums from state (SpotPerState.data.albums from app.js)
    const albums = (typeof SpotPerState !== 'undefined' && SpotPerState.data.albums) || [];

    if (countEl) {
        countEl.textContent = `${albums.length} ALBUMS`;
    }

    if (albums.length === 0) {
        grid.innerHTML = `
            <div class="col-span-2 flex flex-col items-center justify-center py-12 text-ink-muted dark:text-[#6d6655]">
                <span class="material-symbols-outlined !text-[48px] mb-3 opacity-50">library_music</span>
                <span class="font-mono text-xs uppercase tracking-widest">No albums in catalog</span>
                <button onclick="closeModal(); openModal('album');" class="mt-4 text-primary text-xs font-mono hover:underline">Add first album</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = albums.map(album => `
        <button onclick="selectAlbumForPlaylist(${album.cod_album})" 
                class="group relative aspect-square rounded overflow-hidden border border-border-light dark:border-[#393528] hover:border-primary/50 dark:hover:border-primary/50 transition-colors text-left bg-white dark:bg-transparent shadow-sm">
            <img src="${album.capa_url || 'https://via.placeholder.com/200?text=No+Cover'}" 
                 alt="${album.nome}" 
                 class="absolute inset-0 w-full h-full object-cover opacity-80 dark:opacity-60 group-hover:opacity-100 transition-opacity mix-blend-multiply dark:mix-blend-normal">
            <div class="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-black/90 via-transparent to-transparent"></div>
            <div class="absolute bottom-3 left-3 right-3">
                <p class="text-ink-main dark:text-white text-sm font-bold truncate">${album.nome}</p>
                <p class="text-ink-muted dark:text-[#8e8672] text-[10px] font-mono">${album.compositor || 'Unknown'}</p>
            </div>
        </button>
    `).join('');
}

/**
 * Seleciona um álbum e mostra suas faixas (carrega do backend)
 */
async function selectAlbumForPlaylist(albumId) {
    const grid = document.getElementById('playlist-albums-grid');
    if (!grid) return;

    const albums = SpotPerState?.cache?.albums || [];
    const album = albums.find(a => a.cod_album === albumId);
    if (!album) return;

    // Fetch tracks from API
    let tracks = [];
    try {
        tracks = await api.getAlbumTracks(albumId);
    } catch (error) {
        console.error('Erro ao carregar faixas:', error);
    }

    // Create expanded album card with tracks
    const albumCards = grid.querySelectorAll('button');
    albumCards.forEach(card => card.classList.remove('hidden'));

    // Insert expanded view after the selected album
    const existingExpanded = grid.querySelector('.album-expanded');
    if (existingExpanded) existingExpanded.remove();

    const expandedHtml = `
        <div class="album-expanded col-span-2 rounded-lg border border-border-light dark:border-[#393528] bg-white dark:bg-[#181611] overflow-hidden shadow-lg ring-1 ring-primary/20 flex flex-col relative z-10">
            <div class="flex gap-4 p-4 bg-background-light dark:bg-[#23201a] border-b border-border-light dark:border-[#393528] relative">
                <img src="${album.capa_url || 'https://via.placeholder.com/100?text=Cover'}" 
                     alt="${album.nome}" 
                     class="size-24 object-cover rounded shadow-md ring-1 ring-black/5 dark:ring-white/10">
                <div class="flex flex-col justify-center flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <h3 class="text-ink-main dark:text-white text-lg font-bold truncate">${album.nome}</h3>
                        <span class="text-[9px] font-mono text-primary-dim dark:text-primary border border-primary/20 bg-primary/5 dark:bg-primary/10 px-1.5 py-0.5 rounded">EXPANDED</span>
                    </div>
                    <p class="text-ink-muted dark:text-[#8e8672] text-xs font-mono mb-2">${album.compositor || 'Unknown'} • ${album.ano || ''}</p>
                    <div class="text-[10px] text-ink-muted/80 dark:text-[#6d6655] font-mono uppercase tracking-widest">${tracks.length} Tracks available</div>
                </div>
                <button onclick="collapseAlbumForPlaylist()" class="absolute top-2 right-2 text-ink-muted dark:text-[#6d6655] hover:text-primary">
                    <span class="material-symbols-outlined !text-[18px]">close</span>
                </button>
            </div>
            <div class=\"flex flex-col divide-y divide-border-light dark:divide-[#2a2620] bg-white dark:bg-[#15130f] max-h-[240px] overflow-y-auto\">
                ${tracks.map((track, idx) => {
        const isInDraft = playlistDraftTracks.some(t =>
            t.cod_album === album.cod_album &&
            t.numero_unidade === track.numero_unidade &&
            t.numero_faixa === track.numero_faixa
        );
        const tempoMin = Math.floor((track.tempo_execucao || 0) / 60);
        const tempoSec = (track.tempo_execucao || 0) % 60;
        const tempoStr = `${tempoMin}:${String(tempoSec).padStart(2, '0')}`;
        return `
                        <div class=\"flex items-center justify-between py-2.5 px-4 hover:bg-background-light dark:hover:bg-[#1f1d18] transition-colors group\">
                            <div class=\"flex flex-col\">
                                <span class=\"text-ink-main dark:text-off-white text-xs font-medium\">${idx + 1}. ${track.descricao}</span>
                                <span class=\"text-ink-muted dark:text-[#6d6655] text-[10px] font-mono\">${tempoStr}</span>
                            </div>
                            ${isInDraft ? `
                                <button onclick=\"removeTrackFromDraft(${album.cod_album}, ${track.numero_unidade}, ${track.numero_faixa})\" 
                                        class=\"size-7 rounded-full border border-border-light dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-500 transition-all text-ink-muted dark:text-[#4a4436]\" title=\"Remover\">
                                    <span class=\"material-symbols-outlined !text-[16px]\">close</span>
                                </button>
                            ` : `
                                <button onclick=\"addTrackToDraft(${JSON.stringify({ ...track, cod_album: album.cod_album }).replace(/"/g, '&quot;')}, ${JSON.stringify({ cod_album: album.cod_album, nome: album.nome, gravadora: album.gravadora }).replace(/"/g, '&quot;')})\" 
                                        class=\"size-7 rounded-full border border-primary/30 bg-primary/5 dark:bg-primary/10 flex items-center justify-center hover:bg-primary hover:text-white dark:hover:text-black hover:shadow-amber-glow transition-all text-primary-dim dark:text-primary\" title=\"Adicionar\">
                                    <span class=\"material-symbols-outlined !text-[16px]\">add</span>
                                </button>
                            `}
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;

    grid.insertAdjacentHTML('beforeend', expandedHtml);
}

/**
 * Collapse album expanded view
 */
function collapseAlbumForPlaylist() {
    const grid = document.getElementById('playlist-albums-grid');
    if (!grid) return;
    const expanded = grid.querySelector('.album-expanded');
    if (expanded) expanded.remove();
}

/**
 * Add track to playlist draft
 */
function addTrackToDraft(track, album) {
    // Check if already in draft using composite key
    const exists = playlistDraftTracks.some(t =>
        t.cod_album === track.cod_album &&
        t.numero_unidade === track.numero_unidade &&
        t.numero_faixa === track.numero_faixa
    );
    if (exists) return;

    playlistDraftTracks.push({
        ...track,
        album_nome: album.nome,
        gravadora: album.gravadora,
        cod_album: track.cod_album || album.cod_album
    });

    renderPlaylistDraftTracks();
    updatePlaylistStats();

    // Refresh the album expanded view to update button states
    const expandedAlbum = document.querySelector('.album-expanded');
    if (expandedAlbum) {
        selectAlbumForPlaylist(album.cod_album);
    }
}

/**
 * Remove track from playlist draft (usando chave composta)
 */
function removeTrackFromDraft(codAlbum, numeroUnidade, numeroFaixa) {
    const trackIndex = playlistDraftTracks.findIndex(t =>
        t.cod_album === codAlbum &&
        t.numero_unidade === numeroUnidade &&
        t.numero_faixa === numeroFaixa
    );
    if (trackIndex > -1) {
        const removedTrack = playlistDraftTracks[trackIndex];
        playlistDraftTracks.splice(trackIndex, 1);
        renderPlaylistDraftTracks();
        updatePlaylistStats();

        // Refresh the album expanded view if open
        const expandedAlbum = document.querySelector('.album-expanded');
        if (expandedAlbum && removedTrack.cod_album) {
            selectAlbumForPlaylist(removedTrack.cod_album);
        }
    }
}

/**
 * Render the selected tracks in the draft panel
 */
function renderPlaylistDraftTracks() {
    const container = document.getElementById('playlist-selected-tracks');
    if (!container) return;

    if (playlistDraftTracks.length === 0) {
        container.innerHTML = `
            <div class="flex items-center justify-center py-8 opacity-40">
                <span class="text-ink-muted dark:text-[#6d6655] font-mono text-xs uppercase tracking-widest border border-dashed border-ink-muted/50 dark:border-[#6d6655] px-4 py-2 rounded">Selecione faixas da biblioteca</span>
            </div>
        `;
        return;
    }

    container.innerHTML = playlistDraftTracks.map((track, idx) => {
        const tempoMin = Math.floor((track.tempo_execucao || 0) / 60);
        const tempoSec = (track.tempo_execucao || 0) % 60;
        const tempoStr = `${tempoMin}:${String(tempoSec).padStart(2, '0')}`;
        return `
        <div class="flex items-center py-3 px-6 hover:bg-background-light dark:hover:bg-[#23201a] group transition-colors cursor-default">
            <div class="w-10 text-center font-mono text-ink-muted dark:text-[#6d6655] text-xs">${String(idx + 1).padStart(2, '0')}</div>
            <div class="flex-1 pl-4 flex flex-col">
                <span class="text-ink-main dark:text-[#e4e2d5] text-sm font-medium">${track.descricao}</span>
                <span class="text-ink-muted dark:text-[#8e8672] text-xs">${track.gravadora || track.album_nome || 'Álbum'}</span>
            </div>
            <div class="w-20 text-right pr-4 font-mono text-primary-dim dark:text-primary text-xs font-bold">${tempoStr}</div>
            <div class="w-8 flex justify-center">
                <button onclick="removeTrackFromDraft(${track.cod_album}, ${track.numero_unidade}, ${track.numero_faixa})" class="text-ink-muted dark:text-[#4a4436] hover:text-red-600 dark:hover:text-red-500 transition-colors">
                    <span class="material-symbols-outlined !text-[18px]">close</span>
                </button>
            </div>
        </div>
    `;
    }).join('');
}

/**
 * Update playlist stats (time and count)
 */
function updatePlaylistStats() {
    const countEl = document.getElementById('playlist-track-count');
    const timeEl = document.getElementById('playlist-total-time');
    const progressEl = document.getElementById('playlist-time-progress');

    const count = playlistDraftTracks.length;
    if (countEl) countEl.textContent = String(count).padStart(2, '0');

    // Calculate total time
    let totalSeconds = 0;
    playlistDraftTracks.forEach(track => {
        if (track.duracao) {
            const parts = track.duracao.split(':');
            if (parts.length === 2) {
                totalSeconds += parseInt(parts[0]) * 60 + parseInt(parts[1]);
            }
        }
    });

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (timeEl) timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Update progress circle (assume max 90 mins = 100%)
    if (progressEl) {
        const maxMins = 90;
        const percentage = Math.min((mins / maxMins) * 100, 100);
        const circumference = 238; // 2 * PI * 38
        const offset = circumference - (percentage / 100) * circumference;
        progressEl.setAttribute('stroke-dashoffset', offset.toString());
    }
}

/**
 * Save playlist via API
 */
async function savePlaylist() {
    const nameInput = document.getElementById('playlist-name-input');
    const name = nameInput?.value?.trim();

    if (!name) {
        alert('Por favor, digite um nome para a playlist');
        nameInput?.focus();
        return;
    }

    const saveBtn = document.getElementById('playlist-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Salvando...';
    }

    try {
        const playlistData = {
            nome: name,
            faixas: playlistDraftTracks.map(t => ({
                cod_album: t.cod_album,
                numero_unidade: t.numero_unidade || 1,
                numero_faixa: t.numero_faixa
            }))
        };

        await api.createPlaylist(playlistData);
        SpotPerState.cache.playlists = await api.listPlaylists().catch(() => SpotPerState.cache.playlists);

        if (typeof renderAll === 'function') renderAll();
        closeModal();
    } catch (error) {
        alert('Erro ao salvar playlist: ' + error.message);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span class="material-symbols-outlined">save</span> SALVAR PLAYLIST';
        }
    }
}

/**
 * Opens a modal for editing an existing item
 */
async function openModalForEdit(modalName, id, data) {
    currentEditData = { id, ...data };
    await openModal(modalName);
}

// Make functions globally available
window.selectAlbumForPlaylist = selectAlbumForPlaylist;
window.collapseAlbumForPlaylist = collapseAlbumForPlaylist;
window.addTrackToDraft = addTrackToDraft;
window.removeTrackFromDraft = removeTrackFromDraft;
window.openModalForEdit = openModalForEdit;

// Fechar modal ao clicar fora
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('modal-overlay');
    if (overlay && e.target.id === 'modal-overlay') {
        closeModal();
    }
});

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentModal) {
        closeModal();
    }
});
