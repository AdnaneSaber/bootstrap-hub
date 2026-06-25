process.argv.push('--webpack');
const { nextBuild } = require('./node_modules/next/dist/cli/next-build.js');
nextBuild(process.cwd()).then((code) => {
  process.exit(typeof code === 'number' ? code : 0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
