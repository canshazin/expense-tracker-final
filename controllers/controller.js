const User = require("../models/user.js");
const path = require("path");
const bcrypt = require("bcrypt");
const Expense = require("../models/expense.js");
const Order = require("../models/order.js");
const jwt = require("jsonwebtoken");
const paypal = require("@paypal/checkout-server-sdk");
const qs = require("querystring");
const axios = require("axios");
const sequelize = require("../util/database.js");
const { Sequelize } = require("sequelize");

const environment = new paypal.core.SandboxEnvironment(
  process.env.paypal_id,
  process.env.paypal_key
);
const client = new paypal.core.PayPalHttpClient(environment);

exports.signup = async (req, res, next) => {
  try {
    const user = req.body;
    const exist_email = await User.findAll({ where: { email: user.email } });
    if (exist_email.length > 0) {
      res.json({ success: true, msg: "email already taken" });
    } else {
      bcrypt.hash(user.password, 10, async (err, hash) => {
        console.log(err);
        await User.create({
          uname: user.uname,
          email: user.email,
          password: hash,
          isPrime: false,
        });
        res.json({ success: false, msg: "Signed in successfully" });
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

function generateAccessToken(id, prime) {
  return jwt.sign({ user_id: id, prime: prime }, "secretkey");
}
// function decodeJWT(token) {
//   // Split the token into header, payload, and signature
//   const [headerB64, payloadB64, signature] = token.split('.');

//   // Decode the payload
//   const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

//   // Extract userid and name
//   const { userid, prime } = payload;

//   return { userid, prime};
// }

exports.add_expense = async (req, res, next) => {
  try {
    let msg = "";
    const expense = req.body;
    console.log("expense.........", expense);
    const expense_added = await Expense.create({
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      userId: req.user.id,
    });
    msg = "expense added succefully";
    const id = expense_added.id;
    const response = { msg, id };
    res.json(response);
  } catch (err) {
    console.log(err);
  }
};

exports.get_expenses = async (req, res) => {
  try {
    let prime = false;
    if (req.user.isPrime == true) {
      prime = true;
    }

    const expenses = await Expense.findAll({ where: { userId: req.user.id } });
    res.json({ expenses, prime: prime });
  } catch (err) {
    console.log(err);
  }
};

exports.delete_expense = async (req, res) => {
  try {
    const id = req.params.id;
    await Expense.destroy({ where: { id: id, userId: req.user.id } });
    res.json({ success: true });
  } catch (err) {
    console.log(err);
  }
};

exports.purchase_premium = async (req, res, next) => {
  try {
    // Get access token
    const auth = Buffer.from(
      `${process.env.paypal_id}:${process.env.paypal_key}`
    ).toString("base64");
    const tokenResponse = await axios({
      method: "post",
      url: "https://api-m.sandbox.paypal.com/v1/oauth2/token",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en_US",
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: qs.stringify({ grant_type: "client_credentials" }),
    });

    const accessToken = tokenResponse.data.access_token;

    // Create PayPal order
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: "25.00",
          },
        },
      ],
    });
    request.headers["Authorization"] = `Bearer ${accessToken}`;

    const paypal_order = await client.execute(request);

    if (paypal_order.statusCode == 201) {
      await req.user.createOrder({
        order_id: paypal_order.result.id,
        payment_id: null,
        status: "pending",
      });
      res.status(201).json({ id: paypal_order.result.id });
    } else {
      throw new Error("Failed to create PayPal order");
    }
  } catch (err) {
    console.error("Error in purchase_premium:", err);
    res.status(400).json({ message: "Failed to process premium purchase" });
  }
};

exports.update = async (req, res, next) => {
  try {
    if (req.body.flag == 1) {
      const promise1 = Order.update(
        { status: "success", payment_id: req.body.payment_id },
        { where: { userId: req.user.id, order_id: req.body.order_id } }
      );
      const promise2 = User.update(
        { isPrime: true },
        { where: { id: req.user.id } }
      );

      await Promise.all([promise1, promise2]);
      const token = generateAccessToken(req.user.id, true);
      return res.json({ msg: "payment successful", token: token });
    } else if (req.body.flag == 2) {
      await Order.update(
        {
          status: "cancelled",
          payment_id: req.body.payment_id,
        },
        { where: { userId: req.user.id, order_id: req.body.order_id } }
      );
      return res.json({ msg: "payment cancelled" });
    } else {
      await Order.update(
        {
          status: "failed",
          payment_id: req.body.payment_id,
        },
        { where: { userId: req.user.id, order_id: req.body.order_id } }
      );
      return res.json({ msg: "payment failed" });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "An error occurred during payment processing" });
  }
};
exports.leaderboard = async (req, res, next) => {
  try {
    const result = await User.findAll({
      attributes: [
        "uname", // Assuming your User model uses "uname" for the name field
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.fn("SUM", Sequelize.col("Expenses.amount")),
            0
          ),
          "total_expense",
        ],
      ],
      include: [
        {
          model: Expense,
          attributes: [],
          required: false, // This will perform a LEFT OUTER JOINkk
        },
      ],
      group: ["User.id", "User.uname"],
      order: [[Sequelize.literal("total_expense"), "DESC"]], // Order by total_expense descending
    });
    res.json(result);
  } catch (error) {
    console.error("Error in leaderboard:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the leaderboard" });
  }
};

exports.HomePage = (req, res, next) => {
  res.sendFile(path.join(__dirname, "../public/signup", "signup.html"));
};
exports.pageNotFound = (req, res, next) => {
  res.send("page not found!!!");
};
