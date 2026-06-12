# College LMS (MERN)

This repo is scaffolded as a simple MERN structure:

- `client/` — React (Vite)
- `server/` — Node.js + Express + MongoDB (Mongoose)

## Prereqs

- Node.js 18+ (or 20+)
- MongoDB running locally (or a cloud URI)

## Setup

1) Install dependencies (root helper):

```bash
npm run install:all
```

2) Create environment files:

- Copy `server/.env.example` → `server/.env` and set values
- (Optional) Copy `client/.env.example` → `client/.env`

## Run (dev)

From the repo root:

```bash
npm run dev
```

- Client: http://localhost:5173 (or next free port)
- API: http://localhost:5000 (or next free port)
- Health check: http://localhost:5000/api/health

If `5000` is already in use, the API will automatically try `5001`, `5002`, etc.
The dev runner also passes the chosen API URL to the Vite client via `VITE_API_BASE_URL`.

### MongoDB note

- If `MONGODB_URI` is missing (or Mongo is down), the API still starts for early development and will log a warning.
- To force the API to fail fast when Mongo is unavailable, set `MONGODB_REQUIRED=true` in `server/.env`.

## Docker

Root deployment files are provided for containerized frontend and backend runs:

- `Dockerfile.backend`
- `Dockerfile.frontend`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `nginx.conf`
- `nginx-ssl.conf`
- `deploy.sh`

Development-style container run:

```bash
docker compose -f docker-compose.yml up -d --build
```

Production-style container run with SSL nginx config:

```bash
./deploy.sh
```

Notes:

- `server/.env` is loaded into the backend container via `env_file`.
- The frontend is built with `VITE_API_BASE_URL=/api`, and nginx proxies `/api` and `/uploads` to the backend service.
- For SSL mode, place certificates at `./ssl/fullchain.pem` and `./ssl/privkey.pem`.

## Suggested backend modules (next)

Inside `server/src/` you already have folders for:

- `models/` (User, Course, Enrollment, Lesson, Assignment, Submission)
- `routes/` + `controllers/`
- `middleware/` (auth, roles, error handling)
