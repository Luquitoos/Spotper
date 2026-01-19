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

SpotPerState.data = SpotPerState.cache;


document.addEventListener('DOMContentLoaded', () => {
  initApp().catch(console.error);
});

async function initApp() {
  await loadInitialData();

  await Promise.all([
    loadSidebar(),
    loadHeader(),
    loadComposerSection(),
    loadFormatFilters()
  ]);

  bindGlobalActions();
  renderAll();

  // Enable drag-to-scroll on carousels
  initCarouselDragScroll();

  // Enable drag-to-resize on catalog section
  initCatalogResize();
}


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

    // Edit playlist
    const editPlaylistBtn = e.target.closest('[data-action="edit-playlist"]');
    if (editPlaylistBtn) {
      e.stopPropagation();
      const id = parseInt(editPlaylistBtn.getAttribute('data-playlist-id'), 10);
      if (id) openPlaylistEdit(id);
      return;
    }

    const deletePlaylistBtn = e.target.closest('[data-action="delete-playlist"]');
    if (deletePlaylistBtn) {
      e.stopPropagation();
      const id = deletePlaylistBtn.getAttribute('data-playlist-id');
      if (id && confirm('Tem certeza que deseja excluir esta playlist?')) {
        api.deletePlaylist(id)
          .then(() => {
            SpotPerState.cache.playlists = SpotPerState.cache.playlists.filter(p => p.cod_playlist != id);
            renderMain();
          })
          .catch(err => alert('Erro ao excluir playlist: ' + err.message));
      }
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
  document.addEventListener('click', (e) => {
    const periodItem = e.target.closest('[data-action="select-period"]');
    if (!periodItem) return;

    const codPeriodo = parseInt(periodItem.getAttribute('data-period-id'), 10);
    const periodName = periodItem.getAttribute('data-period-name');
    setPeriodFilter(codPeriodo, periodName);
  });

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
      return;
    }
  });
}


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

  // Check if structure already exists
  let grid = document.getElementById('album-grid');

  if (!grid) {
    area.innerHTML = `
      <div class="flex items-center justify-between gap-4 mb-6">
        <div class="flex flex-col">
          <h2 class="text-ink-main dark:text-off-white text-xl font-display">Álbuns</h2>
          <p class="text-ink-muted dark:text-[#8e8672] text-sm">Gerencie seu catálogo de álbuns.</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-[#8e8672] !text-[18px]">search</span>
            <input data-action="search-catalog" id="album-catalog-search" class="pl-10 pr-4 py-2 rounded bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark text-sm w-[260px] focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Buscar (quando houver dados)..." value="${escapeHtml(SpotPerState.filters.search || '')}" />
          </div>
        </div>
      </div>

      <div id="album-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 pb-32"></div>
    `;
    grid = document.getElementById('album-grid');

    // Ensure input value is in sync (in case state has value but HTML was just created)
    const searchInput = document.getElementById('album-catalog-search');
    if (searchInput && SpotPerState.filters.search) {
      searchInput.value = SpotPerState.filters.search;
      // Focus if we just created it and have value (implies re-render while searching)
      searchInput.focus();
    }
  }

  if (!grid) return;
  grid.innerHTML = '';

  // Card de adicionar SEMPRE primeiro
  grid.appendChild(createAddAlbumCard());

  const albums = applyAlbumFilters(SpotPerState.cache.albums);

  if (!albums.length) {
    const empty = document.createElement('div');
    empty.className = 'col-span-full text-center text-ink-muted dark:text-[#8e8672] py-12';
    empty.innerHTML = 'Nenhum álbum encontrado. Use <span class="font-mono">Add Album</span> para começar.';
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
  const { mediaType, search, periodId, composerId } = SpotPerState.filters;
  let result = albums.slice();

  // Filter by media type
  if (mediaType && mediaType !== 'ALL') {
    result = result.filter((a) => a.tipo_midia === mediaType);
  }

  // Filter by period (album must have at least one composer from selected period)
  if (periodId) {
    result = result.filter((a) =>
      a.compositor_period_ids && a.compositor_period_ids.includes(periodId)
    );
  }

  // Filter by composer (album must have this composer)
  if (composerId) {
    result = result.filter((a) =>
      a.compositor_ids && a.compositor_ids.includes(composerId)
    );
  }

  // Filter by interpreter (album must have this interpreter)
  const { interpreterId } = SpotPerState.filters;
  if (interpreterId) {
    result = result.filter((a) =>
      a.interprete_ids && a.interprete_ids.includes(interpreterId)
    );
  }

  // Filter by search term
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
          <!-- Edit button removed as per request -->
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
        <button data-action="edit-playlist" data-playlist-id="${playlist.cod_playlist}" class="size-8 rounded bg-black/60 text-white/80 border border-white/10 hover:text-primary hover:border-primary/40 flex items-center justify-center" title="Editar playlist">
          <span class="material-symbols-outlined !text-[18px]">edit</span>
        </button>
        <button data-action="delete-playlist" data-playlist-id="${playlist.cod_playlist}" class="size-8 rounded bg-black/60 text-white/80 border border-white/10 hover:text-red-400 hover:border-red-400/40 flex items-center justify-center" title="Excluir playlist">
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

async function renderTracksCatalog() {
  const area = document.getElementById('content-area');
  if (!area) return;

  // Show loading state
  area.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-ink-main dark:text-white font-display text-xl">Faixas</h2>
        <p class="text-ink-muted dark:text-[#8e8672] text-sm">Carregando...</p>
      </div>
    </div>
  `;

  try {
    // Fetch tracks with all current filters
    const { mediaType, periodId, composerId, interpreterId } = SpotPerState.filters;
    const tracks = await api.listTracks({
      tipoMidia: mediaType,
      periodId: periodId,
      composerId: composerId,
      interpreterId: interpreterId
    });

    // Cache tracks
    SpotPerState.cache.tracks = tracks;

    area.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-ink-main dark:text-white font-display text-xl">Faixas</h2>
          <p class="text-ink-muted dark:text-[#8e8672] text-sm">${tracks.length} faixa(s) encontrada(s)</p>
        </div>
      </div>

      <div id="tracks-grid" class="grid gap-2 pb-32"></div>
    `;

    const grid = document.getElementById('tracks-grid');
    if (!grid) return;

    if (tracks.length === 0) {
      grid.innerHTML = '<div class="col-span-full text-center text-ink-muted py-12">Nenhuma faixa encontrada para o filtro selecionado.</div>';
      return;
    }

    grid.innerHTML = tracks.map(track => {
      const tempoMin = Math.floor((track.tempo_execucao || 0) / 60);
      const tempoSec = (track.tempo_execucao || 0) % 60;
      const tempoStr = `${tempoMin}:${String(tempoSec).padStart(2, '0')}`;
      const composerNames = (track.compositores || []).map(c => c.nome).join(', ') || '-';
      const interpreterNames = (track.interpretes || []).map(i => i.nome).join(', ') || '-';

      const mediaTag = track.tipo_midia === 'CD' ? 'CD' : (track.tipo_midia === 'VINIL' ? 'Vinil' : 'Download');
      const recordingBadge = track.tipo_gravacao
        ? `<span class="px-1.5 py-0.5 text-[10px] font-mono rounded ${track.tipo_gravacao === 'DDD' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}">${track.tipo_gravacao}</span>`
        : '';

      return `
        <div class="group flex items-center gap-4 p-4 rounded-lg border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark hover:border-primary/30 transition-colors">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-ink-main dark:text-white font-medium truncate">${escapeHtml(track.descricao)}</span>
              ${recordingBadge}
              <span class="px-1.5 py-0.5 text-[10px] font-mono rounded bg-primary/10 text-primary">${escapeHtml(track.tipo_composicao || '-')}</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-ink-muted dark:text-[#8e8672] mb-1">
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined !text-[14px]">album</span>
                ${escapeHtml(track.nome_album)}
              </span>
              <span class="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono text-[10px]">${mediaTag}</span>
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted dark:text-[#8e8672]">
              <span class="flex items-center gap-1" title="Compositor(es)">
                <span class="material-symbols-outlined !text-[14px]">edit</span>
                ${escapeHtml(composerNames)}
              </span>
              <span class="flex items-center gap-1" title="Intérprete(s)">
                <span class="material-symbols-outlined !text-[14px]">mic</span>
                ${escapeHtml(interpreterNames)}
              </span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-sm text-ink-main dark:text-white font-mono">${tempoStr}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Erro ao carregar faixas:', error);
    area.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-ink-main dark:text-white font-display text-xl">Faixas</h2>
          <p class="text-red-500 text-sm">Erro ao carregar faixas: ${error.message}</p>
        </div>
      </div>
    `;
  }
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

async function openAlbumDetails(codAlbum) {
  const album = SpotPerState.cache.albums.find((a) => a.cod_album === codAlbum);

  // Store album ID for reference
  SpotPerState.selection.albumId = codAlbum;

  // Open the dedicated album-details modal
  await openModal('album-details');

  // Populate modal with album data after it loads
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
    if (recordedEl) {
      // Format date if needed, or show raw
      recordedEl.textContent = album.data_gravacao || '—';
    }
    // Duration will be calculated from tracks, set placeholder
    if (durationEl) durationEl.textContent = 'Calculando...';

    if (trackCountEl) trackCountEl.textContent = album.qtd_faixas || '0';
    if (coverEl && album.img) {
      coverEl.style.backgroundImage = `url('${album.img}')`;
      coverEl.innerHTML = ''; // Remove placeholder icon
    }
    if (editBtn) {
      // Hiding edit button as per request to remove album editing
      editBtn.style.display = 'none';
    }

    // New fields: media type, purchase date, price
    const mediaTypeEl = document.getElementById('album-details-media-type');
    const purchaseDateEl = document.getElementById('album-details-purchase-date');
    const priceEl = document.getElementById('album-details-price');

    if (mediaTypeEl) mediaTypeEl.textContent = album.tipo_midia || 'CD';
    if (purchaseDateEl) purchaseDateEl.textContent = album.data_compra || '—';
    if (priceEl) {
      const priceVal = parseFloat(album.preco_compra);
      priceEl.textContent = isNaN(priceVal) ? '—' : priceVal.toFixed(2).replace('.', ',');
    }
  }

  // Load tracks from backend API
  try {
    const tracks = await api.getAlbumTracks(codAlbum);
    renderAlbumDetailTracks(tracks, codAlbum);
  } catch (error) {
    console.error('Erro ao carregar faixas do álbum:', error);
  }
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

async function openPlaylistEdit(codPlaylist) {
  const playlist = SpotPerState.cache.playlists.find((p) => p.cod_playlist === codPlaylist);
  if (!playlist) return;

  try {
    // Fetch existing tracks for this playlist
    const tracks = await api.getPlaylistTracks(codPlaylist);

    // Open modal with edit data pre-filled
    await openModalForEdit('playlist', codPlaylist, {
      nome: playlist.nome,
      tracks: tracks.map(t => ({
        cod_album: t.cod_album,
        numero_unidade: t.numero_unidade,
        numero_faixa: t.numero_faixa,
        descricao: t.nome_faixa,      // Template expects 'descricao'
        album_nome: t.nome_album,      // Template expects 'album_nome'
        tempo_execucao: t.tempo_execucao
      }))
    });

    // Update modal title for edit mode
    const titleEl = document.querySelector('#modal-content h2');
    if (titleEl) titleEl.textContent = 'Editar Playlist';

    const saveBtn = document.getElementById('playlist-save-btn');
    if (saveBtn) {
      const labelSpan = saveBtn.querySelector('span:not(.material-symbols-outlined)');
      if (labelSpan) labelSpan.textContent = 'ATUALIZAR PLAYLIST';
    }
  } catch (error) {
    console.error('Erro ao abrir edição de playlist:', error);
    alert('Erro ao carregar dados da playlist: ' + error.message);
  }
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

      const playAllBtn = document.getElementById('playlist-play-all-btn');
      if (playAllBtn) {
        playAllBtn.onclick = async () => {
          if (tracks.length === 0) return;

          playAllBtn.disabled = true;
          playAllBtn.classList.add('opacity-70', 'cursor-wait');
          const originalText = playAllBtn.innerHTML;
          playAllBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">sync</span><span>Reproduzindo...</span>';

          try {
            await Promise.all(tracks.map(t =>
              api.registerPlayback(codPlaylist, t.cod_album, t.numero_unidade, t.numero_faixa)
            ));
            openPlaylistDetails(codPlaylist);
          } catch (error) {
            console.error('Erro ao reproduzir tudo:', error);
            alert('Ocorreu um erro ao registrar a reprodução das faixas.');
          } finally {
            playAllBtn.disabled = false;
            playAllBtn.classList.remove('opacity-70', 'cursor-wait');
            playAllBtn.innerHTML = originalText;
          }
        };
      }

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
        <td class="py-3 text-[#5c5540] dark:text-[#f0ebe0]/60 text-sm font-mono">${tempoStr}</td>
        <td class="py-3 text-[#5c5540] dark:text-[#f0ebe0]/60 text-sm">${track.data_ultima_vez_tocada ? track.data_ultima_vez_tocada.split('.')[0] : '-'}</td>
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
  renderComposerCarousel(); // Re-render to apply/remove period filter based on view
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
  // Handle empty string as null (for "Todos" option)
  SpotPerState.filters.periodId = codPeriodo || null;
  SpotPerState.context.periodId = codPeriodo || null;

  const sectionTitle = document.getElementById('composer-section-title');
  if (sectionTitle) sectionTitle.textContent = `Selecionar Compositor (${periodName})`;

  // Re-render periods, composers (filtered by period), and main content
  renderPeriods();
  renderComposerCarousel(); // Re-render to filter by new period
  SpotPerState.filters.composerId = null; // Reset composer filter when period changes
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

  let composers = SpotPerState.cache.composers || [];

  // Filter composers by period ONLY for albums/tracks views (not playlists)
  if (SpotPerState.view !== 'playlists' && SpotPerState.filters.periodId) {
    composers = composers.filter(c => c.cod_periodo === SpotPerState.filters.periodId);
  }

  // Filter by search term
  const searchTerm = (SpotPerState.filters.composerSearch || '').toLowerCase();
  if (searchTerm) {
    composers = composers.filter(c => c.nome.toLowerCase().includes(searchTerm));
  }

  const isAllActive = !SpotPerState.filters.composerId;

  // Check if carousel structure exists
  let itemsContainer = document.getElementById('composer-items-container');

  if (!itemsContainer) {
    // Initial render: search input + items container
    carousel.innerHTML = `
      <div class="flex items-center gap-2 min-w-[160px] mr-2">
        <input type="text" id="composer-search-input" 
               placeholder="Buscar..." 
               value="${escapeHtml(SpotPerState.filters.composerSearch || '')}"
               class="w-full px-3 py-2 text-xs rounded-full bg-[#23201a] border border-[#393528] text-white placeholder-[#6d6655] focus:outline-none focus:border-primary" />
      </div>
      <div id="composer-items-container" class="contents"></div>
    `;

    itemsContainer = document.getElementById('composer-items-container');

    // Attach search event
    const searchInput = document.getElementById('composer-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        SpotPerState.filters.composerSearch = e.target.value;
        // Call directly to update only items
        renderComposerCarousel();
      });
      // Restore focus/cursor if this was a re-render (fallback)
      if (SpotPerState.filters.composerSearch) {
        searchInput.focus();
      }
    }
  }

  // Static buttons (Novo, Todos)
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

  // Render composer items
  composers.forEach(c => {
    const isActive = SpotPerState.filters.composerId === c.cod_compositor;
    const shortName = c.nome.split(' ').slice(-1)[0];
    html += `
      <div class="flex flex-col items-center gap-2 group min-w-[80px] relative">
        <button data-action="select-composer" data-composer-id="${c.cod_compositor}" class="flex flex-col items-center gap-2">
          <div class="size-20 rounded-full border-2 ${isActive ? 'border-primary bg-primary/10 shadow-amber-glow' : 'border-[#393528]'} flex items-center justify-center overflow-hidden transition-all group-hover:scale-105 relative">
            <span class="material-symbols-outlined ${isActive ? 'text-primary' : 'text-[#8e8672]'} !text-[28px]">person</span>
          </div>
        </button>
        <button onclick="openComposerEdit(${c.cod_compositor})" 
                class="absolute top-0 right-0 size-6 rounded-full bg-[#23201a] border border-[#393528] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-primary hover:text-primary"
                title="Editar ${escapeHtml(c.nome)}">
          <span class="material-symbols-outlined !text-[14px] text-[#8e8672]">edit</span>
        </button>
        <span class="${isActive ? 'text-primary' : 'text-[#8e8672]'} text-xs text-center max-w-[80px] truncate" title="${escapeHtml(c.nome)}">${escapeHtml(shortName)}</span>
      </div>
    `;
  });

  itemsContainer.innerHTML = html;
}

function renderInterpreterCarousel() {
  const carousel = document.getElementById('interpreter-carousel');
  if (!carousel) return;

  let interpreters = SpotPerState.cache.interpreters || [];

  // Filter by search term
  const searchTerm = (SpotPerState.filters.interpreterSearch || '').toLowerCase();
  if (searchTerm) {
    interpreters = interpreters.filter(i => i.nome.toLowerCase().includes(searchTerm));
  }

  const isAllActive = !SpotPerState.filters.interpreterId;

  // Check if carousel structure exists
  let itemsContainer = document.getElementById('interpreter-items-container');

  if (!itemsContainer) {
    // Initial render: search input + items container
    carousel.innerHTML = `
      <div class="flex items-center gap-2 min-w-[160px] mr-2">
        <input type="text" id="interpreter-search-input" 
               placeholder="Buscar..." 
               value="${escapeHtml(SpotPerState.filters.interpreterSearch || '')}"
               class="w-full px-3 py-2 text-xs rounded-full bg-[#23201a] border border-[#393528] text-white placeholder-[#6d6655] focus:outline-none focus:border-primary" />
      </div>
      <div id="interpreter-items-container" class="contents"></div>
    `;

    itemsContainer = document.getElementById('interpreter-items-container');

    // Attach search event
    const searchInput = document.getElementById('interpreter-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        SpotPerState.filters.interpreterSearch = e.target.value;
        renderInterpreterCarousel();
      });
      if (SpotPerState.filters.interpreterSearch) {
        searchInput.focus();
      }
    }
  }

  // Static buttons (Novo, Todos)
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

  // Render interpreter items
  interpreters.forEach(i => {
    const isActive = SpotPerState.filters.interpreterId === i.cod_interprete;
    const shortName = i.nome.split(' ').slice(-1)[0];
    html += `
      <div class="flex flex-col items-center gap-2 group min-w-[80px] relative">
        <button data-action="select-interpreter" data-interpreter-id="${i.cod_interprete}" class="flex flex-col items-center gap-2">
          <div class="size-20 rounded-full border-2 ${isActive ? 'border-primary bg-primary/10 shadow-amber-glow' : 'border-[#393528]'} flex items-center justify-center overflow-hidden transition-all group-hover:scale-105 relative">
            <span class="material-symbols-outlined ${isActive ? 'text-primary' : 'text-[#8e8672]'} !text-[28px]">mic</span>
          </div>
        </button>
        <button onclick="openInterpreterEdit(${i.cod_interprete})" 
                class="absolute top-0 right-0 size-6 rounded-full bg-[#23201a] border border-[#393528] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-primary hover:text-primary"
                title="Editar ${escapeHtml(i.nome)}">
          <span class="material-symbols-outlined !text-[14px] text-[#8e8672]">edit</span>
        </button>
        <span class="${isActive ? 'text-primary' : 'text-[#8e8672]'} text-xs text-center max-w-[80px] truncate" title="${escapeHtml(i.nome)}">${escapeHtml(shortName)}</span>
      </div>
    `;
  });

  itemsContainer.innerHTML = html;
}

