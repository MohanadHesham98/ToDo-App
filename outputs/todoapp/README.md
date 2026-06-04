# TaskFlow Todo

A CRUD todo application with a dependency-free frontend and a SQL Server-ready backend.

## Features

- Create tasks with title, details, due date, priority, and list/category.
- Read tasks with filters for all, pending, completed, due today, and overdue.
- Update tasks by editing content or toggling completed status.
- Delete individual tasks or clear all completed tasks.
- Persist tasks through the backend API when it is available.
- Fall back to `localStorage` when opened as a static file.

## Run

For the instant browser version, open `index.html` in a browser.

For the SQL Server backend version:

1. Run `database/schema.sql` in SQL Server.
2. Copy `.env.example` to `.env` and set your SQL Server credentials.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Database Note

The frontend first tries `/api/tasks`. If the API is unavailable, it falls back to browser storage so the UI still works during local static development.

## Environment Variables

Configure these in `.env` locally, Docker environment variables, or Kubernetes ConfigMaps/Secrets:

- `NODE_ENV`: set to `production` in Docker/Kubernetes.
- `PORT`: container HTTP port, default `3000`.
- `HOST`: bind address, default `0.0.0.0` for containers.
- `CORS_ORIGIN`: optional allowed browser origin.
- `SQL_SERVER`, `SQL_PORT`, `SQL_DATABASE`: SQL Server connection target.
- `SQL_USER`, `SQL_PASSWORD`: database credentials. Store these in Kubernetes Secrets.
- `SQL_ENCRYPT`, `SQL_TRUST_SERVER_CERTIFICATE`: SQL Server TLS settings.
- `SQL_CONNECTION_TIMEOUT_MS`, `SQL_REQUEST_TIMEOUT_MS`: SQL driver timeout controls.

## Docker

Build and run:

```bash
docker build -t taskflow-todo .
docker run --env-file .env -p 3000:3000 taskflow-todo
```

## Kubernetes

Example manifests are in `k8s/`.

1. Edit `k8s/configmap.example.yaml` for your SQL Server host/database.
2. Edit `k8s/secret.example.yaml` with real credentials.
3. Update the image in `k8s/deployment.yaml` to your AWS ECR image.
4. Apply the ConfigMap, Secret, Deployment, and Service.

The app exposes:

- `/healthz` for liveness checks.
- `/readyz` for readiness checks that verify SQL Server connectivity.

## Why This Matters for Kubernetes

Kubernetes containers should be immutable and portable. Environment variables let the same image run in local development, staging, and production without rebuilding it. Binding to `0.0.0.0` lets the service receive traffic inside the pod. Health and readiness probes let Kubernetes restart broken containers and avoid sending traffic to pods that cannot reach the database. Graceful shutdown lets the app close HTTP and SQL connections when Kubernetes terminates or rolls pods.
