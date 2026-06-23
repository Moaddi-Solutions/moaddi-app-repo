"use client";
import { useCart } from "@/(root)/context/cart-provider";
import { Button } from "@/../components/ui/button";
import { Card } from "@/../components/ui/card";
import { getRequest } from "@/../services/events";
import { machineQRScan } from "@/../services/serverAddresses";
import { ScanQrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function MachineCard({ _id, name, qrCode, ...rest }) {
  const router = useRouter();
  const { user, setUser, setMachine } = useCart();
  // console.log(user);
  const t = useTranslations("QR");
  const handleClick = async (e) => {
    if (!user) router.push("/signin");
    let response = await getRequest(machineQRScan(qrCode));
    if (response.statusCode) return toast.error(t("machineNotFound"));
    if (process.env.NODE_ENV == "production") {
      if (!response.isConnected) return toast.error(t("machineIsOffline"));
      if (!response.isActive) return toast.error(t("machineIsNotActive"));
    }
    toast.success(t("machineDetected"));
    setUser((prev) => ({ ...prev, machines: [response] }));
    setMachine(response);
    router.push(
      `/machine-products?qr=${encodeURIComponent(String(response.qrCode ?? qrCode))}`,
    );
  };
  return (
    <Card className="rounded-xl border">
      <div className="flex h-full items-center justify-between gap-1 px-4">
        <Button variant="outline" onClick={handleClick}>
          {name}
        </Button>
        <Link title="QR Scan" href="/machine-scan">
          <Button variant="ghost" size="icon" className="relative">
            <ScanQrCode className="size-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
