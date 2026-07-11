"use client";
import { useCart } from "@/(root)/context/cart-provider";
import { Card } from "@/../components/ui/card";
import { getRequest } from "@/../services/events";
import { machineQRScan } from "@/../services/serverAddresses";
import { PackageOpen, ScanQrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function MachineCard({ _id, name, qrCode, ...rest }) {
  const router = useRouter();
  const { user, setUser, setMachine } = useCart();
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
    <Card
      role="button"
      onClick={handleClick}
      className="group/machine cursor-pointer gap-0 rounded-xl p-4 pt-4! transition-transform hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="bg-muted text-primary-text flex size-11 items-center justify-center rounded-2xl">
        <PackageOpen className="size-5.5" strokeWidth={1.75} />
      </div>
      <p className="mt-3 truncate text-base font-extrabold">{name}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-primary-text text-sm font-bold">{t("open")}</span>
        <Link
          title="QR Scan"
          href="/machine-scan"
          onClick={(e) => e.stopPropagation()}
          className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-[10px] transition-colors hover:bg-primary-600"
        >
          <ScanQrCode className="size-4" />
        </Link>
      </div>
    </Card>
  );
}
