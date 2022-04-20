/* eslint-disable no-console */
const createTestCafe = require("testcafe")

let testcafe
/*
const defaultConfig = {
  browsers: ["all:headless"],
  concurrency: 1,
  stopOnFirstfail: false,
}

const ciConfig = {
  browsers: ["chrome:headless", "firefox:headless"],
  concurrency: 1,
  stopOnFirstfail: true,
}
*/
createTestCafe("localhost", 1337, 1338)
  .then((tc) => {
    testcafe = tc
    const runner = testcafe.createRunner()

    return runner
      .startApp("npm run serve")
      .browsers(["firefox"])
      .concurrency(1)
      .src("__tests__/e2e/*.test.ts")
      

      .run({
        disableScreenshots: true,
        stopOnFirstFail: false,
      })
  })
  .then((failedCount) => {
    testcafe.close()
    if (failedCount > 0) {
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error(error)
    testcafe.close()
    process.exit(1)
  })
