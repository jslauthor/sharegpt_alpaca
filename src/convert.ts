#!/usr/bin/env node

import * as fs from "fs";
import figlet from "figlet";
import { Command } from "commander";

const commander = new Command();
console.log(figlet.textSync("Converter"));

commander
  .version("1.0.0")
  .description("ShareGPT to Alpaca Converter")
  .option("-i, --input <file>", "Input ShareGPT file")
  .option("-o, --output <file>", "Output Alpaca file")
  .option("-c, --category <name>", "Category name")
  .parse(process.argv);

const options = commander.opts();

if (!options.input || !options.output) {
  console.error("Please provide both input and output file paths.");
  process.exit(1);
}

const inputFilePath = options.input;
const outputFilePath = options.output;
const categoryName = options.category;

try {
  const shareGPTContent = fs.readFileSync(inputFilePath, "utf-8");

  // Convert ShareGPT content to Alpaca format
  const alpacaContent = convertToAlpaca(JSON.parse(shareGPTContent));

  fs.writeFileSync(outputFilePath, alpacaContent);

  console.log("Conversion successful!");
} catch (error) {
  console.error("An error occurred during conversion:", error);
  process.exit(1);
}

function convertToAlpaca(shareGPTContent: any[]): string {
  return JSON.stringify(
    shareGPTContent
      .map((item: any) => {
        if (categoryName != null && item["category"] !== categoryName) {
          // Skip if category name is provided and doesn't match
          return;
        }

        return item["conversations"].reduce((acc: any, conversation: any) => {
          if (conversation["from"] === "system") {
            acc["input"] = conversation["value"];
          }
          if (conversation["from"] === "human") {
            acc["instruction"] = conversation["value"];
          }
          if (conversation["from"] === "gpt") {
            acc["output"] = conversation["value"];
          }

          return acc;
        }, {});
      })
      .filter((item: any) => item != null)
  );
}
