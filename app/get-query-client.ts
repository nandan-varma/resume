import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import { cache } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        shouldRedactErrors: () => false,
      },
      queries: {
        staleTime: 5 * 60 * 1000,
      },
    },
  });
}

// cache() is scoped per request on the server, preventing data leaks between requests
const getServerQueryClient = cache(makeQueryClient);

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return getServerQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
