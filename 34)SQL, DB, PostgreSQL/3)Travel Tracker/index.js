import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

// CAUTION: you can use the provided DB for initial point (country_table.csv) and as DB POSTgreSQL has been used.
// If any point changed on DB side, server also should be restart to show all the changes.

const app = express();
const port = 3000;

let count = 0;
let countries = [];
let error = "";
let dataCheckFirstTime = true;

const dataCheck = async (req, res, next) => {
  if (!dataCheckFirstTime) {
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

    const result = await db.query("SELECT * FROM visited_countries");

    const results = result.rows;
    dataCheckFirstTime = false;

    if (results.length !== 0) {
      results.forEach((item) => {
        countries.push(item.country_code);
      });
      count = countries.length;
      console.log(countries);
    }
    console.log("Data obtained from DB first time");
    return next();
  } catch (err) {
    console.error("Database connection or query error:", err);
    return res
      .status(500)
      .send(
        `Check the console log, especially connection credentials and restart the server.${err}`,
      );
  } finally {
    try {
      await db.end();
    } catch (closeError) {
      console.error("Database connection could not be closed:", closeError);
    }
  }
};

const addNewData = async (data) => {
  const res = {
    isDataAdded: false,
    message: "",
  };

  const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "World",
    password: "mustafacan",
    port: 5432,
  });
  try {
    await db.connect();

    const result = await db.query(
      "insert into visited_countries (country_code) values ($1)",
      [data],
    );
    if (result.err) {
      res.isDataAdded = false;
      res.message = result.err;
    } else {
      res.isDataAdded = true;
      res.message = result.message;
    }
    return res;
  } catch (err) {
    console.error("Database connection or query error:", err);
    res.isDataAdded = false;
    res.message = err;
    return res;
  } finally {
    try {
      await db.end();
    } catch (closeError) {
      console.error("Database connection could not be closed:", closeError);
    }
  }
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", dataCheck, async (req, res) => {
  return res.render("index.ejs", {
    total: count,
    countries: countries,
    error: error,
  });
});

app.post("/add", async (req, res) => {
  const country = req.body.country.trim().toUpperCase();
  if (!allCountryCodes.includes(country)) {
    error = "Non-existing country code entered.";
    return res.redirect("/");
  } else {
    if (
      !countries.includes(country) &&
      country !== "" &&
      country.length === 2
    ) {
      const result = await addNewData(country);
      console.log(result);
      if (result.isDataAdded) {
        console.log(result.message);
        countries = [...countries, country];
        count++;
        error = "Data added succesfully.";
      } else {
        error = "Data could not be added. Please check console logs.";
      }
    } else {
      error =
        "Input already added or not match with expected entry. Entry should be 2 chars of the target country code";
    }

    return res.redirect("/");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

const allCountryCodes = [
  "AE",
  "AF",
  "AL",
  "AM",
  "AO",
  "AR",
  "AT",
  "AU",
  "AZ",
  "BA",
  "BD",
  "BE",
  "BF",
  "BG",
  "BI",
  "BJ",
  "BN",
  "BO",
  "BR",
  "BS",
  "BT",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CU",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "EH",
  "ER",
  "ES",
  "ET",
  "FK",
  "FI",
  "FJ",
  "FR",
  "GA",
  "GB",
  "GE",
  "GF",
  "GH",
  "GL",
  "GM",
  "GN",
  "GQ",
  "GR",
  "GT",
  "GW",
  "GY",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IN",
  "IQ",
  "IR",
  "IS",
  "IT",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KP",
  "KR",
  "XK",
  "KW",
  "KZ",
  "LA",
  "LB",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MD",
  "ME",
  "MG",
  "MK",
  "ML",
  "MM",
  "MN",
  "MR",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NC",
  "NE",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PG",
  "PH",
  "PL",
  "PK",
  "PR",
  "PS",
  "PT",
  "PY",
  "QA",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SD",
  "SE",
  "SI",
  "SJ",
  "SK",
  "SL",
  "SN",
  "SO",
  "SR",
  "SS",
  "SV",
  "SY",
  "SZ",
  "TD",
  "TF",
  "TG",
  "TH",
  "TJ",
  "TL",
  "TM",
  "TN",
  "TR",
  "TT",
  "TW",
  "TZ",
  "UA",
  "UG",
  "US",
  "UY",
  "UZ",
  "VE",
  "VN",
  "VU",
  "YE",
  "ZA",
  "ZM",
  "ZW",
];
