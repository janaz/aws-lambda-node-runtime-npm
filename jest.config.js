const config = {
  preset: 'ts-jest',
  testMatch: [
    "<rootDir>/tests/**/*.(test|spec).ts"
  ]
};

// if (process.version.startsWith('v10.')) {
//   // disable Hapi integration in node 10
//   config.testPathIgnorePatterns = [
//     "/node_modules/", "/integration-hapi-19/", "/integration-hapi-20/"
//   ];
// }

module.exports = config;
