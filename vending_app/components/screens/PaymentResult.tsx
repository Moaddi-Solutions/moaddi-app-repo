import { Check, X } from "lucide-react-native";
import { ReactNode } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ButtonVariant } from "~/components/moaddi";
import { colors, space, type } from "~/theme/moaddi";

export interface ResultAction {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
}

interface PaymentResultProps {
  tone: "success" | "failure";
  title: string;
  body?: string;
  /** Optional detail card (e.g. amount / order rows). */
  children?: ReactNode;
  actions: ResultAction[];
}

/** Design "ResultShell": centered status icon, title, body, detail card, actions. */
export function PaymentResult({ tone, title, body, children, actions }: PaymentResultProps) {
  const solid = tone === "success" ? colors.success : colors.danger;
  const soft = tone === "success" ? colors.successBg : colors.dangerBg;
  const Icon = tone === "success" ? Check : X;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: space.gutter,
          gap: 20,
        }}
      >
        <View style={{ alignItems: "center", gap: 14 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: solid,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={30} color="#fff" strokeWidth={3} />
            </View>
          </View>
          <Text style={{ ...type.title1, color: colors.textHeading, textAlign: "center" }}>
            {title}
          </Text>
          {body ? (
            <Text
              style={{
                ...type.body,
                color: colors.textMuted,
                textAlign: "center",
                maxWidth: 300,
              }}
            >
              {body}
            </Text>
          ) : null}
        </View>

        {children}

        <View style={{ gap: 10 }}>
          {actions.map((a, i) => (
            <Button
              key={i}
              fullWidth
              variant={a.variant ?? (i === 0 ? "primary" : "ghost")}
              onPress={a.onPress}
            >
              {a.label}
            </Button>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default PaymentResult;
