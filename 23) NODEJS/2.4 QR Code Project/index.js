/* 
1. Use the inquirer npm package to get user input.
2. Use the qr-image npm package to turn the user entered URL into a QR code image.
3. Create a txt file to save the user input using the native fs node module.
*/

// CAUTION : QRCODES FOLDER SHOULD BE DEFINED BEFORE SYSTEM RUN

import inquirer from "inquirer";
import { image } from "qr-image";
import fs from "fs"; // For file ops
import generateName from "sillyname";

const targetPath = new URL("LatestURL.txt", import.meta.url);

const updateURLList = (obj) => {
  // 1) READ THE FILES AND CONVERT IT INTO JS OBJECT
  // 2) UPDATE THE OBJECT
  // 3) RECORD THE NEW OBJECT AS JSON
  fs.readFile(targetPath, "utf8", (err, data) => {
    if (err) {
      console.log("Error while File Reading:", err);
      return;
    }
    let latestUrlObj = {};
    if (data.trim() !== "") {
      // converts the json object to js object.
      latestUrlObj = JSON.parse(data);
    }
    // JSON.stringify generates json file from js object
    // 1) If they have common keys, the value of the second object will be accepted.
    // 2) null --> there wont be any filter or special function while merging
    // 3) 2 --> indent value for more readible files
    const updatedObj = JSON.stringify({ ...latestUrlObj, ...obj }, null, 2);

    fs.writeFile(targetPath, updatedObj, (err) => {
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
    {
      message: "Enter the URL for QR code (PNG formatted)",
      name: "url", // the answer will be recorded with the key "url"
      validate(value) {
        const input = value.trim();

        if (input.startsWith("www.")) {
          return true;
        }

        try {
          const url = new URL(input);

          if (url.protocol !== "http:" && url.protocol !== "https:") {
            return "URL should start with http://, https:// or www.";
          }

          return true;
        } catch {
          return "Invalid URL";
        }
      },
    },
  ])
  .then((answers) => {
    const url = answers.url;

    if (url.trim() === "") {
      console.log("There is no any valid URL for QR");
      return;
    }

    // Generates the QR image according to URL
    const qr_svg = image(url);
    const fileName = generateName() + ".png";
    const targetPathQR = new URL(`./QRCODES/${fileName}`, import.meta.url);

    console.log("Generated File Name: ", fileName);
    // pipe --> transfers the image parts
    // createWriteStream --> streaming to the file until writing ops completed then closes the file
    // Especially for the big data ops, useful to write the incoming data to file part by part
    // similar to nolock on MSSQL
    qr_svg.pipe(fs.createWriteStream(targetPathQR));

    // Check the Notes.txt for more detailed ınfo (DYNAMIC OBJECT NAMING)
    const createdObj = { [fileName]: url };
    updateURLList(createdObj);
  })
  .catch((error) => {
    console.log(error);
  });
