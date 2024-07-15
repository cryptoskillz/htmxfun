TODO

upgrade email to mailchannels https://www.fadhil-blog.dev/blog/cloudflare-worker-send-email/
add a forgot password screen
join all the js file into one (or leave to cloudflare / ci)
in table lookup allow it use a database
work out how to add joins maybe move it all to prisma to standarise things

render field

add minslength and maxlength back
add the look up data to be specific to a table or not

const lookupData = [
{
"fieldName": "name",
"boundToTable": "projects", // Set to specific table name if bound, otherwise false
"joinTable": [{"foreignTable":"userSettings","primaryId":"id","foreignId":"userId"}],
"data": ["chris", "dave", "eric"], // only used if join tables is blank
},
];

Table Structure
cd
{
name: 'id',
value: '',
placeHolder: 'Enter ID',
inputType: 'integer',
extendedType: '',
required: true,
disabled: false,
allowEdit: true,
},
