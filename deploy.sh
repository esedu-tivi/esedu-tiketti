#!/usr/bin/env bash
#
# Julkaisuskripti - esedu-tiketti
#
# Ajetaan palvelimella (tiketti.esedu.fi):
#   /home/it-admin/esedu-tiketti/deploy.sh            koko sovellus
#   /home/it-admin/esedu-tiketti/deploy.sh --frontend vain frontend
#   /home/it-admin/esedu-tiketti/deploy.sh --backend  vain backend
#
# Tai omalta koneelta yhdellä komennolla:
#   ssh it-admin@tiketti.esedu.fi '/home/it-admin/esedu-tiketti/deploy.sh --frontend'
#
# Vaiheet: varmuuskopio -> koodin haku -> backendin image ja kontti
#          -> frontendin build -> terveystarkistus
# Osajulkaisussa ajetaan vain valittua osaa koskevat vaiheet.
#
# Ympäristömuuttujat (valinnaisia):
#   BRANCH=main        Julkaistava haara
#   SKIP_GIT=1         Ohita koodin haku (käytetään rollbackissa)
#   SKIP_BACKUP=1      Ohita tietokannan varmuuskopio
#   ALLOW_DIRTY=1      Salli julkaisu, vaikka repossa on paikallisia muutoksia
#
# Rollback edelliseen versioon:
#   cd /home/it-admin/esedu-tiketti
#   git checkout <commit-sha>
#   SKIP_GIT=1 ./deploy.sh

set -euo pipefail

# Koko skripti on main-funktion sisällä, jotta bash lukee sen kokonaan muistiin
# ennen suoritusta. Ilman tätä git reset voisi vaihtaa skriptitiedoston kesken ajon.
main() {
  REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
  COMPOSE_DIR="$REPO_DIR/backend"
  FRONTEND_DIR="$REPO_DIR/frontend"
  BRANCH="${BRANCH:-main}"
  WEB_ROOT="${WEB_ROOT:-/var/www/tiketti/dist}"
  HEALTH_URL="${HEALTH_URL:-https://tiketti.esedu.fi/api/health/live}"
  SITE_URL="${SITE_URL:-https://tiketti.esedu.fi/}"
  DB_CONTAINER="${DB_CONTAINER:-esedu-tiketti-db}"
  BACKUP_DIR="${BACKUP_DIR:-$HOME/esedu-tiketti-backups}"
  BACKUP_KEEP=10

  DEPLOY_BACKEND=1
  DEPLOY_FRONTEND=1
  parse_args "$@"

  local scope="backend + frontend"
  [ "$DEPLOY_FRONTEND" = 0 ] && scope="vain backend"
  [ "$DEPLOY_BACKEND" = 0 ] && scope="vain frontend"

  step "Esitarkistukset ($scope)"
  preflight

  if [ "$DEPLOY_BACKEND" = 1 ]; then
    # Varmuuskopio vain jos migraatiot voivat ajautua
    step "Tietokannan varmuuskopio"
    backup_database
  fi

  step "Koodin haku"
  update_source

  if [ "$DEPLOY_BACKEND" = 1 ]; then
    step "Backend: image ja kontti"
    deploy_backend
  fi

  if [ "$DEPLOY_FRONTEND" = 1 ]; then
    step "Frontend: build ja julkaisu"
    deploy_frontend
  fi

  step "Terveystarkistus"
  health_check

  echo
  echo "✅ Julkaisu valmis ($scope) - $(git -C "$REPO_DIR" rev-parse --short HEAD) ($(git -C "$REPO_DIR" log -1 --format=%s))"
  echo "   Rollback: cd $REPO_DIR && git checkout $PREV_SHA && SKIP_GIT=1 ./deploy.sh$DEPLOY_ARGS"
}

parse_args() {
  DEPLOY_ARGS=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --frontend|-f)
        DEPLOY_BACKEND=0
        DEPLOY_ARGS=" --frontend"
        ;;
      --backend|-b)
        DEPLOY_FRONTEND=0
        DEPLOY_ARGS=" --backend"
        ;;
      --all|-a)
        DEPLOY_BACKEND=1
        DEPLOY_FRONTEND=1
        DEPLOY_ARGS=""
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        usage
        die "Tuntematon valitsin: $1"
        ;;
    esac
    shift
  done

  if [ "$DEPLOY_BACKEND" = 0 ] && [ "$DEPLOY_FRONTEND" = 0 ]; then
    die "Sekä --frontend että --backend annettu - käytä --all, jos haluat molemmat."
  fi
}

