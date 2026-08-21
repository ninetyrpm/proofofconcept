const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const adminAuth = require('../lib/admin-auth');

const BLOB_PATH = 'firstbuild/exploration-graph.yaml';
const ALLOWED_TYPES = new Set(['need','approach','evidence']);
const NEED_FRAMINGS = new Set(['problem','desired-outcome','job','opportunity-hypothesis']);
const APPROACH_KINDS = new Set(['product','feature','technology','platform','process','service','workaround','other','unknown']);
const APPROACH_MATURITIES = new Set(['conceptual','prototyped','validated','launched','retired','unknown']);
const APPROACH_ORIGINS = new Set(['firstbuild','gea','external','user-workaround','unknown']);
const STRATEGIC_CONTEXTS = new Set(['gea-core','gea-internal','gea-adjacent','external','unknown']);
const EVIDENCE_KINDS = new Set(['observation','research-finding','test-result','technical-finding','market-data','synthesized-insight']);
const ALLOWED_STATUSES = new Set(['open','active','promising','inconclusive','paused','pivoted','stopped','productized','unknown']);
const MAX_BODY_CHARS = 2_000_000;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return handleGet(req, res);
    if (req.method === 'PUT') return handlePut(req, res);
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Graph API error:', error);
    return res.status(500).json({ error: 'Unable to read or update the Exploration Graph.' });
  }
};

async function handleGet(req, res) {
  const loaded = await loadGraph();
  if (String(req.query?.format || '').toLowerCase() === 'yaml') {
    res.setHeader('Content-Type', 'application/yaml; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="exploration-graph.yaml"');
    return res.status(200).send(stringifyGraph(loaded.graph));
  }
  return res.status(200).json({
    graph: loaded.graph,
    source: loaded.source,
    persistenceConfigured: isPersistenceConfigured(),
    adminPasswordConfigured: adminAuth.configured()
  });
}

async function handlePut(req, res) {
  if (!isPersistenceConfigured()) {
    return res.status(503).json({ error: 'Persistent graph storage is not configured. Connect a Vercel Blob store first.' });
  }
  if (!adminAuth.configured()) {
    return res.status(503).json({ error: 'GRAPH_ADMIN_PASSWORD is not configured.' });
  }
  if (!adminAuth.verifySession(req)) {
    return res.status(401).json({ error: 'Graph Admin session required. Re-enter Graph Admin.' });
  }

  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (raw.length > MAX_BODY_CHARS) return res.status(413).json({ error: 'Graph payload is too large.' });

  let incoming;
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('yaml') || contentType.includes('text/plain')) incoming = YAML.parse(raw);
  else incoming = typeof req.body === 'object' && req.body !== null ? req.body.graph || req.body : JSON.parse(raw || '{}');

  const graph = normalizeGraph(incoming);
  const errors = validateGraph(graph);
  if (errors.length) return res.status(400).json({ error: 'Graph validation failed.', details: errors.slice(0, 40) });

  const current = await loadGraph();
  const expectedRevision = Number(req.headers['x-graph-revision']);
  const currentRevision = Number(current.graph.meta?.revision || 0);
  if (Number.isFinite(expectedRevision) && expectedRevision !== currentRevision) {
    return res.status(409).json({ error: 'The graph changed since you loaded it. Reload before saving.', revision: currentRevision });
  }

  graph.meta = {
    ...(graph.meta || {}),
    version: 5,
    revision: currentRevision + 1,
    status: 'trusted',
    updatedAt: new Date().toISOString()
  };

  const yaml = stringifyGraph(graph);
  const { put } = await import('@vercel/blob');
  await put(BLOB_PATH, yaml, {
    ...blobAuthOptions(),
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/yaml; charset=utf-8'
  });

  return res.status(200).json({ graph, source: 'blob', saved: true });
}

