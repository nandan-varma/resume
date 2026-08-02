// Loads .env the same way the project's own scripts do, so logic that
// touches provider SDK constructors (e.g. lib/models.ts) has real keys.
import "dotenv/config";
