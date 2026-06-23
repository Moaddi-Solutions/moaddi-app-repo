import { Suspense } from "react";
import FailureContent from "@/(root)/checkout/failure/FailureContent";

export default function CheckoutFailurePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading…</div>}>
      <FailureContent />
    </Suspense>
  );
}
