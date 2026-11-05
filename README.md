# Helix Logs
A logger for the Helix roleplaying framework written in Node.js with Typescript.

![demo](https://i.imgur.com/bEDbdJe.gif)

# Features
- Steam login
- Usergroup whitelist
- MySQL support
- SAM, Serverguard and ULX support
- Search filters
  - Messages
  - Before and after dates
  - Steam ID's
- HTTP and HTTPS support
- Mobile friendly
- Download logs contextually
- Docker support
- Rate limiting support
- Contextual logs

# Requirements
- [Node.js](https://nodejs.org/en/) 22 LTS (the container runtime); CI also checks Node.js 24 LTS
- [Helix](https://github.com/NebulousCloud/helix) updated since May 11th, 2021
- [SQL Helix Plugin](https://github.com/wildflowericecoffee/helix-plugins/tree/main/logger.lua)
- [Redis](https://redis.io/)
- An admin addon. SAM, ServerGuard and ULX are supported.

# Getting started
- Clone the repository
```
git clone --depth=1 https://github.com/willardnetworks/logs.git <project_name>
```
- Install dependencies
```
cd <project_name>
npm ci
```

Use npm with the committed `package-lock.json`; do not generate a separate pnpm
or Yarn lockfile. The app supports MySQL; unused SQLite dependencies have been
removed rather than carrying their native installer into production.

- Configuration

Rename the `.env.example` file to `.env` and fill out the environment variables

| Environment Variable                            	| Description                                                                                                            	|
|-------------------------------------------------	|------------------------------------------------------------------------------------------------------------------------	|
| NODE_ENV (production/dev)                       	| Whether we are running in development or production. Enables error logger and sets the domain to localhost in dev.     	|
| SESSION_SECRET                                  	| Secret used for keeping sessions. You should use a random generator for this.                                          	|
| WEBSITE_DOMAIN                                  	| Your website's domain, used for redirecting to steam.                                                                  	|
| PORT                                            	| The port your server listens on.                                                                                       	|
| SSL (true/false)                                	| Whether you want the server to use HTTPS, you will need this if you have your SSL mode to full (strict) in cloudflare. 	|
| SSL_CERT, SSL_KEY                                 | The absolute path of your SSL certificate and key if you are using HTTPS. You can create these with openssl.            |
| DATABASE (mysql)                         	        | What type of database you have.                                                                                        	|
| MYSQL_USER, MYSQL_PASS,<br>MYSQL_HOST, MYSQL_DB 	| Login credentials for mysql.                                                                                           	|
| MYSQL_SAM                                       	| The database name for SAM.                                                                                          	  |
| ADMIN_MOD (serverguard/ulx)                     	| The admin mod your server uses, currently only ULX and Serverguard are supported.                                      	|
| STEAM_KEY                                       	| Steam API key, get yours at https://steamcommunity.com/dev/apikey.                                                     	|
| ALLOWED_RANKS                                   	| List of allowed usergroups that can access the server logs, separated by semicolons.                                   	|
- Build and run the project
```
npm run build
npm start
```

Finally, navigate to `http://localhost:3000` and you should see the template being served and rendered locally!

# Deployment
To deploy the app to a web server, simply set it to production and add your own website domain.
> IP addresses work too, but you should use a domain to be able to use Cloudflare's DDoS protection).

SSL is strongly recommended, you can combine Cloudflare's full (strict) HTTPS with a self signed certificate using openssl for full end-to-end encryption.

## Docker deployment and updates

Use Docker Compose v2. Copy `.env.example` to `.env` and fill in the configuration,
including `MYSQL_PORT` and, when using SAM, `MYSQL_SAM_DB`. MySQL remains an
external service. The published port follows `PORT` (3335 when unset). Redis is
only reachable inside the Compose network; do not expose it publicly.

```sh
docker compose config --quiet
docker compose build --pull
docker compose up -d --wait --wait-timeout 120
docker compose ps
docker compose logs --tail=100 willard-logs
```

The Node 22 Bookworm and Redis 8 Alpine images are digest-pinned. Weekly
Dependabot PRs cover the Dockerfile, Compose images, npm dependencies and GitHub
Actions separately. Review release notes and CI before merging an update; a
`docker compose pull` alone does not update a digest pin or rebuild the app.
CI builds the production image, starts it with Redis, checks HTTP liveness,
non-root execution, a writable log directory and SQLite native loading when
SQLite is installed, then removes its test volumes.
It does not test Steam login or queries against the production MySQL database.

Before changing Redis versions, back up `redis-data` and check the existing
server version (`docker compose exec redis redis-cli INFO server`). Redis 8
uses the official Alpine image. CI reports its Alpine release and verifies that
neither runtime container ships an SSH daemon. The [OpenSSH advisory](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/)
does not affect containers without sshd; an Alpine deployment host running SSH
must still be patched separately. Check the actual installed packages and
release, rather than assuming a recently pulled image contains every fix. Keep the Redis major compatible with the existing data volume. Check the release-specific upgrade path
if the running server is older. Never roll persisted Redis data back to an
older incompatible server binary; restore a compatible backup instead. Keep the previous Git
revision and image available for rollback; do not run `docker compose down -v`
on production because it deletes the persisted Redis data.

The app runs as the unprivileged `node` user, without a globally installed PM2.
Compose uses `restart: always` for both services and forwards signals via `init`.
Supply configuration at runtime;
`.env` files, TLS private keys and certificates are excluded from the build
context. If enabling `SSL=true`, mount the certificate and key read-only at the
configured container paths and make them readable by the container's `node` user.
The local health check supports HTTP and HTTPS, including self-signed TLS; it
checks liveness, not certificate validity or database readiness.

### Start automatically after an external server reboot

On a systemd-based Linux deployment server, install the checkout at
`/opt/willard-logs` (or edit `WorkingDirectory` in the unit), configure `.env` and
build the image with the deployment commands above. Then enable the Docker
service and the included Compose unit:

```sh
sudo systemctl enable --now docker.service
sudo install -m 644 docker/willard-logs.service /etc/systemd/system/willard-logs.service
sudo systemctl daemon-reload
sudo systemctl enable --now willard-logs.service
systemctl is-enabled docker.service willard-logs.service
docker compose ps
```

The unit brings the stack up at boot after Docker and network initialization;
the Compose `restart: always` policies restart existing containers after a
Docker daemon restart as well. The unit does not pull images or rebuild on boot,
so a reboot cannot silently deploy new code. If Docker is installed elsewhere,
adjust `/usr/bin/docker` in the unit. A manually stopped container stays stopped
until it is started again or Docker restarts. Disable the unit for planned
long-term shutdowns. These host commands are for the external deployment server,
not the hosted Hermes container.

# Debugging
Type `npm run debug` in your terminal to perform a full build and then server the app in watch mode. `npm run watch` if you are not using static assets.
> VS Code lets you easily run npm scripts from the editor

![i9G14KU 1](https://user-images.githubusercontent.com/36643731/123026088-378b3f00-d3a1-11eb-9dbb-873bf0a7e21e.png)

# Disclaimer
This is a fork of [Helix Logs](https://github.com/itz-coffee/helix-logs) by [itz-coffee](https://github.com/itz-coffee)
