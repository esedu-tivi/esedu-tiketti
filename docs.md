# Tikettijärjestelmä - Dokumentaatio

## Projektin kuvaus
Tikettijärjestelmä on sovellus, joka mahdollistaa tikettien luomisen, hallinnan ja seurannan. Järjestelmä käyttää MSA-autentikointia käyttäjien tunnistamiseen.

## Teknologiat
- Frontend: React 18, React Query, React Router, Vite
- Backend: Node.js, TypeScript, Express
- Tietokanta: PostgreSQL
- Autentikointi: Microsoft Authentication (MSA)

## Kehitysympäristön pystytys

### Vaatimukset
- Node.js (v18 tai uudempi)
- npm (v9 tai uudempi)
- PostgreSQL (tulossa myöhemmin)

### Ympäristömuuttujat

#### Backend (.env)
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/tiketti_db
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend käynnistyy oletuksena porttiin 3000.

### Backend

```bash
cd backend
npm install
cp .env.example .env  # Kopioi ja muokkaa ympäristömuuttujat
npm run dev
```

Backend käynnistyy porttiin 3001.

## Projektin rakenne

```
.
├── frontend/
│   ├── src/
│   │   ├── components/     # Uudelleenkäytettävät komponentit
│   │   ├── pages/         # Sivukomponentit
│   │   └── utils/         # Apufunktiot ja API-kutsut
│   └── ...
├── backend/
│   ├── src/
│   │   ├── routes/        # API-reitit (tulossa)
│   │   ├── controllers/   # Reitinkäsittelijät (tulossa)
│   │   └── models/        # Tietokantamallit (tulossa)
│   └── ...
```

## API-dokumentaatio

### Nykyiset endpointit

#### GET /api/health
Terveystarkistus endpoint.

Vastaus:
```json
{
  "status": "ok"
}
```

#### GET /api/tickets
Hakee kaikki tiketit.

Vastaus:
```json
{
  "tickets": [
    {
      "id": 1,
      "title": "Tiketin otsikko",
      "description": "Tiketin kuvaus",
      "status": "Avoin",
      "createdAt": "2024-01-21T12:00:00Z"
    }
  ]
}
```

## Kehitystyönkulku

1. Kloonaa repositorio
2. Asenna riippuvuudet molemmissa kansioissa
3. Kopioi .env.example tiedosto .env tiedostoksi ja täytä tarvittavat arvot
4. Käynnistä kehityspalvelimet

## Testaus
- Frontend: Komponenttitestit (tulossa)
- Backend: API-testit (tulossa)

## Tuotantoon vienti (tulossa)
- Ympäristömuuttujien konfigurointi
- Build-prosessi
- Deployment-ohjeet 