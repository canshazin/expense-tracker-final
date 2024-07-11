const Sequelize = require("sequelize");

const sequelize = require("../util/database");

const Order = sequelize.define("order", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },

  order_id: {
    type: Sequelize.STRING,
    allowNull: false,
  },

  payment_id: {
    type: Sequelize.STRING,

    allowNull: true,
  },
  status: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

module.exports = Order;
