import express from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
console.log(__dirname);
console.log(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

// CUSTOM MIDDLEWARE
function validateSubmit(req, res, next) {
  console.log("Requested body", req.body);

  // BY the using UI, some security policies can be satisfied. But, when someone try to post any data from tools
  // such postman and swagger, there might be a security leak so while writing the code, all the possibilites
  // should be considered
  if (
    Object.keys(req.body).includes("pet") &&
    Object.keys(req.body).includes("street")
  ) {
    const valueCheck = Object.values(req.body).filter((item) => {
      console.log(item);
      return (
        // Only numbers and chars
        item.trim() !== "" &&
        item === item.trim() && // to detect the value that includes any space 'sad' !== 'sad '
        item !== null &&
        /^[\p{L}\p{N} ]+$/u.test(item)
      );
    });
    console.log(valueCheck);
    if (valueCheck.length === 2) {
      console.log("Body totally suitable");
      return res.status(200).json({
        message: "Successful",
      });
    } else {
      console.log("Body includes empty or invalid values");
      res.message = "Body includes empty or invalid values";
      return res.status(400).json({
        message: "Body includes empty or invalid values",
      });
    }
  } else {
    console.log(
      "Incoming body keys should include 'pet' and 'street' in the same time",
    );
    res.status(400).json({
      message:
        "Incoming body keys should include 'pet' and 'street' in the same time",
    });
  }
}

// ON THE POSTMAN, (be carefull about selected body types and header content type)
// WORKSPACE : APITestingToLearn
// COLLECTION NAME : Postman test (Angela Yu Course)
// METHOD NAME: testForMiddleware

// For bigger projects, backend usually sends data instead of HTML and client side (REACT ETC.) by using the data and components,
// generates the necessary UI
app.get("/", (req, res) => {
  // comes from path.join()
  const indexPath = join(__dirname, "public", "index.html");
  console.log("The path of the html index: ", indexPath);
  res.sendFile(indexPath);
});

app.post("/", validateSubmit, (req, res) => {
  return res.status(200).json({
    message: "Successful",
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
