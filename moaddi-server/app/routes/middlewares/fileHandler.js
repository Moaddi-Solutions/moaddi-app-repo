const multer = require("multer");

let files = function () {
  const storage = multer.diskStorage({
    destination(req, file, callback) {
      callback(null, "images/");
    },

    filename(req, file, callback) {
      // console.log('file:', file);
      callback(null, `${Date.now()}_${file.originalname}`);
    },
  });

  const uploadFilter = async (req, file, callback) => {
    if (
      !/jpe?g|png|gif|webp|pdf|msword|spreadsheet|excel|plain|octet-stream/i.test(
        file.mimetype,
      )
    ) {
      callback(new Error("File is not supported"), false);
      return;
    }
    callback(null, true);
  };

  // const upload = multer({ storage: storage });
  const upload = multer({ storage: storage, fileFilter: uploadFilter });
  return upload;
};

module.exports = {
  files,
};
