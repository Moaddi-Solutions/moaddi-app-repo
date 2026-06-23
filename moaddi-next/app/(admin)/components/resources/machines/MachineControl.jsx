import { useSocket } from "@/(root)/context/Socket";
import { putRequest } from "@/../services/events";
import {
  boxesConvert,
  boxSerialDecoder,
  compressBoxData,
} from "@/../services/functions";
import {
  baseUrl,
  boxUpdateAPI,
  unassignBoxAPI,
} from "@/../services/serverAddresses";
import AddIcon from "@mui/icons-material/Add";
import DoNotDisturbOnIcon from "@mui/icons-material/DoNotDisturbOn";
import LightModeIcon from "@mui/icons-material/LightMode";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import SyncIcon from "@mui/icons-material/Sync";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Checkbox,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  FunctionField,
  ImageField,
  List,
  RecordContextProvider,
  TextField,
  useGetOne,
  useListContext,
  useRecordContext,
} from "react-admin";
import QRCode from "react-qr-code";

const BoxApi = {
  productAssign: (machineId, boxIds, product) =>
    putRequest(boxUpdateAPI(product), {
      machineId,
      boxIds,
    }),
  productUnassign: (machineId) => putRequest(unassignBoxAPI(machineId)),
  // openAll: (machineId) =>
  //   publishData({
  //     machineId,
  //     type: "LOCKER",
  //     value: 1,
  //     boxes: ["all"],
  //   }),
  // openSelected: (machineId, boxes) => {
  //   return publishData({
  //     machineId,
  //     type: "LOCKER",
  //     value: 1,
  //     boxes: boxesConvert(boxes),
  //   });
  // },
  // openOne: (machineId, cabinNumber, boxNumber) =>
  //   publishData({
  //     machineId,
  //     type: "LOCKER",
  //     value: 1,
  //     boxes: compressBoxData([{ cabinNumber, boxNumbers: [boxNumber] }]),
  //   }),
};

const ProductRow = ({
  selectedProduct,
  setSelectedProduct,
  readyToSet,
  loading,
}) => {
  const { data } = useListContext();
  return (
    <Stack
      direction={"row"}
      sx={{ p: 1, overflowX: "auto", width: 1, position: "absolute" }}
      spacing={1}
    >
      {data?.map((product) => (
        <RecordContextProvider key={product.id} value={product}>
          <Card
            onClick={() => setSelectedProduct(product.id)}
            sx={{
              minWidth: 200,
              display: "flex",
              gap: 1,
              p: 1,
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
              ...(product.id == selectedProduct && {
                border: 2,
                borderColor: "info.main",
                opacity: 0.7,
              }),
              ...(!(!loading && readyToSet && product.isActive) && {
                pointerEvents: "none",
                opacity: 0.3,
              }),
            }}
          >
            {!product.isActive && (
              <LockOutlineIcon sx={{ position: "absolute" }} />
            )}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <TextField source="name" />
            </Box>
            {product.image && (
              <ImageField
                sx={{
                  ".RaImageField-image": {
                    // width: 1,
                    maxWidth: 1,
                    maxHeight: 150,
                  },
                }}
                label="Image"
                source="image.src"
              />
            )}
            <Box
              sx={{
                "*": {
                  typography: "h6",
                  display: "flex",
                  justifyContent: "center",
                },
              }}
            >
              <FunctionField
                source="price"
                label="price"
                render={({ campaignPrice, salePrice }) =>
                  `${campaignPrice ?? salePrice} SAR`
                }
              />
            </Box>
          </Card>
        </RecordContextProvider>
      ))}
    </Stack>
  );
};

