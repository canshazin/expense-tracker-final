const express = require("express");

const controller = require("../controllers/controller.js");
const middlewares = require("../middlewares/auth.js");

const router = express.Router();

router.post("/user/signup", controller.signup);
router.post("/user/login", controller.login);
router.post(
  "/expense/addexpense",
  middlewares.authenticate,
  controller.add_expense
);
router.get(
  "/expense/getexpenses",
  middlewares.authenticate,
  controller.get_expenses
);
router.get(
  "/premium/leaderboard",
  middlewares.authenticate,
  controller.leaderboard
);
router.get(
  "/expense/deleteexpense/:id",
  middlewares.authenticate,
  controller.delete_expense
);
router.get(
  "/purchase/premium-membership",
  middlewares.authenticate,
  controller.purchase_premium
);

router.post(
  "/purchase/premium-membership/update",
  middlewares.authenticate,
  controller.update
);

router.get("/", controller.HomePage);
router.use("/", controller.pageNotFound);

module.exports = router;
