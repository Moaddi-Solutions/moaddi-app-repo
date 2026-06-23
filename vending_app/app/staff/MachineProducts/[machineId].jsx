import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { machinesControlRoutes } from "~/components/staff/MachineCard";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { getRequest } from "~/services/httpClient";
import { machineQRScan } from "~/services/serverAddresses";

export default function MachineProducts() {
  const { machineId } = useLocalSearchParams();
  const { setMachine } = useMachine();
  const { user } = useUser();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) return router.navigate("/Signin");
    getRequest(machineQRScan(machineId)).then((response) => {
      const { statusCode, isActive, isConnected, vendorId, qrCode, type } =
        response;
      if (statusCode) return alert("error", t("machineNotFound"));
      if (process.env.NODE_ENV == "production") {
        if (!isConnected) return alert("error", t("machineIsOffline"));
        if (!isActive) return alert("error", t("machineIsNotActive"));
      }
      if (!(vendorId == user._id || user.role == "Admin"))
        return alert("error", t("notYourMachine"));
      alert("success", t("machineDetected"));
      setMachine(response);
      console.log(response);
      console.log(machinesControlRoutes[type]);

      router.replace({
        pathname: machinesControlRoutes[type],
        params: { qrCode },
      });
    });
  }, []);

  return (
    <>
      <Text className="text-xl mx-auto my-6">{t("loading")}</Text>
    </>
  );
}
