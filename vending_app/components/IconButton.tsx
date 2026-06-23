import { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

export function IconButton({
  icon: Component,
  ...props
}: {
  icon: LucideIcon;
}) {
  return (
    <View
      className="flex-1 aspect-square pt-0.5 justify-center items-start web:px-5"
      {...props}
    >
      <Component className="text-foreground" size={23} strokeWidth={1.25} />
    </View>
  );
}