FROM node:8.10

RUN mkdir -p /input /output

WORKDIR /output/

RUN apt-get update && apt-get install zip -y