const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Directories to scan for components
const COMPONENT_DIRS = ["components/shared", "components/ui"];

// Directories to scan for usage
const SEARCH_DIRS = ["app", "components"];

function findComponents() {
  let components = [];
  COMPONENT_DIRS.forEach((dir) => {
    const files = glob.sync(`${dir}/**/*.{jsx,tsx}`);
    components = [...components, ...files];
  });
  return components;
}

function findUsages(componentPath) {
  const componentName = path.basename(
    componentPath,
    path.extname(componentPath)
  );
  let usageCount = 0;

  SEARCH_DIRS.forEach((dir) => {
    const files = glob.sync(`${dir}/**/*.{js,jsx,ts,tsx}`);
    files.forEach((file) => {
      if (file === componentPath) return; // Skip the component file itself

      const content = fs.readFileSync(file, "utf8");
      if (
        content.includes(`/${componentName}'`) ||
        content.includes(`/${componentName}"`) ||
        content.includes(`<${componentName}`) ||
        content.includes(`${componentName}.`)
      ) {
        usageCount++;
      }
    });
  });

  return usageCount;
}

function main() {
  const components = findComponents();
  const unused = [];

  components.forEach((component) => {
    const usages = findUsages(component);
    if (usages === 0) {
      unused.push(component);
    }
  });

  console.log("\nUnused Components:");
  console.log("=================");
  if (unused.length === 0) {
    console.log("No unused components found!");
  } else {
    unused.forEach((component) => {
      console.log(`- ${component}`);
    });
  }
}

main();
