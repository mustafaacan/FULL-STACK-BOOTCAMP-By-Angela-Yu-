/*
The selected user is carried between requests with the `user` URL parameter.
Temporary success and error messages use the `message` parameter. After EJS
renders the message, the browser removes only `message` from the address with
history.replaceState(), while keeping the selected user in the URL.
*/

import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

// DIKKAT : URL ler için hangi methodların allowed olduklarını belirten yapıları kurman gerekiyor.

// DİKKAT EDİLECEK BAZI HUSUSLAR
// KULLANICI eklemenin bir sınırı olmalı mesela 7. kontrol için statüsü bir olan tüm kullanıcıların sayısını versin
// kullanıcı seçerken rengini de alıyoruz zaten
// kullanıcı silme olanağı da olmalı ve uyarı vermeli. bu yüzden kullanıcıları çekerken statüsü 1 olanları almak lazım
// (opsiyonel) ülke çıkarma olayı da olsun
// DB operasyonları hep aynı olacağı için bir tane genel fonksiyon olsun, diğer fonksiyonlar bu fonksiyona query yollasınlar.
// Bu ana fonksiyon tüm kontrolleri yapsın. sistem dönütlerini versin
// Önceki kodlardan işimize yaraynları kullanıcaz.
// (Opsiyonel) bir hata sayfası da olsun olası bir hatada index.ejs yerine bunu yollasın
// Dikkat: işlemler sırasında kullanıcı ID si global olarak tutulsun ki her işlemde onu kullanalım.
// Yeni kullanıcı ekledikten sonra onun ID sini globale çekmeyi unutma.
// kullanıcı silindikten sonra ilk gelen kullanıcıya yönlendir. eğer silinecek kullanıcı yoksa (en az 1 tane kullanıcı olmalı)
// remove disable olmalı. yeni bir kullanıcı eklendiğinde her zaman remove tuşu aktif oluyor olmalı

// ADD Member yazısının yanında sayaç olsun. max yedi olucak şuan kaç tane varsa onu da düşsün ve ekleme yapılabilecek sayıyı versin
// örnek Add Family Member (5). Her silme işleminden sonra sayıyı arttırmayı unutma.

const app = express();
const port = 3000;

// DIKKAT : URL ler için hangi methodların allowed olduklarını belirten yapıları kurman gerekiyor.

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Maximum 7 users can be added
const MAX_USERS = 3;
const ALLOWED_COLORS = new Set([
  "green",
  "yellow",
  "olive",
  "orange",
  "teal",
  "blue",
  "violet",
  "purple",
  "pink",
]);

// ############################### Redirect to Home #################################
// Carries the user id and message if exist
// after the process, message will be removed from URL by history.replaceState on index.ejs
const redirectToHome = (res, { message = "", userId = null } = {}) => {
  const params = new URLSearchParams();

  if (userId !== null) {
    params.set("user", String(userId));
  }

  if (message) {
    params.set("message", message);
  }

  const query = params.toString();
  return res.redirect(query ? `/?${query}` : "/");
};

// ######################################  DB OPS #############################################

const executeQuery = async (sqlScript, values = []) => {
  const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "World",
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
    await db.end();
  }
};

const createMember = async (name, color) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const result = await executeQuery(
    "INSERT INTO members (name, color) VALUES ($1, $2) RETURNING *;",
    [name, color],
  );
  // success (boolean) and (data or error)
  return result;
};

const getMember = async () => {
  const result = await executeQuery("select * from members where status=1;");
  // success (boolean) and (data or error)
  return result;
};

const checkVisited = async (id) => {
  const result = await executeQuery(
    "SELECT country_code FROM visited_countries where member_id = $1;",
    [id],
  );
  // success (boolean) and (data or error)
  return result;
};

const addNewCountry = async (country, user) => {
  const result = await executeQuery(
    "INSERT INTO visited_countries (country_code, member_id) VALUES ($1, $2) RETURNING *;",
    [country, user],
  );
  // success (boolean) and (data or error)
  return result;
};

const deleteUser = async (userID) => {
  const result = await executeQuery(
    "UPDATE members SET status = 0 WHERE id = $1 RETURNING name, status;",
    [userID],
  );
  // success (boolean) and (data or error)
  return result;
};

// ########################################## Middleware ##############################################

