module.exports = {
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "__tests__/unit/**/*.test.ts",
  ],
  roots: ["./__tests__/unit/"],
  testURL: "http://localhost",
  testPathIgnorePatterns: ["/dist/", "/node_modules/"],
}
