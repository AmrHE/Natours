/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51JzNbEEHQ8Eg7Thfud3LBcT1grrFDAzJQzwQbNiM613Kk3ZG2xUEZXdOnghEcpH3KA8URGmBWDkRCN9sSzGN5Pr600nt2wG53v'
);

export const bookTour = async (tourId) => {
  try {
    // 1) get the session from the server using /checkout-session/:tourId endpoint
    console.log(tourId);
    const session = await axios(
      `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}/`
    );
    console.log(session);
    // 2) Create checkout from + charge the card (process the payment)
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
