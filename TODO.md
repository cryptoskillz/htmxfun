# TODO

## buildit

join all the js file into one (or leave to cloudflare / ci)

work out how to add joins maybe move it all to prisma to standarise things

## jwt worker tasks

recode the sendemail funciton we just have a debug at the moment to use for testing (doSignUp,doVerify,DochangePassword)
in sign up we may want to check if there is username / name before splitting the email.
update jwt to use the new worker

## email worker tasks

pass in the following information in the body

const receiver = 'chrisjmccreadie@protonmail.com';
const receiverName = 'chris';
const subject = 'test';
const emailOutputUrl = 'http://www.gah.com'

## database worker tasks

if the inputType is set to text and it has a swingtable it is rendering it as a select
maybe we should show the extendedTyoe action post submit so they see it in the form (not essential)

## jamstack

decide if we want to make other messages disappear after one second if not we don't have to use script.js other than token setting
