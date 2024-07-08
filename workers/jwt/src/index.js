import jwt from '@tsndr/cloudflare-worker-jwt';

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
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': '*',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		/*
		 * Creates a response object with the provided message, status code, and type.
		 *
		 * @param {type} theMessage - The message to include in the response.
		 * @param {type} theCode - The status code of the response.
		 * @param {type} theType - The content type of the response (default is 'text/html').
		 * @return {type} The response object.
		 */
		const sendResponse = (theMessage, theCode, theType = 'text/html') => {
			return new Response(theMessage, {
				status: theCode,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': theType,
				},
			});
		};

		// Handle OPTIONS request
		if (request.method === 'GET') {
			// Handle GET request
			return new Response('GET request handled');
		}

		// Handle POST request
		if (request.method === 'POST') {
			//get content type
			const contentType = request.headers.get('content-type');
			//get the body
			const body = contentType.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
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
					statusText: 'OK',
				};
				return sendResponse(JSON.stringify(responseObj), 200, 'application/json');
			} else return sendResponse('wrong email or password', 200);
		} else {
			// Handle other methods (PUT, DELETE, etc.)
			return sendResponse('Method Not Allowed', 405);
		}
	},
};
