import axios from "axios";
import express from "express";

/*
In this project, we retrieve data from a third-party API through server-side requests.
For this trial, the  from 

https://www.thecocktaildb.com/api.php 

have been used.For more detailed info please visit the page.
 */

/*
ALL THE NEEDED URL

Random --> www.thecocktaildb.com/api/json/v1/1/random.php
Alcholic --> www.thecocktaildb.com/api/json/v1/1/filter.php?a=Alcoholic
Non-Alcholic --> www.thecocktaildb.com/api/json/v1/1/filter.php?a=Non_Alcoholic
Ordinary Drink --> www.thecocktaildb.com/api/json/v1/1/filter.php?c=Ordinary_Drink
coctail --> www.thecocktaildb.com/api/json/v1/1/filter.php?c=Cocktail

 */

/*
REQUIRED CASES
1) for probably error, we may use an error template
2) common middlewares
3) common routes structure for similar cases
4) There should be also A MIDDLEWARE that handle the requested api and responses
5) Chack the missing parts
6) Add the allowed method limitor to prevent unwanted methods for the routes
7) On the index page, we can mention about the https://www.thecocktaildb.com/api.php  also on the footer tab
8) Be sure that the necessary global variables defined such URLs
9) Possible Server error should be analyzed more detailed.
 */

const app = express();
const port = 3000;
const timeOut = 5000;

app.use(express.static("./public"));

// ################# COMMON URLS ################

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

const fetchDrink = (category) => {
  return async (req, res, next) => {
    try {
      // requesting according to category
      const url = BASE_URL + endpoints[category];
      const result = await axios.get(url, { timeout: timeOut });
      if (
        !Array.isArray(result.data.drinks) ||
        result.data.drinks.length === 0
      ) {
        res.locals.error = "Drink list is Empty";
        return next();
      } else {
        if (category === "random") {
          if (!result.data.drinks[0]) {
            res.locals.error = "Drink could not be obtained";
            return next();
          }
          res.locals.drink = result.data.drinks[0];
          return next();
        }

        // selecting random drink id
        const drinks = result.data.drinks;
        const randomIndex = Math.floor(Math.random() * drinks.length);
        const randomDrink = drinks[randomIndex];
        const drinkId = randomDrink?.idDrink;
        if (!drinkId) {
          res.locals.error = "Drink ID could not be obtained";
          return next();
        }
        // drink detail according to ID
        const detailURL = BASE_URL + endpoints["detail"] + drinkId;
        const details = await axios.get(detailURL, { timeout: timeOut });
        if (!Array.isArray(details.data.drinks) || !details.data.drinks[0]) {
          res.locals.error = "Drink Info could not be obtained";
          return next();
        }
        res.locals.drink = details.data.drinks[0];
        return next();
      }
    } catch (err) {
      res.locals.error = err.message;
      return next();
    }
  };
};

// ################# (MIDDLEWARE) FOR DATA RENDER ################
// Caution: will be used after related routes
const renderDrink = (req, res) => {
  if (res.locals.error !== undefined) {
    return res.render("error.ejs");
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

      return {
        ingredient: res.locals.drink[key]?.trim() ?? "",
        measure:
          res.locals.drink[`strMeasure${number}`]?.trim() || "Not specified",
      };
    })
    .filter((item) => item.ingredient !== "");

  const drink = {
    name: res.locals.drink.strDrink ?? "Unknown",
    image: res.locals.drink.strDrinkThumb ?? "",
    video: res.locals.drink.strVideo ?? "",
    desc: res.locals.drink.strInstructions ?? "There is no Instructions",
    ingreds: ingredients,
  };

  res.status(200).json(drink); // MISSING
};

// ################################### ROUTES ##############################################

// ################# INDEX  ######################
app.get("/", (req, res) => {
  res.render("index.ejs"); // MISSING
});

// ################# Alcholic DRINK ################
app.get("/alcoholic", fetchDrink("alcoholic"), renderDrink);

// ################# Non-Alcholic DRINK ################
app.get("/non-alcoholic", fetchDrink("nonAlcoholic"), renderDrink);

// ################# Ordinary DRINK ################
app.get("/ordinary-drink", fetchDrink("ordinaryDrink"), renderDrink);

// ################# Non - Ordinary RANDOM DRINK ################
app.get("/cocktail", fetchDrink("cocktail"), renderDrink);

// ################# RANDOM DRINK ################
app.get("/random", fetchDrink("random"), renderDrink);

// ################################### SERVER INIT ##########################################
const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}. http://localhost:${port}`);
});

// if server catch any error on network
server.on("error", (error) => {
  console.error("Server error:", error);
});
