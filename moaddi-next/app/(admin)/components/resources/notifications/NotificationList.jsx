import { useSocket } from "@/(root)/context/Socket";
import { Fit } from "@/../services/data-provider";
import { Box, Button, Card, Grid } from "@mui/material";
import { useEffect, useRef } from "react";
import {
  CreateButton,
  List,
  RecordContextProvider,
  ReferenceField,
  TextField,
  TopToolbar,
  useListContext,
} from "react-admin";

const ListActions = () => {
  return (
    <TopToolbar>
      <CreateButton />
    </TopToolbar>
  );
};
const audio = new Audio(
  `${process.env.NEXT_PUBLIC_SITE_URL}/notification.webm`,
);

const SocketContextWontWorkInListWithoutWhy = ({ refetchRef }) => {
  const { notification, machineEvents } = useSocket();
  useEffect(() => {
    refetchRef.current?.();
  }, [notification, machineEvents]);
  useEffect(() => {
    if (typeof notification != "boolean") return;
    // play sound
    audio.currentTime = 0;
    setTimeout(() => audio.play(), 100);
  }, [notification]);
  return null;
};

const NotificationGrid = ({ refetchRef }) => {
  const { data, refetch } = useListContext();
  const { controlDirectMachine, customerRequestAccept } = useSocket();

  useEffect(() => {
    if (refetch) refetchRef.current = refetch;
  }, [refetch]);

  const approveHandler = async ({ id, boxes, machineId }) => {
    for (const { cabinNumber, boxNumber } of boxes) {
      controlDirectMachine({
        machineId,
        type: "LOCKER",
        value: "1",
        boxes: [`${cabinNumber}_${boxNumber}`],
        purchaseId: id,
      });
      await new Promise((r) => setTimeout(r, 500));
    }
    // setTimeout(refetch, 1000);
  };
  const rejectHandler = ({ _id }) => {
    customerRequestAccept({
      _id,
      status: "PaymentRejected",
    });
    // setTimeout(refetch, 1000);
  };

  return (
    <>
      <Grid sx={{ p: 1 }} container spacing={1}>
        {data?.map((record) => (
          <RecordContextProvider key={record.id} value={record}>
            {record.boxes.map((box) => {
              const product = record.products.find(
                ({ _id }) => _id == box.productId,
              );
              return (
                product && (
                  <Grid key={box._id} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                    <Card
                      sx={{
                        p: 1,
                        height: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                        }}
                      >
                        <TextField source="customer.0.name" />
                        <TextField source="customer.0._id" />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* <FunctionField render={() => box.name} /> */}
                        {box.name}
                      </Box>
                      <Box
                        sx={{
                          width: 1,
                          display: "flex",
                          justifyContent: "center",
                          textAlign: "center",
                          mt: 1,
                        }}
                      >
                        {/* <FunctionField
                      render={() => (
                        <Box
                          component={"img"}
                          sx={{
                            width: 1,
                            maxWidth: 1,
                            maxHeight: 150,
                          }}
                          src={Fit.image(product).image.src}
                        />
                      )}
                    /> */}
                        <Box
                          component={"img"}
                          sx={{
                            width: 1,
                            maxWidth: 1,
                            maxHeight: 150,
                          }}
                          src={Fit.image(product).image?.src}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          "*": {
                            typography: "h6",
                          },
                        }}
                      >
                        <ReferenceField
                          source="machineId"
                          reference="machines"
                          label="Machine"
                        />
                        {/* <FunctionField
                      source="price"
                      label="price"
                      render={() =>
                        `${product.campaignPrice ?? product.salePrice} SAR`
                      }
                    /> */}
                        {`${product.campaignPrice ?? product.salePrice} SAR`}
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mt: 1,
                        }}
                      >
                        <Button
                          // disabled={box.status}
                          onClick={() =>
                            approveHandler({ ...record, boxes: [box] })
                          }
                          color="success"
                        >
                          Approve
                        </Button>
                        <Button
                          // disabled={box.status}
                          onClick={() =>
                            rejectHandler({ ...record, boxes: [box] })
                          }
                          color="error"
                        >
                          Reject
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                )
              );
            })}
          </RecordContextProvider>
        ))}
      </Grid>
    </>
  );
};
const NotificationList = () => {
  const refetchRef = useRef();
  return (
    <>
      <SocketContextWontWorkInListWithoutWhy refetchRef={refetchRef} />
      <List actions={<ListActions />}>
        <NotificationGrid refetchRef={refetchRef} />
      </List>
    </>
  );
};

export default NotificationList;
