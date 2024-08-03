const User = require("../models/user.js");
const path = require("path");
const bcrypt = require("bcrypt");
const Expense = require("../models/expense.js");
const Download = require("../models/download.js");
const Order = require("../models/order.js");
const jwt = require("jsonwebtoken");
const paypal = require("@paypal/checkout-server-sdk");
const qs = require("querystring");
const axios = require("axios");
const sequelize = require("../util/database.js"); //required for transaction

const Password_Request = require("../models/forgot_password_requests.js");
const Sib = require("sib-api-v3-sdk");
// const { Op } = require("sequelize");
const { Op, Sequelize } = require("sequelize");
const { literal } = require("sequelize");
const AWS = require("aws-sdk");

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

    const date = new Date();

    const expense_added = await Expense.create(
      {
        date: date,
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
    const items_per_page = parseInt(req.query.items_per_page, 10) || 5; // Ensure it's a number
    const page = parseInt(req.query.page, 10) || 1; // Ensure it's a number

    console.log(
      page,
      items_per_page,
      "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"
    );

    let prime = req.user.isPrime || false;

    const { count, rows: expenses } = await Expense.findAndCountAll({
      where: { userId: req.user.id },
      offset: (page - 1) * items_per_page,
      limit: items_per_page,
    });

    res.json({
      expenses,
      prime,
      current_page: page,
      has_next_page: items_per_page * page < count,
      next_page: items_per_page * page < count ? page + 1 : null,
      has_previous_page: page > 1,
      previous_page: page > 1 ? page - 1 : null,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
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

exports.view_report = async (req, res, next) => {
  const date = new Date(req.params.date);
  const year = date.getFullYear();
  if (req.user.isPrime == false) {
    return res.status(401).json("not a prime user");
  } else {
    const expenses = await Expense.findAll(
      {
        attributes: ["date", "amount", "description", "category"],
      },
      {
        where: {
          userId: req.user.id,
          date: {
            [Op.and]: [
              Sequelize.where(
                Sequelize.fn("YEAR", Sequelize.col("date")),
                year
              ),
            ],
          },
        },
      }
    );
    res.json(expenses);
  }
};

function format_expense(expenses) {
  //all keys or headings
  const headers = Object.keys(expenses[0]);

  //all headers length in list
  const header_lengths = headers.map((header) => header.length);

  //all values length in list
  const values_length = [];
  expenses.forEach((expense) => {
    headers.forEach((header) => {
      values_length.push(expense[header].toString().length);
    });
  });

  //finding max length for better visual
  const max_len = Math.max(...values_length, ...header_lengths);

  //making headers into single string separated by | => "abc | efg "
  let formatted_headers = "";

  headers.forEach((header) => {
    const padded_header = header.padEnd(max_len, " ") + "|  ";
    formatted_headers += padded_header;
  });

  //formating values of each object,concatenateit and add it to list
  const data = [];
  expenses.forEach((expense) => {
    let padded_object_values = "";
    headers.forEach((header) => {
      console.log(expense[header], "hi");
      console.log(formatted_headers);
      console.log(headers);
      const padded_value =
        expense[header].toString().padEnd(max_len, " ") + "|  ";

      padded_object_values += padded_value;
    });
    data.push(padded_object_values);
    console.log(max_len);
  });

  //for heading separation from other rows
  const line = "-".repeat(formatted_headers.length);
  const result = [formatted_headers, line, ...data].join("\n");
  console.log(result);
  return result;
}

// Function to upload data to S3
async function upload_tp_s3(data, file_name) {
  try {
    // Load AWS credentials and configuration
    const BUCKET_NAME = process.env.BUCKET_NAME;
    const IAM_USER_ID = process.env.IAM_USER_ID;
    const IAM_USER_KEY = process.env.IAM_USER_KEY;

    // Initialize S3 instance
    const s3 = new AWS.S3({
      accessKeyId: IAM_USER_ID,
      secretAccessKey: IAM_USER_KEY,
      region: process.env.AWS_REGION, // Make sure to set the region
    });

    // Define upload parameters
    const params = {
      Bucket: BUCKET_NAME,
      Key: file_name,
      Body: data,
      ACL: "public-read", // Access Control List
    };

    // Perform the upload operation and return the file URL
    const result = await s3.upload(params).promise();
    console.log("Upload success:", result);
    return result.Location;
  } catch (err) {
    console.error("Error uploading to S3:", err);
    throw err; // Re-throw the error for caller to handle
  }
}
exports.download_expenses = async (req, res, next) => {
  try {
    // Fetch expenses for the current user
    const expenses = await Expense.findAll({
      where: { userId: req.user.id },
      attributes: [
        [literal("DATE(date)"), "date"], // Format date to exclude time
        "amount",
        "description",
        "category",
      ],
    });

    // Handle case where no expenses are found
    if (expenses.length <= 0) {
      return res.status(404).json({ msg: "Data not found" });
    }
    const expenseData = expenses.map((expense) => expense.toJSON());
    const formatted_expense = format_expense(expenseData);
    const stringified_expenses = formatted_expense;

    const file_date = new Date();
    const file_name = `expenses_${req.user.id}/${file_date}.txt`;

    const file_url = await upload_tp_s3(stringified_expenses, file_name);

    if (!file_url) {
      throw new Error("URL doesn't exist");
    }

    // Respond with the file URL
    res.status(200).json({ file_url, file_date });
  } catch (err) {
    console.error("Error in download_expenses:", err);
    res.status(500).send("Something went wrong");
  }
};

exports.download_history_save = async (req, res, next) => {
  try {
    const file = req.body;
    const data = await Download.create({
      date: file.date,
      url: file.url,
      userId: req.user.id,
    });
    res.json({ date: data.date, url: data.url });
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.download_history_get = async (req, res, next) => {
  try {
    if (req.user.isPrime == true) {
      const downloads = await Download.findAll({
        where: { userId: req.user.id },
      });
      console.log(
        "ppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp",
        downloads
      );
      res.json({ data: downloads, prime: true });
    } else {
      res.json({ prime: false });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "error" });
  }
};

exports.HomePage = (req, res, next) => {
  res.sendFile(path.join(__dirname, "../public/signup", "signup.html"));
};
exports.pageNotFound = (req, res, next) => {
  res.send("page not found!!!");
};
