// spotper/js/app.js
// Frontend-only SPA controller (no backend yet; no mock seeded data).

/* global openModal */

const SpotPerState = {
  view: 'albums',
  filters: {
    periodId: null,
    mediaType: 'ALL',
    composerId: null,
    interpreterId: null,
    search: ''
  },
  selection: {
    albumId: null,
    playlistId: null
  },
  // Context for auto-fill when creating new entities
  context: {
    periodId: null,      // Currently selected period - auto-fills compositor.cod_periodo
    composerId: null,    // Currently selected composer
    interpreterId: null  // Currently selected interpreter
  },
  // IMPORTANT: Data starts empty until backend is integrated.
  cache: {
    periods: [],
    compositionTypes: [],
    labels: [],
    composers: [],
    interpreters: [],
    albums: [],
    playlists: [],
    queryResults: {} // Results from DB views (ALBUNS_ACIMA_MEDIA, etc.)
  }
};

// Alias for easier access from modals.js
SpotPerState.data = SpotPerState.cache;

// ----------------------------
// Bootstrap
// ----------------------------

document.addEventListener('DOMContentLoaded', () => {
  initApp().catch(console.error);
});

async function initApp() {
  // Load initial data from backend API
  await loadInitialData();

  await Promise.all([
    loadSidebar(),
    loadHeader(),
    loadComposerSection(),
    loadFormatFilters()
  ]);

  bindGlobalActions();
  renderAll();
}

/**
 * Carrega dados iniciais do backend para o cache
 */
async function loadInitialData() {
  try {
    console.log('%c[SpotPer] Carregando dados do backend...', 'color: #f4c025; font-weight: bold;');

    const [periods, compositionTypes, labels, composers, interpreters, albums, playlists] = await Promise.all([
      api.listPeriods().catch(() => []),
      api.listCompositionTypes().catch(() => []),
      api.listLabels().catch(() => []),
      api.listComposers().catch(() => []),
      api.listInterpreters().catch(() => []),
      api.listAlbums().catch(() => []),
      api.listPlaylists().catch(() => [])
    ]);

    SpotPerState.cache.periods = periods;
    SpotPerState.cache.compositionTypes = compositionTypes;
    SpotPerState.cache.labels = labels;
    SpotPerState.cache.composers = composers;
    SpotPerState.cache.interpreters = interpreters;
    SpotPerState.cache.albums = albums;
    SpotPerState.cache.playlists = playlists;

    console.log('%c[SpotPer] Dados carregados:', 'color: #22c55e;', {
      periods: periods.length,
      compositionTypes: compositionTypes.length,
      labels: labels.length,
      composers: composers.length,
      interpreters: interpreters.length,
      albums: albums.length,
      playlists: playlists.length
    });
  } catch (error) {
    console.error('[SpotPer] Erro ao carregar dados:', error);
  }
}

function bindGlobalActions() {
  // Left actions
  const addTrackBtn = document.getElementById('btn-add-track');
  const importBtn = document.getElementById('btn-import-album');
  const addPlaylistBtn = document.getElementById('btn-add-playlist');

  if (addTrackBtn) addTrackBtn.addEventListener('click', () => openModal('track'));
  if (importBtn) importBtn.addEventListener('click', () => openModal('album'));
  if (addPlaylistBtn) addPlaylistBtn.addEventListener('click', () => openModal('playlist'));

  // Delegated events
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-action="switch-tab"]');
    if (tab) {
      switchMainTab(tab.getAttribute('data-view'));
      return;
    }

    const formatBtn = e.target.closest('[data-action="filter-format"]');
    if (formatBtn) {
      setFormatFilter(formatBtn.getAttribute('data-format'));
      return;
    }

    const editAlbumBtn = e.target.closest('[data-action="edit-album"]');
    if (editAlbumBtn) {
      e.stopPropagation();
      openAlbumEdit(parseInt(editAlbumBtn.getAttribute('data-album-id'), 10));
      return;
    }

    const deleteAlbumBtn = e.target.closest('[data-action="delete-album"]');
    if (deleteAlbumBtn) {
      e.stopPropagation();
      deleteAlbumUI(parseInt(deleteAlbumBtn.getAttribute('data-album-id'), 10));
      return;
    }

    const albumCard = e.target.closest('[data-action="open-album"]');
    if (albumCard) {
      openAlbumDetails(parseInt(albumCard.getAttribute('data-album-id'), 10));
      return;
    }

    const playlistCard = e.target.closest('[data-action="open-playlist"]');
    if (playlistCard) {
      openPlaylistDetails(parseInt(playlistCard.getAttribute('data-playlist-id'), 10));
      return;
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'period-filter-input') {
      filterPeriods(e.target.value);
    }

    if (e.target && e.target.matches('[data-action="search-catalog"]')) {
      SpotPerState.filters.search = e.target.value;
      renderMain();
    }
  });

  // sidebar select period (will only work when periods exist via backend)
  document.addEventListener('click', (e) => {
    const periodItem = e.target.closest('[data-action="select-period"]');
    if (!periodItem) return;

    const codPeriodo = parseInt(periodItem.getAttribute('data-period-id'), 10);
    const periodName = periodItem.getAttribute('data-period-name');
    setPeriodFilter(codPeriodo, periodName);
  });

  // composer/interpreter filters (only relevant once data exists)
  document.addEventListener('click', (e) => {
    const composerBtn = e.target.closest('[data-action="select-composer"]');
    if (composerBtn) {
      const raw = composerBtn.getAttribute('data-composer-id');
      SpotPerState.filters.composerId = raw ? parseInt(raw, 10) : null;
      syncComposerSelection();
      renderMain();
      return;
    }

    const interpreterBtn = e.target.closest('[data-action="select-interpreter"]');
    if (interpreterBtn) {
      const raw = interpreterBtn.getAttribute('data-interpreter-id');
      SpotPerState.filters.interpreterId = raw ? parseInt(raw, 10) : null;
      syncInterpreterSelection();
      renderMain();
    }
  });
}

