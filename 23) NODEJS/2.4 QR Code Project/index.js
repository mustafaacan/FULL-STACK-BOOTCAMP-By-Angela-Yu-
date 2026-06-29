/* 
1. Use the inquirer npm package to get user input.
2. Use the qr-image npm package to turn the user entered URL into a QR code image.
3. Create a txt file to save the user input using the native fs node module.
*/

import inquirer from "inquirer";
import { image } from "qr-image";
import fs from "fs";
import generateName from "sillyname";
import { json } from "stream/consumers";

const targetPath = new URL("./message.txt", import.meta.url);

const updateURLList = (obj) => {
  fs.readFile("LatestURL.txt", "utf8", (err, data) => {
    if (err) {
      console.log("Error while File Reading:", err);
      return;
    }
    let latestUrlObj = {};
    if (data.trim() !== "") {
      latestUrlObj = JSON.parse(data);
    }
    const updatedObj = JSON.stringify({ ...latestUrlObj, ...obj }, null, 2);

    fs.writeFile("LatestURL.txt", updatedObj, (err) => {
      if (err) {
        console.log("Error while updating the file:", err);
        return;
      }

      console.log("The file has been updated");
      console.log("QR code generated");
    });
  });
};

inquirer
  .prompt([
    { message: "Enter the URL for QR code (PNG formatted)", name: "url" },
  ])
  .then((answers) => {
    const url = answers.url;

    var qr_svg = image(url);
    const fileName = generateName() + ".png";
    const targetPath = new URL(`./QRCODES/${fileName}`, import.meta.url);

    console.log("Generated File Name: ", fileName);
    qr_svg.pipe(fs.createWriteStream(targetPath));
    const createdObj = { [fileName]: url };
    updateURLList(createdObj);
  })
  .catch((error) => {
    console.log(error);
  });
