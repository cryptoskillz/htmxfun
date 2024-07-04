/*

todo

have a black list of fields for the edit / add form
render the tables with all fields in the databas except the blacklisted fields
store the action add / edit to make the checking easier

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
		 * Renders HTML based on the given render type, table, fields, and results.
		 *
		 * @param {string} renderType - The type of rendering to be done.
		 * @param {string} table - The name of the table.
		 * @param {Array} fields - An array of field names.
		 * @param {Array} results - An array of result objects.
		 * @param {Object} [params] - Additional parameters.
		 * @return {string} The rendered HTML.
		 */
		const renderHTML = (renderType, tableName, fields, theData, params) => {
			let htmlResponse = '';

			if (renderType === 'table') {
				const dataToRender = Array.isArray(theData.results) ? theData.results : [theData];

				htmlResponse = `
            <table class="table delete-row-example">
                <thead>
                    <tr>
                        ${fields.map((field) => `<th>${field}</th>`).join('')}
                        <td>Action</td>
                    </tr>
                </thead>
                <tbody hx-target="closest tr" hx-swap="outerHTML">
                    ${dataToRender
											.map(
												(result) => `
                        <tr>
                            ${fields.map((field) => `<td>${result[field]}</td>`).join('')}
                            <td>
                                <a class="btn" href="/${tableName}/edit/?id=${result.id}">Edit</a>
                                | <a href="/${tableName}/edit/?id=${result.id}">Delete</a>
                            </td>
                        </tr>
                    `
											)
											.join('')}
                </tbody>
            </table>`;
			} else if (renderType === 'formedit' && theData) {
				const formData = Array.isArray(theData.results) ? theData.results[0] : theData;

				const formFields = Object.keys(formData)
					.filter((key) => key !== 'id') // Exclude 'id' field for form add
					.map(
						(key) => `
                <div class="form-group">
                    <label>${key.charAt(0).toUpperCase() + key.slice(1)}</label>
                    <input type="text" name="${key}" value="${formData[key]}" />
                </div>
            `
					)
					.join('');

				// Generate the HTML form for editing or adding
				htmlResponse = `
            <form hx-put="/${tableName}/${formData.id || ''}" hx-target="this" hx-swap="outerHTML">
                ${formFields}
                <button type="submit" class="btn">Submit</button>
                <a class="btn" href="/${tableName}/">Cancel</a>
            </form>`;
			} else if (renderType === 'formadd' && theData && Array.isArray(theData.results)) {
				const formFields = theData.results
					.filter((field) => field.name !== 'id') // Exclude 'id' field for form add
					.map(
						(field) => `
                <div class="form-group">
                    <label>${field.name.charAt(0).toUpperCase() + field.name.slice(1)}</label>
                    <input type="text" name="${field.name}" />
                </div>
            `
					)
					.join('');

				// Generate the HTML form for adding a new record
				htmlResponse = `
            <form hx-post="/${tableName}/" hx-target="this" hx-swap="outerHTML">
                ${formFields}
                <button type="submit" class="btn">Submit</button>
                <a class="btn" href="/${tableName}/">Cancel</a>
            </form>`;
			} else {
				htmlResponse = `<div>Unsupported render type: ${renderType}</div>`;
			}

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
			const tableName = segments[0];
			//set the fields for this table
			const fieldNames = setFields(tableName);
			const fieldsString = fieldNames.join(',');
			//check for an id
			let id = '';
			//set the render type
			let renderType = 'table';
			// Prepare and execute the SQL query
			let theQuery = `SELECT ${fieldsString} FROM ${tableName} WHERE isDeleted = 0`;
			// Check if the params object is empty
			if (Object.keys(params).length !== 0) {
				// Check if the id is 0 because if it is, we know it's a new record so return the schema
				if (params.id == 0) {
					// Add an id check
					renderType = 'formadd';
					// Get the schema
					theQuery = `PRAGMA table_info(${tableName});`;
				} else if (Number.isInteger(Number(params.id)) && Number(params.id) > 0) {
					// Check if id is an integer greater than 0
					theQuery += ` AND id = ${params.id}`; // Add WHERE clause to filter deleted records
					// Add an id check
					renderType = 'formedit';
				} else {
					// Handle invalid id
					const htmlResponse = `<div>invalid id</div>`;
					// Return the HTML response
					return sendResponse(htmlResponse, 200);
				}
			} else {
				// Handle case where params object is empty, if needed
			}

			try {
				// Execute the SQL query
				const stmt = env.DB.prepare(theQuery);
				// Execute the SQL query
				let theData;

				// Check if the render type is table or form
				if (renderType == 'table' || renderType == 'formadd') {
					//get all the results
					theData = await stmt.all();
				} else {
					//get the first result
					theData = await stmt.first();
				}
				// Render the HTML response
				let htmlResponse = '';
				if (theData.length === 0) {
					htmlResponse = `<div>no results</div>`;
				} else {
					htmlResponse = renderHTML(renderType, tableName, fieldNames, theData, params);
				}

				// Return the HTML response
				//console.log('htmlResponse');
				//console.log(htmlResponse);
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