// ----------------------------
// Component loaders
// ----------------------------

async function fetchText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.text();
}

async function loadSidebar() {
  const html = await fetchText('components/sidebar.html');
  const el = document.getElementById('main-sidebar');
  if (el) el.innerHTML = html;
}

async function loadHeader() {
  const html = await fetchText('components/header.html');
  const el = document.getElementById('main-header');
  if (el) el.innerHTML = html;
}

async function loadComposerSection() {
  const html = await fetchText('components/composer-section.html');
  const el = document.getElementById('composer-section');
  if (el) el.innerHTML = html;
}

async function loadFormatFilters() {
  const html = await fetchText('components/format-filters.html');
  const el = document.getElementById('format-filters');
  if (el) el.innerHTML = html;
}

// ----------------------------
// Rendering
// ----------------------------

function renderAll() {
  renderPeriods();
  renderComposerCarousel();
  renderInterpreterCarousel();
  syncTabsVisual();
  renderMain();
}

function renderMain() {
  syncTabsVisual();

  if (SpotPerState.view === 'albums') return renderAlbums();
  if (SpotPerState.view === 'playlists') return renderPlaylists();
  if (SpotPerState.view === 'tracks') return renderTracksCatalog();
  if (SpotPerState.view === 'queries') return renderQueries();
}

function renderAlbums() {
  const area = document.getElementById('content-area');
  if (!area) return;

  area.innerHTML = `
    <div class="flex items-center justify-between gap-4 mb-6">
      <div class="flex flex-col">
        <h2 class="text-ink-main dark:text-off-white text-xl font-display">Álbuns</h2>
        <p class="text-ink-muted dark:text-[#8e8672] text-sm">Sem backend ainda: crie álbuns pela interface.</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-[#8e8672] !text-[18px]">search</span>
          <input data-action="search-catalog" class="pl-10 pr-4 py-2 rounded bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark text-sm w-[260px] focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Buscar (quando houver dados)..." value="${escapeHtml(SpotPerState.filters.search)}" />
        </div>
      </div>
    </div>

    <div id="album-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 pb-32"></div>
  `;

  const grid = document.getElementById('album-grid');
  if (!grid) return;

  // Card de adicionar SEMPRE primeiro
  grid.appendChild(createAddAlbumCard());

  const albums = applyAlbumFilters(SpotPerState.cache.albums);

  if (!albums.length) {
    const empty = document.createElement('div');
    empty.className = 'col-span-full text-center text-ink-muted dark:text-[#8e8672] py-12';
    empty.innerHTML = 'Nenhum álbum cadastrado. Use <span class="font-mono">Add Album</span> para começar.';
    grid.appendChild(empty);
    return;
  }

  albums.forEach((album) => grid.appendChild(createAlbumCard(album)));
}

function createAddAlbumCard() {
  const addCard = document.createElement('div');
  addCard.className = 'group relative flex flex-col gap-3 cursor-pointer';
  addCard.onclick = () => openModal('album');
  addCard.innerHTML = `
    <div class="relative aspect-square w-full rounded border-2 border-dashed border-border-light dark:border-border-dark flex flex-col items-center justify-center gap-2 bg-panel-light/30 dark:bg-panel-dark/30 group-hover:border-primary/60 transition-colors">
      <span class="material-symbols-outlined text-ink-muted dark:text-[#8e8672] !text-[36px] group-hover:text-primary transition-colors">add_circle</span>
      <span class="text-ink-muted dark:text-[#8e8672] font-mono text-[10px] uppercase tracking-widest">Adicionar Álbum</span>
    </div>
  `;
  return addCard;
}

function applyAlbumFilters(albums) {
  const { mediaType, search } = SpotPerState.filters;
  let result = albums.slice();

  if (mediaType && mediaType !== 'ALL') {
    result = result.filter((a) => a.tipo_midia === mediaType);
  }

  if (search && search.trim()) {
    const t = search.trim().toLowerCase();
    result = result.filter((a) =>
      (a.nome || '').toLowerCase().includes(t) ||
      (a.descricao || '').toLowerCase().includes(t) ||
      (a.gravadora || '').toLowerCase().includes(t)
    );
  }

  return result;
}

