/*
Copyright 2015, Yahoo Inc. All rights reserved.
Code licensed under the MIT License.
See LICENSE.txt
*/

'use strict'

const makeTap = require('make-tap-output')
const tage = require('tage')
const createTestPromise = require('create-test-promise')

const isNum = n => typeof n === 'number'

class PitestiSuite {
  constructor (opts) {
    opts = opts || {}
    this.tests = []
    this.testNames = []
    this.skips = {}
    this.totalSkips = 0
    this.totalPasses = 0
    this.totalFails = 0
    this.totalTests = 0
    this.onlyTest = null
    this.exitCode = 0
    this.finisher = opts.done || process.exit
    this.out = opts.outputStream || process.stdout
    this.summary = opts.summary === undefined ? true : opts.summary
    this.tap = makeTap()
    this.tap.pipe(this.out)
  }

  test (name, fnOrP) {
    this.testNames.push(name)
    this.tests.push(fnOrP ? createTestPromise(fnOrP) : null)
  }

  runTest (i) {
    if (i === this.tests.length) {
      if (this.summary) {
        this.out.write('\n')
        this.tap.diag(`tests ${this.totalTests}`)
        this.tap.diag(`pass  ${this.totalPasses}`)
        this.tap.diag(`fail  ${this.totalFails}`)
        if (this.totalSkips > 0) {
          this.tap.diag(`skip  ${this.totalSkips}`)
        }
      }
      return this.finisher(this.exitCode)
    }
    this.totalTests++
    const name = this.testNames[i]
    if (!this.tests[i] || (isNum(this.onlyTest) && this.onlyTest !== i)) {
      this.tap.pass(name, 'SKIP')
      this.totalSkips++
      return this.runTest(++i)
    }
    this.tests[i]()
    .then(
      () => {
        this.totalPasses++
        this.tap.pass(name)
      },
      err => {
        this.exitCode = 1
        this.totalFails++
        this.tap.fail(name, typeof err === 'string' ? {message: err} : err)
      }
    )
    .then(() => this.runTest(++i))
    .catch(e => this.bailOut(e))
    // ^ Should only get here if there's an error in our code.
  }

  skip (name) {
    this.testNames.push(name)
    this.tests.push(null)
  }

  only (name, t) {
    this.onlyTest = this.tests.length
    this.test(name, t)
  }

  plan () {
    this.tap.plan(this.tests.length)
  }

  bailOut (err) {
    this.out.write(err.stack)
    this.out.write('\n\nBail out! Internal pitesti error, see above.\n')
    this.finisher(2)
  }
}

['test', 'only', 'skip'].forEach(func => {
  PitestiSuite.prototype[func] = tage(PitestiSuite.prototype[func])
})

module.exports = function (opts) {
  let testStarted = false
  const suite = new PitestiSuite(opts)
  const test = function () {
    if (testStarted) {
      return
    }
    if (arguments.length === 0) {
      testStarted = true
      suite.plan()
      suite.runTest(0)
      return
    }
    return suite.test.apply(suite, arguments)
  }
  test.only = function () { return suite.only.apply(suite, arguments) }
  test.skip = function () { return suite.skip.apply(suite, arguments) }
  return test
}
