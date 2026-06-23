import { Link } from "expo-router";
import { Eye } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Text } from "~/components/ui/text";
import { useUser } from "~/context/UserContext";
import { useManyReference } from "~/hook/useManyReference";

const GetStatusBadge = ({ status }) => {
  const { t } = useTranslation();

  switch (status) {
    case "Completed":
      return (
        <Badge variant="default" className="bg-green-100  hover:bg-green-100">
          <Text className="text-green-800">{t("completed")}</Text>
        </Badge>
      );
    case "PaymentDoneRequest":
      return (
        <Badge variant="default" className="bg-yellow-100  hover:bg-yellow-100">
          <Text className="text-yellow-800">{t("initiate")}</Text>
        </Badge>
      );
    case "PaymentDone":
      return (
        <Badge variant="default" className="bg-blue-100  hover:bg-blue-100">
          <Text className="text-blue-800">{t("paymentDone")}</Text>
        </Badge>
      );
    // case "Cancelled":
    //   return <Badge variant="destructive">{ t('cancelled') }</Badge>;
    default:
      return (
        <Badge variant="secondary">
          <Text>{status}</Text>
        </Badge>
      );
  }
};

const PurchaseHistoryData = () => {
  const { user } = useUser();
  const { t } = useTranslation();

  const { isPending, items } = useManyReference("purchases", {
    target: "customerId",
    id: user._id,
  });


  return (
    !isPending && (
      <ScrollView
        className="rounded-md border border-border"
        showsHorizontalScrollIndicator={false}
      >
        <Table>
          <TableHeader>
            <TableRow className="justify-around">
              <TableHead>
                <Text>{t("date")}</Text>
              </TableHead>
              {/* <TableHead className="hidden md:table-cell">Items</TableHead> */}
              {/* <TableHead className="hidden sm:table-cell">Qty</TableHead> */}
              <TableHead className="w-24">
                <Text>{t("total")}</Text>
              </TableHead>
              <TableHead>
                <Text>{t("status")}</Text>
              </TableHead>
              <TableHead className="px-8 text-end">
                <Text>{t("view")}</Text>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map(
              ({ _id, products, items, created, price, status, invoiceId }) => {
                const productsString = products
                  .map(({ name }) => name)
                  .join(", ");
                return (
                  <TableRow className="justify-around items-center" key={_id}>
                    <TableCell>
                      <Text>
                        {new Date(created).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          //   year: "numeric",
                        })}
                      </Text>
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] md:table-cell">
                      <View className="truncate">
                        <Text>{productsString}</Text>
                      </View>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Text>{items.length}</Text>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Text>
                        {price.toFixed(2)} {t(products[0]?.preferredCurrency )}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <GetStatusBadge status={status} />
                    </TableCell>
                    {/* <TableCell className="text-muted-foreground hidden lg:table-cell">
                        {purchase.paymentMethod}
                      </TableCell> */}
                    <Link
                      asChild
                      href={{
                        pathname: `/Invoice/${invoiceId}`,
                        params: {
                          purchaseData: JSON.stringify({
                            _id,
                            products,
                            items,
                            created,
                            price,
                            status,
                            invoiceId
                          }),
                        },
                      }}
                    >
                      <Button variant="ghost" size="icon">
                        <Eye color="#4d4d4d" strokeWidth={1.25} />
                      </Button>
                    </Link>
                  </TableRow>
                );
              }
            )}
          </TableBody>
        </Table>
      </ScrollView>
    )
  );
};
export default function PurchaseHistory() {
  const { user } = useUser();
  return user && <PurchaseHistoryData />;
}
