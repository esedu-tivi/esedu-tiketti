# Varmistetaan että ollaan oikeassa hakemistossa
Set-Location $PSScriptRoot/..

# Käynnistetään Docker-kontti
Write-Host "Starting PostgreSQL container..."
docker-compose up -d

# Odotetaan että tietokanta on valmis
Write-Host "Waiting for PostgreSQL to be ready..."
Start-Sleep -Seconds 10

# Ajetaan Prisma migraatiot
Write-Host "Running Prisma migrations..."
npx prisma generate
npx prisma migrate dev --name init

Write-Host "Database setup complete!" 