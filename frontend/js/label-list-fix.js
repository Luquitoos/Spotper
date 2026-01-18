/**
 * Inicializa o modal de lista de gravadoras
 * IMPORTANTE: Atualiza ambos os containers (light e dark mode)
 */
async function initLabelListModal() {
    console.log('[Label List] Iniciando modal de gravadoras...');
    try {
        const labelsContainer = document.getElementById('labels-container');
        const labelsContainerDark = document.getElementById('labels-container-dark');

        if (!labelsContainer && !labelsContainerDark) {
            console.error('[Label List] Nenhum container encontrado!');
            return;
        }

        // Show loading state
        const loadingHTML = '<div class="col-span-full text-center py-12 text-ink-muted">Carregando gravadoras...</div>';
        if (labelsContainer) labelsContainer.innerHTML = loadingHTML;
        if (labelsContainerDark) labelsContainerDark.innerHTML = loadingHTML;

        // Fetch fresh data from API
        console.log('[Label List] Buscando gravadoras da API...');
        const labels = await api.listLabels();
        console.log('[Label List] Gravadoras recebidas:', labels);

        // Update cache
        SpotPerState.cache.labels = labels;

        // Update counters
        const countEl = document.getElementById('labels-count');
        const countElDark = document.getElementById('labels-count-dark');
        if (countEl) countEl.textContent = labels.length;
        if (countElDark) countElDark.textContent = labels.length;

        if (labels.length === 0) {
            console.warn('[Label List] Nenhuma gravadora encontrada');
            const emptyHTML = '<div class="col-span-full text-center py-12 text-ink-muted">Nenhuma gravadora cadastrada.</div>';
            if (labelsContainer) labelsContainer.innerHTML = emptyHTML;
            if (labelsContainerDark) labelsContainerDark.innerHTML = emptyHTML;
            return;
        }

        console.log('[Label List] Renderizando', labels.length, 'gravadoras...');
        const labelsHTML = labels.map(label => `
            <div class="flex flex-col bg-white dark:bg-[#1f1f1f] rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm hover:border-primary transition-all p-6 relative group">
                <div class="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                <h3 class="text-2xl font-display font-bold text-text-main dark:text-white group-hover:text-primary transition-colors">${escapeHtml(label.nome)}</h3>
                <div class="flex flex-col gap-3 mt-6">
                    ${label.endereco ? `
                        <div class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-primary text-sm">location_on</span>
                            <p class="text-text-muted text-xs">${escapeHtml(label.endereco)}</p>
                        </div>
                    ` : ''}
                    ${label.homepage ? `
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-primary text-sm">language</span>
                            <a href="${escapeHtml(label.homepage)}" target="_blank" class="text-text-muted text-xs hover:underline">${escapeHtml(label.homepage)}</a>
                        </div>
                    ` : ''}
                </div>
                <button onclick="editLabel(${label.cod_gravadora})" 
                        class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 bg-primary text-background-dark p-2 rounded-full shadow-lg transition-all">
                    <span class="material-symbols-outlined !text-[18px]">edit</span>
                </button>
            </div>
        `).join('');

        if (labelsContainer) labelsContainer.innerHTML = labelsHTML;
        if (labelsContainerDark) labelsContainerDark.innerHTML = labelsHTML;
        console.log('[Label List] Renderização completa!');
    } catch (error) {
        console.error('[Label List] Erro ao carregar gravadoras:', error);
        const errorHTML = '<div class="col-span-full text-center py-12 text-red-500">Erro ao carregar gravadoras.</div>';
        const labelsContainer = document.getElementById('labels-container');
        const labelsContainerDark = document.getElementById('labels-container-dark');
        if (labelsContainer) labelsContainer.innerHTML = errorHTML;
        if (labelsContainerDark) labelsContainerDark.innerHTML = errorHTML;
    }
}
