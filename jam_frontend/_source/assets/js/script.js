// Function to execute when document is ready
let whenDocumentReady = (f) => {
  /in/.test(document.readyState)
    ? setTimeout(() => whenDocumentReady(f), 9)
    : f();
};

// Ready function
let isReady = () => {};

// htmx afterRequest processing
/*
note: we had to code this becuase none of the dcoumented hx function to redirect to a new url seemed to work, 
it may not be added yet or we may be dumb.  We look back and try to fix this later
*/
document.addEventListener("htmx:afterRequest", function (event) {
  // Check if the response is JSON
  let responseData;
  try {
    responseData = JSON.parse(event.detail.xhr.response);
  } catch (error) {
    // If parsing fails, this will be the server senidng down some html for the htmx to use as the response
    //console.log("Response is not JSON:", event.detail.xhr.response);
    return;
  }
  // Check if the response contains the expected properties
  if (
    responseData &&
    responseData.message &&
    responseData.tableName &&
    responseData.statusText
  ) {
    // Check if record was added or updated successfully
    if (responseData.statusText === "OK") {
      // Update the table element with the message
      const tableElement = document.getElementById("table");
      //set the message
      tableElement.textContent = responseData.message;
      //redirect to the table
      setTimeout(function () {
        window.location.href = `/${responseData.tableName}/`; // Assuming responseData.table contains the table name
      }, 1000); // 1000 milliseconds = 1 second
    }
  } else {
    console.error("Response does not contain expected properties.");
  }
});

// Exporting the functions to make them globally accessible
window.whenDocumentReady = whenDocumentReady;
window.isReady = isReady;
