import bcrypt from 'bcryptjs';
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
		async function executeQuery(db, query, params = [], returnOne = false, debug = false) {
			try {
				// Prepare the statement with parameters
				const stmt = db.prepare(query);
				// Execute the statement
				let data;
				// Execute query based on whether we want one or all data
				if (returnOne) {
					data = await stmt.bind(...params).first(); // Bind parameters and get the first row
				} else {
					data = await stmt.bind(...params).all(); // Bind parameters and get all rows
				}
				// Debug mode
				if (debug) {
					console.log('Query:', query);
					console.log('Parameters:', params);
					console.log('Data:', data);
				}
				// Return the data
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

		function sendResponse(body, status = 200, contentType = 'text/html', customHeaders = {}) {
			const headers = {
				'Content-Type': contentType,
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Expose-Headers': Object.keys(customHeaders).join(', '),
			};

			// Add custom headers
			for (const [key, value] of Object.entries(customHeaders)) {
				headers[key] = value;
			}

			return new Response(body, {
				status,
				headers,
			});
		}

		async function sendEmail(content = '', subject = '', username = '', email = '') {
			if (env.DISABLE_EMAIL == true) {
				console.log('Email sending is disabled');
				console.log(content);
				return;
			}
			console.log(env.DISABLE_EMAIL);
			//check if all parameters are set
			if (!content || !subject || !email) {
				throw new Error('All parameters are required: content, subject, email');
			}
			//check if the username is blank and get it from the email, we could also get it from the database
			if (username == '' && email != '') username = email.split('@')[0];

			//set the email object
			const emailObj = {
				email_from: env.EMAIL_FROM,
				frontend_url: env.FRONTEND_URL,
				api_url: env.DATABASE_URL,
				product_name: env.PRODUCT_NAME,
				sender_email_name: env.SENDER_EMAIL_NAME,
				receiver: email,
				receiverName: username,
				subject: subject,
				content: content,
			};
			//send the email
			const emailResponse = await fetch(env.EMAIL_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(emailObj),
			});
			//maybe we can check if debug data is set
			if (emailResponse.debug != '') console.log(emailResponse);
			return emailResponse;
		}
		/**
		 * A function that processes a user signup.
		 *
		 * @param {Object} body - The body containing user signup information.
		 * @return {Promise} A response object indicating the success or failure of the signup process.
		 */
		async function processSignup(body) {
			//set the response code
			let code = 200;
			//set a response message
			let responseMessage = '';
			let query = '';
			let data;
			let params;
			//build the query
			query = `SELECT COUNT(*) as total FROM user WHERE email = ?`;
			params = [body.email]; // `userEmail` is a variable containing the user input

			data = await executeQuery(env.DB, query, params, true);
			//check if the user exists
			if (data.total != 0) {
				//user already exists
				responseMessage = `Email already exists`;
				//set the code
				code = 401;
			} else {
				//get a secret
				let apiSecret = uuid.v4();
				//get a verify code
				let verifyCode = uuid.v4();
				//check if we have to get the name from the email
				let signupUsername = '';
				let signupName = '';
				if (body.username == undefined) signupUsername = body.email.split('@')[0];
				if (body.name == undefined) signupName = body.email.split('@')[0];
				//hash the password
				const hashedPassword = bcrypt.hashSync(body.password, 10);
				//create the user
				query = `INSERT INTO user (name,username,email,password,apiSecret,confirmed,isBlocked,isAdmin,verifyCode) VALUES (?,?,?,?,?,?,?,?,?)`;
				params = [signupName, signupUsername, body.email, hashedPassword, apiSecret, 0, 0, 0, verifyCode];
				data = await executeQuery(env.DB, query, params, false, false);
				//debug ghost out the line and enable the enable
				//data.success = true;
				//check if the user was created
				if (data.success == true) {
					//this is faking the email worker until we recode it
					//console.log(`${env.FRONTEND_URL}verify/?verifyCode=${verifyCode}`);
					const responseEmail = await sendEmail(
						`thank you for signing up Please verify your email <a href="${env.FRONTEND_URL}verify/?verifyCode=${verifyCode}">here</a>`,
						'Verify your Email',
						signupUsername,
						body.email
					);
					responseMessage = `Signup successful`;
				} else {
					code = 401;
					responseMessage = `Signup not successful`;
				}
			}
			return sendResponse(`${responseMessage}`, code, 'text/html', { 'X-Auth-Token': '', 'X-Delete-Row': 0 });
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
			//set the response code
			let code = 200;
			//set a response message
			let responseMessage = '';
			//build the query
			const query = `SELECT user.isDeleted, user.isBlocked, user.name, user.username, user.email, user.phone, user.id, user.isAdmin, user.apiSecret, user.password
                 FROM user
                 LEFT JOIN userAccess ON user.id = userAccess.userId
                 WHERE user.email = ?`;
			const params = [body.email]; // `userEmail` is a variable containing the user input

			const data = await executeQuery(env.DB, query, params, true, false);
			//check if the user exists
			if (data && bcrypt.compareSync(body.password, data.password)) {
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
			return sendResponse(`${responseMessage}`, code, 'text/html', { 'X-Auth-Token': token, 'X-Delete-Row': 0 });
		}

		async function processVerify(requestUrl) {
			const url = new URL(requestUrl);
			//set the response code
			let code = 200;
			//set a response message
			let responseMessage = '';
			//build query
			const query = `UPDATE user SET isVerified = 1,verifyCode = '' WHERE verifyCode = ?`;
			const params = [getUrlParameter(url, 'verifyCode')];
			const data = await executeQuery(env.DB, query, params, false, false);
			if (data.meta.changes > 0) responseMessage = `Verify successful, click  here to <a href="/login">Login</a>`;
			else {
				code = 401;
				responseMessage = `wrong verify code`;
			}
			return sendResponse(responseMessage, code, 'text/html', { 'X-Auth-Token': '', 'X-Delete-Row': 0 });
		}

		async function processForgotPassword(body) {
			//set the response code
			let code = 200;
			//set a response message
			let responseMessage = '';
			//prepare the query
			const query = `SELECT name from user where email = ?`;
			const params = [body.email];

			//execute the query
			const data = await executeQuery(env.DB, query, params, true, false);
			//get the token
			if (data != null) {
				const verifyCode = uuid.v4();
				const query = `UPDATE user SET verifyCode = '${verifyCode}' WHERE email = ?`;
				const data = await executeQuery(env.DB, query, params, false, false);
				//send the email
				//this is faking the email worker until we recode it
				//console.log(`${env.FRONTEND_URL}changepassword/?verifyCode=${verifyCode}`);
				const responseEmail = await sendEmail(
					`Please click <a href="${env.FRONTEND_URL}changepassword/?verifyCode=${verifyCode}">here</a> to change your password`,
					'Change your password',
					'',
					body.email
				);
				responseMessage = `Password reset sent to your email address`;
			} else {
				code = 401;
				responseMessage = `wrong email address`;
			}
			//send the response
			return sendResponse(responseMessage, code, 'text/html', { 'X-Auth-Token': '', 'X-Delete-Row': 0 });
		}

		/**
		 * Process the change password request.
		 *
		 * @param {Object} body - The request body containing the new password and its confirmation.
		 * @return {Promise<Object>} A promise that resolves to an object containing the response message, response code, and content type.
		 */
		async function processChangePassword(body, requestUrl) {
			const url = new URL(requestUrl);
			//set the response code
			let code = 200;
			//set a response message
			let responseMessage = '';
			//check passwords
			if (body.password != body.password2) {
				code = 401;
				responseMessage = `passwords do not match`;
			} else {
				//prepare the query
				const query = `UPDATE user SET isVerified = ?, password = ?,verifyCode = ? WHERE verifyCode = ? `;
				const params = [1, body.password, '', getUrlParameter(url, 'verifyCode')];

				//execute the query
				const data = await executeQuery(env.DB, query, false, true);

				//get the token
				if (data.meta.changes > 0) {
					responseMessage = `Password has been updated`;
					//todo send email, update user account to isVerifed = 0
				} else {
					code = 401;
					responseMessage = `Verify code not correct password has not been updated`;
				}
			}
			//send the response
			return sendResponse(responseMessage, code, 'text/html', { 'X-Auth-Token': '', 'X-Delete-Row': 0 });
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
