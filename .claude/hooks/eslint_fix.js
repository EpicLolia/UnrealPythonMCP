const { execSync } = require('child_process');

let data = '';
process.stdin.on('data', (chunk) => (data += chunk));
process.stdin.on('end', () => {
  const input = JSON.parse(data);
  const filePath = input.tool_input.file_path;

  let output = '';
  try {
    output = execSync(`npx eslint "${filePath}" --fix`, { encoding: 'utf-8' });
  } catch (error) {
    output = error.stdout || error.message;
  }

  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: output } }));
});
