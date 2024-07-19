// Function to execute when document is ready
let whenDocumentReady = (f) => {
  /in/.test(document.readyState)
    ? setTimeout(() => whenDocumentReady(f), 9)
    : f();
};

// Ready function
let isReady = () => {};

// htmx configRequest
document.body.addEventListener("htmx:configRequest", function (evt) {
  // Add the auth token to the request, could move this to hx-vals
  if (localStorage.getItem("authToken")) {
    evt.detail.parameters["authToken"] = localStorage.getItem("authToken");
  } else evt.detail.parameters["authToken"] = "";
});

function observeTextContentChange(elementId, timeout) {
  // Check if the element exists and set it to the targetElement variable
  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }

  // Store the original content
  const originalContent = targetElement.textContent;

  // Create a MutationObserver to observe textContent changes in the target element
  const observer = new MutationObserver((mutationsList) => {
    // Check if the mutation is a textContent change
    for (let mutation of mutationsList) {
      // Check if the mutation is a textContent change
      if (mutation.type === "childList" || mutation.type === "characterData") {
        // Log the detected change (optional)
        let newContent = targetElement.textContent;
        // Update the element's content after the specified duration
        setTimeout(() => {
          targetElement.textContent = originalContent;
        }, timeout);
        break;
      }
    }
  });

  // Start observing the target element for changes in child nodes and character data
  observer.observe(targetElement, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

// Event listener for HTMX swaps to detect HTTP status codes
document.body.addEventListener("htmx:beforeSwap", (event) => {
  // Get the response headers
  const xhr = event.detail.xhr;
  const token = xhr.getResponseHeader("X-Auth-Token");
  const deleteRow = xhr.getResponseHeader("X-Delete-Row");
  // Get the response element
  const responseElement = document.getElementById("responseText");
  // Set the response text if it is not a 200
  if (xhr.status != 200) responseElement.textContent = xhr.responseText;
  else {
    //check if a token has been returned and swap it
    if (token != "") {
      //set the token
      localStorage.setItem("authToken", token);
    }
    //check for a redirect from a hidden input element
    const redirectUrlElement = document.getElementById("redirectUrl");
    //check if a row should be deleted
    if (deleteRow) {
      //delete the row
      const targetRow = event.target.closest("tr");
      if (targetRow) {
        targetRow.remove();
      }
    }
    //check if a redirect url has been set
    if (redirectUrlElement) {
      const redirectUrl = redirectUrlElement.value;
      if (redirectUrl !== "") {
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
      }
    }
  }
  // Call the observeTextContentChange function here if needed
});
observeTextContentChange("responseText", 5000);
// Exporting the functions to make them globally accessible
window.whenDocumentReady = whenDocumentReady;
window.isReady = isReady;
