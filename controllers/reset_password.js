const User = require("../models/user.js");
const path = require("path");
const bcrypt = require("bcrypt");
const sequelize = require("../util/database.js");
const Password_Request = require("../models/forgot_password_requests.js");
const Sib = require("sib-api-v3-sdk");

exports.forgot_password = async (req, res, next) => {
  try {
    const response = { success: false, message: "" };
    const exist_email = await User.findOne({
      where: { email: req.body.user_email },
    });
    if (!exist_email) {
      response.success = false;
      response.message = "E-mail doesnt exist";
      return res.status(404).json(response);
    }

    const request = await Password_Request.create({
      userId: exist_email.id,
      isActive: true,
    });

    const Client = Sib.ApiClient.instance;
    const apiKey = Client.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_KEY;
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
            <a href="${process.env.WEBSITE}/password/resetpassword/${request.id}" class="button">Reset Password</a>
            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <p>${process.env.WEBSITE}/password/resetpassword/${request.id}</p>
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
