# VoiceNow CRM Dockerfile
#
# BUILD NOTES (Nov 2024):
# - IMPORTANT: The .npmrc file MUST be copied before npm ci to avoid peer dependency conflicts
# - Error 127 "command not found" usually means vite isn't installed due to npm ci failing
# - The frontend uses Docker for deployment on Render (not the render.yaml buildCommand)
# - frontend/.npmrc contains legacy-peer-deps=true to resolve dependency conflicts
#
# Build stage for frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Copy npmrc for legacy-peer-deps setting
COPY frontend/.npmrc ./

# Install frontend dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

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
