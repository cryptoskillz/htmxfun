/*
	TODO:

	when you click back it will render the other forms oddly (check out why)
*/

import jwt from '@tsndr/cloudflare-worker-jwt';

// fields to ignore
const blackListFields = ['id', 'authToken'];
//look up data for selects
const lookUpData = [
	{ value: 'chris', name: 'chris' },
	{ value: 'dave', name: 'dave' },
	{ value: 'jonesy', name: 'jonesy' },
];

//fields to use, should be using prisma really for this
const fieldsConfig = {
	projects: [
		{ name: 'id', inputType: 'integer', required: true },
		{ name: 'name', inputType: 'text', required: true },
		{ name: 'guid', inputType: 'text', extendedType: 'guid', disableAdd: true, disableEdit: true },
	],
	user: [
		{ name: 'id', inputType: 'number', required: true },
		{ name: 'name', inputType: 'text', minLength: 5, maxLength: 10, required: true },
		{ name: 'email', inputType: 'email', required: true },
		{ name: 'username', inputType: 'text' },
	],
};

export default {
	/**
	 * Fetches data based on the request method and returns the appropriate response.
	 *
	 * @param {Request} request - The request object containing information about the incoming request.
	 * @param {Object} env - The environment object containing configuration settings.
	 * @param {Object} ctx - The context object containing additional information.
	 * @return {Promise<Response>} A promise that resolves to the response object.
	 */
	async fetch(request, env, ctx) {
		if (request.method === 'OPTIONS') {
			return handleOptions();
		}

		//sometimes depending if its a get, post, has an auth token etc it passes up the data in different ways in the url, the hxurl or in the form data this code gets it no matter were it is
		const url = new URL(request.url);
		const hxUrl = new URL(request.headers.get('Hx-Current-Url'));
		//get the table name
		const tableName = hxUrl.pathname.split('/').filter(Boolean)[0]; // Get the first segment
		const hxSearchParams = hxUrl.searchParams;
		//get the id
		let id = hxSearchParams.get('id'); // Get the first segment
		if (id == null) id = url.pathname.split('/').filter(Boolean)[1];
		// Handle GET
		if (request.method === 'GET') {
			// get the auth token
			const authToken = getUrlParameter(hxUrl, 'authToken') || getUrlParameter(url, 'authToken');
			// get the params
			const params = Object.fromEntries(hxSearchParams.entries());
			// Handle GET request
			return handleGetRequest(request, env, tableName, params, authToken);
		}
		// Handle GET, POST, PUT, DELETE
		if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
			// get the auth token
			const body = await parseRequestBody(request);
			// get the auth token
			const authToken = body.authToken || getUrlParameter(hxUrl, 'authToken') || getUrlParameter(url, 'authToken');
			// Handle GET request
			return handleDataModification(request, env, id, tableName, body, authToken);
		}

		return sendResponse('Method Not Allowed', 405);
	},
};

/**
 * Creates a new Response object with the specified headers.
 *
 * @return {Response} The created Response object.
 */