function createAlbumCard(album) {
  const card = document.createElement('div');
  card.className = 'group relative flex flex-col gap-4';

  const mediaTag = album.tipo_midia === 'CD'
    ? 'CD'
    : (album.tipo_midia === 'VINIL' ? 'Vinil' : 'Download');

  card.innerHTML = `
    <div class="relative aspect-square w-full" data-action="open-album" data-album-id="${album.cod_album}">
      <div class="absolute inset-0 z-10 bg-black rounded-sm shadow-2xl group-hover:translate-y-[-4px] transition-transform duration-300"
           style="background-image: url('${album.img || ''}'); background-size: cover; background-position: center;">

        <div class="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button type="button" data-action="edit-album" data-album-id="${album.cod_album}"
                  class="size-8 rounded bg-black/60 text-white/80 border border-white/10 hover:text-primary hover:border-primary/40 hover:bg-black/75 transition-colors flex items-center justify-center"
                  title="Editar álbum">
            <span class="material-symbols-outlined !text-[18px]">edit</span>
          </button>
          <button type="button" data-action="delete-album" data-album-id="${album.cod_album}"
                  class="size-8 rounded bg-black/60 text-white/80 border border-white/10 hover:text-red-400 hover:border-red-400/40 hover:bg-black/75 transition-colors flex items-center justify-center"
                  title="Excluir álbum">
            <span class="material-symbols-outlined !text-[18px]">delete</span>
          </button>
        </div>

        <div class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white/80 text-[10px] font-mono uppercase tracking-widest border border-white/10">${escapeHtml(mediaTag)}</div>
      </div>
    </div>
    <div class="z-20">
      <h3 class="text-ink-main dark:text-white text-base font-medium leading-tight line-clamp-1 group-hover:text-primary transition-colors">${escapeHtml(album.nome)}</h3>
      <div class="flex items-center justify-between mt-1 gap-2">
        <p class="text-ink-muted dark:text-[#8e8672] text-xs font-normal line-clamp-1">${escapeHtml(album.gravadora || '')}</p>
        ${album.preco_compra != null ? `<span class="text-primary text-xs font-mono">R$ ${Number(album.preco_compra).toFixed(2)}</span>` : ''}
      </div>
    </div>
  `;

  return card;
}

function renderPlaylists() {
  const area = document.getElementById('content-area');
  if (!area) return;

  const playlists = SpotPerState.cache.playlists || [];

  area.innerHTML = `
    <div class="flex items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-ink-main dark:text-off-white text-xl font-display">Playlists</h2>
        <p class="text-ink-muted dark:text-[#8e8672] text-sm">${playlists.length} playlist(s) cadastrada(s)</p>
      </div>
      <button onclick="openModal('playlist')" class="flex items-center gap-2 px-3 py-2 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold hover:bg-primary/20 transition-colors shadow-amber-glow">
        <span class="material-symbols-outlined !text-[16px]">queue_music</span>
        NOVA PLAYLIST
      </button>
    </div>

    <div id="playlist-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-32"></div>
  `;

  const grid = document.getElementById('playlist-grid');
  if (!grid) return;

  if (playlists.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center text-ink-muted py-12">Nenhuma playlist. Clique em Nova Playlist para criar.</div>';
    return;
  }

  playlists.forEach(playlist => grid.appendChild(createPlaylistCard(playlist)));
}

