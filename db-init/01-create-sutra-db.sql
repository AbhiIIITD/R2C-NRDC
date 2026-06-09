-- Runs once on first Postgres init (empty data dir).
-- Prisma uses the default `nrdc_r2c` DB (POSTGRES_DB); the SUTRA agents need a
-- separate `sutra` DB. pgvector is available via the pgvector/pgvector image.
CREATE DATABASE sutra;
\connect nrdc_r2c
CREATE EXTENSION IF NOT EXISTS vector;
\connect sutra
CREATE EXTENSION IF NOT EXISTS vector;
