"use client";
import { useCart } from "@/(root)/context/cart-provider";
import { Button } from "@/../components/ui/button";
import { Container } from "@/../components/ui/container";
import { getRequest } from "@/../services/events";
import { machineQRScan } from "@/../services/serverAddresses";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import qrcodeParser from "qrcode-parser";
import { useEffect, useState } from "react";
import { useZxing } from "react-zxing";
import { toast } from "sonner";

const supportedTypes = ["jpg", "jpeg", "png"];
const sizeLimit = 5000000; // 5MB
const normalizeQrCode = (value) => {
  const text = String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!text) return "";

  if (!/^https?:\/\//i.test(text)) return text;

  try {
    const url = new URL(text);
    const fromQuery =
      url.searchParams.get("qr") ||
      url.searchParams.get("qrCode") ||
      url.searchParams.get("code") ||
      url.searchParams.get("machine") ||
      url.searchParams.get("group") ||
      url.searchParams.get("groupId");
    if (fromQuery) return fromQuery.trim();

    const lastPathPart = url.pathname.split("/").filter(Boolean).pop();
    return String(lastPathPart || "").trim();
  } catch {
    return text;
  }
};

const isGroupQrCode = (value) =>
  String(value || "").startsWith("g_") || /^[a-f0-9]{24}$/i.test(String(value || ""));

const isMachineQrCode = (value) => {
  const code = String(value || "");
  return code.startsWith("machine_") || code.startsWith("M");
};

const machineLookupCode = (value) => {
  const code = String(value || "").trim();
  return code.startsWith("machine_") ? code.slice("machine_".length) : code;
};

const MachineScan = () => {
  const router = useRouter();
  const t = useTranslations("QR");
  const [showScan, setShowScan] = useState(false);

  const [isLoader, setIsLoader] = useState(false);
  const [text, setText] = useState(null);
  const { setUser, setMachine } = useCart();

  const cameraScan = { setText };
  const startCameraScan = () => {
    if (
      typeof window !== "undefined" &&
      (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
    ) {
      toast.error("Camera requires HTTPS or localhost.");
      return;
    }
    setShowScan(true);
  };

  useEffect(() => {
    if (text) {
      if (!isLoader) {
        const qrCode = normalizeQrCode(text);
        if (!qrCode) {
          toast.error(t("invalidQrCode"));
          return;
        }
        if (isGroupQrCode(qrCode)) {
          router.push(`/group-products?group=${encodeURIComponent(qrCode)}`);
          return;
        }
        onSearchMachine(machineLookupCode(qrCode));
      }
    }
  }, [text]);
  const onSearchMachine = async (data) => {
    setIsLoader(true);
    let response = await getRequest(machineQRScan(data));
    setIsLoader(false);
    if (response.statusCode) return toast.error(t("machineNotFound"));
    if (process.env.NODE_ENV == "production") {
      if (!response.isConnected) return toast.error(t("machineIsOffline"));
      if (!response.isActive) return toast.error(t("machineIsNotActive"));
    }
    toast.success(t("machineDetected"));
    setUser((prev) => ({ ...prev, machines: [response] }));
    setMachine(response);
    const code = response.qrCode ?? data;
    router.push(
      `/machine-products?qr=${encodeURIComponent(String(code))}`,
    );
  };
  const imageUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (file) {
      if (
        supportedTypes.some(
          (type) =>
            file.type.toLowerCase().includes(type) ||
            file.name.toLowerCase().endsWith(`.${type}`),
        ) &&
        file.size <= sizeLimit
      ) {
        try {
          const text = await qrcodeParser(file);
          const qrCode = normalizeQrCode(text);
          if (!qrCode) {
            toast.error(t("invalidQrCode"));
            return;
          }
          setText(qrCode);
        } catch (error) {
          // console.log(error);

          toast.error(t("invalidImage"));
        }
      } else {
        toast.error(t("invalidImageTypeOrSize"));
        toast.info(t("supportedTypesJpgJpegPngMaxSize_5mb"));
      }
    }
    input.value = "";
  };
  return (
    <Container className="my-10 flex max-w-md flex-col items-center gap-4 text-center">
      <div>
        <h1 className="text-xl font-extrabold md:text-2xl">
          {t("scanMachine")}
        </h1>
        <p className="text-muted-foreground mt-1 text-[13.5px] font-semibold">
          Point your camera at the QR on the machine&apos;s screen or sticker.
        </p>
      </div>

      <button
        type="button"
        onClick={!showScan ? startCameraScan : undefined}
        aria-label={t("scanMachine")}
        className="moaddi-scan-view w-full"
      >
        {showScan && <CameraScan setText={setText} />}
        <span className="moaddi-reticle">
          <i />
          <i />
          <i />
          <i />
          <span className="moaddi-scanline" />
        </span>
        {isLoader && (
          <span className="absolute inset-0 grid place-items-center bg-black/60 text-sm font-bold text-white">
            Checking machine…
          </span>
        )}
      </button>

      <div className="grid w-full gap-2.5">
        <Button asChild variant="outline" size="lg" className="w-full cursor-pointer font-bold">
          <label htmlFor="file">
            <input
              onChange={imageUpload}
              id="file"
              type="file"
              hidden
              accept="image/*"
            />
            <Upload className="size-4" />
            {t("scanMachineFromImage")}
          </label>
        </Button>
        <span className="text-muted-foreground text-[12px] font-semibold">
          Group QR codes work here too — you&apos;ll see every machine in the
          group.
        </span>
      </div>
    </Container>
  );
};

const CameraScan = ({ setText }) => {
  const { ref } = useZxing({
    constraints: { video: true },
    onDecodeResult(text) {
      const result = text.getText();
      setText((prev) => {
        if (prev == result) toast.error("Same code");
        return result;
      });
    },
    onError(error) {
      toast.error(error?.message || "Could not open camera.");
    },
  });
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      ref={ref}
      muted
      playsInline
      autoPlay
    />
  );
};

export default MachineScan;
