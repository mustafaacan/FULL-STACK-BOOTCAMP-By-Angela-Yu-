import express from "express";

const app = express();
const port = 3000;
const masterKey = "4VGP2DN-6EWM4SJ-N6FGRHV-Z3PR3TT";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// To simulate the deletion ops.
let temporaryDeletedItems = new Array();
let allItemDeleted = false;

//a middleware to check jokes array is available and at least one element
const verifyJokeList = (req, res, next) => {
  try {
    if (typeof jokes === "undefined") {
      return res.status(500).json({ message: "Joke is not defined" });
    }

    if (!Array.isArray(jokes)) {
      return res.status(500).json({
        message: "Joke does not an Array type, it's type " + typeof jokes,
      });
    }

    if (jokes.length === 0) {
      return res.status(500).json({ message: "Joke Array is empty" });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// To check the incoming ID before use
const verifyJokeId = (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Joke id should be a positive integer.",
    });
  }

  if (temporaryDeletedItems.includes(id) || allItemDeleted) {
    return res.status(404).json({
      message: "Joke already has been temporarily deleted.",
    });
  }

  const joke = jokes.find((item) => item.id === id);

  if (!joke) {
    return res.status(404).json({
      message: "Joke not found.",
    });
  }
  // Found object will be available in request
  // alternatively, we can use res.locals.joke to obtain found object with other middlewares or EJS
  req.joke = joke;

  next();
};

const verifyJokeBody = (req, res, next) => {
  const { text, type } = req.body;
  const isPartialUpdate = req.method === "PATCH";

  // 2 values will be mandatory for Post and Put ops
  if (!isPartialUpdate && (text === undefined || type === undefined)) {
    return res.status(400).json({
      message: 'Request body should include "text" and "type".',
    });
  }

  // For PATCH at least one item should exist
  if (isPartialUpdate && text === undefined && type === undefined) {
    return res.status(400).json({
      message: 'At least one of "text" or "type" should be provided.',
    });
  }

  // check the incoming item's type and value
  if (text !== undefined) {
    if (typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({
        message: "text should be a non-empty string.",
      });
    }
  }

  if (type !== undefined) {
    if (typeof type !== "string" || type.trim() === "") {
      return res.status(400).json({
        message: "type should be a non-empty string.",
      });
    }
  }

  // prepare a clear formatted data for new miidleware / process
  req.updatedBody = {};

  if (text !== undefined) {
    req.updatedBody.jokeText = text.trim();
  }

  if (type !== undefined) {
    req.updatedBody.jokeType = type.trim();
  }

  next();
};

const getAvailableJokes = (req, res, next) => {
  // To check all items have deleted or not.
  if (allItemDeleted) {
    return res.status(404).json({
      message: "All jokes have been temporarily deleted.",
    });
  }

  // Checking if there is any not deleted item by comparing with temporaryDeletedItems array
  const deletedIds = new Set(temporaryDeletedItems); // to remove duplicated items if exist.

  const availableJokes = jokes.filter((joke) => !deletedIds.has(joke.id));

  if (availableJokes.length === 0) {
    // Değişkenin mevcut durumla tutarlı kalmasını sağlar
    allItemDeleted = true;

    return res.status(404).json({
      message: "All jokes have been temporarily deleted.",
    });
  }

  req.availableJokes = availableJokes;

  next();
};

// definition of middleware for General usage
app.use(verifyJokeList);

//1. GET a random joke
// CAUTION: We can manage multiple URLs with using array
app.get(["/", "/random"], getAvailableJokes, (req, res) => {
  const randomIndex = Math.floor(Math.random() * req.availableJokes.length);

  const randomJoke = req.availableJokes[randomIndex];

  return res.status(200).json({
    id: randomJoke.id,
    jokeType: randomJoke.jokeType,
    jokeText: randomJoke.jokeText,
  });
});

//2. GET a specific joke usign verifyJokeId middleware specifically
app.get("/jokes/:id", verifyJokeId, (req, res) => {
  // path should be entered.
  // parameter type should be integer
  // ID will be check from deleted items
  // Gıven ID should be included inside jokes array
  res.status(200).json(req.joke);
});

