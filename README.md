# boogiepop-bootstrap

Microservicio Nest para crear proyectos Boogiepop en GitHub desde seeds.

## Destinos GitHub

| Tipo (`type`) | Org | URL ejemplo |
|---------------|-----|-------------|
| `next`, `streamlit` | **boogiepop** | `https://github.com/boogiepop/boogiepop-my-app` |
| `vite` (remote MF) | **remotes** | `https://github.com/remotes/boogiepop-my-remote` |

La org se resuelve automáticamente en `boogiepop-bootstrap-core` — no hace falta enviarla en el body.

## Setup local

```bash
# 1. Core
cd ../boogiepop-bootstrap-core && npm install && npm run build

# 2. MS
cd ../boogiepop-bootstrap && npm install
cp .env.example .env
# Editar GITHUB_TOKEN y BOOTSTRAP_API_KEY

npm run start:dev
```

Requiere **git** en PATH.

## API

Auth: `Authorization: Bearer <BOOTSTRAP_API_KEY>`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health (sin auth) |
| GET | `/bootstrap/meta/orgs` | Orgs accesibles |
| GET | `/bootstrap/meta/targets` | Reglas org por tipo |
| POST | `/bootstrap/projects` | Crear proyecto (SSE) |

### Ejemplo POST (SSE)

```bash
curl -N -X POST http://localhost:3100/bootstrap/projects \
  -H "Authorization: Bearer dev-bootstrap-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-remote","type":"vite","members":[{"identifier":"someuser","role":"write"}]}'
```

Eventos: `step`, `done`, `error`.

Swagger: `http://localhost:3100/docs`

## Docker

```dockerfile
# Requiere git en la imagen
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
```
