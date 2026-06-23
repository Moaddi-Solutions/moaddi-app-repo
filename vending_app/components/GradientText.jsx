import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text } from "react-native";
const GradientText = (props) => {
  return (
    <MaskedView
      maskElement={
        <Text
          {...props}
          style={[props.style, { backgroundColor: "transparent" }]}
        />
      }
    >
      <LinearGradient
        colors={props.colors} // e.g., ['red', 'blue']
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Render a transparent version of the Text component to ensure the gradient container has the correct size */}
        <Text {...props} style={[props.style, { opacity: 0 }]} />
      </LinearGradient>
    </MaskedView>
  );
};

export default GradientText;
