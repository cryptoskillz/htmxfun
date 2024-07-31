# TODO

Parameterized Query: The query uses a ? placeholder for the email parameter, and the executeQuery function safely passes the email parameter to the prepared statement. This prevents SQL injection.



## toml

## buildit

## jwt worker tasks

update cors policy
get login cookie and send down
does forgotpassword, verify etc require authtoken

## email worker tasks

## database worker tasks

fix table header search colum length

update cors policy
get the cooke in listtables
get the cooke in view table
get the cooke in add record
get the cooke in edir record

Remove getTableFields to get it from the setfields function
if the inputType is set to text and it has a swingtable it is rendering it as a select
work on the table join logic (may not do this as it makes things quote complex or may use prisma)

## jamstack

update script to use  htmx.config = {
    withCredentials: true
  };

check the login sends up the cookie

