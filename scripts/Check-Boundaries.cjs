const ts=require('typescript');
const {readFileSync,readdirSync}=require('node:fs');
const {resolve,relative,dirname}=require('node:path');
function files(dir) {return readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(resolve(dir,item.name)):/\.tsx?$/.test(item.name)?[resolve(dir,item.name)]:[]);}
const roots=['packages/operations/src','packages/contracts/src','packages/api-client/src','apps/api/src','apps/web/src'];
function inspect(file,text) {
 const errors=[];
 const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 function visit(node) {
  let spec;
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier)spec=node.moduleSpecifier.text;
  if(ts.isCallExpression(node)&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||node.expression.getText(source)==='require'))spec=node.arguments[0].text;
  if(spec) {
   const path=relative(process.cwd(),file).replaceAll('\\','/'), target=spec.startsWith('.')?relative(process.cwd(),resolve(dirname(file),spec)).replaceAll('\\','/'):spec;
   let reason;
   if(spec.startsWith('@supply-chain/')&&spec.split('/').length>2)reason='deep workspace package import';
   if(path.startsWith('packages/')&&target.startsWith('apps/'))reason='package imports application';
   if(path.startsWith('apps/web/')&&(target.startsWith('packages/operations')||spec==='@supply-chain/operations'||target.startsWith('apps/api')))reason='browser imports backend';
   if(path.startsWith('packages/contracts/')&&!spec.startsWith('.'))reason='contracts import implementation';
   if(path.startsWith('packages/operations/')&&(spec.startsWith('@nestjs/')||spec.startsWith('react')||spec.startsWith('@supply-chain/')))reason='operational library imports framework';
   if(/\/(domain|application)\//.test(path)&&(!spec.startsWith('.')||/\/(infrastructure|transport)\//.test(target)))reason='domain/application imports adapter';
   if(/\/domain\//.test(path)&&!target.includes('/domain/'))reason='domain imports outside domain';
   const owner=path.match(/packages\/operations\/src\/modules\/([^/]+)\//)?.[1];
   const other=target.match(/packages\/operations\/src\/modules\/([^/]+)\//)?.[1];
   if(owner&&other&&owner!==other&&!target.endsWith('/public'))reason='module imports private peer';
   if(reason)errors.push(`${path}: ${reason}: ${spec}`);
  }
  ts.forEachChild(node,visit);
 }
 visit(source);return errors;
}
module.exports={inspect};
if(require.main===module){
const errors=roots.flatMap(dir=>files(resolve(dir))).flatMap(file=>inspect(file,readFileSync(file,'utf8')));
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Package, browser and domain import boundaries pass');

}
