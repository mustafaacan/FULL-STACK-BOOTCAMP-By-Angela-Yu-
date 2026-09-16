import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";

// YAPILMADI. INCELE VE YAPMAYA ÇALIŞ.
// KULLANICIYA ŞİFRE ZAYIF MI GÜÇLÜ MÜ UYARISI VEREN BİR MEKANİZMA KURABİLİR MİYİZ
//
// 2. MIDDLEWARE OLARAK KULLAN, EĞER KULLANICI ADI VE ŞİFRE KRİTERLERE UYUYORSA
// 2. MIDDLEWARE ŞİFRE İÇERİĞİNİ İNCELESİN

const app = express();
const port = 3000;
// How many salting steps will be applied
const saltRounds = 10;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Secrets",
  password: "123456",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home.ejs");
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
      // PASSWORD HASHING
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.log("Error while password hashing process", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            // ENTER HASH INSTEAD OF PASSWORD
            [email, hash],
          );
          console.log(result);
          res.render("secrets.ejs");
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/login", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedPassword = user.password;
      /*
      CAUTION : Since hashed password will be change everytime, we cannot
      compare the entered original password with the recorded one so functions
      include their own compare methods for it
       */
      bcrypt.compare(password, storedPassword, async (err, result) => {
        if (err) {
          console.log("Error while comparing passwords: ", err);
        }
        // if passowrd is correct, result will be true
        if (result) {
          return res.render("secrets.ejs");
        } else {
          return res.send("Incorrect Password or Email");
        }
      });
    } else {
      res.send("User not found");
    }
  } catch (err) {
    console.log(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
