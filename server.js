const mongoose = require('mongoose');
const dotenv = require('dotenv');

//Global "Uncaught Exception" Handler //This handler should be at the top of our code
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 🔥 Shutting Down...');
  console.log('Name🔥: ', err.name, 'Message🔥: ', err.message);

  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

//Replace the <PASSWORD> in the connection string with the real DATABASE_PASSWORD
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

//Connect to our hosted DATABASE
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('DB Connected Successfully'));

//1. Start the server
const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`app running on port ${port}`);
});

//Global "Unhandled Promise Rejection" Handler
process.on('unhandledRejection', (err) => {
  console.log('Name🔥: ', err.name, 'Message🔥: ', err.message);
  console.log('UNHANDELED REJECTION! 🔥 Shutting Down...');

  server.close(() => {
    process.exit(1);
  });
});
