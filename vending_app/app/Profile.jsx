import { useRouter } from "expo-router";
import { BadgeCheck, Globe, LogOut, ReceiptText, User, UserX } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { Avatar, Badge, Card, ListItem, listItemIconColor, Separator } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import LanguageSelectorModal from "~/components/LanguageSelectorModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Text as UIText } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useUser } from "~/context/UserContext";
import { useManyReference } from "~/hook/useManyReference";
import i18n from "~/lib/i18n";
import { removeItem } from "~/lib/utils";
import { colors, palette, space, type as typo } from "~/theme/moaddi";

function Profile() {
  const { user, clearUser, isLoading } = useUser();
  const { clearMachine } = useMachine();
  const router = useRouter();
  const { t } = useTranslation();
  const [alertOpen, setAlertOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const { isPending, items, total } = useManyReference("purchases", {
    target: "customerId",
    id: user?._id,
  });

  useEffect(() => {
    if (!isLoading && !user) router.replace("/Signin");
  }, [isLoading, user, router]);

  const logout = async () => {
    await clearUser();
    await clearMachine();
    await removeItem("otp");
    router.replace("/Signin");
  };

  if (!user) return null;

  const totalSpent = !isPending
    ? items.reduce((sum, p) => parseFloat(p.price) + sum, 0).toFixed(2)
    : "—";

  const currentLang = i18n.language?.startsWith("ar") ? "العربية" : "English";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <LanguageSelectorModal isModalVisible={langOpen} setModalVisible={setLangOpen} />
      <DetailHeader
        title={t("profile")}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, gap: 16 }}
      >
        {/* Identity card */}
        <Card raised>
          <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
            <Avatar name={user.name} src={user.image} size={72} ring />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ ...typo.title3, color: colors.textHeading }}>{user.name}</Text>
              <BadgeCheck size={18} color={palette.teal[500]} />
            </View>
            <Text style={{ ...typo.caption, color: colors.textMuted }}>
              {t("whatsappNumberVerified")}
            </Text>
            <View style={{ flexDirection: "row", gap: 32, marginTop: 8 }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ ...typo.caption, color: colors.textMuted }}>{t("totalOrders")}</Text>
                <Text style={{ ...typo.title2, color: colors.textHeading }}>{total ?? 0}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ ...typo.caption, color: colors.textMuted }}>{t("totalSpent")}</Text>
                <Text style={{ ...typo.title2, color: colors.textHeading }}>
                  {totalSpent} {t("sar")}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Menu */}
        <Card padded={false} style={{ paddingHorizontal: 12 }}>
          <ListItem
            icon={<User size={18} color={listItemIconColor()} />}
            title={t("profile")}
            subtitle={t("editYourPersonalInformation")}
            onPress={() => router.navigate("/ProfileSetting")}
          />
          <Separator />
          <ListItem
            icon={<ReceiptText size={18} color={listItemIconColor()} />}
            title={t("PurchaseHistory")}
            trailing={<Badge tone="brand">{total ?? 0}</Badge>}
            onPress={() => router.navigate("/PurchaseHistory")}
          />
          <Separator />
          <ListItem
            icon={<Globe size={18} color={listItemIconColor()} />}
            title={t("language")}
            subtitle={currentLang}
            onPress={() => setLangOpen(true)}
          />
        </Card>

        <Card padded={false} style={{ paddingHorizontal: 12 }}>
          <ListItem
            icon={<LogOut size={18} color={listItemIconColor(true)} />}
            title={t("logOut")}
            destructive
            chevron={false}
            onPress={() => setAlertOpen(true)}
          />
          <Separator />
          <ListItem
            icon={<UserX size={18} color={listItemIconColor(true)} />}
            title={t("deactivateAccount")}
            destructive
            chevron={false}
            onPress={() => router.navigate("/Settings")}
          />
        </Card>
      </ScrollView>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("areYouAbsolutelySure")}</AlertDialogTitle>
            <AlertDialogDescription>{t("areYouSureToLogout")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <UIText>{t("cancel")}</UIText>
            </AlertDialogCancel>
            <AlertDialogAction onPress={logout} variant={"destructive"}>
              <UIText>{t("logout")}</UIText>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

export default Profile;
