/*

add post to add
add put to  edit
add delete toelete
add options to, what the hell does options do again? 

*/

export default {
	async fetch(request, env, ctx) {
		// Handle preflight requests
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

		/**
		 * Sends a response with the given message, status code, and content type.
		 *
		 * @param {string} theMessage - The message to send in the response.
		 * @param {number} theCode - The status code of the response.
		 * @param {string} [theType='text/html'] - The content type of the response.
		 * @return {Response} The response object.
		 */

		const sendResponse = (theMessage, theCode, theType = 'text/html') => {
			// Create a new response object with the given message, status code, and content type.
			return new Response(theMessage, {
				status: theCode,
				headers: {
					'Access-Control-Allow-Origin': '*', // Allow CORS for all origins
					'Content-Type': theType, // Set the content type of the response
				},
			});
		};

		// Handle actual requests
		if (request.method === 'GET') {
			// Extract the Hx-Current-Url header
			const currentUrl = request.headers.get('Hx-Current-Url');
			const urlObj = new URL(currentUrl);
			const searchParams = urlObj.searchParams;

			// Parse query parameters from the Hx-Current-Url
			const params = {};
			searchParams.forEach((value, key) => {
				if (value.includes(',')) {
					params[key] = value.split(',');
				} else {
					params[key] = value;
				}
			});

			const { table, fields } = params;
			if (!table || !fields) {
				return sendResponse('Missing required parameters: table and fields', code);
			}

			const fieldsString = fields.join(', ');

			// Prepare and execute the SQL query
			let theQuery = '';
			try {
				theQuery = `SELECT ${fieldsString} FROM ${table} where isDeleted = 0`; // Add WHERE clause to filter deleted records, note this is assumed flag for all tables
				const stmt = env.DB.prepare(theQuery);
				const { results } = await stmt.all();

				// Generate HTML response
				const htmlResponse = `
					<table border="1">
						<thead>
						<tr>
							${fields.map((field) => `<th>${field}</th>`).join('')}
							<td>
								Action
							</td>
						</tr>
						
						</thead>
						<tbody>
						${results
							.map(
								(result) => `
							<tr>
							${fields.map((field) => `<td>${result[field]}</td>`).join('')}
						<td>
								<a href="/edit/${table}/${result.id}">Edit</a> | <a href="/delete/${table}/${result.id}">Delete</a>
							</td>
							</tr>	
						`
							)
							.join('')}
							
						</tbody>
					</table>
					`;

				return sendResponse(htmlResponse, 200);
			} catch (error) {
				console.error('Error executing query:', error);
				const htmlResponse = `Error executing query ${theQuery}`;
				return sendResponse(htmlResponse, 200);
				sendResponse(htmlResponse, 200);
			}
		}

		// Handle actual requests
		if (request.method === 'POST') {
			// Parse the JSON body of the POST request
			let jsonData;
			try {
				jsonData = await request.json();
			} catch (error) {
				return new Response('Invalid JSON', { status: 400 });
			}

			// Extract specific values if needed
			const { table, fields } = jsonData;

			// Generate HTML response
			const htmlResponse = `
        <div>
          <p>Received table: ${table}</p>
          <p>Received fields: ${fields.join(', ')}</p>
        </div>
      `;
			return sendResponse(htmlResponse, 200);
		}

		// Handle unsupported methods, this should not be required as we will have a call for each option
		return sendResponse('Method Not Allowed', 405);
	},
};
