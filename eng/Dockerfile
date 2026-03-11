# =============================================================================
# Project Dhanvanthri — Multi-Stage Dockerfile
# Stage 1 builds a fat JAR via Maven; Stage 2 runs it on a lean JRE image.
# Expected runtime image size: ~250–300 MB (eclipse-temurin:21-jre base).
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy POM first so dependency layer is cached independently of source changes
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# ---------------------------------------------------------------------------
# Stage 2: Runtime (lean JRE only — no JDK, no Maven)
# ---------------------------------------------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app

# Non-root user for security (no login shell, no home dir)
RUN groupadd -r dhanvanthri && useradd -r -g dhanvanthri dhanvanthri

COPY --from=build /app/target/*.jar app.jar
RUN chown dhanvanthri:dhanvanthri app.jar

USER dhanvanthri

EXPOSE 8080

# $JAVA_OPTS allows runtime tuning (heap, GC flags, Secrets Manager agent, etc.)
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
