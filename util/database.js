// const Sequelize = require("sequelize");

// const sequelize = new Sequelize("expense", "root", "tryandhack", {
//   dialect: "mysql",
//   host: "localhost",
// });

// module.exports = sequelize;
const Sequelize = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER_NAME,
  process.env.DB_PASSWORD,
  {
    dialect: "mysql",
    host: process.env.DB_HOST,
  }
);

module.exports = sequelize;
