require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const routes = require("./routes/routes.js");
const sequelize = require("./util/database");
const User = require("./models/user.js");
const Expense = require("./models/expense.js");
const Download = require("./models/download.js");
const Order = require("./models/order.js");
const Password_Request = require("./models/forgot_password_requests.js");
const path = require("path");

var cors = require("cors");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(routes);

User.hasMany(Expense);
Expense.belongsTo(User);
User.hasMany(Order);
Order.belongsTo(User);
User.hasMany(Password_Request);
Password_Request.belongsTo(User);
User.hasMany(Download);
Download.belongsTo(User);

sequelize
  // .sync({ force: true })
  .sync()
  .then((result) => {
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
