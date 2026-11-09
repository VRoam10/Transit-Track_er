import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads the connection URL from schema.prisma, and no longer
// loads .env on its own. `process.env` (not `env()`) keeps `prisma generate`
// working where DATABASE_URL is unset, such as CI and the Docker build.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
