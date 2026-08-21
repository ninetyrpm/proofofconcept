# FirstBuild Exploration Map

A Vercel-ready, query-centered interface over the **FirstBuild Exploration Graph**: trusted institutional knowledge represented as a small NABC-derived node ontology plus practical-relevance connections. The UI explores a local neighborhood around a chosen seed instead of rendering one giant network.

## Core ontology

The canonical graph deliberately has only **three graph node types**:

- **Need** — something worth solving: a problem, desired outcome, job to be done, or opportunity hypothesis.
- **Approach** — something that could address a Need: a product, feature, technology, platform, process, service, or workaround.
- **Evidence** — something actually learned: an observation, research finding, test result, technical finding, market data, or synthesized insight.

This is derived from NABC without forcing every NABC element to become a node type:

- **N — Need** maps directly to Need nodes.
- **A — Approach** maps directly to Approach nodes.
- **B — Benefit** is relational/contextual information attached to an Approach/Need evaluation; a validated benefit may generate Evidence.
- **C — Competition** is represented by other Approach nodes, including external products, services, user workarounds, and other alternatives.

`Space`, `Problem`, `Opportunity`, `Concept`, `Prototype`, `Product`, `Insight`, `Learning`, and `Decision` are no longer graph node types. Their useful distinctions are preserved as subtype, maturity, origin, evidence classification, status, or drawer/history metadata.

### Need metadata

`needFraming` may be:

- `problem`
- `desired-outcome`
- `job`
- `opportunity-hypothesis`

### Approach metadata

`approachKind` may be:

- `product`
- `feature`
- `technology`
- `platform`
- `process`
- `service`
- `workaround`
- `other`
- `unknown`

`approachMaturity` may be:

- `conceptual`
- `prototyped`
- `validated`
- `launched`
- `retired`
- `unknown`

`approachOrigin` may be:

- `firstbuild`
- `gea`
- `external`
- `user-workaround`
- `unknown`

A concept and its prototypes therefore normally remain **one Approach node**. Building a prototype changes maturity and belongs in the drawer/history. A prototype becomes a separate Approach node only when it embodies a meaningfully different solution direction worth navigating independently.

### Evidence metadata

`evidenceKind` may be:

- `observation`
- `research-finding`
- `test-result`
- `technical-finding`
- `market-data`
- `synthesized-insight`

AI must not fabricate Evidence nodes. Evidence represents something actually learned and should be grounded in source material, research, testing, or a human-confirmed synthesis.

## Domains are taxonomy, not graph nodes

Stable product/application **Domains** live outside the graph ontology. They answer *where does this apply?* while graph nodes answer *what is worth solving, what might solve it, and what have we learned?*

Canonical starting Domains:

1. Food Storage & Preservation
2. Cooking
3. Ice Making
4. Indoor Air & Climate
5. Waste Handling
6. Food Preparation
7. Beverage
8. Clothing Care
9. Water Heating & Treatment
10. Dish Care
11. Small Appliances
12. Recreational Living
13. Enterprise Operations
14. Outdoor Recreation

A node can belong to zero, one, or multiple Domains. Domain membership does **not** create an edge. This prevents broad Domains from becoming giant graph hubs and preserves graph edges for practical relevance.

Domains are intentionally **overlapping application contexts rather than a mutually exclusive hierarchy**. `Small Appliances` can overlap functional Domains such as Beverage, Food Preparation, Cooking, Ice Making, or Food Storage & Preservation. For example, `Cosmetics / Medicine Fridge` is classified into both **Food Storage & Preservation** and **Small Appliances** because the refrigeration problem and the compact-countertop product context can drive different approaches. `Recreational Living` similarly overlays functional territories when RV, trailer, van, overlanding, or camping constraints materially change the design context.

A Domain can still be used as a search/seed entry point. The Exploration Map then projects nodes assigned to that Domain plus a bounded number of practical adjacencies.

`Enterprise Operations` deliberately covers work whose beneficiary is GEA itself—manufacturing, quality, engineering, service, internal workflows, and other enterprise capabilities—rather than forcing internal innovation into consumer-product Domains. `Outdoor Recreation` covers activity/equipment contexts such as boating, fishing, camping, cycling, and hunting. It remains distinct from `Recreational Living`, which describes mobile/temporary habitation infrastructure.

## Strategic context is separate from Domain

A node may also carry a single `strategicContext` value describing **how the work relates to GEA**, independently of where it applies:

- `gea-core` — directly within established GEA product/application territory
- `gea-internal` — intended primarily for internal GEA use
- `gea-adjacent` — a plausible extension of GEA capabilities or markets
- `external` — exploration with no necessary relationship to GEA's existing business
- `unknown` — not yet captured

