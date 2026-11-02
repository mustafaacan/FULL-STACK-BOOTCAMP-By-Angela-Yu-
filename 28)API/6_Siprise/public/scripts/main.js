const form = document.querySelector("#drink-form");
const safeURL = (value) => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

if (form) {
  const status = document.querySelector("#drink-status");
  const result = document.querySelector("#drink-result");
  const button = form.querySelector("button");
  const showErrorPage = (code, message) => {
    const params = new URLSearchParams({ status: String(code), message });
    window.location.assign(`/error?${params}`);
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    form.setAttribute("aria-busy", "true");
    result.hidden = true;
    status.textContent = "Finding something worth a sip…";
    let stage = "request";
    let response;
    const serverErrorMessage = (code) =>
      code === 504
        ? "The drink service took too long to respond. Please try again."
        : "The drink service is unavailable. Please try again.";
    try {
      response = await fetch(`/${form.elements.category.value}`, {
        headers: { Accept: "application/json" },
      });
      stage = "response";
      const drink = await response.json();
      if (!response.ok) {
        const message =
          typeof drink?.error === "string" && drink.error.trim()
            ? drink.error
            : serverErrorMessage(response.status);
        showErrorPage(response.status, message);
        return;
      }
      if (
        !drink ||
        typeof drink.name !== "string" ||
        typeof drink.desc !== "string" ||
        !Array.isArray(drink.ingreds) ||
        !drink.ingreds.every(
          (item) =>
            item &&
            typeof item.ingredient === "string" &&
            typeof item.measure === "string",
        )
      ) {
        throw new Error("Invalid drink response");
      }
      stage = "render";
      document.querySelector("#drink-name").textContent = drink.name;
      document.querySelector("#drink-instructions").textContent = drink.desc;
      const ingredients = document.querySelector("#drink-ingredients");
      ingredients.replaceChildren();
      for (const item of drink.ingreds) {
        const row = document.createElement("li");
        const name = document.createElement("span");
        const measure = document.createElement("span");
        name.textContent = item.ingredient;
        measure.textContent = item.measure;
        row.append(name, measure);
        ingredients.append(row);
      }
      if (!drink.ingreds.length) {
        const row = document.createElement("li");
        row.textContent = "Ingredients are not available for this drink.";
        ingredients.append(row);
      }
      const image = document.querySelector("#drink-image");
      const placeholder = document.querySelector("#image-placeholder");
      const imageURL = safeURL(drink.image);
      image.hidden = !imageURL;
      placeholder.hidden = Boolean(imageURL);
      image.onerror = () => {
        image.hidden = true;
        placeholder.hidden = false;
      };
      image.alt = drink.name;
      if (imageURL) image.src = imageURL;
      else image.removeAttribute("src");
      const video = document.querySelector("#drink-video");
      const videoURL = safeURL(drink.video);
      video.hidden = !videoURL;
      if (videoURL) video.href = videoURL;
      else video.removeAttribute("href");
      result.hidden = false;
      status.textContent =
        "Your drink is served. Discover another whenever you like.";
      document.querySelector("#drink-name").focus({ preventScroll: true });
      result.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    } catch (error) {
      console.error(`Drink ${stage} failed:`, error);
      if (stage === "request") {
        status.textContent =
          "Unable to reach the server. Please check your connection and try again.";
      } else if (stage === "response") {
        showErrorPage(
          response.ok ? 502 : response.status,
          response.ok
            ? "The server returned an invalid response. Please try again."
            : serverErrorMessage(response.status),
        );
      } else {
        showErrorPage(
          500,
          "An unexpected error occurred while displaying your drink. Please try again.",
        );
      }
    } finally {
      button.disabled = false;
      form.removeAttribute("aria-busy");
    }
  });
  window.addEventListener("pageshow", () => {
    button.disabled = false;
    form.removeAttribute("aria-busy");
    if (result.hidden)
      status.textContent = "Your next favorite is one pour away.";
  });
}
