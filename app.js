(() => {
  'use strict';

  const TYPE_ORDER = ['need','approach','evidence'];
  const TYPE_LABELS = { domain:'Domain', need:'Need', approach:'Approach', evidence:'Evidence' };
  const NEED_FRAMINGS = ['problem','desired-outcome','job','opportunity-hypothesis'];
  const APPROACH_KINDS = ['product','feature','technology','platform','process','service','workaround','other','unknown'];
  const APPROACH_MATURITIES = ['conceptual','prototyped','validated','launched','retired','unknown'];
  const APPROACH_ORIGINS = ['firstbuild','gea','external','user-workaround','unknown'];
  const STRATEGIC_CONTEXTS = ['gea-core','gea-internal','gea-adjacent','external','unknown'];
  const EVIDENCE_KINDS = ['observation','research-finding','test-result','technical-finding','market-data','synthesized-insight'];
  const DEPTH_LABELS = ['Unexplored','Discussed','Investigated','Developed','Tested','Substantiated'];
  const STATUSES = ['open','active','promising','inconclusive','paused','pivoted','stopped','productized','unknown'];

  const el = {};
  let state;
  let ui;
  let view = { x: 0, y: 0, scale: 1 };
  let pointer = null;
  let renderModel = null;
  let aiConfigured = false;
  let aiModel = null;
  let graphMeta = { source: 'loading', persistenceConfigured: false, adminPasswordConfigured: false, revision: 0 };
  let adminAuthenticated = false;
  let saveQueue = Promise.resolve();
  let adminTab = 'domains';

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheElements();
    state = await loadState();
    updateGraphStatus();
    ui = {
      seedId: null,
      selectedId: null,
      radius: 2,
      expanded: new Set(),
      typeFilters: new Set(TYPE_ORDER),
      whiteSpace: false,
      aiMode: 'likely',
      suggestions: [],
      applicationSuggestions: [],
      missingSuggestions: [],
      dismissedSuggestions: new Set(),
      dismissedApplications: new Set(),
      dismissedMissing: new Set(),
      searchLanding: '',
      searchExplorer: '',
      needWording: null
    };
    populateControls();
    bindEvents();
    await refreshAdminSession();
    renderStarterChips();
    showLanding();
    checkAI();
  }

  function cacheElements() {
    [
      'landing','explorer','admin','brand-home','new-exploration','graph-admin','add-node','ai-status','graph-status',
      'landing-search','landing-search-results','starter-chips','explorer-search-wrap','explorer-search','explorer-search-results',
      'seed-title','seed-meta','visible-count','radius-1','radius-2','type-filters','types-all','types-none','white-space-toggle',
      'ai-likely','ai-stretch','suggest-ai','suggest-applications','suggest-missing','ai-note','suggestion-list','map-shell','map','map-bg','viewport','edges','nodes',
      'map-head-title','map-footer','zoom-in','zoom-out','fit-map','detail-panel','detail-content',
      'node-dialog','node-form','node-dialog-eyebrow','node-dialog-title','form-type','form-depth','form-status','toggle-advanced','need-framing-field','approach-fields','evidence-kind-field',
      'relationship-dialog','relationship-form','relationship-dialog-title','rel-source','rel-target',
      'admin-back','admin-logout','admin-domains-tab','admin-nodes-tab','admin-edges-tab','admin-search','admin-add-domain','admin-add','admin-add-edge','admin-export','admin-import','admin-import-file','admin-counts','admin-save-state','admin-table-head','admin-table-body','admin-empty','starter-label',
      'form-domains','admin-login-dialog','admin-login-form','admin-login-note','domain-dialog','domain-form','domain-dialog-title'
    ].forEach(id => el[toCamel(id)] = document.getElementById(id));
  }

  function toCamel(s) { return s.replace(/-([a-z0-9])/g, (_,c)=>c.toUpperCase()); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  async function loadState() {
    try {
      const res = await fetch('/api/graph', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Graph request failed (${res.status})`);
      const graph = data.graph || {};
      graphMeta = {
        source: data.source || 'api',
        persistenceConfigured: !!data.persistenceConfigured,
        adminPasswordConfigured: !!data.adminPasswordConfigured,
        revision: Number(graph.meta?.revision || 0)
      };
      updateGraphStatus();
      return { domains: Array.isArray(graph.domains) ? graph.domains : [], nodes: Array.isArray(graph.nodes) ? graph.nodes : [], edges: Array.isArray(graph.edges) ? graph.edges : [], meta: graph.meta || {} };
    } catch (error) {
      console.error('Unable to load graph:', error);
      graphMeta = { source: 'unavailable', persistenceConfigured: false, adminPasswordConfigured: false, revision: 0 };
      updateGraphStatus(error.message);
      return { domains: [], nodes: [], edges: [], meta: { version: 5, revision: 0 } };
    }
  }

  function saveState() {
    saveQueue = saveQueue.then(() => persistState()).catch(error => {
      console.error('Graph save failed:', error);
      setAdminSaveState(`Not saved: ${error.message}`, true);
    });
    return saveQueue;
  }

  async function persistState() {
    if (!graphMeta.persistenceConfigured) throw new Error('persistent storage is not configured');
    if (!graphMeta.adminPasswordConfigured) throw new Error('GRAPH_ADMIN_PASSWORD is not configured');
    if (!adminAuthenticated) throw new Error('Graph Admin session required');
    setAdminSaveState('Saving…');
    const payload = {
      meta: { ...(state.meta || {}), revision: graphMeta.revision },
      domains: state.domains,
      nodes: state.nodes,
      edges: state.edges
    };
    const res = await fetch('/api/graph', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Graph-Revision': String(graphMeta.revision)
      },
      body: JSON.stringify({ graph: payload })
    });
    const data = await res.json();
    if (res.status === 401) adminAuthenticated = false;
    if (!res.ok) throw new Error(data.error || `save failed (${res.status})`);
    state.domains = data.graph?.domains || state.domains;
    state.meta = data.graph?.meta || state.meta;
    graphMeta.source = data.source || 'blob';
    graphMeta.revision = Number(state.meta?.revision || graphMeta.revision + 1);
    setAdminSaveState(`Saved · revision ${graphMeta.revision}`);
    updateGraphStatus();
  }

  function updateGraphStatus(error = '') {
    if (!el.graphStatus) return;
    if (error) { el.graphStatus.textContent = `Graph: unavailable`; el.graphStatus.className = 'graph-status missing'; return; }
    const count = state?.nodes?.length ?? 0;
    const domainCount = state?.domains?.length ?? 0;
    const source = graphMeta.source === 'blob' ? 'shared YAML' : graphMeta.source === 'seed-yaml' ? 'seed YAML' : graphMeta.source;
    const writable = graphMeta.persistenceConfigured && graphMeta.adminPasswordConfigured;
    el.graphStatus.textContent = `Graph: ${domainCount} domains · ${count} nodes · ${source}${writable ? '' : ' · writes not configured'}`;
    el.graphStatus.className = `graph-status ${writable ? 'ready' : 'missing'}`;
  }

  function setAdminSaveState(text, isError = false) {
    if (!el.adminSaveState) return;
    el.adminSaveState.textContent = text;
    el.adminSaveState.classList.toggle('error', isError);
  }

  function populateControls() {
    TYPE_ORDER.forEach(type => {
      const label = document.createElement('label');
      label.className = 'filter-item';
      label.innerHTML = `<input type="checkbox" value="${type}" checked><span class="legend-shape ${type}"></span><span>${TYPE_LABELS[type]}</span>`;
      el.typeFilters.appendChild(label);
      el.formType.appendChild(option(type, TYPE_LABELS[type]));
    });
    el.formDepth.appendChild(option('', 'Unknown'));
    DEPTH_LABELS.forEach((d,i)=>el.formDepth.appendChild(option(String(i), `${i} — ${d}`)));
    STATUSES.forEach(s=>el.formStatus.appendChild(option(s, titleCase(s))));
    el.formType.addEventListener('change', syncTypeFields);
    renderDomainPicker();
    syncTypeFields();
  }

  function renderDomainPicker(selected = []) {
    if (!el.formDomains) return;
    const selectedSet = new Set(selected || []);
    el.formDomains.innerHTML = [...state.domains].sort((a,b)=>a.title.localeCompare(b.title)).map(d=>
      `<label class="domain-check"><input type="checkbox" name="domains" value="${escapeAttr(d.id)}" ${selectedSet.has(d.id)?'checked':''}><span>${escapeHtml(d.title)}</span></label>`
    ).join('');
  }

  function syncTypeFields() {
    const type=el.formType?.value || 'need';
    el.needFramingField?.classList.toggle('hidden', type!=='need');
    el.approachFields?.classList.toggle('hidden', type!=='approach');
    el.evidenceKindField?.classList.toggle('hidden', type!=='evidence');
  }

  function originLabel(value) { return ({firstbuild:'FirstBuild',gea:'GE Appliances',external:'External / competitive','user-workaround':'User workaround',unknown:'Unknown'})[value] || titleCase(value); }
  function strategicContextLabel(value) { return ({'gea-core':'GEA Core','gea-internal':'GEA Internal','gea-adjacent':'GEA Adjacent',external:'External',unknown:'Unknown / not captured'})[value] || titleCase(value); }

  function hasKnownDepth(value) { return value !== null && value !== undefined && value !== '' && Number.isInteger(Number(value)); }
  function depthText(value) { return hasKnownDepth(value) ? `${Number(value)} — ${DEPTH_LABELS[Number(value)] || ''}` : 'Unknown'; }
  function depthKicker(value) { return hasKnownDepth(value) ? `D${Number(value)}` : 'D?'; }
  function depthRank(value) { return hasKnownDepth(value) ? Number(value) : -1; }

  function classificationLabel(node) {
    if (!node || node._domain) return '';
    if (node.type==='need') return node.needFraming ? titleCase(node.needFraming) : 'Need';
    if (node.type==='approach') {
      const parts=[node.approachKind&&node.approachKind!=='unknown'&&titleCase(node.approachKind), node.approachMaturity&&node.approachMaturity!=='unknown'&&titleCase(node.approachMaturity)].filter(Boolean);
      return parts.join(' · ') || 'Approach';
    }
    if (node.type==='evidence') return node.evidenceKind ? titleCase(node.evidenceKind) : 'Evidence';
    return '';
  }

  function bindEvents() {
    el.brandHome.addEventListener('click', showLanding);
    el.newExploration.addEventListener('click', showLanding);
    el.addNode.addEventListener('click', showAdmin);
    el.graphAdmin.addEventListener('click', showAdmin);
    el.adminBack.addEventListener('click', showLanding);
    el.adminLogout.addEventListener('click', logoutAdmin);
    el.adminDomainsTab.addEventListener('click', () => { adminTab='domains'; renderAdmin(); });
    el.adminNodesTab.addEventListener('click', () => { adminTab='nodes'; renderAdmin(); });
    el.adminEdgesTab.addEventListener('click', () => { adminTab='edges'; renderAdmin(); });
    el.adminSearch.addEventListener('input', renderAdmin);
    el.adminAddDomain.addEventListener('click', () => openDomainDialog());
    el.adminAdd.addEventListener('click', () => openNodeDialog());
    el.adminAddEdge.addEventListener('click', () => openRelationshipDialog());
    el.adminExport.addEventListener('click', exportYaml);
    el.adminImport.addEventListener('click', () => el.adminImportFile.click());
    el.adminImportFile.addEventListener('change', importYaml);
    el.adminLoginForm.addEventListener('submit', loginAdmin);
    document.querySelectorAll('.close-admin-login').forEach(b=>b.addEventListener('click',()=>el.adminLoginDialog.close()));
    el.domainForm.addEventListener('submit', saveDomain);
    document.querySelectorAll('.close-domain').forEach(b=>b.addEventListener('click',()=>el.domainDialog.close()));

    el.landingSearch.addEventListener('input', () => {
      ui.searchLanding = el.landingSearch.value.trim();
      renderLandingResults();
    });
    el.landingSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = searchEntities(el.landingSearch.value)[0];
        if (first) enterExplorer(first.id);
      }
    });

    el.explorerSearch.addEventListener('input', () => {
      ui.searchExplorer = el.explorerSearch.value.trim();
      renderExplorerResults();
    });
    el.explorerSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = searchEntities(el.explorerSearch.value)[0];
        if (first) enterExplorer(first.id);
      }
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.hero-search-wrap')) el.landingSearchResults.classList.add('hidden');
      if (!e.target.closest('.compact-search')) el.explorerSearchResults.classList.add('hidden');
    });

    document.addEventListener('keydown', e => {
      if (e.key === '/' && !isTyping(e.target)) {
        e.preventDefault();
        (el.explorer.classList.contains('hidden') ? el.landingSearch : el.explorerSearch).focus();
      }
      if (e.key === 'Escape') {
        if (!el.detailPanel.classList.contains('hidden')) closeDetail();
        else if (!el.explorer.classList.contains('hidden')) showLanding();
      }
    });

    [el.radius1, el.radius2].forEach(b => b.addEventListener('click', () => {
      ui.radius = Number(b.dataset.radius);
      syncControls();
      renderGraph(true);
    }));

    el.typeFilters.addEventListener('change', e => {
      if (!e.target.matches('input[type="checkbox"]')) return;
      e.target.checked ? ui.typeFilters.add(e.target.value) : ui.typeFilters.delete(e.target.value);
      renderGraph(false);
    });
    el.typesAll.addEventListener('click', () => setAllTypes(true));
    el.typesNone.addEventListener('click', () => setAllTypes(false));
    el.whiteSpaceToggle.addEventListener('change', () => { ui.whiteSpace = el.whiteSpaceToggle.checked; renderGraph(false); });

    [el.aiLikely, el.aiStretch].forEach(b => b.addEventListener('click', () => {
      ui.aiMode = b.dataset.mode;
      ui.suggestions = [];
      ui.applicationSuggestions = [];
      ui.missingSuggestions = [];
      syncControls();
      renderSuggestions();
      renderGraph(false);
    }));
    el.suggestAi.addEventListener('click', requestSuggestions);
    el.suggestApplications.addEventListener('click', requestApplicationSuggestions);
    el.suggestMissing.addEventListener('click', requestMissingSuggestions);

    el.zoomIn.addEventListener('click', () => zoomAt(1.18));
    el.zoomOut.addEventListener('click', () => zoomAt(.85));
    el.fitMap.addEventListener('click', () => fitNetwork(true));

    el.map.addEventListener('pointerdown', onMapPointerDown);
    el.map.addEventListener('pointermove', onMapPointerMove);
    el.map.addEventListener('pointerup', onMapPointerUp);
    el.map.addEventListener('pointercancel', onMapPointerUp);
    el.map.addEventListener('wheel', onMapWheel, { passive: false });

    el.nodeForm.addEventListener('submit', saveNodeFromForm);
    document.querySelectorAll('.close-dialog').forEach(b => b.addEventListener('click', () => el.nodeDialog.close()));
    el.toggleAdvanced.addEventListener('click', () => {
      const hidden = el.nodeForm.querySelector('.advanced-field')?.classList.contains('hidden-advanced');
      el.nodeForm.querySelectorAll('.advanced-field').forEach(f=>f.classList.toggle('hidden-advanced', !hidden));
      el.toggleAdvanced.textContent = hidden ? 'Less detail' : 'More detail';
    });

    el.relationshipForm.addEventListener('submit', saveRelationship);
    document.querySelectorAll('.close-relationship').forEach(b => b.addEventListener('click', () => el.relationshipDialog.close()));
    window.addEventListener('resize', () => { if (ui.seedId) fitNetwork(false); });
  }

  function option(value,label) { const o=document.createElement('option'); o.value=value; o.textContent=label; return o; }
  function isTyping(target) { return ['INPUT','TEXTAREA','SELECT'].includes(target?.tagName); }

  function showLanding() {
    ui.seedId = null;
    ui.selectedId = null;
    ui.expanded.clear();
    ui.suggestions = [];
    ui.applicationSuggestions = [];
    ui.missingSuggestions = [];
    closeDetail();
    el.explorer.classList.add('hidden');
    el.admin.classList.add('hidden');
    el.landing.classList.remove('hidden');
    el.explorerSearchWrap.classList.add('hidden');
    el.newExploration.classList.add('hidden');
    el.landingSearch.value = '';
    el.landingSearchResults.classList.add('hidden');
    setTimeout(()=>el.landingSearch.focus(), 0);
  }

  function enterExplorer(id) {
    const node = nodeById(id);
    if (!node) return;
    ui.seedId = id;
    ui.selectedId = null;
    ui.expanded.clear();
    ui.suggestions = [];
    ui.applicationSuggestions = [];
    ui.missingSuggestions = [];
    ui.dismissedSuggestions.clear();
    ui.dismissedApplications.clear();
    ui.dismissedMissing.clear();
    el.landing.classList.add('hidden');
    el.admin.classList.add('hidden');
    el.explorer.classList.remove('hidden');
    el.explorerSearchWrap.classList.remove('hidden');
    el.newExploration.classList.remove('hidden');
    el.explorerSearch.value = '';
    el.explorerSearchResults.classList.add('hidden');
    el.seedTitle.textContent = node.title;
    if (node._domain) {
      const memberCount = domainMembers(node.domainId).length;
      el.seedMeta.textContent = `Domain · canonical taxonomy · ${memberCount} graph node${memberCount===1?'':'s'}`;
      el.suggestAi.disabled = true;
      el.suggestAi.title = 'Practical-relevance edges connect graph nodes, not domains.';
      el.suggestApplications.disabled = true;
      el.suggestApplications.title = 'Application suggestions start from a Need or Approach, not from a Domain.';
    } else {
      el.seedMeta.textContent = `${TYPE_LABELS[node.type] || node.type} · ${hasKnownDepth(node.depth)?`depth ${node.depth}`:'depth unknown'} · ${activityLabel(node)}`;
      el.suggestAi.disabled = false;
      el.suggestAi.title = '';
      const applicationsAllowed = node.type === 'need' || node.type === 'approach';
      el.suggestApplications.disabled = !applicationsAllowed;
      el.suggestApplications.title = applicationsAllowed ? '' : 'Application suggestions are available for Need and Approach nodes.';
    }
    el.mapHeadTitle.textContent = node.title;
    syncControls();
    renderSuggestions();
    closeDetail();
    requestAnimationFrame(() => renderGraph(true));
  }

  function syncControls() {
    el.radius1.classList.toggle('active', ui.radius === 1);
    el.radius2.classList.toggle('active', ui.radius === 2);
    el.aiLikely.classList.toggle('active', ui.aiMode === 'likely');
    el.aiStretch.classList.toggle('active', ui.aiMode === 'stretch');
    el.whiteSpaceToggle.checked = ui.whiteSpace;
  }

  function setAllTypes(on) {
    ui.typeFilters = new Set(on ? TYPE_ORDER : []);
    el.typeFilters.querySelectorAll('input').forEach(i=>i.checked=on);
    renderGraph(false);
  }

  function renderStarterChips() {
    const domains=[...state.domains].sort((a,b)=>a.title.localeCompare(b.title));
    el.starterLabel.textContent = 'CORE DOMAINS';
    if (!domains.length) {
      el.starterChips.innerHTML = `<button class="starter-chip empty-starter" data-action="admin">Open Graph Admin</button>`;
      el.starterChips.querySelector('[data-action="admin"]')?.addEventListener('click',showAdmin);
      return;
    }
    el.starterChips.innerHTML = domains.map(d => `<button class="starter-chip domain-starter" data-id="${escapeAttr(domainVirtualId(d.id))}">${escapeHtml(d.title)}</button>`).join('');
    el.starterChips.querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>enterExplorer(b.dataset.id)));
  }

  function renderLandingResults() {
    const query = el.landingSearch.value.trim();
    if (!query) { el.landingSearchResults.classList.add('hidden'); return; }
    const results = searchEntities(query).slice(0,10);
    el.landingSearchResults.innerHTML = results.length ? results.map(n=>`
      <button class="landing-result" data-id="${escapeAttr(n.id)}">
        <span class="type-mini">${escapeHtml(n._domain?'DMN':typeAbbrev(n.type))}</span>
        <span><strong>${highlight(n.title,query)}</strong><p>${escapeHtml(n.summary || 'No summary recorded.')}</p></span>
        <span class="depth-mini">${n._domain?'DOMAIN':hasKnownDepth(n.depth)?`DEPTH ${n.depth}`:'DEPTH ?'}</span>
      </button>`).join('') : `<div class="search-empty">No matching domain or node yet. Try a broader term, or add a new node.</div>`;
    el.landingSearchResults.classList.remove('hidden');
    el.landingSearchResults.querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>enterExplorer(b.dataset.id)));
  }

  function renderExplorerResults() {
    const query = el.explorerSearch.value.trim();
    if (!query) { el.explorerSearchResults.classList.add('hidden'); return; }
    const results = searchEntities(query).slice(0,10);
    el.explorerSearchResults.innerHTML = results.length ? results.map(n=>`
      <button class="search-result" data-id="${escapeAttr(n.id)}"><strong>${highlight(n.title,query)}</strong><span class="result-type">${escapeHtml(n._domain?'Domain':TYPE_LABELS[n.type] || n.type)}</span><p>${escapeHtml(n.summary || '')}</p></button>`
    ).join('') : `<div class="search-empty">No matching domain or node.</div>`;
    el.explorerSearchResults.classList.remove('hidden');
    el.explorerSearchResults.querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>enterExplorer(b.dataset.id)));
  }

  function searchEntities(raw) {
    const q = normalize(raw);
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const nodes = state.nodes.map(node => ({ entity: node, score: searchScore(node,q,tokens) }));
    const domains = state.domains.map(domain => {
      const entity=domainAsNode(domain);
      const title=normalize(domain.title), desc=normalize(domain.description||''), examples=normalize((domain.examples||[]).join(' '));
      let score=0;
      if(title===q)score+=220;
      if(title.startsWith(q))score+=110;
      if(title.includes(q))score+=90;
      if(desc.includes(q))score+=28;
      if(examples.includes(q))score+=40;
      tokens.forEach(t=>{if(title.includes(t))score+=34;if(desc.includes(t))score+=7;if(examples.includes(t))score+=14;});
      return {entity,score};
    });
    return [...domains,...nodes].filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.entity.title.localeCompare(b.entity.title)).map(x=>x.entity);
  }

  function searchNodes(raw) {
    return searchEntities(raw).filter(x=>!x._domain);
  }

  function searchScore(node,q,tokens) {
    const title=normalize(node.title), aliases=normalize((node.aliases||[]).join(' ')), tags=normalize((node.tags||[]).join(' ')), summary=normalize(node.summary||''), type=normalize(TYPE_LABELS[node.type]||node.type);
    let score=0;
    if (title===q) score+=180;
    if (title.startsWith(q)) score+=90;
    if (title.includes(q)) score+=70;
    if (aliases.includes(q)) score+=34;
    if (tags.includes(q)) score+=40;
    if (summary.includes(q)) score+=22;
    tokens.forEach(t=>{
      if (title.includes(t)) score+=28;
      if (tags.split(' ').includes(t)) score+=20;
      else if (tags.includes(t)) score+=10;
      if (summary.includes(t)) score+=5;
      if (type.includes(t)) score+=5;
    });
    if (tokens.every(t => `${title} ${aliases} ${tags} ${summary}`.includes(t))) score+=30;
    return score;
  }

  function renderGraph(fit=false) {
    if (!ui.seedId) return;
    renderModel = buildContextModel();
    el.edges.innerHTML = '';
    el.nodes.innerHTML = '';

    const edgeVisible = edge => endpointVisible(edge.source) && endpointVisible(edge.target);
    const visibleKnownEdges = renderModel.edges.filter(edgeVisible);
    const visibleStructuralEdges = (renderModel.structuralEdges||[]).filter(edgeVisible);
    const visibleSuggestedEdges = renderModel.suggestionEdges.filter(edgeVisible);
    const visibleSuggestedLinks = visibleSuggestedEdges.filter(edge=>edge.kind!=='application');
    visibleStructuralEdges.forEach(edge => el.edges.appendChild(buildEdge(edge, false)));
    visibleKnownEdges.forEach(edge => el.edges.appendChild(buildEdge(edge, false)));
    visibleSuggestedEdges.forEach(edge => el.edges.appendChild(buildEdge(edge, true)));
    renderModel.nodes.forEach(node => el.nodes.appendChild(buildNode(node)));

    const visibleInteractive = renderModel.nodes.filter(n=>n._domain || n.id===ui.seedId || ui.typeFilters.has(n.type)).length;
    el.visibleCount.textContent = `${visibleInteractive} shown`;
    const proposedCount = renderModel.nodes.filter(n=>n._proposed && (n.id===ui.seedId || ui.typeFilters.has(n.type))).length;
    const applicationCount = ui.applicationSuggestions.filter(s=>s.sourceId===ui.seedId).length;
    el.mapFooter.textContent = `${visibleInteractive} shown · ${visibleKnownEdges.length} known links${nodeById(ui.seedId)?._domain ? ` · ${visibleStructuralEdges.length} domain members` : ''}${visibleSuggestedLinks.length ? ` · ${visibleSuggestedLinks.length} suggested` : ''}${applicationCount ? ` · ${applicationCount} applications` : ''}${proposedCount ? ` · ${proposedCount} proposed nodes` : ''}`;
    if (fit) requestAnimationFrame(()=>fitNetwork(true));
  }

  function endpointVisible(id) {
    const node=nodeById(id);
    return !!node && (node._domain || id===ui.seedId || ui.typeFilters.has(node.type));
  }

  function buildContextModel() {
    const seed = nodeById(ui.seedId);
    const nodeIds = new Set([seed.id]);
    const level = new Map([[seed.id,0]]);
    const parent = new Map();
    const structuralEdges = [];

    if (seed._domain) {
      const members = domainMembers(seed.domainId)
        .sort((a,b)=>depthRank(b.depth)-depthRank(a.depth) || (Date.parse(b.updatedAt||0)||0)-(Date.parse(a.updatedAt||0)||0) || a.title.localeCompare(b.title))
        .slice(0,12);
      members.forEach(member=>{
        nodeIds.add(member.id); level.set(member.id,1); parent.set(member.id,seed.id);
        structuralEdges.push({id:`domain-membership-${seed.domainId}-${member.id}`,source:seed.id,target:member.id,label:'domain membership',strength:1,structural:true});
      });

      if (ui.radius >= 2) {
        const candidates=[];
        members.forEach(member=>{
          knownEdgesFor(member.id).filter(e=>!nodeIds.has(otherEnd(e,member.id))).slice(0,2).forEach(edge=>candidates.push({edge,parent:member.id,id:otherEnd(edge,member.id)}));
        });
        candidates.sort((a,b)=>(b.edge.strength||3)-(a.edge.strength||3));
        let added=0;
        for(const c of candidates){
          if(added>=10)break;
          if(!nodeIds.has(c.id)){nodeIds.add(c.id);level.set(c.id,2);parent.set(c.id,c.parent);added++;}
        }
      }
    } else {
      const firstEdges = knownEdgesFor(seed.id).slice(0,8);
      firstEdges.forEach(edge => {
        const id=otherEnd(edge,seed.id); nodeIds.add(id); level.set(id,1); parent.set(id,seed.id);
      });

      if (ui.radius >= 2) {
        const secondCandidates=[];
        [...nodeIds].filter(id=>level.get(id)===1).forEach(firstId => {
          knownEdgesFor(firstId).filter(e=>otherEnd(e,firstId)!==seed.id).slice(0,2).forEach(e=>secondCandidates.push({edge:e,parent:firstId,id:otherEnd(e,firstId)}));
        });
        secondCandidates.sort((a,b)=>(b.edge.strength||3)-(a.edge.strength||3));
        let added=0;
        for (const c of secondCandidates) {
          if (added>=10) break;
          if (!nodeIds.has(c.id)) {
            nodeIds.add(c.id); level.set(c.id,2); parent.set(c.id,c.parent); added++;
          }
        }
      }
    }

    [...ui.expanded].forEach(expandId => {
      const expandNode=nodeById(expandId);
      if (!nodeIds.has(expandId) || expandNode?._domain) return;
      const baseLevel=level.get(expandId) ?? 1;
      knownEdgesFor(expandId).slice(0,6).forEach(edge=>{
        const id=otherEnd(edge,expandId);
        if (!nodeIds.has(id)) { nodeIds.add(id); level.set(id,Math.min(baseLevel+1,3)); parent.set(id,expandId); }
      });
    });

    if (!seed._domain) {
      ui.suggestions.forEach(s=>{
        if (s.sourceId !== seed.id) return;
        nodeIds.add(s.candidateId);
        if (!level.has(s.candidateId)) { level.set(s.candidateId,1.5); parent.set(s.candidateId,seed.id); }
      });
    }
    ui.applicationSuggestions.forEach(s=>{
      if (s.sourceId !== seed.id) return;
      const id=domainVirtualId(s.domainId);
      if(!domainById(s.domainId))return;
      nodeIds.add(id);
      if(!level.has(id)){level.set(id,1.5);parent.set(id,seed.id);}
    });
    ui.missingSuggestions.forEach(s=>{
      if (s.sourceId !== seed.id) return;
      nodeIds.add(s.node.id);
      if (!level.has(s.node.id)) { level.set(s.node.id,1.5); parent.set(s.node.id,seed.id); }
    });

    const positions = radialPositions([...nodeIds], level, parent);
    const nodes=[...nodeIds].map(id=>{
      const base=nodeById(id);
      if(!base)return null;
      return { ...base, _level:level.get(id)||0, _pos:positions.get(id), _suggested:ui.suggestions.some(s=>s.candidateId===id), _applicationSuggested:ui.applicationSuggestions.some(s=>domainVirtualId(s.domainId)===id), _proposed:ui.missingSuggestions.some(s=>s.node.id===id) };
    }).filter(Boolean);
    const known = state.edges.filter(e=>nodeIds.has(e.source)&&nodeIds.has(e.target));
    const connectionEdges=seed._domain?[]:ui.suggestions.map((s,i)=>({ id:`suggestion-connection-${i}`,source:s.sourceId,target:s.candidateId,label:s.label,rationale:s.rationale,strength:confidenceStrength(s.confidence),provenance:'suggested',suggestion:s,kind:'connection' })).filter(e=>nodeIds.has(e.target));
    const applicationEdges=ui.applicationSuggestions.map((s,i)=>({ id:`suggestion-application-${i}`,source:s.sourceId,target:domainVirtualId(s.domainId),label:'possible application',rationale:s.rationale,strength:confidenceStrength(s.confidence),provenance:'suggested',suggestion:s,kind:'application' })).filter(e=>nodeIds.has(e.target));
    const missingEdges=ui.missingSuggestions.map((s,i)=>({ id:`suggestion-missing-${i}`,source:s.sourceId,target:s.node.id,label:s.label,rationale:s.rationale,strength:confidenceStrength(s.confidence),provenance:'suggested',suggestion:s,kind:'missing' })).filter(e=>nodeIds.has(e.target));
    return { nodes, edges:known, structuralEdges, suggestionEdges:[...connectionEdges,...applicationEdges,...missingEdges], positions, level, parent };
  }

  function radialPositions(ids, level, parent) {
    const map=new Map([[ui.seedId,{x:0,y:0}]]);
    const angleById=new Map([[ui.seedId,-Math.PI/2]]);

    const placeRing=(group,radius,offset=-Math.PI/2)=>{
      group.sort((a,b)=>nodeById(a).title.localeCompare(nodeById(b).title));
      group.forEach((id,i)=>{
        const angle=offset+(Math.PI*2*i/Math.max(group.length,1));
        angleById.set(id,angle);
        map.set(id,{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius});
      });
    };

    const first=ids.filter(id=>level.get(id)===1);
    placeRing(first,250,-Math.PI/2);

    const suggested=ids.filter(id=>level.get(id)===1.5);
    placeRing(suggested,340,-Math.PI/2+(suggested.length?Math.PI/suggested.length:0));

    [2,2.5,3].forEach(l=>{
      const group=ids.filter(id=>level.get(id)===l);
      if(!group.length)return;
      const radius=l===2?455:l===2.5?545:625;
      const byParent=new Map();
      const orphan=[];
      group.forEach(id=>{
        const p=parent.get(id);
        if(!p||!angleById.has(p)){orphan.push(id);return;}
        if(!byParent.has(p))byParent.set(p,[]);
        byParent.get(p).push(id);
      });
      byParent.forEach((children,p)=>{
        children.sort((a,b)=>nodeById(a).title.localeCompare(nodeById(b).title));
        const base=angleById.get(p);
        children.forEach((id,i)=>{
          const spread=children.length===1?0:(i-(children.length-1)/2)*0.34;
          const angle=base+spread;
          angleById.set(id,angle);
          map.set(id,{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius});
        });
      });
      if(orphan.length)placeRing(orphan,radius,-Math.PI/2+.18);
    });

    return map;
  }

  function buildNode(node) {
    const pos=node._pos || {x:0,y:0};
    const dims=nodeDimensions(node);
    const g=svg('g',{class:`node ${node.id===ui.seedId?'seed ':''}${node.id===ui.selectedId?'selected ':''}${node._suggested?'suggested-node ':''}${node._applicationSuggested?'application-suggested-node ':''}${node._proposed?'proposed-node ':''}depth-${hasKnownDepth(node.depth)?node.depth:'unknown'} ${node.type}-node`,transform:`translate(${pos.x} ${pos.y})`,tabindex:'0','data-id':node.id});
    if (!node._domain && !ui.typeFilters.has(node.type) && node.id!==ui.seedId) g.classList.add('hidden-by-filter');
    if (ui.whiteSpace && node.id!==ui.seedId) g.classList.add(!hasKnownDepth(node.depth)||node.depth<=1?'white-target':'white-muted');

    const halo=svg('ellipse',{class:'halo',cx:0,cy:0,rx:dims.w/2+12,ry:dims.h/2+12}); g.appendChild(halo);
    const body=buildNodeShape(node,dims); body.classList.add('node-body'); g.appendChild(body);

    const lines=wrapTitle(node.title,node.type==='domain'?18:22);
    const yStart=lines.length>1?-9:-1;
    lines.slice(0,2).forEach((line,i)=>{
      const t=svg('text',{class:'node-label',x:0,y:yStart+i*14}); t.textContent=line; g.appendChild(t);
    });
    const kicker=svg('text',{class:'node-kicker',x:0,y:dims.h/2-8});
    kicker.textContent=node._applicationSuggested?'POSSIBLE APPLICATION':node.type==='domain'?'CORE DOMAIN':node._proposed ? `MISSING? · ${TYPE_LABELS[node.type] || node.type}`.toUpperCase() : node._suggested ? 'SUGGESTED CONNECTION' : `${TYPE_LABELS[node.type] || node.type} · ${depthKicker(node.depth)}`.toUpperCase(); g.appendChild(kicker);

    g.addEventListener('click',e=>{e.stopPropagation(); selectNode(node.id);});
    g.addEventListener('dblclick',e=>{e.stopPropagation(); node._proposed ? selectNode(node.id) : recenter(node.id);});
    g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectNode(node.id);}});
    return g;
  }

  function buildNodeShape(node,d) {
    const w=d.w,h=d.h;
    if (node.type==='domain') return svg('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:4,ry:4});
    if (node.type==='need') return svg('ellipse',{cx:0,cy:0,rx:w/2,ry:h/2});
    if (node.type==='approach') return svg('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:8,ry:8});
    if (node.type==='evidence') return svg('polygon',{points:`0,${-h/2} ${w/2},0 0,${h/2} ${-w/2},0`});
    return svg('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:6,ry:6});
  }

  function nodeDimensions(node) {
    const base=Math.min(180,Math.max(116,node.title.length*6.8+44));
    if (node.type==='domain') return {w:Math.min(235,Math.max(160,node.title.length*8+44)),h:84};
    if (node.id===ui.seedId) return {w:Math.min(215,base+28),h:84};
    if (node.type==='evidence') return {w:Math.min(170,base),h:88};
    return {w:base,h:70};
  }

  function buildEdge(edge,isSuggested) {
    const a=renderModel.positions.get(edge.source), b=renderModel.positions.get(edge.target);
    const group=svg('g',{'data-edge-id':edge.id});
    const line=svg('line',{class:`edge ${edge.structural?'domain-membership ':''}${isSuggested?'suggested ':''}${edge.kind==='application'?'application-suggestion ':''}${edge.kind==='missing'?'missing-suggestion ':''}${(edge.strength||3)>=5?'strong':(edge.strength||3)<=2?'weak':''}`,x1:a.x,y1:a.y,x2:b.x,y2:b.y});
    const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    const labelText=edge.label||'relevant to';
    const width=Math.min(220,Math.max(64,labelText.length*5.8+18));
    const bg=svg('rect',{class:'edge-label-bg',x:mx-width/2,y:my-12,width,height:22,rx:3,ry:3});
    const label=svg('text',{class:'edge-label',x:mx,y:my+3,'text-anchor':'middle'}); label.textContent=labelText;
    group.append(line,bg,label);
    const show=()=>{line.classList.add('emphasized');bg.classList.add('visible');label.classList.add('visible');};
    const hide=()=>{if (!edgeTouchesSelected(edge)){line.classList.remove('emphasized');bg.classList.remove('visible');label.classList.remove('visible');}};
    line.addEventListener('mouseenter',show); line.addEventListener('mouseleave',hide);
    if (edgeTouchesSelected(edge)) show();
    return group;
  }

  function edgeTouchesSelected(edge) { return !!ui.selectedId && (edge.source===ui.selectedId || edge.target===ui.selectedId); }

  function selectNode(id) {
    if (!nodeById(id)) return;
    ui.selectedId=id;
    renderGraph(false);
    renderDetail();
  }

  function closeDetail() {
    ui.selectedId=null;
    el.detailPanel.classList.add('hidden');
    el.explorer.classList.remove('detail-open');
    if (ui.seedId && renderModel) renderGraph(false);
  }

  function renderNeedWordingBlock(node) {
    if (node.type !== 'need') return '';
    const session = ui.needWording?.nodeId === node.id ? ui.needWording : null;
    if (!session) return '';
    if (session.phase === 'input' || session.phase === 'busy') {
      const busy=session.phase==='busy';
      return `<div class="detail-block need-wording-block">
        <div class="detail-label">Need wording assistant</div>
        <p class="wording-help">${node.summary?'Refine the current description, or replace it with a rough draft / alias for the LLM to normalize.':'No description is captured yet. Leave this blank to work from the title, or add a rough draft / alias as context.'}</p>
        <textarea class="need-wording-input" data-role="need-wording-input" rows="4" ${busy?'disabled':''} placeholder="Optional rough need statement, alias, or context…">${escapeHtml(session.rough ?? node.summary ?? '')}</textarea>
        <div class="suggestion-actions">
          <button class="button button-primary" data-action="generate-need-wording" ${busy?'disabled':''}>${busy?'Drafting…':'Generate suggestion'}</button>
          <button class="button button-quiet" data-action="cancel-need-wording" ${busy?'disabled':''}>Cancel</button>
        </div>
        ${session.error?`<div class="wording-error">${escapeHtml(session.error)}</div>`:''}
      </div>`;
    }
    if (session.phase === 'suggestion' && session.suggestion) {
      const s=session.suggestion;
      const titleChanged=normalize(s.canonical_title)!==normalize(node.title);
      return `<div class="detail-block need-wording-block">
        <div class="detail-label">Suggested canonical need</div>
        <div class="need-wording-suggestion">
          <div class="suggestion-kind">${escapeHtml(titleCase(s.framing||node.needFraming||'problem'))}</div>
          <strong>${escapeHtml(s.canonical_title)}</strong>
          <p>${escapeHtml(s.description)}</p>
          <small>${escapeHtml(s.rationale||'')}</small>
        </div>
        <div class="suggestion-actions">
          <button class="button button-primary" data-action="apply-need-wording">Use${titleChanged?' title + description':' suggestion'}</button>
          ${titleChanged?'<button class="button button-outline" data-action="apply-need-description">Keep title · use description</button>':''}
          <button class="button button-quiet" data-action="retry-need-wording">Revise input</button>
          <button class="button button-quiet" data-action="cancel-need-wording">Dismiss</button>
        </div>
        ${!adminAuthenticated?'<div class="wording-note">Enter Graph Admin before applying a suggestion. Generating suggestions does not modify the graph.</div>':''}
      </div>`;
    }
    return '';
  }

  function renderDetail() {
    const node=nodeById(ui.selectedId); if(!node)return closeDetail();
    if(node._domain) return renderDomainDetail(node);
    const missing=ui.missingSuggestions.find(s=>s.node.id===node.id && s.sourceId===ui.seedId);
    if (missing) return renderMissingDetail(missing);

    const rels=knownEdgesFor(node.id);
    const suggestion=ui.suggestions.find(s=>s.candidateId===node.id && s.sourceId===ui.seedId);
    const expanded=ui.expanded.has(node.id);
    const artifacts=(node.artifacts||[]);
    const people=(node.contributors||[]);
    const depthHtml=!hasKnownDepth(node.depth)?`<span class="depth-zero">Unknown</span>`:node.depth===0?`<span class="depth-zero">0 — ${DEPTH_LABELS[0]}</span>`:`<div class="depth-bar">${[1,2,3,4,5].map(i=>`<span class="${i<=node.depth?'on':''}"></span>`).join('')}</div><span class="meta-value">${depthText(node.depth)}</span>`;
    const originNote=node.originKind==='ai-suggested-node'?`<div class="detail-block"><div class="detail-label">Origin</div><div class="accepted-origin">AI-suggested hypothesis · explicitly added to the graph${node.originModel?` · ${escapeHtml(node.originModel)}`:''}</div></div>`:'';
    el.detailContent.innerHTML=`
      <div class="detail-head">
        <button class="detail-close" data-action="close" aria-label="Close details">×</button>
        <div class="detail-type">${escapeHtml(TYPE_LABELS[node.type]||node.type)}</div>
        <h1>${escapeHtml(node.title)}</h1>
        <p class="detail-summary">${escapeHtml(node.summary||'No summary recorded.')}</p>
        <div class="detail-actions">
          <button class="button button-primary" data-action="recenter">Recenter here</button>
          <button class="button button-outline" data-action="expand">${expanded?'Collapse':'Expand'} connections</button>
          <button class="button button-outline" data-action="relate">+ Relationship</button>
          ${node.type==='need'?'<button class="button button-outline" data-action="need-wording">Suggest need wording</button>':''}
          <button class="button button-quiet" data-action="edit">Edit</button>
        </div>
      </div>
      <div class="detail-body">
        ${suggestion?`<div class="detail-block"><div class="detail-label">Suggested connection</div><div class="suggestion-callout"><strong>${escapeHtml(suggestion.label)}</strong><br>${escapeHtml(suggestion.rationale)}<div class="suggestion-actions" style="margin-top:8px"><button class="button button-primary" data-action="accept-suggestion">Add relationship</button><button class="button button-quiet" data-action="dismiss-suggestion">Dismiss</button></div></div></div>`:''}
        ${originNote}
        ${renderNeedWordingBlock(node)}
        ${(node.aliases||[]).length?`<div class="detail-block"><div class="detail-label">Aliases / archive titles</div><div class="tag-list">${node.aliases.map(a=>`<span class="tag-chip">${escapeHtml(a)}</span>`).join('')}</div></div>`:''}
        ${(node.domains||[]).length?`<div class="detail-block"><div class="detail-label">Domains</div><div>${domainTitlesForNode(node).map(d=>`<span class="domain-pill">${escapeHtml(d)}</span>`).join('')}</div></div>`:''}
        ${node.strategicContext&&node.strategicContext!=='unknown'?`<div class="detail-block"><div class="detail-label">Strategic context</div><div class="meta-value">${escapeHtml(strategicContextLabel(node.strategicContext))}</div></div>`:''}
        ${classificationLabel(node)?`<div class="detail-block"><div class="detail-label">Classification</div><div class="meta-value">${escapeHtml(classificationLabel(node))}${node.type==='approach'&&node.approachOrigin?` · ${escapeHtml(originLabel(node.approachOrigin))}`:''}</div></div>`:''}
        <div class="detail-block"><div class="detail-label">Exploration depth</div><div style="display:flex;align-items:center;gap:9px">${depthHtml}</div></div>
        <div class="detail-block"><div class="meta-grid"><div><div class="detail-label">Status</div><span class="status-pill">${escapeHtml(titleCase(node.status||'unknown'))}</span></div><div><div class="detail-label">Activity</div><div class="meta-value">${escapeHtml(activityLabel(node))}</div></div></div></div>
        ${people.length?`<div class="detail-block"><div class="detail-label">Contributors</div><div class="people-list">${people.map(p=>`<button class="person-chip">${escapeHtml(p)}</button>`).join('')}</div></div>`:''}
        ${node.conclusion?`<div class="detail-block"><div class="detail-label">Historical context / conclusion</div><div class="callout">${escapeHtml(node.conclusion)}</div></div>`:''}
        ${node.revisit?`<div class="detail-block"><div class="detail-label">Revisit if</div><div class="meta-value">${escapeHtml(node.revisit)}</div></div>`:''}
        <div class="detail-block"><div class="detail-label">Known practical relationships · ${rels.length}</div><div class="related-list">${rels.length?rels.map(e=>{const other=nodeById(otherEnd(e,node.id));return `<button class="related-item" data-id="${other.id}"><strong>${escapeHtml(other.title)}</strong><span>${escapeHtml(e.label||'relevant to')}</span>${e.rationale?`<small>${escapeHtml(e.rationale)}</small>`:''}</button>`}).join(''):'<span class="meta-value">None recorded.</span>'}</div></div>
        ${artifacts.length?`<div class="detail-block"><div class="detail-label">Artifacts</div><div class="artifact-list">${artifacts.map(artifactHtml).join('')}</div></div>`:''}
      </div>`;
    el.detailPanel.classList.remove('hidden'); el.explorer.classList.add('detail-open');
    el.detailContent.querySelector('[data-action="close"]').addEventListener('click',closeDetail);
    el.detailContent.querySelector('[data-action="recenter"]').addEventListener('click',()=>recenter(node.id));
    el.detailContent.querySelector('[data-action="expand"]').addEventListener('click',()=>toggleExpand(node.id));
    el.detailContent.querySelector('[data-action="relate"]').addEventListener('click',()=>adminAuthenticated?openRelationshipDialog(node):showAdmin());
    el.detailContent.querySelector('[data-action="edit"]').addEventListener('click',()=>adminAuthenticated?openNodeDialog(node):showAdmin());
    const wordingButton=el.detailContent.querySelector('[data-action="need-wording"]');
    if(wordingButton)wordingButton.addEventListener('click',()=>{ui.needWording={nodeId:node.id,phase:'input',rough:node.summary||''};renderDetail();});
    const generateWording=el.detailContent.querySelector('[data-action="generate-need-wording"]');
    if(generateWording)generateWording.addEventListener('click',()=>requestNeedWording(node));
    const cancelWording=el.detailContent.querySelector('[data-action="cancel-need-wording"]');
    if(cancelWording)cancelWording.addEventListener('click',()=>{ui.needWording=null;renderDetail();});
    const retryWording=el.detailContent.querySelector('[data-action="retry-need-wording"]');
    if(retryWording)retryWording.addEventListener('click',()=>{ui.needWording={nodeId:node.id,phase:'input',rough:ui.needWording?.rough??node.summary??''};renderDetail();});
    const applyWording=el.detailContent.querySelector('[data-action="apply-need-wording"]');
    if(applyWording)applyWording.addEventListener('click',()=>applyNeedWording(node,true));
    const applyDescription=el.detailContent.querySelector('[data-action="apply-need-description"]');
    if(applyDescription)applyDescription.addEventListener('click',()=>applyNeedWording(node,false));
    el.detailContent.querySelectorAll('.related-item').forEach(b=>b.addEventListener('click',()=>selectNode(b.dataset.id)));
    const accept=el.detailContent.querySelector('[data-action="accept-suggestion"]'); if(accept)accept.addEventListener('click',()=>acceptSuggestion(suggestion));
    const dismiss=el.detailContent.querySelector('[data-action="dismiss-suggestion"]'); if(dismiss)dismiss.addEventListener('click',()=>dismissSuggestion(suggestion));
  }

  async function requestNeedWording(node) {
    const input=el.detailContent.querySelector('[data-role="need-wording-input"]');
    const rough=String(input?.value||'').trim();
    ui.needWording={nodeId:node.id,phase:'busy',rough};
    renderDetail();
    try {
      const related=knownEdgesFor(node.id).slice(0,12).map(e=>nodeById(otherEnd(e,node.id))).filter(Boolean).map(compactNode);
      const res=await fetch('/api/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'need-wording',seed:compactNode(node),rough_input:rough,domains:domainTitlesForNode(node),related})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||`Need wording request failed (${res.status}).`);
      ui.needWording={nodeId:node.id,phase:'suggestion',rough,suggestion:data.suggestion,model:data.model||aiModel||''};
    } catch(error) {
      ui.needWording={nodeId:node.id,phase:'input',rough,error:error.message};
    }
    if(ui.selectedId===node.id)renderDetail();
  }

  function applyNeedWording(node, includeTitle) {
    const session=ui.needWording;
    const suggestion=session?.nodeId===node.id?session.suggestion:null;
    if(!suggestion)return;
    if(!adminAuthenticated){showAdmin();return;}
    const oldTitle=node.title;
    if(includeTitle && suggestion.canonical_title && normalize(suggestion.canonical_title)!==normalize(oldTitle)) {
      node.aliases=Array.from(new Set([...(node.aliases||[]),oldTitle].filter(Boolean)));
      node.title=String(suggestion.canonical_title).trim();
    }
    node.summary=String(suggestion.description||node.summary||'').trim();
    node.needFraming=String(suggestion.framing||node.needFraming||'problem');
    node.wordingProvenance='ai-assisted-human-accepted';
    node.wordingModel=session.model||'';
    node.updatedAt=new Date().toISOString();
    ui.needWording=null;
    saveState();
    renderStarterChips();
    if(ui.seedId===node.id){el.seedTitle.textContent=node.title;el.seedMeta.textContent=`${TYPE_LABELS[node.type]||node.type} · ${hasKnownDepth(node.depth)?`depth ${node.depth}`:'depth unknown'} · ${activityLabel(node)}`;}
    renderGraph(false);
    renderDetail();
  }

  function renderDomainDetail(domainNode) {
    const domain=domainById(domainNode.domainId);
    const members=domainMembers(domainNode.domainId);
    const application=ui.applicationSuggestions.find(s=>s.domainId===domainNode.domainId && s.sourceId===ui.seedId);
    el.detailContent.innerHTML=`
      <div class="detail-head">
        <button class="detail-close" data-action="close" aria-label="Close details">×</button>
        <div class="detail-type">Canonical domain</div>
        <h1>${escapeHtml(domain.title)}</h1>
        <p class="detail-summary">${escapeHtml(domain.description||'No description recorded.')}</p>
        <div class="detail-actions"><button class="button button-primary" data-action="recenter">Explore this domain</button></div>
      </div>
      <div class="detail-body">
        ${application?`<div class="detail-block"><div class="detail-label">Possible application</div><div class="suggestion-callout application-callout">${escapeHtml(application.rationale)}<div class="suggestion-actions application-actions" style="margin-top:8px"><button class="button button-primary" data-action="accept-application">Add application</button><button class="button button-quiet" data-action="dismiss-application">Dismiss</button></div></div></div>`:''}
        <div class="detail-block"><div class="detail-label">Purpose</div><div class="meta-value">Domains are stable product/application taxonomy. Membership does not create a graph edge.</div></div>
        <div class="detail-block"><div class="meta-grid"><div><div class="detail-label">Graph nodes</div><div class="meta-value">${members.length}</div></div><div><div class="detail-label">Examples</div><div class="meta-value">${escapeHtml((domain.examples||[]).join(', ')||'—')}</div></div></div></div>
        <div class="detail-block"><div class="detail-label">Current members</div><div class="related-list">${members.length?members.slice(0,20).map(n=>`<button class="related-item" data-id="${escapeAttr(n.id)}"><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(TYPE_LABELS[n.type]||n.type)} · ${hasKnownDepth(n.depth)?`depth ${n.depth}`:'depth unknown'}</span></button>`).join(''):'<span class="meta-value">No trusted exploration nodes are assigned to this domain yet.</span>'}</div></div>
      </div>`;
    el.detailPanel.classList.remove('hidden'); el.explorer.classList.add('detail-open');
    el.detailContent.querySelector('[data-action="close"]').addEventListener('click',closeDetail);
    el.detailContent.querySelector('[data-action="recenter"]').addEventListener('click',()=>enterExplorer(domainNode.id));
    el.detailContent.querySelector('[data-action="accept-application"]')?.addEventListener('click',()=>acceptApplicationSuggestion(application));
    el.detailContent.querySelector('[data-action="dismiss-application"]')?.addEventListener('click',()=>dismissApplicationSuggestion(application));
    el.detailContent.querySelectorAll('.related-item').forEach(b=>b.addEventListener('click',()=>selectNode(b.dataset.id)));
  }

  function renderMissingDetail(suggestion) {
    const node=suggestion.node;
    const seed=nodeById(suggestion.sourceId);
    el.detailContent.innerHTML=`
      <div class="detail-head proposed-detail">
        <button class="detail-close" data-action="close" aria-label="Close details">×</button>
        <div class="detail-type">Suggested missing node · ${escapeHtml(TYPE_LABELS[node.type]||node.type)} · ${escapeHtml(classificationLabel(node))}</div>
        <h1>${escapeHtml(node.title)}</h1>
        <p class="detail-summary">${escapeHtml(node.summary||'')}</p>
        <div class="detail-actions">
          <button class="button button-primary" data-action="accept-missing">Add to graph</button>
          <button class="button button-quiet" data-action="dismiss-missing">Dismiss</button>
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-block"><div class="detail-label">Why it may belong</div><div class="suggestion-callout missing-callout"><strong>${escapeHtml(suggestion.label)}</strong><br>${escapeHtml(suggestion.rationale)}</div></div>
        <div class="detail-block"><div class="detail-label">Relationship to seed</div><div class="meta-value">${escapeHtml(seed?.title||'Current seed')} ↔ ${escapeHtml(node.title)}</div></div>
        <div class="detail-block"><div class="detail-label">Epistemic status</div><div class="proposed-status">AI-proposed hypothesis · not yet part of the Exploration Graph</div></div>
        ${(node.tags||[]).length?`<div class="detail-block"><div class="detail-label">Suggested tags</div><div class="tag-list">${node.tags.map(t=>`<span class="tag-chip">${escapeHtml(t)}</span>`).join('')}</div></div>`:''}
        <div class="detail-block"><div class="detail-label">Suggestion mode</div><div class="meta-value">${escapeHtml(titleCase(suggestion.mode))}</div></div>
      </div>`;
    el.detailPanel.classList.remove('hidden'); el.explorer.classList.add('detail-open');
    el.detailContent.querySelector('[data-action="close"]').addEventListener('click',closeDetail);
    el.detailContent.querySelector('[data-action="accept-missing"]').addEventListener('click',()=>acceptMissingSuggestion(suggestion));
    el.detailContent.querySelector('[data-action="dismiss-missing"]').addEventListener('click',()=>dismissMissingSuggestion(suggestion));
  }

  function recenter(id) { enterExplorer(id); }
  function toggleExpand(id) {
    ui.expanded.has(id) ? ui.expanded.delete(id) : ui.expanded.add(id);
    renderGraph(true); renderDetail();
  }

  function renderSuggestions() {
    const connectionCards=ui.suggestions.map((s,i)=>{
      const n=nodeById(s.candidateId); if(!n)return '';
      return `<div class="suggestion-card connection-card" data-kind="connection" data-index="${i}"><div class="suggestion-kind">CONNECTION · ${escapeHtml(TYPE_LABELS[n.type]||n.type)}</div><strong>${escapeHtml(n.title)}</strong><div class="suggestion-label">${escapeHtml(s.label)}</div><p>${escapeHtml(s.rationale)}</p><div class="suggestion-actions"><button class="button button-primary" data-action="accept">Add relationship</button><button class="button button-quiet" data-action="dismiss">Dismiss</button></div></div>`;
    }).join('');
    const applicationCards=ui.applicationSuggestions.map((s,i)=>{
      const d=domainById(s.domainId); if(!d)return '';
      return `<div class="suggestion-card application-card" data-kind="application" data-index="${i}"><div class="suggestion-kind">POSSIBLE APPLICATION · DOMAIN</div><strong>${escapeHtml(d.title)}</strong><div class="suggestion-label">${escapeHtml(s.mode==='stretch'?'Stretch application':'Likely application')}</div><p>${escapeHtml(s.rationale)}</p><div class="suggestion-actions application-actions"><button class="button button-primary" data-action="accept">Add application</button><button class="button button-outline" data-action="explore">Explore</button><button class="button button-quiet" data-action="dismiss">Dismiss</button></div></div>`;
    }).join('');
    const missingCards=ui.missingSuggestions.map((s,i)=>{
      const n=s.node;
      return `<div class="suggestion-card missing-card" data-kind="missing" data-index="${i}"><div class="suggestion-kind">MISSING? · ${escapeHtml(TYPE_LABELS[n.type]||n.type)} · ${escapeHtml(classificationLabel(n))}</div><strong>${escapeHtml(n.title)}</strong><div class="suggestion-label">${escapeHtml(s.label)}</div><p>${escapeHtml(n.summary)}</p><div class="suggestion-actions"><button class="button button-primary" data-action="accept">Add to graph</button><button class="button button-quiet" data-action="dismiss">Dismiss</button></div></div>`;
    }).join('');
    el.suggestionList.innerHTML=connectionCards+applicationCards+missingCards;
    el.suggestionList.querySelectorAll('.suggestion-card').forEach(card=>{
      const kind=card.dataset.kind;
      const i=Number(card.dataset.index);
      const s=kind==='missing'?ui.missingSuggestions[i]:kind==='application'?ui.applicationSuggestions[i]:ui.suggestions[i];
      if(!s)return;
      card.querySelector('[data-action="accept"]').addEventListener('click',()=>kind==='missing'?acceptMissingSuggestion(s):kind==='application'?acceptApplicationSuggestion(s):acceptSuggestion(s));
      card.querySelector('[data-action="dismiss"]').addEventListener('click',()=>kind==='missing'?dismissMissingSuggestion(s):kind==='application'?dismissApplicationSuggestion(s):dismissSuggestion(s));
      card.querySelector('[data-action="explore"]')?.addEventListener('click',()=>enterExplorer(domainVirtualId(s.domainId)));
      card.querySelector('strong').addEventListener('click',()=>selectNode(kind==='missing'?s.node.id:kind==='application'?domainVirtualId(s.domainId):s.candidateId));
    });
  }

  async function checkAI() {
    try {
      const res=await fetch('/api/health',{headers:{'Accept':'application/json'}});
      const data=await res.json();
      aiConfigured=!!data.aiConfigured; aiModel=data.model||null;
    } catch (_) { aiConfigured=false; }
    el.aiStatus.textContent=aiConfigured?`AI: ready${aiModel?` · ${aiModel}`:''}`:'AI: key not configured';
    el.aiStatus.classList.toggle('ready',aiConfigured); el.aiStatus.classList.toggle('missing',!aiConfigured);
    if (!aiConfigured) el.aiNote.textContent='Deploy with OPENAI_API_KEY to enable semantic suggestions.';
  }

  async function requestSuggestions() {
    if (!ui.seedId) return;
    if (!aiConfigured) {
      el.aiNote.textContent='AI is not configured yet. Add OPENAI_API_KEY in Vercel, then redeploy.';
      return;
    }
    const seed=nodeById(ui.seedId);
    const directKnown=new Set(knownEdgesFor(seed.id).map(e=>otherEnd(e,seed.id)));
    const candidates=state.nodes.filter(n=>n.id!==seed.id && !directKnown.has(n.id) && !ui.dismissedSuggestions.has(`${seed.id}:${n.id}:${ui.aiMode}`)).slice(0,60);
    el.suggestAi.disabled=true; el.suggestAi.textContent='Finding connections…'; el.aiNote.textContent='Looking for useful relationships to nodes that already exist in the graph.';
    try {
      const res=await fetch('/api/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'connections',mode:ui.aiMode,seed:compactNode(seed),candidates:candidates.map(compactNode)})});
      const data=await res.json();
      if (!res.ok) throw new Error(data.error||`Request failed (${res.status})`);
      ui.suggestions=(data.suggestions||[]).map(s=>({sourceId:seed.id,candidateId:s.candidate_id,label:s.label,rationale:s.rationale,confidence:s.confidence,mode:ui.aiMode})).filter(s=>nodeById(s.candidateId));
      el.aiNote.textContent=ui.suggestions.length?`${ui.suggestions.length} connection suggestions from ${data.model||aiModel||'OpenAI'}. Add only the relationships that are useful.`:'No useful new connections were suggested.';
      renderSuggestions(); renderGraph(true);
    } catch (err) {
      el.aiNote.textContent=`Suggestion request failed: ${err.message}`;
    } finally {
      el.suggestAi.disabled=false; el.suggestAi.textContent='Suggest connections';
    }
  }


  async function requestApplicationSuggestions() {
    if (!ui.seedId) return;
    if (!aiConfigured) { el.aiNote.textContent='AI is not configured yet. Add OPENAI_API_KEY in Vercel, then redeploy.'; return; }
    const seed=nodeById(ui.seedId);
    if(!seed || seed._domain || !['need','approach'].includes(seed.type)){
      el.aiNote.textContent='Application suggestions are available for Need and Approach nodes.';
      return;
    }
    const available=state.domains.filter(d=>!(seed.domains||[]).includes(d.id) && !ui.dismissedApplications.has(`${seed.id}:${ui.aiMode}:${d.id}`));
    if(!available.length){el.aiNote.textContent='This node is already assigned to every canonical Domain.';return;}
    const related=knownEdgesFor(seed.id).slice(0,10).map(e=>nodeById(otherEnd(e,seed.id))).filter(n=>n&&!n._domain).map(compactNode);
    el.suggestApplications.disabled=true; el.suggestApplications.textContent='Finding applications…'; el.aiNote.textContent='Looking for canonical Domains where this Need or Approach may have a meaningful additional application.';
    try {
      const res=await fetch('/api/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'applications',mode:ui.aiMode,seed:compactNode(seed),current_domain_ids:[...(seed.domains||[])],domains:available.map(compactDomain),related})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||`Application request failed (${res.status}).`);
      ui.applicationSuggestions=(data.suggestions||[]).map(s=>({sourceId:seed.id,domainId:s.domain_id,rationale:s.rationale,confidence:s.confidence,mode:ui.aiMode,model:data.model||aiModel||null})).filter(s=>domainById(s.domainId));
      el.aiNote.textContent=ui.applicationSuggestions.length?`${ui.applicationSuggestions.length} possible application${ui.applicationSuggestions.length===1?'':'s'} from ${data.model||aiModel||'OpenAI'}. Explore or add only the ones that are useful.`:'No additional canonical Domains looked meaningfully useful.';
      renderSuggestions(); renderGraph(true);
    } catch(err) {
      el.aiNote.textContent=`Application request failed: ${err.message}`;
    } finally {
      el.suggestApplications.disabled=false; el.suggestApplications.textContent='Suggest applications';
    }
  }

  async function requestMissingSuggestions() {
    if (!ui.seedId) return;
    if (!aiConfigured) {
      el.aiNote.textContent='AI is not configured yet. Add OPENAI_API_KEY in Vercel, then redeploy.';
      return;
    }
    const seed=nodeById(ui.seedId);
    const existing=state.nodes.slice(0,60).map(compactNode);
    const excluded=[...ui.dismissedMissing].filter(key=>key.startsWith(`${seed.id}:${ui.aiMode}:`)).map(key=>key.split(':').slice(2).join(':'));
    el.suggestMissing.disabled=true; el.suggestMissing.textContent='Looking for gaps…'; el.aiNote.textContent='Looking for useful areas that are not already represented as nodes. These are hypotheses, not established needs or findings.';
    try {
      const res=await fetch('/api/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'missing',mode:ui.aiMode,seed:compactNode(seed),existing,excluded_titles:excluded})});
      const data=await res.json();
      if (!res.ok) throw new Error(data.error||`Request failed (${res.status})`);
      const stamp=Date.now().toString(36);
      ui.missingSuggestions=(data.suggestions||[]).map((s,i)=>({
        sourceId:seed.id,
        node:{id:`proposed-${stamp}-${i}`,title:s.title,type:s.type,summary:s.summary,tags:s.tags||[],depth:0,status:'open',strategicContext:'unknown',contributors:[],artifacts:[],...(s.type==='need'?{needFraming:s.subtype||'opportunity-hypothesis'}:{approachKind:s.subtype||'other',approachMaturity:'conceptual',approachOrigin:'firstbuild'})},
        label:s.relationship_label,
        rationale:s.rationale,
        confidence:s.confidence,
        mode:ui.aiMode,
        model:data.model||aiModel||null
      }));
      el.aiNote.textContent=ui.missingSuggestions.length?`${ui.missingSuggestions.length} possible gaps from ${data.model||aiModel||'OpenAI'}. They remain ghost nodes until you add them.`:'No useful missing areas were suggested.';
      renderSuggestions(); renderGraph(true);
    } catch (err) {
      el.aiNote.textContent=`Missing-node request failed: ${err.message}`;
    } finally {
      el.suggestMissing.disabled=false; el.suggestMissing.textContent='Suggest what’s missing';
    }
  }
  function compactNode(n) { return {id:n.id,title:n.title,type:n.type,summary:String(n.summary||'').slice(0,700),tags:(n.tags||[]).slice(0,12),domains:n._domain?[n.title]:domainTitlesForNode(n),depth:hasKnownDepth(n.depth)?Number(n.depth):null,status:n.status||'unknown',needFraming:n.needFraming||'',approachKind:n.approachKind||'',approachMaturity:n.approachMaturity||'',approachOrigin:n.approachOrigin||'',evidenceKind:n.evidenceKind||''}; }
  function compactDomain(d) { return {id:String(d.id||''),title:String(d.title||''),description:String(d.description||'').slice(0,500),examples:(d.examples||[]).slice(0,10)}; }

  function acceptSuggestion(s) {
    if(!adminAuthenticated){el.aiNote.textContent='Enter Graph Admin once to start an editing session before accepting suggestions.';showAdmin();return;}
    if (!s) return;
    const exists=state.edges.some(e=>samePair(e,s.sourceId,s.candidateId));
    if (!exists) {
      state.edges.push({id:uniqueEdgeId(),source:s.sourceId,target:s.candidateId,label:s.label,rationale:s.rationale,strength:confidenceStrength(s.confidence),provenance:'ai-accepted',updatedAt:new Date().toISOString()});
      saveState();
    }
    ui.suggestions=ui.suggestions.filter(x=>x!==s);
    renderSuggestions(); renderGraph(false); if(ui.selectedId)renderDetail();
  }

  function dismissSuggestion(s) {
    if (!s)return;
    ui.dismissedSuggestions.add(`${s.sourceId}:${s.candidateId}:${s.mode}`);
    ui.suggestions=ui.suggestions.filter(x=>x!==s);
    if(ui.selectedId===s.candidateId)closeDetail();
    renderSuggestions(); renderGraph(false);
  }

  function acceptApplicationSuggestion(s) {
    if(!adminAuthenticated){el.aiNote.textContent='Enter Graph Admin once to start an editing session before adding an application.';showAdmin();return;}
    if(!s)return;
    const node=state.nodes.find(n=>n.id===s.sourceId);
    const domain=domainById(s.domainId);
    if(!node||!domain)return;
    node.domains=Array.from(new Set([...(node.domains||[]),domain.id]));
    node.updatedAt=new Date().toISOString();
    node.domainProvenance={...(node.domainProvenance||{}),[domain.id]:{kind:'ai-suggested-human-accepted',model:s.model||aiModel||'',acceptedAt:new Date().toISOString()}};
    ui.applicationSuggestions=ui.applicationSuggestions.filter(x=>x!==s);
    saveState();
    renderStarterChips(); renderSuggestions(); renderGraph(false); if(ui.selectedId)renderDetail();
    el.aiNote.textContent=`Added ${domain.title} as an application of “${node.title}”. No graph edge was created.`;
  }

  function dismissApplicationSuggestion(s) {
    if(!s)return;
    ui.dismissedApplications.add(`${s.sourceId}:${s.mode}:${s.domainId}`);
    ui.applicationSuggestions=ui.applicationSuggestions.filter(x=>x!==s);
    if(ui.selectedId===domainVirtualId(s.domainId))closeDetail();
    renderSuggestions(); renderGraph(false);
  }

  function acceptMissingSuggestion(s) {
    if(!adminAuthenticated){el.aiNote.textContent='Enter Graph Admin once to start an editing session before adding suggested nodes.';showAdmin();return;}
    if (!s?.node) return;
    const ephemeralId=s.node.id;
    const stableId=uniqueNodeId(s.node.title);
    const seed=nodeById(s.sourceId);
    const accepted={
      ...s.node,
      id:stableId,
      domains:seed?._domain?[seed.domainId]:[...(seed?.domains||[])],
      depth:0,
      status:'open',
      start:'',
      end:'',
      contributors:[],
      conclusion:'',
      revisit:'',
      artifacts:[],
      originKind:'ai-suggested-node',
      originSeedId:s.sourceId,
      originModel:s.model||aiModel||'',
      updatedAt:new Date().toISOString()
    };
    state.nodes.push(accepted);
    if (!seed?._domain && !samePairExists(s.sourceId,stableId)) {
      state.edges.push({id:uniqueEdgeId(),source:s.sourceId,target:stableId,label:s.label||'useful adjacency',rationale:s.rationale||'',strength:confidenceStrength(s.confidence),provenance:'ai-accepted',updatedAt:new Date().toISOString()});
    }
    ui.missingSuggestions=ui.missingSuggestions.filter(x=>x!==s);
    if (ui.selectedId===ephemeralId) ui.selectedId=stableId;
    saveState();
    renderStarterChips(); renderSuggestions(); renderGraph(false);
    if(ui.selectedId===stableId)renderDetail();
    el.aiNote.textContent=seed?._domain?`Added “${accepted.title}” as an unexplored node in ${seed.title}.`:`Added “${accepted.title}” as an unexplored node and saved its relationship to the seed.`;
  }

  function dismissMissingSuggestion(s) {
    if (!s?.node) return;
    ui.dismissedMissing.add(`${s.sourceId}:${s.mode}:${s.node.title}`);
    ui.missingSuggestions=ui.missingSuggestions.filter(x=>x!==s);
    if(ui.selectedId===s.node.id)closeDetail();
    renderSuggestions(); renderGraph(false);
  }

  function confidenceStrength(c) { const n=Number(c||0); return n>=.85?5:n>=.70?4:n>=.52?3:2; }

  function knownEdgesFor(id) {
    return state.edges.filter(e=>e.source===id||e.target===id).sort((a,b)=>(b.strength||3)-(a.strength||3));
  }
  function otherEnd(edge,id) { return edge.source===id?edge.target:edge.source; }
  function samePair(edge,a,b) { return (edge.source===a&&edge.target===b)||(edge.source===b&&edge.target===a); }

  function openNodeDialog(node=null) {
    el.nodeForm.dataset.returnTo = !el.admin.classList.contains('hidden') ? 'admin' : 'map';
    el.nodeForm.reset();
    renderDomainPicker(node?.domains||[]);
    el.nodeForm.querySelectorAll('.advanced-field').forEach(f=>f.classList.add('hidden-advanced'));
    el.toggleAdvanced.textContent='More detail';
    el.nodeDialogEyebrow.textContent=node?'UPDATE THE RECORD':'CAPTURE A BREADCRUMB';
    el.nodeDialogTitle.textContent=node?'Edit node':'Add to the graph';
    const f=el.nodeForm.elements;
    if (node) {
      f.id.value=node.id; f.title.value=node.title||''; f.type.value=node.type||'need'; f.depth.value=hasKnownDepth(node.depth)?String(node.depth):''; f.status.value=node.status||'open';
      f.needFraming.value=node.needFraming||'problem'; f.approachKind.value=node.approachKind||'product'; f.approachMaturity.value=node.approachMaturity||'conceptual'; f.approachOrigin.value=node.approachOrigin||'firstbuild'; f.evidenceKind.value=node.evidenceKind||'observation'; f.strategicContext.value=node.strategicContext||'unknown';
      f.start.value=node.start||''; f.end.value=node.end||''; f.contributors.value=(node.contributors||[]).join(', '); f.summary.value=node.summary||''; f.conclusion.value=node.conclusion||''; f.revisit.value=node.revisit||''; f.aliases.value=(node.aliases||[]).join(', '); f.tags.value=(node.tags||[]).join(', ');
      const a=(node.artifacts||[])[0]; if(a){f.artifactTitle.value=a.title||'';f.artifactUrl.value=a.url||'';}
    } else { f.type.value='need'; f.depth.value='0'; f.status.value='open'; f.needFraming.value='problem'; f.approachKind.value='product'; f.approachMaturity.value='conceptual'; f.approachOrigin.value='firstbuild'; f.evidenceKind.value='observation'; f.strategicContext.value='unknown'; }
    syncTypeFields();
    el.nodeDialog.showModal();
    setTimeout(()=>f.title.focus(),0);
  }

  function saveNodeFromForm(e) {
    e.preventDefault();
    const f=new FormData(el.nodeForm); const existing=f.get('id')?nodeById(f.get('id')):null;
    const artifactTitle=String(f.get('artifactTitle')||'').trim(),artifactUrl=String(f.get('artifactUrl')||'').trim();
    const type=String(f.get('type'));
    const node={
      ...(existing||{}), id:existing?.id||uniqueNodeId(String(f.get('title'))), title:String(f.get('title')).trim(), type, depth:String(f.get('depth')??'')===''?null:Number(f.get('depth')), status:String(f.get('status')),
      start:String(f.get('start')||'').trim(), end:String(f.get('end')||'').trim(), contributors:csv(f.get('contributors')), domains:f.getAll('domains').map(String), strategicContext:String(f.get('strategicContext')||'unknown'), summary:String(f.get('summary')||'').trim(), conclusion:String(f.get('conclusion')||'').trim(), revisit:String(f.get('revisit')||'').trim(), aliases:csv(f.get('aliases')), tags:csv(f.get('tags')),
      artifacts:artifactTitle||artifactUrl?[{title:artifactTitle||'Artifact',url:artifactUrl,type:'link'}]:(existing?.artifacts||[]),
      updatedAt:new Date().toISOString()
    };
    delete node.needFraming; delete node.approachKind; delete node.approachMaturity; delete node.approachOrigin; delete node.evidenceKind;
    if(type==='need') node.needFraming=String(f.get('needFraming')||'problem');
    if(type==='approach') { node.approachKind=String(f.get('approachKind')||'product'); node.approachMaturity=String(f.get('approachMaturity')||'conceptual'); node.approachOrigin=String(f.get('approachOrigin')||'firstbuild'); }
    if(type==='evidence') node.evidenceKind=String(f.get('evidenceKind')||'observation');
    if(existing)Object.assign(existing,node);else state.nodes.push(node);
    saveState(); el.nodeDialog.close(); renderStarterChips(); updateGraphStatus();
    if(el.nodeForm.dataset.returnTo==='admin') { renderAdmin(); return; }
    if(existing && ui.seedId) { el.seedTitle.textContent=nodeById(ui.seedId)?.title||''; renderGraph(false); if(ui.selectedId===node.id)renderDetail(); }
    else enterExplorer(node.id);
  }

  function openRelationshipDialog(source=null, edge=null) {
    el.relationshipForm.dataset.returnTo = !el.admin.classList.contains('hidden') ? 'admin' : 'map';
    el.relationshipForm.reset();
    const nodes=[...state.nodes].sort((a,b)=>a.title.localeCompare(b.title));
    el.relSource.innerHTML=''; el.relTarget.innerHTML='';
    nodes.forEach(n=>{
      el.relSource.appendChild(option(n.id,`${n.title} · ${TYPE_LABELS[n.type]||n.type}`));
      el.relTarget.appendChild(option(n.id,`${n.title} · ${TYPE_LABELS[n.type]||n.type}`));
    });
    const f=el.relationshipForm.elements;
    f.id.value=edge?.id||'';
    el.relationshipDialogTitle.textContent=edge?'Edit relationship':'Add known relationship';
    if(edge){
      f.source.value=edge.source; f.target.value=edge.target; f.label.value=edge.label||''; f.rationale.value=edge.rationale||''; f.strength.value=String(edge.strength||3);
    } else if(source) {
      f.source.value=source.id;
      const first=nodes.find(n=>n.id!==source.id); if(first)f.target.value=first.id;
    }
    el.relationshipDialog.showModal();
  }

  function saveRelationship(e) {
    e.preventDefault();
    const f=new FormData(el.relationshipForm),id=String(f.get('id')||''),source=String(f.get('source')),target=String(f.get('target'));
    if(!source||!target||source===target){ return; }
    const existing=id?state.edges.find(edge=>edge.id===id):null;
    if(samePairExists(source,target,id)){ el.relationshipDialog.close(); return; }
    const edge={
      ...(existing||{}), id:existing?.id||uniqueEdgeId(), source, target,
      label:String(f.get('label')||'practical relevance').trim(), rationale:String(f.get('rationale')||'').trim(),
      strength:Number(f.get('strength')||3), provenance:existing?.provenance||'manual', updatedAt:new Date().toISOString()
    };
    if(existing)Object.assign(existing,edge);else state.edges.push(edge);
    saveState(); el.relationshipDialog.close(); updateGraphStatus();
    if(el.relationshipForm.dataset.returnTo==='admin'){renderAdmin();return;}
    if(ui.seedId)renderGraph(true); if(ui.selectedId)renderDetail();
  }

  function samePairExists(a,b,excludeId=''){return state.edges.some(e=>e.id!==excludeId&&samePair(e,a,b));}

  async function refreshAdminSession() {
    try {
      const res=await fetch('/api/admin-session',{headers:{Accept:'application/json'},cache:'no-store'});
      const data=await res.json();
      graphMeta.adminPasswordConfigured=!!data.configured;
      adminAuthenticated=!!data.authenticated;
      return data;
    } catch (_) {
      adminAuthenticated=false;
      return {configured:false,authenticated:false};
    }
  }

  async function showAdmin() {
    closeDetail();
    const auth=await refreshAdminSession();
    if (!auth.configured) {
      el.adminLoginForm.reset();
      el.adminLoginNote.textContent='Graph Admin is not configured yet. Add GRAPH_ADMIN_PASSWORD in Vercel and redeploy.';
      el.adminLoginNote.classList.add('error');
      el.adminLoginDialog.showModal();
      return;
    }
    if (!auth.authenticated) {
      el.adminLoginForm.reset();
      el.adminLoginNote.textContent='Enter the Graph Admin password to start an editing session. The password is verified once by the server and is not stored in browser storage.';
      el.adminLoginNote.classList.remove('error');
      el.adminLoginDialog.showModal();
      setTimeout(()=>el.adminLoginForm.elements.password.focus(),0);
      return;
    }
    enterAdminView();
  }

  function enterAdminView() {
    el.landing.classList.add('hidden');
    el.explorer.classList.add('hidden');
    el.admin.classList.remove('hidden');
    el.explorerSearchWrap.classList.add('hidden');
    el.newExploration.classList.add('hidden');
    renderAdmin();
  }

  async function loginAdmin(e) {
    e.preventDefault();
    const password=String(new FormData(el.adminLoginForm).get('password')||'');
    el.adminLoginNote.textContent='Checking password…';
    el.adminLoginNote.classList.remove('error');
    try {
      const res=await fetch('/api/admin-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Unable to enter Graph Admin.');
      adminAuthenticated=true;
      el.adminLoginDialog.close();
      el.adminLoginForm.reset();
      enterAdminView();
    } catch(error) {
      adminAuthenticated=false;
      el.adminLoginNote.textContent=error.message;
      el.adminLoginNote.classList.add('error');
      el.adminLoginForm.elements.password.select();
    }
  }

  async function logoutAdmin() {
    try { await fetch('/api/admin-session',{method:'DELETE'}); } catch (_) {}
    adminAuthenticated=false;
    setAdminSaveState('Logged out.');
    showLanding();
  }

  function renderAdmin() {
    const q=normalize(el.adminSearch.value);
    el.adminDomainsTab.classList.toggle('active',adminTab==='domains');
    el.adminNodesTab.classList.toggle('active',adminTab==='nodes');
    el.adminEdgesTab.classList.toggle('active',adminTab==='edges');
    el.adminAddDomain.classList.toggle('hidden',adminTab!=='domains');
    el.adminAdd.classList.toggle('hidden',adminTab!=='nodes');
    el.adminAddEdge.classList.toggle('hidden',adminTab!=='edges');
    el.adminAddEdge.disabled=state.nodes.length<2;
    el.adminCounts.textContent=`${state.domains.length} domains · ${state.nodes.length} nodes · ${state.edges.length} connections`;
    updateGraphStatus();
    if(adminTab==='domains') renderAdminDomains(q);
    else if(adminTab==='nodes') renderAdminNodes(q);
    else renderAdminEdges(q);
  }

  function renderAdminDomains(q) {
    const rows=state.domains.filter(d=>!q||normalize(`${d.title} ${d.description||''} ${(d.examples||[]).join(' ')}`).includes(q)).sort((a,b)=>a.title.localeCompare(b.title));
    el.adminTableHead.innerHTML='<tr><th>Domain</th><th>Description</th><th>Examples</th><th>Graph nodes</th><th></th></tr>';
    el.adminTableBody.innerHTML=rows.map(d=>`<tr data-id="${escapeAttr(d.id)}"><td><strong>${escapeHtml(d.title)}</strong><small>${escapeHtml(d.id)}</small></td><td>${escapeHtml(d.description||'—')}</td><td><span class="admin-domain-examples">${escapeHtml((d.examples||[]).join(', ')||'—')}</span></td><td>${domainMembers(d.id).length}</td><td class="row-actions"><button data-action="explore">Explore</button><button data-action="edit">Edit</button><button data-action="delete" class="danger-link">Delete</button></td></tr>`).join('');
    el.adminEmpty.classList.toggle('hidden',rows.length>0);
    if(!rows.length)el.adminEmpty.innerHTML='<strong>No domains match this filter.</strong>';
    el.adminTableBody.querySelectorAll('tr').forEach(row=>{
      const d=domainById(row.dataset.id);
      row.querySelector('[data-action="explore"]').addEventListener('click',()=>enterExplorer(domainVirtualId(d.id)));
      row.querySelector('[data-action="edit"]').addEventListener('click',()=>openDomainDialog(d));
      row.querySelector('[data-action="delete"]').addEventListener('click',()=>deleteDomain(d));
    });
  }

  function renderAdminNodes(q) {
    const rows=state.nodes.filter(n=>!q||normalize(`${n.title} ${(n.aliases||[]).join(' ')} ${n.type} ${n.status} ${strategicContextLabel(n.strategicContext||'unknown')} ${(n.tags||[]).join(' ')} ${(n.contributors||[]).join(' ')} ${domainTitlesForNode(n).join(' ')}`).includes(q)).sort((a,b)=>a.title.localeCompare(b.title));
    el.adminTableHead.innerHTML='<tr><th>Node</th><th>Type</th><th>Domains</th><th>Strategic context</th><th>Depth</th><th>Status</th><th>Activity</th><th></th></tr>';
    el.adminTableBody.innerHTML=rows.map(n=>`<tr data-id="${escapeAttr(n.id)}"><td><strong>${escapeHtml(n.title)}</strong><small>${escapeHtml(n.summary||'No summary recorded.')}</small></td><td><strong>${escapeHtml(TYPE_LABELS[n.type]||n.type)}</strong><small>${escapeHtml(classificationLabel(n)||'—')}</small></td><td>${domainTitlesForNode(n).map(d=>`<span class="domain-pill">${escapeHtml(d)}</span>`).join('')||'—'}</td><td>${escapeHtml(strategicContextLabel(n.strategicContext||'unknown'))}</td><td>${escapeHtml(depthText(n.depth))}</td><td>${escapeHtml(titleCase(n.status||'unknown'))}</td><td>${escapeHtml(activityLabel(n))}</td><td class="row-actions"><button data-action="edit">Edit</button><button data-action="delete" class="danger-link">Delete</button></td></tr>`).join('');
    el.adminEmpty.classList.toggle('hidden',rows.length>0);
    if(!rows.length){el.adminEmpty.innerHTML=state.nodes.length?'No nodes match this filter.':'<strong>The trusted graph contains no exploration nodes yet.</strong><span>The canonical domains are taxonomy, not graph nodes. Add the first verified exploration record when ready.</span><button class="button button-primary" data-action="first-node">+ Add first node</button>';el.adminEmpty.querySelector('[data-action="first-node"]')?.addEventListener('click',()=>openNodeDialog());}
    el.adminTableBody.querySelectorAll('tr').forEach(row=>{
      const n=nodeById(row.dataset.id);
      row.querySelector('[data-action="edit"]').addEventListener('click',()=>openNodeDialog(n));
      row.querySelector('[data-action="delete"]').addEventListener('click',()=>deleteNode(n));
    });
  }

  function renderAdminEdges(q) {
    const rows=state.edges.map(edge=>({edge,a:nodeById(edge.source),b:nodeById(edge.target)})).filter(x=>x.a&&x.b).filter(x=>!q||normalize(`${x.a.title} ${x.edge.label} ${x.b.title} ${x.edge.rationale||''} ${x.edge.provenance||''}`).includes(q)).sort((x,y)=>x.a.title.localeCompare(y.a.title)||x.b.title.localeCompare(y.b.title));
    el.adminTableHead.innerHTML='<tr><th>Node A</th><th>Relationship</th><th>Node B</th><th>Strength</th><th>Source</th><th></th></tr>';
    el.adminTableBody.innerHTML=rows.map(({edge,a,b})=>`<tr data-id="${escapeAttr(edge.id)}"><td><strong>${escapeHtml(a.title)}</strong></td><td><strong>${escapeHtml(edge.label||'practical relevance')}</strong><small>${escapeHtml(edge.rationale||'No rationale recorded.')}</small></td><td><strong>${escapeHtml(b.title)}</strong></td><td>${Number(edge.strength||3)}</td><td>${escapeHtml(edge.provenance==='ai-accepted'?'AI suggested · human accepted':'Human')}</td><td class="row-actions"><button data-action="edit">Edit</button><button data-action="delete" class="danger-link">Delete</button></td></tr>`).join('');
    el.adminEmpty.classList.toggle('hidden',rows.length>0);
    if(!rows.length){el.adminEmpty.innerHTML=state.edges.length?'No connections match this filter.':'<strong>No practical-relevance connections yet.</strong><span>Connections can be added manually or accepted from AI suggestions.</span>'; }
    el.adminTableBody.querySelectorAll('tr').forEach(row=>{
      const edge=state.edges.find(e=>e.id===row.dataset.id);
      row.querySelector('[data-action="edit"]').addEventListener('click',()=>openRelationshipDialog(null,edge));
      row.querySelector('[data-action="delete"]').addEventListener('click',()=>deleteEdge(edge));
    });
  }

  function openDomainDialog(domain=null) {
    el.domainForm.reset();
    const f=el.domainForm.elements;
    f.id.value=domain?.id||'';
    f.title.value=domain?.title||'';
    f.description.value=domain?.description||'';
    f.examples.value=(domain?.examples||[]).join(', ');
    el.domainDialogTitle.textContent=domain?'Edit domain':'Add domain';
    el.domainDialog.showModal();
    setTimeout(()=>f.title.focus(),0);
  }

  function saveDomain(e) {
    e.preventDefault();
    const f=new FormData(el.domainForm), id=String(f.get('id')||''), existing=id?domainById(id):null;
    const title=String(f.get('title')||'').trim();
    if(!title)return;
    const domain={...(existing||{}),id:existing?.id||uniqueDomainId(title),title,description:String(f.get('description')||'').trim(),examples:csv(f.get('examples'))};
    if(existing)Object.assign(existing,domain);else state.domains.push(domain);
    renderDomainPicker();
    saveState();
    el.domainDialog.close();
    renderStarterChips();
    renderAdmin();
  }

  function deleteDomain(domain) {
    if(!domain)return;
    const members=domainMembers(domain.id);
    if(members.length){alert(`“${domain.title}” is assigned to ${members.length} graph node${members.length===1?'':'s'}. Reassign those nodes before deleting the domain.`);return;}
    if(!confirm(`Delete the canonical domain “${domain.title}”?`))return;
    state.domains=state.domains.filter(d=>d.id!==domain.id);
    renderDomainPicker();
    saveState();renderStarterChips();renderAdmin();
  }

  function deleteNode(node) {
    if(!node||node._domain||!confirm(`Delete “${node.title}” and all of its connections?`))return;
    state.nodes=state.nodes.filter(n=>n.id!==node.id); state.edges=state.edges.filter(e=>e.source!==node.id&&e.target!==node.id);
    saveState(); renderStarterChips(); renderAdmin(); updateGraphStatus();
  }

  function deleteEdge(edge) {
    if(!edge||!confirm('Delete this practical-relevance connection?'))return;
    state.edges=state.edges.filter(e=>e.id!==edge.id); saveState(); renderAdmin(); updateGraphStatus();
  }

  async function exportYaml() {
    try {
      const res=await fetch('/api/graph?format=yaml',{cache:'no-store'});
      if(!res.ok)throw new Error(`export failed (${res.status})`);
      const blob=await res.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='exploration-graph.yaml';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    } catch(error){setAdminSaveState(`Export failed: ${error.message}`,true);}
  }

  async function importYaml() {
    const file=el.adminImportFile.files?.[0]; if(!file)return;
    if(!confirm(`Replace the shared Exploration Graph with ${file.name}? The uploaded YAML must pass validation.`)){el.adminImportFile.value='';return;}
    try {
      if(!adminAuthenticated)throw new Error('Graph Admin session required');
      const text=await file.text(); setAdminSaveState('Validating and importing…');
      const res=await fetch('/api/graph',{method:'PUT',headers:{'Content-Type':'application/yaml','X-Graph-Revision':String(graphMeta.revision)},body:text});
      const data=await res.json(); if(!res.ok)throw new Error(data.details?.join('; ')||data.error||`import failed (${res.status})`);
      state={domains:data.graph.domains||[],nodes:data.graph.nodes||[],edges:data.graph.edges||[],meta:data.graph.meta||{}}; graphMeta.revision=Number(state.meta.revision||0); graphMeta.source='blob';
      renderDomainPicker();renderStarterChips();renderAdmin();updateGraphStatus();setAdminSaveState(`Imported · revision ${graphMeta.revision}`);
    } catch(error){setAdminSaveState(`Import failed: ${error.message}`,true);} finally {el.adminImportFile.value='';}
  }

  function shortDate(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.valueOf())?String(value):d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});}

  function fitNetwork(animate=true) {
    if (!renderModel?.nodes?.length) return;
    const r=el.map.getBoundingClientRect(); if(!r.width||!r.height)return;
    const xs=renderModel.nodes.map(n=>n._pos.x), ys=renderModel.nodes.map(n=>n._pos.y);
    let minX=Math.min(...xs)-110,maxX=Math.max(...xs)+110,minY=Math.min(...ys)-80,maxY=Math.max(...ys)+80;
    const scale=clamp(Math.min((r.width-70)/(maxX-minX),(r.height-90)/(maxY-minY)),.38,1.25);
    const target={scale,x:r.width/2-((minX+maxX)/2)*scale,y:r.height/2-((minY+maxY)/2)*scale};
    animate?animateView(target):(view=target,applyTransform());
  }

  function onMapPointerDown(e) {
    if(e.target.closest?.('.node'))return;
    pointer={kind:'pan',id:e.pointerId,startX:e.clientX,startY:e.clientY,viewX:view.x,viewY:view.y};
    el.map.setPointerCapture?.(e.pointerId);
  }
  function onMapPointerMove(e) { if(pointer?.kind==='pan'&&pointer.id===e.pointerId){view.x=pointer.viewX+(e.clientX-pointer.startX);view.y=pointer.viewY+(e.clientY-pointer.startY);applyTransform();} }
  function onMapPointerUp(e) {
    if(pointer?.id!==e.pointerId)return;
    const moved=Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>5;
    if(pointer.kind==='pan'&&!moved&&e.target===el.mapBg)closeDetail();
    pointer=null; try{el.map.releasePointerCapture(e.pointerId)}catch(_){}
  }
  function onMapWheel(e) {
    e.preventDefault(); const rect=el.map.getBoundingClientRect(),cx=e.clientX-rect.left,cy=e.clientY-rect.top,old=view.scale,next=clamp(old*Math.exp(-e.deltaY*.0012),.25,2.3),gx=(cx-view.x)/old,gy=(cy-view.y)/old;
    view.scale=next;view.x=cx-gx*next;view.y=cy-gy*next;applyTransform();
  }
  function zoomAt(factor){const r=el.map.getBoundingClientRect(),cx=r.width/2,cy=r.height/2,old=view.scale,next=clamp(old*factor,.25,2.3),gx=(cx-view.x)/old,gy=(cy-view.y)/old;view.scale=next;view.x=cx-gx*next;view.y=cy-gy*next;applyTransform();}
  function applyTransform(){el.viewport.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.scale})`);}
  function animateView(target){const start={...view},t0=performance.now(),duration=260;function frame(now){const p=Math.min(1,(now-t0)/duration),ease=1-Math.pow(1-p,3);view={x:lerp(start.x,target.x,ease),y:lerp(start.y,target.y,ease),scale:lerp(start.scale,target.scale,ease)};applyTransform();if(p<1)requestAnimationFrame(frame);}requestAnimationFrame(frame);}

  function artifactHtml(a){const title=escapeHtml(a.title||'Artifact'),type=escapeHtml(a.type||'link');return a.url?`<a class="artifact" href="${escapeAttr(a.url)}" target="_blank" rel="noreferrer">${title}<small>${type} ↗</small></a>`:`<div class="artifact">${title}<small>${type}</small></div>`;}
  function domainVirtualId(id){return `domain:${id}`;}
  function domainById(id){return state.domains.find(d=>d.id===id);}
  function domainAsNode(domain){return domain?{id:domainVirtualId(domain.id),domainId:domain.id,title:domain.title,type:'domain',summary:domain.description||'',tags:domain.examples||[],depth:0,status:'canonical',_domain:true}:null;}
  function domainMembers(id){return state.nodes.filter(n=>(n.domains||[]).includes(id));}
  function domainTitlesForNode(node){return (node.domains||[]).map(id=>domainById(id)?.title).filter(Boolean);}
  function nodeById(id){if(String(id||'').startsWith('domain:'))return domainAsNode(domainById(String(id).slice(7)));return state.nodes.find(n=>n.id===id) || ui?.missingSuggestions?.find(s=>s.node.id===id)?.node;}
  function activityLabel(n){if(n?._domain)return 'Canonical taxonomy';return n.start&&n.end?`${n.start}–${n.end}`:n.start||n.end||'Unknown';}
  function typeAbbrev(t){return ({domain:'DMN',need:'N',approach:'A',evidence:'E'})[t]||'•';}
  function normalize(v){return String(v||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();}
  function titleCase(s){return String(s||'').replace(/(^|[-_\s])\w/g,m=>m.toUpperCase()).replace(/[-_]/g,' ');}
  function csv(v){return String(v||'').split(',').map(s=>s.trim()).filter(Boolean);}
  function uniqueDomainId(title){const base=normalize(title).replace(/\s+/g,'-').slice(0,42)||'domain';let id=base,n=2;while(domainById(id))id=`${base}-${n++}`;return id;}
  function uniqueNodeId(title){const base=normalize(title).replace(/\s+/g,'-').slice(0,36)||'node';return `${base}-${Date.now().toString(36)}`;}
  function uniqueEdgeId(){return `edge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;}
  function wrapTitle(title,max){const words=String(title).split(/\s+/),lines=[''];for(const word of words){const current=lines[lines.length-1];if((current+' '+word).trim().length<=max||!current)lines[lines.length-1]=(current+' '+word).trim();else if(lines.length<2)lines.push(word);else{lines[1]=(lines[1]+' '+word).trim();}}if(lines[1]&&lines[1].length>max+5)lines[1]=lines[1].slice(0,max+2)+'…';return lines;}
  function highlight(text,q){const safe=escapeHtml(text),tokens=normalize(q).split(/\s+/).filter(t=>t.length>1);if(!tokens.length)return safe;const re=new RegExp(`(${tokens.map(escapeRegex).join('|')})`,'ig');return safe.replace(re,'<mark>$1</mark>');}
  function escapeRegex(v){return v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
  function lerp(a,b,t){return a+(b-a)*t;}
  function svg(tag,attrs={}){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));return n;}
  function escapeHtml(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function escapeAttr(v){return escapeHtml(v).replace(/'/g,'&#39;');}
})();
