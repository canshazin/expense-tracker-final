const Sequelize = require("sequelize");
const sequelize = require("../util/database");
const { DataTypes } = require("sequelize");

const Password_Request = sequelize.define("password_request", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  isActive: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
  },
});

module.exports = Password_Request;
