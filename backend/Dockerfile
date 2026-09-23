# Multi-Stage Production Dockerfile for Aegis Dispatch Backend
# Stage 1: Build JAR using Maven and Eclipse Temurin JDK 21
FROM maven:3.9.9-eclipse-temurin-21-jammy AS builder

WORKDIR /build

# Pre-fetch dependencies to leverage Docker layer caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build production artifact
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Minimal hardened JRE runtime
FROM eclipse-temurin:21-jre-jammy

LABEL maintainer="Aegis CAD Systems <dev@aegisdispatch.internal>"
LABEL version="2.5-pro"
LABEL description="Aegis Dispatch CAD Mission-Critical Backend Server"

WORKDIR /app

# Install curl for container healthchecking
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Run as non-privileged unprivileged user
RUN groupadd -r spring && useradd -r -g spring -u 1001 spring \
    && mkdir -p /app/data /app/data/backups \
    && chown -R spring:spring /app

USER spring:spring

# Copy built application JAR from builder stage
COPY --from=builder --chown=spring:spring /build/target/*.jar /app/app.jar

ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=postgres
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
