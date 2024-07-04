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
			console.log(renderType);
			if (renderType == 'table') {
				htmlResponse = `
					<table class="table delete-row-example">
					<thead>
						<tr>
							${fields.map((field) => `<th>${field}</th>`).join('')}
							<td>Action</td>
						</tr>
  					</thead>
					<tbody hx-target="closest tr" hx-swap="outerHTML">
					${results
						.map(
							(result) => `
											<tr>
											${fields.map((field) => `<td>${result[field]}</td>`).join('')}
											<td>
												<a class="btn" href="/${table}/edit/?id=${result.id}">Edit</a>
												| <a href="/${table}/edit/?id=${result.id}">Delete</a>
											</td>
											</tr>
										`
						)
						.join('')}
					</tbody>
					</table>	`;
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

		/**
		 * Returns an array of field names based on the given table name.
		 *
		 * @param {string} table - The name of the table.
		 * @return {Array<string>} An array of field names. If the table name is 'projects', returns ['id', 'name', 'guid'].
		 *
		 * we could get the fields from a env variable to make this more secure and easier to manage
		 */
		const setFields = (table) => {
			if (table == 'projects') return ['id', 'name', 'guid'];
			if (table == 'user') return ['id', 'name', 'email'];
		};

		// Handle GET requests
		if (request.method === 'GET') {
			/*
				We have moved the tbale processing to the worker which removes a bunch of the functionality from the front end which is not the worst 
				thing in the world. 
			*/

			//get the current url
			const currentUrl = request.headers.get('Hx-Current-Url');
			//console.log(currentUrl);
			//console.log(request.headers);
			const urlObj = new URL(currentUrl);
			const searchParams = new URLSearchParams(urlObj.search);
			// Parse query parameters
			const params = {};
			searchParams.forEach((value, key) => {
				params[key] = value.includes(',') ? value.split(',') : value;
			});

			// Extract the segments from the pathname
			const segments = urlObj.pathname.split('/').filter((segment) => segment.length > 0);
			//set the table
			const table = segments[0];
			//set the fields for this table
			const fieldNames = setFields(table);
			const fieldsString = fieldNames.join(',');
			//check for an id
			let id = '';
			//set the render type
			let renderType = 'table';
			//check for an id

			if (params.id !== undefined) {
				//set the id
				id = params.id;
				//set render type to form
				renderType = 'form';
			}
			console.log(renderType);

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
				// Generate HTML response
				const htmlResponse = renderHtML(renderType, table, fieldNames, results);
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
