const express = require("express");
const bodyParser = require("body-parser");
const routes = require("./routes/routes.js");
const sequelize = require("./util/database");
const User = require("./models/user.js");
const Expense = require("./models/expense.js");
const Order = require("./models/order.js");
const path = require("path");
require("dotenv").config();

var cors = require("cors");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(bodyParser.json());
app.use(routes);
User.hasMany(Expense);
Expense.belongsTo(User);
User.hasMany(Order);
Order.belongsTo(User);

sequelize
  // .sync({ force: true })
  .sync()
  .then((result) => {
    // console.log(result);
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
