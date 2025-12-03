append-field

A lightweight utility for safely appending nested fields into JavaScript objects.
Useful when building parsers for application/x-www-form-urlencoded and multipart/form-data, or when processing complex form structures.

This library follows the W3C HTML JSON Forms specification
 for consistent parsing behavior.

✨ Features

Append deeply-nested fields using string paths (pets[0][name])

Works perfectly with objects created via Object.create(null)

Avoids prototype pollution issues

Zero dependencies & tiny footprint

Simple and predictable API

📦 Installation
npm install --save append-field

🚀 Usage Example
const appendField = require('append-field')
const obj = Object.create(null)

appendField(obj, 'pets[0][species]', 'Dahut')
appendField(obj, 'pets[0][name]', 'Hypatia')
appendField(obj, 'pets[1][species]', 'Felis Stultus')
appendField(obj, 'pets[1][name]', 'Billie')

console.log(obj)

Output
{
  "pets": [
    { "species": "Dahut", "name": "Hypatia" },
    { "species": "Felis Stultus", "name": "Billie" }
  ]
}

📚 API Reference
appendField(store, key, value)
Param	Type	Description
store	Object	The target object to append values into
key	String	Field name in dotted or bracket notation
value	any	Value to append

Behavior:

Automatically creates objects/arrays along the key path.

If the field already exists and is not an array, it converts it into an array and appends the new value.

Supports nested brackets like user[address][city].

🛠️ When Should You Use This?

Use append-field when:

You’re implementing a form-data or URL-encoded body parser

You need to safely build nested objects based on dynamic string keys

You want predictable behavior for merging form-like data structures

🔧 Supported Environments

Node.js ≥ 10

Works in any JavaScript environment that supports CommonJS

📄 License

MIT © Contributors
