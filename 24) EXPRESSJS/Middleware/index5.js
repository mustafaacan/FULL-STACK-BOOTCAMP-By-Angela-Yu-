//To see how the final website should work, run "node solution.js".
//Make sure you have installed all the dependencies with "npm i".
//The password is ILoveProgramming

import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

var userIsAuthorised = false;

app.use(bodyParser.urlencoded({ extended: true }));

// CRITICAL ISSUE: Assume that once you entered the correct password and reach out to the correct page
// that when try to back to previous page from browser and try to enter wrong password, if there is no any else clause
// still will be continue to reach out to same page so adding else in some case become more crucial
function passwordCheck(req, res, next) {
  const password = req.body["password"];
  if (password === "ILoveProgramming") {
    userIsAuthorised = true;
  } else {
    userIsAuthorised = false;
  }
  next();
}
app.use(passwordCheck);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/main.html");
  userIsAuthorised = false;
});

app.post("/check", (req, res) => {
  if (userIsAuthorised === true) {
    res.sendFile(__dirname + "/public/secret.html");
  } else {
    res.sendFile(__dirname + "/public/main.html");
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
