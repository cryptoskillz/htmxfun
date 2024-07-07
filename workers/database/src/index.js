/*
todo

join all the js file into one (or leave to cloudflare / ci)
add jwt login and end point

*/

//blacklist fields add to this if you have fields in your database you do not want apperance in the front end
//note : during the insert these will have to be added so we should parse it and put in correct vairables.
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

		// Function to generate a UUID v4
		const generateUUID = () => {
			// Create an array to hold the random values
			let array = new Uint8Array(16);
			crypto.getRandomValues(array);
			// Set the version to 4 (random)
			array[6] = (array[6] & 0x0f) | 0x40;
			array[8] = (array[8] & 0x3f) | 0x80;
			// Convert the array to a UUID string
			const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
			return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
		};

		/**
		 * Returns an array of field objects based on the given table name.
		 *
		 * @param {string} tableName - The name of the table.
		 * @return {Array<Object>} An array of field objects.
		 *
		 *
		 *	Field configuration object. It defines characteristics of a field:
		 *
		 *	name: the name of the field
		 *	value: the initial value of the field
		 *	placeHolder: the placeholder text for the field
		 *	inputType: the type of input (e.g., integer, text, select)
		 *	minLength: the minimum length of the field
		 *	maxLength: the maximum length of the field
		 *	extendedType: additional type for custom validation
		 *	required: indicates if the field is required
		 *	disabled: indicates if the field is disabled
		 *	allowEdit: specifies if the field is editable
		 */
		const setFields = (tableName) => {
			if (tableName == 'projects')
				return [
					{
						name: 'id',
						value: '',
						placeHolder: 'Enter ID',
						inputType: 'integer',
						minLength: 0,
						maxLength: 0,
						extendedType: '',
						required: true,
						disableAdd: false,
						disableEdit: false,
					},
					{
						name: 'name',
						value: '',
						placeHolder: 'Enter Name',
						inputType: 'text',
						minLength: 0,
						maxLength: 0,
						extendedType: '',
						required: false,
						disableAdd: false,
						disableEdit: false,
					},
					{
						name: 'guid',
						value: '',
						placeHolder: '',
						inputType: 'text',
						minLength: 0,
						maxLength: 0,
						extendedType: 'guid',
						required: false,
						disableAdd: true,
						disableEdit: true,
					},
				];
			if (tableName == 'user')
				return [
					{
						name: 'id',
						value: '',
						placeHolder: 'Enter ID',
						inputType: 'number',
						minLength: 0,
						maxLength: 0,
						extendedType: '',
						required: true,
						disableAdd: false,
						disableEdit: false,
					},
					{
						name: 'name',
						value: '',
						placeHolder: 'Enter Name',
						inputType: 'select',
						minLength: 5,
						maxLength: 10,
						extendedType: '',
						required: true,
						disableAdd: false,
						disableEdit: false,
					},
					{
						name: 'email',
						value: '',
						placeHolder: 'Enter Email',
						inputType: 'email',
						minLength: 0,
						maxLength: 0,
						extendedType: '',
						required: true,
						disableAdd: false,
						disableEdit: false,
					},
					{
						name: 'username',
						value: '',
						placeHolder: '',
						inputType: 'text',
						minLength: 0,
						maxLength: 0,
						extendedType: '',
						required: false,
						disableAdd: false,
						disableEdit: false,
					},
				];
		};

		/**
		 * Retrieves lookup data based on the provided table name, field name, and override bound to table flag.
		 *
		 * @param {string} tableName - The name of the table.
		 * @param {string} fieldName - The name of the field.
		 * @param {boolean} [overRideBoundToTable=false] - Flag to override the bound to table.
		 * @return {Promise<Array<string>>} A Promise that resolves to an array of data.
		 */
		const getLookupData = async (tableName, fieldName, overRideBoundToTable = false) => {
			const lookupData = [
				{
					fieldName: 'name',
					boundToTable: 'projects', // Set to specific table name if bound, otherwise false
					data: ['chris', 'dave', 'eric'],
				},
			];

			// Find the matching entries in lookupData based on fieldName and boundToTable
			const matchingEntries = lookupData.filter(
				(entry) => entry.fieldName === fieldName && (entry.boundToTable === false || entry.boundToTable === tableName)
			);

			// Extract data from matching entries
			let data = matchingEntries.map((entry) => entry.data).flat();

			// If no data found and boundToTable is set, use boundToTable data as fallback if overRideBoundToTable is true
			if (data.length === 0 && overRideBoundToTable === true) {
				const fallbackEntry = lookupData.find((entry) => entry.fieldName === fieldName && entry.boundToTable != false);
				if (fallbackEntry) {
					data = fallbackEntry.data;
				}
			}

			return data;
		};

		/**
		 * Validates the given data.
		 *
		 * @param {Object} data - The data to be validated.
		 * @return {boolean} Returns true if the data is valid, false otherwise.
		 *
		 * todo: to add the logic to check if the table exits in the database, we could have this as look up arrays like setfields
		 */
		const validateData = (data) => {
			// This is whwew you would put your validation logic i am too lazy to add it at this moment in time if you want to add it have at ye.
			return true;
		};

		/**
		 * Validates and generates extended data based on the table name and body.
		 *
		 * @param {string} tableName - The name of the table.
		 * @return {Array<Object>} An array of extended data objects.
		 */
		const validateExtendedTypes = (tableName) => {
			//get the fields for the table
			const fields = setFields(tableName);
			//filter the fields for extended types
			const extendedFields = fields.filter((field) => field.extendedType && !blackListFields.includes(field.name));
			//generate the extended data
			const extendedData = [];
			//loop through the extended fields
			extendedFields.forEach((field) => {
				if (field.extendedType === 'guid') {
					extendedData.push({
						name: field.name,
						value: generateUUID(),
					});
				} else {
					// Handle other extended types if needed
				}
			});
			//return the extended data
			return extendedData;
		};

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

			// Check the render type
			if (renderType === 'table') {
				// Render the table
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

				// Render the fields
				const formFields = await Promise.all(
					fields
						.filter((field) => !blackListFields.includes(field.name))
						.map(async (field) => {
							let lookupData = [];
							if (field.inputType === 'select') {
								lookupData = await getLookupData(tableName, field.name, false);
							}

							if (lookupData.length > 0) {
								return `
                            <div>
                                <label>${field.required ? '*' : ''} ${field.name.charAt(0).toUpperCase() + field.name.slice(1)}</label>
                                <select name="${field.name}" ${field.required ? 'required' : ''} ${field.disabled ? 'disabled' : ''}>
                                    ${lookupData
																			.map(
																				(item) =>
																					`<option value="${item}" ${formData[field.name] === item ? 'selected' : ''}>
                                                ${item}
                                            </option>`
																			)
																			.join('')}
                                </select>
                            </div>
                        `;
							} else {
								// Fallback for select fields with no data
								if (field.inputType === 'select') {
									console.warn(`Field ${field.name} changed from select to text due to no data.`);
									field.inputType = 'text';
								}

								return `
                            <div>
                                <label>${field.required ? '*' : ''} ${field.name.charAt(0).toUpperCase() + field.name.slice(1)}</label>
                                <input type="${field.inputType === 'integer' ? 'number' : field.inputType}" name="${field.name}" value="${
									formData[field.name] || ''
								}"  
                                    ${field.placeHolder ? 'placeholder="' + field.placeHolder + '"' : ''} 
                                    ${field.required ? 'required' : ''} 
                                    ${field.minLength ? 'minlength="' + field.minLength + '"' : ''} 
                                    ${field.maxLength ? 'maxlength="' + field.maxLength + '"' : ''} 
                                    ${renderType === 'formadd' && field.disableAdd === true ? 'disabled' : ''}
                                    ${renderType === 'formedit' && field.disableEdit === true ? 'disabled' : ''}
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

		//get the fields for the table
		if (request.method === 'GET') {
			//get the query params
			const currentUrl = request.headers.get('Hx-Current-Url');
			const urlObj = new URL(currentUrl);
			const searchParams = new URLSearchParams(urlObj.search);
			const params = {};
			searchParams.forEach((value, key) => {
				params[key] = value.includes(',') ? value.split(',') : value;
			});
			//get the table name
			const segments = urlObj.pathname.split('/').filter((segment) => segment.length > 0);
			const tableName = segments[0];
			//set the fields
			const fieldNames = setFields(tableName);
			const fieldsString = fieldNames.map((f) => f.name).join(',');
			let htmlResponse = '';
			//set the render type
			let renderType = 'table';
			//set the query
			let theQuery = `SELECT ${fieldsString} FROM ${tableName} WHERE isDeleted = 0`;
			//build the query with the params and table name
			if (Object.keys(params).length !== 0) {
				if (params.id == 0) {
					renderType = 'formadd';
					theQuery = `PRAGMA table_info(${tableName});`;
				} else if (Number.isInteger(Number(params.id)) && Number(params.id) > 0) {
					theQuery = `SELECT * FROM ${tableName} WHERE isDeleted = 0 AND id = ${params.id}`;
					renderType = 'formedit';
				} else {
					//invalid id
					htmlResponse = `<div>invalid id</div>`;
					return sendResponse(htmlResponse, 200);
				}
			}
			try {
				//	execute the query
				const stmt = env.DB.prepare(theQuery);
				let theData;
				//get the first or all results
				if (renderType == 'table' || renderType == 'formadd') {
					theData = await stmt.all();
				} else {
					theData = await stmt.first();
				}
				//check we have some results
				if (theData.length === 0) {
					htmlResponse = `<div>no results</div>`;
				} else {
					//render the html
					htmlResponse = await renderHTML(renderType, tableName, fieldNames, theData);
				}
				return sendResponse(htmlResponse, 200);
			} catch (error) {
				console.error('Error executing query:', error);
				htmlResponse = `Error executing query ${theQuery}`;
				return sendResponse(htmlResponse, 500);
			}
		}
		//insert / update / delete
		if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
			try {
				//get the table name
				const url = new URL(request.url);
				const segments = url.pathname.split('/').filter((segment) => segment.length > 0);
				const tableName = segments[0];
				//set the fields
				const id = segments[1];
				if (request.method === 'DELETE') {
					if (!id) {
						return sendResponse('Missing ID for deletion', 400);
					}
					//delete the record
					const sql = `UPDATE ${tableName} SET isDeleted = 1 WHERE id = ${id}`;
					const stmt = env.DB.prepare(sql);
					const result = await stmt.run();
					return sendResponse('Record deleted successfully', 200);
				}
				//get the data
				const contentType = request.headers.get('content-type');
				const body = contentType.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
				//validate the data
				const fields = Object.keys(body).filter((key) => !blackListFields.includes(key));
				const isValid = validateData(fields);
				if (!isValid) {
					return sendResponse('Invalid data', 400);
				}
				//build the sql
				let sql = '';
				let updateTextType = 'added';
				//check if its a post
				if (request.method === 'POST') {
					//get the extended data
					const extendedData = validateExtendedTypes(tableName, body);
					// Construct fields excluding blacklisted fields
					const fields = setFields(tableName).filter((field) => !blackListFields.includes(field.name));
					// Construct field list
					const fieldList = fields.map((field) => field.name).join(', ');
					// Construct value list
					const valueList = fields
						.map((field) => {
							if (extendedData.some((data) => data.name === field.name)) {
								return `'${extendedData.find((data) => data.name === field.name).value}'`;
							} else {
								// Handle regular fields from body or set defaults as needed
								const fieldValue = body[field.name] !== undefined ? `'${body[field.name]}'` : 'NULL';
								return fieldValue;
							}
						})
						.join(', ');
					// Build SQL statement
					sql = `INSERT INTO ${tableName} (${fieldList}) VALUES (${valueList})`;
					console.log('SQL Statement:', sql);
				} else if (request.method === 'PUT') {
					//update the record
					updateTextType = 'updated';
					const setClause = fields
						.map((field) => {
							const value = typeof body[field] === 'string' ? `'${body[field]}'` : body[field];
							return `${field} = ${value}`;
						})
						.join(', ');
					sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ${id}`;
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
