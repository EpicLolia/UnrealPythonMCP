"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
(0, _1.runCommand)('print("Hello World")').then((result) => {
    console.log(result.output.map((line) => line.output).join('\n'));
});
//# sourceMappingURL=test.js.map