Strategic context is intentionally not a Domain and does not create graph edges. It is also not a gate on exploration: **Suggest applications** is free to cross strategic boundaries so a GEA Core idea can surface an External application, or vice versa.

## Current architecture

```text
Trusted bootstrap / human-readable snapshot
  data/exploration-graph.yaml
              │
              ▼
        /api/graph
              │
      ┌───────┴────────┐
      │                │
 Vercel Blob       Browser UI
 (live YAML)      search / map / admin
      │                │
      └──── site edits ┘
```

The data is YAML end-to-end. The checked-in YAML file is the clean bootstrap/snapshot. When a private Vercel Blob store is configured, the live shared graph is persisted as a private YAML blob. The website is the normal editor; YAML import/export supports audit, backup, bulk changes, and source-control snapshots.

The illustrative POC graph has been removed. The current trusted bootstrap contains **14 canonical Domains, 76 reviewed archival nodes, and 51 preliminary practical-relevance edges**. The historical record remains intentionally Approach-heavy rather than backfilling Needs or Evidence that were not actually captured.

## Graph Admin

Use **Graph admin** in the header to maintain canonical data without editing YAML by hand.

Entering Graph Admin prompts for a normal password. The password is sent once to `/api/admin-session`; after successful verification the server issues an `HttpOnly`, `SameSite=Strict` session cookie. The password is not stored in browser storage and is not resent with each node save.

The admin view provides:

- Domains table and editor,
- Nodes table and editor,
- Connections table and editor,
- search/filtering,
- node-to-Domain classification,
- NABC-derived subtype/maturity/origin fields,
- Strategic Context classification independent from Domains,
- provenance display for human vs AI-accepted edges,
- YAML export,
- validated YAML import,
- shared-save status and graph revision information.

## YAML format

`data/exploration-graph.yaml` is schema version 5. Version 5 adds Strategic Context classification and incremental field migrations while retaining archival seed imports, explicit unknown exploration depth, AI-assisted Need wording, and canonical-Domain membership migrations.

```yaml
meta:
  version: 5
  revision: 0
  status: trusted-baseline
  updatedAt: null

domains:
  - id: cooking
    title: Cooking
    description: Thermal preparation and transformation of food.
    examples:
      - ranges
      - cooktops
      - wall ovens

nodes:
  - id: keep-knives-sharp
    title: Maintain useful knife sharpness without specialized skill
    type: need
    needFraming: desired-outcome
    domains:
      - food-preparation
    depth: 2
    status: active
    summary: Example Need framing only.

  - id: automatic-knife-sharpener
    title: Automatic Knife Sharpener
    type: approach
    approachKind: product
    approachMaturity: prototyped
    approachOrigin: firstbuild
    strategicContext: gea-core
    domains:
      - food-preparation
    depth: 4
    status: paused
    summary: Example Approach framing only.

edges:
  - id: edge-example
    source: keep-knives-sharp
    target: automatic-knife-sharpener
    label: addresses same need
    rationale: Understanding the Need and the Approach together is practically useful.
    strength: 5
    provenance: manual
```

Edges are interpreted as **undirected practical relevance**. `source` and `target` exist only for storage simplicity.

## Exploration depth

Exploration depth remains independent from node type or Approach maturity. Archival records may use `null` when depth was not captured; the UI shows this as **Unknown** rather than falsely labeling old work as unexplored.

- `null` — Unknown / not captured
- `0` — Unexplored
- `1` — Discussed
- `2` — Investigated
- `3` — Developed
- `4` — Tested
- `5` — Substantiated

An Approach can therefore be prototyped while the underlying Need is still poorly investigated. Likewise, a Need can be deeply investigated even if no Approach exists.

## AI exploration

The OpenAI key remains server-side in `/api/suggest`.

- **Suggest connections** proposes practical-relevance edges to nodes already in the graph.
- **Suggest applications** asks where else a Need or Approach could matter and proposes additional membership in one of the existing canonical Domains. Suggested Domains appear temporarily in the map and can be explored before acceptance. Accepting an application adds Domain membership only; it never creates a graph edge.
- **Suggest what’s missing** proposes temporary ghost nodes of type **Need** or **Approach**.
- **Suggest need wording** appears in a Need drawer. It can generate a conservative description when one is missing, or normalize a rough draft/alias into a more canonical, solution-agnostic Need statement. The user reviews the suggestion before applying it; a replaced title is retained as an alias.
- It deliberately does **not** propose Evidence nodes, because Evidence must be grounded in something actually learned.
- Nothing becomes canonical until a person explicitly accepts it.
- Accepted AI edges are stored with `provenance: ai-accepted`.
- Accepted application suggestions add a Domain ID to the node and record AI-assisted/human-accepted Domain provenance; the Domain itself remains canonical taxonomy, not a node edge.
- Accepted missing nodes enter at depth `0 — Unexplored`.
- When the seed is a Domain, **Suggest connections** and **Suggest applications** are disabled because the Domain is already the application context. **Suggest what’s missing** remains available; accepted suggestions are classified into that Domain rather than linked to it by an edge.
- **Suggest applications** is available for Need and Approach seeds. Evidence is excluded for now because cross-Domain Evidence classification is a different epistemic question from application ideation.