//3. GET a jokes by filtering on the joke type
app.get("/filter", getAvailableJokes, (req, res) => {
  // empty type, absence of type and case-sensetivity will be accepted as error
  // return will be an array
  const type = req.query.type;

  if (typeof type !== "string" || type.trim() === "") {
    return res.status(400).json({
      message: "A valid type query parameter should be provided.",
    });
  }

  const filteredJokes = req.availableJokes.filter(
    (joke) => joke.jokeType.toLowerCase() === type.trim().toLowerCase(),
  );

  if (filteredJokes.length === 0) {
    return res.status(404).json({
      message: "No active jokes found for the provided type.",
    });
  }

  return res.status(200).json(filteredJokes);
});

//4. POST a new joke
app.post("/jokes", verifyJokeBody, (req, res) => {
  // type and text cannot be empty
  // type and text should be trimmed
  // ID should be assigned automatically. find the latest object's ID and add 1
  const newJoke = {
    id: Math.max(...jokes.map((joke) => joke.id), 0) + 1,
    ...req.updatedBody,
  };
  jokes.push(newJoke);
  // If allItemDeleted = true , it should be changed as false because there is a new active item.
  allItemDeleted = false;
  return res.status(201).json(newJoke);
});

//5. PUT a joke
app.put("/jokes/:id", verifyJokeId, verifyJokeBody, (req, res) => {
  // Updates the found item with new item.
  Object.assign(req.joke, req.updatedBody);
  return res.status(200).json(req.joke);
});

//6. PATCH a joke
app.patch("/jokes/:id", verifyJokeId, verifyJokeBody, (req, res) => {
  // Updates the found item with new item.
  Object.assign(req.joke, req.updatedBody);
  return res.status(200).json(req.joke);
});

//7. DELETE Specific joke
app.delete("/jokes/:id", verifyJokeId, (req, res) => {
  // 1) check the id is integer or not --> Bad Request
  // 2) check the item already deleted or not --> not changed anything code ?? to prevent duplicated cases
  // 3) check the item can be found or not
  // 4) after deletion, add the item id to temporary list
  // 5) after deletion, if there is no any available item, we should update allDeletedItems as true
  temporaryDeletedItems.push(Number(req.params.id));

  // all the items in jokes array matches with deleted item list or not
  allItemDeleted = jokes.every((joke) =>
    temporaryDeletedItems.includes(joke.id),
  );
  if (allItemDeleted) {
    return res.status(200).json({
      message:
        "ID has been temporarily deleted. There is no any remaining active joke !!!",
    });
  }
  return res.status(200).json({
    message: "ID has been temporarily deleted.",
  });
});

//8. DELETE All jokes
// allItemDeleted variable will be true
app.delete("/all", (req, res) => {
  allItemDeleted = true;
  // let temp deleted item array empty and all the ID's should be added inside it.
  temporaryDeletedItems.length = 0;
  temporaryDeletedItems.push(...jokes.map((joke) => joke.id));
  return res.status(200).json({
    message: "All jokes have been temporarily deleted.",
  });
});

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
  console.log(`Successfully started server on port ${port}.`);
});

