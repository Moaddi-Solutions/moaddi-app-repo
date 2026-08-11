import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Badge, Button } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useAbility } from "~/context/AbilityContext";
import { useUser } from "~/context/UserContext";
import { can } from "~/lib/ability";
import { getRequest, putRequest } from "~/services/httpClient";
import {
  myWithdrawalsAPI,
  withdrawalApproveAPI,
  withdrawalMarkPaidAPI,
  withdrawalProofImageUrl,
  withdrawalRejectAPI,
} from "~/services/serverAddresses";
import { colors, radius, space, type as typo } from "~/theme/moaddi";

function fmtMoney(v) {
  if (v == null || v === "") return "0.00";
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(2);
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n.toFixed(2) : v;
  }
  if (typeof v === "object" && v?.$numberDecimal != null) {
    const n = parseFloat(v.$numberDecimal);
    return Number.isFinite(n) ? n.toFixed(2) : String(v.$numberDecimal);
  }
  return "0.00";
}

const STATUS_TONE = {
  Pending: "warning",
  Approved: "info",
  Rejected: "danger",
  Paid: "success",
};

/**
 * Review controls, shown only on rows this user may actually decide.
 *
 * The permission is checked against the record, not the role: a Shop Admin's
 * approve/reject/pay rules are scoped to their own shops, so a class-level
 * check would light the buttons up on every row and let the server refuse
 * them one by one. The server is still the authority — this only keeps the UI
 * honest about what will work.
 */
function ReviewActions({ row, busy, onApprove, onReject, onMarkPaid }) {
  const { t } = useTranslation();
  const { ability } = useAbility();

  const mayApprove = can(ability, "approve", "Withdrawal", row);
  const mayPay = can(ability, "pay", "Withdrawal", row);
  if (!mayApprove && !mayPay) return null;

  // The workflow is Pending → Approved → Paid; each state offers only its own
  // next steps, so there is never a button that the server would reject as a
  // status conflict.
  const pending = row.status === "Pending";
  const approved = row.status === "Approved";
  if (!pending && !approved) return null;

  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
      {pending && mayApprove ? (
        <>
          <Button
            size="sm"
            variant="primary"
            disabled={busy}
            onPress={onApprove}
            style={{ flex: 1 }}
          >
            {t("approve")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onPress={onReject}
            style={{ flex: 1 }}
          >
            {t("reject")}
          </Button>
        </>
      ) : null}
      {approved && mayPay ? (
        <Button
          size="sm"
          variant="primary"
          disabled={busy}
          onPress={onMarkPaid}
          style={{ flex: 1 }}
        >
          {t("markPaid")}
        </Button>
      ) : null}
    </View>
  );
}

