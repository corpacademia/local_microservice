const Instamojo = require("instamojo-nodejs");
require("dotenv").config();

Instamojo.setKeys(process.env.INSTAMOJO_API_KEY, process.env.INSTAMOJO_AUTH_TOKEN);

// true = Sandbox, false = Live
Instamojo.isSandboxMode(true);

module.exports = Instamojo;
