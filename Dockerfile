# --- Stage 1: Build the Application ---
# Use Node.js 18 (or a version matching your project's requirements) as the build environment
FROM node:lts-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies (only production dependencies are installed in the final stage)
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the NestJS application into optimized JavaScript (outputs to /dist by default)
RUN npm run build


# --- Stage 2: Run the Production Application ---
# Use a lean Node.js runtime image
FROM node:lts-alpine AS production

# Set the working directory
WORKDIR /app

# Copy only the production dependencies definition file
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the built application code from the 'build' stage
COPY --from=build /app/dist ./dist

# The default command to run the application when the container starts
# Assumes your package.json has a "start:prod" script (standard NestJS CLI setup)
CMD ["node", "dist/main"]
