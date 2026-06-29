/* 
1. Use the inquirer npm package to get user input.
2. Use the qr-image npm package to turn the user entered URL into a QR code image.
3. Create a txt file to save the user input using the native fs node module.
*/

import inquirer from "inquirer";
import { image } from "qr-image";
import fs from "fs";
import generateName from "sillyname";

const targetPath = new URL("./message.txt", import.meta.url);

const validateURL = (url) => {
  return url.includes("@") && url.includes(".");
};

inquirer
  .prompt([
    { message: "Enter the URL for QR code (PNG formatted)", name: "url" },
  ])
  .then((answers) => {
    const url = answers.url;
    if (validateURL(url)) {
      var qr_svg = image(url);
      const fileName = generateName() + ".png";
      const targetPath = new URL(`./QRCODES/${fileName}`, import.meta.url);

      console.log("Generated File Name: ", fileName);
      qr_svg.pipe(fs.createWriteStream(targetPath));
      fs.writeFile("LatestURL.txt", url, (err) => {
        if (err) throw err;
        console.log("The file has been saved!");
      });
      console.log("QR code generated");
    } else {
      console.log("Invalid URL: ", answers.url);
    }
  })
  .catch((error) => {
    console.log(error);
  });
