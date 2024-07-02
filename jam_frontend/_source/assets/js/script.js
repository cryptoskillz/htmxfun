// Function to store a value in local storage
const storeLocal = (theValue = { seat: "1-1" }) => {
  localStorage.setItem("tableData", JSON.stringify(theValue));
};

// Function to get a value from local storage and set it as an attribute
const getLocal = (theElement) => {
  const theDiv = document.getElementById(theElement);
  const myValue = localStorage.getItem("tableData");
  if (myValue) {
    theDiv.setAttribute("hx-vals", myValue);
  }
};

//get the url paramaters
const getURLParameter = () => {
  // Get the current URL
  const currentUrl = window.location.href;
  const urlObj = new URL(currentUrl);
  const searchParams = new URLSearchParams(urlObj.search);
  const params = {};
  let hasTable = false;

  searchParams.forEach((value, key) => {
    // Check if the first parameter is "table"
    if (key === "table") {
      hasTable = true;
    }

    // Split comma-separated values into an array, if applicable
    if (value.includes(",")) {
      params[key] = value.split(",");
    } else {
      params[key] = value;
    }
  });

  if (hasTable) {
    const paramsJson = JSON.stringify(params);
    // Ensure theDiv exists before setting the attribute
    const theDiv = document.getElementById("table");
    if (theDiv) {
      theDiv.setAttribute("hx-vals", paramsJson);
    }
  }
};

// Call the function when the document is ready
document.addEventListener("DOMContentLoaded", getURLParameter);

// Function to execute when document is ready
let whenDocumentReady = (f) => {
  /in/.test(document.readyState)
    ? setTimeout(() => whenDocumentReady(f), 9)
    : f();
};

// Ready function
let isReady = () => {};

// Exporting the functions to make them globally accessible
window.storeLocal = storeLocal;
window.getLocal = getLocal;
window.getURLParameter = getURLParameter;
window.whenDocumentReady = whenDocumentReady;
window.isReady = isReady;
