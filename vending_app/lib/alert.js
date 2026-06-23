import Toast from "expo-react-native-toastify";
import { Platform } from "react-native";

const web = (title, description = "") =>
  window.alert(`${title}: ${description}`);
const phone = (title, description) => {
  ["info", "success", "warn", "error", "custom"].includes(title)
    ? Toast[title](description)
    : Toast.info(title);
};
const alert = Platform.OS === "web" ? web : phone;

export default alert;
