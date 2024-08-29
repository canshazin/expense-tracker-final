const url = "http://localhost:3000";
console.log("start of report script");

// axios.defaults.headers.common["Authorization"] = localStorage.getItem("token"); for all request in this  to  have authorization header

document
  .querySelector("#view_report_btn")
  .addEventListener("click", (event) => {
    view_report(event);
  });
async function view_report(e) {
  e.preventDefault();
  try {
    const date_input = document.querySelector("#report_date");
    let date_input_value = date_input.value;
    if (!date_input_value) {
      date_input_value = new Date();
    }
    const response = await axios.get(
      `${url}/premium/report/view/${date_input_value}`,
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );

    document.querySelector("#expenses_list").style.visibility = "visible";

    document.querySelector("#daily").innerHTML = `<thead>
    <tr>
      <th>Date</th>
      <th>Expense</th>
      <th>Category</th>
      <th>Description</th>
    </tr>
  </thead>`;
    document.querySelector("#monthly").innerHTML = `<thead>
          <tr>
            <th>Date</th>
            <th>Expense</th>
            <th>Category</th>
            <th>Description</th>
          </tr>
        </thead>`;

    document.querySelector("#yearly").innerHTML = `<thead>
          <tr>
            <th>Month</th>
            <th>Expense</th>
 
          </tr>
        </thead>`;

    const date = new Date(date_input_value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    const all_expenses = response.data;
    const monthly = [];
    const daily = [];
    let daily_sum = 0;
    let monthly_sum = 0;

    let monthly_sum_dictionary = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      12: 0,
    };

    let monthDictionary = {
      1: "January",
      2: "February",
      3: "March",
      4: "April",
      5: "May",
      6: "June",
      7: "July",
      8: "August",
      9: "September",
      10: "October",
      11: "November",
      12: "December",
    };
    let year_sum = 0;
    console.log(monthly_sum_dictionary);
    for (let i = 0; i < all_expenses.length; i++) {
      const current_date = new Date(all_expenses[i].date);
      const current_year = current_date.getFullYear();
      const current_month = String(current_date.getMonth() + 1).padStart(
        2,
        "0"
      );
      const current_day = String(current_date.getDate()).padStart(2, "0");
      const current_formattedDate = `${current_year}-${current_month}-${current_day}`;

      if (current_formattedDate == formattedDate) {
        all_expenses[i].date = current_formattedDate;
        daily.push(all_expenses[i]);
        daily_sum += all_expenses[i].amount;
      }
      if (current_month == month) {
        all_expenses[i].date = current_formattedDate;
        monthly.push(all_expenses[i]);
        monthly_sum += all_expenses[i].amount;
      }

      //this condition added since key 0 gets added to monthly sum dictionary without this condition
      console.log(monthly_sum_dictionary);
      monthly_sum_dictionary[BigInt(current_month)] += all_expenses[i].amount;
      year_sum += all_expenses[i].amount;
    }

    for (let data of daily) {
      add_daily_ui(data);
    }
    const table = document.querySelector("#daily");
    const newRow = table.insertRow(-1);
    const totalCell = newRow.insertCell(0);
    totalCell.colSpan = 4;
    totalCell.style.textAlign = "right";
    totalCell.style.fontWeight = "bold";
    totalCell.textContent = `Total Expense: Rs ${daily_sum}`;

    for (let data of monthly) {
      add_monthly_ui(data);
    }

    const table2 = document.querySelector("#monthly");
    const newRow2 = table2.insertRow(-1);
    const totalCell2 = newRow2.insertCell(0);
    totalCell2.colSpan = 4;
    totalCell2.style.textAlign = "right";
    totalCell2.style.fontWeight = "bold";
    totalCell2.textContent = `Total Expense: Rs ${monthly_sum}`;
    console.log(monthly_sum_dictionary);
    for (const [key, value] of Object.entries(monthly_sum_dictionary)) {
      const obj = {
        month: monthDictionary[key],
        sum: monthly_sum_dictionary[key],
      };
      add_yearly_ui(obj);
    }
    const table3 = document.querySelector("#yearly");
    const newRow3 = table3.insertRow(-1);
    const totalCell3 = newRow3.insertCell(0);
    totalCell3.colSpan = 2;
    totalCell3.style.textAlign = "right";
    totalCell3.style.fontWeight = "bold";
    totalCell3.textContent = `Total Expense: Rs ${year_sum}`;
  } catch (err) {
    console.log(err);
    if (err.response.status == 401) {
      alert("unauthorized action");
    } else {
      alert("smthing went wrong");
    }
  }
}

function add_daily_ui(data) {
  const table = document.querySelector("#daily");

  const newRow = table.insertRow(-1);
  newRow.insertCell(0).textContent = data.date;
  newRow.insertCell(1).textContent = data.amount;
  newRow.insertCell(2).textContent = data.category;
  newRow.insertCell(3).textContent = data.description;
}

function add_monthly_ui(data) {
  const table = document.querySelector("#monthly");

  const newRow = table.insertRow(-1);
  newRow.insertCell(0).textContent = data.date;
  newRow.insertCell(1).textContent = data.amount;
  newRow.insertCell(2).textContent = data.category;
  newRow.insertCell(3).textContent = data.description;
}
function add_yearly_ui(data) {
  const table = document.querySelector("#yearly");

  const newRow = table.insertRow(-1);
  newRow.insertCell(0).textContent = data.month;
  newRow.insertCell(1).textContent = data.sum;
}
