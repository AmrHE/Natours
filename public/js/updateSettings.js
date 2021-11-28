/* eslint-disable */
import axios from 'axios';

import { showAlert } from './alerts';

//type: String: 'password' || 'data'
//data: object: object contains the updated data
export const updatesSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? 'http://localhost:3000/api/v1/users/updateMyPassword'
        : 'http://localhost:3000/api/v1/users/updateMe';

    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} Updated Successfully`);
    }
    console.log(res);
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
