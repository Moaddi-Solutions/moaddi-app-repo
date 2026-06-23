// import { Link, useRouter } from "expo-router";
// import React, { useEffect, useRef, useState } from "react";
// import { useTranslation } from "react-i18next";
// import { Image, ScrollView, StyleSheet, View } from "react-native";
// import { routes } from "~/app/CheckoutStripe";
// import { Button } from "~/components/ui/button";
// import { Card } from "~/components/ui/card";
// import { Text } from "~/components/ui/text";
// import { useMachine } from "~/context/MachineContext";
// import { useUser } from "~/context/UserContext";
// import { baseUrl } from "~/services/serverAddresses";

// const BoxGridContainer = ({ boxProps, items, doneCallback }) => {
//   const [done, setDone] = useState(false);
//   const { info, machines, setMachines, setMachine, clearAll } = useMachine();
//   const router = useRouter();
//   const { user, setUser } = useUser();
//   const finalEffect = useRef(false);
//   const { t } = useTranslation();
//   const opened = items.filter(({ boxStatus }) => boxStatus).length;
//   const sortedItems = items?.sort((a, b) => a.boxNumber - b.boxNumber);

//   useEffect(() => {
//     if (finalEffect.current) return;
//     if (!items) return;
//     if (!items.find(({ boxStatus }) => !boxStatus)) {
//       finalEffect.current = true;
//       const nextMachine = machines.at(0);
//       if (nextMachine) {
//         setMachines((prev) => [...prev.slice(1)]);
//         setMachine(nextMachine);
//         setUser(({ purchase, ...rest }) => ({
//           ...rest,
//           purchase: {
//             ...purchase,
//             machine: nextMachine,
//             controlRoute: routes[nextMachine.type],
//           },
//         }));
//         router.replace(routes[nextMachine.type]);
//       } else {
//         doneCallback?.();
//         setDone(true);
//         clearAll();
//       }
//     }
//   }, [user]);
//   return done ? (
//     <View className="px-6 my-40 flex-col items-center justify-center">
//       <View className="flex flex-col space-y-2 text-center">
//         <Text className="text-2xl font-semibold my-4">
//           {t("allBoxesAreOpened")}
//         </Text>
//       </View>
//       <Link asChild href="/PurchaseHistory">
//         <Button color="secondary" className="w-full" variant="default">
//           <Text>{t("showInvoiceHistory")}</Text>
//         </Button>
//       </Link>
//     </View>
//   ) : (
//     <ScrollView
//       contentContainerStyle={styles.scrollContainer}
//       className="my-6 px-6"
//     >
//       <Text className="mb-8 text-xl">{user?.purchase?.machine.name}</Text>
//       <Text className="mb-8 text-xl">{info.shopName}</Text>
//       <View>
//         {sortedItems.map((box) => (
//           <View key={box._id}>
//             <Card className="flex items-center justify-center p-4 m-4">
//               <Text>
//                 {[0, 1].includes(user?.purchase?.machine.type)
//                   ? box.name.slice(1)
//                   : box.name}
//               </Text>
//               {box.product && (
//                 <>
//                   <Image
//                     width={80}
//                     height={80}
//                     resizeMode="contain"
//                     source={{ uri: `${baseUrl}${box.product.image}` }}
//                   />
//                   <Text>
//                     {`${box.product.name} - ${
//                       box.product.campaignPrice ?? box.product.salePrice
//                     } ${t("sar")}`}
//                   </Text>
//                 </>
//               )}

//               <Button
//                 className="mt-4"
//                 disabled={box.boxStatus}
//                 variant="outline"
//                 size="sm"
//                 {...boxProps(box)}
//               >
//                 <Text>{box.boxStatus ? "Opened" : "Open"}</Text>
//               </Button>
//             </Card>
//           </View>
//         ))}
//       </View>
//       <View className="mb-6 flex flex-wrap justify-between gap-4">
//         <Card className="rounded p-3 !text-green-800">
//           <Text>
//             {t("readyToOpen")}: <Text>{items.length - opened || ""}</Text>
//           </Text>
//         </Card>
//         <Card className="rounded p-3 !text-green-800">
//           <Text>
//             {t("opened")}: <Text>{opened ?? "0"}</Text>
//           </Text>
//         </Card>
//         <Card className="rounded p-3 !text-red-800">
//           <Text>
//             {t("remaining")}: <Text>{items.length - opened || ""}</Text>
//           </Text>
//         </Card>
//       </View>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   scrollContainer: {
//     alignItems: "center",
//   },
// });

// export default BoxGridContainer;
