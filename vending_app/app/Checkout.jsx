import { useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import {
  MFBoxShadow,
  MFCardPaymentView,
  MFCardViewError,
  MFCardViewInput,
  MFCardViewLabel,
  MFCardViewPlaceHolder,
  MFCardViewStyle,
  MFCardViewText,
  MFCountry,
  MFCurrencyISO,
  MFEnvironment,
  MFExecutePaymentRequest,
  MFFontFamily,
  MFFontWeight,
  MFInitiatePaymentRequest,
  MFInitiateSessionRequest,
  MFInitiateSessionResponse,
  MFLanguage,
  MFSDK,
} from "myfatoorah-reactnative";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  processColor,
  Alert,
} from "react-native";

const myFatoorahNativeReady = !!NativeModules.MFModule;
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useMachine } from "~/context/MachineContext";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { Fit } from "~/services/dataProvider";
import { productImageUrl } from "~/services/serverAddresses";
import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "~/services/httpClient";
import {
  machineQRScan,
  purchaseAPI,
  purchasesAPI,
  userAPI,
} from "~/services/serverAddresses";

const onError = (mfError) => {
  const message =
    mfError?.message || mfError?.statusText || String(mfError ?? "Error");
  alert("error", message);
};

function button(title, onPress, style) {
  return (
    <TouchableOpacity
      style={style ? style : styles.buttonStyle}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

// purchase.fromGroupOfMachines: bool
const CheckoutItems = ({ totalPrice, setTotalPrice }) => {
  const { user, setUser } = useUser();
  const { machine, setMachine } = useMachine();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState({});
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    setTotalPrice(
      Object.entries(total).reduce((prev, [id, number]) => {
        if (!machine?.products) return prev;
        const product = machine.products.find(({ _id }) => _id == id);
        if (!product) return prev;
        const price = (product.campaignPrice ?? product.salePrice) * number;
        return prev + price;
      }, 0)
    );
  }, [total]);
  useEffect(() => {
    const items = [];
    Object.entries(total).forEach(([id, number]) => {
      const product = machine?.products?.find(({ _id }) => _id == id);
      if (!product?.boxes) return;
      for (let i = 0; i < number && i < product.boxes.length; i++)
        items.push({
          productId: id,
          boxId: product.boxes[i]._id,
          boxStatus: false,
        });
    });
    if (!items.length) return;
    putRequest(purchaseAPI(user.purchase._id), {
      items,
    }).then((response) => {
      getRequest(userAPI(user._id)).then((response) => setUser(response));
      getRequest(machineQRScan(machine.name)).then((response) =>
        setMachine(response)
      );
    });
  }, [total]);

  useEffect(() => {
    if (!user) return;
    if (!user?.purchase) return router.dismissAll();
    // console.log(user);

    const products = Object.values(
      (user.purchase.boxes ?? [])
        .map((box) => box.product)
        .map(Fit.image)
        .reduce((prev, curr) => {
          prev[curr._id] = prev[curr._id]
            ? { ...prev[curr._id], amount: prev[curr._id].amount + 1 }
            : { ...curr, amount: 1 };
          return prev;
        }, {})
    );
    if (!products.length)
      remove(user.purchase._id).then((response) =>
        setUser(({ purchase, ...rest }) => rest)
      );
    setProducts(products);
  }, [user]);

  useEffect(() => {
    setTotalPrice(
      products.reduce(
        (prev, { salePrice, campaignPrice, amount }) =>
          prev + (campaignPrice ?? salePrice) * amount,
        0
      )
    );
  }, [products]);

  const cancel = (id) =>
    putRequest(purchaseAPI(user.purchase._id), {
      items: user.purchase.boxes
        .filter(({ productId }) => productId != id)
        .map(({ _id, productId, boxStatus }) => ({
          boxId: _id,
          productId,
          boxStatus,
        })),
    }).then((response) => {
      setProducts((prev) => prev.filter(({ _id }) => _id != id));
      getRequest(userAPI(user._id)).then((response) =>
        setUser((prev) => ({ ...prev, ...response }))
      );
    });

  const remove = (id) => deleteRequest(purchaseAPI(id));

  const lastRow = (
    <TableRow>
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell className="h-12 flex items-center justify-center">
        <Text className="absolute">
          {t("totalPrice")} {totalPrice.toFixed(2)} {t(products[0]?.preferredCurrency )}
        </Text>
      </TableCell>
      <TableCell />
    </TableRow>
  );
  return (
    machine && (
      <ScrollView
        horizontal
        // bounces={false}
        showsHorizontalScrollIndicator={false}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Text> {t("image")}</Text>
              </TableHead>
              <TableHead>
                <Text> {t("name")}</Text>
              </TableHead>
              <TableHead>
                <Text> {t("price")}</Text>
              </TableHead>
              <TableHead>
                <Text> {t("amount")}</Text>
              </TableHead>
              <TableHead>
                <Text> {t("total")}</Text>
              </TableHead>
              <TableHead>
                <Text> {t("cancel")}</Text>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(
              ({ _id, name, image, salePrice, campaignPrice, amount, preferredCurrency }) => {
                // const checkoutButtonGroup = {
                //   ...machine.products.find(({ _id: id }) => id == _id),
                //   amount,
                //   setTotal,
                //   setProducts,
                // };
                return (
                  <TableRow key={_id}>
                    <TableCell>
                      <Image
                        source={{ uri: productImageUrl(image) }}
                        alt={name}
                        style={{ width: 70, height: 60 }}
                        resizeMode="contain"
                        className="rounded-xl border-foreground"
                      />
                    </TableCell>
                    <TableCell className="flex items-center justify-center">
                      <Text> {name}</Text>
                    </TableCell>
                    <TableCell className="flex items-center justify-center">
                      <Text>
                        {" "}
                        {campaignPrice?.toFixed(2) ?? salePrice?.toFixed(2)} {t(preferredCurrency)}
                      </Text>
                    </TableCell>
                    <TableCell className="flex items-center justify-center">
                      <Text>{amount}</Text>
                      {/* <CheckoutButtonGroup {...checkoutButtonGroup} /> */}
                    </TableCell>
                    <TableCell className="flex items-center justify-center">
                      <Text>
                        {((campaignPrice ?? salePrice) * (total[_id] ?? amount)).toFixed(2)}
                        {` ${t(preferredCurrency)}`}
                      </Text>
                    </TableCell>
                    <TableCell className="flex items-center justify-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onPress={(e) => cancel(_id)}
                      >
                        <Trash2 color="red" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }
            )}
            {lastRow}
          </TableBody>
        </Table>
      </ScrollView>
    )
  );
};

