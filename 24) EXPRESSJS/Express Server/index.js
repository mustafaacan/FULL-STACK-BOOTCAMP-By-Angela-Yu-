import express from "express";

const app = express();
const port = 3001;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// to catch any error while server up, we need a structure like that
const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}. http://localhost:${port}`);
});

// if server catch any error on network
server.on("error", (error) => {
  console.error("Server error:", error);
});
