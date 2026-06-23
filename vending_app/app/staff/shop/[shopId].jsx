import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import MachineCard from "~/components/staff/MachineCard";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useUser } from "~/context/UserContext";
import { useManyReferences } from "~/hook/useManyReferences";

const Machines = () => {
    const { shopId } = useLocalSearchParams();
    const { user } = useUser();
    const { setInfo } = useMachine();
    const { t } = useTranslation();
    const { isPending, items, total } = useManyReferences("machines", [
        // Don't Change the order of this Array
        {
            target: "shopId",
            id: shopId,
        },
        {
            target: "vendorId",
            id: user._id,
        },
    ]);

    useEffect(() => {
        if (isPending) return;
        setInfo((prev) => ({ ...prev, machines: items }));
    }, [isPending, items]);

    return (
        <>
            <ScrollView className="px-6">
                {!isPending ? (
                    items.length ? (
                        <>
                            <Stack.Screen
                                options={{
                                    title: items[0].shop[0].name,
                                }}
                            />
                            <View className="my-3 flex gap-4">
                                {items
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((machine) => (
                                        <MachineCard key={machine._id} {...machine} />
                                    ))}
                            </View>
                        </>
                    ) : (
                        <Text className="m-12">{t("noMachines")}</Text>
                    )
                ) : (
                    <Text className="m-12">{t("loading")}</Text>
                )}
            </ScrollView>
        </>
    );
};

export default Machines;