async function loadGraph() {
  if (isPersistenceConfigured()) {
    try {
      const { get } = await import('@vercel/blob');
      const result = await get(BLOB_PATH, { ...blobAuthOptions(), access: 'private', useCache: false });
      if (result?.statusCode === 200) {
        const text = await new Response(result.stream).text();
        const persisted = normalizeGraph(YAML.parse(text));
        const beforeImports = appliedImportIds(persisted);
        const graph = migrateGraph(persisted);
        const errors = validateGraph(graph);
        if (!errors.length) {
          const afterImports = appliedImportIds(graph);
          const newlyApplied = [...afterImports].filter(id => !beforeImports.has(id));
          if (newlyApplied.length) {
            try { await persistMigration(graph, Number(persisted.meta?.revision || 0), newlyApplied); }
            catch (migrationError) { console.error('Unable to persist Exploration Graph seed import:', migrationError); }
          }
          return { graph, source: 'blob' };
        }
        console.error('Persisted graph failed validation:', errors);
      }
    } catch (error) {
      const msg = String(error?.message || error);
      if (!/not found/i.test(msg)) console.error('Unable to read persisted graph:', error);
    }
  }
  return { graph: readSeedGraph(), source: 'seed-yaml' };
}

async function persistMigration(graph, currentRevision, importIds) {
  const nextMeta = {
    ...(graph.meta || {}),
    version: 5,
    revision: currentRevision + 1,
    status: 'trusted',
    seedImportAppliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const nextGraph = { ...graph, meta: nextMeta };
  const { put } = await import('@vercel/blob');
  await put(BLOB_PATH, stringifyGraph(nextGraph), {
    ...blobAuthOptions(),
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/yaml; charset=utf-8'
  });
  graph.meta = nextMeta;
  console.log(`Applied Exploration Graph seed import(s): ${importIds.join(', ')}`);
}

function isPersistenceConfigured() {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

function blobAuthOptions() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return { token: process.env.BLOB_READ_WRITE_TOKEN };
  if (process.env.BLOB_STORE_ID) {
    const options = { storeId: process.env.BLOB_STORE_ID };
    if (process.env.VERCEL_OIDC_TOKEN) options.oidcToken = process.env.VERCEL_OIDC_TOKEN;
    return options;
  }
  return {};
}

function readSeedGraph() {
  const seedPath = path.join(process.cwd(), 'data', 'exploration-graph.yaml');
  return normalizeGraph(YAML.parse(fs.readFileSync(seedPath, 'utf8')));
}

function migrateGraph(graph) {
  const version = Number(graph.meta?.version || 1);
  const seed = readSeedGraph();
  if (version >= 3) return applySeedImport(graph, seed); 
  const typeMap = { space:'need', problem:'need', need:'need', opportunity:'need', concept:'approach', prototype:'approach', product:'approach', insight:'evidence', learning:'evidence' };
  const migratedNodes=(graph.nodes||[]).filter(node=>node?.type!=='decision').map(node=>{
    const legacyType=node.type;
    const type=typeMap[legacyType]||legacyType;
    const next={...node,type,domains:Array.isArray(node.domains)?node.domains:[],legacyType};
    if(type==='need'&&!next.needFraming) next.needFraming=legacyType==='problem'?'problem':legacyType==='opportunity'?'opportunity-hypothesis':'desired-outcome';
    if(type==='approach'){ if(!next.approachKind) next.approachKind=legacyType==='product'?'product':'other'; if(!next.approachMaturity) next.approachMaturity=legacyType==='prototype'?'prototyped':'conceptual'; if(!next.approachOrigin) next.approachOrigin='firstbuild'; }
    if(type==='evidence'&&!next.evidenceKind) next.evidenceKind=legacyType==='insight'?'synthesized-insight':'test-result';
    return next;
  });
  const keptIds=new Set(migratedNodes.map(node=>node.id));
  const migrated = {
    ...graph,
    meta: { ...(graph.meta || {}), version: 5 },
    domains: graph.domains?.length ? graph.domains : seed.domains,
    nodes: migratedNodes,
    edges: (graph.edges||[]).filter(edge=>keptIds.has(edge.source)&&keptIds.has(edge.target))
  };
  return applySeedImport(migrated, seed);
}

function appliedImportIds(graph) {
  const applied = new Set(Array.isArray(graph.meta?.imports) ? graph.meta.imports.filter(Boolean) : []);
  if (graph.meta?.seedImport) applied.add(String(graph.meta.seedImport));
  return applied;
}

function seedImportSpecs(seed) {
  const specs = [];
  const legacy = String(seed.meta?.seedImport || '');
  if (legacy) specs.push({ id: legacy, all: true });
  for (const entry of Array.isArray(seed.meta?.seedImports) ? seed.meta.seedImports : []) {
    if (typeof entry === 'string' && entry) specs.push({ id: entry, all: true });
    else if (entry && typeof entry === 'object' && entry.id) {
      specs.push({
        id: String(entry.id),
        all: false,
        nodes: Array.isArray(entry.nodes) ? entry.nodes : [],
        edges: Array.isArray(entry.edges) ? entry.edges : [],
        domains: Array.isArray(entry.domains) ? entry.domains : [],
        nodeDomainAdds: entry.nodeDomainAdds && typeof entry.nodeDomainAdds === 'object' ? entry.nodeDomainAdds : {},
        nodeDomainRemoves: entry.nodeDomainRemoves && typeof entry.nodeDomainRemoves === 'object' ? entry.nodeDomainRemoves : {},
        nodeFieldSets: entry.nodeFieldSets && typeof entry.nodeFieldSets === 'object' ? entry.nodeFieldSets : {}
      });
    }
  }
  return specs;
}

function applySeedImport(graph, seed) {
  const specs = seedImportSpecs(seed);
  if (!specs.length) return { ...graph, meta: { ...(graph.meta || {}), version: 5 } };

  const applied = appliedImportIds(graph);
  let domains = [...(graph.domains || [])];
  let nodes = [...(graph.nodes || [])];
  let edges = [...(graph.edges || [])];

  for (const spec of specs) {
    if (applied.has(spec.id)) continue;

    const wantedDomains = spec.all ? (seed.domains || []) : (seed.domains || []).filter(d => spec.domains.includes(d.id));
    const wantedNodes = spec.all ? (seed.nodes || []) : (seed.nodes || []).filter(n => spec.nodes.includes(n.id));
    const wantedEdges = spec.all ? (seed.edges || []) : (seed.edges || []).filter(e => spec.edges.includes(e.id));

    const domainIds = new Set(domains.map(d => d.id));
    const nodeIds = new Set(nodes.map(n => n.id));
    const edgeIds = new Set(edges.map(e => e.id));
    domains = [...domains, ...wantedDomains.filter(d => !domainIds.has(d.id))];
    nodes = [...nodes, ...wantedNodes.filter(n => !nodeIds.has(n.id))];

    const mergedDomainIds = new Set(domains.map(d => d.id));
    for (const [domainId, memberIds] of Object.entries(spec.nodeDomainAdds || {})) {
      if (!mergedDomainIds.has(domainId) || !Array.isArray(memberIds)) continue;
      const wantedMembers = new Set(memberIds.map(String));
      nodes = nodes.map(node => wantedMembers.has(node.id)
        ? { ...node, domains: Array.from(new Set([...(node.domains || []), domainId])) }
        : node);
    }

    for (const [domainId, memberIds] of Object.entries(spec.nodeDomainRemoves || {})) {
      if (!Array.isArray(memberIds)) continue;
      const wantedMembers = new Set(memberIds.map(String));
      nodes = nodes.map(node => wantedMembers.has(node.id)
        ? { ...node, domains: (node.domains || []).filter(id => id !== domainId) }
        : node);
    }

    for (const [nodeId, fields] of Object.entries(spec.nodeFieldSets || {})) {
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) continue;
      nodes = nodes.map(node => node.id === nodeId ? { ...node, ...fields, id: node.id } : node);
    }

    const mergedNodeIds = new Set(nodes.map(n => n.id));
    edges = [...edges, ...wantedEdges.filter(e => !edgeIds.has(e.id) && mergedNodeIds.has(e.source) && mergedNodeIds.has(e.target))];
    applied.add(spec.id);
  }

  return {
    ...graph,
    meta: { ...(graph.meta || {}), version: 5, imports: [...applied] },
    domains,
    nodes,
    edges
  };
}

