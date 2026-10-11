const {run}=require('./lib.js');
run(require(process.argv[2]),{dry:process.argv[3]==='dry',outDir:process.argv[4]}).catch(e=>{console.error(e);process.exit(1)});
