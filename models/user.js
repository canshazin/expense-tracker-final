const Sequelize = require("sequelize");

const sequelize = require("../util/database");

const User = sequelize.define("user", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },

  uname: {
    type: Sequelize.STRING,
    allowNull: false,
  },

  email: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false,
    set(value) {
      this.setDataValue("email", value.toLowerCase());
    },
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  isPrime: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
  },
  total_expense: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
});

module.exports = User;