let jokes = [
  {
    id: 1,
    jokeText:
      "Why don't scientists trust atoms? Because they make up everything.",
    jokeType: "Science",
  },
  {
    id: 2,
    jokeText:
      "Why did the scarecrow win an award? Because he was outstanding in his field.",
    jokeType: "Puns",
  },
  {
    id: 3,
    jokeText:
      "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    jokeType: "Puns",
  },
  {
    id: 4,
    jokeText:
      "What did one ocean say to the other ocean? Nothing, they just waved.",
    jokeType: "Wordplay",
  },
  {
    id: 5,
    jokeText:
      "Why do we never tell secrets on a farm? Because the potatoes have eyes and the corn has ears.",
    jokeType: "Wordplay",
  },
  {
    id: 6,
    jokeText: "How do you organize a space party? You planet!",
    jokeType: "Science",
  },
  {
    id: 7,
    jokeText:
      "Why don't some couples go to the gym? Because some relationships don't work out.",
    jokeType: "Puns",
  },
  {
    id: 8,
    jokeText:
      "Parallel lines have so much in common. It's a shame they'll never meet.",
    jokeType: "Math",
  },
  {
    id: 9,
    jokeText: "What do you call fake spaghetti? An impasta!",
    jokeType: "Food",
  },
  {
    id: 10,
    jokeText: "Why did the tomato turn red? Because it saw the salad dressing!",
    jokeType: "Food",
  },
  {
    id: 11,
    jokeText:
      "What do you get when you cross a snowman and a vampire? Frostbite!",
    jokeType: "Wordplay",
  },
  {
    id: 12,
    jokeText:
      "Why did the golfer bring two pairs of pants? In case he got a hole in one!",
    jokeType: "Sports",
  },
  {
    id: 13,
    jokeText:
      "Why are ghosts bad at lying? Because you can see right through them!",
    jokeType: "Wordplay",
  },
  {
    id: 14,
    jokeText: "Why can't you give Elsa a balloon? Because she will let it go.",
    jokeType: "Movies",
  },
  {
    id: 15,
    jokeText:
      "I'm reading a book about anti-gravity. It's impossible to put down!",
    jokeType: "Science",
  },
  {
    id: 16,
    jokeText:
      "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    jokeType: "Puns",
  },
  {
    id: 17,
    jokeText:
      "What did one ocean say to the other ocean? Nothing, they just waved.",
    jokeType: "Wordplay",
  },
  {
    id: 18,
    jokeText:
      "Why do we never tell secrets on a farm? Because the potatoes have eyes and the corn has ears.",
    jokeType: "Wordplay",
  },
  {
    id: 19,
    jokeText: "How do you organize a space party? You planet!",
    jokeType: "Science",
  },
  {
    id: 20,
    jokeText:
      "Why don't some couples go to the gym? Because some relationships don't work out.",
    jokeType: "Puns",
  },
  {
    id: 21,
    jokeText:
      "Parallel lines have so much in common. It's a shame they'll never meet.",
    jokeType: "Math",
  },
  {
    id: 22,
    jokeText: "What do you call fake spaghetti? An impasta!",
    jokeType: "Food",
  },
  {
    id: 23,
    jokeText: "Why did the tomato turn red? Because it saw the salad dressing!",
    jokeType: "Food",
  },
  {
    id: 24,
    jokeText:
      "What do you get when you cross a snowman and a vampire? Frostbite!",
    jokeType: "Wordplay",
  },
  {
    id: 25,
    jokeText:
      "Why did the golfer bring two pairs of pants? In case he got a hole in one!",
    jokeType: "Sports",
  },
  {
    id: 26,
    jokeText:
      "Why are ghosts bad at lying? Because you can see right through them!",
    jokeType: "Wordplay",
  },
  {
    id: 27,
    jokeText: "Why can't you give Elsa a balloon? Because she will let it go.",
    jokeType: "Movies",
  },
  {
    id: 28,
    jokeText:
      "I'm reading a book about anti-gravity. It's impossible to put down!",
    jokeType: "Science",
  },
  {
    id: 29,
    jokeText:
      "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    jokeType: "Puns",
  },
  {
    id: 30,
    jokeText:
      "What did one ocean say to the other ocean? Nothing, they just waved.",
    jokeType: "Wordplay",
  },
  {
    id: 31,
    jokeText:
      "Why do we never tell secrets on a farm? Because the potatoes have eyes and the corn has ears.",
    jokeType: "Wordplay",
  },
  {
    id: 32,
    jokeText: "How do you organize a space party? You planet!",
    jokeType: "Science",
  },
  {
    id: 33,
    jokeText:
      "Why don't some couples go to the gym? Because some relationships don't work out.",
    jokeType: "Puns",
  },
  {
    id: 34,
    jokeText:
      "Parallel lines have so much in common. It's a shame they'll never meet.",
    jokeType: "Math",
  },
  {
    id: 35,
    jokeText: "What do you call fake spaghetti? An impasta!",
    jokeType: "Food",
  },
  {
    id: 36,
    jokeText: "Why did the tomato turn red? Because it saw the salad dressing!",
    jokeType: "Food",
  },
  {
    id: 37,
    jokeText:
      "What do you get when you cross a snowman and a vampire? Frostbite!",
    jokeType: "Wordplay",
  },
  {
    id: 38,
    jokeText:
      "Why did the golfer bring two pairs of pants? In case he got a hole in one!",
    jokeType: "Sports",
  },
  {
    id: 39,
    jokeText:
      "Why are ghosts bad at lying? Because you can see right through them!",
    jokeType: "Wordplay",
  },
  {
    id: 40,
    jokeText: "Why can't you give Elsa a balloon? Because she will let it go.",
    jokeType: "Movies",
  },
  {
    id: 41,
    jokeText:
      "I'm reading a book about anti-gravity. It's impossible to put down!",
    jokeType: "Science",
  },
  {
    id: 42,
    jokeText:
      "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    jokeType: "Puns",
  },
  {
    id: 43,
    jokeText:
      "What did one ocean say to the other ocean? Nothing, they just waved.",
    jokeType: "Wordplay",
  },
  {
    id: 44,
    jokeText:
      "Why do we never tell secrets on a farm? Because the potatoes have eyes and the corn has ears.",
    jokeType: "Wordplay",
  },
  {
    id: 45,
    jokeText: "How do you organize a space party? You planet!",
    jokeType: "Science",
  },
  {
    id: 46,
    jokeText:
      "Why don't some couples go to the gym? Because some relationships don't work out.",
    jokeType: "Puns",
  },
  {
    id: 47,
    jokeText:
      "Parallel lines have so much in common. It's a shame they'll never meet.",
    jokeType: "Math",
  },
  {
    id: 48,
    jokeText: "What do you call fake spaghetti? An impasta!",
    jokeType: "Food",
  },
  {
    id: 49,
    jokeText: "Why did the tomato turn red? Because it saw the salad dressing!",
    jokeType: "Food",
  },
  {
    id: 50,
    jokeText:
      "What do you get when you cross a snowman and a vampire? Frostbite!",
    jokeType: "Wordplay",
  },
  {
    id: 51,
    jokeText:
      "Why did the golfer bring two pairs of pants? In case he got a hole in one!",
    jokeType: "Sports",
  },
  {
    id: 52,
    jokeText:
      "Why are ghosts bad at lying? Because you can see right through them!",
    jokeType: "Wordplay",
  },
  {
    id: 53,
    jokeText: "Why can't you give Elsa a balloon? Because she will let it go.",
    jokeType: "Movies",
  },
  {
    id: 54,
    jokeText:
      "I'm reading a book about anti-gravity. It's impossible to put down!",
    jokeType: "Science",
  },
  {
    id: 55,
    jokeText:
      "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    jokeType: "Puns",
  },
  {
    id: 56,
    jokeText:
      "What did one ocean say to the other ocean? Nothing, they just waved.",
    jokeType: "Wordplay",
  },
  {
    id: 57,
    jokeText:
      "Why do we never tell secrets on a farm? Because the potatoes have eyes and the corn has ears.",
    jokeType: "Wordplay",
  },
  {
    id: 58,
    jokeText: "How do you organize a space party? You planet!",
    jokeType: "Science",
  },
  {
    id: 59,
    jokeText:
      "Why don't some couples go to the gym? Because some relationships don't work out.",
    jokeType: "Puns",
  },
  {
    id: 60,
    jokeText:
      "Parallel lines have so much in common. It's a shame they'll never meet.",
    jokeType: "Math",
  },
  {
    id: 61,
    jokeText: "What do you call fake spaghetti? An impasta!",
    jokeType: "Food",
  },
  {
    id: 62,
    jokeText: "Why did the tomato turn red? Because it saw the salad dressing!",
    jokeType: "Food",
  },
  {
    id: 63,
    jokeText:
      "What do you get when you cross a snowman and a vampire? Frostbite!",
    jokeType: "Wordplay",
  },
  {
    id: 64,
    jokeText:
      "Why did the golfer bring two pairs of pants? In case he got a hole in one!",
    jokeType: "Sports",
  },
  {
    id: 65,
    jokeText:
      "Why are ghosts bad at lying? Because you can see right through them!",
    jokeType: "Wordplay",
  },
  {
    id: 66,
    jokeText: "Why can't you give Elsa a balloon? Because she will let it go.",
    jokeType: "Movies",
  },
  {
    id: 67,
    jokeText:
      "I'm reading a book about anti-gravity. It's impossible to put down!",
    jokeType: "Science",
  },
  {
    id: 68,
    jokeText:
      "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    jokeType: "Puns",
  },
  {
    id: 69,
    jokeText:
      "What did one ocean say to the other ocean? Nothing, they just waved.",
    jokeType: "Wordplay",
  },
  {
    id: 70,
    jokeText:
      "Why do we never tell secrets on a farm? Because the potatoes have eyes and the corn has ears.",
    jokeType: "Wordplay",
  },
  {
    id: 71,
    jokeText: "How do you organize a space party? You planet!",
    jokeType: "Science",
  },
  {
    id: 72,
    jokeText:
      "Why don't some couples go to the gym? Because some relationships don't work out.",
    jokeType: "Puns",
  },
  {
    id: 73,
    jokeText:
      "Parallel lines have so much in common. It's a shame they'll never meet.",
    jokeType: "Math",
  },
  {
    id: 74,
    jokeText: "What do you call fake spaghetti? An impasta!",
    jokeType: "Food",
  },
  {
    id: 75,
    jokeText: "Why did the tomato turn red? Because it saw the salad dressing!",
    jokeType: "Food",
  },
  {
    id: 76,
    jokeText:
      "What do you get when you cross a snowman and a vampire? Frostbite!",
    jokeType: "Wordplay",
  },
  {
    id: 77,
    jokeText:
      "Why did the golfer bring two pairs of pants? In case he got a hole in one!",
    jokeType: "Sports",
  },
  {
    id: 78,
    jokeText:
      "Why are ghosts bad at lying? Because you can see right through them!",
    jokeType: "Wordplay",
  },
  {
    id: 79,
    jokeText: "Why can't you give Elsa a balloon? Because she will let it go.",
    jokeType: "Movies",
  },
  {
    id: 80,
    jokeText:
      "I'm reading a book about anti-gravity. It's impossible to put down!",
    jokeType: "Science",
  },
  {
    id: 81,
    jokeText:
      "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    jokeType: "Puns",
  },
  {
    id: 82,
    jokeText:
      "What did one ocean say to the other ocean? Nothing, they just waved.",
    jokeType: "Wordplay",
  },
  {
    id: 83,
    jokeText:
      "Why do we never tell secrets on a farm? Because the potatoes have eyes and the corn has ears.",
    jokeType: "Wordplay",
  },
  {
    id: 84,
    jokeText: "How do you organize a space party? You planet!",
    jokeType: "Science",
  },
  {
    id: 85,
    jokeText:
      "Why don't some couples go to the gym? Because some relationships don't work out.",
    jokeType: "Puns",
  },
  {
    id: 86,
    jokeText:
      "Parallel lines have so much in common. It's a shame they'll never meet.",
    jokeType: "Math",
  },
  {
    id: 87,
    jokeText: "What do you call fake spaghetti? An impasta!",
    jokeType: "Food",
  },
  {
    id: 88,
    jokeText: "Why did the tomato turn red? Because it saw the salad dressing!",
    jokeType: "Food",
  },
  {
    id: 89,
    jokeText:
      "What do you get when you cross a snowman and a vampire? Frostbite!",
    jokeType: "Wordplay",
  },
  {
    id: 90,
    jokeText:
      "Why did the golfer bring two pairs of pants? In case he got a hole in one!",
    jokeType: "Sports",
  },
  {
    id: 91,
    jokeText:
      "Why are ghosts bad at lying? Because you can see right through them!",
    jokeType: "Wordplay",
  },
  {
    id: 92,
    jokeText: "Why can't you give Elsa a balloon? Because she will let it go.",
    jokeType: "Movies",
  },
  {
    id: 93,
    jokeText:
      "I'm reading a book about anti-gravity. It's impossible to put down!",
    jokeType: "Science",
  },
  {
    id: 94,
    jokeText:
      "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    jokeType: "Puns",
  },
  {
    id: 95,
    jokeText:
      "What did one ocean say to the other ocean? Nothing, they just waved.",
    jokeType: "Wordplay",
  },
  {
    id: 96,
    jokeText:
      "Why do we never tell secrets on a farm? Because the potatoes have eyes and the corn has ears.",
    jokeType: "Wordplay",
  },
  {
    id: 97,
    jokeText: "How do you organize a space party? You planet!",
    jokeType: "Science",
  },
  {
    id: 98,
    jokeText:
      "Why don't some couples go to the gym? Because some relationships don't work out.",
    jokeType: "Puns",
  },
  {
    id: 99,
    jokeText:
      "Parallel lines have so much in common. It's a shame they'll never meet.",
    jokeType: "Math",
  },
  {
    id: 100,
    jokeText: "What do you call fake spaghetti? An impasta!",
    jokeType: "Food",
  },
];
