"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
async function test() {
    {
        const result = await (0, _1.runCommand)('print("Hello World")');
        console.log(result.output.map((line) => line.output).join('\n'));
    }
    {
        const result = await (0, _1.runFile)(`${__dirname}/sample.py`, ['arg1', 'arg2']);
        console.log(result.output.map((line) => line.output).join('\n'));
    }
    {
        const result = await (0, _1.getUnrealPythonStub)();
        console.log(result);
    }
}
test();
//# sourceMappingURL=test.js.map