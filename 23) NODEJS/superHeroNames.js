import { randomSuperhero } from "superheroes";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const input = createInterface({
  input: stdin,
  output: stdout,
});

while (true) {
  const answer = await input.question(
    "Press Enter for a superhero or type q to quit: ",
  );

  if (answer.toLowerCase() === "q") {
    console.log("Program closed.");
    break;
  }

  const name = randomSuperhero();
  console.log("The superhero is:", name);
}

input.close();