const BoxGrid = ({
  machine,
  boxes,
  refetchBoxes,
  selectedBoxes,
  setSelectedBoxes,
  selectedProduct,
  readyToSet,
  loading,
  setLoading,
}) => {
  const { isPending, data, refetch, dataUpdatedAt } = useGetOne("vendors", {
    id: machine.vendorId,
  });
  const {
    publishData,
    controlDirectMachine,
    controlBluetooth1Machine,
    // controlBluetooth2Machine,
  } = useSocket();
  useEffect(() => {
    refetchBoxes.current = refetch;
    if (isPending) boxes.current = [];
    else {
      const _machine = data.machines.find(({ _id }) => _id == machine._id);
      boxes.current = _machine ? _machine.boxes : [];
    }
  }, [isPending, data, dataUpdatedAt, refetch]);
  useEffect(() => {
    if (loading) return;
    setSelectedBoxes([]);
  }, [loading]);
  const productAssignOne = (boxId) => {
    setLoading(true);
    BoxApi.productAssign(machine._id, [boxId], selectedProduct).then(
      (response) =>
        refetchBoxes
          .current?.()
          .then((r) => setTimeout(() => setLoading(false), 100)),
    );
  };

  const changeStatus = (machineId, cabinNumber, boxNumber, status) => {
    switch (machine.type) {
      // Direct
      case 0:
        controlDirectMachine({
          machineId,
          type: "LOCKER",
          value: status,
          boxes: [`${cabinNumber}_${boxNumber}`],
        });
        break;
      // MQTT
      case 1:
        publishData({
          machineId,
          type: "LOCKER",
          value: 1,
          boxes: compressBoxData([{ cabinNumber, boxNumbers: [boxNumber] }]),
        });
        break;
      // Bluetooth (zbmpos - Wifi 4g)
      case 2:
        controlBluetooth1Machine({
          machineId,
          box: [cabinNumber, boxNumber],
        });
        break;
      // Bluetooth 2 (kaisijin 12)
      case 3:
        // controlBluetooth2Machine({
        //   machineId,
        //   // box: `${cabinNumber}_${boxNumber}`,
        //   box: boxNumber,
        // });
        break;
    }
  };
  // console.log(selectedBoxes);

  return (
    <Grid container sx={{ p: 1 }} spacing={1}>
      {boxes.current.map?.((box, i) => (
        <RecordContextProvider key={box._id} value={box}>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card
              sx={{
                p: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  width: 1,
                  justifyContent: "space-between",
                  alignItems: "center",
                  ">*": { p: 1 },
                }}
              >
                <Checkbox
                  checked={selectedBoxes.includes(box._id)}
                  onChange={(event) => {
                    setSelectedBoxes((prev) =>
                      event.target.checked
                        ? [...prev, box._id]
                        : prev.filter((_id) => _id != box._id),
                    );
                  }}
                />

                <TextField sx={{ typography: "h6" }} source="name" />
                <Typography variant="body1">{i + 1}</Typography>
              </Box>
              {loading ? (
                <IconButton
                  disabled
                  size="large"
                  sx={{
                    my: 5.5,
                    "@keyframes rotate": {
                      from: {
                        transform: "rotate(0deg)",
                      },
                      to: {
                        transform: "rotate(360deg)",
                      },
                    },
                    animation: "rotate 2s linear infinite",
                    transformOrigin: "center",
                  }}
                >
                  <SyncIcon sx={{ width: 40, height: 40 }} />
                </IconButton>
              ) : box.product ? (
                <>
                  <Box
                    component={"img"}
                    label="Image"
                    src={`${baseUrl()}${box.product.image}`}
                    sx={{
                      px: 2,
                      width: 1,
                      height: 122,
                      objectFit: "contain",
                    }}
                  />
                  <Typography variant="body1">
                    {`${box.product.name} - ${box.product.campaignPrice ?? box.product.salePrice} SAR`}
                  </Typography>
                </>
              ) : (
                <IconButton
                  // disabled={!(readyToSet && box.status && selectedProduct)}
                  disabled={!(readyToSet && selectedProduct)}
                  onClick={(e) => productAssignOne(box._id)}
                  size="large"
                  sx={{ my: 5.5, cursor: "pointer" }}
                >
                  <AddIcon sx={{ width: 40, height: 40 }} />
                </IconButton>
              )}
              {/* Direct */}
              {machine.type === 0 && (
                <ButtonGroup fullWidth>
                  <Button
                    disabled={!(readyToSet && !box.status)}
                    onClick={() =>
                      changeStatus(
                        machine._id,
                        box.cabinNumber,
                        box.boxNumber,
                        1,
                      )
                    }
                    color="success"
                    variant={
                      !box.status && box.productId ? "contained" : "outlined"
                    }
                  >
                    Open
                  </Button>
                  <Button
                    disabled={!(readyToSet && box.status)}
                    onClick={() =>
                      changeStatus(
                        machine._id,
                        box.cabinNumber,
                        box.boxNumber,
                        0,
                      )
                    }
                    color="success"
                    variant={
                      !box.status && box.productId ? "contained" : "outlined"
                    }
                  >
                    Close
                  </Button>
                </ButtonGroup>
              )}
              {/* MQTT */}
              {machine.type === 1 && (
                <ButtonGroup fullWidth>
                  <Box component={"span"} sx={{ width: 1 }}>
                    <Button
                      disabled={!(readyToSet && !box.status && box.productId)}
                      onClick={() =>
                        changeStatus(
                          machine._id,
                          box.cabinNumber,
                          box.boxNumber,
                          1,
                        )
                      }
                      color="success"
                      variant={
                        !box.status && box.productId ? "contained" : "outlined"
                      }
                    >
                      Open
                    </Button>
                  </Box>
                  <Tooltip title="Fill" placement="top">
                    <Box component={"span"} sx={{ width: 1 }}>
                      <Button disabled>
                        <LightModeIcon
                          color={box.isFilled ? "info" : undefined}
                        />
                      </Button>
                    </Box>
                  </Tooltip>
                  <Tooltip title="Close" placement="top">
                    <Box component={"span"} sx={{ width: 1 }}>
                      <Button disabled>
                        <DoNotDisturbOnIcon
                          color={!box.status ? "error" : undefined}
                        />
                      </Button>
                    </Box>
                  </Tooltip>
                </ButtonGroup>
              )}
              {/* Bluetooth (zbmpos - Wifi 4g) */}
              {machine.type === 2 && (
                <ButtonGroup fullWidth>
                  <Button
                    disabled={!(readyToSet && !box.status)}
                    onClick={() =>
                      changeStatus(
                        machine._id,
                        box.cabinNumber,
                        box.boxNumber,
                        1,
                      )
                    }
                    color="success"
                    // variant={
                    //   !box.status && box.productId ? "contained" : "outlined"
                    // }
                  >
                    Open
                  </Button>
                </ButtonGroup>
              )}
              {/* Bluetooth 2 (kaisijin 12) */}
              {machine.type === 3 && (
                <ButtonGroup fullWidth>
                  {/* <Button
                    disabled={!(readyToSet && !box.status)}
                    onClick={() =>
                      changeStatus(
                        machine._id,
                        box.cabinNumber,
                        box.boxNumber,
                        1,
                      )
                    }
                    color="success"
                    // variant={
                    //   !box.status && box.productId ? "contained" : "outlined"
                    // }
                  >
                    Open
                  </Button> */}
                </ButtonGroup>
              )}
            </Card>
          </Grid>
        </RecordContextProvider>
      ))}
      <RealTime machine={machine} />
    </Grid>
  );
};

