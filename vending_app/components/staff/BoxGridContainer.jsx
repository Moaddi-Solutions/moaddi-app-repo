import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { baseUrl } from "~/services/serverAddresses";

const BoxGridContainer = ({ boxProps, machine }) => {
  const { t } = useTranslation();
  const boxes = (machine?.boxes && Array.isArray(machine?.boxes))
    ? machine?.boxes :
    (machine?.products && Array.isArray(machine?.products)) ?
      machine?.products.flatMap((product) => product?.boxes) : [];
  console.log(boxes, 'boxes');
  console.log(machine, 'machine');

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      className="my-6 px-6"
    >
      <View>
        {boxes
          ?.sort((a, b) => a.boxNumber - b.boxNumber)
          .map((box) => {
            const product = machine.products.find(
              ({ _id }) => _id == box.productId,
            );
            return (
              <View key={box._id}>
                <Card className="flex items-center justify-center p-4 m-4">
                  <Text>
                    {[0, 1].includes(machine.type)
                      ? box.name.slice(1)
                      : box.name}
                  </Text>
                  {product && (
                    <>
                      <Image
                        width={80}
                        height={80}
                        resizeMode="contain"
                        source={{
                          uri: `${baseUrl}${product.image}`,
                        }}
                      />
                      <Text>
                        {`${product.productName ?? product.name} - ${product.campaignPrice?.toFixed(2) ?? product.salePrice?.toFixed(2)}
                          } ${t(product?.preferredCurrency )}`}
                      </Text>
                    </>
                  )}

                  <Button
                    className="mt-4"
                    disabled={box.boxStatus === undefined ? box.status : box.boxStatus}
                    variant="outline"
                    size="sm"
                    {...boxProps(box)}
                  >
                    <Text>{(box.boxStatus === undefined ? box.status : box.boxStatus) ? "Opened" : "Open"}</Text>
                  </Button>
                </Card>
              </View>
            );
          })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    alignItems: "center",
  },
});

export default BoxGridContainer;
