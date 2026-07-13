import { ChevronDown, Search, X } from "lucide-react-native";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Image,
  KeyboardTypeOptions,
  Modal,
  Pressable,
  StyleProp,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { getAllCountries } from "react-native-country-picker-modal";
import { colors, palette, radius, sizes, type } from "~/theme/moaddi";

interface InputProps {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  prefix?: ReactNode;
  suffix?: ReactNode;
  error?: string;
  editable?: boolean;
  /** ltr for numeric/latin fields (phone, card, IBAN). */
  textAlign?: "left" | "right";
  style?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  prefix,
  suffix,
  error,
  editable = true,
  textAlign = "left",
  style,
}: InputProps) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text style={{ ...type.bodyStrong, fontSize: 13, color: colors.textHeading }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          height: sizes.controlH,
          paddingHorizontal: 16,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceCard,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.borderDefault,
        }}
      >
        {prefix}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.ink[400]}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          textAlign={textAlign}
          style={{
            flex: 1,
            minWidth: 0,
            padding: 0,
            ...type.body,
            color: colors.textHeading,
          }}
        />
        {suffix}
      </View>
      {error ? (
        <Text style={{ ...type.caption, color: colors.danger }}>{error}</Text>
      ) : null}
    </View>
  );
}

interface PhoneInputProps {
  label?: string;
  /** Full E.164 number, e.g. "+96650XXXXXXX". */
  value?: string;
  /** Emits the full E.164 number ("" when the field is empty). */
  onChangeText?: (fullNumber: string) => void;
  /** Alpha-2 country to start on. */
  defaultCca2?: string;
  /** Calling code (digits only) matching `defaultCca2`. */
  defaultCallingCode?: string;
  placeholder?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
}

type CountryRow = { cca2: string; callingCode: string[]; name?: unknown };

/** Reliable cross-platform flag image (emoji flags don't render on Android). */
const flagUri = (cca2: string) =>
  `https://flagcdn.com/w40/${String(cca2).toLowerCase()}.png`;

const countryName = (c: CountryRow): string =>
  typeof c?.name === "string"
    ? c.name
    : ((c?.name as { common?: string })?.common ?? c?.cca2 ?? "");

/**
 * Phone field with a tappable flag + calling-code country picker (flag images
 * from a CDN, searchable list). Self-contained (uses only the country dataset
 * from react-native-country-picker-modal). Emits the full E.164 number.
 */
export function PhoneInput({
  label,
  value,
  onChangeText,
  defaultCca2 = "SA",
  defaultCallingCode = "966",
  placeholder,
  error,
  style,
}: PhoneInputProps) {
  const { t } = useTranslation();
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [cca2, setCca2] = useState(defaultCca2);
  const [callingCode, setCallingCode] = useState(defaultCallingCode);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (getAllCountries as unknown as (t: string) => Promise<CountryRow[]>)("flat")
      .then((list) => {
        if (mounted) setCountries(list.filter((c) => c.callingCode?.length));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // National part for the text field (strip the current calling code from E.164).
  const national =
    value && value.startsWith("+" + callingCode)
      ? value.slice(callingCode.length + 1)
      : value?.startsWith("+")
        ? ""
        : (value ?? "");

  const emit = (digits: string, code = callingCode) =>
    onChangeText?.(digits ? `+${code}${digits}` : "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        countryName(c).toLowerCase().includes(q) ||
        (c.callingCode?.[0] ?? "").includes(q) ||
        String(c.cca2).toLowerCase().includes(q),
    );
  }, [countries, query]);

  const selectCountry = (c: CountryRow) => {
    const code = c.callingCode?.[0] ?? callingCode;
    setCca2(c.cca2);
    setCallingCode(code);
    setPickerOpen(false);
    setQuery("");
    emit(national, code);
  };

  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text style={{ ...type.bodyStrong, fontSize: 13, color: colors.textHeading }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: sizes.controlH,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceCard,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.borderDefault,
        }}
      >
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            height: "100%",
            paddingHorizontal: 12,
            borderRightWidth: 1,
            borderRightColor: colors.borderDefault,
          }}
        >
          <Image
            source={{ uri: flagUri(cca2) }}
            style={{
              width: 24,
              height: 16,
              borderRadius: 2,
              backgroundColor: colors.surfaceSunken,
            }}
          />
          <Text style={{ ...type.bodyStrong, color: colors.textMuted }}>
            +{callingCode}
          </Text>
          <ChevronDown size={14} color={colors.textMuted} />
        </Pressable>
        <TextInput
          value={national}
          onChangeText={(text) => emit(text.replace(/\D/g, ""))}
          placeholder={placeholder ?? t("phoneNumber")}
          placeholderTextColor={palette.ink[400]}
          keyboardType="phone-pad"
          textAlign="left"
          style={{
            flex: 1,
            minWidth: 0,
            paddingHorizontal: 12,
            ...type.body,
            color: colors.textHeading,
          }}
        />
      </View>
      {error ? (
        <Text style={{ ...type.caption, color: colors.danger }}>{error}</Text>
      ) : null}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surfaceCard,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              maxHeight: "80%",
              paddingTop: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingBottom: 8,
              }}
            >
              <Text style={{ ...type.title3, color: colors.textHeading }}>
                {t("selectCountry")}
              </Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={12}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                height: sizes.controlH,
                paddingHorizontal: 12,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceSunken,
              }}
            >
              <Search size={16} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("search")}
                placeholderTextColor={palette.ink[400]}
                autoCapitalize="none"
                style={{ flex: 1, ...type.body, color: colors.textHeading }}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.cca2}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectCountry(item)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Image
                    source={{ uri: flagUri(item.cca2) }}
                    style={{
                      width: 28,
                      height: 20,
                      borderRadius: 3,
                      backgroundColor: colors.surfaceSunken,
                    }}
                  />
                  <Text
                    style={{ flex: 1, ...type.body, color: colors.textHeading }}
                    numberOfLines={1}
                  >
                    {countryName(item)}
                  </Text>
                  <Text style={{ ...type.bodyStrong, color: colors.textMuted }}>
                    +{item.callingCode?.[0]}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default Input;