export default function WithdrawalsList() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUser();
  const { capabilities } = useAbility();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [previewUri, setPreviewUri] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // One screen, two audiences: a supplier reviewing their own payout history,
  // and a shop admin working the queue for their shops. The endpoint is the
  // same — the server scopes it per role — so only the framing differs.
  const isReviewer = capabilities.reviewsWithdrawals;
  const canUse = isReviewer || capabilities.ownsWallet;

  const load = useCallback(async () => {
    if (!canUse) {
      setError(t("staffAreaOnly"));
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError("");
    try {
      const res = await getRequest(`${myWithdrawalsAPI}?limit=100&offset=0`);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canUse, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  /** Runs one review action, then reloads so the row shows its new status. */
  const act = useCallback(
    async (id, request) => {
      setBusyId(id);
      setError("");
      try {
        await request();
        await load();
      } catch (e) {
        setError(e?.message || t("withdrawalActionFailed"));
      } finally {
        setBusyId(null);
      }
    },
    [load, t]
  );

  const submitReject = useCallback(async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setError(t("rejectReasonRequired"));
      return;
    }
    const id = rejecting;
    setRejecting(null);
    setRejectReason("");
    await act(id, () => putRequest(withdrawalRejectAPI(id), { reason }));
  }, [act, rejectReason, rejecting, t]);

  if (!user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={isReviewer ? t("withdrawalRequests") : t("withdrawals")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.navigate("/staff")
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: space.card,
          padding: space.gutter,
          paddingBottom: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {isReviewer ? (
          <Text style={{ ...typo.caption, color: colors.textMuted }}>
            {t("reviewWithdrawals")}
          </Text>
        ) : null}

        {loading && !refreshing ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <ActivityIndicator color={colors.interactivePrimary} />
          </View>
        ) : (
          <>
            {error ? (
              <Text style={{ ...typo.body, color: colors.danger }}>{error}</Text>
            ) : null}
            {rows.length === 0 && !error ? (
              <Text style={{ ...typo.body, color: colors.textMuted }}>
                {isReviewer ? t("noWithdrawalRequests") : t("noTransactionsYet")}
              </Text>
            ) : null}
            {rows.map((w) => {
              const uri = withdrawalProofImageUrl(w.proofImage);
              return (
                <View
                  key={w._id}
                  style={{
                    backgroundColor: colors.surfaceCard,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                    padding: 14,
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ ...typo.bodyStrong, color: colors.textHeading }}
                    >
                      {fmtMoney(w.amount)} {w.currency}
                    </Text>
                    <Badge tone={STATUS_TONE[w.status] ?? "neutral"} dot>
                      {w.status}
                    </Badge>
                  </View>
                  {/* Whose request this is only matters when reviewing others'. */}
                  {isReviewer && w.vendorId ? (
                    <Text style={{ ...typo.caption, color: colors.textMuted }}>
                      {t("requestedBy")}: {w.vendorId}
                    </Text>
                  ) : null}
                  <Text style={{ ...typo.caption, color: colors.textMuted }}>
                    {w.requestedAt
                      ? new Date(w.requestedAt).toLocaleString()
                      : ""}
                  </Text>
                  {w.status === "Rejected" && w.rejectionReason ? (
                    <Text style={{ ...typo.body, color: colors.textBody }}>
                      {t("rejectionReason")}: {w.rejectionReason}
                    </Text>
                  ) : null}
                  {uri ? (
                    <Pressable
                      onPress={() => setPreviewUri(uri)}
                      style={{ marginTop: 4 }}
                    >
                      <Text
                        style={{
                          ...typo.caption,
                          color: colors.textBrand,
                          marginBottom: 4,
                        }}
                      >
                        {t("proofImage")}
                      </Text>
                      <Image
                        source={{ uri }}
                        style={{
                          width: "100%",
                          height: 128,
                          borderRadius: radius.md,
                          backgroundColor: colors.surfaceSunken,
                        }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ) : null}

                  <ReviewActions
                    row={w}
                    busy={busyId === w._id}
                    onApprove={() =>
                      act(w._id, () =>
                        putRequest(withdrawalApproveAPI(w._id), {})
                      )
                    }
                    onReject={() => {
                      setRejectReason("");
                      setRejecting(w._id);
                    }}
                    onMarkPaid={() =>
                      act(w._id, () =>
                        putRequest(withdrawalMarkPaidAPI(w._id), {})
                      )
                    }
                  />
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Rejection needs a reason — the server rejects the call without one. */}
      <Modal
        visible={!!rejecting}
        transparent
        animationType="fade"
        onRequestClose={() => setRejecting(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: space.gutter,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surfaceCard,
              borderRadius: radius.lg,
              padding: 16,
              gap: 12,
            }}
          >
            <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>
              {t("rejectReasonLabel")}
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              style={{
                ...typo.body,
                color: colors.textBody,
                borderWidth: 1,
                borderColor: colors.borderDefault,
                borderRadius: radius.md,
                padding: 10,
                minHeight: 80,
                textAlignVertical: "top",
              }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                size="sm"
                variant="outline"
                onPress={() => setRejecting(null)}
                style={{ flex: 1 }}
              >
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onPress={submitReject}
                style={{ flex: 1 }}
              >
                {t("reject")}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
          onPress={() => setPreviewUri(null)}
        >
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={{ width: "100%", height: "70%" }}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
