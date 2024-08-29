const User = require("../models/user.js");
const Expense = require("../models/expense.js");
const sequelize = require("../util/database.js");

exports.add_expense = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    let msg = "";
    const expense = req.body;

    const expense_added = await Expense.create(
      {
        date: expense.date,
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
    const items_per_page = parseInt(req.query.items_per_page, 10) || 5;
    const page = parseInt(req.query.page, 10) || 1;
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
