# VoiceNow CRM Dockerfile
#
# BUILD NOTES (Nov 2024):
# - Error 127 = command not found (vite not installed)
# - Error 1 = npm ci or build failed
# - Use --legacy-peer-deps to resolve peer dependency conflicts
# - Render uses Docker deployment (NOT render.yaml buildCommand)
#
# Build stage for frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy only package files first for better caching
COPY frontend/package.json frontend/package-lock.json ./

# Install ALL dependencies (need devDeps like vite for build)
# Using --legacy-peer-deps to avoid peer dependency conflicts
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy frontend source files
COPY frontend/ ./

# Build frontend with npx to ensure vite is found
RUN npx vite build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from build stage
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Copy public files
COPY frontend/public ./frontend/public

# Expose port
EXPOSE 5001

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "backend/server.js"]
