// Call the function when the document is ready
//document.addEventListener("DOMContentLoaded", getURLParameter);

// Function to execute when document is ready
let whenDocumentReady = (f) => {
  /in/.test(document.readyState)
    ? setTimeout(() => whenDocumentReady(f), 9)
    : f();
};

// Ready function
let isReady = () => {};

// Exporting the functions to make them globally accessible
window.whenDocumentReady = whenDocumentReady;
window.isReady = isReady;
