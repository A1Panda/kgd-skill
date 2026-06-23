#!/usr/bin/env node

const path = require("path");
const {
  buildFieldValueList,
  readJsonFile,
} = require("./kgd-common");

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--registry") {
      options.registryPath = next;
      index += 1;
      continue;
    }

    if (current === "--input") {
      options.inputPath = next;
      index += 1;
      continue;
    }

    if (current === "--object") {
      options.objectType = next;
      index += 1;
      continue;
    }
  }

  return options;
}

function printUsage() {
  console.error(
    "用法: node ./scripts/kgd-build-field-value-list.js --registry ./config/kgd-field-registry.example.json --input ./your-order.json --object goods"
  );
}

function main() {
  const { registryPath, inputPath, objectType } = parseArgs(process.argv.slice(2));

  if (!registryPath || !inputPath || !objectType) {
    printUsage();
    process.exit(1);
  }

  const absoluteRegistryPath = path.resolve(process.cwd(), registryPath);
  const absoluteInputPath = path.resolve(process.cwd(), inputPath);

  const registry = readJsonFile(absoluteRegistryPath);
  const inputData = readJsonFile(absoluteInputPath);
  const fieldValueList = buildFieldValueList(registry, inputData, objectType);

  process.stdout.write(`${JSON.stringify(fieldValueList, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
