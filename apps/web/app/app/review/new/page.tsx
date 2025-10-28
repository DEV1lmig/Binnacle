import React, { Suspense } from "react";
import NewReviewClient from "./NewReviewClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading review form...</div>}>
      <NewReviewClient />
    </Suspense>
  );
}

