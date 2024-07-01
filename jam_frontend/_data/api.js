module.exports = async () => {
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

  // Set an array
  let resArray = [];
  //debug code as we dont want to do an api call
  resArray = ["1", "2", "3"];
  // Example: Call an async function to fetch data
  // if (resArray.length === 0) resArray = await getData();

  return {
    resArray: resArray,
  };
};
