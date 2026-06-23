const fs = require("fs");

/*
 * Require all routes inside the controllers folder.
 */
let requireFiles = (directory, app) => {
  // console.log(directory);
  fs.readdirSync(directory).forEach(async (fileName) => {
    app.use("/api/v1", require(directory + "/" + fileName)());
  });
};

module.exports = (app) => {
  requireFiles(__dirname + "/controllers", app);
};
