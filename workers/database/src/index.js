/*
todo

check if the field name has a matching look up table in the database and if it finds one render a select instead of an input
add validation to the add / edit form
join all the js file into one

validation flow 


remove validate worker
add validate to the post / put event


*/

//blacklist fields add to this if you have fields in your database you do not want apperance in the front end
//note : during the insert these will have to be added so we should parse it and put in correct vairables.
//note : this may no longer be required as we can disable the fields we no longer care about but i think it will keep it as removing things like isDeleted still makes sense
const blackListFields = [
	'id',
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

		/**
		 * Returns an array of field objects based on the given table name.
		 *
		 * @param {string} tableName - The name of the table.
		 * @return {Array<Object>} An array of field objects.
		 *
		 * extenedType : ie guid is used to preform extra validation that falls outside of the standard input type scope
		 */
		const setFields = (tableName) => {
			if (tableName == 'projects')
				return [
					{ name: 'id', value: '', placeHolder: 'Enter ID', inputType: 'integer', extendedType: '', required: true, disabled: false },
					{ name: 'name', value: '', placeHolder: 'Enter Name', inputType: 'text', extendedType: '', required: false, disabled: false },
					{ name: 'guid', value: '', placeHolder: 'Enter GUID', inputType: 'text', extendedType: 'guid', required: true, disabled: false },
				];
			if (tableName == 'user')
				return [
					{ name: 'id', value: '', placeHolder: 'Enter ID', inputType: 'number', extendedType: '', required: true, disabled: false },
					{ name: 'name', value: '', placeHolder: 'Enter Name', inputType: 'text', extendedType: '', required: true, disabled: false },
					{ name: 'email', value: '', placeHolder: 'Enter Email', inputType: 'email', extendedType: '', required: true, disabled: false },
				];
		};

		/**
		 * Retrieves lookup data based on the provided data.
		 *
		 * @param {Object} data - The data used to retrieve the lookup data.
		 * @return {Promise<Object>} A Promise that resolves to an empty object.
		 *
		 * todo: to add the logic to check if the table exits in the database, we could have this as look up arrays like setfields
		 */
		const getLookupData = async (data) => {
			return {};
		};

		/**
		 * Validates the given data.
		 *
		 * @param {Object} data - The data to be validated.
		 * @return {boolean} Returns true if the data is valid, false otherwise.
		 *
		 * todo: to add the logic to check if the table exits in the database, we could have this as look up arrays like setfields
		 */
		const valaidateData = (data) => {
			// Add your validation logic here
			return true;
		};

		/**
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

		/**
		 * Renders HTML based on the provided render type, table name, fields, and data.
		 *
		 * @param {string} renderType - The type of rendering to perform (table, formedit, formadd).
		 * @param {string} tableName - The name of the table.
		 * @param {Array<Object>} fields - An array of field objects.
		 * @param {Object} theData - The data to render.
		 * @return {Promise<string>} The rendered HTML.
		 */
		const renderHTML = async (renderType, tableName, fields, theData) => {
			let htmlResponse = '';

			if (renderType === 'table') {
				const dataToRender = Array.isArray(theData.results) ? theData.results : [theData];
				htmlResponse = `
            <table class="pure-table">
                <thead>
                    <tr>
                        ${fields.map((field) => `<th class="px-4 py-2">${field.name}</th>`).join('')}
                        <th class="px-4 py-2">Action</th>
                    </tr>
                </thead>
                <tbody hx-target="closest tr" hx-swap="outerHTML">
                    ${dataToRender
											.map(
												(result) => `
                        <tr>
                            ${fields.map((field) => `<td>${result[field.name]}</td>`).join('')}
                            <td>
                                <a class="pure-button" href="/${tableName}/edit/?id=${result.id}">Edit</a>
                                <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
                                <button class="pure-button" hx-delete="${env.API_URL}${tableName}/${result.id}" 
                                    hx-trigger='confirmed'
                                    hx-target="#responseText"
                                    hx-swap="innerHTML"
                                    onClick="Swal.fire({title: 'Delete Record',showCancelButton: true, text:'Do you want to continue?'}).then((result)=>{
                                        if(result.isConfirmed){
                                            htmx.trigger(this, 'confirmed');  
                                        } 
                                    })">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `
											)
											.join('')}
                </tbody>
            </table>`;
			} else if (renderType === 'formedit' || renderType === 'formadd') {
				const formData = renderType === 'formedit' ? (Array.isArray(theData.results) ? theData.results[0] : theData) : {};
				const formFields = await Promise.all(
					fields
						.filter((field) => !blackListFields.includes(field.name))
						.map(async (field) => {
							const lookupData = await getLookupData(field.name);
							if (lookupData.length > 0) {
								return `
                        <div>
                            <label>${field.required ? '*' : ''} ${field.name.charAt(0).toUpperCase() + field.name.slice(1)}</label>
                            <select name="${field.name}" ${field.required ? 'required' : ''} ${field.disabled ? 'disabled' : ''}>
                                ${lookupData
																	.map(
																		(item) =>
																			`<option value="${item.id}" ${formData[field.name] == item.id ? 'selected' : ''}>${
																				item.name
																			}</option>`
																	)
																	.join('')}
                            </select>
                        </div>
                    `;
							} else {
								return `
                        <div>
                            <label>${field.required ? '*' : ''} ${field.name.charAt(0).toUpperCase() + field.name.slice(1)}</label>
                            <input type="${field.inputType === 'integer' ? 'number' : field.inputType}" name="${field.name}" value="${
									formData[field.name] || ''
								}"  
                                ${field.placeHolder ? 'placeholder="' + field.placeHolder + '"' : ''} 
                                ${field.required ? 'required' : ''} 
                                ${field.disabled ? 'disabled' : ''}
                            />
                        </div>
                    `;
							}
						})
				);

				const formAction = renderType === 'formedit' ? 'hx-put' : 'hx-post';
				const formUrl = renderType === 'formedit' ? `${env.API_URL}${tableName}/${formData.id}` : `${env.API_URL}${tableName}/`;
				htmlResponse = `
            <form ${formAction}="${formUrl}" class="pure-form pure-form-stacked" hx-target="this" hx-swap="outerHTML">
                ${formFields.join('')}
                <button class="pure-button" type="submit">Submit</button>
                <a class="pure-button" href="/${tableName}/">Cancel</a>
            </form>`;
			} else {
				htmlResponse = `<div>Unsupported render type: ${renderType}</div>`;
			}

			return htmlResponse;
		};

		if (request.method === 'GET') {
			const currentUrl = request.headers.get('Hx-Current-Url');
			const urlObj = new URL(currentUrl);
			const searchParams = new URLSearchParams(urlObj.search);
			const params = {};
			searchParams.forEach((value, key) => {
				params[key] = value.includes(',') ? value.split(',') : value;
			});
			const segments = urlObj.pathname.split('/').filter((segment) => segment.length > 0);
			const tableName = segments[0];
			const fieldNames = setFields(tableName);
			const fieldsString = fieldNames.map((f) => f.name).join(',');
			let htmlResponse = '';
			let renderType = 'table';
			let theQuery = `SELECT ${fieldsString} FROM ${tableName} WHERE isDeleted = 0`;
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
			try {
				const stmt = env.DB.prepare(theQuery);
				let theData;
				if (renderType == 'table' || renderType == 'formadd') {
					theData = await stmt.all();
				} else {
					theData = await stmt.first();
				}
				if (theData.length === 0) {
					htmlResponse = `<div>no results</div>`;
				} else {
					htmlResponse = await renderHTML(renderType, tableName, fieldNames, theData);
				}
				return sendResponse(htmlResponse, 200);
			} catch (error) {
				console.error('Error executing query:', error);
				htmlResponse = `Error executing query ${theQuery}`;
				return sendResponse(htmlResponse, 500);
			}
		}

		if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
			try {
				const url = new URL(request.url);
				const segments = url.pathname.split('/').filter((segment) => segment.length > 0);
				const tableName = segments[0];
				const id = segments[1];
				if (request.method === 'DELETE') {
					if (!id) {
						return sendResponse('Missing ID for deletion', 400);
					}
					const sql = `UPDATE ${tableName} SET isDeleted = 1 WHERE id = ${id}`;
					const stmt = env.DB.prepare(sql);
					const result = await stmt.run();
					return sendResponse('Record deleted successfully', 200);
				}
				const contentType = request.headers.get('content-type');
				const body = contentType.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
				const fields = Object.keys(body).filter((key) => !blackListFields.includes(key));
				const isValid = valaidateData(fields);
				if (!isValid) {
					return sendResponse('Invalid data', 400);
				}
				let sql = '';
				let updateTextType = 'added';
				if (request.method === 'POST') {
					const fieldList = fields.join(', ');
					const valueList = fields.map((field) => `'${body[field]}'`).join(', ');
					sql = `INSERT INTO ${tableName} (${fieldList}) VALUES (${valueList})`;
				} else if (request.method === 'PUT') {
					updateTextType = 'updated';
					const setClause = fields
						.map((field) => {
							const value = typeof body[field] === 'string' ? `'${body[field]}'` : body[field];
							return `${field} = ${value}`;
						})
						.join(', ');
					sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ${id}`;
					console.log(segments);
					console.log(sql);
				}
				const stmt = env.DB.prepare(sql);
				const result = await stmt.run();
				const responseObj = {
					message: `Record ${updateTextType} successfully`,
					tableName: tableName,
					statusText: 'OK',
				};
				return sendResponse(JSON.stringify(responseObj), 200, 'application/json');
			} catch (error) {
				console.error('Error handling request:', error);
				return sendResponse('Internal Server Error', 500);
			}
		}

		return sendResponse('Method Not Allowed', 405);
	},
};
