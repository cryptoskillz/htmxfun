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

// htmx afterRequest processing
/*
note: we had to code this becuase none of the dcoumented hx function to redirect to a new url seemed to work, 
it may not be added yet or we may be dumb.  We look back and try to fix this later
*/
document.addEventListener("htmx:afterRequest", function (event) {
  let redirectUrl = "";
  const responseElement = document.getElementById("responseText");
  // Check if the response is JSON

  const xhr = event.detail.xhr;
  const contentType = event.detail.xhr.getResponseHeader("Content-Type");
  if (contentType && contentType.includes("application/json")) {
    // The response is JSON
    try {
      const responseData = JSON.parse(event.detail.xhr.response);

      if (event.detail.xhr.status == 401) {
        responseElement.textContent = responseData.message;

        setTimeout(function () {
          responseElement.textContent = "";
        }, 1000); // 1000 milliseconds = 1 second
        return;
      }

      //check delete, add, edit record works with new method
      switch (responseData.workerAction) {
        case "doSignup":
          redirectUrl = "/login/";
          break;
        case "doLogin":
          redirectUrl = "/home/";
          break;
      }

      if (redirectUrl !== "" && event.detail.successful == true) {
        //console.log(redirectUrl);
        //console.log(event.detail.successful);
        responseElement.textContent = responseData.message;
        setTimeout(function () {
          window.location.href = redirectUrl;
        }, 1000); // 1000 milliseconds = 1 second
      }
    } catch (e) {
      console.error("Failed to parse JSON:", e);
    }
  }
});

// Exporting the functions to make them globally accessible
window.whenDocumentReady = whenDocumentReady;
window.isReady = isReady;
