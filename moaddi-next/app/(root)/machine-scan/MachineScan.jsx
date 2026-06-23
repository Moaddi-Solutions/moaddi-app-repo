"use client";
import { useCart } from "@/(root)/context/cart-provider";
import { Button } from "@/../components/ui/button";
import { Container } from "@/../components/ui/container";
import { getRequest } from "@/../services/events";
import { machineQRScan } from "@/../services/serverAddresses";
import { QrCode } from "lucide-react";
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
    <Container
      className={`${!showScan ? "my-40" : "my-2"} flex flex-col items-center justify-center gap-2`}
    >
      {showScan ? (
        <CameraScan {...cameraScan} />
      ) : (
        <>
          <Button
            onClick={startCameraScan}
            variant={"bordered"}
            className="flex size-45 flex-col "
          >
            <QrCode className="size-30" />
            <p>{t("scanMachine")}</p>
          </Button>
          <Button asChild variant={"bordered"} className="w-45 cursor-pointer">
            <label htmlFor="file">
              <input
                onChange={imageUpload}
                id="file"
                type="file"
                hidden
                accept="image/*"
              />
              <p>{t("scanMachineFromImage")}</p>
            </label>
          </Button>
        </>
      )}
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
    <div className="w-full max-w-md overflow-hidden rounded-lg border bg-black">
      <video
        className="aspect-square w-full object-cover"
        ref={ref}
        muted
        playsInline
        autoPlay
      />
    </div>
  );
};

export default MachineScan;
