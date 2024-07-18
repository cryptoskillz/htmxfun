import jwt from '@tsndr/cloudflare-worker-jwt';
var uuid = require('uuid');
export default {
	/**
	 * Fetches data based on the request method and returns a response.
	 *
	 * @param {Request} request - The request object.
	 * @param {Object} env - The environment object.
	 * @param {Object} ctx - The context object.
	 * @return {Promise<Response>} The response object.
	 */
	async fetch(request, env, ctx) {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'POST',
					'Access-Control-Allow-Headers': '*',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		/**
		 * Retrieves the value of a URL parameter from the query string of a given URL.
		 *
		 * @param {URL} url - The URL object containing the query string.
		 * @param {string} name - The name of the parameter to retrieve.
		 * @return {string|null} The value of the parameter if found, or null if not found.
		 */
		function getUrlParameter(url, name) {
			// Function to extract URL parameter from query string
			const searchParams = new URLSearchParams(url.search);
			return searchParams.get(name);
		}

		/**
		 * Parses the request body based on the content type.
		 *
		 * @param {Request} request - The request object.
		 * @return {Promise<Object>} The parsed request body.
		 */
		async function parseRequestBody(request) {
			// Parse request body
			const contentType = request.headers.get('content-type');
			return contentType.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
		}

		/**
		 * Executes a SQL query using the provided database connection and returns the result.
		 *
		 * @param {Object} db - The database connection object.
		 * @param {string} query - The SQL query to execute.
		 * @param {boolean} [returnOne=false] - Whether to return only the first result.
		 * @param {boolean} [debug=false] - Whether to log the query and result for debugging purposes.
		 * @return {Promise<Object|Array>} A promise that resolves to the query result.
		 * @throws {Error} If there is an error executing the query.
		 */
		async function executeQuery(db, query, returnOne = false, debug = false) {
			try {
				// Execute query
				const stmt = db.prepare(query);
				let data;
				//check if it is one or all data
				if (returnOne == false) data = await stmt.all();
				else data = await stmt.first();
				//check if we in debug mode
				if (debug == true) {
					console.log(returnOne);
					console.log(query);
					console.log(data);
				}
				return data;
			} catch (error) {
				console.error('Error executing query:', error);
				throw error;
			}
		}

		/*
		 * Creates a response object with the provided message, status code, and type.
		 *
		 * @param {type} theMessage - The message to include in the response.
		 * @param {type} theCode - The status code of the response.
		 * @param {type} theType - The content type of the response (default is 'text/html').
		 * @return {type} The response object.
		 *
		 * note: I switched the default contentType to application/json as thia worker does not return any html
		 */

		function sendResponse(body, status = 200, contentType = 'application/json') {
			// Add CORS headers based on content type
			if (contentType == 'application/json') body = JSON.stringify(body);
			const headers = {
				'Content-Type': contentType,
				'Access-Control-Allow-Origin': '*',
			};
			// Send response
			return new Response(body, {
				status,
				headers,
			});
		}

		/**
		 * A function that processes a user signup.
		 *
		 * @param {Object} body - The body containing user signup information.
		 * @return {Promise} A response object indicating the success or failure of the signup process.
		 */
		async function processSignup(body) {
			//set a response object
			let responseObj;
			//set the response code
			let code = 200;
			//set a response message
			let responseMessage = '';
			let query = '';
			let data;
			//build the query
			query = `SELECT COUNT(*) as total FROM user WHERE email = '${body.email}'`;
			data = await executeQuery(env.DB, query, true);
			//check if the user exists
			if (data.total != 0) {
				//user already exists
				responseMessage = `User already exists`;
				//set the code
				code = 401;
			} else {
				//get a secret
				let apiSecret = uuid.v4();
				//get a verify code
				let verifyCode = uuid.v4();
				//get the name from the email
				const username = body.email.split('@')[0];
				//create the user
				query = `INSERT INTO user (name,username,email,password,apiSecret,confirmed,isBlocked,isAdmin,verifyCode) VALUES ('${username}','${username}','${body.email}','${body.password}','${apiSecret}',0, 0,0,'${verifyCode}')`;
				data = await executeQuery(env.DB, query, false, false);
				//debug ghost out the line and enable the enable
				//data.success = true;
				//check if the user was created
				if (data.success == true) {
					//this is faking the email worker until we recode it
					//console.log(`${env.FRONTEND_URL}verify/?verifyCode=${verifyCode}`);
					const emailObj = {
						email_from: env.EMAIL_FROM,
						frontend_url: env.FRONTEND_URL,
						api_url: env.API_URL,
						product_name: env.PRODUCT_NAME,
						sender_email_name: env.SENDER_EMAIL_NAME,
						receiver: body.email,
						receiverName: username,
						subject: 'Thank you for signing up',
						content: `Click here to verify ${env.FRONTEND_URL}verify/?verifyCode=${verifyCode}`,
					};
					const emailUrl = env.EMAIL_API_URL;
					//send the email
					const emailResponse = await fetch(emailUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(emailObj),
					});
					//console.log('emailResponse');
					//console.log(emailResponse);
					responseMessage = `Signup successful`;
				} else responseMessage = `Signup not successful`;
			}
			//send the response
			responseObj = {
				message: `${responseMessage}`,
				workerAction: body.workerAction,
				statusText: 'OK',
			};
			return sendResponse(responseObj, code, 'application/json');
		}

		/**
		 * A function that processes user login.
		 *
		 * @param {Object} body - The body containing user login information.
		 * @return {Response} A response object indicating the success or failure of the login process.
		 */
		async function processLogin(body) {
			//set a token var
			let token;
			//set a response object
			let responseObj;
			//set the response code
			let code = 200;
			//set a response message
			let responseMessage = '';
			//build the query
			const query = `SELECT user.isDeleted,user.isBlocked,user.name,user.username,user.email,user.phone,user.id,user.isAdmin,user.apiSecret from user LEFT JOIN userAccess ON user.id = userAccess.userId where user.email = '${body.email}' and user.password = '${body.password}'`;
			const data = await executeQuery(env.DB, query, true, false);
			//check if the user exists
			if (data != null) {
				//get the token
				token = await jwt.sign(
					{ data: data },
					env.SECRET_KEY // Secret key from environment variables
				);
				//return the token
				responseMessage = 'Login successful';
			} else {
				responseMessage = `wrong email or password`;
				code = 401;
			}
			//send the response
			responseObj = {
				message: `${responseMessage}`,
				workerAction: body.workerAction,
				statusText: 'OK',
			};
			return sendResponse(responseObj, code, 'application/json');
		}

		async function processVerify(requestUrl) {
			const url = new URL(requestUrl);
			//set the response code
			let code = 200;
			//set a response message
			let responseMessage = '';
			//set the content type
			let contentType = 'text/html';
			//build query
			const query = `UPDATE user SET isVerified = 1,verifyCode = '' WHERE verifyCode = '${getUrlParameter(url, 'verifyCode')}'`;
			const data = await executeQuery(env.DB, query, false, false);
			if (data.meta.changes > 0) responseMessage = `Verify successful, click  here to <a href="/login">Login</a>`;
			else responseMessage = `wrong verify code`;
			return sendResponse(responseMessage, code, contentType);
		}

		async function processForgotPassword(body) {
			//set the response code
			let code = 200;
			//set a response message
			let responseMessage = '';
			//set the content type
			let contentType = 'text/html';
			//prepare the query
			const query = `SELECT name from user where email = '${body.email}'`;
			//execute the query
			const data = await executeQuery(env.DB, query, true, false);
			//get the token
			if (data != null) {
				const verifyCode = uuid.v4();
				const query = `UPDATE user SET verifyCode = '${verifyCode}' WHERE email = '${body.email}'`;
				const data = await executeQuery(env.DB, query, false, false);
				//send the email
				//this is faking the email worker until we recode it
				console.log(`${env.FRONTEND_URL}changepassword/?verifyCode=${verifyCode}`);
				responseMessage = `Password reset sent to your email click <a href="/">here</a>`;
				//todo send email, update user account to isVerifed = 0
			} else responseMessage = `wrong email address`;
			//send the response
			return sendResponse(responseMessage, code, contentType);
		}

		/**
		 * Process the change password request.
		 *
		 * @param {Object} body - The request body containing the new password and its confirmation.
		 * @return {Promise<Object>} A promise that resolves to an object containing the response message, response code, and content type.
		 */
		async function processChangePassword(body, requestUrl) {
			const url = new URL(requestUrl);
			//set a response object
			let responseObj;
			//set the response code
			let code = 200;
			//set a response message
			let responseMessage = '';
			//set the content type
			let contentType = 'text/html';
			//check passwords
			if (body.password != body.password2) responseMessage = `passwords do not match`;
			else {
				//prepare the query
				const query = `UPDATE user SET isVerified = 1, password = '${body.password}',verifyCode = '' WHERE verifyCode = '${getUrlParameter(
					url,
					'verifyCode'
				)}' `;
				//execute the query
				const data = await executeQuery(env.DB, query, false, false);
				//get the token
				if (data.meta.changes > 0) {
					responseMessage = `Password has been updated  click here to <a href="${env.FRONTEND_URL}login">login</a>`;
					//todo send email, update user account to isVerifed = 0
				} else responseMessage = `Password has not been updated`;
			}
			//send the response
			return sendResponse(responseMessage, code, contentType);
		}

		// Handle POST request
		if (request.method === 'POST') {
			// Parse the request body
			const body = await parseRequestBody(request);
			// Check the worker action
			const workerAction = body.workerAction;
			//should these be under JWT?
			switch (workerAction) {
				case 'doSignup':
					return processSignup(body);
				case 'doVerify':
					return processVerify(request.headers.get('HX-Current-URL'));
				case 'doForgotPassword':
					return processForgotPassword(body);
				case 'doLogin':
					return processLogin(body);
				case 'doChangePassword':
					return processChangePassword(body, request.headers.get('HX-Current-URL'));
				default:
					throw new Error(`Invalid worker action: ${workerAction}`);
			}
		} else {
			// Handle other methods (PUT, DELETE, etc.)
			return sendResponse('Method Not Allowed', 405);
		}
	},
};
