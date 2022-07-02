// import * as dotenv from "dotenv";
const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: parseInt(`${process.env.PORT}`),
  node_env: `${process.env.NODE_ENV}`,
  fixie_url: `${process.env.FIXIE_URL}`,
  instagram_username: `${process.env.INSTAGRAM_USERNAME}`,
  instagram_password: `${process.env.INSTAGRAM_PASSWORD}`,
  emailConfig: {
    imap: {
      user: `${process.env.EMAIL_ID}`,
      password: `${process.env.EMAIL_PASSWORD}`,
      host: "imap.gmail.com", // since its a gmail account
      port: 993, // IMAP over SSL/TLS (basically, encrypted email port)
      tls: true,
      tlsOptions: {
        servername: "imap.gmail.com",
        // true, the server certificate is verified against the list of supplied CAs
        // false, you're saying "I don't care if I can't verify the server's identity."
        // setting false is not good since you are vulnerable to MITM attacks.
        // but here we have to since we are kind of doing mitm only lol. or else it won't work
        rejectUnauthorized: "false",
      },
      authTimeout: 30000, // 30 seconds
    },
  },
};

module.exports = config;
