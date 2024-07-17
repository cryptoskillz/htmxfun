This is a bunch of stuff and junk that has nowhere else to live presently
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

email code

    				/*
    					note we use postmark which can be found here
    					postmarkapp.com/

    					move this send email function
    				*/
    				//send the signup email
    				const data = {
    					templateId: env.SIGNUP_EMAIL_TEMPLATE_ID,
    					to: body.email,
    					templateVariables: {
    						name: `${body.email.split('@')[0]}`,
    						product_name: `${env.PRODUC_TNAME}`,
    						action_url: `${env.API_URL}verify?verifycode=${verifyCode}`,
    						login_url: `${env.API_URL}account-login`,
    						username: ``,
    						sender_name: `${env.SENDER_EMAIL_NAME}`,
    					},
    				};

    				//call the cloudflare API for a one time URL
    				const responseEmail = await fetch(env.EMAIL_API_URL, {
    					method: 'POST',
    					headers: {
    						'Content-Type': 'application/json',
    					},
    					body: JSON.stringify(data),
    				});

    				const jsonEmail = await responseEmail.json();
