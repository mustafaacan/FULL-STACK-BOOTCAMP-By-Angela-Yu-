import axios from "axios";
import express from "express";

/*
In this project, we retrieve data from a third-party API through server-side requests.
For this trial, the  from 

https://www.thecocktaildb.com/api.php 

have been used.For more detailed info please visit the page.
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

app.use(express.static("./public"));

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

// ################# RANDOM DRINK ################
app.get(
  "/random",
  async (req, res, next) => {
    try {
      const url = new URL(
        "https://www.thecocktaildb.com/api/json/v1/1/random.php",
      );
      const result = await axios.get(url);

      if (
        !Array.isArray(result.data.drinks) ||
        result.data.drinks.length === 0
      ) {
        res.locals.error = "Random Drink Could not be found";
      } else {
        res.locals.drink = result.data.drinks[0];
      }
      return next();
    } catch (err) {
      res.locals.error = err.message;
      next();
    }
  },
  renderDrink,
);

// ################################### SERVER INIT ##########################################
const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}. http://localhost:${port}`);
});

// if server catch any error on network
server.on("error", (error) => {
  console.error("Server error:", error);
});
