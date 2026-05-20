#!/usr/bin/env node
/**
 * check-naslnames.mjs - Validate entity/view names against NASL reserved words
 *
 * Usage:
 *   node check-naslnames.mjs <name-or-file> [name-or-file] ...
 *   node check-naslnames.mjs --type entityName <name> [name] ...
 *
 * Options:
 *   --type <type>   Keyword type to check against (default: entityName)
 *                   Available: common, entityName, viewName, enumName,
 *                   structureName, entityProperty, enumItem, structureProperty,
 *                   frontendPath, strict
 *   --file <path>   Read names from a markdown file (extracts titles)
 *
 * Exit codes:
 *   0 - No conflicts found
 *   1 - Conflicts detected (prints to stderr)
 */

import fs from 'fs';
import path from 'path';

// ─── KEYWORDS_MAP (extracted from check.mjs) ──────────────────────────────

const COMMON_KEYWORDS = [
  'abstract','continue','for','new','switch','assert','default','goto','package',
  'synchronized','boolean','do','if','private','this','break','double','implements',
  'protected','throw','byte','else','import','public','throws','case','enum',
  'instanceof','return','transient','catch','extends','int','short','try','char',
  'final','interface','static','void','class','finally','long','strictfp','volatile',
  'const','float','native','super','while','true','false','null','arguments','await',
  'debugger','delete','export','function','in','let','typeof','var','with','yield',
  'as','any','number','string','get','require','is','object','typealias','val','when',
  'where','by','constructor','delegate','dynamic','set','property','it','field',
  'suspend','sealed','override','operator','out','external','internal','inner',
  'inline','infix','expect','def','implicit','lazy','match','trait','exports',
  'requires','app','apps','mod','mods','module','modules','entity','entities',
  'struct','structure','structures','enums','logic','logics','interfaces','view',
  'views','process','processes','role','roles','theme','config','configuration',
  'dep','deps','dependency','dependencies','ext','exts','extension','extensions',
  'com','coms','component','components','viewComponent','viewComponents',
  'processComponent','processComponents','constant','constants','returns','variable',
  'variables','cases','element','elements','rule','rules','attr','attrs','event',
  'events','slot','slots','method','connector','nasl','core','collection','ui',
  'util','browser','validation','annotation','storage','resource','serialization',
  'database','dataSource','dataSet','pc','h5','logging','i18n','debug','inspect',
  'auth','authorization','org','organization','message','experimental','fs','file',
  'path','math','system','integer','decimal','date','time','datetime','length',
];

