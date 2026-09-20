import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
// Used above app.listen
import { Strategy } from "passport-local";

// SESSİON BASED PASSWORD-LOCAL STRATEGY HAS BEEN APPLIED FOR THIS EXAMPLE.
// for more info --> https://www.passportjs.org/packages/passport-local/

// For the example as below, check --> https://www.passportjs.org/tutorials/password/

// CRITICAL
// Do not forget activating the cookie storage from settings
// chrome://settings/content/siteData --> allow the sites storages to this device

// For test
// 1) close the tab and try to go to /secrets directly within maxAge, you should be able to react to the secrets page

const app = express();
const port = 3000;
const saltRounds = 10;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Session adjustment
// secret --> to provide security for the session
// resave --> To store the session for each request
// saveUninitialized --> each session (even empty) will be recorded in the beginning
// When open the browser, check for the session
// magAge unit is millisecond (1000)
/*
1000 * 60 --> 1 min
1000 * 60 * 60 --> 1 hour
1000 * 60 * 60 * 24 --> 1 day 
 */
// By adding maxAge, even totally close the browser, within maxAge value, we can use cookies
app.use(
  session({
    secret: "TOPSECRETWORD",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 2 },
  }),
);

// CRITICAL POINT
// password middleware should be defined after session initialization
// In other words, session adjustment first, then codes
// Do not forget the functions
app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Secrets",
  password: "mustafacan",
  port: 5432,
});
db.connect();

app.get("/", (req, res) => {
  res.render("home.ejs");
});

// If user tries to access directly access to the secrets page
// without login, system will detect it
app.get("/secrets", (req, res) => {
  // isAuthentication and user come from passwordJS defined below
  console.log(req.user);
  console.log("GET Secrets");
  if (req.isAuthenticated()) {
    res.render("secrets.ejs");
  } else {
    res.render("home.ejs");
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      //hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          // After reqister, we accept the user logged in the app
          // req.login() cames from password as built in
          console.log("Hashed Password:", hash);
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING * ;",
            [email, hash],
          );
          const user = result.rows[0];
          // req.login() cames from password as built in
          // system accepts user's info for cookie session
          req.login(user, (err) => {
            console.log(err);
            res.redirect("/secrets");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// ALL THE NECESSARY OPS TRANSFERRED UNDER password.use middleware
// we do not need them anymore
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  }),
);

// LOCALE STRATEGY
// CRITICAL POINT
// usename & password must same with the name values on both login.ejs
// because they will be came from form
// callback function named as callBack for this example but it can be named
// as you wish
passport.use(
  new Strategy(async function verify(username, password, callBack) {
    console.log("password middleware");
    console.log(username);
    console.log(password);
    /* Since the structure grab the username and password from entry automatically
  we do not need to add the variables below
  const email = req.body.username;
  const loginPassword = req.body.password;
   */
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        username, // from ejs form
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        // password from ejs form
        bcrypt.compare(password, storedHashedPassword, (err, result) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            // can be use as req.err
            return callBack(err);
          } else {
            if (result) {
              //null --> there wont be any error message
              //user --> result.rows[0]; obtained from DB check row 121
              //user will be added to req so you can use it as req.user
              return callBack(null, user);
            } else {
              return callBack(null, false);
              // there is no any error
              // user not authenticated --> isAuthenticated === false
            }
          }
        });
      } else {
        return callBack("User Not Found");
      }
    } catch (err) {
      return callBack(err);
    }
  }),
);

// SESSİON BASED LOCALE STORAGE FOR AUTHERIZED USER
passport.serializeUser((user, cb) => {
  cb(null, user);
});

// TO READING USER INFOR FROM STORAGE
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
