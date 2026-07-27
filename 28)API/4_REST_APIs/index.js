import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const port = 3000;
const API_URL = "https://secrets-api.appbrewery.com";

// CAUTION: DEFAULT VALUES CANNOT BE CHANGED SO WORK ON THE VALUE THAT YOU NEWLY CREATED ON THE SYSTEM.
// IN OTHER WORDS, BEFORE USING PUT, PATCH AND DELETE, CREATE A VALUE WITH USING POST

// HINTs: Use the axios documentation as well as the video lesson to help you.
// https://axios-http.com/docs/post_example
// Use the Secrets API documentation to figure out what each route expects and how to work with it.
// https://secrets-api.appbrewery.com/

axios.interceptors.request.use((request) => {
  console.log("Headers:", request.headers);
  console.log("Auth config:", request.auth);
  console.log("Query params:", request.params);
  console.log("Request URL:", request.url);
  console.log("Request Method:", request.method);
  console.log("Request Body:", request.data);
  return request;
});

const yourBearerToken = "38764063-c377-490b-9cc1-523c1692e350";
const config = {
  headers: { Authorization: `Bearer ${yourBearerToken}` },
};

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index.ejs", { content: "Waiting for data..." });
});

app.post("/get-secret", async (req, res) => {
  const searchId = req.body.id.trim();
  if (searchId) {
    try {
      const result = await axios.get(API_URL + "/secrets/" + searchId, config);
      res.render("index.ejs", { content: JSON.stringify(result.data) });
    } catch (error) {
      res.render("index.ejs", { content: JSON.stringify(error.response.data) });
    }
  } else {
    res.render("index.ejs", {
      content: "Search ID should not be empty and should be a number.",
    });
  }
});

app.post("/post-secret", async (req, res) => {
  const secret = req.body.secret.trim();
  const score = req.body.score.trim();
  if (secret && score) {
    try {
      const result = await axios.post(
        API_URL + "/secrets",
        { secret: secret, score: score },
        config,
      );
      res.render("index.ejs", { content: JSON.stringify(result.data) });
    } catch (error) {
      res.render("index.ejs", { content: JSON.stringify(error.response.data) });
    }
  } else {
    res.render("index.ejs", {
      content: "Both secret and score should be provided",
    });
  }
});

app.post("/put-secret", async (req, res) => {
  const searchId = req.body.id;
  const secret = req.body.secret.trim();
  const score = req.body.score.trim();
  if (secret && score && searchId) {
    try {
      const result = await axios.put(
        `${API_URL}/secrets/${searchId}`,
        { secret: secret, score: score },
        config,
      );
      res.render("index.ejs", { content: JSON.stringify(result.data) });
    } catch (error) {
      res.render("index.ejs", { content: JSON.stringify(error.response.data) });
    }
  } else {
    res.render("index.ejs", {
      content: "SearchID, secret and score should be provided",
    });
  }
});

app.post("/patch-secret", async (req, res) => {
  const searchId = req.body.id;
  const secret = req.body.secret.trim();
  const score = req.body.score.trim();
  if ((secret || score) && searchId) {
    try {
      const result = await axios.patch(
        `${API_URL}/secrets/${searchId}`,
        { secret: secret, score: score },
        config,
      );
      res.render("index.ejs", { content: JSON.stringify(result.data) });
    } catch (error) {
      res.render("index.ejs", { content: JSON.stringify(error.response.data) });
    }
  } else {
    res.render("index.ejs", {
      content: "secret or score (or both) should be provided with searchID",
    });
  }
});

app.post("/delete-secret", async (req, res) => {
  const searchId = req.body.id;
  if (searchId) {
    try {
      const result = await axios.delete(
        `${API_URL}/secrets/${searchId}`,
        config,
      );
      res.render("index.ejs", { content: JSON.stringify(result.data) });
    } catch (error) {
      res.render("index.ejs", { content: JSON.stringify(error.response.data) });
    }
  } else {
    res.render("index.ejs", {
      content: "searchID should be provided with searchID",
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
