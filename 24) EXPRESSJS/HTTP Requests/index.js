import express from "express";

const app = express();
const port = 3001;

// Without default adjustment, we can get an warning such "Cannot Get"
app.get("/", (req, res) => {
  console.log(req.rawHeaders);
  res.send("<h1>Hello World!</h1>");
});

app.get("/about", (req, res) => {
  res.send("<h1>About Page!</h1>");
});

app.get("/contact", (req, res) => {
  res.send("<h1>Contact Page!</h1>");
});

// to catch any error while server up, we need a structure like that
const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}. http://localhost:${port}`);
});

// if server catch any error on network
server.on("error", (error) => {
  console.error("Server error:", error);
});