usage() {
  cat <<'OHJE'
Käyttö: ./deploy.sh [valitsin]

  (ei valitsinta)   Julkaisee backendin ja frontendin
  --frontend, -f    Julkaisee vain frontendin (ei kosketa konttiin eikä tietokantaan)
  --backend,  -b    Julkaisee vain backendin (ei rakenna frontendiä)
  --all,      -a    Sama kuin ilman valitsinta
  --help,     -h    Tämä ohje

Ympäristömuuttujat:
  BRANCH=main     Julkaistava haara
  SKIP_GIT=1      Ohita koodin haku (rollback)
  SKIP_BACKUP=1   Ohita tietokannan varmuuskopio
  ALLOW_DIRTY=1   Salli paikalliset muutokset työpuussa
OHJE
}

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
info() { printf '  %s\n' "$1"; }
die()  { printf '\n\033[1;31m✖ %s\033[0m\n' "$1" >&2; exit 1; }

# Lukee arvon backendin .env-tiedostosta
env_value() {
  grep -E "^$1=" "$COMPOSE_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'\''' || true
}

preflight() {
  for cmd in git curl; do
    command -v "$cmd" >/dev/null 2>&1 || die "Komentoa '$cmd' ei löydy."
  done

  if [ "$DEPLOY_BACKEND" = 1 ]; then
    command -v docker >/dev/null 2>&1 || die "Komentoa 'docker' ei löydy."

    # Docker Compose v2 (docker compose) tai v1 (docker-compose)
    if docker compose version >/dev/null 2>&1; then
      COMPOSE=(docker compose)
    elif command -v docker-compose >/dev/null 2>&1; then
      COMPOSE=(docker-compose)
    else
      die "Docker Composea ei löydy."
    fi
    info "Docker Compose: ${COMPOSE[*]}"

    docker info >/dev/null 2>&1 || die "Dockeria ei voi käyttää. Onko käyttäjä docker-ryhmässä?"

    [ -f "$COMPOSE_DIR/docker-compose.yml" ] || die "Tiedostoa $COMPOSE_DIR/docker-compose.yml ei löydy. Tarkista REPO_DIR."
    [ -f "$COMPOSE_DIR/.env" ] || die "Tiedostoa $COMPOSE_DIR/.env ei löydy. Backend ei käynnisty ilman sitä."
  fi

  if [ "$DEPLOY_FRONTEND" = 1 ]; then
    command -v rsync >/dev/null 2>&1 || die "Komentoa 'rsync' ei löydy."

    # Frontendin ympäristömuuttujat paistetaan bundleen build-vaiheessa.
    # Ilman tätä tiedostoa frontend buildautuu ilman API-osoitetta eikä toimi.
    [ -f "$FRONTEND_DIR/.env.production" ] || die \
      "Tiedostoa $FRONTEND_DIR/.env.production ei löydy. Luo se ennen julkaisua (ks. .env.example)."
  fi

  # Paikalliset muutokset katoaisivat git reset --hard -komennossa
  if [ "${SKIP_GIT:-0}" != "1" ] && [ -n "$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)" ]; then
    git -C "$REPO_DIR" status --short --untracked-files=no
    [ "${ALLOW_DIRTY:-0}" = "1" ] || die \
      "Repossa on paikallisia muutoksia (yllä). Committaa ne tai aja: ALLOW_DIRTY=1 ./deploy.sh"
  fi

  if [ "$DEPLOY_FRONTEND" = 1 ]; then
    # Frontend buildataan hostilla; ilman npm:ää käytetään kertakäyttöistä node-konttia
    if command -v npm >/dev/null 2>&1; then
      BUILD_MODE=host
      info "Frontendin build: npm $(npm -v) (host)"
    elif command -v docker >/dev/null 2>&1; then
      BUILD_MODE=docker
      info "Frontendin build: node:20-alpine -kontti (npm puuttuu hostilta)"
    else
      die "Frontendin buildiin tarvitaan joko npm tai docker - kumpaakaan ei löydy."
    fi

    # /var/www vaatii yleensä root-oikeudet
    if [ -w "$WEB_ROOT" ]; then
      RSYNC=(rsync)
    else
      RSYNC=(sudo rsync)
      info "Web-juureen kirjoitetaan sudolla: $WEB_ROOT"
    fi
  fi
}

