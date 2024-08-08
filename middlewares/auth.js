const jwt = require("jsonwebtoken");
const User = require("../models/user.js");

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization");
    if (token) {
      const user = jwt.verify(token, process.env.JWT_SECRET_KEY);
      const user_detail = await User.findByPk(user.user_id);
      req.user = user_detail;

      next();
    } else {
      console.log("no token");
    }
  } catch (err) {
    console.log(err);
  }
};
