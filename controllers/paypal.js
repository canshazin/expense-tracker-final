const User = require("../models/user.js");
const Order = require("../models/order.js");
const jwt = require("jsonwebtoken");

const paypal = require("@paypal/checkout-server-sdk");
const qs = require("querystring");
const axios = require("axios");

const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_ID,
  process.env.PAYPAL_KEY
);
const client = new paypal.core.PayPalHttpClient(environment);

exports.purchase_premium = async (req, res, next) => {
  try {
    // Get access token
    const auth = Buffer.from(
      `${process.env.PAYPAL_ID}:${process.env.PAYPAL_KEY}`
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

function generateAccessToken(id, prime) {
  return jwt.sign({ user_id: id, prime: prime }, process.env.JWT_SECRET_KEY);
}

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
