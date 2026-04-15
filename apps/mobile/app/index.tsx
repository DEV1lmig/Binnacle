import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { LoadingState } from "@/src/ui/LoadingState";

export default function IndexRoute() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingState label="Preparing your session..." />;
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return <Redirect href="/(auth)" />;
}
