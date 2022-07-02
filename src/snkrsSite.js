// import axios from "axios";
// import * as cheerio from "cheerio";

const axios = require('axios');
const cheerio = require('cheerio');

const getDataFromSnkrsSite = async () => {
  // await axios.get("https://www.nike.com/launch?s=upcoming") // USA
  return await axios
    .get("https://www.nike.com/in/launch?s=upcoming") // India
    .then((res) => {
      // Get the whole html page from the axios response
      const html = res.data;
      //Use cheerio to load the page into an object
      // and then use selectors to get specific data
      const $ = cheerio.load(html);
      const list = [];

      // Using selector and iterating through each element
      // with the help of "each" method
      $(".upcoming-card").each((i, element) => {
        // using the load() method again and load the element
        // this time instead of html and then make use of the selector,
        // especially for image attribute
        const name = cheerio.load(element)("h3").text().trimStart().trimEnd();
        const date = cheerio.load(element)("h6").text().substring(10); // to remove 'Available'
        const imgUrl = cheerio.load(element)("img").attr("src");

        // date = "MM/DD at HH:MM AM/PM"
        const ampm = date.slice(-2).toLowerCase();
        const day = parseInt(date.split("/")[0]);
        const month = parseInt(date.split("/")[1].split("at")[0].trimEnd());
        const time = date.split("/")[1].split("at")[1].trimStart().split(":");
        const hours =
          ampm === "pm" ? parseInt(time[0]) + 12 : parseInt(time[0]); // 24 hour format
        const minutes = parseInt(time[1].substring(0, 2));
        // console.log("month"+ month+ "day"+ day+"hour"+hours+"minutes"+minutes+"ampm" + ampm + ".");

        // Release date converted to Date Object (UTC)
        const releaseDate = new Date(
          Date.UTC(new Date().getFullYear(), month - 1, day, hours, minutes)
        );

        hoursLeftForRelease(releaseDate);

        // Add to list only if 24 hrs left for drop
        if (hoursLeftForRelease(releaseDate) <= 24) {
          // ES6 shorthand syntax
          const releaseDateInIST = releaseDateToIST(releaseDate);
          list.push({ name, releaseDateInIST, imgUrl });
        }
      });
      return list;
    });
};

/**
 * Difference in hours between the releaseDate and current UTC time
 * @param {Date} releaseDate
 */
function hoursLeftForRelease(releaseDate) {
  const diffTime = Math.abs(releaseDate - new Date());
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  // const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffHours;
}

/**
 * Convert UTC Date to IST Format and beautify it a bit.
 * @param {Date} releaseDate
 */
function releaseDateToIST(releaseDate) {
  // const istDate = new Intl.DateTimeFormat('en-GB', {timeZone: 'IST'}).format(releaseDate);
  // toLocaleString() does this^ internally

  const time = releaseDate.toLocaleTimeString("en-US", { timeZone: "IST" }); //7:30:00 AM
  const date = releaseDate.toDateString(); //Sat Jul 02 2022
  const istDate = `${date} ${time.substring(0, 4)} ${time.slice(-2)}`;
  return istDate;
}

module.exports = getDataFromSnkrsSite;