backup_database() {
  if [ "${SKIP_BACKUP:-0}" = "1" ]; then
    info "Ohitettu (SKIP_BACKUP=1)"
    return
  fi

  if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    info "Konttia '$DB_CONTAINER' ei ole käynnissä - ohitetaan"
    return
  fi

  local pg_user pg_db file
  pg_user="$(env_value POSTGRES_USER)"
  pg_db="$(env_value POSTGRES_DB)"
  if [ -z "$pg_user" ] || [ -z "$pg_db" ]; then
    info "POSTGRES_USER/POSTGRES_DB puuttuu .env-tiedostosta - ohitetaan"
    return
  fi

  mkdir -p "$BACKUP_DIR"
  file="$BACKUP_DIR/esedu-tiketti-$(date +%Y%m%d-%H%M%S).sql.gz"

  # Backendin käynnistys ajaa prisma migrate deploy -komennon, joten
  # varmuuskopio otetaan aina ennen uuden kontin käynnistämistä.
  docker exec "$DB_CONTAINER" pg_dump -U "$pg_user" -d "$pg_db" | gzip > "$file"
  info "Varmuuskopio: $file ($(du -h "$file" | cut -f1))"

  # Säilytetään BACKUP_KEEP uusinta
  ls -1t "$BACKUP_DIR"/esedu-tiketti-*.sql.gz 2>/dev/null \
    | tail -n "+$((BACKUP_KEEP + 1))" \
    | xargs -r rm -- || true
}

update_source() {
  PREV_SHA="$(git -C "$REPO_DIR" rev-parse --short HEAD)"

  if [ "${SKIP_GIT:-0}" = "1" ]; then
    info "Ohitettu (SKIP_GIT=1) - julkaistaan nykyinen työpuu: $PREV_SHA"
    return
  fi

  git -C "$REPO_DIR" fetch --prune origin
  # reset --hard koskee vain gitin seuraamia tiedostoja.
  # backend/.env ja backend/uploads/ säilyvät, koska ne eivät ole gitissä.
  git -C "$REPO_DIR" reset --hard "origin/$BRANCH"

  local new_sha
  new_sha="$(git -C "$REPO_DIR" rev-parse --short HEAD)"
  if [ "$new_sha" = "$PREV_SHA" ]; then
    info "Ei uusia commiteja ($new_sha) - rakennetaan silti uudelleen"
  else
    info "$PREV_SHA -> $new_sha"
    git -C "$REPO_DIR" log --oneline "$PREV_SHA..$new_sha" | sed 's/^/    /'
  fi
}

deploy_backend() {
  # Migraatiot ajetaan kontin käynnistyskomennossa (prisma migrate deploy).
  # Uusi kontti korvaa vanhan vasta kun image on rakennettu onnistuneesti.
  ( cd "$COMPOSE_DIR" && "${COMPOSE[@]}" up -d --build backend )

  # Poistetaan edellisen buildin orvot imaget
  docker image prune -f >/dev/null 2>&1 || true
}

deploy_frontend() {
  if [ "$BUILD_MODE" = host ]; then
    ( cd "$FRONTEND_DIR" && npm ci && npm run build )
  else
    # --user estää root-omisteiset tiedostot repoon
    docker run --rm \
      --user "$(id -u):$(id -g)" \
      -v "$FRONTEND_DIR:/app" \
      -w /app \
      node:20-alpine sh -c 'npm ci && npm run build'
  fi

  [ -f "$FRONTEND_DIR/dist/index.html" ] || die "Frontendin build epäonnistui: dist/index.html puuttuu."

  "${RSYNC[@]}" -a --delete "$FRONTEND_DIR/dist/" "$WEB_ROOT/"
  info "Julkaistu: $WEB_ROOT"
}

health_check() {
  # Frontend-julkaisu ei käynnistä konttia uudelleen, joten riittää
  # varmistaa, että nginx tarjoilee uuden sivun.
  if [ "$DEPLOY_BACKEND" = 0 ]; then
    if curl -fsS --max-time 10 "$SITE_URL" >/dev/null 2>&1; then
      info "Sivusto vastaa: $SITE_URL"
      return 0
    fi
    printf '\n\033[1;31m✖ Sivusto ei vastannut: %s\033[0m\n' "$SITE_URL" >&2
    echo "Tarkista nginx: sudo nginx -t && sudo systemctl status nginx" >&2
    exit 1
  fi

  local i
  for i in $(seq 1 30); do
    if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
      info "Backend vastaa: $HEALTH_URL"
      return 0
    fi
    sleep 2
  done

  printf '\n\033[1;31m✖ Backend ei vastannut 60 sekunnissa. Lokin loppu:\033[0m\n' >&2
  ( cd "$COMPOSE_DIR" && "${COMPOSE[@]}" logs --tail 40 backend ) >&2 || true
  echo >&2
  echo "Rollback: cd $REPO_DIR && git checkout $PREV_SHA && SKIP_GIT=1 ./deploy.sh$DEPLOY_ARGS" >&2
  exit 1
}

main "$@"
