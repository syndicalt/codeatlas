# CodeAtlas Frontend

React + TypeScript + Vite application for interactive code knowledge graph visualization.

## Development

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:8000`.

## Build

```bash
npm run build
```

Output is placed in `dist/` and can be served by the backend in production (see root `Dockerfile`).

## Type Check

```bash
npx tsc --noEmit
```