const RealTime = ({ machine }) => {
  const { machineEvents } = useSocket();
  const queryClient = useQueryClient();
  // console.log(queryClient);

  // const all = useGetOne("vendors", {
  //   id: machine.vendorId,
  // });
  // useEffect(() => {
  //   console.log(all);
  // }, [all.dataUpdatedAt]);

  useEffect(() => {
    if (!machineEvents) return;
    queryClient.setQueriesData(
      {
        queryKey: ["vendors", "getOne", { id: machine.vendorId }],
      },
      (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          machines: prev.machines.map((item) => {
            if (item._id !== machine._id) return item;
            return {
              ...item,
              boxes: boxUpdateHandler(item.boxes, machineEvents, "status"),
            };
          }),
        };
      },
    );
  }, [machineEvents]);
};

const boxUpdateHandler = (boxes, machineEvents, statusName) => {
  machineEvents?.boxes?.map((box) => {
    if (box === "all") {
      boxes = boxes.map((box) => {
        if (machineEvents.type === "IR") box.isFilled = !!machineEvents.value;
        else if (machineEvents.type === "LOCKER")
          box[statusName] = !!machineEvents.value;
        return box;
      });
    } else {
      boxSerialDecoder(
        machineEvents.machineId,
        box,
        machineEvents.machineType,
      ).map((cBox) => {
        boxes = boxes.map((oldBox) => {
          if (cBox === oldBox._id) {
            if (machineEvents.type === "IR")
              oldBox.isFilled = !!machineEvents.value;
            else if (machineEvents.type === "LOCKER")
              oldBox[statusName] = !!machineEvents.value;
          }
          return oldBox;
        });
      });
    }
  });
  return boxes;
};

