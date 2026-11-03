import axios from "axios";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Siprise — Cocktail Discovery
 *
 * Express application that serves an EJS interface and retrieves drink recipes
 * from TheCocktailDB through server-side Axios requests.
 *
 * Users can discover a random drink or choose a category. Category requests
 * select a drink from the filtered list, then retrieve its full recipe.
 * Successful responses provide the frontend with drink details, ingredients,
 * and preparation instructions for display on the home page.
 *
 * Request failures use JSON or an EJS error page according to the client's
 * accepted response format. Unmatched routes and methods receive a 404 page;
 * unexpected request errors are handled by the final error middleware.
 *
 * API documentation: https://www.thecocktaildb.com/api.php
 */

const app = express();
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const port = 3000;
const timeOut = 5000;

app.use(express.static(path.join(projectDir, "public")));
app.set("views", path.join(projectDir, "views"));

// ################# COMMON URLS ################

/*
ALL THE NEEDED URL

Random --> www.thecocktaildb.com/api/json/v1/1/random.php
Alcholic --> www.thecocktaildb.com/api/json/v1/1/filter.php?a=Alcoholic
Non-Alcholic --> www.thecocktaildb.com/api/json/v1/1/filter.php?a=Non_Alcoholic
Ordinary Drink --> www.thecocktaildb.com/api/json/v1/1/filter.php?c=Ordinary_Drink
coctail --> www.thecocktaildb.com/api/json/v1/1/filter.php?c=Cocktail

 */

const BASE_URL = "https://www.thecocktaildb.com/api/json/v1/1/";

const endpoints = {
  random: "random.php",
  alcoholic: "filter.php?a=Alcoholic",
  nonAlcoholic: "filter.php?a=Non_Alcoholic",
  ordinaryDrink: "filter.php?c=Ordinary_Drink",
  cocktail: "filter.php?c=Cocktail",
  detail: "lookup.php?i=",
};

// ################# (MIDDLEWARE) DRINK FETCHING ################

const fetchCategory = (category) => {
  return async (req, res, next) => {
    try {
      // Provided category name should be included by endpoint object
      // Since detail endpoint is not necessary, we need to eliminate it
      const endpointList = Object.keys(endpoints).filter(
        (item) => item !== "detail",
      );
      if (!endpointList.includes(category)) {
        res.locals.error = "Invalid category request";
        res.locals.statusCode = 500;
        return next();
      }

      // requesting according to category
      const url = BASE_URL + endpoints[category];
      const result = await axios.get(url, { timeout: timeOut });
      if (
        !Array.isArray(result.data?.drinks) ||
        result.data.drinks.length === 0
      ) {
        res.locals.error = "Drink list is Empty";
        res.locals.statusCode = 502;
        return next();
      } else {
        if (category === "random") {
          const drink = result.data.drinks[0];
          if (!drink?.idDrink || !drink?.strDrink) {
            res.locals.error = "Drink data is incomplete.";
            res.locals.statusCode = 502;
            return next();
          }
          res.locals.drink = drink;
          return next();
        }

        // selecting random drink id
        const drinks = result.data.drinks;
        const randomIndex = Math.floor(Math.random() * drinks.length);
        const randomDrink = drinks[randomIndex];
        const drinkId = randomDrink?.idDrink;
        if (!drinkId) {
          res.locals.error = "Drink ID could not be obtained";
          res.locals.statusCode = 502;
          return next();
        }
        // drink detail according to ID
        const detailURL = BASE_URL + endpoints["detail"] + drinkId;
        const details = await axios.get(detailURL, { timeout: timeOut });
        if (!Array.isArray(details.data?.drinks) || !details.data.drinks[0]) {
          res.locals.error = "Drink Info could not be obtained";
          res.locals.statusCode = 502;
          return next();
        }
        const drink = details.data.drinks[0];
        if (!drink?.idDrink || !drink?.strDrink) {
          res.locals.error = "Drink data is incomplete.";
          res.locals.statusCode = 502;
          return next();
        }
        res.locals.drink = drink;
        return next();
      }
    } catch (err) {
      console.error("fetchCategory failed:", err);

      if (
        // timeout error
        axios.isAxiosError(err) &&
        ["ECONNABORTED", "ETIMEDOUT"].includes(err.code)
      ) {
        res.locals.statusCode = 504;
        res.locals.error = "The drink service took too long to respond.";
      } else if (axios.isAxiosError(err)) {
        res.locals.statusCode = 502;
        res.locals.error =
          "The drink service could not be reached successfully.";
      } else {
        res.locals.statusCode = 500;
        res.locals.error = "An unexpected error occurred.";
      }
      return next();
    }
  };
};

