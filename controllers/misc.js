const path = require("path");

exports.HomePage = (req, res, next) => {
  res.sendFile(path.join(__dirname, "../public/signup", "signup.html"));
};
exports.pageNotFound = (req, res, next) => {
  res.send("page not found!!!");
};
