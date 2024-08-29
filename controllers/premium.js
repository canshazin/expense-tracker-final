const User = require("../models/user.js");
const Expense = require("../models/expense.js");
const Download = require("../models/download.js");
const { Op, Sequelize } = require("sequelize");
const { literal } = require("sequelize");
const AWS = require("aws-sdk");

exports.leaderboard = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ["uname", "total_expense"],
    });
    const sorted_users = users.sort((a, b) => {
      return b.total_expense - a.total_expense;
    });
    res.json(sorted_users);
  } catch (error) {
    console.error("Error in leaderboard:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the leaderboard" });
  }
};

exports.view_report = async (req, res, next) => {
  const date = new Date(req.params.date);
  const year = date.getFullYear();
  if (req.user.isPrime == false) {
    return res.status(401).json("not a prime user");
  } else {
    const expenses = await Expense.findAll({
      attributes: ["date", "amount", "description", "category"],
      where: {
        userId: req.user.id,
        [Op.and]: [
          Sequelize.where(Sequelize.fn("YEAR", Sequelize.col("date")), year),
        ],
      },
    });

    res.json(expenses);
  }
};

function format_expense(expenses) {
  //all keys or headings
  const headers = Object.keys(expenses[0]);

  //all headers length in list
  const header_lengths = headers.map((header) => header.length);

  //all values length in list
  const values_length = [];
  expenses.forEach((expense) => {
    headers.forEach((header) => {
      values_length.push(expense[header].toString().length);
    });
  });

  //finding max length for better visual
  const max_len = Math.max(...values_length, ...header_lengths);

  //making headers into single string separated by | => "abc | efg "
  let formatted_headers = "";

  headers.forEach((header) => {
    const padded_header = header.padEnd(max_len, " ") + "|  ";
    formatted_headers += padded_header;
  });

  //formating values of each object,concatenateit and add it to list
  const data = [];
  expenses.forEach((expense) => {
    let padded_object_values = "";
    headers.forEach((header) => {
      const padded_value =
        expense[header].toString().padEnd(max_len, " ") + "|  ";

      padded_object_values += padded_value;
    });
    data.push(padded_object_values);
  });

  //for heading separation from other rows
  const line = "-".repeat(formatted_headers.length);
  const result = [formatted_headers, line, ...data].join("\n");
  return result;
}

async function upload_tp_s3(data, file_name) {
  try {
    const BUCKET_NAME = process.env.BUCKET_NAME;
    const IAM_USER_ID = process.env.IAM_USER_ID;
    const IAM_USER_KEY = process.env.IAM_USER_KEY;

    const s3 = new AWS.S3({
      accessKeyId: IAM_USER_ID,
      secretAccessKey: IAM_USER_KEY,
    });

    const params = {
      Bucket: BUCKET_NAME,
      Key: file_name,
      Body: data,
      ACL: "public-read",
    };

    const result = await s3.upload(params).promise();
    console.log("Upload success:", result);
    return result.Location;
  } catch (err) {
    console.error("Error uploading to S3:", err);
    throw err;
  }
}

exports.download_expenses = async (req, res, next) => {
  try {
    // Fetch expenses for the current user
    const expenses = await Expense.findAll({
      where: { userId: req.user.id },
      attributes: [
        [literal("DATE(date)"), "date"],
        "amount",
        "description",
        "category",
      ],
    });

    // Handle case where no expenses are found
    if (expenses.length <= 0) {
      return res.status(404).json({ msg: "Data not found" });
    }
    const expenseData = expenses.map((expense) => expense.toJSON());
    const formatted_expense = format_expense(expenseData);
    const stringified_expenses = formatted_expense;

    const file_date = new Date();
    const file_name = `expenses_${req.user.id}/${file_date}.txt`;

    const file_url = await upload_tp_s3(stringified_expenses, file_name);

    if (!file_url) {
      throw new Error("URL doesn't exist");
    }

    // Respond with the file url
    res.status(200).json({ file_url, file_date });
  } catch (err) {
    console.error("Error in download_expenses:", err);
    res.status(500).send("Something went wrong");
  }
};

exports.download_history_save = async (req, res, next) => {
  try {
    const file = req.body;
    const data = await Download.create({
      date: file.date,
      url: file.url,
      userId: req.user.id,
    });
    res.json({ date: data.date, url: data.url });
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.download_history_get = async (req, res, next) => {
  try {
    if (req.user.isPrime == true) {
      const downloads = await Download.findAll({
        where: { userId: req.user.id },
      });

      res.json({ data: downloads, prime: true });
    } else {
      res.json({ prime: false });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "error" });
  }
};
