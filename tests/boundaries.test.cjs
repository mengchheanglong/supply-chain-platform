const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolve}=require('node:path');
const {inspect}=require('../scripts/Check-Boundaries.cjs');
test('browser, package and domain adapter imports fail the actual AST gate',()=>{
 for(const [file,text] of [
  ['apps/web/src/example.ts',"import {Database} from '@supply-chain/operations';"],
  ['packages/operations/src/modules/facilities/domain/model.ts',"import {Pool} from 'pg';"],
  ['packages/operations/src/modules/facilities/application/service.ts',"import {Repository} from '../../catalog/infrastructure/repository';"],
  ['packages/api-client/src/example.ts',"export * from '../../../apps/api/src/app';"],
  ['apps/api/src/example.ts',"const data=require('@supply-chain/operations/dist/platform/database');"],
 ])assert.ok(inspect(resolve(file),text).length>0,file);
});
test('published peer interface and pure domain imports remain permitted',()=>{
 assert.deepEqual(inspect(resolve('packages/operations/src/modules/facilities/application/service.ts'),"import type {Actor} from '../../identity/public'; import {Facility} from '../domain/model';"),[]);
});
