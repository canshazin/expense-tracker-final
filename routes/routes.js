const express = require("express");

const controller = require("../controllers/controller.js");
const middlewares = require("../middlewares/auth.js");

const router = express.Router();

router.post("/user/signup", controller.signup);
router.post("/user/login", controller.login);
router.post("/password/forgotpassword", controller.forgot_password);
router.get("/password/resetpassword/:id", controller.reset_password);
router.post(
  "/password/resetpassword/updatepassword",
  controller.update_password
);
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
  "/premium/report/view/:date",
  middlewares.authenticate,
  controller.view_report
);

router.get(
  "/premium/download",
  middlewares.authenticate,
  controller.download_expenses
);

router.post(
  "/premium/download/history/save",
  middlewares.authenticate,
  controller.download_history_save
);

router.get(
  "/premium/download/history/get",
  middlewares.authenticate,
  controller.download_history_get
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
