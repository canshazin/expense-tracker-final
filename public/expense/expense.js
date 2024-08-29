const url = "http://localhost:3000";
console.log("start of expense script");
const warning = document.querySelector("#warning");
const pagination = document.querySelector("#pagination");

// axios.defaults.headers.common["Authorization"] = localStorage.getItem("token"); for all request in this  to  have authorization header
document
  .querySelector("#add_expense_form")
  .addEventListener("submit", function (event) {
    add_expense(event);
  });

document
  .querySelector("#download_btn")
  .addEventListener("click", function (event) {
    download_expenses(event);
  });

document
  .querySelector("#leaderboard_btn")
  .addEventListener("click", function (event) {
    show_leaderboard(event);
  });

document
  .querySelector("#premium_btn")
  .addEventListener("click", function (event) {
    buy_premium(event);
  });

async function add_expense(e) {
  try {
    e.preventDefault();

    const expense_data = {
      date: new Date(),
      amount: e.target.amount.value,
      category: e.target.category.value,
      description: e.target.description.value,
    };
    const response = await axios.post(
      `${url}/expense/addexpense`,
      expense_data,
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );
    const id = response.data.id;
    e.target.reset();
    add_to_ui(expense_data, id);
  } catch (err) {
    console.log(err);
  }
}

function add_to_ui(expense_data, id) {
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
}

function add_to_ui_leaderboard(expense_data, rank) {
  const table = document.querySelector("#leaderboard_list");

  const newRow = table.insertRow(-1);
  newRow.insertCell(0).textContent = rank;
  newRow.insertCell(1).textContent = expense_data.uname;
  newRow.insertCell(2).textContent = expense_data.total_expense;
}

function add_to_ui_download(data) {
  const table = document.querySelector("#download_list");
  // document.querySelector("#download_list_heading").style.visibility = "visible";
  // table.style.visibility = "visible";

  const date = new Date(data.date);
  const offset = 5.5;
  const india_date = new Date(date.getTime() + offset * 60 * 60 * 1000);

  const newRow = table.insertRow(0);
  newRow.insertCell(0).textContent = india_date.toISOString();
  newRow.insertCell(1).textContent = data.url;
}

function show_pagination(data) {
  const current_page = data.current_page;
  const has_next_page = data.has_next_page;
  const has_previous_page = data.has_previous_page;
  const next_page = data.next_page;
  const previous_page = data.previous_page;

  document.querySelector("#pagination").innerHTML = "";
  if (has_previous_page) {
    const btn1 = document.createElement("button");
    btn1.innerHTML = previous_page;
    btn1.addEventListener("click", () => get_expenses(previous_page));
    pagination.appendChild(btn1);
  }
  const btn2 = document.createElement("button");
  btn2.innerHTML = `<h3>${current_page}</h3>`;
  btn2.addEventListener("click", () => get_expenses(current_page));
  pagination.appendChild(btn2);
  if (has_next_page) {
    const btn3 = document.createElement("button");
    btn3.innerHTML = next_page;
    btn3.addEventListener("click", () => get_expenses(next_page));
    pagination.appendChild(btn3);
  }
}

async function get_expenses(page_no) {
  try {
    const page = page_no;
    const page_limit = parseInt(localStorage.getItem("page_limit"), 10);

    const expenses = await axios.get(
      `${url}/expense/getexpenses?page=${page}&items_per_page=${page_limit}`,
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );

    document.querySelector("#expense_list").innerHTML = `<thead>
      <tr>
        <th>Date</th>
        <th>Expense</th>
        <th>Category</th>
        <th>Description</th>
        <th></th>
      </tr>
    </thead>`;

    expenses.data.expenses.forEach((expense) => {
      add_to_ui(expense, expense.id);
    });
    show_pagination(expenses.data);
  } catch (err) {
    console.log(err);
    alert("Something went wrong");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const page = 1;

    let page_limit = parseInt(localStorage.getItem("page_limit"), 10) || 5;
    localStorage.setItem("page_limit", page_limit);

    document.querySelector("#page_limit").value = page_limit;

    document
      .querySelector("#page_limit")
      .addEventListener("change", function () {
        page_limit = parseInt(this.value, 10);
        localStorage.setItem("page_limit", page_limit); // Update local storage
        get_expenses(page); // Fetch expenses with updated page_limit
      });

    const expenses = await axios.get(
      `${url}/expense/getexpenses?page=${page}&items_per_page=${page_limit}`,
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );

    if (expenses.data.prime) {
      document.querySelector("#premium_btn").style.visibility = "hidden";
      document.querySelector("#prime_div").innerHTML = "You are a prime user";
      document.querySelector("#leaderboard_btn").style.visibility = "visible";
      document.querySelector("#download_btn").style.visibility = "visible";
      document.querySelector("#view_report_btn").style.visibility = "visible";
    }

    expenses.data.expenses.forEach((expense) => {
      add_to_ui(expense, expense.id);
    });

    show_pagination(expenses.data);

    // Fetch download history
    const downloads = await axios.get(`${url}/premium/download/history/get`, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });

    if (downloads.data.prime && downloads.data.data.length != 0) {
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
    document.querySelector("#paypal_button_container").innerHTML = "";
    let paymentStatus = "pending";

    const response = await axios.get(`${url}/purchase/premium-membership`, {
      headers: { Authorization: localStorage.getItem("token") },
    });
    const order_id = response.data.id;
    async function set_up_paypal_button() {
      return new Promise((resolve, reject) => {
        paypal
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
                resolve();
              } catch (err) {
                paymentStatus = "error";
                reject(err);
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
                resolve();
              } catch (err) {
                paymentStatus = "error";
                reject(err);
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
                reject(err);
              } catch (err) {
                paymentStatus = "error";
                reject(err);
              }
            },
          })
          .render("#paypal_button_container")
          .catch((err) => {
            paymentStatus = "error";
            reject(err);
          });
      });
    }

    async function handlePayPalTransaction() {
      try {
        await set_up_paypal_button();
        checkPaymentStatus();
      } catch (err) {
        console.error("Error in PayPal transaction:", err);
        paymentStatus = "error";
        console.log(paymentStatus);
        checkPaymentStatus();
      }
    }

    handlePayPalTransaction();

    function checkPaymentStatus() {
      if (paymentStatus === "success") {
        document.querySelector("#paypal_button_container").innerHTML = "";
        alert("Transaction successful! Thank you for your purchase.");
        document.querySelector("#premium_btn").style.visibility = "hidden";
        document.querySelector("#prime_div").innerHTML = "You are a prime user";
        document.querySelector("#leaderboard_btn").style.visibility = "visible";
        document.querySelector("#download_btn").style.visibility = "visible";
        document.querySelector("#view_report_btn").style.visibility = "visible";
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
      a.download = "myExpense.txt";
      a.click();

      const table = document.querySelector("#download_list");
      table.style.visibility = "visible";
      document.querySelector("#download_list_heading").style.visibility =
        "visible";
      add_to_ui_download(file.data);
    }
  } catch (err) {
    console.log(err);
    alert(err.message);
  }
}
