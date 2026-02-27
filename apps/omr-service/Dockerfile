FROM node:22-bookworm AS builder
WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY convex ./convex
COPY docs ./docs
COPY benchmarks ./benchmarks

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @grifftab/omr-service build

FROM node:22-bookworm AS node-runtime

FROM ubuntu:24.04 AS runtime
WORKDIR /workspace

ARG AUDIVERIS_VERSION=5.9.0
ARG TARGETARCH

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV OMR_MODE=audiveris
ENV AUDIVERIS_BIN=/usr/bin/audiveris
ENV JAVA_TOOL_OPTIONS=--add-opens=java.base/java.nio=ALL-UNNAMED

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl fontconfig fonts-dejavu-core openjdk-21-jre-headless \
  && if [ "$TARGETARCH" != "amd64" ]; then echo "Audiveris Linux package is only available for amd64. Build with --platform=linux/amd64."; exit 1; fi \
  && curl -fsSL -o /tmp/audiveris.deb \
    "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu24.04-x86_64.deb" \
  && mkdir -p /tmp/audiveris-unpacked \
  && dpkg-deb -R /tmp/audiveris.deb /tmp/audiveris-unpacked \
  && sed -i 's#^xdg-desktop-menu install .*#& || true#' /tmp/audiveris-unpacked/DEBIAN/postinst \
  && sed -i 's#^xdg-mime install .*#& || true#' /tmp/audiveris-unpacked/DEBIAN/postinst \
  && dpkg-deb -b /tmp/audiveris-unpacked /tmp/audiveris-patched.deb \
  && apt-get install -y --no-install-recommends /tmp/audiveris-patched.deb \
  && printf '%s\n' 'java-options=--add-exports=java.base/jdk.internal.ref=ALL-UNNAMED' >> /opt/audiveris/lib/app/Audiveris.cfg \
  && printf '%s\n' 'java-options=--add-opens=java.base/java.nio=ALL-UNNAMED' >> /opt/audiveris/lib/app/Audiveris.cfg \
  && rm -rf /tmp/audiveris.deb /tmp/audiveris-patched.deb /tmp/audiveris-unpacked \
  && if [ -x /opt/audiveris/bin/Audiveris ] && [ ! -x /usr/bin/audiveris ]; then ln -s /opt/audiveris/bin/Audiveris /usr/bin/audiveris; fi \
  && rm -rf /var/lib/apt/lists/*

COPY --from=node-runtime /usr/local /usr/local

COPY --from=builder /workspace /workspace

EXPOSE 4100

CMD ["node", "apps/omr-service/dist/server.js"]
