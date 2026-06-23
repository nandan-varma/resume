import "server-only";

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { schema } from "./schema";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === "development"
    ? { logQuery: (q: string) => console.log(q.length > 150 ? `${q.slice(0, 40)}...` : q) }
    : false,
});
