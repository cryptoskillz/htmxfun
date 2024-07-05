const fs = require("fs");
const path = require("path");
const nunjucks = require("nunjucks");
const matter = require("gray-matter");
const { minify: htmlMinify } = require("html-minifier-terser");
const CleanCSS = require("clean-css");
const terser = require("terser");

// Get the delete and compress flags from command line arguments
const args = process.argv.slice(2);
const deleteDestFolder = args.includes("delete");
const compressAssets = args.includes("compress");

// Define the source folder, includes folder, destination base folder, and assets folder
const sourceFolder = "./_source"; // Change this to your source folder path
const includesFolder = "./_includes"; // Change this to your includes folder path
const destBaseFolder = "./_site"; // Change this to your destination base folder path
const assetsFolder = "./_source/assets"; // Change this to your assets folder path

// Load environment variables from _data/env.js
const env = require("./_data/env.js");

// Load the API data function
const api = require("./_data/api.js");

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
  console.log(
    `Successfully deleted the contents of the base folder: ${destBaseFolder}`
  );
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

// Minify CSS files
function minifyCSS(filePath) {
  const cssContent = fs.readFileSync(filePath, "utf8");
  const output = new CleanCSS().minify(cssContent);
  if (output.errors.length) {
    console.error("CSS Minification errors:", output.errors);
  }
  return output.styles;
}

// Minify JavaScript files
async function minifyJS(filePath) {
  const jsContent = fs.readFileSync(filePath, "utf8");
  const output = await terser.minify(jsContent);
  if (output.error) {
    console.error("JavaScript Minification error:", output.error);
  }
  return output.code;
}

// Copy and minify the assets directory if it exists
if (fs.existsSync(assetsFolder)) {
  const destAssetsFolder = path.join(destBaseFolder, "assets");
  copyDirectory(assetsFolder, destAssetsFolder);

  if (compressAssets) {
    fs.readdirSync(destAssetsFolder).forEach(async (file) => {
      const filePath = path.join(destAssetsFolder, file);
      const ext = path.extname(file).toLowerCase();
      if (ext === ".css") {
        const minifiedCSS = minifyCSS(filePath);
        fs.writeFileSync(filePath, minifiedCSS, "utf8");
      } else if (ext === ".js") {
        const minifiedJS = await minifyJS(filePath);
        fs.writeFileSync(filePath, minifiedJS, "utf8");
      }
    });

    console.log(
      `Successfully compressed HTML, copied and minified assets folder to ${destAssetsFolder}`
    );
  } else {
    console.log(`Successfully copied assets folder to ${destAssetsFolder}`);
  }
}

// Read the files in the source folder
fs.readdir(sourceFolder, async (err, files) => {
  if (err) {
    console.error("Error reading the source folder:", err);
    return;
  }

  // Get the API data
  let apiData = {};
  try {
    apiData = await api();
  } catch (error) {
    console.error("Error fetching API data:", error);
  }

  // Merge env and apiData
  const context = { ...env, ...apiData };

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
        const renderedContent = nunjucks.renderString(content, context);

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
            ...context,
            content: renderedContent,
          });
        }

        // Minify the final HTML content if compress flag is set
        if (compressAssets) {
          finalContent = await htmlMinify(finalContent, {
            collapseWhitespace: true,
            removeComments: true,
            minifyCSS: true,
            minifyJS: true,
          });
        }

        // Handle multiple output folders
        const outputFolders = frontMatter.outputFolder
          ? frontMatter.outputFolder.split(",").map((folder) => folder.trim())
          : [];
        for (const folder of outputFolders) {
          const newFolderPath = path.join(destBaseFolder, folder);
          const newFilePath = path.join(newFolderPath, "index.html");

          await fs.promises.mkdir(newFolderPath, { recursive: true });
          await fs.promises.writeFile(newFilePath, finalContent, "utf8");
          console.log(`Successfully created ${newFilePath}`);
        }

        // Handle the default output path if no specific folders are defined
        if (outputFolders.length === 0) {
          const fileNameWithoutExt = path.basename(file, ".njk");
          if (fileNameWithoutExt === "index") {
            // Render as index.html directly in the root
            const newFilePath = path.join(destBaseFolder, "index.html");
            await fs.promises.writeFile(newFilePath, finalContent, "utf8");
            console.log(`Successfully created ${newFilePath}`);
          } else {
            // Render in a folder named after the file
            const newFolderPath = path.join(destBaseFolder, fileNameWithoutExt);
            const newFilePath = path.join(newFolderPath, "index.html");

            await fs.promises.mkdir(newFolderPath, { recursive: true });
            await fs.promises.writeFile(newFilePath, finalContent, "utf8");
            console.log(`Successfully created ${newFilePath}`);
          }
        }
      } catch (err) {
        console.error("Error processing the Nunjucks file:", err);
      }
    }
  }
});
