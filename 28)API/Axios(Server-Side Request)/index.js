import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const port = 3000;

// FOR AXIOS DOCUMENTATION
// https://axios.rest/pages/getting-started/examples/commonjs.html
// For this example, we used axios with async mechanism but most modern way is using it as
// Promise method, get,then,catch,finally.

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

let remaining = 100;

// CAUTION : async keyword should be used if there is any await needed process
app.get("/", async (req, res) => {
  try {
    const response = await axios.get("https://bored-api.appbrewery.com/random");
    const result = [response.data];
    remaining = response.headers["ratelimit-remaining"];
    res.render("index.ejs", {
      data: result,
      remaining: remaining,
    });
  } catch (error) {
    console.error("Failed to make request:", error.message);
    res.render("index.ejs", {
      error: error.message,
    });
  }
});

app.post("/", async (req, res) => {
  const baseURL = "https://bored-api.appbrewery.com";
  let URL;
  console.log(req.body);
  if (req.body.type.trim()) {
    if (req.body.participants.trim()) {
      URL =
        baseURL +
        `/filter?type=${req.body.type.trim()}&participants=${req.body.participants.trim()}`;
    } else {
      URL = baseURL + `/filter?type=${req.body.type.trim()}`;
    }
  } else {
    URL = baseURL + "/random";
  }

  try {
    const response = await axios.get(URL);
    remaining = response.headers["ratelimit-remaining"];
    const result = Array.isArray(response.data)
      ? response.data
      : [response.data];
    res.render("index.ejs", {
      data: result,
      remaining: remaining,
    });
  } catch (error) {
    console.error("Failed to make request:", error.message);
    res.render("index.ejs", {
      error: error.message,
      remaining: remaining,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
