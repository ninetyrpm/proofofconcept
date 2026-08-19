# PROOF OF CONCEPT — Website Prototype

Zero-dependency static prototype for the PROOF OF CONCEPT experimental beverage archive.

## Local preview

From this directory:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

Because this is a client-side SPA, direct route refreshes such as `/cocktails/gym-sock` require a fallback rewrite. `vercel.json` provides that on Vercel. Python's simple HTTP server does not; navigate through the prototype UI when previewing locally.

## Deploy to Vercel

1. Put this directory in a Git repository.
2. Import the repository into Vercel.
3. Framework preset: **Other**.
4. Build command: leave blank.
5. Output directory: leave blank / project root.
6. Deploy.

No runtime dependencies or environment variables are required for this prototype.

## Prototype routes

- `/` — Research Index
- `/cocktails/gym-sock`
- `/cocktails/fucking-merlot`
- `/cocktails/latke`
- `/cocktails/pea-soup`
- `/cocktails/martinned`
- `/status`
- `/panel`
- `/graveyard`
- `/submit`

## Deliberately not implemented yet

- Persistent content storage / CMS
- Real guest submission transport
- Authentication / admin editing
- Real peer reviewer identities or voting
- Search / rich taxonomy
- Photography pipeline

The current data is embedded in `app.js` to make the prototype portable and directly deployable.