const MachineControl = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { publishData, controlDirectMachine, controlBluetooth1Machine } =
    useSocket();
  const boxes = useRef([]);
  const refetchBoxes = useRef(null);
  const machine = useRecordContext();
  const readyToSet = !machine?.isActive && machine?.isConnected;
  const productRow = {
    selectedProduct,
    setSelectedProduct,
    readyToSet,
    loading,
  };
  const boxGrid = {
    machine,
    selectedProduct,
    boxes,
    refetchBoxes,
    selectedBoxes,
    setSelectedBoxes,
    readyToSet,
    loading,
    setLoading,
  };
  const productAssignAll = () => {
    setLoading(true);
    BoxApi.productAssign(
      machine.id,
      boxes.current.map(({ _id }) => _id),
      selectedProduct,
    ).then((response) => {
      refetchBoxes
        .current?.()
        .then((r) => setTimeout(() => setLoading(false), 100));
    });
  };
  const productAssignSelected = () => {
    setLoading(true);
    BoxApi.productAssign(machine.id, selectedBoxes, selectedProduct).then(
      (response) => {
        refetchBoxes
          .current?.()
          .then((r) => setTimeout(() => setLoading(false), 100));
      },
    );
  };
  const productUnassignAll = (machineId) => {
    setLoading(true);
    BoxApi.productUnassign(machineId).then((response) => {
      refetchBoxes
        .current?.()
        .then((r) => setTimeout(() => setLoading(false), 100));
    });
  };
  const openAll = (machineId) => {
    switch (machine.type) {
      // Direct
      case 0:
        controlDirectMachine({
          machineId,
          type: "LOCKER",
          value: 1,
          boxes: ["all"],
        });
        break;
      // MQTT
      case 1:
        publishData({
          machineId,
          type: "LOCKER",
          value: 1,
          boxes: ["all"],
        });
        break;
      // case 2:
      //   controlBluetooth1Machine();
      //   break;
    }
  };
  const openSelected = async (machineId, boxes) => {
    switch (machine.type) {
      // Direct
      case 0:
        for (const { cabinNumber, boxNumber } of boxes) {
          controlDirectMachine({
            machineId,
            type: "LOCKER",
            value: 1,
            boxes: [`${cabinNumber}_${boxNumber}`],
          });
          await new Promise((r) => setTimeout(r, 500));
        }
        break;
      // MQTT
      case 1:
        publishData({
          machineId,
          type: "LOCKER",
          value: 1,
          boxes: boxesConvert(boxes),
        });
        break;
      // Bluetooth1
      case 2:
        for (const { cabinNumber, boxNumber } of boxes) {
          controlBluetooth1Machine({
            machineId,
            box: [cabinNumber, boxNumber],
          });
          await new Promise((r) => setTimeout(r, 500));
        }
    }
  };
  const reboot = () => {};

  return (
    machine && (
      <Card>
        <CardContent>
          <Typography variant="h6">Control Machine</Typography>
          <Stack
            sx={{
              flexDirection: { xs: "column", md: "row" },
              ">*": { m: "0!important" },
            }}
            alignItems={"center"}
            justifyContent={"space-between"}
            spacing={2}
          >
            <Box
              sx={{
                width: 220,
                height: 220,
                border: 8,
                borderColor: "white",
                bgcolor: "white",
              }}
              component={QRCode}
              value={machine.qrCode}
            />
            {children}
            {!!machine.vendorId && (
              <>
                <Stack
                  sx={{
                    "button.MuiButtonGroup-firstButton": { minWidth: 136 },
                  }}
                  spacing={1}
                >
                  {/* Bluetooth1  */}
                  {machine.type == 2 && (
                    <ButtonGroup
                      disabled={!(!loading && readyToSet)}
                      variant="contained"
                      color="secondary"
                      sx={{ width: 1, ">.MuiButton-root": { flex: 1 } }}
                    >
                      <Button variant="outlined" onClick={reboot}>
                        <PowerSettingsNewIcon sx={{ marginInlineEnd: 1 }} />{" "}
                        Reboot machine
                      </Button>
                    </ButtonGroup>
                  )}
                  <ButtonGroup
                    sx={{ width: 1, ">.MuiButton-root": { flex: 1 } }}
                    disabled={!(!loading && readyToSet)}
                    variant="contained"
                    color="secondary"
                  >
                    {/* Not Bluetooth 2  */}
                    {machine.type != 3 && (
                      <Button variant="outlined" disabled>
                        Box open
                      </Button>
                    )}
                    {/* Not Bluetooth 1  */}
                    {machine.type != 2 && (
                      <Button onClick={(e) => openAll(machine._id)}>All</Button>
                    )}
                    <Button
                      onClick={(e) =>
                        openSelected(
                          machine._id,
                          selectedBoxes.map((id) =>
                            boxes.current.find(({ _id }) => id == _id),
                          ),
                        )
                      }
                      disabled={!selectedBoxes.length}
                    >
                      Selected{" "}
                      {!!selectedBoxes.length && `(${selectedBoxes.length})`}
                    </Button>
                  </ButtonGroup>
                  <ButtonGroup
                    disabled={!(!loading && readyToSet && selectedProduct)}
                    color="primary"
                    variant="contained"
                  >
                    <Button variant="outlined" disabled>
                      Add product
                    </Button>
                    <Button onClick={productAssignAll}>All</Button>
                    <Button
                      disabled={!selectedBoxes.length}
                      onClick={productAssignSelected}
                    >
                      Selected{" "}
                      {!!selectedBoxes.length && `(${selectedBoxes.length})`}
                    </Button>
                  </ButtonGroup>
                  <ButtonGroup
                    disabled={!(!loading && readyToSet)}
                    color="error"
                    variant="contained"
                  >
                    <Button variant="outlined" disabled>
                      Remove product
                    </Button>
                    <Button
                      sx={{ width: 1 }}
                      onClick={(e) => productUnassignAll(machine.id)}
                    >
                      All
                    </Button>
                    {/* <Button>
                  Selected{" "}
                  {!!selectedBoxes.length && `(${selectedBoxes.length})`}
                </Button> */}
                  </ButtonGroup>
                </Stack>
              </>
            )}
          </Stack>
          {!!machine.vendorId && (
            <>
              <Typography>Products</Typography>
              <List
                resource="products"
                sort={{ field: "name", order: "DESC" }}
                actions={null}
                sx={{
                  mt: 1,
                  ".RaList-content": {
                    height: 220,
                  },
                }}
              >
                <ProductRow {...productRow} />
              </List>
              <BoxGrid {...boxGrid} />
            </>
          )}
        </CardContent>
      </Card>
    )
  );
};

export default MachineControl;
