import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

// TAMAMLANDI (14.09.2026)

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// ##################################### DB OPS #########################################
const executeQuery = async (sqlScript, values = []) => {
  const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Secrets",
    password: "mustafacan",
    port: 5432,
  });

  try {
    await db.connect();

    const result = await db.query(sqlScript, values);

    return {
      success: true,
      data: result.rows,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  } finally {
    try {
      await db.end();
    } catch (closeError) {
      console.error("Database connection could not be closed:", closeError);
    }
  }
};

const createMember = async (email, password) => {
  const result = await executeQuery(
    "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING email;",
    [email, password],
  );
  // success (boolean) and (data or error)
  return result;
};

const getMember = async (email, password) => {
  const result = await executeQuery(
    "SELECT * FROM users where email = $1 and password = $2",
    [email, password],
  );
  // success (boolean) and (data or error)
  return result;
};

// ##################################### MIDDLEWARE #########################################
function validateUserEntry(req, res, next) {
  // Caution: this method checks req.body in the terms of username and password
  // for instance, if body only includes username then result
  // username : .... , password: undefined
  const { username, password } = req.body ?? {};

  req.validationError = null;

  if (
    typeof username !== "string" ||
    username.trim() === "" ||
    typeof password !== "string" ||
    password.trim() === ""
  ) {
    req.validationError = "Email and Password areas are mandatory.";
    return next();
  }

  const email = username.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    req.validationError = "Invalid Email address.";
    return next();
  }

  if (password.length < 5) {
    req.validationError = "Password cannot be less than 5 characters.";
    return next();
  }

  req.username = email;
  req.password = password;

  next();
}

//####################################### ROUTES #######################################

//####################################### INDEX #######################################
app.get("/", (req, res) => {
  res.render("home.ejs");
});

//####################################### GET login #######################################
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

//####################################### GET register #######################################
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

//####################################### POST register #######################################
app.post("/register", validateUserEntry, async (req, res) => {
  res.locals.error = "";
  res.locals.username = "";
  //req.validationError comes from middleware
  if (req.validationError) {
    res.locals.error = req.validationError;
    return res.status(400).render("register.ejs");
  }

  const result = await createMember(req.username, req.password);

  if (!result.success) {
    console.log(result.error);

    const userAlreadyExists = result.error.code === "23505";

    return res.status(userAlreadyExists ? 409 : 500).render("register.ejs", {
      error: userAlreadyExists
        ? "User already exists."
        : "User could not be created. Please try again.",
    });
  }

  res.locals.username = req.username;
  return res.status(201).render("register-success.ejs");
});

//####################################### POST login #######################################
app.post("/login", validateUserEntry, async (req, res) => {
  //req.validationError comes from middleware
  res.locals.error = "";
  if (req.validationError) {
    res.locals.error = req.validationError;
    return res.status(400).render("login.ejs");
  }

  const getUser = await getMember(req.username, req.password);

  if (!getUser.success) {
    console.error(getUser.error);
    res.locals.error = "Login failed. Please try again.";
    return res.status(500).render("login.ejs");
  }

  // User may not registered or entries are invalid.
  // For both ways, we need to return a generalized message to users.
  if (getUser.data.length === 0) {
    res.locals.error = "Invalid email or password.";
    return res.status(401).render("login.ejs");
  }

  if (getUser.data.length > 1) {
    res.locals.error = "Multiple users matched during login.";
    return res.status(500).render("login.ejs");
  }

  return res.status(200).render("secrets.ejs");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
