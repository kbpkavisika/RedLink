# Backend image for Render (or any Docker host). Build from the backend folder:
#   docker build -t redlink-backend .
#   docker run -p 8080:8080 -e SPRING_PROFILES_ACTIVE=prod -e SPRING_DATASOURCE_URL=... redlink-backend
# Every setting comes from environment variables; application-prod.properties lists them.

# --- Stage 1: build the jar ---
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# Dependencies first: this layer is reused until pom.xml changes, so code-only changes build faster
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

# Tests are skipped here: CI runs them against a real PostgreSQL before anything is merged
COPY src src
RUN ./mvnw -B -q -DskipTests package && cp target/backend-*.jar app.jar

# --- Stage 2: run it ---
# Only the Java runtime and the jar: no JDK, Maven or source code in the image that runs
FROM eclipse-temurin:25-jre
WORKDIR /app

# Never run as root inside the container
RUN groupadd --system redlink && useradd --system --gid redlink redlink
USER redlink

COPY --from=build /app/app.jar app.jar

# The heap may use 75% of the container's memory (Render's free tier has 512 MB).
# Out of memory → exit, so the host restarts the app instead of it limping on.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"

# The app listens on $PORT (Render sets it), or 8080
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
