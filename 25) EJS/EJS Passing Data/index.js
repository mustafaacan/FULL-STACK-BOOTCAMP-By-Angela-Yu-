import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

const dataProcess = (req, res, next) => {
  const fullname = req.body["fName"] + req.body["lName"];
  res.locals.fn = fullname;
  next();
};

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index.ejs");
});

// ALTERNATIVE METHOD
// USE THE MIDDLEWARE ABOVE FOR THIS ROUTER AND REMOVE SENDING RENDER DATA
// fullname will be recorded to locals with middleware
// or we can directly define the locals inside the router
app.post("/submit", (req, res) => {
  const fullname = req.body["fName"] + req.body["lName"];
  //res.locals.fn = fullname;
  res.render("index.ejs", { fn: fullname });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
