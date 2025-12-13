import { commandResultToJsonString, getUnrealPythonStub, runCommand, runFile } from '.';

async function test() {
  {
    const result = await runCommand('print("Hello World")');
    console.log(commandResultToJsonString(result));
  }

  {
    const result = await runFile(`${__dirname}/sample.py`, ['arg1', 'arg2']);
    console.log(commandResultToJsonString(result));
  }

  {
    const result = await getUnrealPythonStub();
    console.log(result);
  }
}

test();
