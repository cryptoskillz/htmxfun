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
  // Add the auth token to the request
  if (localStorage.getItem("authToken")) {
    evt.detail.parameters["authToken"] = localStorage.getItem("authToken");
  } else evt.detail.parameters["authToken"] = "";
});

// htmx afterRequest processing
/*
note: we had to code this becuase none of the dcoumented hx function to redirect to a new url seemed to work, 
it may not be added yet or we may be dumb.  We look back and try to fix this later

I really do not like this code we can fully integrate it into htmx using the htmx events
*/
document.addEventListener("htmx:afterRequest", function (event) {
  // Check if the response is JSON
  let responseData;
  //check if it is a
  if (event.detail.xhr.responseText === "Record deleted successfully") {
    const targetRow = event.target.closest("tr");
    if (targetRow) {
      targetRow.remove();
    }
    setTimeout(function () {
      const tableElement = document.getElementById("responseText");
      //set the message
      tableElement.textContent = "";
    }, 1000); // 1000 milliseconds = 1 second
    return;
  }

  // Check if the response is JSON as we know it was not a delete above
  try {
    responseData = JSON.parse(event.detail.xhr.response);
  } catch (error) {
    // If parsing fails, this will be the server senidng down some html for the htmx to use as the response
    return;
  }
  // Check if the response contains the expected properties
  console.log(responseData);
  let redirectUrl = "";
  if (responseData.statusText === "OK") {
    // Update the table element with the message
    const tableElement = document.getElementById("responseText");
    //set the message
    tableElement.textContent = responseData.message;
    if (responseData.tableName) {
      redirectUrl = `/${responseData.tableName}/`;
    }

    if (responseData.token) {
      localStorage.setItem("authToken", responseData.token);
      redirectUrl = `/home/`;
    }
  }

  if (redirectUrl !== "") {
    setTimeout(function () {
      window.location.href = redirectUrl;
    }, 1000); // 1000 milliseconds = 1 second
  }
});

// Exporting the functions to make them globally accessible
window.whenDocumentReady = whenDocumentReady;
window.isReady = isReady;
