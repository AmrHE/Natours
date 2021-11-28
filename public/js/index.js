/* eslint-disable */

import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { signup } from './signup';
import { updatesSettings } from './updateSettings';
import { bookTour } from './stripe';
import { showAlert } from './alerts';

//DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.login--form');
const signupForm = document.querySelector('.signup--form');
const logoutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');
// const bookBtn = document.querySelector('#book-tour');

if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    signup(name, email, password, passwordConfirm);
  });
}

if (logoutBtn) logoutBtn.addEventListener('click', logout);

if (userDataForm) {
  userDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    await updatesSettings(form, 'data');
    window.location.reload();
  });
}

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-passowrd').textContent = 'Updating...';

    const currentPassword = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    await updatesSettings(
      { currentPassword, password, passwordConfirm },
      'password'
    );

    document.querySelector('.btn--save-passowrd').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...';
    // const tourId = e.targer.dataset.tourId;

    const tourId = e.target.dataset.tourId;

    bookTour(tourId);
  });
}

const alertMessage = document.querySelector('body').dataset.alert;
if (alertMessage) showAlert('success', alertMessage, 20);
