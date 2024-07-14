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
    console.log("API data:");
    console.log(apiData);

    // Process apiData further as needed
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

// Function to generate paginated content
async function generatePaginatedContent(
  dataArray,
  size,
  alias,
  permalinkTemplate,
  layout,
  env
) {
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

      const outputPath = path.join(destBaseFolder, permalink, "index.html");
      const outputFolder = path.dirname(outputPath);

      await fs.promises.mkdir(outputFolder, { recursive: true });
      await fs.promises.writeFile(outputPath, pageContent, "utf8");
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
          const permalinkTemplate =
            frontMatter.permalink || "/guides/{{ contentarray.slug }}/";

          await generatePaginatedContent(
            paginationData,
            size,
            alias,
            permalinkTemplate,
            finalContent,
            env
          );
        } else {
          // Handle the default output path if no specific paths are defined
          const outputPaths = frontMatter.outputPaths || [];
          for (const outputPath of outputPaths) {
            const newFolderPath = path.join(destBaseFolder, outputPath);
            const newFilePath = path.join(newFolderPath, "index.html");

            await fs.promises.mkdir(newFolderPath, { recursive: true });
            await fs.promises.writeFile(newFilePath, finalContent, "utf8");
            console.log(`Successfully created ${newFilePath}`);
          }

          if (outputPaths.length === 0) {
            const fileNameWithoutExt = path.basename(file, ".njk");
            if (fileNameWithoutExt === "index") {
              // Render as index.html directly in the root
              const newFilePath = path.join(destBaseFolder, "index.html");
              await fs.promises.writeFile(newFilePath, finalContent, "utf8");
              console.log(`Successfully created ${newFilePath}`);
            } else {
              // Render in a folder named after the file
              const newFolderPath = path.join(
                destBaseFolder,
                fileNameWithoutExt
              );
              const newFilePath = path.join(newFolderPath, "index.html");

              await fs.promises.mkdir(newFolderPath, { recursive: true });
              await fs.promises.writeFile(newFilePath, finalContent, "utf8");
              console.log(`Successfully created ${newFilePath}`);
            }
          }
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
