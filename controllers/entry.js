const User = require("../models/user.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

function generateAccessToken(id, prime) {
  return jwt.sign({ user_id: id, prime: prime }, process.env.JWT_SECRET_KEY);
}

exports.signup = async (req, res, next) => {
  try {
    const user = req.body;
    const exist_email = await User.findAll({ where: { email: user.email } });
    if (exist_email.length > 0) {
      res.json({ success: false, msg: "email already taken" });
    } else {
      bcrypt.hash(user.password, 10, async (err, hash) => {
        console.log(err);
        await User.create({
          uname: user.uname,
          email: user.email,
          password: hash,
          isPrime: false,
        });
        res.json({ success: true, msg: "Signed successfully" });
      });
    }
  } catch (err) {
    console.log(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const user = req.body;
    const response = { success: true, message: "" };
    const exist_email = await User.findOne({ where: { email: user.email } });
    if (!exist_email) {
      response.success = false;
      response.message = "E-mail doesnt exist";
      res.status(404).json(response);
    } else {
      bcrypt.compare(user.password, exist_email.password, (err, result) => {
        if (err) {
          throw new Error("smthing went wrong");
        }
        if (result === true) {
          response.success = true;
          response.message = "Logged in successfully";
          response.token = generateAccessToken(
            exist_email.id,
            exist_email.isPrime
          );
          res.json(response);
        } else if (result === false) {
          response.success = false;
          response.message = "User not authorized";
          res.status(401).json(response);
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
};
