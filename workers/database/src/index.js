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

		const sendResponse = (theMessage, theCode, theType = 'text/html') => {
			return new Response(theMessage, {
				status: theCode,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': theType,
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
								Add / Delete
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
