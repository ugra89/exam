const form = document.getElementById('register-form');

const API_BASE = 'http://localhost:8080';

const onRegisterUser = async (payload) => {
  try {
    const response = await fetch('./register.html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (err) {
    console.log(err);
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const fullNameInput = event.target.full_name;
  const emailInput = event.target.email;
  const passwordInput = event.target.password;
  const password2Input = event.target.password2;

  if (
    !fullNameInput.value ||
    !emailInput.value ||
    !passwordInput.value ||
    !password2Input.value
  ) {
    alert('Please fill in all fields');
    return;
  }

  if (passwordInput.value !== password2Input.value) {
    alert('Passwords do not match');
    return;
  }

  const payload = {
    full_name: fullNameInput.value,
    email: emailInput.value,
    password: passwordInput.value,
  };

  const userData = await onRegisterUser(payload);
  console.log(userData);
  if (userData.token) {
    Cookies.set('token', userData.token);
    window.location.href = './login.html';
  } else {
    alert('Registration failed. Please try again.');
  }
});
