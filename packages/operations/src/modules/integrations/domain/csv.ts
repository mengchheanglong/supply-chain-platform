// Bounded CSV grammar: quoted commas/newlines, escaped quotes, CRLF and optional UTF-8 BOM.
export function parseCsv(input:string):string[][] {
 const text=input.replace(/^\uFEFF/,''),rows:string[][]=[],row:string[]=[];let cell='',quoted=false,closed=false,started=false;
 function field(){row.push(cell);cell='';closed=false;started=false;if(row.length>30)throw new Error('Too many CSV columns');}
 function record(){field();rows.push(row.splice(0));if(rows.length>201)throw new Error('CSV allows at most 200 data records');}
 for(let i=0;i<text.length;i++) {
  const c=text[i]!;if(c==='\0')throw new Error('CSV contains a null character');
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
  else if(c===',')field();
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;record();}
  else if(c==='"'){if(started||closed)throw new Error('Unexpected CSV quote');quoted=true;started=true;}
  else{if(closed)throw new Error('Characters after a closing CSV quote');cell+=c;started=true;}
  if(cell.length>1024)throw new Error('CSV field exceeds 1024 characters');
 }
 if(quoted)throw new Error('Unclosed CSV quote');
 if(started||closed||cell||row.length)record();return rows;
}
export function csvDocument(rows:(string|number)[][]) {
 // Spreadsheet-safe textual export; structural CSV quoting alone cannot stop formula execution.
 return rows.map(row=>row.map(value=>{let text=String(value);if(/^\s*[=+\-@]/.test(text)||/^[\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}).join(',')).join('\r\n')+'\r\n';
}
export const STOCK_HEADERS=['record_id','facility_ref','sku_ref','unit','on_hand','reserved','observed_at'] as const;
