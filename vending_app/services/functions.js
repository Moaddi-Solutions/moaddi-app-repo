export function mapDecimalToBoxes(decimal) {
  const binaryString = (decimal >>> 0).toString(2);
  const includedBoxNumbers = [];
  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === "1") {
      includedBoxNumbers.push(binaryString.length - i);
    }
  }
  return includedBoxNumbers;
}

export function boxSerialDecoder(machineId, boxId) {
  let cabinNumber = boxId.split("_")[0];
  let boxNumbers = boxId.split("_")[1];
  const includedBoxes = mapDecimalToBoxes(boxNumbers);
  includedBoxes.reverse();
  let updates = [];
  for (let i = 0; i < includedBoxes.length; i++) {
    let update = machineId + "_C" + cabinNumber + "_" + includedBoxes[i];
    updates.push(update);
  }
  return updates;
}

function decimalToBinary(decimal, length) {
  const binaryString = (decimal >>> 0).toString(2);
  const paddedBinary = binaryString.padStart(length, "0");
  return paddedBinary;
}

function binaryStringToDecimal(binaryString) {
  return parseInt(binaryString, 2);
}
export function compressBoxData(boxData) {
  const boxIds = boxData.map((item) => {
    const { cabinNumber, boxNumbers } = item;
    const decimal = boxNumbers.reduce((acc, val) => acc + (1 << (val - 1)), 0);
    const binary = decimalToBinary(decimal, 12);
    return `${cabinNumber}_${binary}`;
  });

  const decimalValues = boxIds.map((boxId) => {
    const binaryString = boxId.split("_")[1];
    return boxId.split("_")[0] + "_" + binaryStringToDecimal(binaryString);
  });
  return decimalValues;
}

export function boxesConvert(boxes) {
  const output = [];
  // {'cabin_2' : ['box_1', 'box_2']}
  const groupedByCabin = boxes.reduce((result, { cabinNumber, boxNumber }) => {
    result[cabinNumber] = result[cabinNumber]
      ? [...result[cabinNumber], boxNumber]
      : [boxNumber];
    return result;
  }, {});

  // [{cabinNumber : 'cabin_2' ,boxNumbers : ['box_1', 'box_2']}]
  for (const cabinNumber in groupedByCabin)
    output.push({
      cabinNumber: parseInt(cabinNumber),
      boxNumbers: groupedByCabin[cabinNumber],
    });

  return compressBoxData(output);
}
