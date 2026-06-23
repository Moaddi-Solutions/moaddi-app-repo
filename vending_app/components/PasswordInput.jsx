import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { Button } from "~/components/ui/button";

const PasswordInput = ({ formData, setFormData, propName = "password" }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(true);
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };
  const handleChange = (text) =>
    setFormData((prev) => ({ ...prev, [propName]: text }));
  return (
    <View className="flex items-center flex-row">
      <TextInput
        className="flex-1 rounded-lg bg-muted text-foreground px-4 py-3 text-sm"
        value={formData[propName]}
        secureTextEntry={isPasswordVisible}
        onChangeText={handleChange}
      />
      <Button
        className="bg-muted -ms-1 py-[20px] rounded-lg rounded-ss-none rounded-se-none  "
        size="icon"
        variant="ghost"
        onPress={togglePasswordVisibility}
      >
        {isPasswordVisible ? <EyeOff /> : <Eye />}
      </Button>
    </View>
  );
};
export default PasswordInput;
