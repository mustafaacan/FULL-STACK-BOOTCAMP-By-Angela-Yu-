import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

let currentQuestion = {};
let quiz = [];
let totalCorrect = 0;
let dataCheckFirstTime = true;

const DBCheck = async (req, response, next) => {
  // IF the data already obtained, do not try to obtain it again. Otherwise, there will be an error such
  // "Client has already been connected. You cannot reuse a client." even db connection closed succesfully.
  if (!dataCheckFirstTime) {
    if (quiz.length === 0) {
      return response
        .status(404)
        .send("Query results is empty. Check the SQL query.");
    }

    return next();
  }

  const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "World",
    password: "mustafacan",
    port: 5432,
  });

  try {
    await db.connect();

    const result = await db.query("SELECT * FROM capitals");

    quiz = result.rows;
    dataCheckFirstTime = false;

    if (quiz.length === 0) {
      return response
        .status(404)
        .send("Query results is empty. Check the SQL query.");
    }

    console.log("The needed data obtained as below");
    console.log(quiz);

    return next();
  } catch (error) {
    console.error("Database connection or query error:", error);

    return response
      .status(500)
      .send(
        `Check the console log, especially connection credentials or SQL Query and restart the server.${error}`,
      );
  } finally {
    try {
      await db.end();
    } catch (closeError) {
      console.error("Database connection could not be closed:", closeError);
    }
  }
};

async function nextQuestion() {
  const randomCountry = quiz[Math.floor(Math.random() * quiz.length)];
  currentQuestion = randomCountry;
}

// To prevent not allowed method at all. you can use it by adding app.all()
// under the defined router.
function methodNotAllowed(allowedMethods) {
  return (req, res) => {
    res.set("Allow", allowedMethods.join(", "));

    return res.status(405).send({
      error: "Method Not Allowed",
      allowedMethods,
    });
  };
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// GET home page
app.get("/", DBCheck, async (req, res) => {
  totalCorrect = 0;
  await nextQuestion();
  console.log(currentQuestion);
  res.render("index.ejs", { question: currentQuestion });
});

app.all("/", methodNotAllowed(["GET"]));

// POST a new post
app.post("/submit", (req, res) => {
  // If the user tries to use Postman without currentQuestion determination
  // To avoid the impact
  if (!currentQuestion || !currentQuestion.capital) {
    return res.redirect("/");
  }

  // If the user tries to use Postman without answer body
  // To avoid the impact
  const answer = req.body.answer?.trim();

  if (!answer) {
    return res.redirect("/");
  }

  let isCorrect = false;

  if (currentQuestion.capital.toLowerCase() === answer.toLowerCase()) {
    totalCorrect++;
    isCorrect = true;
  }

  nextQuestion();

  res.render("index.ejs", {
    question: currentQuestion,
    wasCorrect: isCorrect,
    totalScore: totalCorrect,
  });
});

app.all("/submit", methodNotAllowed(["POST"]));

// FOR THE ALL OTHER REQUESTED URL THAT NOT EXIST
app.use((req, res) => {
  return res.status(404).json({
    status: 404,
    message: "The requested URL was not found.",
  });
});

// For the General unexpected conditions
app.use((error, req, res, next) => {
  console.error(error);

  return res.status(error.status || 500).json({
    message:
      error.status === 400 ? "Invalid request body." : "Internal server error.",
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
