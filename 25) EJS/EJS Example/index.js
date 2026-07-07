import express from "express";

const app = express();
const port = 3001;

const dayList = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

let day;
// Sunday - Saturday : 0 - 6
function dayHandler(req, res, next) {
  day = new Date().getDay();
  if (day === 0 || day === 6) {
    res.message = { day: "weekend", advice: "It's time to have fun!" };
  } else {
    res.message = { day: "weekday", advice: "It's time to work hard!" };
  }
  res.message["dayList"] = dayList[day];
  next();
}

app.use(dayHandler);

app.get("/", (req, res) => {
  console.log(res.message);
  console.log(day);
  res.render("index.ejs", res.message);
});

// to catch any error while server up, we need a structure like that
const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}. http://localhost:${port}`);
});

// if server catch any error on network
server.on("error", (error) => {
  console.error("Server error:", error);
});
