import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import Strategy from "passport-local";
import session from "express-session";
import env from "dotenv";
import GoogleStrategy from "passport-google-oauth2";

// BEFORE OPS BE SURE THE ADJUSTMENT DONE ON YOUR BROWSER
// https://www.udemy.com/course/the-complete-web-development-bootcamp/learn/lecture/41780550#overview

// For more detailed info -> https://www.passportjs.org/packages/

// For me, Google Cloud adjustment just done. To check client Secret and client ID, go to web app detail or downloaded json file

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  }),
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

// TO MANAGE SESSION MESSAGES FROM STRATEGIES
app.use((req, res, next) => {
  const messages = req.session.messages || [];

  for (const message of messages) {
    console.log(message);
  }

  req.session.messages = []; // Clear the message
  next();
});

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

// ############################################## ROUTES ######################################################

// #################################### INDEX #######################################
app.get("/", (req, res) => {
  res.render("home.ejs");
});

// #################################### LOGIN #######################################
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// FOR PASSWORD-LOCAL USAGE
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
    failureMessage: true,
  }),
);

// #################################### REGISTER #######################################
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

// FOR PASSWORD-LOCAL USAGE
app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      req.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash],
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/secrets");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// #################################### LOGOUT #######################################
// WILL BE AVAILABLE FOR ALL PASSWORD STRATEGIES
// POSSIBLE ERROR WILL BE REFLECTED BY THE ERROR MIDDLEWARE IN THE END OF THE SCRIPT
app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// #################################### SECRETS #######################################
app.get("/secrets", (req, res) => {
  console.log(req.user);
  if (req.isAuthenticated()) {
    res.render("secrets.ejs");
  } else {
    res.redirect("/login");
  }
});

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/",
    failureMessage: true, // THIS IS MUST TO SEE SESSION MESSAGES
  }),
);

// #################################### GOOGLE AUTH PATH #######################################
// JUST USED FOR REGISTER AND LOGIN PAGES.
// If succeed, middleware will redirect us to callbackURL (we need to define it also. check the secrets section)
// "http://localhost:3000/auth/google/secrets"

// prompt: "select_account" --> For google browser, if the email has selected once, after each tries,
// system will use it. to prevent it, for everytime, let the system ask to user for google account
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }),
);

// #################################### PASSWORD MIDDLEWARE #######################################

// PASSWORD-LOCAL DEFINITION
// Default name is local. we can change the name with defining in the beginning of the code
// see the google strategy definition
passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            //Error with password check
            console.error("Error comparing passwords:", err);
            return cb(null, false, {
              message: "An error occurred during login. Please try again.",
            });
          } else {
            if (valid) {
              //Passed password check
              return cb(null, user);
            } else {
              //Did not pass password check
              return cb(null, false, {
                message: "Incorrect email or password.",
              });
            }
          }
        });
      } else {
        return cb(null, false, {
          message: "Incorrect email or password.",
        });
      }
    } catch (err) {
      console.log(err);
      return cb(null, false, {
        message: "An error occurred during login. Please try again.",
      });
    }
  }),
);

// PASSWORD-GOOGLE OAUTH2 DEFINITION
// BOTH LOGIN AND REGISTER OPS WILL BE MANAGED FROM HERE
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      // check the profile information provided from google
      console.log(profile);
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          // JUST A TRICK
          // We can register the user email as "google" so we can understand
          // user registered by using google oauth
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [profile.email, "google"],
          );
          return cb(null, newUser.rows[0]);
        } else {
          // FAILURE REDIRECT TO "/"
          // We can manage the session messages such adding them to calback funtions
          // false --> failure , for this app failure
          if (result.rows[0].password !== "google") {
            return cb(null, false, {
              message:
                "This Account already Registered. Please try to access with password",
            });
          }
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        console.log(err);
        cb(null, false, {
          message: "GOOGLE OAUTH FAILURE: \n" + err,
        });
      }
    },
  ),
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

// ERROR MIDDLEWARE (LOCATION IS CRUCIAL)
// GRABS ALL THE ERRORS FROM CB(ERR) OR LOGOUT ROUTES
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  // If an error occurs while trying to reach out to home page
  if (req.path === "/") {
    return res.status(500).send("Could not access to home page !!! ");
  }

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
