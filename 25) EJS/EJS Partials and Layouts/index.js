import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

// MIDDLEWARES
app.use(express.static("./public"));
// To read HTML form data
app.use(express.urlencoded({ extended: true }));
// To read JSON data
app.use(express.json());

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/about", (req, res) => {
  res.render("about.ejs");
});

app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});

app.post("/submit", (req, res) => {
  const data = req.body;
  console.log("Entered Name: ", data["name"]);
  console.log("Entered Email: ", data["email"]);
  console.log("Entered Text: ", data["text"]);
  res.render("confirmationPage.ejs");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
