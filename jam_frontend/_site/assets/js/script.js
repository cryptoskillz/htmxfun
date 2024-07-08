// Function to execute when document is ready
let whenDocumentReady = (f) => {
  /in/.test(document.readyState)
    ? setTimeout(() => whenDocumentReady(f), 9)
    : f();
};

// Ready function
let isReady = () => {};

document.body.addEventListener("htmx:configRequest", function (evt) {
  const auth_token = localStorage.getItem("auth_token");
  console.log(auth_token);
  if (localStorage.getItem("auth_token")) {
    console.log("in local storage");
    evt.detail.parameters["auth_token"] = auth_token;
  }
});

// htmx afterRequest processing
/*
note: we had to code this becuase none of the dcoumented hx function to redirect to a new url seemed to work, 
it may not be added yet or we may be dumb.  We look back and try to fix this later
*/
document.addEventListener("htmx:afterRequest", function (event) {
  // Check if the response is JSON
  let responseData;
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
  if (
    responseData &&
    responseData.message &&
    responseData.tableName &&
    responseData.statusText
  ) {
    // Check if record was added or updated successfully
    if (responseData.statusText === "OK") {
      // Update the table element with the message
      const tableElement = document.getElementById("response");
      //set the message
      tableElement.textContent = responseData.message;
      //redirect to the table
      setTimeout(function () {
        window.location.href = `/${responseData.tableName}/`; // Assuming responseData.table contains the table name
      }, 1000); // 1000 milliseconds = 1 second
    }
  }

  if (
    responseData &&
    responseData.message &&
    responseData.token &&
    responseData.statusText
  ) {
    // Check if record was added or updated successfully
    if (responseData.statusText === "OK") {
      localStorage.setItem("auth_token", responseData.token);
      // Update the table element with the message
      const tableElement = document.getElementById("response");
      //set the message
      tableElement.textContent = responseData.message;
      //redirect to the table
      setTimeout(function () {
        window.location.href = `/home/`; // Assuming responseData.table contains the table name
      }, 1000); // 1000 milliseconds = 1 second
    }
  }
});

// Exporting the functions to make them globally accessible
window.whenDocumentReady = whenDocumentReady;
window.isReady = isReady;
