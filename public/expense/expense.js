const url = "http://localhost:3000";
console.log("start of expense script");
const warning = document.querySelector("#warning");

// axios.defaults.headers.common["Authorization"] = localStorage.getItem("token"); for all request in this  to  have authorization header

async function add_expense(e) {
  try {
    e.preventDefault();
    console.log(e);
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    const expense_data = {
      date: formattedDate,
      amount: e.target.amount.value,
      category: e.target.category.value,
      description: e.target.description.value,
    };
    console.log(expense_data);
    const response = await axios.post(
      `${url}/expense/addexpense`,
      expense_data,
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );
    console.log(response);
    const id = response.data.id;
    console.log(response.data.msg, id);
    // e.target.amount.value = "";
    // e.target.category.value = "";
    // e.target.description.value = "";
    e.target.reset();
    add_to_ui(expense_data, id);
  } catch (err) {
    console.log(err);
  }
}

// let lastDate = ""; // Global variable to keep track of the last date

function add_to_ui(expense_data, id) {
  console.log(expense_data, "hiiiiiii", id);
  const table = document.querySelector("#expense_list");

  const date = new Date(expense_data.date);
  console.log("date", date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  const newRow = table.insertRow(-1);
  newRow.insertCell(0).textContent = formattedDate;
  newRow.insertCell(1).textContent = expense_data.amount;
  newRow.insertCell(2).textContent = expense_data.category;
  newRow.insertCell(3).textContent = expense_data.description;
  newRow.insertCell(
    4
  ).innerHTML = `<button onclick="delete_expense(event,${id})">delete</button>`;

  // ul.innerHTML += `<li >Name:  ${expense_data.uname} ------------- Total Expense: ${expense_data.total_expense} `;
}

function add_to_ui_leaderboard(expense_data, rank) {
  const table = document.querySelector("#leaderboard_list");
  table.style.visibility = "visible";
  const newRow = table.insertRow(-1);
  newRow.insertCell(0).textContent = rank;
  newRow.insertCell(1).textContent = expense_data.uname;
  newRow.insertCell(2).textContent = expense_data.total_expense;

  // ul.innerHTML += `<li >Name:  ${expense_data.uname} ------------- Total Expense: ${expense_data.total_expense} `;
}

function add_to_ui_download(data) {
  const table = document.querySelector("#download_list");
  document.querySelector("#download_list_heading").style.visibility = "visible";
  table.style.visibility = "visible";

  const date = new Date(data.date);
  const offset = 5.5;
  const india_date = new Date(date.getTime() + offset * 60 * 60 * 1000);

  console.log(india_date.toISOString());
  const newRow = table.insertRow(0);

  newRow.insertCell(0).textContent = india_date.toISOString();
  newRow.insertCell(1).textContent = data.url;
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const expenses = await axios.get(`${url}/expense/getexpenses`, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });
    console.log(expenses);
    if (expenses.data.prime == true) {
      document.querySelector("#premium_btn").style.visibility = "hidden";
      document.querySelector("#prime_div").innerHTML = "You are a prime user";
      document.querySelector("#leaderboard_btn").style.visibility = "visible";
      document.querySelector("#download_btn").style.visibility = "visible";
      document.querySelector("#view_report_btn").style.visibility = "visible";
    }
    expenses.data.expenses.forEach((expense) => {
      add_to_ui(expense, expense.id);
    });

    //for download history
    const downloads = await axios.get(`${url}/premium/download/history/get`, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });
    console.log(downloads);
    if (downloads.data.prime == true && downloads.data.data.length != 0) {
      document.querySelector("#download_list").style.visibility = "visible";
      document.querySelector("#download_list_heading").style.visibility =
        "visible";
      downloads.data.data.forEach((data) => {
        add_to_ui_download(data);
      });
    }
  } catch (err) {
    console.log(err);
  }
});

async function delete_expense(e, id) {
  try {
    e.preventDefault();
    console.log(e.target.parentElement.parentElement);
    const deleted_expense = await axios.get(
      `${url}/expense/deleteexpense/${id}`,
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );
    if (deleted_expense.data.success === true) {
      console.log("deleted successfully");
    }
    e.target.parentElement.parentElement.remove();
  } catch (err) {
    console.log(err);
  }
}

