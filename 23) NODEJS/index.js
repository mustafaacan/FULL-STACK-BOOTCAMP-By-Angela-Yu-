import { writeFile, readFile } from "node:fs/promises";

const filePath = new URL("./message.txt", import.meta.url);

async function createFile(message) {
  console.log("New File Creation...");

  try {
    await writeFile(filePath, message);
    console.log("File Created.");
  } catch (err) {
    console.log("File Creation Failed:", err);
  }
}

async function readAFile() {
  console.log("File Reading...");

  try {
    const data = await readFile(filePath, "utf8");
    console.log("Reading Data:", data);
  } catch (err) {
    console.log("File Could not read:", err);
  }
}

await createFile("Hello from Node.js\nMy name is Mustafa");
await readAFile();
