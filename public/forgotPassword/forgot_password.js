console.log("start of password forgot script");
const url = "http://localhost:3000";

// const forgot_password_form = document.querySelector("#forgot_password");

// const user_email = document.querySelector("#user_email");

async function forgot_password(e) {
  try {
    e.preventDefault();
    const user_email = e.target.user_email.value;
    const result = await axios.post(`${url}/password/forgotpassword`, {
      user_email,
    });
    if (result.data.success == true) {
      alert("Mail sent to user email");
    }
    console.log(result.data);
  } catch (err) {
    console.log(err);
    if (err.response.status == 404) {
      alert("Not an existing User");
    }
  }
}