## Version migration

Schema version 5 retains the three-type ontology and supports trusted archival seed imports plus incremental Domain, membership, and node-field migrations. The current baseline contains 76 safely classified records and 51 preliminary practical-relevance edges; ambiguous records are explicitly omitted rather than guessed. Imports are tracked by stable import IDs. On an existing persisted graph, each incremental import merges only its declared content, is persisted back to Blob, and is marked as applied. This prevents a later import from resurrecting older seed records that a human deliberately deleted.

Schema version 3 replaced the older multi-type graph ontology. When loading a v1/v2 persisted YAML graph, the server migrates legacy nodes where the mapping is semantically safe:

- `space`, `problem`, `need`, `opportunity` → `need`
- `concept`, `prototype`, `product` → `approach`
- `insight`, `learning` → `evidence`

Legacy `decision` nodes are not carried forward as graph nodes because decisions now belong in node status/history metadata. Legacy migration remains a compatibility guard rather than a substitute for human review.

## Initial archival import

The v4 seed intentionally imports only records whose semantic class is supported by the supplied FirstBuild archive context:

- 6 launched FirstBuild products as **Approach** nodes
- 26 safe records from the 2-Minute Prototype archive: 25 **Approaches** and 1 explicit **Need** (`Dirty Gym Clothes`)
- 23 safe records from the Concepts Backlog as **Approaches**
- 3 Current Projects as **Approaches**
- 18 additional/recovered **Approaches**, including Forge Heated Ice Press, Prisma Cold Brew, Copia Fruit Saver, the Tactile Sticker Kit, Self-Rinsing Rice Cooker, Smart Flower Vase, Coffee Grinder Silencer, Dish Dyno, and Steady Scope
- 0 fabricated Evidence nodes
- 51 conservative practical-relevance edges

The following ambiguous records are intentionally omitted until a human can recover their intended framing: `Accessible Freeze Drying`, `Homemade Protein Bars`, `What would you do if you didn't have to drive your car?`, and `Make your own flakey salt`.

Metadata is deliberately sparse. Archive collection and the few facts explicitly supplied are retained, while exploration depth is left unknown where it was not captured.

## Vercel environment variables

### AI configuration

```text
OPENAI_API_KEY=<OpenAI project key>
OPENAI_MODEL=gpt-5.6-luna   # optional override
```

### Shared graph persistence

Connect a **private Vercel Blob** store to the project. Current Vercel Blob connections provide:

```text
BLOB_STORE_ID=<provided by the connected Blob store>
# VERCEL_OIDC_TOKEN is injected automatically by Vercel at runtime.
```

`BLOB_READ_WRITE_TOKEN` remains supported only as a legacy/local-development fallback.

### Graph Admin password

```text
GRAPH_ADMIN_PASSWORD=<strong memorable password>
```

This is entered once when opening Graph Admin and exchanged for an HttpOnly editing session. Changing the Vercel environment variable invalidates existing sessions after redeployment.

After adding/changing environment variables, redeploy.

## Graph API

Read JSON:

```text
GET /api/graph
```

Export canonical YAML:

```text
GET /api/graph?format=yaml
```

Save/import:

```text
PUT /api/graph
X-Graph-Revision: <revision loaded by client>
```

The endpoint validates Domain IDs, node Domain references, node IDs/types/depths/statuses, NABC-derived subtype fields, edge IDs, and edge endpoints before persisting. Revision checks reduce accidental overwrites from stale editing sessions.

## Local development

```bash
npm install
vercel link
vercel env pull .env.local
vercel dev
```

The app has no frontend framework or build step. `yaml` and `@vercel/blob` are server-side dependencies for graph persistence.

## Deployment

1. Push the repo to GitHub.
2. Import/link it in Vercel using framework preset **Other**.
3. Keep the build command and output-directory override empty.
4. Configure OpenAI variables if AI exploration is desired.
5. Connect a private Vercel Blob store.
6. Add `GRAPH_ADMIN_PASSWORD` for Production and Preview.
7. Redeploy.

## Security note

The shared-password session is intentionally lightweight for this internal prototype. Before broad organizational deployment, replace the shared password with FirstBuild/GEA identity authentication and record the authenticated editor on each change.
