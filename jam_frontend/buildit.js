const fs = require("fs");
const path = require("path");
const nunjucks = require("nunjucks");
const matter = require("gray-matter");

// Get the delete and compress flags from command line arguments
const args = process.argv.slice(2);
const deleteDestFolder = args.includes("delete");
const compressAssets = args.includes("compress");
const environment = args.includes("prod") ? "production" : "local";

// Load environment variables
const getEnvConfig = require("./_data/env.js");
const env = getEnvConfig(environment);
console.log(env);

const getapiData = require("./_data/api.js");
let apiData;
(async () => {
  try {
    apiData = await getapiData(); // Call getapiData asynchronously
  } catch (error) {
    console.error("Error fetching API data:", error);
  }
})();

// Console log the build type and API URL
console.log(`Build type: ${environment}`);
console.log(`API URL: ${env.API_URL}`);

// Define the source folder, includes folder, destination base folder, and assets folder
const sourceFolder = "./_source"; // Change this to your source folder path
const includesFolder = "./_includes"; // Change this to your includes folder path
const destBaseFolder = "./_site"; // Change this to your destination base folder path
const assetsFolder = "./_source/assets"; // Change this to your assets folder path

// Setup Nunjucks environment
nunjucks.configure([sourceFolder, includesFolder], {
  autoescape: false, // Disable autoescape
  noCache: true,
});

// Function to delete the destination base folder
function deleteFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const currentPath = path.join(folderPath, file);
      if (fs.lstatSync(currentPath).isDirectory()) {
        deleteFolder(currentPath);
      } else {
        fs.unlinkSync(currentPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

if (deleteDestFolder) {
  deleteFolder(destBaseFolder);
}

// Ensure the destination base folder exists
if (!fs.existsSync(destBaseFolder)) {
  fs.mkdirSync(destBaseFolder, { recursive: true });
}

// Function to copy directories
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  fs.readdirSync(src).forEach((item) => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Copy the assets directory if it exists
if (fs.existsSync(assetsFolder)) {
  const destAssetsFolder = path.join(destBaseFolder, "assets");
  copyDirectory(assetsFolder, destAssetsFolder);
  console.log(`Successfully copied assets folder to ${destAssetsFolder}`);
}

// Function to generate paginated content or single page content
async function generateContent(
  dataArray,
  size,
  alias,
  permalinkTemplate,
  layout,
  env,
  outputFolders,
  isIndexFile
) {
  if (dataArray && dataArray.length > 0) {
    // Paginated content generation
    const totalPages = Math.ceil(dataArray.length / size);
    for (let i = 0; i < totalPages; i++) {
      const pageData = dataArray.slice(i * size, (i + 1) * size);

      const pageContent = nunjucks.renderString(layout, {
        ...env,
        [alias]: pageData,
      });

      for (let j = 0; j < pageData.length; j++) {
        const permalink = nunjucks.renderString(permalinkTemplate, {
          [alias]: pageData[j],
        });

        for (const outputFolder of outputFolders) {
          const outputPath = path.join(
            destBaseFolder,
            outputFolder,
            permalink,
            "index.html"
          );
          const outputDir = path.dirname(outputPath);

          await fs.promises.mkdir(outputDir, { recursive: true });
          await fs.promises.writeFile(outputPath, pageContent, "utf8");
          console.log(`Successfully created ${outputPath}`);
        }
      }
    }
  } else {
    // Single page content generation
    for (const outputFolder of outputFolders) {
      let outputPath;
      if (isIndexFile) {
        outputPath = path.join(destBaseFolder, "index.html");
      } else {
        outputPath = path.join(
          destBaseFolder,
          outputFolder,
          permalinkTemplate,
          "index.html"
        );
      }
      const outputDir = path.dirname(outputPath);

      await fs.promises.mkdir(outputDir, { recursive: true });
      await fs.promises.writeFile(outputPath, layout, "utf8");
      console.log(`Successfully created ${outputPath}`);
    }
  }
}

// Read the files in the source folder
fs.readdir(sourceFolder, async (err, files) => {
  if (err) {
    console.error("Error reading the source folder:", err);
    return;
  }

  // Process each file
  for (const file of files) {
    const sourceFilePath = path.join(sourceFolder, file);
    if (path.extname(file) === ".njk") {
      try {
        const data = await fs.promises.readFile(sourceFilePath, "utf8");

        // Parse the front matter
        const parsed = matter(data);
        const content = parsed.content;
        const frontMatter = parsed.data;

        // Render the content with Nunjucks first
        const renderedContent = nunjucks.renderString(content, env);

        let finalContent = renderedContent;

        // Determine if a layout is specified
        if (frontMatter.layout) {
          const layoutFilePath = path.join(
            includesFolder,
            frontMatter.layout + ".njk"
          );
          const layoutData = await fs.promises.readFile(layoutFilePath, "utf8");

          // Render the layout with the rendered content inserted
          finalContent = nunjucks.renderString(layoutData, {
            ...env,
            content: renderedContent,
          });
        }

        // Check for pagination
        if (frontMatter.pagination) {
          const paginationData = eval(frontMatter.pagination.data); // Ensure this is safe or pre-process it
          const size = frontMatter.pagination.size || 1;
          const alias = frontMatter.pagination.alias || "contentarray";
          const permalinkTemplate = frontMatter.permalink || "/";
          const outputFolders = frontMatter.outputFolder
            ? frontMatter.outputFolder.split(",").map((folder) => folder.trim())
            : [path.basename(file, ".njk")];

          await generateContent(
            paginationData,
            size,
            alias,
            permalinkTemplate,
            finalContent,
            env,
            outputFolders,
            file === "index.njk"
          );
        } else {
          // Single page handling based on front matter
          const outputFolders = frontMatter.outputFolder
            ? frontMatter.outputFolder.split(",").map((folder) => folder.trim())
            : [path.basename(file, ".njk")];

          await generateContent(
            [],
            1, // Size 1 since it's a single page
            "content", // Default alias for single page content
            frontMatter.permalink || "/",
            finalContent,
            env,
            outputFolders,
            file === "index.njk"
          );
        }
      } catch (err) {
        console.error("Error processing the Nunjucks file:", err);
      }
    }
  }

  // Optional: Compress assets if the compress flag is set
  if (compressAssets) {
    const compress = require("compression-library"); // Replace with your compression tool
    compress(assetsFolder);
    console.log("Assets compressed successfully");
  }
});
