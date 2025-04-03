module.exports = {
  default: {
    paths: ['src/features/**/*.feature'],
    require: ['src/steps/**/*.ts', 'src/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      '@cucumber/pretty-formatter',
      'html:src/reports/cucumber-report.html',
      'json:src/reports/cucumber-results.json'
    ],
    formatOptions: {
      snippetInterface: 'async-await',
      colorsEnabled: true,
      theme: {
        'feature keyword': ['green', 'bold'],
        'scenario keyword': ['green', 'bold'],
        'step keyword': ['cyan']
      }
    },
    timeout: 30000
  },
  verbose: {
    paths: ['src/features/**/*.feature'],
    require: ['src/steps/**/*.ts', 'src/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      '@cucumber/pretty-formatter',
      'html:src/reports/cucumber-report.html',
      'json:src/reports/cucumber-results.json'
    ],
    formatOptions: {
      snippetInterface: 'async-await',
      colorsEnabled: true,
      theme: {
        'feature keyword': ['green', 'bold'],
        'scenario keyword': ['green', 'bold'],
        'step keyword': ['cyan']
      }
    },
    timeout: 30000
  }
} 