// in apps/convex/clerk.ts

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

// Define a type for the event payload to avoid using 'any'
// This is a simplified version of the Clerk WebhookEvent
type WebhookEvent = {
  type: string;
  data: Record<string, any>;
};

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const event = await validateRequest(request);
  if (!event) {
    return new Response("Error occurred", { status: 400 });
  }

  // Handle different event types from Clerk
  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const user = event.data;
      // Call the internal mutation exported from `users.ts`.
      // Use a temporary `any` cast because `apps/backend/convex/_generated` may
      // be out-of-date in this workspace. Regenerate with `npx convex dev`
      // and then remove the cast to get typed function references.
      await ctx.runMutation(internal.users.store, {
        clerkId: user.id,
        email: user.email_addresses?.[0]?.email_address ?? "",
        username: user.username!,
        name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.full_name ?? undefined,
        avatarUrl: user.image_url,
      });
      break;
    }
    case "user.deleted": {
      // You can add logic here to handle user deletion later
      console.log("User deleted:", event.data.id);
      break;
    }
    default: {
      console.log("Unhandled Clerk event type:", event.type);
    }
  }

  return new Response(null, { status: 200 });
});

const http = httpRouter();

http.route({
  path: "/clerk",
  method: "POST",
  handler: handleClerkWebhook,
});

// Helper function to validate the webhook request
async function validateRequest(req: Request): Promise<WebhookEvent | undefined> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set in environment variables");
  }

  const payloadString = JSON.stringify(await req.json());
  const headers = req.headers;
  const wh = new Webhook(webhookSecret);

  try {
    // The 'svix' library will verify the signature and return the payload
    const event = wh.verify(payloadString, headers as any);
    return event as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return undefined;
  }
}

export default http;