import "server-only";

import { neonConfig, Pool } from "@neondatabase/serverless";
import { DefaultLogger } from "drizzle-orm/logger";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { schema } from "./schema";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

const SQL_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "INSERT",
  "INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "ON",
  "GROUP",
  "BY",
  "ORDER",
  "ASC",
  "DESC",
  "LIMIT",
  "OFFSET",
  "HAVING",
  "AS",
  "IN",
  "NOT",
  "NULL",
  "IS",
  "LIKE",
  "ILIKE",
  "BETWEEN",
  "EXISTS",
  "COUNT",
  "SUM",
  "AVG",
  "MAX",
  "MIN",
  "COALESCE",
  "JSON_AGG",
  "JSON_BUILD_ARRAY",
  "RETURNING",
  "DISTINCT",
  "WITH",
];

class PrettySqlLogger extends DefaultLogger {
  private static formatValue(val: unknown): string {
    if (val === null) {
      return `${COLORS.gray}null${COLORS.reset}`;
    }
    if (val === undefined) {
      return `${COLORS.gray}undefined${COLORS.reset}`;
    }
    if (typeof val === "string") {
      const truncated = val.length > 50 ? `${val.slice(0, 47)}…` : val;
      return `${COLORS.green}'${truncated}'${COLORS.reset}`;
    }
    if (typeof val === "number") {
      return `${COLORS.cyan}${val}${COLORS.reset}`;
    }
    if (typeof val === "boolean") {
      return `${COLORS.yellow}${val}${COLORS.reset}`;
    }
    return `${COLORS.white}${String(val)}${COLORS.reset}`;
  }

  private static highlightKeywords(sql: string): string {
    const keywordRegex = new RegExp(`\\b(${SQL_KEYWORDS.join("|")})\\b`, "gi");
    return sql.replace(
      keywordRegex,
      (match) => `${COLORS.magenta}${match.toUpperCase()}${COLORS.reset}`
    );
  }

  private static getDurationColor(ms: number): string {
    if (ms > 500) {
      return COLORS.red;
    }
    if (ms > 100) {
      return COLORS.yellow;
    }
    return COLORS.green;
  }

  logQuery(query: string, params: unknown[]): void {
    const start = performance.now();

    let formattedQuery = PrettySqlLogger.highlightKeywords(query);

    if (params.length > 0) {
      const paramStrings = params.map((p) => PrettySqlLogger.formatValue(p));
      formattedQuery += `\n${COLORS.gray}params:${COLORS.reset} [${paramStrings.join(", ")}]`;
    }

    const duration = Math.round(performance.now() - start);
    const durationColor = PrettySqlLogger.getDurationColor(duration);

    const output = [
      `\n${COLORS.gray}┌─ SQL Query${"─".repeat(48)}${COLORS.reset}`,
      `${COLORS.gray}│${COLORS.reset} ${formattedQuery.split("\n").join(`\n${COLORS.gray}│${COLORS.reset} `)}`,
      `${COLORS.gray}│${COLORS.reset} ${COLORS.gray}took:${COLORS.reset} ${durationColor}${duration}ms${COLORS.reset}`,
      `${COLORS.gray}└${"─".repeat(60)}${COLORS.reset}`,
    ].join("\n");

    this.writer.write(output);
  }
}

export const db = drizzle(pool, {
  schema,
  logger:
    process.env.NODE_ENV === "development" ? new PrettySqlLogger() : false,
});
