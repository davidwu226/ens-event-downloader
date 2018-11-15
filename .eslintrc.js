module.exports = {
    "root": true,
    "parser": "babel-eslint",
    "extends": "airbnb",
    "rules": {
        "semi": ["error", "never"],
        "no-console": 0,
        "no-underscore-dangle": 0,
        "no-param-reassign": ["error", { "props": false }],
        "no-cond-assign": ["error", "except-parens"],
        "no-plusplus": 0,
        "class-methods-use-this": 0,
        "max-len": ["error", 1250],
        "camelcase": 0,
        "import/prefer-default-export": 0,
        "import/extensions": 0,
        "no-param-reassign": 0,
        "no-await-in-loop": 0,
        "jsx-a11y/media-has-caption": 0,
        "jsx-a11y/accessible-emoji": 0,
        // The indent rule is copied from eslint-config-airbnb-base,
        // relaxed with extra ignoredNodes.
        "indent": ['error', 2, {
          SwitchCase: 1,
          VariableDeclarator: 1,
          outerIIFEBody: 1,
          FunctionDeclaration: {
            parameters: 1,
            body: 1
          },
          FunctionExpression: {
            parameters: 1,
            body: 1
          },
          CallExpression: {
            arguments: 1
          },
          ArrayExpression: 1,
          ObjectExpression: 1,
          ImportDeclaration: 1,
          flatTernaryExpressions: false,
          ignoredNodes: [
            'JSX*', // Chatmost
            'CallExpression *', // Chatmost
            'ConditionalExpression', // Chatmost
            'MemberExpression' // Chatmost
          ]
        }]
    }
};
