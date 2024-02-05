#!/usr/bin/env node

import * as fs from "fs";
import figlet from "figlet";
import { Command } from "commander";
import { parse } from "csv-parse";
import format from "string-template";

const commander = new Command();
console.log(figlet.textSync("AI Dataset"));

commander
  .version("1.0.0")
  .description("CSV to OpenAI Conversation Format Converter")
  .option("-t, type <csv>", "Type to convert", "csv")
  .option("-i, --input <file>", "Input CSV file")
  .option("-o, --output <file>", "OpenAI Conversation JSON", "output.json")
  .option(
    "-f, --format <conversational or instructional>",
    "OpenAI Fine-tuning Format Type",
    "conversational"
  )
  .option("-c, --config <file>", "Configure CSV mappings to prompts")
  .parse(process.argv);

const options = commander.opts();

if (!options.input || !options.config) {
  console.error("Please provide both input and config file paths.");
  process.exit(1);
}

function percentageFormatter(num: number) {
  return `${parseFloat(String(num)).toFixed(2)}%`;
}

function countFileLines(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let lineCount = 0;
    fs.createReadStream(filePath)
      .on("data", (chunk) => {
        for (let i = 0; i < chunk.length; ++i) if (chunk[i] == 10) lineCount++;
      })
      .on("end", () => {
        resolve(lineCount);
      })
      .on("error", reject);
  });
}

const run = async () => {
  const inputFilePath = options.input;
  const outputFilePath = options.output;
  let totalLines = await countFileLines(inputFilePath);
  let currentCount = 0;

  type Config = {
    system: string;
    user: string;
    assistant: string;
  };

  try {
    // Delete the file
    if (fs.existsSync(outputFilePath) === true) {
      fs.unlinkSync(outputFilePath);
    }
    fs.writeFileSync(outputFilePath, "");

    const configContent: Config = JSON.parse(
      fs.readFileSync(options.config, "utf-8")
    );
    const fileContent = fs.readFileSync(inputFilePath, "utf-8");

    const parser = parse(fileContent, {
      delimiter: ",",
      columns: true,
    });

    parser.on("readable", function () {
      let record;
      while ((record = parser.read()) !== null) {
        const row = {
          messages: [
            { role: "system", content: format(configContent.system, record) },
            { role: "user", content: format(configContent.user, record) },
            {
              role: "assistant",
              content: format(configContent.assistant, record),
            },
          ],
        };
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(
          `Processing Record ${++currentCount} of ${totalLines} (${percentageFormatter(
            (currentCount / totalLines) * 100
          )})`
        );
        fs.appendFileSync(
          outputFilePath,
          "  " + JSON.stringify(row) + (currentCount < totalLines ? "\n" : "")
        );
      }
    });

    // Catch any error
    parser.on("error", function (err) {
      console.error(`Error parsing ${options.type}`, err.message);
      process.exit(1);
    });

    parser.on("end", function () {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      console.log("Conversion successful!");
      process.exit(0);
    });
  } catch (error) {
    console.error("An error occurred during conversion:", error);
    process.exit(1);
  }
};

run();