const ENTITY_NAME_KEYWORDS = [
  'accessible','add','all','alter','analyze','and','as','asc','asensitive','before',
  'between','bigint','binary','blob','both','by','call','cascade','case','change',
  'character','check','collate','column','condition','constraint','convert','create',
  'cross','cume_dist','current_date','current_time','current_timestamp','current_user',
  'cursor','databases','day_hour','day_microsecond','day_minute','day_second','dec',
  'declare','delayed','delete','dense_rank','desc','describe','deterministic','distinct',
  'distinctrow','div','drop','dual','each','elseif','empty','enclosed','escaped',
  'except','exists','exit','explain','fetch','first_value','float4','float8','force',
  'foreign','from','fulltext','grant','group','grouping','groups','having',
  'high_priority','hour_microsecond','hour_minute','hour_second','ignore','index',
  'infile','inout','insensitive','insert','int1','int2','int3','int4','int8',
  'interval','into','iterate','join','json_table','key','keys','kill','lag',
  'last_value','lead','leading','leave','left','like','limit','linear','lines','load',
  'localtime','localtimestamp','lock','longblob','longtext','loop','low_priority',
  'master_ssl_verify_server_cert','maxvalue','mediumblob','mediumint','mediumtext',
  'middleint','minute_microsecond','minute_second','modifies','natural','not',
  'no_write_to_binlog','nth_value','ntile','numeric','of','on','optimize','option',
  'optionally','or','order','outer','outfile','over','percent_rank','persist',
  'persist_only','precision','primary','procedure','purge','range','rank','recursive',
  'reads','read_write','real','references','regexp','release','rename','repeat',
  'replace','resignal','restrict','revoke','right','rlike','row_number','schema',
  'schemas','second_microsecond','select','sensitive','separator','show','signal',
  'smallint','spatial','specific','sql','sqlexception','sqlstate','sqlwarning',
  'sql_big_result','sql_calc_found_rows','sql_small_result','ssl','starting',
  'straight_join','terminated','then','tinyblob','tinyint','tinytext','to','trailing',
  'trigger','undo','union','unique','unlock','update','usage','use','using',
  'utc_date','utc_time','utc_timestamp','values','varbinary','varchar','varcharacter',
  'varying','write','xor','year_month','zerofill','general','ignore_server_ids',
  'master_heartbeat_period','slow','window','backup','begin','break','browse','bulk',
  'checkpoint','close','clustered','coalesce','commit','compute','contains',
  'containstable','current','dbcc','deallocate','deny','disk','distributed','dump',
  'end','errlvl','exec','execute','fillfactor','freetext','freetexttable','full',
  'goto','holdlock','identity','identity_insert','identitycol','intersect','lineno',
  'merge','national','nocheck','nonclustered','nullif','off','offsets','open',
  'opendatasource','openquery','openrowset','openxml','percent','pivot','plan','print',
  'proc','raiserror','readtext','reconfigure','replication','restore','revert',
  'rollback','rowcount','rowguidcol','save','securityaudit','semantickeyphrasetable',
  'semanticsimilaritydetailstable','semanticsimilaritytable','session_user','setuser',
  'shutdown','some','statistics','system_user','tablesample','textsize','top','tran',
  'transaction','truncate','try_convert','tsequal','unpivot','updatetext','user',
  'waitfor','within group','writetext','access','account','activate','admin','advise',
  'after','all_rows','allocate','archive','archivelog','array','at','audit',
  'authenticated','autoextend','automatic','become','bfile','bitmap','block','body',
  'cache','cache_instances','cancel','cast','cfile','chained','char_cs','choose',
  'chunk','clear','clob','clone','close_cached_open_cursors','cluster','columns',
  'comment','committed','compatibility','compile','complete','composite_limit',
  'compress','connect','connect_time','contents','controlfile','cost','cpu_per_call',
  'cpu_per_session','current_schema','curren_user','cycle','dangling','datafile',
  'datafiles','dataobjno','dba','dbhigh','dblow','dbmac','deferrable','deferred',
  'degree','deref','directory','disable','disconnect','dismount','dml','enable',
  'enforce','entry','exceptions','exchange','excluding','exclusive','expire','extent',
  'extents','externally','failed_login_attempts','fast','first_rows','flagger','flob',
  'flush','freelist','freelists','global','globally','global_name','hash','hashkeys',
  'header','heap','identified','idgenerators','idle_time','immediate','including',
  'increment','indexed','indexes','indicator','ind_partition','initial','initially',
  'initrans','instance','instances','instead','intermediate','isolation',
  'isolation_level','keep','label','layer','less','level','library','link','list',
  'lob','local','locked','log','logfile','logical_reads_per_call',
  'logical_reads_per_session','manage','master','max','maxarchlogs','maxdatafiles',
  'maxextents','maxinstances','maxlogfiles','maxloghistory','maxlogmembers','maxsize',
  'maxtrans','min','member','minimum','minextents','minus','minvalue','mlslabel',
  'mls_label_format','mode','modify','mount','move','mts_dispatchers','multiset',
  'nchar','nchar_cs','nclob','needed','nested','network','new','next','noarchivelog',
  'noaudit','nocache','nocompress','nocycle','noforce','nologging','nomaxvalue',
  'nominvalue','none','noorder','nooverride','noparallel','noreverse','normal',
  'nosort','nothing','nowait','number','nvarchar2','objno','objno_reuse','offline',
  'oid','oidindex','old','online','only','opcode','optimal','optimizer_goal',
  'oslabel','overflow','own','parallel','partition','password','password_grace_time',
  'password_life_time','password_lock_time','password_reuse_max','password_reuse_time',
  'password_verify_function','pctfree','pctincrease','pctthreshold','pctused',
  'pctversion','permanent','plsql_debug','post_transaction','preserve','prior',
  'private','private_sga','privilege','privileges','profile','queue','quota','raw',
  'rba','readup','rebuild','recover','recoverable','recovery','ref','referencing',
  'refresh','reset','resetlogs','resize','restricted','returning','reuse','reverse',
  'roles','row','rowid','rownum','rows','sample','savepoint','sb4','scan_instances',
  'scn','scope','sd_all','sd_inhibit','sd_show','segment','seg_block','seg_file',
  'sequence','serializable','session','session_cached_openursors','sessions_per_user',
  'share','shared','shared_pool','shrink','skip','skip_unusable_indexes','snapshot',
  'specification','split','sql_trace','standby','start','statement_id','stop',
  'storage','store','successful','sys_op_enforce_not_null$','sys_op_ntcimg$',
  'synonym','sysdate','sysdba','sysoper','tables','tablespace','tablespace_no',
  'tabno','temporary','than','the','thread','timestamp','toplevel','trace','tracing',
  'transitional','triggers','tx','type','ub2','uba','uid','unarchived','unlimited',
  'unrecoverable','until','unusable','unused','updatable','validate','value',
  'varchar2','whenever','without','work','writedown','writeup','xid','year','zone',
  'analyse','asymmetric','collation','concurrently','current_catalog','current_role',
  'do','ilike','isnull','lateral','notnull','offset','overlaps','placing','similar',
  'symmetric','variadic','verbose','map',
];

const ENTITY_PROPERTY_KEYWORDS = ['class'];

const VIEW_NAME_KEYWORDS = [
  'report','download','upload','gw','gateway','getCustomConfig','getCurrentIp',
  'config','tenantExpiration',
];

