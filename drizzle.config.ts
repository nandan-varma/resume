import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  dialect: "postgresql",
  out: "./migrations",
  schema: "./db/schema.ts",
});
