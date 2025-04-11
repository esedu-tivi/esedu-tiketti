# Käytetään Node.js:n virallista kuvaa
FROM node:18

# Määritä työskentelyhakemisto kontissa
WORKDIR /app

# Kopioi package.json ja package-lock.json
COPY package.json package-lock.json ./

# Kopioi prisma-hakemisto erikseen (jos ei sisälly ylempään COPY-komentoon)
COPY prisma ./prisma

# Verify prisma directory was copied correctly (debugging step)
RUN ls -la prisma/

# Asenna riippuvuudet
RUN npm install

# Kopioi kaikki tiedostot konttiin
COPY . .

# Tee TypeScript-käännös
RUN npm run build

# Aseta ympäristömuuttujat
ENV PORT=3001
EXPOSE 3001

# Käynnistä sovellus
CMD ["npm", "run", "start"]