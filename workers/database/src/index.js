/*
todo

add push url for add and edit form
add env for apiurl (also in front end)
check if the field name has a matching look up table in the database and if it finds one render a select instead of an input
add a cofirm modal for delete
add validation to the add / edit form
make edit button a button
*/

//blacklist fields add to this if you have fields in your database you do not want apperance in the front end
const blackListFields = [
	'id',
	'guid',
	'created_at',
	'updated_at',
	'deleted_at',
	'isDeleted',
	'publishedAt',
	'adminId',
	'createdAt',
	'updatedAt',
	'deletedAt',
];

export default {
	/**
	 * Fetches data based on the request method and returns a response.
	 *
	 * @param {Request} request - The request object.
	 * @param {object} env - The environment object.
	 * @param {object} ctx - The context object.
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

		/**
		 * Renders HTML based on the renderType, tableName, fields, and theData.
		 *
		 * @param {string} renderType - The type of rendering. Can be 'table', 'formedit', or 'formadd'.
		 * @param {string} tableName - The name of the table.
		 * @param {Array} fields - An array of field names.
		 * @param {Object} theData - The data to be rendered.
		 * @return {string} The rendered HTML.
		 */
		const renderHTML = (renderType, tableName, fields, theData) => {
			//construct html reaponse
			let htmlResponse = '';
			//renderType can be table, formedit, formadd
			if (renderType === 'table') {
				//render data
				const dataToRender = Array.isArray(theData.results) ? theData.results : [theData];
				//render table
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
					| <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
						<button hx-delete="http://localhost:8787/${tableName}/${result.id}" 
								hx-trigger='confirmed'
								onClick="Swal.fire({title: 'Delete Record',showCancelButton: true, text:'Do you want to continue?'}).then((result)=>{
									if(result.isConfirmed){
									htmx.trigger(this, 'confirmed');  
									} 
								})">
						Delete
						</button>
                  </td>
                </tr>`
								)
								.join('')}
            </tbody>
          </table>`;
				//render form
			} else if ((renderType === 'formedit' || renderType === 'formadd') && theData) {
				const formData = renderType === 'formedit' ? (Array.isArray(theData.results) ? theData.results[0] : theData) : {};

				const formFields = (renderType === 'formedit' ? Object.keys(formData) : theData.results.map((field) => field.name))
					.filter((key) => !blackListFields.includes(key))
					.map(
						(key) => `
            <div class="form-group">
              <label>${key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <input type="text" name="${key}" value="${formData[key] || ''}" />
            </div>`
					)
					.join('');
				//render form
				const formAction = renderType === 'formedit' ? 'hx-put' : 'hx-post';
				const formUrl =
					renderType === 'formedit' ? `http://localhost:8787/${tableName}/${formData.id}` : `http://localhost:8787/${tableName}/`;
				htmlResponse = `
          <form ${formAction}="${formUrl}" hx-target="this" hx-swap="outerHTML">
            ${formFields}
            <button type="submit" class="btn">Submit</button>
            <a class="btn" href="/${tableName}/">Cancel</a>
          </form>`;
			} else {
				htmlResponse = `<div>Unsupported render type: ${renderType}</div>`;
			}

			return htmlResponse;
		};

		/**
		 * Sends a response with the specified message, status code, and content type.
		 *
		 * @param {string} theMessage - The message to be sent in the response.
		 * @param {number} theCode - The status code of the response.
		 * @param {string} [theType='text/html'] - The content type of the response. Default is 'text/html'.
		 * @return {Promise<Response>} A Promise that resolves to the response object.
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
		 * Returns an array of fields based on the given table name.
		 *
		 * @param {string} table - The name of the table.
		 * @return {Array} An array of fields for the given table.
		 */
		const setFields = (table) => {
			if (table == 'projects') return ['id', 'name', 'guid'];
			if (table == 'user') return ['id', 'name', 'email'];
		};

		// Get request
		if (request.method === 'GET') {
			//get the current hx url and parse it
			const currentUrl = request.headers.get('Hx-Current-Url');
			const urlObj = new URL(currentUrl);
			const searchParams = new URLSearchParams(urlObj.search);
			//create an object from the search params
			const params = {};
			searchParams.forEach((value, key) => {
				params[key] = value.includes(',') ? value.split(',') : value;
			});
			//get the table name
			const segments = urlObj.pathname.split('/').filter((segment) => segment.length > 0);
			const tableName = segments[0];
			//get the fields
			const fieldNames = setFields(tableName);
			//get the query
			const fieldsString = fieldNames.join(',');
			//set the response
			let htmlResponse = '';
			//set render type to table
			let renderType = 'table';
			//set the query
			let theQuery = `SELECT ${fieldsString} FROM ${tableName} WHERE isDeleted = 0`;
			//set the query based on the params
			if (Object.keys(params).length !== 0) {
				if (params.id == 0) {
					renderType = 'formadd';
					theQuery = `PRAGMA table_info(${tableName});`;
				} else if (Number.isInteger(Number(params.id)) && Number(params.id) > 0) {
					theQuery = `SELECT * FROM ${tableName} WHERE isDeleted = 0 AND id = ${params.id}`;
					renderType = 'formedit';
				} else {
					htmlResponse = `<div>invalid id</div>`;
					return sendResponse(htmlResponse, 200);
				}
			}
			//run the query
			try {
				const stmt = env.DB.prepare(theQuery);
				let theData;
				//get all or the first record based on the render type
				if (renderType == 'table' || renderType == 'formadd') {
					theData = await stmt.all();
				} else {
					theData = await stmt.first();
				}

				//check if the data is empty
				if (theData.length === 0) {
					htmlResponse = `<div>no results</div>`;
				} else {
					htmlResponse = renderHTML(renderType, tableName, fieldNames, theData);
				}

				return sendResponse(htmlResponse, 200);
			} catch (error) {
				console.error('Error executing query:', error);
				htmlResponse = `Error executing query ${theQuery}`;
				return sendResponse(htmlResponse, 500);
			}
		}
		//check for the method
		if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
			try {
				//get the current hx url and parse it
				const url = new URL(request.url);
				//get the table name
				const segments = url.pathname.split('/').filter((segment) => segment.length > 0);
				const tableName = segments[0];
				let id;
				//run delete
				if (request.method === 'DELETE') {
					//get the id
					id = segments[1];
					//check if the id is empty
					if (!id) {
						return sendResponse('Missing ID for deletion', 400);
					}
					//delete the record (soft delete)
					const sql = `UPDATE ${tableName} SET isDeleted = 1 WHERE id = ${id}`;
					const stmt = env.DB.prepare(sql);
					const result = await stmt.run();
					//send the response
					return sendResponse('Record deleted successfully', 200);
				} else {
					//set the id from segement 2 as it we are in add/edit
					id = segments[2];
				}
				//set the content type
				const contentType = request.headers.get('content-type');
				//check if the content type is json ot form data and parse it to the body object
				const body = contentType.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
				//rempve any fields in the blacklist
				const fields = Object.keys(body).filter((key) => !blackListFields.includes(key));
				//set the query
				let sql = '';
				//check the method
				if (request.method === 'POST') {
					//insert the record
					const fieldList = fields.join(', ');
					const valueList = fields.map((field) => `'${body[field]}'`).join(', ');
					sql = `INSERT INTO ${tableName} (${fieldList}) VALUES (${valueList})`;
				} else if (request.method === 'PUT') {
					//update the record
					const setClause = fields
						.map((field) => {
							const value = typeof body[field] === 'string' ? `'${body[field]}'` : body[field];
							return `${field} = ${value}`;
						})
						.join(', ');
					sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ${id}`;
				}
				//run the query
				const stmt = env.DB.prepare(sql);
				const result = await stmt.run();
				//send response
				return sendResponse('Operation successful', 200);
			} catch (error) {
				console.error('Error handling request:', error);
				return sendResponse('Internal Server Error', 500);
			}
		}
		//method not allowed response
		return sendResponse('Method Not Allowed', 405);
	},
};
