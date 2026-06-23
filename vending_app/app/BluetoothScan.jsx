// import { useRouter } from "expo-router";
// import React, { useEffect } from "react";
// import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
// import { Text } from "~/components/ui/text";
// import { useUser } from "~/context/UserContext";
// import useBLE from "~/hook/useBLE";

// const BluetoothScan = () => {
//   const {
//     allDevices,
//     connectedDevice,
//     connectToDevice,
//     lock,
//     setLock,
//     requestPermissions,
//     scanForPeripherals,
//     enableBluetooth,
//     openLock,
//   } = useBLE();

//   const router = useRouter();
//   const { user } = useUser();
//   useEffect(() => {
//     enableBluetooth();
//     setLock({ id: 123, status: "OFF" });
//   }, []);

//   const scanForDevices = async () => {
//     const isPermissionsEnabled = await requestPermissions();
//     if (isPermissionsEnabled) scanForPeripherals();
//   };

//   const openModal = async () => {
//     if (user) router.navigate("/DeviceConnection");
//     else router.navigate("/Signin");
//   };
//   return (
//     <ScrollView
//       contentContainerStyle={styles.scrollContainer}
//       className="my-6 px-6"
//     >
//       <View style={styles.heartRateTitleWrapper}>
//         {connectedDevice ? (
//           <>
//             <Text style={styles.heartRateTitleText}>Connected</Text>
//             <TouchableOpacity onPress={openLock} style={styles.ctaButton}>
//               <Text style={styles.ctaButtonText}>Open lock {lock.id}</Text>
//             </TouchableOpacity>
//           </>
//         ) : (
//           <Text style={styles.heartRateTitleText}>
//             Please connect the Machine
//           </Text>
//         )}
//       </View>
//       {!connectedDevice && (
//         <TouchableOpacity onPress={openModal} style={styles.ctaButton}>
//           <Text style={styles.ctaButtonText}>Connect</Text>
//         </TouchableOpacity>
//       )}
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   scrollContainer: {
//     alignItems: "center",
//   },
//   container: {
//     flex: 1,
//     backgroundColor: "#f2f2f2",
//   },
//   heartRateTitleWrapper: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   heartRateTitleText: {
//     fontSize: 25,
//     fontWeight: "bold",
//     textAlign: "center",
//     marginHorizontal: 20,
//     marginVertical: 20,
//     color: "black",
//   },
//   heartRateText: {
//     fontSize: 25,
//     marginTop: 15,
//   },
//   ctaButton: {
//     backgroundColor: "#FF6060",
//     justifyContent: "center",
//     alignItems: "center",
//     height: 50,
//     marginHorizontal: 20,
//     marginBottom: 5,
//     borderRadius: 8,
//   },
//   ctaButtonText: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "white",
//     padding: 12,
//   },
// });

// Temporary placeholder component to satisfy Expo Router
const BluetoothScan = () => {
  return null;
};

export default BluetoothScan;
