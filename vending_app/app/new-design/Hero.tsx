import { LinearGradient } from "expo-linear-gradient";
import { Wifi } from "lucide-react-native";
import { Image, Text, View } from "react-native";
import { Line, Path, Rect, Svg } from "react-native-svg";
import GradientText from "~/components/GradientText";

const ConnectionLine = ({
  vertical,
  reverse,
  ...rest
}: {
  vertical?: boolean;
  reverse?: boolean;
}) => {
  return (
    <View
      className={`${vertical ? "mx-7 my-2 h-12 w-[2px]" : "h-[2px] flex-1 "}  animate-pulse`}
      {...rest}
    >
      <LinearGradient
        className="w-full h-full"
        colors={reverse ? ["#7287e2", "#2cb4cc"] : ["#2cb4cc", "#7287e2"]}
        start={{ x: 0, y: 0 }}
        end={vertical ? { x: 0, y: 1 } : { x: 1, y: 0 }}
      />
    </View>
  );
};
const Hero = () => {
  return (
    <View className="relative flex flex-col items-center justify-center px-6 pt-4 overflow-hidden">
      {/* Content */}
      <View className=" relative z-10 text-center">
        {/* Futuristic Tech Visual */}
        <View className="relative max-w-sm">
          <View className="flex flex-row items-center justify-center gap-4">
            {/* Bluetooth Icon */}
            <View className=" w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2cb4cc]/10 to-[#7287e2]/10 border border-[#2cb4cc]/20 flex items-center justify-center">
              <Svg
                width={32}
                height={32}
                className="w-8 h-8 text-[#2cb4cc]"
                viewBox="0 0 24 24"
              >
                <Path
                  fill="#2cb4cc"
                  d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"
                />
              </Svg>
            </View>
            {/* Connection Line */}
            <ConnectionLine />

            {/* Vending Machine Icon */}
            <View className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7287e2]/10 to-[#e0bd5f]/10 border border-[#7287e2]/20 flex items-center justify-center">
              <Svg
                width={32}
                height={32}
                className="w-8 h-8 text-[#7287e2]"
                fill="none"
                stroke="#7287e2"
                viewBox="0 0 24 24"
              >
                <Rect
                  x="6"
                  y="2"
                  width="12"
                  height="20"
                  rx="2"
                  strokeWidth="2"
                />
                <Rect
                  x="8"
                  y="5"
                  width="8"
                  height="6"
                  rx="1"
                  strokeWidth="1.5"
                />
                <Rect
                  x="8"
                  y="13"
                  width="3"
                  height="3"
                  rx="0.5"
                  strokeWidth="1.5"
                />
                <Rect
                  x="13"
                  y="13"
                  width="3"
                  height="3"
                  rx="0.5"
                  strokeWidth="1.5"
                />
                <Line x1="6" y1="18" x2="18" y2="18" strokeWidth="2" />
              </Svg>
            </View>
          </View>
          <View className="flex flex-row items-center justify-between gap-4">
            <ConnectionLine vertical />
            <Image
              className="mx-auto h-24 w-24 -my-7 "
              source={require("~/assets/images/icon-new.jpg")}
            />
            <ConnectionLine vertical reverse />

            {/* <LinearGradient
              className="mx-7 my-2 w-[2px] h-12 opacity-70"
              colors={["#7287e2", "#2cb4cc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            /> */}
          </View>

          <View className="flex flex-row items-center justify-center gap-4 ">
            <View className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2cb4cc]/10 to-[#7287e2]/10 border border-[#2cb4cc]/20 flex items-center justify-center">
              <Svg
                width={32}
                height={32}
                className="w-8 h-8"
                viewBox="0 0 16 16"
              >
                <Path
                  d="m 1.957031 2.023438 c -0.125 0.003906 -0.25 0.054687 -0.34375 0.152343 l -0.238281 0.25 c -0.933594 0.96875 -1.3984375 2.273438 -1.3984375 3.574219 s 0.4648435 2.605469 1.3984375 3.574219 l 0.238281 0.25 c 0.1875 0.199219 0.503907 0.203125 0.699219 0.015625 c 0.199219 -0.191406 0.207031 -0.503906 0.015625 -0.703125 l -0.234375 -0.25 c -1.46875 -1.53125 -1.46875 -4.238281 0 -5.773438 l 0.234375 -0.25 c 0.191406 -0.199219 0.183594 -0.511719 -0.015625 -0.703125 c -0.097656 -0.09375 -0.226562 -0.140625 -0.355469 -0.136718 z m 12.039063 0 c -0.128906 -0.003907 -0.257813 0.042968 -0.355469 0.136718 c -0.199219 0.191406 -0.203125 0.503906 -0.015625 0.703125 l 0.238281 0.25 c 1.46875 1.535157 1.46875 4.242188 0 5.773438 l -0.238281 0.25 c -0.1875 0.199219 -0.183594 0.511719 0.015625 0.703125 c 0.199219 0.1875 0.511719 0.183594 0.703125 -0.015625 l 0.238281 -0.246094 c 0.929688 -0.972656 1.394531 -2.277344 1.394531 -3.578125 s -0.464843 -2.601562 -1.394531 -3.574219 l -0.238281 -0.25 c -0.09375 -0.097656 -0.21875 -0.148437 -0.347656 -0.152343 z m -10.539063 1.492187 c -0.113281 0.007813 -0.222656 0.046875 -0.3125 0.128906 l -0.273437 0.25 c -0.613282 0.554688 -0.90625 1.34375 -0.902344 2.125 c 0.007812 0.777344 0.3125 1.550781 0.902344 2.085938 l 0.273437 0.25 c 0.203125 0.1875 0.519531 0.171875 0.703125 -0.03125 s 0.171875 -0.519531 -0.03125 -0.703125 l -0.273437 -0.246094 c -0.699219 -0.636719 -0.746094 -2.070312 0 -2.75 l 0.273437 -0.246094 c 0.203125 -0.183594 0.214844 -0.496094 0.03125 -0.703125 c -0.105468 -0.113281 -0.25 -0.167969 -0.390625 -0.160156 z m 8.992188 0 c -0.125 0.007813 -0.25 0.058594 -0.34375 0.160156 c -0.183594 0.207031 -0.167969 0.519531 0.035156 0.703125 l 0.273437 0.246094 c 0.742188 0.679688 0.695313 2.113281 0 2.75 l -0.273437 0.246094 c -0.203125 0.183594 -0.21875 0.5 -0.035156 0.703125 c 0.1875 0.203125 0.5 0.21875 0.707031 0.03125 l 0.269531 -0.25 c 0.589844 -0.535157 0.894531 -1.308594 0.902344 -2.085938 c 0.007813 -0.78125 -0.289063 -1.570312 -0.902344 -2.125 l -0.269531 -0.25 c -0.101562 -0.09375 -0.234375 -0.132812 -0.363281 -0.128906 z m -7.699219 1.484375 c -0.289062 0 -0.550781 0.164062 -0.675781 0.425781 c -0.125 0.257813 -0.089844 0.566407 0.089843 0.792969 l 2.835938 3.542969 v 6.238281 h 2 v -6.238281 l 2.835938 -3.542969 c 0.179687 -0.226562 0.214843 -0.535156 0.089843 -0.792969 c -0.125 -0.261719 -0.386719 -0.425781 -0.675781 -0.425781 z m 1.5625 1.5 h 3.375 l -1.6875 2.113281 z m 0 0"
                  fill="#7287e2"
                />
              </Svg>
            </View>
            {/* Connection Line */}
            <ConnectionLine reverse />

            <View className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2cb4cc]/10 to-[#7287e2]/10 border border-[#2cb4cc]/20 flex items-center justify-center">
              <Wifi color="#2cb4cc" strokeWidth={3} />
            </View>
          </View>
        </View>

        {/* Tech Stats */}
        <View className="flex flex-row justify-between max-w-sm mt-4">
          <View className="text-center">
            <GradientText
              colors={["#2cb4cc", "#7287e2"]}
              className="text-2xl font-bold"
            >
              100+
            </GradientText>
            {/* <LinearGradient
              colors={["#2cb4cc", "#7287e2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }} 
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text className="text-2xl font-bold ">100+</Text>
            </LinearGradient>
            <Text className="text-2xl font-bold bg-gradient-to-r from-[#2cb4cc] to-[#7287e2] bg-clip-text text-transparent">
              100+
            </Text> */}
            <Text className="text-xs text-gray-500 mt-1 text-center">
              Devices
            </Text>
          </View>
          <View className="text-center">
            {/* <Text className="text-2xl font-bold bg-gradient-to-r from-[#7287e2] to-[#2cb4cc] bg-clip-text text-transparent">
              50+
            </Text> */}
            <GradientText
              className="text-2xl font-bold"
              colors={["#7287e2", "#2cb4cc"]}
            >
              50+
            </GradientText>
            <Text className="text-xs text-gray-500 mt-1 text-center">
              Shops
            </Text>
          </View>
          <View className="text-center">
            {/* <Text className="text-2xl font-bold bg-gradient-to-r from-[#2cb4cc] to-[#7287e2] bg-clip-text text-transparent">
              24/7
            </Text> */}
            <GradientText
              colors={["#2cb4cc", "#7287e2"]}
              className="text-2xl font-bold"
            >
              24/7
            </GradientText>
            <Text className="text-xs text-gray-500 mt-1 text-center">
              Access
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Hero;
