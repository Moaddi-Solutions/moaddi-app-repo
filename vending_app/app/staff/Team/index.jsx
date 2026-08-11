import { useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { Card, Loader, Switch } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useAbility } from "~/context/AbilityContext";
import { useStaffMembers } from "~/hook/useStaffMembers";
import alert from "~/lib/alert";
import { can } from "~/lib/ability";
import { putRequest } from "~/services/httpClient";
import { userToggleAPI } from "~/services/serverAddresses";
import { colors, space, type as typo } from "~/theme/moaddi";

/**
 * The staff working in the shops this user administers.
 *
 * Activating and deactivating an account is the one piece of staff admin worth
 * doing from a phone — a supplier who should not be opening machines today can
 * be switched off on the spot. Everything else about an account (roles, bank
 * details) stays on the dashboard.
 */
export default function StaffTeam() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ability, capabilities } = useAbility();
  const { isPending, items } = useStaffMembers();
  const [busyId, setBusyId] = useState(null);

  const toggle = async (member) => {
    setBusyId(member._id);
    try {
      const res = await putRequest(userToggleAPI(member._id), {});
      if (res?.message && !res?._id) throw new Error(res.message);
      await queryClient.invalidateQueries({ queryKey: ["StaffMembers"] });
    } catch (error) {
      alert("error", error?.message || String(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("staff")}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      {!capabilities.managesStaff ? (
        <Text
          style={{
            ...typo.body,
            textAlign: "center",
            marginTop: 48,
            color: colors.textMuted,
          }}
        >
          {t("staffAreaOnly")}
        </Text>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: space.gutter,
            gap: 12,
            paddingTop: 16,
            paddingBottom: 32,
          }}
        >
          {isPending ? (
            <Loader />
          ) : items.length ? (
            items.map((member) => {
              // Asked of the record: the list is already scoped, but a shop
              // admin still may not switch off an account outside their shops.
              const editable = can(ability, "update", "User", {
                _id: member._id,
                shopId: member.shopId ?? null,
              });
              return (
                <Card key={member._id}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ ...typo.label, color: colors.textHeading }}
                        numberOfLines={1}
                      >
                        {member.name ?? member._id}
                      </Text>
                      <Text
                        style={{ ...typo.caption, color: colors.textMuted }}
                        numberOfLines={1}
                      >
                        {member.phone ?? member.email ?? member._id}
                      </Text>
                    </View>
                    <Switch
                      checked={member.isActive !== false}
                      disabled={!editable || busyId === member._id}
                      onChange={() => toggle(member)}
                    />
                  </View>
                </Card>
              );
            })
          ) : (
            <Text
              style={{
                ...typo.body,
                textAlign: "center",
                marginTop: 48,
                color: colors.textMuted,
              }}
            >
              {t("noStaff")}
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
