# PROOF OF CONCEPT — Website Prototype 0.2

Zero-dependency static prototype for the PROOF OF CONCEPT experimental beverage archive.

Prototype 0.2 adds the **CURSE INDEX** as a separate reference database for questionable materials. Catalog presence, editorial scores, and tags do not create cocktail-development evidence.

## Local preview

From this directory:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173` and navigate through the interface.

Because this is a client-side SPA, direct route requests such as `/cocktails/gym-sock`, `/curses`, or `/curses/fish-sauce` must be rewritten to the application shell. `vercel.json` uses Vercel’s documented SPA catch-all rewrite to `/index.html`, so bookmarks, refreshes, pasted deep links, and new-tab navigation resolve correctly on Vercel. A bare local static file server will not reproduce that rewrite behavior.

## Deploy to Vercel

1. Put this directory in a Git repository.
2. Import the repository into Vercel.
3. Framework preset: **Other**.
4. Build command: leave blank.
5. Output directory: leave blank / project root.
6. Deploy.

No runtime dependencies, external database, or environment variables are required for this prototype.

## Prototype routes

- `/` — Research Index
- `/cocktails/[slug]` — cocktail specimen records
- `/curses` — Curse Index browser
- `/curses/[slug]` — Curse Index material record
- `/status` — development status protocol
- `/panel` — rolling peer-review panel
- `/graveyard` — terminated cocktail projects/branches
- `/submit` — guest cocktail submission prototype

## Curse Index data

`data/curses.json` is the version-controlled runtime dataset for the zero-dependency prototype. It currently contains the 154 LIQUID + 140 FAT seed records defined in the approved Curse Index implementation specification.

Seed records intentionally contain only stable identity and Tier-1/Tier-2 classification data. Description, tags, scores, and safety fields remain empty until real editorial metadata is supplied.

The intended canonical Curse Index data shape is documented in `POC_CURSE_SCHEMA.yaml`.

## Deliberately not implemented yet

- Persistent content storage / CMS
- Real guest submission transport
- Authentication / admin editing
- Real peer reviewer identities or voting
- Complete Curse Index descriptions/scores/safety research
- Automatic backlinking of historical cocktail ingredients to Curse Index IDs
- Community ratings or AI pairing recommendations
- Photography pipeline

## FAT expansion

- `docs/FAT_INDEX_EXPANSION.md` — Tier-1 FAT boundary and Tier-2 taxonomy
- `data/examples/beef-tallow.minimal.yaml` — minimal FAT record example
- `site-syncs/POC-PROJ-E002-fat-index.yaml` — project-scoped adoption event
