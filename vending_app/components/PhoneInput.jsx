import React, { useEffect, useState } from "react";
import { Image, StyleSheet, TextInput, View } from "react-native";
import { getAllCountries } from "react-native-country-picker-modal";
import RNPhoneInput from "react-native-phone-number-input";
import { useColorScheme } from "~/lib/useColorScheme";

const PhoneInput = ({ formData, setFormData }) => {
  const [flag, setFlag] = useState(null);
  const { isDarkColorScheme } = useColorScheme();
  useEffect(() => {
    loadFlag({ cca2: "SA", callingCode: ["966"] });
  }, []);
  const loadFlag = (country) => {
    setFormData((prev) => ({ ...prev, phone: `+${country.callingCode[0]}` }));
    // setPhone(`${country.callingCode[0]}`);
    getAllCountries("flat").then((countries) => {
      const selectedCountry = countries.find(
        ({ cca2 }) => cca2 === country.cca2
      );
      setFlag(selectedCountry?.flag);
    });
  };

  return (
    <View className="flex flex-row gap-4 justify-between items-start">
      <RNPhoneInput
        countryPickerProps={{
          // ["AF", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU", "AT", "AZ", "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BA", "BW", "BV", "BR", "IO", "VG", "BN", "BG", "BF", "BI", "KH", "CM", "CA", "CV", "BQ", "KY", "CF", "TD", "CL", "CN", "CX", "CC", "CO", "KM", "CK", "CR", "HR", "CU", "CW", "CY", "CZ", "CD", "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF", "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY", "HT", "HM", "HN", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "CI", "JM", "JP", "JE", "JO", "KZ", "KE", "XK", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MO", "MK", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX", "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NC", "NZ", "NI", "NE", "NG", "NU", "NF", "KP", "MP", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PN", "PL", "PT", "PR", "QA", "CG", "RO", "RU", "RW", "RE", "BL", "SH", "KN", "LC", "MF", "PM", "VC", "WS", "SM", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS", "KR", "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH", "SY", "ST", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK", "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "VI", "UY", "UZ", "VU", "VA", "VE", "VN", "WF", "EH", "YE", "ZM", "ZW", "KI", "HK", "AX"]
          excludeCountries: ["CN", "HK", "MO", "TW"], // The correct prop name and placement
        }}
        defaultCode="SA"
        layout="first"
        renderDropdownImage={
          <Image
            className="bg-background w-8 h-12"
            source={{
              uri: flag
                ? flag
                : isDarkColorScheme
                ? require("~/assets/images/globe-white.png").uri
                : require("~/assets/images/globe-black.png").uri,
            }}
            resizeMode="contain"
          />
        }
        onChangeCountry={loadFlag}
        // codeTextStyle={styles.none}
        // textInputStyle={styles.none}
        containerStyle={styles.phone}
        flagButtonStyle={styles.flag}
        textContainerStyle={styles.height}
        withDarkTheme={isDarkColorScheme}
      />
      <TextInput
        className="flex-1 ms-4 rounded-lg bg-muted text-foreground px-4 py-3 text-sm"
        value={formData.phone}
        // value={phone}
        onChangeText={(text) => {
          setFormData((prev) => ({ ...prev, phone: text }));
          //   setPhone(text);
        }}
        keyboardType="number-pad"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  none: {
    display: "none",
  },
  height: {
    height: "1%",
    backgroundColor: "transparent",
  },
  phone: {
    backgroundColor: "transparent",
    width: "5%",
  },
  flag: {
    width: "2%",

    backgroundColor: "transparent",
  },
});
export default PhoneInput;
