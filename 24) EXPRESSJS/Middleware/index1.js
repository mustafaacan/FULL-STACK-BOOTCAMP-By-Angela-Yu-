import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

// ON THE POSTMAN, (be carefull about selected body types and header content type)
// WORKSPACE : APITestingToLearn
// COLLECTION NAME : Postman test (Angela Yu Course)
// METHOD NAME: testForMiddleware

// For bigger projects, backend usually sends data instead of HTML and client side (REACT ETC.) by using the data and components,
// generates the necessary UI
app.get("/", (req, res) => {
  console.log("The path of the html index: ", __dirname);
  res.sendFile(__dirname + "/public/index.html");
});

app.post("/submit", (req, res) => {
  console.log("Requested body", req.body);

  // BY the using UI, some security policies can be satisfied. But, when someone try to post any data from tools such postman and
  // swagger, there might be a security leak so while writing the code, all the possibilites should be considered
  if (
    Object.keys(req.body).includes("pet") &&
    Object.keys(req.body).includes("street")
  ) {
    const valueCheck = Object.values(req.body).filter((item) => {
      return item.trim() != "" && item != null;
    });
    console.log(valueCheck);
    if (valueCheck.length === 2) {
      console.log("Body totally suitable");
    } else {
      console.log("Body includes empty values");
    }
  } else {
    console.log(
      "Incoming body keys should include 'pet' and 'street' in the same time",
    );
  }

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
