//remove the comments when you have wired up the API
require("dotenv").config();
const superagent = require("superagent");

//async function to get the posts
getData = async () => {
  let method = "test-endpoint/";
  console.log(`${process.env.STRAPIAPI}${method}`);
  var res = await superagent
    .get(`${process.env.STRAPIAPI}backpage-projects/`)
    .query({});
  //console.log(res.body)
  return res.body;
};

// if (resArray.length === 0) resArray = await getData();
//fake it until you make it we dont want to do a api call but we do want to test the rendering so there we have it.
const testArray = [
  {
    id: 1,
    title: "First Post",
    content: "This is the content of the first post.",
  },
  {
    id: 2,
    title: "Second Post",
    content: "This is the content of the second post.",
  },
  {
    id: 3,
    title: "Third Post",
    content: "This is the content of the third post.",
  },
  // Add more objects as needed
];

module.exports = async () => {
  // Simulate async operation (e.g., fetching from an API)
  return testArray;
};