async function buy_premium(e) {
  try {
    e.preventDefault();
    // const paypal_div = document.querySelector("#paypal_button_container");
    // paypal_div.innerHTML = "";
    let paymentStatus = "pending";

    const response = await axios.get(`${url}/purchase/premium-membership`, {
      headers: { Authorization: localStorage.getItem("token") },
    });
    const order_id = response.data.id;

    await paypal
      .Buttons({
        createOrder: async function () {
          return order_id;
        },
        onApprove: async function (data, actions) {
          console.log("Subscription approved:", data);
          try {
            const details = await actions.order.capture();
            console.log(details);
            const response = await axios.post(
              `${url}/purchase/premium-membership/update`,
              { flag: 1, payment_id: details.id, order_id: order_id },
              {
                headers: { Authorization: localStorage.getItem("token") },
              }
            );
            console.log(response.data.msg);
            localStorage.setItem("token", response.data.token);
            paymentStatus = "success";
            setTimeout(() => {
              checkPaymentStatus();
            }, 1000);
            // Check status after approval
          } catch (err) {
            console.error("Error in onApprove:", err);
            paymentStatus = "error";
            checkPaymentStatus(); // Check status after error
          }
        },
        onCancel: async function (data) {
          console.log("Subscription cancelled:", data);
          try {
            const response = await axios.post(
              `${url}/purchase/premium-membership/update`,
              { flag: 2, payment_id: data.orderID, order_id: order_id },
              {
                headers: { Authorization: localStorage.getItem("token") },
              }
            );
            paymentStatus = "cancelled";
            checkPaymentStatus(); // Check status after cancellation
          } catch (err) {
            console.error("Error in onCancel:", err);
            paymentStatus = "error";
            checkPaymentStatus(); // Check status after error
          }
        },
        onError: async function (err) {
          console.log("Subscription error:", err);
          try {
            const response = await axios.post(
              `${url}/purchase/premium-membership/update`,
              { flag: 3, payment_id: order_id, order_id: order_id },
              {
                headers: { Authorization: localStorage.getItem("token") },
              }
            );
            console.log(response.data);
            paymentStatus = "error";
            checkPaymentStatus(); // Check status after error
          } catch (Err) {
            console.error(Err);
            paymentStatus = "error";
            checkPaymentStatus(); // Check status after error
          }
        },
      })
      .render("#paypal_button_container");

    function checkPaymentStatus() {
      if (paymentStatus === "success") {
        document.querySelector("#paypal_button_container").innerHTML = "";
        alert("Transaction successful! Thank you for your purchase.");
        document.querySelector("#premium_btn").style.visibility = "hidden";
        document.querySelector("#prime_div").innerHTML = "You are a prime user";
        document.querySelector("#leaderboard_btn").style.visibility = "visible";
        document.querySelector("#download_btn").style.visibility = "visible";
        document.querySelector("#view_report_btn").style.visibility = "visible";
        // document.querySelector("#leaderboard_heading").style.visibility ="visible";
      } else if (paymentStatus === "cancelled") {
        alert("Transaction cancelled.");
      } else if (paymentStatus === "error") {
        alert("An error occurred during the transaction. Please try again.");
      }
    }
  } catch (err) {
    console.error("Error in buy_premium:", err);
    alert("An error occurred while setting up the payment. Please try again.");
  }
}
async function show_leaderboard(e) {
  try {
    e.preventDefault();
    document
      .querySelector("#leaderboard_list")
      .scrollIntoView({ behavior: "smooth" });
    document.querySelector("#leaderboard_heading").style.visibility = "visible";
    document.querySelector("#leaderboard_list").style.visibility = "visible";

    document.querySelector("#leaderboard_list").innerHTML = `<thead>
        <tr>
          <th>Rank</th>
          <th>Name</th>
          <th>Expense</th>
        </tr>
      </thead>`;
    const response = await axios.get(
      `${url}/premium/leaderboard`,

      {
        headers: { Authorization: localStorage.getItem("token") },
      }
    );
    console.log(response.data);
    let rank = 1;
    response.data.forEach((expense) => {
      add_to_ui_leaderboard(expense, rank);
      rank += 1;
    });
  } catch (err) {
    console.log(err);
  }
}

async function download_expenses(e) {
  e.preventDefault();
  try {
    const response = await axios.get(`${url}/premium/download`, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });
    console.log(response);
    if (response.status == 200) {
      var a = document.createElement("a");
      a.href = response.data.file_url;
      const file = await axios.post(
        `${url}/premium/download/history/save`,
        { date: response.data.file_date, url: response.data.file_url },
        {
          headers: {
            Authorization: localStorage.getItem("token"),
          },
        }
      );
      console.log(file.data);
      a.download = "myExpense.txt";
      a.click();
      const table = document.querySelector("#download_list");
      table.style.visibility = "visible";
      document.querySelector("#download_list_heading").style.visibility =
        "visible";

      const date = new Date(file.data.date);
      const offset = 5.5;
      const india_date = new Date(date.getTime() + offset * 60 * 60 * 1000);

      console.log(india_date.toISOString());
      const newRow = table.insertRow(0);

      newRow.insertCell(0).textContent = india_date.toISOString();
      newRow.insertCell(1).textContent = file.data.url;
    }
  } catch (err) {
    console.log(err);
    alert(err.message);
  }
}
