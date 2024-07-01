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
window.whenDocumentReady = whenDocumentReady;
window.isReady = isReady;
