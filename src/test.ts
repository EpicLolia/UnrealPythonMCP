import { getUnrealPythonStub, runCommand, runFile } from '.';

async function test() {
  {
    const result = await runCommand('print("Hello World")');
    console.log(result.output.map((line) => line.output).join('\n'));
  }

  {
    const result = await runFile(`${__dirname}/sample.py`, ['arg1', 'arg2']);
    console.log(result.output.map((line) => line.output).join('\n'));
  }

  {
    const result = await getUnrealPythonStub();
    console.log(result);
  }
}

test();
