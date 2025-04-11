# Tiketti-järjestelmän arkkitehtuurikaavio

Tässä on kaavio siitä, miten järjestelmä toimii Apache-proxyn ja Docker-konttien kanssa:

```
                                 ┌───────────────────────────┐
                                 │                           │
                                 │    Käyttäjän selain       │
                                 │                           │
                                 └───────────┬───────────────┘
                                             │
                                             │ HTTPS
                                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                        Apache Web Server (it.esedu.fi)                    │
│                                                                           │
│  ┌────────────────────────────┐        ┌────────────────────────────┐     │
│  │                            │        │                            │     │
│  │  Staattinen sisältö        │        │  Reverse Proxy             │     │
│  │  /tiketti/* → /var/www/    │        │  /tiketti/api/* → http://  │     │
│  │  html/tiketti/             │        │  localhost:3001/api/*      │     │
│  │  (frontend/dist)           │        │                            │     │
│  │                            │        │                            │     │
│  └────────────────────────────┘        └────────────────┬───────────┘     │
│                                                         │                 │
└─────────────────────────────────────────────────────────┼─────────────────┘
                                                          │
                                                          │ HTTP
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                          Docker-ympäristö                                   │
│                                                                             │
│  ┌────────────────────────────┐        ┌────────────────────────────┐       │
│  │                            │        │                            │       │
│  │  Backend Container         │◄───────┤  PostgreSQL Container      │       │
│  │  (Node.js + Express)       │        │  (esedu-tiketti-db)        │       │
│  │  (esedu-tiketti-backend)   │        │                            │       │
│  │  Port: 3001                │        │  Port: 5432 (internal)     │       │
│  │                            │        │                            │       │
│  └────────────────────────────┘        └────────────────────────────┘       │
│                                                                             │
│                    Docker Network & Volume Mounts                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Komponentit

### 1. Apache Web Server
- Tarjoaa staattisia tiedostoja frontendin build-kansiosta (`/var/www/html/tiketti/`)
- Välittää API-kutsut (`/tiketti/api/*`) backend-kontille
- Hoitaa HTTPS-terminoinnin ja SSL-sertifikaatit

### 2. Frontend (Static Build)
- React-sovellus, joka on rakennettu tuotantoversion (`npm run build`)
- Sijaitsee Apache-palvelimen jakelukansiossa
- Koostuu staattisista HTML, CSS ja JavaScript-tiedostoista
- Kommunikoi backend-API:n kanssa `/api`-alkuisilla kutsuilla

### 3. Backend Docker-kontti
- Node.js ja Express-sovellus
- API-päätepisteet ja bisneslogiikka
- Kommunikoi PostgreSQL-tietokannan kanssa
- Kuuntelee porttia 3001
- JWT-autentikointi ja Azure AD -integraatio

### 4. PostgreSQL Docker-kontti
- Tietokanta tikettien, käyttäjien ja muun datan säilytykseen
- Käyttää pysyvää Docker-volyymiä datan säilyttämiseen
- Näkyy vain sisäisesti Docker-verkossa

## Tietovirta

1. Käyttäjä avaa selaimessa osoitteen `https://it.esedu.fi/tiketti`
2. Apache tarjoilee staattisen React-sovelluksen
3. React-sovellus tekee API-kutsun, joka alkaa `/api`
4. Apache välittää kutsun backend-kontille (`http://localhost:3001/api`)
5. Backend käsittelee pyynnön ja hakee/tallentaa tietoa PostgreSQL-tietokantaan
6. Vastaus palautuu samaa reittiä takaisin käyttäjälle

Tämä arkkitehtuuri mahdollistaa sovelluksen helpon ylläpidon, skaalautuvuuden ja tietoturvan.