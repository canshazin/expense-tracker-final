const User = require("../models/user.js");
const path = require("path");
const bcrypt = require("bcrypt");
const Expense = require("../models/expense.js");
const Order = require("../models/order.js");
const jwt = require("jsonwebtoken");
const paypal = require("@paypal/checkout-server-sdk");
const qs = require("querystring");
const axios = require("axios");
const sequelize = require("../util/database.js"); //required for transaction
// const Sequelize = require("sequelize");
const Password_Request = require("../models/forgot_password_requests.js");
const Sib = require("sib-api-v3-sdk");

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
        res.json({ success: true, msg: "Signed in successfully" });
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

exports.forgot_password = async (req, res, next) => {
  try {
    const response = { success: false, messgae: "" };
    const exist_email = await User.findOne({
      where: { email: req.body.user_email },
    });
    if (!exist_email) {
      response.success = false;
      response.message = "E-mail doesnt exist";
      return res.status(404).json(response);
    }
    console.log(exist_email);

    const request = await Password_Request.create({
      userId: exist_email.id,
      isActive: true,
    });
    console.log("REQUEST", request.id, "REQUEST");

    const Client = Sib.ApiClient.instance;
    const apiKey = Client.authentications["api-key"];
    apiKey.apiKey = process.env.brevo_key;
    const transEmailApi = new Sib.TransactionalEmailsApi();

    const sendSmtpEmail = new Sib.SendSmtpEmail();

    sendSmtpEmail.sender = {
      email: "shazin.cans99@gmail.com",
      name: "Expense Tracker Sharpener",
    };
    sendSmtpEmail.to = [{ email: req.body.user_email }];
    sendSmtpEmail.subject = "Password Reset";
    sendSmtpEmail.htmlContent = `
      <html>
        
        <body>
          <p>Click on the link below to reset your password:</p>
          <a href="http://localhost:3000/password/resetpassword/${request.id}" class="button">Reset Password</a>
          <p>If the button above doesn't work, copy and paste this link into your browser:</p>
          <p>http://localhost:3000/password/resetpassword/${request.id}</p>
        </body>
      </html>
    `;

    const result = await transEmailApi.sendTransacEmail(sendSmtpEmail);

    console.log("Email sent successfully. Response:", result);
    console.log("Recipient email:", req.body.user_email);

    res.json({
      message: result,
      success: true,
    });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({
      success: false,
      message: "Error sending email:",
    });
  }
};

exports.reset_password = async (req, res, next) => {
  try {
    const id = req.params.id;
    const request = await Password_Request.findOne(
      { where: { id: id } },
      { select: "isActive" }
    );

    if (request.isActive == true) {
      res.sendFile(
        path.join(__dirname, "../public/reset_password", "reset_password.html")
      );
    } else {
      res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Link Expired</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            background-color: #f0f0f0;
            padding: 20px;
          }
          h1 {
            color: #ff0000;
            font-size: 24px;
          }
          p {
            font-size: 18px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <h1>Link Expired</h1>
        <p>The link you clicked has expired. Please request a new link.</p>
      </body>
      </html>
      `);
    }
  } catch (err) {
    console.log(err);
    res.send(err);
  }
};
exports.update_password = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const user = req.body;

    const exist_email = await User.findOne({
      where: { email: req.body.email },
    });
    if (!exist_email) {
      return res.json({ success: false, msg: "incorrect Email" });
    }

    bcrypt.hash(user.password, 10, async (err, hash) => {
      console.log(err);
      await User.update(
        {
          password: hash,
        },
        { where: { email: exist_email.email } },
        { transaction: t }
      );
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", exist_email);
      await Password_Request.update(
        { isActive: false },
        { where: { userId: exist_email.id } },
        { transaction: t }
      );
      await t.commit();
      res.json({ success: true, msg: "logged in successfully" });
    });
  } catch (err) {
    console.log(err);
    await t.rollback();
    res.json({ success: false, msg: "An error occured.Try again" });
  }
};

function generateAccessToken(id, prime) {
  return jwt.sign({ user_id: id, prime: prime }, "secretkey");
}

exports.add_expense = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    let msg = "";
    const expense = req.body;
    console.log("expense.........", expense);
    const expense_added = await Expense.create(
      {
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        userId: req.user.id,
      },
      { transaction: t }
    );

    const new_total_expense =
      Number(expense.amount) + Number(req.user.total_expense);
    await User.update(
      { total_expense: new_total_expense },
      {
        where: { id: req.user.id },
        transaction: t,
      }
    );
    await t.commit();
    msg = "expense added succefully";
    const id = expense_added.id;
    const response = { msg, id };
    res.json(response);
  } catch (err) {
    await t.rollback();

    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while adding the expense" });
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
  const t = await sequelize.transaction();
  try {
    const id = req.params.id;
    const expense_to_delete = await Expense.findOne(
      {
        where: { id: id, userId: req.user.id },
      },
      { transaction: t }
    );

    const expense = await Expense.destroy(
      {
        where: { id: id, userId: req.user.id },
      },
      { transaction: t }
    );
    console.log(expense_to_delete, "+++++++++++++++++++++++++");
    const new_total_expense =
      Number(req.user.total_expense) - Number(expense_to_delete.amount);
    await User.update(
      { total_expense: new_total_expense },
      {
        where: { id: req.user.id },
      },
      { transaction: t }
    );
    await t.commit();
    res.json({ success: true });
  } catch (err) {
    await t.rollback();
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
    const users = await User.findAll({
      attributes: ["uname", "total_expense"],
    });
    const sorted_users = users.sort((b, a) => {
      b.total_expense - a.total_expense;
    });
    res.json(sorted_users);
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