const FRONTEND_PATH_KEYWORDS = [
  'api','rest','system','getCustomConfig','proxy','upload','gateway','config',
  'getCurrentIp','gw','report','download','tenantExpiration',
];

const KEYWORDS_MAP = {
  common: new Set(COMMON_KEYWORDS),
  entityName: new Set([...COMMON_KEYWORDS, ...ENTITY_NAME_KEYWORDS]),
  enumName: new Set(COMMON_KEYWORDS),
  structureName: new Set(COMMON_KEYWORDS),
  entityProperty: new Set([...COMMON_KEYWORDS, ...ENTITY_PROPERTY_KEYWORDS]),
  enumItem: new Set(COMMON_KEYWORDS),
  structureProperty: new Set([]),
  viewName: new Set([...COMMON_KEYWORDS, ...VIEW_NAME_KEYWORDS]),
  frontendPath: new Set([...COMMON_KEYWORDS, ...FRONTEND_PATH_KEYWORDS]),
  strict: new Set([
    ...COMMON_KEYWORDS, ...ENTITY_NAME_KEYWORDS, ...ENTITY_PROPERTY_KEYWORDS,
    ...VIEW_NAME_KEYWORDS, ...FRONTEND_PATH_KEYWORDS,
  ]),
};

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Check a single name against a keyword type, return conflicting words */
function checkName(name, type = 'entityName') {
  const keywords = KEYWORDS_MAP[type];
  if (!keywords) {
    console.error(`Error: Unknown type "${type}". Available: ${Object.keys(KEYWORDS_MAP).join(', ')}`);
    process.exit(2);
  }
  const lower = name.toLowerCase();
  if (keywords.has(lower)) return [lower];
  return [];
}

/** Extract candidate names from a markdown file (titles, entity names from filenames) */
function extractNamesFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Warning: File not found: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const names = [];

  // Extract names from markdown headings: # 标题（EnglishName）
  const headingEn = /[#\-*]+\s*[^\n]*[（(]([A-Za-z][A-Za-z0-9_]*)[）)]/g;
  let m;
  while ((m = headingEn.exec(content)) !== null) {
    names.push(m[1]);
  }

  // Extract entity/view names from Chinese+English hybrid filenames like 权限中心-实体-用户（LcapUser）.md
  const baseName = path.basename(filePath);
  const chineseNameMatch = baseName.match(/[（(]([A-Za-z][A-Za-z0-9_]*)[）)]\.md$/);
  if (chineseNameMatch) {
    names.push(chineseNameMatch[1]);
  }

  // Also support legacy kebab-case filenames like entity-Customer.md
  const legacyNameMatch = baseName.match(/^(entity|view|logic|enum)-([^.]+)\.md$/);
  if (legacyNameMatch) {
    names.push(legacyNameMatch[2]);
  }

  // Extract names from table cells (first column often has entity/field names)
  const tableCell = /\|\s*([A-Z][A-Za-z0-9]*)\s*\|/g;
  while ((m = tableCell.exec(content)) !== null) {
    if (m[1].length > 1 && !m[1].startsWith('The')) {
      names.push(m[1]);
    }
  }

  return [...new Set(names)];
}

// ─── Main ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let type = 'entityName';
const inputs = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--type' && args[i + 1]) {
    type = args[++i];
  } else {
    inputs.push(args[i]);
  }
}

if (inputs.length === 0) {
  console.log('Usage: node check-naslnames.mjs [--type <type>] <name-or-file> [name-or-file] ...');
  console.log('');
  console.log('Types: common, entityName, viewName, enumName, structureName,');
  console.log('       entityProperty, enumItem, structureProperty, frontendPath, strict');
  console.log('');
  console.log('Examples:');
  console.log('  node check-naslnames.mjs Order');
  console.log('  node check-naslnames.mjs --type viewName Report');
  console.log('  node check-naslnames.mjs plan/data-model/客户管理-实体-客户（Customer）.md');
  process.exit(0);
}

const allNames = [];
const conflicts = [];

for (const input of inputs) {
  // Check if input is a file path
  if (input.endsWith('.md') || input.includes('/')) {
    const fileNames = extractNamesFromFile(input);
    if (fileNames.length === 0) {
      // If no names extracted, check the filename itself
      const baseName = path.basename(input).replace(/\.[^.]+$/, '');
      allNames.push({ name: baseName, source: input });
    } else {
      for (const name of fileNames) {
        allNames.push({ name, source: input });
      }
    }
  } else {
    allNames.push({ name: input, source: 'cli' });
  }
}

for (const { name, source } of allNames) {
  const found = checkName(name, type);
  if (found.length > 0) {
    conflicts.push({ name, found, source });
  }
}

if (conflicts.length > 0) {
  console.error(`Found ${conflicts.length} reserved keyword conflict(s):`);
  for (const { name, found, source } of conflicts) {
    console.error(`  - "${name}" is a reserved keyword (${found.join(', ')}) [source: ${source}]`);
  }
  process.exit(1);
} else {
  console.log(`OK: No conflicts found for ${allNames.length} name(s) [type: ${type}]`);
  process.exit(0);
}
