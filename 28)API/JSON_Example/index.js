import express from "express";
import bodyParser from "body-parser";
import fs from "fs";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// To import the JSON file inside index.js
const recipeJSON = fs.readFileSync(
  new URL("./recipe.json", import.meta.url),
  "utf-8",
);

// JS Object conversion
const recipes = JSON.parse(recipeJSON);

const findTargetTaco = (target) => {
  return recipes.find(
    (recipe) =>
      recipe.ingredients.protein.name.toLowerCase() === target.toLowerCase(),
  );
};

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post("/recipe", (req, res) => {
  // Finding the correct taco recipe
  const taco = findTargetTaco(req.body["choice"]);

  // Rendering object prep.
  const obj = {
    name: taco.name,
    proteinName: taco.ingredients.protein.name,
    preparation: taco.ingredients.protein.preparation,
    salsaName: taco.ingredients.salsa.name,
  };

  obj["topping"] = taco.ingredients.toppings.map((element) => {
    return element.quantity + " of " + element.name;
  });

  res.render("index.ejs", { obj });
});

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
