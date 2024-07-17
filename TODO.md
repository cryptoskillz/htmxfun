# TODO

## buildit

join all the js file into one (or leave to cloudflare / ci)

work out how to add joins maybe move it all to prisma to standarise things

## jwt worker tasks

recode the sendemail funciton we just have a debug at the moment to use for testing (doSignUp,doVerify,DochangePassword)
in sign up we may want to check if there is username / name before splitting the email.

## email worker tasks

upgrade email to mailchannels https://www.fadhil-blog.dev/blog/cloudflare-worker-send-email/

## database worker tasks

render field
make sure it works with multipile swing tables
make swing table work with boundtotable

## jamstack

decide if we want to make other messages disappear after one second if not we don't have to use script.js other than token setting
