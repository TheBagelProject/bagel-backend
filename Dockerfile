# Use official Node.js LTS image
FROM node:20-alpine

# Install Docker CLI
RUN apk add --no-cache docker-cli

# Create app directory with proper permissions
WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Install all dependencies first (including dev dependencies for build)
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies and source files after build
RUN rm -rf src tsconfig.json .prettierrc && \
    npm prune --production

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Expose the correct port
EXPOSE 5000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the app (production)
CMD ["npm", "run", "start:prod"]