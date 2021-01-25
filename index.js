
"use strict"

import {
    setAPI, isExpressionFunction, makeExpressionFunction,
    isExpressionFunctionApplication, makeExpressionFunctionApplication,
    canApplyExpressionFunctionApplication, getVariablesIn, occursFree, isFree,
    applyExpressionFunctionApplication, getNewVariableRelativeTo,
    replaceWithoutCapture, alphaConvert, alphaEquivalent, betaReduce,
    makeConstantExpression, makeProjectionExpression, makeImitationExpression,
    CASES, Constraint, ConstraintList, MatchingChallenge
} from './src/matching-without-om.js';

import { API } from './src/openmath-api.js';
setAPI( API );

export {
    API, setAPI, isExpressionFunction, makeExpressionFunction,
    isExpressionFunctionApplication, makeExpressionFunctionApplication,
    canApplyExpressionFunctionApplication, getVariablesIn, occursFree, isFree,
    applyExpressionFunctionApplication, getNewVariableRelativeTo,
    replaceWithoutCapture, alphaConvert, alphaEquivalent, betaReduce,
    makeConstantExpression, makeProjectionExpression, makeImitationExpression,
    CASES, Constraint, ConstraintList, MatchingChallenge
};
