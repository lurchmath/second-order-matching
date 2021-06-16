
## Second-Order Matching

This repository provides an implementation in JavaScript of the Huet-Lang
algorithm for second-order pattern matching.  You can read a summary of the
algorithm [in this paper](https://dl.acm.org/doi/10.1145/1637837.1637839),
and a summary of that paper in [a PDF file in this repository](https://github.com/lurchmath/second-order-matching/blob/master/Summary%20of%20Moore%20on%20Huet-Lang.pdf).

This implementation was written by George Tillisch in Summer 2019 and has been
maintained by Nathan Carter since then.

Working with this code requires that you have some class defined for representing
expressions.  If you don't have one, you can use an implementation of
[the OpenMath standard](https://www.openmath.org/standard/om20-2019-07-01/)
that is included with this package and is published and documented separately
[here](https://github.com/lurchmath/openmath-js).

If you have your own expression class already, you can connect it to this package
by writing a few functions that connect your API to ours.  See the second example
below for details and a link to further documentation.
Doing so makes it so you do not need to learn or import the OpenMath tools.

See the classes and files listed on the right for more information on each.

### Example usage with OpenMath:

```js
import * as Matching from 'second-order-matching'

const OpenMath = Matching.OpenMath;

const pattern = OpenMath.simple( 'f(x,y)' )
Matching.API.setMetavariable( pattern.children[2] ) // y is now a metavariable

const expression = OpenMath.simple( 'f(x,3)' )

const MC = new Matching.MatchingChallenge( [ pattern, expression ] )
const solutions = MC.getSolutions()
console.log( solutions.length ) // prints: 1
const solution = solutions[0]
console.log( solution.contents.length ) // prints: 1
const pair = solution.contents[0]

console.log( pair.pattern.simpleEncode(), 'maps to',
             pair.expression.simpleEncode() ) // prints: y maps to 3
```

### Example usage with a custom expression class:

```js
import * as Matching from './node_modules/second-order-matching/src/matching-without-om.js'
import MyCustomExpression from 'path/to/your/library.js'; // change this line

CustomAPI = {
    isExpression : obj => obj instanceof MyCustomExpression,
    filterSubexpressions : (expr,func) => {
        // write code here
    },
    // And so on for about 20 API functions...
    // See docs link below for details on how to write these.
};
Matching.setAPI( CustomAPI );

const pattern = MyCustonExpression( /* however you construct f(x,y) */ )
Matching.API.setMetavariable( API.getChildren( pattern )[2] ) // y is now a metavariable

const expression = MyCustonExpression( /* however you construct f(x,3) */ )

const MC = new Matching.MatchingChallenge( [ pattern, expression ] )
const solutions = MC.getSolutions()
console.log( solutions.length ) // prints: 1
const solution = solutions[0]
console.log( solution.contents.length ) // prints: 1
const pair = solution.contents[0]

// Let's assume your MyCustomExpression class has a toString() method...
console.log( pair.pattern.toString(), 'maps to',
             pair.expression.toString() ) // prints something like: y maps to 3
```

What API functions must you provide in the `CustomAPI` object?  See the
documentation for [the OpenMath namespace](OpenMathAPI.html).  It is a wrapper
around the `OpenMath` class whose repo is linked to above, and which we import
{@link https://www.npmjs.com/package/openmath-js|from npm}.
You must provide a similar wrapper around your expression class.  Each function
in the API is documented in detail in the documentation for
[the OpenMath namespace](OpenMathAPI.html).
