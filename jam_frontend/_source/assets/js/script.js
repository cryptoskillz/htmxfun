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

  //set the paramater based on url
  //note: We will use this to decide to do different  thigs in the end point ie home will list tables

  const urlString = new URL(window.location.href);
  console.log(urlString);
  // Split the path by the forward slash (/)
  const tableName = urlString.pathname.split("/").filter(Boolean)[0];
  console.log(tableName);

  switch (tableName) {
    case "home":
      evt.detail.parameters["workerAction"] = "listTables";
      break;
    case "/login":
      evt.detail.parameters["workerAction"] = "doLogin";
      break;
    case "/signup":
      evt.detail.parameters["workerAction"] = "doSignup";
      break;
    default:
      evt.detail.parameters["workerAction"] = "";
      break;
  }

  /*
    Note: we currently get the table name currently in the database work but it relies on the hx-current-url which may not alawys and if we have to send up a number of table then 
          maybe it make more sense to do it here. I will leave the code comented out for the moment but we may add it back later. 


  */

  /*
  // Get the current URL
  const url = new URL(window.location.href);
  // Split the path into segments and filter out empty strings
  const segments = url.pathname.split("/").filter(Boolean);
  // Get the first segment
  const tableName = segments[0];

  // Check if tableName is not null or undefined
  if (tableName) {
    console.log(tableName);
    evt.detail.parameters["tableName"] = tableName;
  }
  */

  //debug
  // Log the event for debugging
  //console.log(evt);
});

// htmx afterRequest processing
/*
note: we had to code this becuase none of the dcoumented hx function to redirect to a new url seemed to work, 
it may not be added yet or we may be dumb.  We look back and try to fix this later
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
