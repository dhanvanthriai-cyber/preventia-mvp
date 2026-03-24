# =============================================================================
# Project Preventia — Multi-Stage Dockerfile
# Stage 1 builds a fat JAR via Maven; Stage 2 runs it on a lean JRE image.
#
# Images pulled from:
#   docker.io/library/maven:3.9-eclipse-temurin-21   (build stage)
#   docker.io/library/eclipse-temurin:21-jre          (runtime stage)
#
# If you hit Docker Hub rate limits / auth errors, log in once:
#   podman login docker.io
# Or set REGISTRY=quay.io and use the quay mirrors below.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM --platform=linux/amd64 docker.io/library/maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy POM first so dependency layer is cached independently of source changes
COPY pom.xml .
RUN mvn dependency:go-offline -B

# CACHE_BUST forces this layer to recompile when passed as --build-arg CACHE_BUST=$(date +%s)
ARG CACHE_BUST=1
COPY src ./src
RUN mvn clean package -DskipTests -B

# ---------------------------------------------------------------------------
# Stage 2: Runtime (lean JRE only — no JDK, no Maven)
# ---------------------------------------------------------------------------
FROM --platform=linux/amd64 docker.io/library/eclipse-temurin:21-jre
WORKDIR /app

# Non-root user for security (no login shell, no home dir)
RUN groupadd -r preventia && useradd -r -g preventia preventia

# ---------------------------------------------------------------------------
# Trust Amazon's intermediate + root CAs so the JVM can reach api.daily.co.
# eclipse-temurin ships with a minimal cacerts that may be missing Amazon
# RSA 2048 M03 (intermediate). Both certs are committed under eng/certs/.
# ---------------------------------------------------------------------------
COPY certs/amazon-rsa-2048-m03.pem /tmp/amazon-rsa-2048-m03.pem
COPY certs/amazon-root-ca-1.pem    /tmp/amazon-root-ca-1.pem
RUN keytool -importcert -noprompt \
      -keystore "$JAVA_HOME/lib/security/cacerts" \
      -storepass changeit \
      -alias amazon-rsa-2048-m03 \
      -file /tmp/amazon-rsa-2048-m03.pem && \
    keytool -importcert -noprompt \
      -keystore "$JAVA_HOME/lib/security/cacerts" \
      -storepass changeit \
      -alias amazon-root-ca-1 \
      -file /tmp/amazon-root-ca-1.pem && \
    rm /tmp/amazon-rsa-2048-m03.pem /tmp/amazon-root-ca-1.pem

COPY --from=build /app/target/*.jar app.jar
RUN chown preventia:preventia app.jar

USER preventia

EXPOSE 8080

# $JAVA_OPTS allows runtime tuning (heap, GC flags, etc.)
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
