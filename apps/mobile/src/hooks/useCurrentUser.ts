import { useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";

export function useCurrentUser() {
  const currentUser = useQuery(api.users.current);

  return {
    currentUser,
    isLoading: currentUser === undefined,
  };
}