const loadUsers = async (req, res, next) => {
  const result = await getMember();

  if (!result.success) {
    console.error(result.error);

    req.users = [];
    req.remainingUserSlots = 0;
    req.userLoadFailed = true;

    res.locals.users = [];
    res.locals.maxUser = 0;
    res.locals.error = "(Middleware) Users information could not obtained.";

    return next();
  }

  req.users = result.data;
  req.remainingUserSlots = Math.max(MAX_USERS - result.data.length, 0);
  req.userLoadFailed = false;

  res.locals.users = req.users;
  res.locals.maxUser = req.remainingUserSlots;
  res.locals.error = "";

  next();
};

app.use(loadUsers);

// ####################################### ROUTES ###########################################

// ################################### INDEX ##########################################
app.get("/", async (req, res) => {
  if (req.query.message) {
    res.locals.error = String(req.query.message);
  }

  if (req.userLoadFailed) {
    return res.render("index.ejs", {
      countries: [],
      total: 0,
      color: "teal",
      currentUserId: "",
    });
  }

  if (req.users.length === 0) {
    return res.redirect("/new");
  }

  const requestedUserId = Number(req.query.user);
  let currentUser = req.users.find((user) => user.id === requestedUserId);

  if (!currentUser) {
    currentUser = req.users[0];
  }

  const selectedColor = ALLOWED_COLORS.has(currentUser.color)
    ? currentUser.color
    : "teal";

  const visitedCountries = await checkVisited(currentUser.id);

  if (!visitedCountries.success) {
    console.error(visitedCountries.error);
    res.locals.error =
      "(Index) User's country information could not be obtained.";

    return res.render("index.ejs", {
      countries: [],
      total: 0,
      color: selectedColor,
      currentUserId: currentUser.id,
    });
  }

  const countries = visitedCountries.data.map((item) => item.country_code);

  res.render("index.ejs", {
    countries,
    total: countries.length,
    color: selectedColor,
    currentUserId: currentUser.id,
  });
});

// ######################################## POST /add #######################################
// ADD country for the selected user
app.post("/add", async (req, res) => {
  if (req.userLoadFailed) {
    return redirectToHome(res, {
      message: "(POST /add) User Info could not be obtained",
    });
  }

  const requestedUserId = Number(req.body.user);
  const currentUser = req.users.find((user) => user.id === requestedUserId);

  if (!currentUser) {
    return redirectToHome(res, {
      message: "(POST /add) The country could not be added to user",
    });
  }

  const country = req.body.country?.trim().toUpperCase() ?? "";

  if (!allCountryCodes.includes(country)) {
    return redirectToHome(res, {
      message:
        "(POST /add) Please Enter a valid country code (RU, CA, US etc.)",
      userId: currentUser.id,
    });
  }

  const result = await addNewCountry(country, currentUser.id);

  if (!result.success) {
    console.error(result.error);

    if (result.error?.code === "23505") {
      return redirectToHome(res, {
        message: `(POST /add) User already has the country ${country}`,
        userId: currentUser.id,
      });
    }

    return redirectToHome(res, {
      message: "(POST /add) ERROR while adding the country. Please check logs",
      userId: currentUser.id,
    });
  }

  return redirectToHome(res, {
    message: "(POST /add) The country added successfully.",
    userId: currentUser.id,
  });
});

// ##################################### POST /user ########################################
// Select the user and gather the related country info
app.post("/user", (req, res) => {
  if (req.userLoadFailed) {
    return redirectToHome(res, {
      message: "(POST /user) User information could not be loaded.",
    });
  }

  if (req.body.add === "new") {
    return res.redirect("/new");
  }

  if (req.body.delete === "delete") {
    const currentUserId = Number(req.body.currentUser);
    return res.redirect(`/delete?user=${currentUserId}`);
  }

  const requestedUserId = Number(req.body.user);

  if (!Number.isInteger(requestedUserId)) {
    return redirectToHome(res, {
      message: "(POST /user) Please select a valid user.",
    });
  }

  const selectedUser = req.users.find((user) => user.id === requestedUserId);

  if (!selectedUser) {
    return redirectToHome(res, {
      message: "(POST /user) The selected user could not be found.",
    });
  }

  return redirectToHome(res, { userId: selectedUser.id });
});

