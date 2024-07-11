const url = "http://localhost:3000";
console.log("start of expense script");
const warning = document.querySelector("#warning");

// axios.defaults.headers.common["Authorization"] = localStorage.getItem("token"); for all request in this  to  have authorization header

async function add_expense(e) {
  try {
    e.preventDefault();
    console.log(e);
    const expense_data = {
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
    e.target.amount.value = "";
    e.target.category.value = "";
    e.target.description.value = "";
    add_to_ui(expense_data, id);
  } catch (err) {
    console.log(err);
  }
}
function add_to_ui(expense_data, id) {
  console.log(expense_data, "hiiiiiii", id);
  const ul = document.querySelector("#expense_list");
  ul.innerHTML += `<li >amount:${expense_data.amount} --- category: ${expense_data.category} --- description: ${expense_data.description}   <button onclick="delete_expense(event,${id})">delete</button></li>`;
}
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const expenses = await axios.get(`${url}/expense/getexpenses`, {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    });
    expenses.data.forEach((expense) => {
      add_to_ui(expense, expense.id);
    });
  } catch (err) {
    console.log(err);
  }
});

async function delete_expense(e, id) {
  try {
    e.preventDefault();
    console.log(e.target.parentElement);
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
    e.target.parentElement.remove();
  } catch (err) {
    console.log(err);
  }
}

async function buy_premium(e) {
  try {
    e.preventDefault();
    const paypal_div = document.querySelector("#paypal_button_container");
    paypal_div.innerHTML = "";

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
            console.log(response.data);

            setTimeout(() => {
              alert("Transaction successful ");
            }, 1000);
          } catch (err) {
            console.error("Error in onApprove:", err);
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

            alert("Transaction cancelled.");
          } catch (err) {
            console.error("Error in onCancel:", err);

            alert(
              "An error occurred during the transaction. Please try again."
            );
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

            alert(
              "An error occurred during the transaction. Please try again."
            );
          } catch (Err) {
            console.error(Err);

            alert("An unexpected error occurred. Please try again later.");
          }
        },
      })
      .render("#paypal_button_container");
  } catch (err) {
    console.error("Error in buy_premium:", err);
    alert("An error occurred while setting up the payment. Please try again.");
  }
}
