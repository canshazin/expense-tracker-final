console.log("start of reset password script");
const url = "http://localhost:3000";

const reset_password_form = document.querySelector("#reset_password");

const user_email = document.querySelector("#user_email");
const user_password = document.querySelector("#user_password");
const warning = document.querySelector("#warning");
reset_password_form.addEventListener("submit", async (event) => {
  try {
    event.preventDefault();
    warning.innerHTML = "";
    const user = {
      email: user_email.value,
      password: user_password.value,
    };
    const result = await axios.post(
      `${url}/password/resetpassword/updatepassword`,
      user
    );
    console.log(result.data);
    if (result.data.success == false) {
      warning.innerHTML += result.data.msg;
    } else {
      alert("Password updated successfully");
      window.location.href = `${url}/login/login.html`;
    }
  } catch (err) {
    console.log(err);
  }
});
