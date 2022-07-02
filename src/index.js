// import express from "express";
// import Instagram from "instagram-web-api";
// import getDataFromSnkrsSite from "./snkrsSite.js";
// import * as cron from "node-cron";
// import Jimp from "jimp";
// import * as fs from 'fs';
// import imap from 'imap-simple';
// import _ from 'lodash';
// import * as mailparser from 'mailparser';
// import { config } from "./config.js";
// import { uploadPhotosToInstagram } from "./instagramClient.js";
// import axios from "axios";
// import * as cheerio from "cheerio";

const _ = require('lodash');
const config = require('./config');
const cron = require('node-cron');
const express = require('express');
const FileCookieStore = require('tough-cookie-filestore2');
const fs = require('fs');
const getDataFromSnkrsSite = require('./snkrsSite');
const imap = require('imap-simple');
const Instagram = require('../instagram-web-api/index');
const Jimp = require('jimp');
const simpleParser = require('mailparser').simpleParser;


const port = config.port || 3000;
const app = express();

const cookieStore = new FileCookieStore('./cookies.json');

const client = new Instagram({
    username: config.instagram_username,
    password: config.instagram_password,
    cookieStore: cookieStore
  }, {
    language: 'en-US',
    proxy: config.node_env === "PRODUCTION"? config.fixie_url : undefined
  });

const hashtags = '#sneakers #nike #snkrs #jordans #sneakerhead #india #kicks';


// https://crontab.guru/
// Daily 5:00 PM
// cron.schedule("30 12 * * *", async () => {
const instagramLoginFunction = async () => {

  try {
    console.log('[INFO] Logging in....');
    await client.login({
      username: config.instagram_username,
      password: config.instagram_password, 
    }, {
        _sharedData: false
    });
    console.log('[INFO] Logged in sucessfully!');
    await uploadPhotosToInstagram();
  } catch (err) {
    console.log(`[ERROR]: Login failed! :(`);

    if (err.status === '403') {
        console.log('[ERROR] too many attempts. Aborting upload mission');
        return;
    }

    console.log(err);

    // Instagram is asking for verification (2FA)
    if (err.error && err.error.message === "checkpoint_required") {
        const challengeUrl = err.error.checkpoint_url;

        // choice 0 - SMS/text and 1 - email
        await client.updateChallenge({challengeUrl, choice: 1});

        const emailConfig = {
            imap: {
                user: `${process.env.EMAIL_ID}`,
                password: `${process.env.EMAIL_PASSWORD}` ,
                host: "imap.gmail.com", // since its a gmail account
                port: 993, // IMAP over SSL/TLS (basically, encrypted email port)
                tls: true,
                tlsOptions: {
                    servername: 'imap.gmail.com', 
                    // true, the server certificate is verified against the list of supplied CAs
                    // false, you're saying "I don't care if I can't verify the server's identity."
                    // setting false is not good since you are vulnerable to MITM attacks.
                    // but here we have to since we are kind of doing mitm only lol. or else it won't work
                    rejectUnauthorized: 'false'
                },
                authTimeout: 30000 // 30 seconds
            }
        };

        imap.connect(emailConfig).then(async (connection) => {
            return connection.openBox("INBOX").then( async () => {
                const delay = 1 * 60 * 60 * 1000; // 1 hr in ms
                let lastHour = new Date();
                lastHour.setTime(Date.now() - delay); // Time 1hr ago
                lastHour = lastHour.toISOString(); 

                const searchCritera = ["ALL", "SINCE", lastHour]; // All mails in the past 1hr
                const fetchOptions = {
                    bodies: [""]
                };

                await connection.search(searchCritera, fetchOptions).then((messages) => {
                    messages.forEach((msg) => {
                        const all = _.find(msg.parts, { which: ""});
                        const id = msg.attributes.uid;
                        const idHeader = "Imap-Id: " + id + "\r\n"; // \r - cursor moves to start of the line

                        simpleParser(idHeader + all.body, async (err, mail) => {
                            if (err) {
                                console.log('[ERROR] error in mail parser');

                                console.log(mail.subject);

                                const answerCodeArr = mail.text
                                .split('\n')
                                .filter((item) => item && /^\S+$/.test(item) && !isNaN(item));
                                // Any item is truthy and not a whitespace and is not an isNaN

                                if(mail.text.toLowerCase().includes('instagram')) {
                                    if (answerCodeArr.length > 0) {
                                        const securityCode = answerCodeArr[0];
                                        console.log(securityCode);


                                        await client.updateChallenge({
                                            challengeUrl,
                                            securityCode
                                        });

                                        console.log(`[INFO] Sucessfully answered instagram challenge with security code ${securityCode}`);

                                        await client.login();
                                    
                                    }
                                }
                            }
                        })
                    })
                })
            })
        })
    }
  }
};

instagramLoginFunction();

// });

const uploadPhotosToInstagram = async () => {
    const data = await getDataFromSnkrsSite();
  
    const font = await Jimp.loadFont('./imagefont.fnt');

    console.log(`[INFO] uploading ${data.length} pictures`);
    data.forEach((item) => {
      Jimp.read(item.imgUrl)
        .then( (img) => {
          // Get the part in quotations as a unique string for image name.
          // https:/secure-images.nike.com/is/image/DotCom/"DC0774_114_A_PREM"?$SNKRS_COVER_WD$&align=0,1
          const uniqueString = item.imgUrl.split("?")[0].split("/");
          const imgName = uniqueString[uniqueString.length - 1];
          const date = item.releaseDateInIST.split(" ");
  
          return img
            .resize(800, 800, Jimp.RESIZE_NEAREST_NEIGHBOR)
            .quality(100)
            .print(font, 50, 50, item.name)
            .print(font, 50, 130, `${date[1]} ${date[2]} ${date[3]}`)
            .print(font, 50, 180, `${date[0]}, ${date[4]} ${date[5]}`)
            .write(`./${imgName}.jpg`, async () => {

                await client.uploadPhoto({
                  photo: `./${imgName}.jpg`,
                  caption: `${item.name} \n ${item.releaseDateInIST} \n ${hashtags}` ,
                  post: 'feed'
                })
                .then(({media}) => {
                  console.log(`[INFO] image uploaded. url: https://www.instagram.com/p/${media.code}`);
  
                  // Delete the downloaded images after upload is completed.
                  fs.unlinkSync(`${imgName}.jpg`)
                });
            });
        })
        .catch((err) => {
          console.log(`[ERROR]: ${err}`);
        });
    });
};


app.listen(port, () => {
    console.log(`[INFO]App listening on ${port}`);
})
