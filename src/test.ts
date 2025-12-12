import { runCommand } from '.';

runCommand('print("Hello World")').then((result) => {
  console.log(result.output.map((line) => line.output).join('\n'));
});