// ######################################## GET /delete #######################################
app.get("/delete", (req, res) => {
  if (req.userLoadFailed) {
    return redirectToHome(res, {
      message: "(GET /delete) User information could not be loaded.",
    });
  }

  if (req.users.length <= 0) {
    return redirectToHome(res, {
      message: "(GET /delete) There is no any user to delete",
    });
  }

  const requestedUserId = Number(req.query.user);
  if (!Number.isInteger(requestedUserId || requestedUserId <= 0)) {
    return redirectToHome(res, {
      message: "(GET /delete) Please select a valid user.",
    });
  }
  const selectedUser = req.users.find((user) => user.id === requestedUserId);
  if (!selectedUser) {
    return redirectToHome(res, {
      message: "(GET /delete) The selected user could not be found.",
    });
  }

  return res.render("delete.ejs", { user: selectedUser });
});

// ################################# POST /delete ##############################################

app.post("/delete", async (req, res) => {
  // cancel option
  const selection = req.body.delete ? req.body.delete.trim().toLowerCase() : "";

  if (selection !== "delete" && selection !== "cancel") {
    return redirectToHome(res, {
      message:
        "(POST /delete) There is no any delete selection (delete or cancel)",
    });
  }

  if (selection === "cancel") {
    return redirectToHome(res, {
      message: "(POST /delete) User deletion has cancelled.",
      userId: req.body.userId,
    });
  }
  // Delete option
  if (selection === "delete") {
    if (req.userLoadFailed) {
      return redirectToHome(res, {
        message: "(POST /delete) User Info could not be obtained",
      });
    }

    if (req.users.length === 0) {
      return redirectToHome(res, {
        message: "(POST /delete) There is no any user to delete.",
      });
    }

    const requestedUserId = Number(req.body.userId);
    if (!Number.isInteger(requestedUserId)) {
      return redirectToHome(res, {
        message: "(POST /delete) Please select a valid user.",
      });
    }

    const selectedUser = req.users.find((user) => user.id === requestedUserId);
    if (!selectedUser) {
      return redirectToHome(res, {
        message: "(POST /delete) The selected user could not be found.",
      });
    }

    const result = await deleteUser(selectedUser.id);

    if (!result.success) {
      console.log(result.error);
      return redirectToHome(res, {
        message:
          "(POST /delete) Error while deletion. Please check the console logs",
      });
    }

    if (result.data.length === 0) {
      return redirectToHome(res, {
        message: "(POST /delete) User could not be found in database.",
      });
    }

    return redirectToHome(res, {
      message: `(POST /delete) The user ${result.data[0].name} has been deleted (current status ${result.data[0].status})`,
    });
  }

  return redirectToHome(res, {
    message: "(POST /delete) Unexpected error. please see the console logs.",
  });
});

// ##################################### GET /new #########################################
// To redirect /new route
app.get("/new", (req, res) => {
  if (req.userLoadFailed) {
    return redirectToHome(res, {
      message: "(GET /new) User information could not be loaded.",
    });
  }

  if (req.remainingUserSlots === 0) {
    return redirectToHome(res, {
      message: "(GET /new) The maximum number of users has been reached.",
    });
  }

  return res.render("new.ejs");
});

// ########################################## POST /new ######################################
// Adding new user
app.post("/new", async (req, res) => {
  if (req.userLoadFailed) {
    return redirectToHome(res, {
      message: "(POST /new) User information could not be loaded.",
    });
  }

  if (req.remainingUserSlots === 0) {
    return redirectToHome(res, {
      message: "(POST /new) The maximum number of users has been reached.",
    });
  }

  const name = req.body.name?.trim() ?? "";
  const color = req.body.color?.trim() ?? "";

  if (!name || !color) {
    return redirectToHome(res, {
      message: "(POST /new) Please enter a name and select a color.",
    });
  }

  if (!ALLOWED_COLORS.has(color)) {
    return redirectToHome(res, {
      message: "(POST /new) Please select a valid color.",
    });
  }

  const newMember = await createMember(name, color);

  if (!newMember.success) {
    console.error(newMember.error);

    if (newMember.error?.code === "23505") {
      return redirectToHome(res, {
        message: "(POST /new) A user with this information already exists.",
      });
    }

    return redirectToHome(res, {
      message: "(POST /new) The new user could not be created.",
    });
  }

  return redirectToHome(res, {
    message: "(POST /new) The new user was added successfully.",
    userId: newMember.data[0].id,
  });
});

// port listener
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// User can add only these countries
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
