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

also. it does not handle codes very for example if i get a 401 I want to update the respose div and be done with it 
but you cannot target multipile divs.  There is an onError event were the 401's go but the afterRequest is still fired and as 
I want to do other stuff based on response I may as well deal with it all here. 

THere are extsnsions to deal with it but i dont want to load a full extension for 4 lines of JS

https://extensions.htmx.org/
https://github.com/bigskysoftware/htmx-extensions/blob/main/src/response-targets/README.md

What would be be ideal would to be able to deal with error responses 40x differently from success ones so we can have different flows

It would also be be great to extend the afterRequest and also have a  afterRequestDataIsJSON as there is a lot of times, login etc 
where you dont want to render any HTML you just want do something based on the response I.E store and auth token or redirect after a sucessful
login


*/

function timeout(responseElement, textContent = "") {
  setTimeout(function () {
    responseElement.textContent = textContent;
  }, 1000); // 1000 milliseconds = 1 second
}
document.addEventListener("htmx:afterRequest", function (event) {
  //set the redirect URL
  let redirectUrl = "";
  //set the repsonse element
  const responseElement = document.getElementById("responseText");
  // Check if the response is JSON
  const contentType = event.detail.xhr.getResponseHeader("Content-Type");
  if (contentType && contentType.includes("application/json")) {
    try {
      //get the JSON response
      const responseData = JSON.parse(event.detail.xhr.response);
      //check if its a 401
      if (event.detail.xhr.status == 401) {
        //set the response message
        responseElement.textContent = responseData.message;
        //call the timeout
        timeout(responseElement);
        return;
      }

      //set the response message
      responseElement.textContent = responseData.message;
      //call the timeout
      timeout(responseElement);

      //check the worker action
      switch (responseData.workerAction) {
        case "doSignup":
          redirectUrl = "/login/";
          break;
        case "doLogin":
          redirectUrl = "/home/";
          break;
        case "doDelete":
          //remove the row
          const targetRow = event.target.closest("tr");
          if (targetRow) {
            targetRow.remove();
          }
          break;
      }

      //check if there is a redirect
      if (redirectUrl !== "" && event.detail.successful == true) {
        //set the response message
        responseElement.textContent = responseData.message;
        //call the timeout to redirect
        setTimeout(function () {
          window.location.href = redirectUrl;
        }, 1000);
      }
    } catch (e) {
      console.error("Failed to parse JSON:", e);
    }
  }
});

// Exporting the functions to make them globally accessible
window.whenDocumentReady = whenDocumentReady;
window.isReady = isReady;
