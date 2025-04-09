# backend/Dockerfile

# ---- Base ----
# Use an official Node.js runtime as a parent image
# Choose a version compatible with your project (e.g., based on package.json or @types/node)
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# ---- Dependencies ----
# Install dependencies first for better caching
FROM base AS deps
WORKDIR /usr/src/app
# Copy package.json and package-lock.json
COPY package*.json ./
# Copy prisma schema first, so it's available for generate during postinstall
COPY prisma ./prisma/
# Install ALL dependencies (including devDependencies) to run postinstall scripts
RUN npm ci
# Prune devDependencies after installation and postinstall hook
RUN npm prune --production
# --- Prisma Client should be generated at this point by postinstall ---

# ---- Builder ----
# Build the application
FROM base AS builder
WORKDIR /usr/src/app
# Copy package.json and package-lock.json first
COPY package*.json ./
# Copy the rest of the application code BEFORE installing deps
# This ensures prisma schema is available for postinstall generate
COPY . .
# Install all dependencies (including devDependencies)
RUN npm ci
# Generate Prisma Client (this might be redundant if postinstall works, but safe to keep)
RUN npx prisma generate
# Build TypeScript code
RUN npm run build

# ---- Runner ----
# Final stage/image
FROM base AS runner
WORKDIR /usr/src/app
# Copy production node_modules from deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
# Copy prisma directory from deps stage (contains generated client)
COPY --from=deps /usr/src/app/prisma ./prisma
# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist
# Copy package.json (needed for running scripts like migrate)
COPY package.json .

# Expose the port the app runs on (adjust if different)
EXPOSE 3001

# Command to run the application
# We will override this in docker-compose.yml to include migrations
CMD ["node", "dist/index.js"] 