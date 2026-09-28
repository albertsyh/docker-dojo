# Docker Dojo on three instances

A reference layout for running Docker Dojo the way enterprise security reviews usually
expect: the frontend, the backend and the database each on their own machine, in their
own network zone, and each able to reach only the one behind it. Nothing in the workshop
uses these files. The real deployment is `compose.prod.yaml` on one host behind a
Cloudflare Tunnel (see the main README).

```
Internet
   │ 443 (public TLS)
┌──▼─────────────────────────┐  public subnet
│ EDGE    edge/              │  nginx: the built Vue app, public TLS, security headers.
│                            │  Holds no database or Laravel secrets.
└──┬─────────────────────────┘
   │ 8443, mutual TLS (the edge proves who it is with a client certificate)
┌──▼─────────────────────────┐  private subnet, no public IP
│ APP     app/               │  gateway (nginx) ─► api (php-fpm)   port 9000 never leaves
│                            │                 └► reverb (websockets)   this instance
└──┬─────────────────────────┘
   │ 3306, TLS 1.3, verified certificate
┌──▼─────────────────────────┐  isolated subnet, no route to the internet
│ DATA    data/              │  MySQL. Root only from inside the container.
└────────────────────────────┘
```

Each folder is what you copy to that machine, plus the certificates it needs from `certs/`.

## What each tier protects against

**Edge.** This is the only machine the internet can reach, so it holds as little as possible:
static files, the public certificate, and a client certificate for talking to the app. If
it's compromised, the attacker has no database password, no `APP_KEY` and no Reverb secret.
The one thing they can do is call the API as the edge does. It replaces any
`X-Forwarded-For` a client sends with the address it actually saw, so a student can't choose
their own IP to dodge the join limit.

**App.** In the single-host setup, `web` spoke FastCGI straight to php-fpm. That is fine
inside one Docker network, but FastCGI has no authentication or encryption: anyone who can
reach port 9000 can run PHP as the app. So the app instance gets its own small nginx, the
`gateway`, and only the gateway is published. It accepts a connection only if the caller
presents a certificate from the internal CA *with the name `edge`*, so another internal
service with a valid certificate still gets a 403. Reverb's publishing API (`/apps`) isn't
routed at all. The containers run as `www-data` on read-only filesystems with no Linux
capabilities.

**Data.** MySQL refuses any TCP connection without TLS, and the app verifies the server's
certificate and hostname. There are two accounts instead of one:

- `dojo_app` can read and write rows, and nothing else. The running app uses it, so a
  compromised app server can't drop or alter tables.
- `dojo_migrator` can change the schema. Only the one-off `migrate` job uses it.

Root can log in only from inside the container.

## What compose can't do for you

These files are half of the setup. The other half lives in your cloud account, and without
it the separation is only a convention:

- **Security groups name the tier in front, not a network range.** Allow 443 to the edge from
  the internet (or from the load balancer). Allow 8443 to the app from the edge's group only,
  and 3306 to the data instance from the app's group only. Nothing else inbound.

  | To | Port | From |
  | --- | --- | --- |
  | edge | 443, 80 | internet (or the load balancer) |
  | app | 8443 | edge security group |
  | data | 3306 | app security group |
  | any | 22 | nobody: use SSM Session Manager, IAP or a bastion |

- **Outbound rules.** The app may reach the data instance and your registry. The data
  instance reaches nothing (pull images through a registry mirror or VPC endpoint).
  This is what stops data being sent out after a break-in.
- **No public IPs** on the app and data instances.
- **Secrets.** `/etc/dojo/*.env` should be rendered by a secrets agent (Vault Agent, AWS
  Secrets Manager with a sidecar, and so on), mode 600, and never committed. Rotate the
  database passwords with `ALTER USER`: the init script runs only once.
- **Certificates** come from the company PKI or a cloud private CA, with short lifetimes and
  automatic renewal. `dev-certs.sh` is for trying this on one machine only.
- **Images** are built in CI, scanned, ideally signed, and pulled from your registry. None of
  these files builds anything.
- **Backups and disk encryption** for the data volume, or a managed database (RDS, Cloud SQL),
  which gives you both along with patching. With a managed database, drop `data/` and
  point `DB_HOST` at it.

## Secrets files

Each instance reads one file, used both by compose (for the few values it interpolates)
and as the containers' `env_file`.

| File | On | Holds |
| --- | --- | --- |
| `/etc/dojo/data.env` | data | `PRIVATE_IP`, `MYSQL_ROOT_PASSWORD`, `DOJO_APP_PASSWORD`, `DOJO_MIGRATOR_PASSWORD` |
| `/etc/dojo/app.env` | app | `PRIVATE_IP`, `API_IMAGE`, `APP_URL`, `DB_HOST`, `APP_KEY`, `DB_PASSWORD` (= `DOJO_APP_PASSWORD`), `REVERB_APP_KEY`, `REVERB_APP_SECRET` |
| `/etc/dojo/migrator.env` | app, or your CI | `DB_PASSWORD` (= `DOJO_MIGRATOR_PASSWORD`) |
| `/etc/dojo/edge.env` | edge | `WEB_IMAGE`, `PUBLIC_HOSTNAME`, `APP_UPSTREAM` (e.g. `app.internal:8443`) |

`APP_KEY` signs quiz papers. If you run more than one app instance, they must all have
the same key, or a paper opened on one fails on another. The entrypoint quietly falls back
to a random key when it's missing, so check it's in `app.env`.

## Deploying, in order

```sh
# data instance
docker compose --env-file /etc/dojo/data.env up -d

# app instance: migrate first (each release), then start
docker compose --env-file /etc/dojo/app.env run --rm migrate
docker compose --env-file /etc/dojo/app.env up -d

# edge instance
docker compose --env-file /etc/dojo/edge.env up -d
```

For a new release, run `migrate` before restarting the app, and write migrations that the
old code can still run against (add columns before using them, remove them a release later).

## Trying it on one machine

Every tier can run on one laptop as three separate compose projects, talking through the
host's ports the way separate machines would talk through their private IPs.

1. `sh docs/enterprise/dev-certs.sh` makes a demo CA and certificates in `certs/` (gitignored).
2. Build the images once with `docker compose build` at the repo root. That gives you
   `docker-dojo-api` and `docker-dojo-web`.
3. Write the four env files somewhere outside the repo, with generated passwords, and:
   - `PRIVATE_IP=127.0.0.1`;
   - `DB_HOST=host.docker.internal` (the demo certificate includes that name);
   - `APP_UPSTREAM=host.docker.internal:8443`;
   - `EDGE_HTTP_PORT=9080` and `EDGE_HTTPS_PORT=9443`, so the edge doesn't collide with the app's 8443;
   - `SECRETS_FILE` pointing at the file itself (and `MIGRATOR_SECRETS_FILE` in the app one),
     since they aren't in `/etc/dojo`.
4. Deploy in the order above, running each command from its folder. Then open
   https://localhost:9443. The browser will warn, because the demo CA isn't trusted.

What that proves: the chain works end to end (pages, API writes, quiz, websocket broadcasts),
and the refusals happen: no client certificate gets 400, another service's certificate gets
403, MySQL without TLS is refused, root can't log in over the network, and `dojo_app` can't
drop a table. What it can't show is the network isolation between tiers, because on one
machine that is up to the security groups above.