function normalizeGraph(value) {
  const graph = value && typeof value === 'object' ? value : {};
  return {
    meta: graph.meta && typeof graph.meta === 'object' ? graph.meta : { version: 5, revision: 0 },
    domains: Array.isArray(graph.domains) ? graph.domains : [],
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : []
  };
}

function validateGraph(graph) {
  const errors = [];
  const domainIds = new Set();
  for (const [i, domain] of graph.domains.entries()) {
    if (!domain || typeof domain !== 'object') { errors.push(`domains[${i}] must be an object`); continue; }
    if (!domain.id || typeof domain.id !== 'string') errors.push(`domains[${i}] is missing a string id`);
    else if (domainIds.has(domain.id)) errors.push(`duplicate domain id: ${domain.id}`);
    else domainIds.add(domain.id);
    if (!domain.title || typeof domain.title !== 'string') errors.push(`domain ${domain.id || i} is missing title`);
    if (domain.examples && !Array.isArray(domain.examples)) errors.push(`domain ${domain.id || i} examples must be an array`);
  }

  const ids = new Set();
  for (const [i, node] of graph.nodes.entries()) {
    if (!node || typeof node !== 'object') { errors.push(`nodes[${i}] must be an object`); continue; }
    if (!node.id || typeof node.id !== 'string') errors.push(`nodes[${i}] is missing a string id`);
    else if (ids.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
    else ids.add(node.id);
    if (!node.title || typeof node.title !== 'string') errors.push(`node ${node.id || i} is missing title`);
    if (!ALLOWED_TYPES.has(node.type)) errors.push(`node ${node.id || i} has invalid type: ${node.type}`);
    if (node.depth !== null && node.depth !== undefined && node.depth !== '') {
      const depth = Number(node.depth);
      if (!Number.isInteger(depth) || depth < 0 || depth > 5) errors.push(`node ${node.id || i} has invalid depth`);
    }
    if (node.status && !ALLOWED_STATUSES.has(node.status)) errors.push(`node ${node.id || i} has invalid status: ${node.status}`);
    if (node.strategicContext && !STRATEGIC_CONTEXTS.has(node.strategicContext)) errors.push(`node ${node.id || i} has invalid strategicContext: ${node.strategicContext}`);
    if (node.type === 'need' && !NEED_FRAMINGS.has(node.needFraming)) errors.push(`node ${node.id || i} requires a valid needFraming`);
    if (node.type === 'approach') {
      if (!APPROACH_KINDS.has(node.approachKind)) errors.push(`node ${node.id || i} requires a valid approachKind`);
      if (!APPROACH_MATURITIES.has(node.approachMaturity)) errors.push(`node ${node.id || i} requires a valid approachMaturity`);
      if (!APPROACH_ORIGINS.has(node.approachOrigin)) errors.push(`node ${node.id || i} requires a valid approachOrigin`);
    }
    if (node.type === 'evidence' && !EVIDENCE_KINDS.has(node.evidenceKind)) errors.push(`node ${node.id || i} requires a valid evidenceKind`);
    if (node.domains && !Array.isArray(node.domains)) errors.push(`node ${node.id || i} domains must be an array`);
    for (const domainId of node.domains || []) {
      if (!domainIds.has(domainId)) errors.push(`node ${node.id || i} references missing domain: ${domainId}`);
    }
  }

  const edgeIds = new Set();
  for (const [i, edge] of graph.edges.entries()) {
    if (!edge || typeof edge !== 'object') { errors.push(`edges[${i}] must be an object`); continue; }
    if (!edge.id || typeof edge.id !== 'string') errors.push(`edges[${i}] is missing a string id`);
    else if (edgeIds.has(edge.id)) errors.push(`duplicate edge id: ${edge.id}`);
    else edgeIds.add(edge.id);
    if (!ids.has(edge.source)) errors.push(`edge ${edge.id || i} references missing source: ${edge.source}`);
    if (!ids.has(edge.target)) errors.push(`edge ${edge.id || i} references missing target: ${edge.target}`);
    if (edge.source === edge.target) errors.push(`edge ${edge.id || i} cannot connect a node to itself`);
  }
  return errors;
}

function stringifyGraph(graph) {
  return YAML.stringify(graph, { lineWidth: 100, indent: 2 });
}
