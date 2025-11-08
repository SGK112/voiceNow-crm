# Dockerfile for VoiceFlow CRM
# Works with monorepo structure

FROM node:18-alpine

WORKDIR /app

# Copy all package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install root dependencies
RUN npm install

# Copy all application code
COPY . ./

# Install patch-package globally to handle postinstall scripts
RUN npm install -g patch-package

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Clean up frontend node_modules to save space
RUN rm -rf node_modules

# Back to root, prune dev dependencies
WORKDIR /app
RUN npm prune --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "backend/server.js"]
