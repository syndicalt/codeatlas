# Deploying CodeAtlas

## Docker (Recommended)

The simplest way to deploy CodeAtlas:

```bash
# Copy and configure environment variables
cp .env.example backend/.env
# Edit backend/.env with your OAuth credentials and API keys

# Build and start
docker-compose up --build
```

Frontend: http://localhost:3000
Backend API: http://localhost:8000

## Heroku / Railway

### Backend

```bash
cd backend
heroku create codeatlas-api
heroku config:set CODEATLAS_GITHUB_CLIENT_ID=...
heroku config:set CODEATLAS_GITHUB_CLIENT_SECRET=...
heroku config:set CODEATLAS_FRONTEND_URL=https://your-frontend.vercel.app
git push heroku main
```

### Frontend

Deploy to Vercel:
1. Connect your GitHub repo to Vercel
2. Set root directory to `frontend`
3. Update `vercel.json` with your backend URL

## Fly.io

```bash
cd backend
fly launch
fly secrets set CODEATLAS_GITHUB_CLIENT_ID=...
fly deploy
```

## Environment Variables

See `.env.example` in the project root for all available configuration options.
