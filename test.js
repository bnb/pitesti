'use strict'

let files = require('fs').readdirSync('./test')

function runTests () {
  if (!files.length) {
    console.log('\n# success')
    process.exit(0)
  }

  let suite = files.shift()
  if (/\.js$/.test(suite)) {
    try {
      require(require('path').join(__dirname, 'test', suite))(() => setImmediate(runTests))
    } catch (e) {
      console.error(e.stack)
      process.exit(1)
    }
  } else {
    runTests()
  }
}

runTests()
