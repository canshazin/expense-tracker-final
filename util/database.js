const Sequelize = require("sequelize");

const sequelize = new Sequelize("expense", "root", "tryandhack", {
  dialect: "mysql",
  host: "localhost",
});

module.exports = sequelize;
