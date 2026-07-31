import axios from "axios";
import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

let Secret;
let remaining;

app.use(express.static("./public"));
app.use(bodyParser.urlencoded({ extended: true }));

const getUserSecret = async (req, res, next) => {
  try {
    const secret = await axios.get("https://secrets-api.appbrewery.com/random");
    Secret = secret.data;
    remaining = secret.headers["ratelimit-remaining"];
  } catch (error) {
    Secret = {
      error:
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        "Unknown Error",
    };
  }
  next();
};

app.use(getUserSecret);

app.get("/", (req, res) => {
  res.render("index.ejs", { Secret, remaining });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
