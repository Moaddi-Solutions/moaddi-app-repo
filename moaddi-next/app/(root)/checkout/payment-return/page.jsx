import { Suspense } from "react";
import PaymentReturn from "@/(root)/checkout/payment-return/PaymentReturn";

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground p-8 text-center text-sm">
          Loading…
        </div>
      }
    >
      <PaymentReturn />
    </Suspense>
  );
}
