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

		let data;
		let query;
		let responseObj;
		// Handle POST request
		if (request.method === 'POST') {
			const body = await parseRequestBody(request);
			if (body.workerAction == 'doSignup') {
				//build the query
				query = `SELECT COUNT(*) as total FROM user WHERE email = '${body.email}'`;
				data = await executeQuery(env.DB, query, true);
				if (data.total != 0) {
					responseObj = {
						message: `User already exists`,
						workerAction: body.workerAction,
						statusText: 'OK',
					};
					return sendResponse(responseObj, 401, 'application/json');
				} else {
					let apiSecret = uuid.v4();
					let verifyCode = uuid.v4();
					query = `INSERT INTO user (email,password,apiSecret,confirmed,isBlocked,isAdmin,verifyCode) VALUES ('${body.email}','${body.password}','${apiSecret}',0, 0,0,'${verifyCode}')`;
					data = await executeQuery(env.DB, query, false, false);
					data.success = true;
					if (data.success == true) {
						//send the email
						/*
						note we use postmark which can be found here 
						postmarkapp.com/
						*/

						const data = {
							templateId: env.SIGNUP_EMAIL_TEMPLATE_ID,
							to: body.email,
							templateVariables: {
								name: ``,
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
						//xconsole.log(responseEmail);
						//get the repsonse
						const emailResponse = await responseEmail.json();
						//xconsole.log(emailResponse);

						responseObj = {
							message: `Signup successfull`,
							workerAction: body.workerAction,
							statusText: 'OK',
						};
					} else {
						responseObj = {
							message: `Signup not successfull`,
							workerAction: body.workerAction,
							statusText: 'OK',
						};
					}
					return sendResponse(responseObj, 200, 'application/json');
				}
			}
			if (body.workerAction == 'doLogin') {
				//prepare the query
				const theQuery = `SELECT user.isDeleted,user.isBlocked,user.name,user.username,user.email,user.phone,user.id,user.isAdmin,user.apiSecret from user LEFT JOIN userAccess ON user.id = userAccess.userId where user.email = '${body.email}' and user.password = '${body.password}'`;
				//execute the query
				const stmt = env.DB.prepare(theQuery);
				//get the data
				const theData = await stmt.first();
				//get the token
				if (theData != null) {
					const token = await jwt.sign(
						{ data: theData },
						env.SECRET_KEY // Secret key from environment variables
					);
					//return the token
					const responseObj = {
						message: `Login successfull`,
						token: token,
						workerAction: body.workerAction,
						statusText: 'OK',
					};
					return sendResponse(responseObj, 200, 'application/json');
				} else {
					const responseObj = {
						message: `wrong email or password`,
						workerAction: body.workerAction,
						statusText: 'OK',
					};
					return sendResponse(responseObj, 401);
				}
			}
		} else {
			// Handle other methods (PUT, DELETE, etc.)
			return sendResponse('Method Not Allowed', 405);
		}
	},
};
