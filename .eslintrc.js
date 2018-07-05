module.exports = {
    "env": {
        "browser": false,
        "es6": true,
        "node": true,
        "mocha": true
    },
    "extends": "airbnb-base",
    "rules": {
        // indentation
        "indent": ["error", 4, { "SwitchCase": 1 }],

        // semicolons
        "semi": ["off"],

        // no this in class method declaration
        "class-methods-use-this": "off",

        // curly braces http://eslint.org/docs/rules/curly
        "curly": "off",

        // tracing comma
        "comma-dangle": "off",

        // can use console.log()
        "no-console": "off",

        // a => ()
        "arrow-parens": ["error", "as-needed"],

        // let a, b
        "one-var": "off",

        // max string len
        "max-len": ["warn", 150],

        // https://medium.freecodecamp.org/adding-some-air-to-the-airbnb-style-guide-3df40e31c57a
        // code arrangement matter
        "no-use-before-define": ["error", { "functions": false }],

        // keep it simple
        "complexity": ["warn", 10],

        // only arithmetic operations could be mixed
        "no-mixed-operators": ["error", {
            "groups": [
                // ["+", "-", "*", "/", "%", "**"],
                ["&", "|", "^", "~", "<<", ">>", ">>>"],
                ["==", "!=", "===", "!==", ">", ">=", "<", "<="],
                ["&&", "||"],
                ["in", "instanceof"]
            ]
        }],

        // react
        // "react/prefer-es6-class": 0,
        // "react/jsx-filename-extension": 0,
        // "react/jsx-curly-spacing": [ 2, "always" ],
        // "react/jsx-indent": [ 2, 4 ]
    },
    "plugins": [
        "import",
        "react"
    ],
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true
        }
    }
};
