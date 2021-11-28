const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

//EXAMPLE
//The Idea is when we want to send a new email, we use this email class like belove
//new Email(user, url).sendWelcome(); //for welocme email for example
//new Email(user, url).passwordReset(); //for passwordReset email for example

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    // this.lastName = user.name.split(' ')[1];
    this.url = url;
    this.from = `Amr Hassan <${process.env.EMAIL_FROM}>`;
  }

  //1) Create a transporter //Transporter is a service that we use to send the actual email (e.g. Gmail)
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //Sendgrid transporter
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      // logger: true,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  //send the actual email
  async send(template, subject) {
    //1) Render HTML for the Email based on Pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      lastName: this.lastName,
      url: this.url,
      subject: this.subject,
    });

    //2) Define the email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    // 3) Create a transport and send email

    // 4) Send the email with Nodemailer
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};
