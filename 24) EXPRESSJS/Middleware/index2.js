import express from "express";
import morgan from "morgan";

const app = express();
const port = 3000;

// To see the logging effect, use the postman / swagger

app.use(morgan("combined"));

app.get("/", (req, res) => {
  res.send("Hello");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
