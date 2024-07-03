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

		/*
		 * Renders HTML based on the given render type, table, fields, and results.
		 *
		 * @param {string} renderType - The type of rendering to be done.
		 * @param {string} table - The name of the table.
		 * @param {Array} fields - An array of field names.
		 * @param {Array} results - An array of result objects.
		 * @return {string} The rendered HTML.
		 */
		const renderHtML = (renderType, table, fields, results) => {
			let htmlResponse = '';

			if (renderType == 'table') {
				htmlResponse = `
				<table border="1">
					<thead>
					<tr>
						${fields.map((field) => `<th>${field}</th>`).join('')}
						<td>Action</td>
					</tr>
					</thead>
					<tbody>
					${results
						.map(
							(result) => `
						<tr>
						${fields.map((field) => `<td>${result[field]}</td>`).join('')}
						<td>
							<a href="/table/edit/?table=${table}&id=${result.id}">Edit</a> | <a href="/delete/${table}/${result.id}">Delete</a>
						</td>
						</tr>
					`
						)
						.join('')}
					</tbody>
				</table>
				`;
			}

			if (renderType == 'form') {
				htmlResponse = `<div>form</div>`;
			}
			// Return the HTML response
			return htmlResponse;
		};

		/*
		 * Creates and returns a new Response object with the provided message, status code, and content type.
		 *
		 * @param {string} theMessage - The message to be sent in the response.
		 * @param {number} theCode - The status code of the response.
		 * @param {string} [theType='text/html'] - The content type of the response. Defaults to 'text/html'.
		 * @return {Response} The newly created Response object.
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

		// Handle GET requests
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

			// Extract specific values from params
			const { table, fields, id, type } = params;

			// Check if required parameters are present
			if (!table || !fields) {
				return sendResponse('Missing required parameters: table and fields', 400);
			}

			const fieldsString = fields.join(', ');

			// Prepare and execute the SQL query
			let theQuery = '';
			try {
				//add a id check
				theQuery = `SELECT ${fieldsString} FROM ${table} WHERE isDeleted = 0`; // Add WHERE clause to filter deleted records
				if (id !== undefined && id !== '') {
					theQuery += ` AND id = ${id}`;
				}
				// Execute the SQL query
				const stmt = env.DB.prepare(theQuery);
				const { results } = await stmt.all();
				// set a default value for type
				let renderType = 'table';
				// Check if type parameter is present
				if (type !== undefined && type !== '') {
					renderType = type;
				}
				// Generate HTML response
				const htmlResponse = renderHtML(renderType, table, fields, results);
				// Return the HTML response
				return sendResponse(htmlResponse, 200);
			} catch (error) {
				// Log and return error response
				console.error('Error executing query:', error);
				const htmlResponse = `Error executing query ${theQuery}`;
				return sendResponse(htmlResponse, 500);
			}
		}

		// Handle POST requests
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

		// Handle unsupported methods
		return sendResponse('Method Not Allowed', 405);
	},
};
