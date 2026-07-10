import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { getAllCountries } from "react-native-country-picker-modal";
import RNPhoneInput from "react-native-phone-number-input";
import { useColorScheme } from "~/lib/useColorScheme";

const PhoneInput = ({ formData, setFormData }) => {
  const [flag, setFlag] = useState(null);
  const [countryCode, setCountryCode] = useState("966");
  const { isDarkColorScheme } = useColorScheme();

  useEffect(() => {
    loadFlag({ cca2: "SA", callingCode: ["966"] });
  }, []);

  const loadFlag = (country) => {
    setCountryCode(country.callingCode[0]);
    getAllCountries("flat").then((countries) => {
      const selectedCountry = countries.find(
        ({ cca2 }) => cca2 === country.cca2
      );
      setFlag(selectedCountry?.flag);
    });
  };

  const handlePhoneChange = (text) => {
    const countryCodeWithPlus = `+${countryCode}`;
    if (text.startsWith(countryCodeWithPlus)) {
      const numberPart = text.slice(countryCodeWithPlus.length);
      setFormData((prev) => ({ ...prev, phone: countryCodeWithPlus + numberPart }));
    } else if (text.startsWith("+")) {
      const numberPart = text.slice(countryCodeWithPlus.length);
      setFormData((prev) => ({ ...prev, phone: countryCodeWithPlus + numberPart }));
    } else {
      setFormData((prev) => ({ ...prev, phone: countryCodeWithPlus + text }));
    }
  };

  const displayPhone = formData.phone ? formData.phone.replace(`+${countryCode}`, "") : "";

  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <RNPhoneInput
        countryPickerProps={{
          excludeCountries: ["CN", "HK", "MO", "TW"],
        }}
        defaultCode="SA"
        layout="first"
        renderDropdownImage={
          <View style={{ width: 24, height: 16, justifyContent: "center" }}>
            {flag ? (
              <Text style={{ fontSize: 20 }}>{flag}</Text>
            ) : (
              <Text style={{ fontSize: 16 }}>🌍</Text>
            )}
          </View>
        }
        onChangeCountry={loadFlag}
        containerStyle={styles.phone}
        flagButtonStyle={styles.flag}
        textContainerStyle={styles.height}
        codeTextStyle={styles.codeText}
        textInputStyle={styles.textInput}
        withDarkTheme={isDarkColorScheme}
      />
      <View style={[styles.input, { flexDirection: "row", alignItems: "center", paddingRight: 0 }]}>
        <Text style={[{ color: isDarkColorScheme ? "#fff" : "#000", fontSize: 14, fontWeight: "600" }]}>
          +{countryCode}
        </Text>
        <TextInput
          style={{
            flex: 1,
            marginLeft: 6,
            color: isDarkColorScheme ? "#fff" : "#000",
            fontSize: 14,
          }}
          placeholder="Phone number"
          placeholderTextColor={isDarkColorScheme ? "#999" : "#ccc"}
          value={displayPhone}
          onChangeText={handlePhoneChange}
          keyboardType="number-pad"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  phone: {
    backgroundColor: "transparent",
    width: "auto",
    borderWidth: 0,
  },
  flag: {
    backgroundColor: "transparent",
    paddingRight: 4,
  },
  height: {
    height: 0,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  codeText: {
    display: "none",
  },
  textInput: {
    display: "none",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
export default PhoneInput;