const Checkout = () => {
  const [totalPrice, setTotalPrice] = useState(0);
  const [isConfigure, setIsConfigure] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [isPayBtnVisible, setIsPayBtnVisible] = useState(false);
  const [initiateSessionResponse, setInitiateSessionResponse] = useState(
    new MFInitiateSessionResponse()
  );
  const { user, setUser } = useUser();
  const router = useRouter();
  const cardPaymentView = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!myFatoorahNativeReady) {
      Alert.alert(
        "Payments unavailable",
        "MyFatoorah needs native code. Rebuild and install the app with npx expo run:android — Expo Go cannot load this SDK."
      );
      return;
    }
    (async () => {
      // console.log("+init");
      await configure();
      // console.log("+configure");
      await setUpActionBar();
      // console.log("+setUpActionBar");
      await initiatePayment();
      // console.log("+initiatePayment");
    })();
    setTimeout(async () => {
      await initiateSessionForCardView();
      // console.log("+initiateSessionForCardView");
    }, 1000);
  }, []);

  useEffect(() => {
    if (!myFatoorahNativeReady) return;
    if (sessionId == "") return;
    // console.log("+loadCardView from useEffect");
    loadCardView();
  }, [sessionId]);

  const configure = async () => {
    setIsConfigure(true);
    return await MFSDK.init(
      process.env.EXPO_PUBLIC_MYFATORA_API_TOKEN,
      MFCountry.SAUDIARABIA,
      MFEnvironment.TEST
    );
  };

  const setUpActionBar = async () => {
    return await MFSDK.setUpActionBar(
      "Company Payment",
      processColor("#ffffff"),
      processColor("#4dc4f7"),
      true
    );
  };

  const showLoading = () => {
    setLoading(true);
  };

  const hideLoading = () => {
    setLoading(false);
  };

  const initiatePayment = async () => {
    var initiatePaymentRequest = new MFInitiatePaymentRequest(
      10,
      MFCurrencyISO.SAUDIARABIA_SAR
    );
    showLoading();
    return await MFSDK.initiatePayment(
      initiatePaymentRequest,
      MFLanguage.ARABIC
    )
      .then((success) => {
        setPaymentMethods(success.PaymentMethods);
      })
      .catch((error) => onError(error))
      .finally(() => hideLoading());
  };

  const paymentCardStyle = () => {
    var cardViewInput = new MFCardViewInput(
      processColor("black"),
      13,
      MFFontFamily.SansSerif,
      30,
      10,
      processColor("#c7c7c7"),
      1,
      1,
      new MFBoxShadow(0, 0, 0, 0, processColor("#c7c700")),
      new MFCardViewPlaceHolder("Name On Card", "Number", "MM / YY", "CVV")
    );
    var cardViewLabel = new MFCardViewLabel(
      false,
      processColor("black"),
      12,
      MFFontFamily.Tahoma,
      MFFontWeight.Normal,
      new MFCardViewText(
        "Card Holder Name",
        "Card Number",
        "Expiry Date",
        "Security Code"
      )
    );
    var cardViewError = new MFCardViewError(
      processColor("red"),
      8,
      new MFBoxShadow(10, 10, 10, 10, processColor("#c7c700"))
    );
    var cardViewStyle = new MFCardViewStyle(
      false,
      "ltr",
      300,
      cardViewInput,
      cardViewLabel,
      cardViewError
    );

    return cardViewStyle;
  };

  const pay = async () => {
    var executePaymentRequest = new MFExecutePaymentRequest(
      Number.parseFloat(user.purchase.price)
    );
    executePaymentRequest.SessionId = sessionId ?? "";
    executePaymentRequest.DisplayCurrencyIso = MFCurrencyISO.SAUDIARABIA_SAR;
    executePaymentRequest.Language = MFLanguage.ARABIC;
    await cardPaymentView.current
      ?.pay(executePaymentRequest, MFLanguage.ARABIC, (invoiceId) => {
        // console.log("invoiceId for pay btn: " + invoiceId);
      })
      .then(async (success) => {
        if (
          user.purchase.status == "PaymentDoneRequest" &&
          success.InvoiceStatus == "Paid"
        ) {
          // Make it PaymentDone
          const isComplete = await postRequest(`${purchasesAPI}/complete`, {
            _id: user.purchase._id,
            invoiceId: success.InvoiceId,
          });
          // console.log("isComplete", isComplete);
          if (isComplete?.error || isComplete?.statusCode >= 400 || (isComplete?.message && !isComplete?._id && !isComplete?.status)) {
            return onError(isComplete);
          }
          // pass
          const { status, boxes, machine } = isComplete;
          // console.log("isComplete", isComplete);
          const routes = {
            // direct
            0: "/BoxGrid",
            // MQTT (moaddi-najaf)
            1: "/BoxGrid",
            // Bluetooth(1) (zbmpos - Wifi 4g)
            2: "/BoxGrid",
            // Bluetooth(2) kaisijin - Bluetooth 12
            3: "/Bluetooth2Control",
            // Bluetooth(4) Yunxian Bluetooth
            4: "/Bluetooth4Control",
            // Bluetooth(3) kaisijin - Bluetooth 24
            5: "/Bluetooth3Control",
            // Bluetooth(5) genai
            6: "/Bluetooth5Control",
          };
          setUser(({ purchase, ...rest }) => ({
            ...rest,
            purchase: {
              ...purchase,
              status,
              boxes,
              machine,
              controlRoute: routes[machine.type],
            },
          }));
          router.dismissAll();
          router.push(routes[machine.type]);
        }
        // onSuccess(success);
      })
      .catch((error) => onError(error));

    // ({
    //   IsSuccess: true,
    //   Message: "Invoice Created Successfully!",
    //   ValidationErrors: null,
    //   Data: {
    //     InvoiceId: 5885478,
    //     IsDirectPayment: false,
    //     PaymentURL:
    //       "https://demo.MyFatoorah.com/En/KWT/PayInvoice/MpgsAuthentication?paymentId=07075885478281975275&sessionId=SESSION0002451781279E4166615E76",
    //     CustomerReference: null,
    //     UserDefinedField: null,
    //     RecurringId: "",
    //   },
    // });
  };

  const initiateSessionForCardView = async () => {
    var initiateSessionRequest = new MFInitiateSessionRequest("testCustomer");
    showLoading();

    return await MFSDK.initiateSession(initiateSessionRequest)
      .then((response) => {
        setInitiateSessionResponse(response);
        setSessionId(response.SessionId);
        // move to useEffect
        // setTimeout(() => {
        //   loadCardView();
        // }, 1000);
        // loadApplePay();
        // loadAppleButton();
      })
      .catch((error) => onError(error))
      .finally(() => hideLoading());
  };

  const loadCardView = async () => {
    await cardPaymentView.current
      ?.load(initiateSessionResponse, (bin) => {
        // console.log("bin: " + bin);
      })
      .then((success) => {
        // console.log(success);
        setTimeout(() => setIsPayBtnVisible(true), 2000);
      })
      .catch((error) => onError(error));
  };

  const checkoutItems = { totalPrice, setTotalPrice };

  return (
    <>
      <View style={styles.container}>
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="black" />
          </View>
        )}

        <CheckoutItems {...checkoutItems} />

        {myFatoorahNativeReady ? (
          <MFCardPaymentView
            ref={cardPaymentView}
            style={styles.cardView}
            paymentStyle={paymentCardStyle()}
          />
        ) : (
          <Text style={styles.instructions}>
            Card payment requires a native dev build (expo run:android).
          </Text>
        )}
      </View>
      <View style={styles.container2}>
        {isPayBtnVisible && (
          <View style={styles.container_horizontal}>
            {button(t("pay"), pay)}
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  container2: {
    position: "absolute",
    bottom: 0,
    paddingBottom: 30,
    alignItems: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
  loading: {
    zIndex: 1,
    opacity: 1,
    backgroundColor: "#00000093",
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  //#region Embedded
  buttons_container: {
    width: "100%",
    backgroundColor: "#ffffff",
  },
  cardView: {
    // marginTop: 20,
    paddingTop: 0,
    // marginBottom: -75,
    width: "100%",
    minHeight: 300,
  },
  googlePay: {
    width: "90%",
    height: 70,
    margin: 10,
  },
  applePay: {
    width: "100%",
    height: 70,
  },
  container_horizontal: {
    flexDirection: "row",
    paddingRight: 20,
    paddingLeft: 20,
  },
  btn_half: {
    width: "49%",
    marginTop: 10,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#0495ca",
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 10,
  },
  //#endregion

  //#region PaymentMethodsList
  flatList: {
    height: 100,
    flexGrow: 0,
  },
  flatListContent: {
    justifyContent: "center",
  },
  flatListItem: {
    padding: 10,
  },
  flatListItemHolder: {
    alignItems: "center",
  },
  image: {
    width: 50,
    height: 50,
    resizeMode: "contain",
  },
  imageSelected: {
    width: 50,
    height: 50,
    resizeMode: "contain",
    borderColor: "black",
    borderWidth: 3,
    borderRadius: 5,
  },
  //#endregion

  label: {
    fontSize: 16,
    textAlign: "center",
    margin: 3,
    color: "#000000",
    marginBottom: 0,
    flexDirection: "row",
  },
  disabledButtonStyle: {
    marginRight: 20,
    marginLeft: 20,
    marginTop: 10,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "lightgray",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fff",
  },
  buttonStyle: {
    marginRight: 20,
    marginLeft: 20,
    marginTop: 10,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#0495ca",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fff",
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    paddingLeft: 10,
    paddingRight: 10,
    fontSize: 18,
    fontWeight: "500",
  },
  instructions: {
    alignSelf: "stretch",
    textAlign: "left",
    color: "#333333",
    marginBottom: 5,
    fontWeight: "800",
    fontSize: 15,
    width: "100%",
  },
  inputHolder: {
    margin: 10,
    marginTop: 0,
    flexDirection: "row",
  },
  input: {
    height: 40,
    width: "100%",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
    borderColor: "lightgray",
    borderWidth: 1,
    borderRadius: 5,
  },
  applePayButton: {
    backgroundColor: "#000",
    borderRadius: 8,
    padding: 10,
    width: 200,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#000",
  },
  applePayButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  applePayLogo: {
    width: 16,
    height: 16,
  },
  applePayText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#fff",
  },
});

export default Checkout;