function createPlaylistCard(playlist) {
  const card = document.createElement('div');
  card.className = 'group relative flex flex-col gap-3 cursor-pointer';
  card.innerHTML = `
    <div class="relative aspect-square rounded bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center"
         data-action="open-playlist" data-playlist-id="${playlist.cod_playlist}">
      <span class="material-symbols-outlined text-primary !text-[48px]">queue_music</span>
      <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2">
        <button data-action="delete-playlist" data-playlist-id="${playlist.cod_playlist}" class="size-8 rounded bg-black/60 text-white/80 border border-white/10 hover:text-red-400 hover:border-red-400/40 flex items-center justify-center">
          <span class="material-symbols-outlined !text-[18px]">delete</span>
        </button>
      </div>
    </div>
    <div>
      <h3 class="text-ink-main dark:text-white text-base font-medium">${escapeHtml(playlist.nome)}</h3>
      <p class="text-ink-muted dark:text-[#8e8672] text-xs">${playlist.qtd_faixas || 0} faixas • ${formatDuration(playlist.tempo_total_execucao)}</p>
    </div>
  `;
  return card;
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function renderTracksCatalog() {
  const area = document.getElementById('content-area');
  if (!area) return;

  area.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-ink-main dark:text-white font-display text-xl">Faixas</h2>
        <p class="text-ink-muted dark:text-[#8e8672] text-sm">Sem backend ainda: use o modal para cadastrar (UI).</p>
      </div>
      <button onclick="openModal('track')" class="flex items-center gap-2 px-3 py-2 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold hover:bg-primary/20 transition-colors shadow-amber-glow">
        <span class="material-symbols-outlined !text-[16px]">music_note</span>
        ADICIONAR FAIXA
      </button>
    </div>

    <div class="text-ink-muted dark:text-[#8e8672] text-sm">(Placeholder) A listagem de faixas virá do backend (FAIXA + relacionamentos).</div>
  `;
}

function renderQueries() {
  const area = document.getElementById('content-area');
  if (!area) return;

  area.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-ink-main dark:text-white font-display text-2xl font-bold">Consultas do Sistema</h2>
        <p class="text-ink-muted dark:text-[#8e8672] text-sm mt-1">Requisito iii - Views do BDSpotPer</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-32">
      ${queryCard('a', 'Álbuns Acima da Média', 'ALBUNS_ACIMA_MEDIA', 'Listar álbuns com preço de compra maior que a média', 'price_check')}
      ${queryCard('b', 'Gravadora + Dvorak', 'GRAVADORA_MAIS_PLAYLISTS_DVORAK', 'Gravadora com maior nº de playlists com faixa de Dvorak', 'apartment')}
      ${queryCard('c', 'Compositor Mais Popular', 'COMPOSITOR_MAIS_FAIXAS_PLAYLISTS', 'Compositor com maior nº de faixas nas playlists', 'person')}
      ${queryCard('d', 'Concerto Barroco', 'PLAYLISTS_CONCERTO_BARROCO', 'Playlists com todas faixas tipo Concerto e período Barroco', 'music_note')}
    </div>
  `;

  // Attach event listeners for execute buttons
  document.querySelectorAll('[data-query-execute]').forEach(btn => {
    btn.addEventListener('click', () => executeQuery(btn.dataset.queryExecute));
  });
}

function queryCard(letter, title, viewName, description, icon) {
  return `
    <div class="rounded-lg border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="size-12 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-primary text-xl">${icon}</span>
          </div>
          <div class="flex-1">
            <div class="text-ink-muted dark:text-[#8e8672] text-xs font-mono tracking-widest mb-1">CONSULTA ${letter.toUpperCase()}</div>
            <h3 class="text-ink-main dark:text-white text-lg font-display font-bold">${escapeHtml(title)}</h3>
            <p class="text-ink-muted dark:text-[#8e8672] text-sm mt-1">${escapeHtml(description)}</p>
            <div class="text-xs font-mono text-primary/70 mt-2 bg-primary/10 inline-block px-2 py-0.5 rounded">${viewName}</div>
          </div>
        </div>
      </div>
      <div class="px-6 py-4 bg-white/50 dark:bg-black/20 border-t border-border-light dark:border-border-dark flex items-center justify-between">
        <span class="text-ink-muted dark:text-[#6d6655] text-xs font-mono" id="query-status-${viewName}">Clique para executar</span>
        <button data-query-execute="${viewName}" 
                class="px-4 py-2 rounded bg-primary text-background-dark text-xs font-mono font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-sm">
          <span class="material-symbols-outlined !text-[16px]">play_arrow</span>
          EXECUTAR
        </button>
      </div>
      <div id="query-results-${viewName}" class="hidden p-4 bg-background-light dark:bg-background-dark border-t border-border-light dark:border-border-dark max-h-60 overflow-y-auto">
        <!-- Results populated by JS -->
      </div>
    </div>
  `;
}

async function executeQuery(viewName) {
  const statusEl = document.getElementById(`query-status-${viewName}`);
  const resultsEl = document.getElementById(`query-results-${viewName}`);

  if (statusEl) statusEl.textContent = 'Executando...';

  try {
    const results = await getQueryResults(viewName);

    if (resultsEl) {
      resultsEl.classList.remove('hidden');
      resultsEl.innerHTML = renderQueryResults(viewName, results);
    }

    if (statusEl) statusEl.textContent = `${results.length} resultado(s)`;
  } catch (error) {
    console.error('Erro ao executar consulta:', error);
    if (statusEl) statusEl.textContent = 'Erro ao executar';
  }
}

/**
 * Executa consultas especiais via API backend
 */
async function getQueryResults(viewName) {
  const queryMap = {
    'ALBUNS_ACIMA_MEDIA': () => api.getAlbumsAboveAverage(),
    'GRAVADORA_MAIS_PLAYLISTS_DVORAK': () => api.getLabelWithMostDvorakPlaylists(),
    'COMPOSITOR_MAIS_FAIXAS_PLAYLISTS': () => api.getComposerWithMostPlaylistTracks(),
    'PLAYLISTS_CONCERTO_BARROCO': () => api.getPlaylistsConcertoBarroco()
  };

  if (queryMap[viewName]) {
    return await queryMap[viewName]();
  }
  return [];
}

function renderQueryResults(viewName, results) {
  if (results.length === 0) {
    return '<p class="text-ink-muted text-sm text-center py-4">Nenhum resultado encontrado.</p>';
  }

  let html = '<table class="w-full text-sm"><thead class="border-b border-border-light dark:border-border-dark"><tr>';

  // Dynamic headers based on view
  const headers = Object.keys(results[0]);
  headers.forEach(h => {
    html += `<th class="text-left py-2 px-2 text-ink-muted dark:text-[#8e8672] font-mono text-xs uppercase">${h.replace('_', ' ')}</th>`;
  });
  html += '</tr></thead><tbody>';

  results.forEach(row => {
    html += '<tr class="border-b border-border-light/50 dark:border-border-dark/50 hover:bg-primary/5">';
    headers.forEach(h => {
      const val = row[h];
      const formatted = typeof val === 'number' && h.includes('preco') ? `R$ ${val.toFixed(2)}` : val;
      html += `<td class="py-2 px-2 text-ink-main dark:text-white">${formatted}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

// ----------------------------
// Details + Edit/Delete (UI only)
// ----------------------------

function openAlbumDetails(codAlbum) {
  const album = SpotPerState.cache.albums.find((a) => a.cod_album === codAlbum);

  // Store album ID for reference
  SpotPerState.selection.albumId = codAlbum;

  // Open the dedicated album-details modal
  openModal('album-details');

  // Populate modal with album data after it loads
  queueMicrotask(async () => {
    const titleEl = document.getElementById('album-details-title');
    const descEl = document.getElementById('album-details-description');
    const recordedEl = document.getElementById('album-details-recorded');
    const durationEl = document.getElementById('album-details-duration');
    const trackCountEl = document.getElementById('album-details-track-count');
    const coverEl = document.getElementById('album-details-cover');
    const editBtn = document.getElementById('album-details-edit');

    if (album) {
      if (titleEl) titleEl.textContent = album.nome || 'Sem título';
      if (descEl) descEl.textContent = album.descricao || 'Sem descrição disponível';
      if (recordedEl) recordedEl.textContent = album.data_gravacao || '—';
      if (durationEl) durationEl.textContent = album.tempo_total || '—';
      if (trackCountEl) trackCountEl.textContent = album.qtd_faixas || '0';
      if (coverEl && album.img) {
        coverEl.style.backgroundImage = `url('${album.img}')`;
        coverEl.innerHTML = ''; // Remove placeholder icon
      }
      if (editBtn) {
        editBtn.onclick = () => openAlbumEdit(codAlbum);
      }

      // New fields: media type, purchase date, price
      const mediaTypeEl = document.getElementById('album-details-media-type');
      const purchaseDateEl = document.getElementById('album-details-purchase-date');
      const priceEl = document.getElementById('album-details-price');

      if (mediaTypeEl) mediaTypeEl.textContent = album.tipo_midia || 'CD';
      if (purchaseDateEl) purchaseDateEl.textContent = album.data_compra || '—';
      if (priceEl) priceEl.textContent = album.preco_compra ? Number(album.preco_compra).toFixed(2).replace('.', ',') : '—';
    }

    // Load tracks from backend API
    try {
      const tracks = await api.getAlbumTracks(codAlbum);
      renderAlbumDetailTracks(tracks, codAlbum);
    } catch (error) {
      console.error('Erro ao carregar faixas do álbum:', error);
    }
  });
}

/**
 * Renders tracks in the album details modal
 */
function renderAlbumDetailTracks(tracks, codAlbum) {
  const tbody = document.getElementById('album-details-tracks');
  const emptyDiv = document.getElementById('album-details-empty');
  const trackCountEl = document.getElementById('album-details-track-count');

  if (trackCountEl) trackCountEl.textContent = tracks.length;

  if (!tbody) return;

  if (tracks.length === 0) {
    tbody.innerHTML = '';
    if (emptyDiv) emptyDiv.classList.remove('hidden');
    return;
  }

  if (emptyDiv) emptyDiv.classList.add('hidden');

  // Calculate total duration
  const totalSeconds = tracks.reduce((sum, t) => sum + (t.tempo_execucao || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const durationEl = document.getElementById('album-details-duration');
  if (durationEl) durationEl.textContent = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;

  tbody.innerHTML = tracks.map((track, idx) => {
    const tempoMin = Math.floor((track.tempo_execucao || 0) / 60);
    const tempoSec = (track.tempo_execucao || 0) % 60;
    const tempoStr = `${tempoMin}:${String(tempoSec).padStart(2, '0')}`;
    const compositores = track.compositores?.map(c => c.nome).join(', ') || track.tipo_composicao || '';

    return `
      <tr class="group hover:bg-oak/20 dark:hover:bg-[#2e261f] transition-colors duration-150">
        <td class="py-3 pl-2 text-center text-[#8a8060] dark:text-[#deb853]/60 font-mono text-sm group-hover:text-primary">
          ${idx + 1}
        </td>
        <td class="py-3">
          <div class="flex flex-col">
            <span class="text-[#181611] dark:text-[#f0ebe0] font-bold text-lg leading-tight group-hover:text-primary transition-colors">
              ${escapeHtml(track.descricao)}
            </span>
            <span class="text-[#8a8060] dark:text-[#deb853]/70 text-sm italic mt-0.5">${escapeHtml(compositores)}</span>
          </div>
        </td>
        <td class="py-3 text-[#5c5540] dark:text-[#ffbf00]/80 text-sm font-mono">${tempoStr}</td>
        <td class="py-3 text-right text-[#5c5540] dark:text-[#ffbf00]/80 font-mono text-sm">
          ${track.tipo_gravacao || '-'}
        </td>
        <td class="py-3 pr-2 text-center">
          <button class="opacity-0 group-hover:opacity-100 transition-all size-8 inline-flex items-center justify-center rounded-full bg-gold-gradient text-white shadow-sm hover:scale-105 active:scale-95">
            <span class="material-symbols-outlined fill text-[18px]">play_arrow</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openAlbumEdit(codAlbum) {
  const album = SpotPerState.cache.albums.find((a) => a.cod_album === codAlbum);
  if (!album) return;

  openModal('album');

  queueMicrotask(() => {
    const modalRoot = document.getElementById('modal-content');
    if (!modalRoot) return;
    const container = modalRoot.firstElementChild;
    if (!container) return;

    const headerTitle = container.querySelector('h2');
    const headerSub = container.querySelector('p');
    if (headerTitle) headerTitle.textContent = 'Edit Album';
    if (headerSub) headerSub.textContent = 'Catalogue Editing';

    const saveBtn = container.querySelector('button[form="album-form"][type="submit"]');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      const label = saveBtn.querySelector('span.relative');
      if (label) label.textContent = 'Save Changes';
    }

    // Fill minimal fields
    setInputValue(container, '#album-nome', album.nome);
    setInputValue(container, '#album-descricao', album.descricao);
  });
}

async function deleteAlbumUI(codAlbum) {
  const album = SpotPerState.cache.albums.find(a => a.cod_album === codAlbum);
  const trackCount = album?.qtd_faixas || 0;

  showDeleteConfirmation({
    title: 'Excluir Álbum?',
    message: `Tem certeza que deseja excluir "<strong>${album?.nome || 'este álbum'}</strong>"?`,
    warning: trackCount > 0
      ? `⚠️ Este álbum possui ${trackCount} faixa(s) que também serão excluídas.`
      : null,
    onConfirm: async () => {
      try {
        await api.deleteAlbum(codAlbum);
        SpotPerState.cache.albums = SpotPerState.cache.albums.filter(a => a.cod_album !== codAlbum);
        renderAlbums();
        closeConfirmationModal();
      } catch (error) {
        alert('Erro ao excluir álbum: ' + error.message);
        closeConfirmationModal();
      }
    }
  });
}

/**
 * Exibe modal de confirmação para exclusão
 */
function showDeleteConfirmation({ title, message, warning, onConfirm }) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  if (!overlay || !content) return;

  overlay.classList.remove('hidden');
  overlay.classList.add('flex');

  content.innerHTML = `
    <div class="relative w-full max-w-md bg-panel-light dark:bg-[#1c1914] rounded-xl shadow-2xl border border-border-light dark:border-[#393528] overflow-hidden animate-in fade-in zoom-in duration-300">
      <div class="p-8 text-center">
        <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <span class="material-symbols-outlined text-red-500 !text-[32px]">delete_forever</span>
        </div>
        <h2 class="text-ink-main dark:text-white text-xl font-display font-bold mb-3">${title}</h2>
        <p class="text-ink-muted dark:text-[#8e8672] text-sm mb-2">${message}</p>
        ${warning ? `
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-3 mt-4 text-left">
            <p class="text-amber-800 dark:text-amber-300 text-sm">${warning}</p>
          </div>
        ` : ''}
      </div>
      <div class="px-8 py-4 bg-white/50 dark:bg-black/20 border-t border-border-light dark:border-border-dark flex items-center justify-end gap-3">
        <button onclick="closeConfirmationModal()" 
                class="px-4 py-2 text-ink-muted dark:text-[#8e8672] text-sm font-mono hover:text-ink-main dark:hover:text-white transition-colors">
          Cancelar
        </button>
        <button id="confirm-delete-btn"
                class="px-6 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-mono font-bold shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2">
          <span class="material-symbols-outlined !text-[16px]">delete</span>
          Excluir
        </button>
      </div>
    </div>
  `;

  // Attach confirm handler
  document.getElementById('confirm-delete-btn').onclick = onConfirm;
}

function closeConfirmationModal() {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  if (overlay) {
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  }
  if (content) content.innerHTML = '';
}

function setInputValue(root, selector, value) {
  const el = root.querySelector(selector);
  if (!el) return;
  el.value = value ?? '';
}

function openPlaylistDetails(codPlaylist) {
  SpotPerState.selection.playlistId = codPlaylist;
  window.currentPlaylistId = codPlaylist;

  openModal('playlist-details');

  // Populate modal with playlist data after it loads
  queueMicrotask(async () => {
    try {
      const [playlist, tracks] = await Promise.all([
        api.getPlaylist(codPlaylist),
        api.getPlaylistTracks(codPlaylist)
      ]);

      // Populate header fields
      const titleEl = document.getElementById('playlist-details-title');
      const createdEl = document.getElementById('playlist-details-created');
      const durationEl = document.getElementById('playlist-details-duration');
      const trackCountEl = document.getElementById('playlist-details-track-count');

      if (titleEl) titleEl.textContent = playlist.nome || 'Sem título';
      if (createdEl) createdEl.textContent = playlist.data_criacao || '-';
      if (trackCountEl) trackCountEl.textContent = tracks.length;

      const totalSeconds = playlist.tempo_total_execucao || 0;
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      if (durationEl) durationEl.textContent = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;

      // Render tracks
      renderPlaylistDetailTracks(tracks, codPlaylist);
    } catch (error) {
      console.error('Erro ao carregar playlist:', error);
    }
  });
}

/**
 * Renders tracks in the playlist details modal
 */
function renderPlaylistDetailTracks(tracks, codPlaylist) {
  const tbody = document.getElementById('playlist-details-tracks');
  const emptyDiv = document.getElementById('playlist-details-empty');

  if (!tbody) return;

  if (tracks.length === 0) {
    tbody.innerHTML = '';
    if (emptyDiv) emptyDiv.classList.remove('hidden');
    return;
  }

  if (emptyDiv) emptyDiv.classList.add('hidden');

  tbody.innerHTML = tracks.map((track, idx) => {
    const tempoMin = Math.floor((track.tempo_execucao || 0) / 60);
    const tempoSec = (track.tempo_execucao || 0) % 60;
    const tempoStr = `${tempoMin}:${String(tempoSec).padStart(2, '0')}`;

    return `
      <tr class="group hover:bg-oak/20 dark:hover:bg-white/5 transition-colors">
        <td class="py-3 pl-2 text-center text-[#8a8060] font-mono text-sm group-hover:text-primary">${idx + 1}</td>
        <td class="py-3">
          <div class="flex flex-col">
            <span class="text-[#181611] dark:text-[#f0ebe0] font-bold text-lg leading-tight">${escapeHtml(track.nome_faixa || track.descricao)}</span>
            <span class="text-[#8a8060] text-sm italic mt-0.5">${escapeHtml(track.nome_album || '')}</span>
          </div>
        </td>
        <td class="py-3 text-[#5c5540] dark:text-[#f0ebe0]/60 text-sm">${track.data_ultima_vez_tocada || '-'}</td>
        <td class="py-3 text-right text-[#5c5540] dark:text-[#f0ebe0]/60 font-mono text-sm">${track.num_vezes_tocada || 0}</td>
        <td class="py-3 pr-2 text-center">
          <button onclick="registerPlayback(${codPlaylist}, ${track.cod_album}, ${track.numero_unidade}, ${track.numero_faixa})"
                  class="opacity-0 group-hover:opacity-100 transition-opacity size-8 inline-flex items-center justify-center rounded-full bg-gold-gradient text-white shadow-sm hover:scale-105 active:scale-95">
            <span class="material-symbols-outlined fill text-[18px]">play_arrow</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Registers playback of a track in a playlist
 */
async function registerPlayback(codPlaylist, codAlbum, numeroUnidade, numeroFaixa) {
  try {
    await api.registerPlayback(codPlaylist, codAlbum, numeroUnidade, numeroFaixa);
    // Refresh the playlist view to show updated play count
    openPlaylistDetails(codPlaylist);
  } catch (error) {
    console.error('Erro ao registrar reprodução:', error);
  }
}

// Export for global use
window.registerPlayback = registerPlayback;

// ----------------------------
// Filters + UI sync
// ----------------------------

function switchMainTab(view) {
  SpotPerState.view = view;
  renderMain();
}

function syncTabsVisual() {
  const buttons = document.querySelectorAll('[data-action="switch-tab"]');
  buttons.forEach((btn) => {
    const view = btn.getAttribute('data-view');
    const isActive = view === SpotPerState.view;

    btn.className = isActive
      ? 'px-8 py-2 rounded-full bg-primary text-[#181611] text-xs font-bold font-mono tracking-widest shadow-amber-glow hover:brightness-110 transition-all active:scale-95'
      : 'px-8 py-2 rounded-full text-ink-muted hover:text-ink-main hover:bg-gray-100 text-xs font-bold font-mono tracking-widest transition-all active:scale-95 dark:text-[#8e8672] dark:hover:text-off-white dark:hover:bg-[#23201a]';
  });
}

function setFormatFilter(format) {
  SpotPerState.filters.mediaType = format;
  syncFormatFilterVisual();
  renderMain();
}

function syncFormatFilterVisual() {
  const mapping = {
    ALL: 'filter-all',
    VINIL: 'filter-vinyl',
    CD: 'filter-cd',
    DOWNLOAD: 'filter-digital'
  };

  Object.values(mapping).forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.className = 'flex items-center gap-2 px-3 py-1.5 rounded bg-[#23201a] border border-[#393528] text-[#8e8672] text-xs font-mono font-medium hover:border-[#6d6655] hover:text-white transition-colors';
  });

  const activeId = mapping[SpotPerState.filters.mediaType] || 'filter-all';
  const activeBtn = document.getElementById(activeId);
  if (activeBtn) {
    activeBtn.className = 'flex items-center gap-2 px-3 py-1.5 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-medium hover:bg-primary/20 transition-colors shadow-amber-glow';
  }
}

function setPeriodFilter(codPeriodo, periodName) {
  SpotPerState.filters.periodId = codPeriodo;
  SpotPerState.context.periodId = codPeriodo; // Also set context for auto-fill
  const sectionTitle = document.getElementById('composer-section-title');
  if (sectionTitle) sectionTitle.textContent = `Selecionar Compositor (${periodName})`;
  renderPeriods();
  renderMain();
}

function filterPeriods(searchTerm) {
  const periodItems = document.querySelectorAll('.period-item');
  const term = (searchTerm || '').toLowerCase();

  periodItems.forEach((item) => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(term) ? 'flex' : 'none';
  });
}

function renderComposerCarousel() {
  const carousel = document.getElementById('composer-carousel');
  if (!carousel) return;

  const composers = SpotPerState.cache.composers || [];
  const isAllActive = !SpotPerState.filters.composerId;

  let html = `
    <button onclick="openModal('composer')" class="flex flex-col items-center gap-2 group min-w-[80px]">
      <div class="size-20 rounded-full border border-border-light dark:border-[#393528] bg-panel-light dark:bg-[#181611] flex items-center justify-center hover:bg-primary/5 dark:hover:bg-[#23201a] hover:border-primary/50 transition-all shadow-sm group-hover:scale-105">
        <span class="material-symbols-outlined text-ink-muted dark:text-[#8e8672] group-hover:text-primary !text-[28px]">add</span>
      </div>
      <div class="flex flex-col items-center">
        <span class="text-ink-muted dark:text-[#8e8672] group-hover:text-primary text-xs font-medium">Novo</span>
        <span class="text-ink-muted dark:text-[#8e8672] group-hover:text-primary text-xs font-medium">Compositor</span>
      </div>
    </button>
    <button data-action="select-composer" data-composer-id="" class="flex flex-col items-center gap-2 group min-w-[80px]">
      <div class="size-20 rounded-full border-2 ${isAllActive ? 'border-primary bg-primary/10 shadow-amber-glow' : 'border-[#393528]'} flex items-center justify-center transition-all group-hover:scale-105">
        <span class="material-symbols-outlined ${isAllActive ? 'text-primary' : 'text-[#8e8672]'} !text-[28px]">groups</span>
      </div>
      <span class="${isAllActive ? 'text-primary' : 'text-[#8e8672]'} text-xs font-medium">Todos</span>
    </button>
  `;

  composers.forEach(c => {
    const isActive = SpotPerState.filters.composerId === c.cod_compositor;
    const shortName = c.nome.split(' ').slice(-1)[0];
    html += `
      <button data-action="select-composer" data-composer-id="${c.cod_compositor}" class="flex flex-col items-center gap-2 group min-w-[80px]">
        <div class="size-20 rounded-full border-2 ${isActive ? 'border-primary bg-primary/10 shadow-amber-glow' : 'border-[#393528]'} flex items-center justify-center overflow-hidden transition-all group-hover:scale-105">
          <span class="material-symbols-outlined ${isActive ? 'text-primary' : 'text-[#8e8672]'} !text-[28px]">person</span>
        </div>
        <span class="${isActive ? 'text-primary' : 'text-[#8e8672]'} text-xs text-center max-w-[80px] truncate" title="${escapeHtml(c.nome)}">${escapeHtml(shortName)}</span>
      </button>
    `;
  });

  carousel.innerHTML = html;
}

function renderInterpreterCarousel() {
  const carousel = document.getElementById('interpreter-carousel');
  if (!carousel) return;

  const interpreters = SpotPerState.cache.interpreters || [];
  const isAllActive = !SpotPerState.filters.interpreterId;

  let html = `
    <button onclick="openModal('interpreter')" class="flex flex-col items-center gap-2 group min-w-[80px]">
      <div class="size-20 rounded-full border border-border-light dark:border-[#393528] bg-panel-light dark:bg-[#181611] flex items-center justify-center hover:bg-primary/5 hover:border-primary/50 transition-all shadow-sm group-hover:scale-105">
        <span class="material-symbols-outlined text-ink-muted dark:text-[#8e8672] group-hover:text-primary !text-[28px]">add</span>
      </div>
      <div class="flex flex-col items-center">
        <span class="text-ink-muted dark:text-[#8e8672] group-hover:text-primary text-xs font-medium">Novo</span>
        <span class="text-ink-muted dark:text-[#8e8672] group-hover:text-primary text-xs font-medium">Intérprete</span>
      </div>
    </button>
    <button data-action="select-interpreter" data-interpreter-id="" class="flex flex-col items-center gap-2 group min-w-[80px]">
      <div class="size-20 rounded-full border-2 ${isAllActive ? 'border-primary bg-primary/10 shadow-amber-glow' : 'border-[#393528]'} flex items-center justify-center transition-all group-hover:scale-105">
        <span class="material-symbols-outlined ${isAllActive ? 'text-primary' : 'text-[#8e8672]'} !text-[28px]">groups</span>
      </div>
      <span class="${isAllActive ? 'text-primary' : 'text-[#8e8672]'} text-xs font-medium">Todos</span>
    </button>
  `;

  interpreters.forEach(i => {
    const isActive = SpotPerState.filters.interpreterId === i.cod_interprete;
    const shortName = i.nome.split(' ').slice(-1)[0];
    html += `
      <button data-action="select-interpreter" data-interpreter-id="${i.cod_interprete}" class="flex flex-col items-center gap-2 group min-w-[80px]">
        <div class="size-20 rounded-full border-2 ${isActive ? 'border-primary bg-primary/10 shadow-amber-glow' : 'border-[#393528]'} flex items-center justify-center overflow-hidden transition-all group-hover:scale-105">
          <span class="material-symbols-outlined ${isActive ? 'text-primary' : 'text-[#8e8672]'} !text-[28px]">mic</span>
        </div>
        <span class="${isActive ? 'text-primary' : 'text-[#8e8672]'} text-xs text-center max-w-[80px] truncate" title="${escapeHtml(i.nome)}">${escapeHtml(shortName)}</span>
      </button>
    `;
  });

  carousel.innerHTML = html;
}

function syncComposerSelection() {
  // placeholder
}

function syncInterpreterSelection() {
  // placeholder
}

function renderPeriods() {
  const periodList = document.getElementById('period-list');
  if (!periodList) return;

  const periods = SpotPerState.cache.periods || [];

  if (periods.length === 0) {
    periodList.innerHTML = `<div class="text-ink-muted dark:text-[#8e8672] text-sm mb-4">Nenhum período carregado.</div>`;
  } else {
    periodList.innerHTML = periods.map(period => {
      const isActive = SpotPerState.filters.periodId === period.cod_periodo;
      return `
        <div class="group flex items-start gap-4 cursor-pointer period-item" data-action="select-period" data-period-id="${period.cod_periodo}" data-period-name="${escapeHtml(period.descricao)}">
          <div class="relative shrink-0 pt-1">
            <div class="size-4 rounded-full border ${isActive ? 'border-primary bg-primary' : 'border-[#5a5445] bg-[#181611]'} z-10 relative"></div>
          </div>
          <div class="flex flex-col gap-1 -mt-1 group-hover:translate-x-1 transition-transform">
            <h3 class="${isActive ? 'text-primary' : 'text-off-white'} group-hover:text-primary text-lg font-medium">${escapeHtml(period.descricao)}</h3>
            <p class="text-[#6d6655] text-sm">${period.ano_inicio} - ${period.ano_fim}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Add create period button
  periodList.insertAdjacentHTML('beforeend', `
    <div class="group flex items-start gap-4 cursor-pointer mt-4" onclick="openModal('period')">
      <div class="relative shrink-0 pt-1">
        <div class="size-4 rounded-full border border-dashed border-[#5a5445] flex items-center justify-center group-hover:border-primary transition-colors">
          <span class="material-symbols-outlined !text-[12px] text-[#6d6655] group-hover:text-primary">add</span>
        </div>
      </div>
      <div class="flex flex-col">
        <h3 class="text-[#6d6655] group-hover:text-primary text-lg font-medium italic">Adicionar Período</h3>
      </div>
    </div>
  `);
}

// ----------------------------
// Utils
// ----------------------------

function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