function handleOptions() {
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
 * Retrieves the lookup data for a given table and field.
 *
 * @param {string} tableName - The name of the table.
 * @param {string} fieldName - The name of the field.
 * @return {Promise<Array>} A promise that resolves to an array of lookup data.
 */
async function getLookupData(tableName, fieldName) {
	return lookUpData;
}

/**
 * Retrieves fields configuration based on the provided table name.
 *
 * @param {string} tableName - The name of the table to retrieve fields configuration for.
 * @return {Array} The fields configuration for the specified table name, or an empty array if not found.
 */
function getFields(tableName) {
	return fieldsConfig[tableName] || [];
}

/**
 * Handles the GET request by validating JWT, retrieving fields, determining render type, building query,
 * executing query, rendering HTML response, and sending the response.
 *
 * @param {Request} request - The request object containing information about the incoming request.
 * @param {Object} env - The environment object containing configuration settings.
 * @param {string} tableName - The name of the table to retrieve fields from.
 * @param {Object} params - The parameters for building the query.
 * @param {string} authToken - The authentication token for validation.
 * @return {Response} The response object based on the query execution and rendering.
 */
async function handleGetRequest(request, env, tableName, params, authToken) {
	// Validate JWT
	const jwtValid = await validateJWT(authToken, env.SECRET_KEY);
	if (!jwtValid) return sendResponse('Unauthorized', 401);
	// Retrieve fields
	const fields = getFields(tableName);
	// get the field names
	const fieldNames = fields.map((f) => f.name).join(',');
	// Determine render type
	const renderType = determineRenderType(params);
	// Build query
	const query = buildQuery(params, tableName, fieldNames, renderType, false);

	try {
		//set one or all records
		let returnOne = true;
		if (renderType == 'table') returnOne = false;
		// Execute query
		const data = await executeQuery(env.DB, query, returnOne, false);
		// Render HTML
		const htmlResponse = data.length === 0 ? 'No results' : await renderHTML(renderType, tableName, fields, data, env);
		// Send response
		return sendResponse(htmlResponse, 200);
	} catch (error) {
		console.error('Error executing query:', error);
		return sendResponse(`Error executing query: ${error.message}`, 500);
	}
}

/**
 * Handles the data modification based on the request method.
 *
 * @param {Object} request - The request object.
 * @param {Object} env - The environment object.
 * @param {string} id - The ID of the record.
 * @param {string} tableName - The name of the table.
 * @param {string} [body=''] - The request body.
 * @param {string} authToken - The authentication token.
 * @return {Promise<Object>} The response object.
 */
async function handleDataModification(request, env, id, tableName, body = '', authToken) {
	// Validate JWT it is either in the body, request url or the x-handle-url
	const jwtValid = await validateJWT(authToken, env.SECRET_KEY);
	if (!jwtValid) return sendResponse('Unauthorized', 401);
	// Handle DELETE request
	if (request.method === 'DELETE') {
		if (!id) return sendResponse('Missing ID for deletion', 400);
		// build the query
		//note should we move this to build query?
		const sql = `UPDATE ${tableName} SET isDeleted = 1 WHERE id = ${id}`;
		// execute the query
		await executeQuery(env.DB, sql);
		// send the response
		return sendResponse('Record deleted successfully', 200);
	}
	//get the fields and remove the ones in the blocklist
	const fields = Object.keys(body).filter((key) => !blackListFields.includes(key));
	// Validate data
	if (!validateData(fields)) return sendResponse('Invalid data', 400);
	//build the query
	const sql =
		request.method === 'POST' ? await buildInsertQuery(tableName, env, body) : buildUpdateQuery(tableName, fields, body, id, true);
	// execute the query
	await executeQuery(env.DB, sql, true, false);
	// send the response
	const responseObj = {
		message: `Record ${request.method === 'POST' ? 'added' : 'updated'} successfully`,
		tableName: tableName,
		statusText: 'OK',
	};
	return sendResponse(responseObj, 200, 'application/json');
}

/**
 * Function to extract URL parameter from query string
 *
 * @param {URL} url - The URL object containing the search parameters.
 * @param {string} name - The name of the parameter to extract.
 * @return {string | null} The value of the parameter if found, or null.
 */
function getUrlParameter(url, name) {
	// Function to extract URL parameter from query string
	const searchParams = new URLSearchParams(url.search);
	return searchParams.get(name);
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
 * Validates the JWT authentication token using the provided secret key.
 *
 * @param {string} authToken - The JWT authentication token to validate.
 * @param {string} secretKey - The secret key used for validation.
 * @return {Promise<boolean>} Returns a boolean indicating the validation result.
 */
async function validateJWT(authToken, secretKey) {
	return authToken ? await jwt.verify(authToken, secretKey) : false;
}

/**
 * Determines the type of rendering based on the parameters.
 *
 * @param {Object} params - The parameters object containing information for rendering.
 * @return {string} The type of rendering: 'formadd', 'formedit', or 'table'.
 */
function determineRenderType(params) {
	// Determine render type
	if (params.id === '0') return 'formadd';
	//check if it is table
	//note this seems overly complex
	if (Number.isInteger(Number(params.id)) && Number(params.id) > 0) return 'formedit';
	return 'table';
}

/**
 * Builds a SQL query based on the provided parameters.
 *
 * @param {Object} params - The parameters for the query.
 * @param {string} tableName - The name of the table to query.
 * @param {string} fieldNames - The names of the fields to select.
 * @param {string} renderType - The type of rendering.
 * @param {boolean} [debug=false] - Whether to log the query for debugging purposes.
 * @return {string} The built SQL query.
 */
function buildQuery(params, tableName, fieldNames, renderType, debug = false) {
	let query;
	//get the query based on the render type
	if (renderType === 'formedit') query = `SELECT * FROM ${tableName} WHERE isDeleted = 0 AND id = ${params.id}`;
	else query = `SELECT ${fieldNames} FROM ${tableName} WHERE isDeleted = 0`;
	//check if we in debug mode
	if (debug == true) console.log(query);
	//return the query
	return query;
}

/**
 * Validates the given data using a custom validation logic.
 *
 * @param {any} data - The data to be validated.
 * @return {boolean} Returns true if the data is valid, false otherwise.
 */
function validateData(data) {
	// Implement your validation logic here
	return true;
}

/**
 * Retrieves the fields of a specified table.
 *
 * @param {Object} env - The environment object containing configuration settings.
 * @param {string} tableName - The name of the table to retrieve fields from.
 * @return {Array} An array of field names from the specified table.
 */
async function getTableFields(env, tableName) {
	//TODO : Remove this to get it from the setfilds function
	const query = `PRAGMA table_info(${tableName});`;
	const data = await executeQuery(env.DB, query, false, false);
	return data.results.map((row) => row.name);
}

/**
 * Builds an SQL INSERT query based on the given table name, environment, and request body.
 *
 * @param {string} tableName - The name of the table to insert into.
 * @param {Object} env - The environment object containing configuration settings.
 * @param {Object} body - The request body containing data to be inserted.
 * @return {Promise<string>} A Promise that resolves to the SQL INSERT query.
 */
async function buildInsertQuery(tableName, env, body) {
	// Get all fields
	const allFields = await getTableFields(env, tableName);

	// Filter out blacklisted fields and 'authToken'
	const fields = allFields.filter((field) => !blackListFields.includes(field) && field !== 'authToken');

	// Generate extended data based on the fields
	const extendedData = generateExtendedData(fields);
	const insertFields = [];
	const insertValues = [];
	//loop through the fields
	fields.forEach((field) => {
		// Check if field is present in either body or extendedData
		if (!blackListFields.includes(field) && (body.hasOwnProperty(field) || extendedData.hasOwnProperty(field))) {
			// Add field to insertFields
			insertFields.push(field);
			// Get value from extended data or body and wrap in quotes if necessary
			const value = extendedData[field] ? `'${extendedData[field]}'` : `'${body[field]}'`;
			// Add value to insertValues
			insertValues.push(value);
		}
	});
	// Build INSERT query
	const fieldNames = insertFields.join(', ');
	const values = insertValues.join(', ');
	return `INSERT INTO ${tableName} (${fieldNames}) VALUES (${values})`;
}

/**
 * Builds an SQL UPDATE query based on the provided table name, fields, record body, and ID.
 *
 * @param {string} tableName - The name of the table to update.
 * @param {Array} fields - The fields to update.
 * @param {Object} body - The record body containing the updated values.
 * @param {string} id - The ID of the record to update.
 * @param {boolean} [debug=false] - Whether to log the generated SQL query for debugging.
 * @return {string} The constructed SQL UPDATE query.
 */
function buildUpdateQuery(tableName, fields, body, id, debug = false) {
	// Build SET clause
	const setClause = fields.map((field) => `${field} = '${body[field]}'`).join(', ');
	// Build UPDATE query
	let sql;
	sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ${id}`;
	// Log query if debug mode is enabledÍ
	if (debug == true) console.log(sql);
	return sql;
}

/**
 * Generates extended data based on the given fields.
 *
 * @param {Array} fields - An array of field names.
 * @return {Object} - An object containing the extended data.
 */
function generateExtendedData(fields) {
	const extendedData = {};
	fields.forEach((field) => {
		if (field === 'guid') extendedData[field] = generateUUID();
	});
	return extendedData;
}

/**
 * Generates a version 4 UUID (Universally Unique Identifier) in the format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.
 *
 * @return {string} The generated UUID.
 */
function generateUUID() {
	let array = new Uint8Array(16);
	crypto.getRandomValues(array);
	array[6] = (array[6] & 0x0f) | 0x40;
	array[8] = (array[8] & 0x3f) | 0x80;
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0'))
		.join('')
		.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}

/**
 * Renders HTML based on the given render type, table name, fields, data, and environment.
 *
 * @param {string} renderType - The type of rendering ('table', 'formedit', or 'formadd').
 * @param {string} tableName - The name of the table.
 * @param {Array<Object>} fields - An array of field objects.
 * @param {Array<Object>} data - An array of data objects.
 * @param {Object} env - The environment object containing configuration settings.
 * @return {Promise<string>} A promise that resolves to the rendered HTML.
 */
async function renderHTML(renderType, tableName, fields, data, env) {
	//check render type
	if (renderType === 'table') {
		//render table
		return renderTable(fields, data, tableName, env);
	}

	if (['formedit', 'formadd'].includes(renderType)) {
		//get form data
		const formData = renderType === 'formedit' ? data : {};
		//render form
		return renderForm(renderType, tableName, fields, formData, env);
	}

	return `<div>Unsupported render type: ${renderType}</div>`;
}

/**
 * Renders a table based on the fields, data, table name, and environment.
 *
 * @param {Array<Object>} fields - An array of field objects.
 * @param {Object} data - The data object containing results.
 * @param {string} tableName - The name of the table.
 * @param {Object} env - The environment object containing configuration settings.
 * @return {string} The rendered HTML table.
 */
function renderTable(fields, data, tableName, env) {
	const rows = data.results; // Access the results array from data
	// Render table
	const headers = fields.map((field) => `<th class="px-4 py-2">${field.name}</th>`).join('');
	const bodyRows = rows
		.map(
			(row) => `
            <tr>
                ${fields.map((field) => `<td>${row[field.name]}</td>`).join('')}
                <td>
                    <a class="pure-button" href="/${tableName}/edit/?id=${row.id}">Edit</a>
                    <button class="pure-button" hx-delete="${env.API_URL}${tableName}/${row.id}" 
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
		.join('');
	return `
        <table class="pure-table">
            <thead>
                <tr>${headers}<th class="px-4 py-2">Action</th></tr>
            </thead>
            <tbody>${bodyRows}</tbody>
        </table>
    `;
}

/**
 * Renders a form based on the render type, table name, fields, form data, and environment.
 *
 * @param {string} renderType - The type of rendering ('formedit' or 'formadd').
 * @param {string} tableName - The name of the table.
 * @param {Array<Object>} fields - An array of field objects.
 * @param {Object} formData - The form data to populate the fields.
 * @param {Object} env - The environment object containing configuration settings.
 * @return {string} The HTML form content.
 */
async function renderForm(renderType, tableName, fields, formData, env) {
	// Render form
	const formFields = await Promise.all(
		fields
			.filter((field) => !blackListFields.includes(field.name)) // Filter out fields in blacklist
			.map(async (field) => {
				let lookupData = [];
				if (field.inputType === 'select') {
					lookupData = await getLookupData(tableName, field);
				}

				if (lookupData.length > 0) {
					return renderSelectField(field, formData, lookupData);
				}
				return renderInputField(field, formData, renderType);
			})
	);

	const formAction = renderType === 'formedit' ? 'hx-put' : 'hx-post';
	const formUrl = renderType === 'formedit' ? `${env.API_URL}${tableName}/${formData.id}` : `${env.API_URL}${tableName}/`;
	return `
        <form class="pure-form pure-form-stacked" ${formAction}="${formUrl}" hx-target="#responseText" hx-swap="innerHTML">
            ${formFields.join('')}
            <button type="submit" class="pure-button pure-button-primary">${renderType === 'formedit' ? 'Update' : 'Add'}</button>
        </form>
    `;
}

/**
 * Renders an input field HTML element based on the given field, form data, and render type.
 *
 * @param {Object} field - The field object containing information about the input field.
 * @param {Object} formData - The form data object containing the values for the input fields.
 * @param {string} renderType - The type of rendering ('formadd' or 'formedit').
 * @return {string} The HTML string representing the input field.
 */
function renderInputField(field, formData, renderType) {
	// Render input field
	const value = formData[field.name] || '';
	const disableAttr = (field.disableAdd && renderType === 'formadd') || (field.disableEdit && renderType === 'formedit') ? 'disabled' : '';
	const requiredAttr = field.required ? 'required' : '';
	return `
        <label for="${field.name}">${field.name}</label>
        <input type="${field.inputType}" id="${field.name}" name="${field.name}" value="${value}" ${disableAttr} ${requiredAttr} />
    `;
}

/**
 * Renders a select field HTML element based on the given field, form data, and lookup data.
 *
 * @param {Object} field - The field object containing information about the select field.
 * @param {Object} formData - The form data object containing the values for the select field.
 * @param {Array} lookupData - The array of data used for populating the select options.
 * @return {string} The HTML string representing the select field.
 */
function renderSelectField(field, formData, lookupData) {
	// Generate options based on lookup data
	const options = lookupData
		.map((option) => {
			const selectedAttr = option.value === formData[field.name] ? 'selected' : '';
			return `<option value="${option.value}" ${selectedAttr}>${option.name}</option>`;
		})
		.join('');
	const requiredAttr = field.required ? 'required' : '';
	return `
        <label for="${field.name}">${field.name}</label>
        <select id="${field.name}" name="${field.name}" ${requiredAttr}>
            ${options}
        </select>
    `;
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

/**
 * Sends a response with the given body, status code, and content type.
 *
 * @param {any} body - The response body.
 * @param {number} [status=200] - The HTTP status code.
 * @param {string} [contentType='text/html'] - The content type of the response.
 * @return {Response} The response object.
 */
function sendResponse(body, status = 200, contentType = 'text/html') {
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
