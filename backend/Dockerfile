# Backend Dockerfile
FROM node:18

# Install build dependencies for better-sqlite3 and curl for health checks
RUN apt-get update && \
    apt-get install -y \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies first (including dev deps for build)
# better-sqlite3 will compile native bindings
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Copy non-TypeScript files that aren't compiled (like .sql files)
RUN cp -r src/database/*.sql dist/database/ 2>/dev/null || true

# Create data directory for database storage
RUN mkdir -p data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]