# Tikettijärjestelmä - Dokumentaatio

## Pika-aloitus

1. Varmista että sinulla on:
   - [Docker Desktop](https://www.docker.com/products/docker-desktop/) asennettuna ja käynnissä
   - [Node.js](https://nodejs.org/) (v18 tai uudempi)
   - [Git](https://git-scm.com/downloads)

2. Kloonaa projekti:
```bash
git clone [repositorion-url]
cd esedu-tiketti
```

3. Asenna ja käynnistä backend:
```bash
cd backend
npm install
npm run dev
```
Tämä:
- Käynnistää PostgreSQL-tietokannan Docker-kontissa
- Ajaa tietokannan migraatiot
- Ajaa seed-skriptin joka luo testikäyttäjät ja kategoriat
- Käynnistää Prisma Studion (http://localhost:5555)
- Käynnistää backend-palvelimen (http://localhost:3001)

4. Asenna ja käynnistä frontend (uudessa terminaalissa):
```bash
cd frontend
npm install
npm run dev
```
Frontend käynnistyy osoitteeseen http://localhost:5173

## Testikäyttäjät ja seed-data

### Automaattisesti luotavat käyttäjät
Kehitysympäristössä luodaan automaattisesti seuraavat käyttäjät:

1. Admin-käyttäjä:
   - Nimi: Admin User
   - Email: admin@example.com
   - Rooli: ADMIN

2. Peruskäyttäjä:
   - Nimi: Test User
   - Email: user@example.com
   - Rooli: USER

Tällä hetkellä järjestelmä käyttää automaattisesti peruskäyttäjää (Test User) tikettien luonnissa, koska autentikointi ei ole vielä käytössä. Backend hakee automaattisesti ensimmäisen USER-roolin omaavan käyttäjän tietokannasta ja käyttää sitä tikettien luojana.

Voit tarkastella käyttäjiä Prisma Studiossa (http://localhost:5555) Users-taulussa.

### Kategoriat
Järjestelmään luodaan automaattisesti seuraavat kategoriat:
- Tekniset ongelmat
- Yleinen

### Seed-datan hallinta
Seed-data luodaan automaattisesti kun:
- Ajetaan `npm run dev` ensimmäistä kertaa
- Ajetaan `npm run db:reset` komento
- Ajetaan manuaalisesti `npx prisma db seed` komento

Seed-datan sisältöä voi muokata tiedostossa `backend/prisma/seed.ts`.

HUOM: `npm run db:reset` komento:
- Tyhjentää tietokannan
- Ajaa kaikki migraatiot
- Ajaa seed-skriptin
Käytä tätä vain kehitysympäristössä kun haluat palauttaa tietokannan alkutilaan!

Huom: Tällä hetkellä käyttäjien autentikointi ei ole vielä käytössä, joten järjestelmä käyttää automaattisesti peruskäyttäjää tikettien luonnissa.

## Projektin kuvaus
Tikettijärjestelmä on sovellus, joka mahdollistaa tikettien luomisen, hallinnan ja seurannan. Järjestelmä käyttää MSA-autentikointia käyttäjien tunnistamiseen.

## Teknologiat
- Frontend: React 18, React Query, React Router, Vite, TypeScript
- Backend: Node.js, TypeScript, Express
- Tietokanta: PostgreSQL
- ORM: Prisma
- Autentikointi: Microsoft Authentication (MSA)
- Konttiteknologia: Docker, Docker Compose

## Tietokantarakenne

### Ticket (Tiketti)
- `id`: String (UUID) - Tiketin yksilöllinen tunniste
- `title`: String - Tiketin otsikko
- `description`: String - Ongelman kuvaus
- `device`: String? - Laitteen tiedot (valinnainen)
- `additionalInfo`: String? - Lisätiedot (valinnainen)
- `status`: TicketStatus - Tiketin tila (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- `priority`: Priority - Prioriteetti (LOW, MEDIUM, HIGH, CRITICAL)
- `createdAt`: DateTime - Luontiaika
- `updatedAt`: DateTime - Viimeisin päivitysaika
- `categoryId`: String - Kategorian tunniste
- `createdById`: String - Luojan tunniste
- `assignedToId`: String? - Vastuuhenkilön tunniste (valinnainen)

### Category (Kategoria)
- `id`: String (UUID) - Kategorian yksilöllinen tunniste
- `name`: String - Kategorian nimi
- `description`: String? - Kategorian kuvaus (valinnainen)

### User (Käyttäjä)
- `id`: String (UUID) - Käyttäjän yksilöllinen tunniste
- `email`: String - Sähköpostiosoite
- `name`: String - Nimi
- `role`: UserRole - Rooli (ADMIN, USER)
- `createdAt`: DateTime - Luontiaika
- `updatedAt`: DateTime - Viimeisin päivitysaika

### Comment (Kommentti)
- `id`: String (UUID) - Kommentin yksilöllinen tunniste
- `content`: String - Kommentin sisältö
- `createdAt`: DateTime - Luontiaika
- `updatedAt`: DateTime - Viimeisin päivitysaika
- `ticketId`: String - Tiketin tunniste
- `authorId`: String - Kirjoittajan tunniste

## Tietokannan hallinta

### Migraatiot
Tietokannan rakenne on versionhallittu Prisman migraatioiden avulla. Migraatiot löytyvät `backend/prisma/migrations` -kansiosta.

#### Kehitysympäristössä
- Uuden migraation luominen: `npx prisma migrate dev --name muutoksen_nimi`
- Tietokannan nollaus: `npm run db:reset`
- Tietokannan käynnistys: `npm run db:up`
- Tietokannan sammutus: `npm run db:down`

#### Tuotantoympäristössä
- Migraatiot ajetaan automaattisesti `npm start` -komennon yhteydessä
- Migraatiot ajetaan turvallisesti `prisma migrate deploy` -komennolla
- Tuotannossa ei koskaan nollata tietokantaa tai poisteta migraatioita

### Prisma Studio
Kehitysympäristössä voit tarkastella ja muokata tietokantaa Prisma Studion avulla:
```bash
npm run dev:studio
```
Studio käynnistyy osoitteeseen http://localhost:5555

## API Endpoints

### Tiketit
- `GET /api/tickets` - Hae kaikki tiketit
- `GET /api/tickets/:id` - Hae yksittäinen tiketti
- `POST /api/tickets` - Luo uusi tiketti
  ```typescript
  {
    title: string;
    description: string;
    device?: string;
    additionalInfo?: string;
    priority: Priority;
    categoryId: string;
  }
  ```
- `PUT /api/tickets/:id` - Päivitä tiketti
  ```typescript
  {
    title?: string;
    description?: string;
    device?: string;
    additionalInfo?: string;
    status?: TicketStatus;
    priority?: Priority;
    assignedToId?: string;
    categoryId?: string;
  }
  ```
- `DELETE /api/tickets/:id` - Poista tiketti

### Kategoriat
- `GET /api/categories` - Hae kaikki kategoriat

### Kommentit
- `POST /api/tickets/:ticketId/comments` - Lisää kommentti tikettiin
  ```typescript
  {
    content: string;
  }
  ```
- `GET /api/tickets/:ticketId/comments` - Hae tiketin kommentit

## Kehitysympäristön pystytys

### Vaatimukset
- Node.js (v18 tai uudempi)
- Docker Desktop
- npm (v9 tai uudempi)
- Git

### Ympäristömuuttujat

#### Backend (.env)
```
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=esedu_tiketti_db

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5434/${POSTGRES_DB}?schema=public"

NODE_ENV=development
PORT=3001

JWT_SECRET=your-super-secret-key-here 
```

#### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

## Projektin rakenne

```
.
├── frontend/                # Frontend-sovellus
│   ├── src/
│   │   ├── components/     # Uudelleenkäytettävät komponentit
│   │   │   ├── ui/        # Yleiset UI-komponentit
│   │   │   └── Tickets/   # Tiketteihin liittyvät komponentit
│   │   ├── pages/         # Sivukomponentit
│   │   ├── utils/         # Apufunktiot
│   │   └── api/           # API-kutsut
│   └── ...
├── backend/                # Backend-sovellus
│   ├── src/
│   │   ├── routes/        # API-reitit
│   │   ├── controllers/   # Reitinkäsittelijät
│   │   ├── services/      # Bisneslogiikka
│   │   └── types/         # TypeScript-tyypit
│   ├── prisma/            # Prisma skeema ja migraatiot
│   └── ...
```

## Testaus
- Frontend: React Testing Library (tulossa)
- Backend: Jest (tulossa)
- E2E: Cypress (tulossa)

## Tuotantoon vienti

1. Buildaa sovellus:
```bash
# Backend
cd backend
npm run build

# Frontend
cd ../frontend
npm run build
```

2. Käynnistä tuotantoversio:
```bash
# Backend
cd backend
npm start
```

Huomioitavaa:
- Varmista että ympäristömuuttujat ovat oikein (erityisesti `DATABASE_URL`)
- Tuotannossa migraatiot ajetaan automaattisesti käynnistyksen yhteydessä
- Prisma Client generoidaan automaattisesti asennuksen ja buildin yhteydessä

## Vianetsintä

### Yleiset ongelmat

1. Docker-kontti ei käynnisty
   - Varmista että Docker Desktop on käynnissä
   - Tarkista portit (5434 pitää olla vapaana)
   - Kokeile `docker-compose down` ja sitten `npm run dev`

2. Prisma-virheet
   - Poista `node_modules/.prisma`
   - Aja `npm install`
   - Aja `npx prisma generate`

3. TypeScript-virheet
   - Varmista että kaikki riippuvuudet on asennettu
   - Tarkista että `tsconfig.json` on ajan tasalla
   - Kokeile käynnistää TypeScript-palvelin uudelleen VS Codessa 