// ################# (MIDDLEWARE) FOR DATA RENDER ################
// Caution: will be used after related routes
const renderDrink = (req, res) => {
  if (res.locals.error !== undefined) {
    if (req.accepts(["html", "json"]) === "json") {
      return res
        .status(res.locals.statusCode ?? 500)
        .json({ error: res.locals.error });
    }
    return res.status(res.locals.statusCode ?? 500).render("error.ejs");
  }

  // ingredient with measures
  const ingredients = Object.keys(res.locals.drink)
    .filter((key) => /^strIngredient\d+$/.test(key))
    .sort((a, b) => {
      const numberA = Number(a.replace("strIngredient", ""));
      const numberB = Number(b.replace("strIngredient", ""));

      return numberA - numberB;
    })
    .map((key) => {
      const number = key.replace("strIngredient", "");
      const ingredient = res.locals.drink[key];
      const measure = res.locals.drink[`strMeasure${number}`];

      return {
        ingredient: typeof ingredient === "string" ? ingredient.trim() : "",
        measure:
          (typeof measure === "string" ? measure.trim() : "") ||
          "Not specified",
      };
    })
    .filter((item) => item.ingredient !== "");

  const instructions = res.locals.drink.strInstructions;
  const drink = {
    name: res.locals.drink.strDrink ?? "Unknown",
    image: res.locals.drink.strDrinkThumb ?? "",
    video: res.locals.drink.strVideo ?? "",
    desc:
      (typeof instructions === "string" ? instructions.trim() : "") ||
      "No instructions available.",
    ingreds: ingredients,
  };

  res.status(200).json(drink);
};

// ################################### ROUTES ##############################################

//  INDEX
app.get("/", (req, res) => {
  res.render("index.ejs");
});

// Display errors without making the failed drink request again.
app.get("/error", (req, res) => {
  const status = Number(req.query.status);
  const statusCode = [400, 500, 502, 504].includes(status) ? status : 500;
  const error =
    typeof req.query.message === "string"
      ? req.query.message.slice(0, 300)
      : "An unexpected error occurred. Please try again.";
  res.status(statusCode).render("error.ejs", { error });
});

// Alcholic DRINK
app.get("/alcoholic", fetchCategory("alcoholic"), renderDrink);

//  Non-Alcholic DRINK
app.get("/non-alcoholic", fetchCategory("nonAlcoholic"), renderDrink);

//  Ordinary DRINK
app.get("/ordinary-drink", fetchCategory("ordinaryDrink"), renderDrink);

//  Non - Ordinary RANDOM DRINK
app.get("/cocktail", fetchCategory("cocktail"), renderDrink);

//  RANDOM DRINK
app.get("/random", fetchCategory("random"), renderDrink);

// ################################### 404 PAGE ##############################################

// Unmatched paths and HTTP methods use the same 404 page.
app.use((req, res) => {
  return res.status(404).render("404.ejs");
});

// ################################### ERROR MIDDLEWARE ##############################################

// Handle unexpected request errors after all routes and the 404 handler.
app.use((err, req, res, next) => {
  console.error("Unexpected request error:", err);

  if (res.headersSent) {
    return next(err);
  }

  const error = "An unexpected error occurred. Please try again.";
  if (req.accepts(["html", "json"]) === "json") {
    return res.status(500).json({ error });
  }

  return res.status(500).render("error.ejs", { error });
});

// ################################### SERVER INIT ##########################################
const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}. http://localhost:${port}`);
});

// if server catch any error on network
server.on("error", (error) => {
  console.error("Server error:", error);
});
