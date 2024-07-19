/*
proposed new format for fields config

name: 'id' //store the field name
alias:'id', //store the field alias
inputType: 'integer', //store the input type
required: true,  // store if the field is required
primaryIndex: true // store if the field is the primary index
extendedType: 'guid' //store the extended type
disableAdd: true, //store if the field can be added
disableEdit: true  //store if the field can be edited
foreignTable: 'projectDescription2' //store the foreign table

*/
const fieldsConfig = {
  projects: {
    fields: [
      {
        name: "id",
        alias: "id",
        inputType: "integer",
        required: true,
        primaryIndex: true,
      },
      { name: "name", alias: "name", inputType: "text", required: true },
      {
        name: "guid",
        alias: "guid",
        inputType: "text",
        extendedType: "guid",
        disableAdd: true,
        disableEdit: true,
      },
      { name: "description", alias: "description", inputType: "text" },
      {
        name: "description2",
        alias: "description2",
        inputType: "text",
        foreignTable: "projectDescription",
      },
      {
        name: "createdAt",
        alias: "createdAt",
        inputType: "text",
        foreignTable: "projectDescription2",
      },
    ],
    foreign: [
      {
        table: "projectDescription",
        index: "projectid",
        joinType: "INNER JOIN",
      },
      {
        table: "projectDescription2",
        index: "projectid",
        joinType: "INNER JOIN",
      },
      // Add other foreign keys if necessary
    ],
  },
  user: {
    fields: [
      { name: "id", inputType: "number", required: true, primaryIndex: true },
      {
        name: "name",
        inputType: "select",
        minLength: 5,
        maxLength: 10,
        required: true,
      },
      { name: "email", inputType: "email", required: true },
      { name: "username", inputType: "text" },
    ],
    // Add foreign key mappings if necessary
  },
};

function buildSelectQuery(table, fieldsConfig) {
  const tableConfig = fieldsConfig3[table];
  const fields = tableConfig.fields;
  const foreignConfig = tableConfig.foreign;

  let selectFields = [];
  let joinClauses = [];
  let foreignTables = new Set();

  // Add fields from the primary table
  selectFields.push(...fields.map((field) => `${table}.${field.name}`));

  // Process foreign fields
  fields.forEach((field) => {
    if (field.foreignTable) {
      const foreign = foreignConfig.find((f) => f.table === field.foreignTable);
      if (foreign) {
        // Add the foreign fields to the select list
        selectFields.push(
          `${field.foreignTable}.${field.name} AS ${field.name}`
        );

        // Track the foreign table for joining
        if (!foreignTables.has(field.foreignTable)) {
          foreignTables.add(field.foreignTable);
          joinClauses.push(
            `${foreign.joinType} ${field.foreignTable} ON ${table}.projectid = ${field.foreignTable}.${foreign.index}`
          );
        }
      }
    }
  });

  // Construct the SQL query
  const query = `
        SELECT ${selectFields.join(", ")}
        FROM ${table}
        ${joinClauses.join(" ")}
    `;

  return query;
}

// Example usage
const sqlQuery = buildSelectQuery("projects", fieldsConfig3);
console.log(sqlQuery);

function getFieldConfig(table, field) {
  const tableConfig = fieldsConfig3[table];
  const fieldConfig = tableConfig.fields.find((f) => f.name === field);

  if (fieldConfig && fieldConfig.foreignTable) {
    const foreignConfig = tableConfig.foreign.find(
      (f) => f.table === fieldConfig.foreignTable
    );
    if (foreignConfig) {
      fieldConfig.foreign = foreignConfig;
    }
  }

  return fieldConfig;
}

function buildJoinQuery(table, fieldConfig) {
  if (!fieldConfig.foreign) {
    return "";
  }

  const {
    table: foreignTable,
    index: foreignIndex,
    joinType,
  } = fieldConfig.foreign;
  const fieldsToSelect = fieldConfig.foreignFields
    ? fieldConfig.foreignFields.join(", ")
    : "*";

  return `
        ${joinType} ${foreignTable} ON ${table}.${fieldConfig.name} = ${foreignTable}.${foreignIndex}
        SELECT ${table}.*, ${fieldsToSelect}
    `;
}

// Example usage
const query = buildJoinQuery("projects", projectDescription2Config);
console.log(query);

// Example usage
const projectDescription2Config = getFieldConfig("projects", "description2");
console.log(projectDescription2Config);

// Example usage
const projectDescription2Config = getFieldConfig("projects", "description2");
console.log(projectDescription2Config);
s;