function syncComposerSelection() {
  // Re-render to update visual selection
  renderComposerCarousel();
}

function syncInterpreterSelection() {
  // Re-render to update visual selection
  renderInterpreterCarousel();
}

function renderPeriods() {
  const periodList = document.getElementById('period-list');
  if (!periodList) return;

  const periods = SpotPerState.cache.periods || [];

  // Start with "Todos" option
  const isAllActive = SpotPerState.filters.periodId === null;
  let html = `
    <div class="group flex items-start gap-4 cursor-pointer period-item" data-action="select-period" data-period-id="" data-period-name="Todos">
      <div class="relative shrink-0 pt-1">
        <div class="size-4 rounded-full border ${isAllActive ? 'border-primary bg-primary' : 'border-[#5a5445] bg-[#181611]'} z-10 relative"></div>
      </div>
      <div class="flex flex-col gap-1 -mt-1 group-hover:translate-x-1 transition-transform">
        <h3 class="${isAllActive ? 'text-primary' : 'text-off-white'} group-hover:text-primary text-lg font-medium">Todos</h3>
        <p class="text-[#6d6655] text-sm">Todos os períodos</p>
      </div>
    </div>
  `;

  if (periods.length === 0) {
    html += `<div class="text-ink-muted dark:text-[#8e8672] text-sm mb-4">Nenhum período carregado.</div>`;
  } else {
    html += periods.map(period => {
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

  periodList.innerHTML = html;

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

/**
 * Povoa o banco de dados com dados de teste
 */
async function povoarDados() {
  if (!confirm('Isso irá LIMPAR todos os dados existentes e inserir dados de teste. Continuar?')) {
    return;
  }

  // Show loading state
  const btn = document.querySelector('[onclick*="povoarDados"]');
  let originalText = '';
  if (btn) {
    originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin !text-[16px]">sync</span><span>Povoando...</span>';
  }

  try {
    await api.populateDatabase();
    alert('Banco de dados povoado com sucesso! A página será recarregada.');
    window.location.reload();
  } catch (error) {
    alert('Erro ao povoar banco de dados: ' + error.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

/**
 * Enables drag-to-scroll functionality on a scrollable element
 */
function enableDragScroll(element) {
  if (!element || element._dragScrollEnabled) return;

  element._dragScrollEnabled = true;

  let isDown = false;
  let startX;
  let scrollLeft;

  element.addEventListener('mousedown', (e) => {
    // Don't drag if clicking on interactive elements
    if (e.target.closest('button, a, input')) return;

    isDown = true;
    element.classList.add('cursor-grabbing');
    element.style.cursor = 'grabbing';
    startX = e.pageX - element.offsetLeft;
    scrollLeft = element.scrollLeft;
  });

  element.addEventListener('mouseleave', () => {
    isDown = false;
    element.classList.remove('cursor-grabbing');
    element.style.cursor = 'grab';
  });

  element.addEventListener('mouseup', () => {
    isDown = false;
    element.classList.remove('cursor-grabbing');
    element.style.cursor = 'grab';
  });

  element.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - element.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    element.scrollLeft = scrollLeft - walk;
  });

  // Set initial cursor
  element.style.cursor = 'grab';
}

/**
 * Initialize drag scroll on carousels
 */
function initCarouselDragScroll() {
  const composerCarousel = document.getElementById('composer-carousel');
  const interpreterCarousel = document.getElementById('interpreter-carousel');

  if (composerCarousel) enableDragScroll(composerCarousel);
  if (interpreterCarousel) enableDragScroll(interpreterCarousel);
}

// Export globally
window.povoarDados = povoarDados;
window.enableDragScroll = enableDragScroll;
window.initCarouselDragScroll = initCarouselDragScroll;

/**
 * Initialize drag-to-resize on catalog section
 * Dragging up shrinks the composer section, dragging down expands it
 */
function initCatalogResize() {
  const resizeHandle = document.getElementById('catalog-resize-handle');
  const composerSection = document.getElementById('composer-section');
  const formatFilters = document.getElementById('format-filters');

  if (!resizeHandle || !composerSection) {
    console.warn('[SpotPer] Resize handle or composer section not found');
    return;
  }

  console.log('[SpotPer] Initializing catalog resize...');

  let isResizing = false;
  let startY = 0;
  let startComposerHeight = 0;
  const minComposerHeight = 60;
  let maxComposerHeight = 400; // Will be updated to initial height

  // Get initial height after a short delay to ensure content is loaded
  let initialComposerHeight = 200;
  setTimeout(() => {
    initialComposerHeight = composerSection.offsetHeight || 200;
    maxComposerHeight = Math.max(400, initialComposerHeight); // Allow returning to original size
    console.log('[SpotPer] Initial composer height:', initialComposerHeight, 'Max:', maxComposerHeight);
  }, 500);

  function startResize(clientY) {
    isResizing = true;
    startY = clientY;
    startComposerHeight = composerSection.offsetHeight;

    // Visual feedback
    resizeHandle.style.backgroundColor = 'rgba(244, 192, 37, 0.3)';
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    composerSection.style.overflow = 'hidden';

    console.log('[SpotPer] Resize started at Y:', startY, 'Height:', startComposerHeight);
  }

  function doResize(clientY) {
    if (!isResizing) return;

    const deltaY = clientY - startY;
    let newHeight = startComposerHeight + deltaY;

    // Clamp
    newHeight = Math.max(minComposerHeight, Math.min(maxComposerHeight, newHeight));

    // Apply height
    composerSection.style.height = `${newHeight}px`;

    // Scale items proportionally
    const currentInitialHeight = initialComposerHeight || startComposerHeight;
    const scale = Math.max(0.4, Math.min(1, newHeight / currentInitialHeight));

    const carouselItems = composerSection.querySelectorAll('#composer-carousel > *, #interpreter-carousel > *');
    carouselItems.forEach(item => {
      item.style.transform = `scale(${scale})`;
      item.style.transformOrigin = 'left center';
    });

    // Hide labels when small
    const labels = composerSection.querySelectorAll('.text-xs.font-mono.tracking-widest');
    labels.forEach(label => {
      label.style.opacity = newHeight < 100 ? '0' : '1';
      label.style.height = newHeight < 100 ? '0' : 'auto';
      label.style.marginBottom = newHeight < 100 ? '0' : '';
    });

    // Hide title when very small
    const titleContainer = composerSection.querySelector('.flex.items-center.justify-between');
    if (titleContainer) {
      titleContainer.style.opacity = newHeight < 80 ? '0' : '1';
      titleContainer.style.height = newHeight < 80 ? '0' : 'auto';
      titleContainer.style.overflow = 'hidden';
    }
  }

  function stopResize() {
    if (!isResizing) return;

    isResizing = false;
    resizeHandle.style.backgroundColor = '';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    console.log('[SpotPer] Resize stopped. New height:', composerSection.offsetHeight);
  }

  // Mouse events
  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startResize(e.clientY);
  });

  document.addEventListener('mousemove', (e) => {
    doResize(e.clientY);
  });

  document.addEventListener('mouseup', () => {
    stopResize();
  });

  // Touch events
  resizeHandle.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startResize(touch.clientY);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isResizing) return;
    const touch = e.touches[0];
    doResize(touch.clientY);
  }, { passive: true });

  document.addEventListener('touchend', () => {
    stopResize();
  });

  console.log('[SpotPer] Catalog resize initialized');
}

window.initCatalogResize = initCatalogResize;
