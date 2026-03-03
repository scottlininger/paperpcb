/**
 * @fileoverview Provides a puny but powerful package that makes EJS in the browser
 *   practically perfect. EJS is an awesome templating engine that uses real JS, but
 *   as of the creation of this file it didn't have a browser flavor, so I wrote one.
 * @author Scott Lininger
 */

// Bundled copy of ejs. Could use CDN, I guess, but this works for now.
!function(e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).ejs=e();}(function(){return function r(i,o,s){function c(t,e){if(!o[t]){if(!i[t]){var n="function"==typeof require&&require;if(!e&&n)return n(t,!0);if(a)return a(t,!0);throw (e=new Error("Cannot find module '"+t+"'")).code="MODULE_NOT_FOUND",e}n=o[t]={exports:{}},i[t][0].call(n.exports,function(e){return c(i[t][1][e]||e)},n,n.exports,r,i,o,s);}return o[t].exports}for(var a="function"==typeof require&&require,e=0;e<s.length;e++)c(s[e]);return c}({1:[function(e,t,n){function o(e,t){return i.apply(e,[t])}var r=/[|\\{}()[\]^$+*?.]/g,i=Object.prototype.hasOwnProperty,s=(n.escapeRegExpChars=function(e){return e?String(e).replace(r,"\\$&"):""},{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&#34;","'":"&#39;"}),c=/[&<>'"]/g;function a(e){return s[e]||e}function l(){return Function.prototype.toString.call(this)+';\nvar _ENCODE_HTML_RULES = {\n      "&": "&amp;"\n    , "<": "&lt;"\n    , ">": "&gt;"\n    , \'"\': "&#34;"\n    , "\'": "&#39;"\n    }\n  , _MATCH_HTML = /[&<>\'"]/g;\nfunction encode_char(c) {\n  return _ENCODE_HTML_RULES[c] || c;\n};\n'}n.escapeXML=function(e){return null==e?"":String(e).replace(c,a)};try{"function"==typeof Object.defineProperty?Object.defineProperty(n.escapeXML,"toString",{value:l}):n.escapeXML.toString=l;}catch(e){console.warn("Unable to set escapeXML.toString (is the Function prototype frozen?)");}n.shallowCopy=function(e,t){if(t=t||{},null!=e)for(var n in t)o(t,n)&&"__proto__"!==n&&"constructor"!==n&&(e[n]=t[n]);return e},n.shallowCopyFromList=function(e,t,n){if(n=n||[],t=t||{},null!=e)for(var r=0;r<n.length;r++){var i=n[r];void 0!==t[i]&&o(t,i)&&"__proto__"!==i&&"constructor"!==i&&(e[i]=t[i]);}return e},n.cache={_data:{},set:function(e,t){this._data[e]=t;},get:function(e){return this._data[e]},remove:function(e){delete this._data[e];},reset:function(){this._data={};}},n.hyphenToCamel=function(e){return e.replace(/-[a-z]/g,function(e){return e[1].toUpperCase()})},n.createNullProtoObjWherePossible="function"==typeof Object.create?function(){return Object.create(null)}:{__proto__:null}instanceof Object?function(){return {}}:function(){return {__proto__:null}};},{}],2:[function(e,t,n){t.exports={name:"ejs",description:"Embedded JavaScript templates",keywords:["template","engine","ejs"],version:"3.1.9",author:"Matthew Eernisse <mde@fleegix.org> (http://fleegix.org)",license:"Apache-2.0",bin:{ejs:"./bin/cli.js"},main:"./lib/ejs.js",jsdelivr:"ejs.min.js",unpkg:"ejs.min.js",repository:{type:"git",url:"git://github.com/mde/ejs.git"},bugs:"https://github.com/mde/ejs/issues",homepage:"https://github.com/mde/ejs",dependencies:{jake:"^10.8.5"},devDependencies:{browserify:"^16.5.1",eslint:"^6.8.0","git-directory-deploy":"^1.5.1",jsdoc:"^4.0.2","lru-cache":"^4.0.1",mocha:"^10.2.0","uglify-js":"^3.3.16"},engines:{node:">=0.10.0"},scripts:{test:"mocha -u tdd"}};},{}],3:[function(e,t,n){},{}],4:[function(e,t,n){!function(s){!function(){function h(e){if("string"!=typeof e)throw new TypeError("Path must be a string. Received "+JSON.stringify(e))}function o(e,t){for(var n,r="",i=0,o=-1,s=0,c=0;c<=e.length;++c){if(c<e.length)n=e.charCodeAt(c);else {if(47===n)break;n=47;}if(47===n){if(o!==c-1&&1!==s)if(o!==c-1&&2===s){if(r.length<2||2!==i||46!==r.charCodeAt(r.length-1)||46!==r.charCodeAt(r.length-2))if(2<r.length){var a=r.lastIndexOf("/");if(a!==r.length-1){i=-1===a?(r="",0):(r=r.slice(0,a)).length-1-r.lastIndexOf("/"),o=c,s=0;continue}}else if(2===r.length||1===r.length){r="",o=c,s=i=0;continue}t&&(0<r.length?r+="/..":r="..",i=2);}else 0<r.length?r+="/"+e.slice(o+1,c):r=e.slice(o+1,c),i=c-o-1;o=c,s=0;}else 46===n&&-1!==s?++s:s=-1;}return r}var p={resolve:function(){for(var e,t="",n=!1,r=arguments.length-1;-1<=r&&!n;r--){var i=0<=r?arguments[r]:e=void 0===e?s.cwd():e;h(i),0!==i.length&&(t=i+"/"+t,n=47===i.charCodeAt(0));}return t=o(t,!n),n?0<t.length?"/"+t:"/":0<t.length?t:"."},normalize:function(e){if(h(e),0===e.length)return ".";var t=47===e.charCodeAt(0),n=47===e.charCodeAt(e.length-1);return 0<(e=0!==(e=o(e,!t)).length||t?e:".").length&&n&&(e+="/"),t?"/"+e:e},isAbsolute:function(e){return h(e),0<e.length&&47===e.charCodeAt(0)},join:function(){if(0===arguments.length)return ".";for(var e,t=0;t<arguments.length;++t){var n=arguments[t];h(n),0<n.length&&(void 0===e?e=n:e+="/"+n);}return void 0===e?".":p.normalize(e)},relative:function(e,t){if(h(e),h(t),e===t)return "";if((e=p.resolve(e))===(t=p.resolve(t)))return "";for(var n=1;n<e.length&&47===e.charCodeAt(n);++n);for(var r=e.length,i=r-n,o=1;o<t.length&&47===t.charCodeAt(o);++o);for(var s=t.length-o,c=i<s?i:s,a=-1,l=0;l<=c;++l){if(l===c){if(c<s){if(47===t.charCodeAt(o+l))return t.slice(o+l+1);if(0===l)return t.slice(o+l)}else c<i&&(47===e.charCodeAt(n+l)?a=l:0===l&&(a=0));break}var u=e.charCodeAt(n+l);if(u!==t.charCodeAt(o+l))break;47===u&&(a=l);}for(var f="",l=n+a+1;l<=r;++l)l!==r&&47!==e.charCodeAt(l)||(0===f.length?f+="..":f+="/..");return 0<f.length?f+t.slice(o+a):(47===t.charCodeAt(o+=a)&&++o,t.slice(o))},_makeLong:function(e){return e},dirname:function(e){if(h(e),0===e.length)return ".";for(var t=47===e.charCodeAt(0),n=-1,r=!0,i=e.length-1;1<=i;--i)if(47===e.charCodeAt(i)){if(!r){n=i;break}}else r=!1;return -1===n?t?"/":".":t&&1===n?"//":e.slice(0,n)},basename:function(e,t){if(void 0!==t&&"string"!=typeof t)throw new TypeError('"ext" argument must be a string');h(e);var n=0,r=-1,i=!0;if(void 0!==t&&0<t.length&&t.length<=e.length){if(t.length===e.length&&t===e)return "";for(var o=t.length-1,s=-1,c=e.length-1;0<=c;--c){var a=e.charCodeAt(c);if(47===a){if(!i){n=c+1;break}}else -1===s&&(i=!1,s=c+1),0<=o&&(a===t.charCodeAt(o)?-1==--o&&(r=c):(o=-1,r=s));}return n===r?r=s:-1===r&&(r=e.length),e.slice(n,r)}for(c=e.length-1;0<=c;--c)if(47===e.charCodeAt(c)){if(!i){n=c+1;break}}else -1===r&&(i=!1,r=c+1);return -1===r?"":e.slice(n,r)},extname:function(e){h(e);for(var t=-1,n=0,r=-1,i=!0,o=0,s=e.length-1;0<=s;--s){var c=e.charCodeAt(s);if(47===c){if(i)continue;n=s+1;break}-1===r&&(i=!1,r=s+1),46===c?-1===t?t=s:1!==o&&(o=1):-1!==t&&(o=-1);}return -1===t||-1===r||0===o||1===o&&t===r-1&&t===n+1?"":e.slice(t,r)},format:function(e){if(null===e||"object"!=typeof e)throw new TypeError('The "pathObject" argument must be of type Object. Received type '+typeof e);return t="/",n=(e=e).dir||e.root,r=e.base||(e.name||"")+(e.ext||""),n?n===e.root?n+r:n+t+r:r;var t,n,r;},parse:function(e){h(e);var t={root:"",dir:"",base:"",ext:"",name:""};if(0===e.length)return t;for(var n,r=47===e.charCodeAt(0),i=r?(t.root="/",1):0,o=-1,s=0,c=-1,a=!0,l=e.length-1,u=0;i<=l;--l){if(47===(n=e.charCodeAt(l))){if(a)continue;s=l+1;break}-1===c&&(a=!1,c=l+1),46===n?-1===o?o=l:1!==u&&(u=1):-1!==o&&(u=-1);}return -1===o||-1===c||0===u||1===u&&o===c-1&&o===s+1?-1!==c&&(t.base=t.name=0===s&&r?e.slice(1,c):e.slice(s,c)):(0===s&&r?(t.name=e.slice(1,o),t.base=e.slice(1,c)):(t.name=e.slice(s,o),t.base=e.slice(s,c)),t.ext=e.slice(o,c)),0<s?t.dir=e.slice(0,s-1):r&&(t.dir="/"),t},sep:"/",delimiter:":",win32:null,posix:null};p.posix=p,t.exports=p;}.call(this);}.call(this,e("_process"));},{_process:5}],5:[function(e,t,n){var r,i,t=t.exports={};function o(){throw new Error("setTimeout has not been defined")}function s(){throw new Error("clearTimeout has not been defined")}try{r="function"==typeof setTimeout?setTimeout:o;}catch(e){r=o;}try{i="function"==typeof clearTimeout?clearTimeout:s;}catch(e){i=s;}function c(t){if(r===setTimeout)return setTimeout(t,0);if((r===o||!r)&&setTimeout)return (r=setTimeout)(t,0);try{return r(t,0)}catch(e){try{return r.call(null,t,0)}catch(e){return r.call(this,t,0)}}}var a,l=[],u=!1,f=-1;function h(){u&&a&&(u=!1,a.length?l=a.concat(l):f=-1,l.length&&p());}function p(){if(!u){for(var e=c(h),t=(u=!0,l.length);t;){for(a=l,l=[];++f<t;)a&&a[f].run();f=-1,t=l.length;}a=null,u=!1,!function(t){if(i===clearTimeout)return clearTimeout(t);if((i===s||!i)&&clearTimeout)return (i=clearTimeout)(t);try{i(t);}catch(e){try{return i.call(null,t)}catch(e){return i.call(this,t)}}}(e);}}function d(e,t){this.fun=e,this.array=t;}function m(){}t.nextTick=function(e){var t=new Array(arguments.length-1);if(1<arguments.length)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];l.push(new d(e,t)),1!==l.length||u||c(p);},d.prototype.run=function(){this.fun.apply(null,this.array);},t.title="browser",t.browser=!0,t.env={},t.argv=[],t.version="",t.versions={},t.on=m,t.addListener=m,t.once=m,t.off=m,t.removeListener=m,t.removeAllListeners=m,t.emit=m,t.prependListener=m,t.prependOnceListener=m,t.listeners=function(e){return []},t.binding=function(e){throw new Error("process.binding is not supported")},t.cwd=function(){return "/"},t.chdir=function(e){throw new Error("process.chdir is not supported")},t.umask=function(){return 0};},{}],ejs:[function(e,t,a){var o=e("fs"),u=e("path"),f=e("./utils"),n=!1,e=e("../package.json").version,r=["delimiter","scope","context","debug","compileDebug","client","_with","rmWhitespace","strict","filename","async"],l=r.concat("cache"),s=/^\uFEFF/,h=/^[a-zA-Z_$][0-9a-zA-Z_$]*$/;function c(t,e){var n;if(e.some(function(e){return n=a.resolveInclude(t,e,!0),o.existsSync(n)}))return n}function p(e,t){var n,r=e.filename,i=1<arguments.length;if(e.cache){if(!r)throw new Error("cache option requires a filename");if(n=a.cache.get(r))return n;i||(t=d(r).toString().replace(s,""));}else if(!i){if(!r)throw new Error("Internal EJS error: no file name or template provided");t=d(r).toString().replace(s,"");}return n=a.compile(t,e),e.cache&&a.cache.set(r,n),n}function d(e){return a.fileLoader(e)}function m(e,t){var n=f.shallowCopy(f.createNullProtoObjWherePossible(),t);if(n.filename=function(e,t){var n,r=t.views,i=/^[A-Za-z]+:\\|^\//.exec(e);if(i&&i.length)e=e.replace(/^\/*/,""),n=Array.isArray(t.root)?c(e,t.root):a.resolveInclude(e,t.root||"/",!0);else if(t.filename&&(i=a.resolveInclude(e,t.filename),o.existsSync(i)&&(n=i)),!(n=!n&&Array.isArray(r)?c(e,r):n)&&"function"!=typeof t.includer)throw new Error('Could not find the include file "'+t.escapeFunction(e)+'"');return n}(e,n),"function"==typeof t.includer){t=t.includer(e,n.filename);if(t&&(t.filename&&(n.filename=t.filename),t.template))return p(n,t.template)}return p(n)}function g(e,t,n,r,i){var t=t.split("\n"),o=Math.max(r-3,0),s=Math.min(t.length,r+3),i=i(n),n=t.slice(o,s).map(function(e,t){t=t+o+1;return (t==r?" >> ":"    ")+t+"| "+e}).join("\n");throw e.path=i,e.message=(i||"ejs")+":"+r+"\n"+n+"\n\n"+e.message,e}function w(e){return e.replace(/;(\s*$)/,"$1")}function v(e,t){t=t||f.createNullProtoObjWherePossible();var n=f.createNullProtoObjWherePossible();this.templateText=e,this.mode=null,this.truncate=!1,this.currentLine=1,this.source="",n.client=t.client||!1,n.escapeFunction=t.escape||t.escapeFunction||f.escapeXML,n.compileDebug=!1!==t.compileDebug,n.debug=!!t.debug,n.filename=t.filename,n.openDelimiter=t.openDelimiter||a.openDelimiter||"<",n.closeDelimiter=t.closeDelimiter||a.closeDelimiter||">",n.delimiter=t.delimiter||a.delimiter||"%",n.strict=t.strict||!1,n.context=t.context,n.cache=t.cache||!1,n.rmWhitespace=t.rmWhitespace,n.root=t.root,n.includer=t.includer,n.outputFunctionName=t.outputFunctionName,n.localsName=t.localsName||a.localsName||"locals",n.views=t.views,n.async=t.async,n.destructuredLocals=t.destructuredLocals,n.legacyInclude=void 0===t.legacyInclude||!!t.legacyInclude,n.strict?n._with=!1:n._with=void 0===t._with||t._with,this.opts=n,this.regex=this.createRegex();}a.cache=f.cache,a.fileLoader=o.readFileSync,a.localsName="locals",a.promiseImpl=new Function("return this;")().Promise,a.resolveInclude=function(e,t,n){var r=u.dirname,i=u.extname,n=(0, u.resolve)(n?t:r(t),e);return i(e)||(n+=".ejs"),n},a.compile=function(e,t){return t&&t.scope&&(n||(console.warn("`scope` option is deprecated and will be removed in EJS 3"),n=!0),t.context||(t.context=t.scope),delete t.scope),new v(e,t).compile()},a.render=function(e,t,n){t=t||f.createNullProtoObjWherePossible(),n=n||f.createNullProtoObjWherePossible();return 2==arguments.length&&f.shallowCopyFromList(n,t,r),p(n,e)(t)},a.renderFile=function(){var e,t,n,r=Array.prototype.slice.call(arguments),i=r.shift(),o={filename:i},s=("function"==typeof arguments[arguments.length-1]&&(e=r.pop()),r.length?(t=r.shift(),r.length?f.shallowCopy(o,r.pop()):(t.settings&&(t.settings.views&&(o.views=t.settings.views),t.settings["view cache"]&&(o.cache=!0),(r=t.settings["view options"])&&f.shallowCopy(o,r)),f.shallowCopyFromList(o,t,l)),o.filename=i):t=f.createNullProtoObjWherePossible(),o),c=t,r=e;if(!r){if("function"==typeof a.promiseImpl)return new a.promiseImpl(function(e,t){try{e(n=p(s)(c));}catch(e){t(e);}});throw new Error("Please provide a callback function")}try{n=p(s)(c);}catch(e){return r(e)}r(null,n);},a.Template=v,a.clearCache=function(){a.cache.reset();},v.modes={EVAL:"eval",ESCAPED:"escaped",RAW:"raw",COMMENT:"comment",LITERAL:"literal"},v.prototype={createRegex:function(){var e="(<%%|%%>|<%=|<%-|<%_|<%#|<%|%>|-%>|_%>)",t=f.escapeRegExpChars(this.opts.delimiter),n=f.escapeRegExpChars(this.opts.openDelimiter),r=f.escapeRegExpChars(this.opts.closeDelimiter),e=e.replace(/%/g,t).replace(/</g,n).replace(/>/g,r);return new RegExp(e)},compile:function(){var e,i=this.opts,t="",n="",o=i.escapeFunction,r=i.filename?JSON.stringify(i.filename):"undefined";if(!this.source){if(this.generateSource(),t+='  var __output = "";\n  function __append(s) { if (s !== undefined && s !== null) __output += s }\n',i.outputFunctionName){if(!h.test(i.outputFunctionName))throw new Error("outputFunctionName is not a valid JS identifier.");t+="  var "+i.outputFunctionName+" = __append;\n";}if(i.localsName&&!h.test(i.localsName))throw new Error("localsName is not a valid JS identifier.");if(i.destructuredLocals&&i.destructuredLocals.length){for(var s="  var __locals = ("+i.localsName+" || {}),\n",c=0;c<i.destructuredLocals.length;c++){var a=i.destructuredLocals[c];if(!h.test(a))throw new Error("destructuredLocals["+c+"] is not a valid JS identifier.");0<c&&(s+=",\n  "),s+=a+" = __locals."+a;}t+=s+";\n";}!1!==i._with&&(t+="  with ("+i.localsName+" || {}) {\n",n+="  }\n"),this.source=t+this.source+(n+="  return __output;\n");}t=i.compileDebug?"var __line = 1\n  , __lines = "+JSON.stringify(this.templateText)+"\n  , __filename = "+r+";\ntry {\n"+this.source+"} catch (e) {\n  rethrow(e, __lines, __filename, __line, escapeFn);\n}\n":this.source,i.client&&(t="escapeFn = escapeFn || "+o.toString()+";\n"+t,i.compileDebug&&(t="rethrow = rethrow || "+g.toString()+";\n"+t)),i.strict&&(t='"use strict";\n'+t),i.debug&&console.log(t),i.compileDebug&&i.filename&&(t=t+"\n//# sourceURL="+r+"\n");try{if(i.async)try{l=new Function("return (async function(){}).constructor;")();}catch(e){throw e instanceof SyntaxError?new Error("This environment does not support async/await"):e}else l=Function;e=new l(i.localsName+", escapeFn, include, rethrow",t);}catch(e){throw e instanceof SyntaxError&&(i.filename&&(e.message+=" in "+i.filename),e.message+=" while compiling ejs\n\n",e.message+="If the above error is not helpful, you may want to try EJS-Lint:\n",e.message+="https://github.com/RyanZim/EJS-Lint",i.async||(e.message+="\n",e.message+="Or, if you meant to create an async function, pass `async: true` as an option.")),e}n=i.client?e:function(r){return e.apply(i.context,[r||f.createNullProtoObjWherePossible(),o,function(e,t){var n=f.shallowCopy(f.createNullProtoObjWherePossible(),r);return t&&(n=f.shallowCopy(n,t)),m(e,i)(n)},g])};if(i.filename&&"function"==typeof Object.defineProperty){var r=i.filename,l=u.basename(r,u.extname(r));try{Object.defineProperty(n,"name",{value:l,writable:!1,enumerable:!1,configurable:!0});}catch(e){}}return n},generateSource:function(){this.opts.rmWhitespace&&(this.templateText=this.templateText.replace(/[\r\n]+/g,"\n").replace(/^\s+|\s+$/gm,"")),this.templateText=this.templateText.replace(/[ \t]*<%_/gm,"<%_").replace(/_%>[ \t]*/gm,"_%>");var n=this,r=this.parseTemplateText(),i=this.opts.delimiter,o=this.opts.openDelimiter,s=this.opts.closeDelimiter;r&&r.length&&r.forEach(function(e,t){if(0===e.indexOf(o+i)&&0!==e.indexOf(o+i+i)&&(t=r[t+2])!=i+s&&t!="-"+i+s&&t!="_"+i+s)throw new Error('Could not find matching close tag for "'+e+'".');n.scanLine(e);});},parseTemplateText:function(){for(var e,t=this.templateText,n=this.regex,r=n.exec(t),i=[];r;)0!==(e=r.index)&&(i.push(t.substring(0,e)),t=t.slice(e)),i.push(r[0]),t=t.slice(r[0].length),r=n.exec(t);return t&&i.push(t),i},_addOutput:function(e){if(this.truncate&&(e=e.replace(/^(?:\r\n|\r|\n)/,""),this.truncate=!1),!e)return e;e=(e=(e=(e=e.replace(/\\/g,"\\\\")).replace(/\n/g,"\\n")).replace(/\r/g,"\\r")).replace(/"/g,'\\"'),this.source+='    ; __append("'+e+'")\n';},scanLine:function(e){var t=this.opts.delimiter,n=this.opts.openDelimiter,r=this.opts.closeDelimiter,i=e.split("\n").length-1;switch(e){case n+t:case n+t+"_":this.mode=v.modes.EVAL;break;case n+t+"=":this.mode=v.modes.ESCAPED;break;case n+t+"-":this.mode=v.modes.RAW;break;case n+t+"#":this.mode=v.modes.COMMENT;break;case n+t+t:this.mode=v.modes.LITERAL,this.source+='    ; __append("'+e.replace(n+t+t,n+t)+'")\n';break;case t+t+r:this.mode=v.modes.LITERAL,this.source+='    ; __append("'+e.replace(t+t+r,t+r)+'")\n';break;case t+r:case"-"+t+r:case"_"+t+r:this.mode==v.modes.LITERAL&&this._addOutput(e),this.mode=null,this.truncate=0===e.indexOf("-")||0===e.indexOf("_");break;default:if(this.mode){switch(this.mode){case v.modes.EVAL:case v.modes.ESCAPED:case v.modes.RAW:e.lastIndexOf("//")>e.lastIndexOf("\n")&&(e+="\n");}switch(this.mode){case v.modes.EVAL:this.source+="    ; "+e+"\n";break;case v.modes.ESCAPED:this.source+="    ; __append(escapeFn("+w(e)+"))\n";break;case v.modes.RAW:this.source+="    ; __append("+w(e)+")\n";break;case v.modes.COMMENT:break;case v.modes.LITERAL:this._addOutput(e);}}else this._addOutput(e);}this.opts.compileDebug&&i&&(this.currentLine+=i,this.source+="    ; __line = "+this.currentLine+"\n");}},a.escapeXML=f.escapeXML,a.__express=a.renderFile,a.VERSION=e,a.name="ejs","undefined"!=typeof window&&(window.ejs=a);},{"../package.json":2,"./utils":1,fs:3,path:4}]},{},[])("ejs")}),window.ejs=window.ejs||new ejs;var ejs$1 = window.ejs;


/**
 * Pours an ejs template into the innerHTML of an element. Any new elements with an
 * attribute like attach="myVarName" will be attached back to the current context. Useful
 * for quickly generating lots of elements you want to later control with JavaScript.
 * @example
 * import pour from './pour.mjs';
 *
 * class MyClass {
 *   constructor () {
 *     pour.context = this;
 *     this.init();
 *   }
 *
 *   async init () {
 *
 *     this.tabs = {
 *       'Home': '/',
 *       'About': '/about.html',
 *       'Contact': '/contact.html'
 *     }
 *
 *     pour(document.body, `
 *
 *       <%- include('./header.html') %>
 *       <div attach="tabPanel">
 *         <h1 attach="siteTitle"><%= siteName %></h1>
 *         <% for (const label in this.tabs) %>
 *           <li><a href="<%=this.tabs[label]%>"><%= key %></a></li>
 *         <% } %>
 *       <div>
 *       <%- include('./footer.html', {copyright: '&copy; ' + siteName}) %>
 *
 *     `, {siteName: 'My Site'});
 *
 *     if (window.location.hostname.includes('staging') {
 *       this.tabPanel.classList.add('tab-staging');
 *       this.siteTitle.innerHTML += '(staging)';
 *     }
 *   }
 * }
 * @param {string} template Either a path to load the template from, or the ejs template
 *     code itself.
 * @param {object} values A hash of key/value pairs that can be accessed inside the
 *     ejs template code. For example, if you provided values of {foo:42}, then you
 *     could output 42 into the template as <%= foo %>.
 * @return {boolean|Error} Error message if something goes wrong, or false if not.
 */
async function pour(element, template = '', values = {}) {
    
  let context = pour.context;
  let vals = {};
  Object.assign(vals, pour.standardValues);
  Object.assign(vals, values);

  // Shim in an include method that works with the browser's fetch method.
  vals.include = async function(path, innerVals = {}) {
    let responseText = '';
    try {
      let response = await fetch(path);
      responseText = await response.text();
    } catch(e) {
      responseText = e.toString();
    }
    responseText = responseText.replace(/\<\%\-\s+include\s*\(/g, '<%- await include(');
    
    Object.assign(innerVals, vals);
    let renderedResult =
      await ejs$1.render(responseText, innerVals, {async: true, context: context});
    return renderedResult;
  }.bind(this);
  
  
  // If the template is nothing but a path, load that path with an include.
  let templateIsPath = template.includes('\n') === false &&
                      (template.substring(0, 2) === './' ||
                       template.substring(0, 3) === '../' ||
                       template.substring(0, 1) === '/' ||
                       template.substring(0, 4) === 'http');
  
  if (templateIsPath) {
    template = `<%- include('${template}') %>`;
  }
   
  // Replace the non-await version of include to add the await. Hacky but hey.                   
  let text = template.replace(/\<\%\-\s+include\s*\(/g, '<%- await include(');
  
  try {
    // Render the template to a string.
    const html = await ejs$1.render(text, vals, {async: true, context: context});
    
    // Certain elements are appended to instead of replaced.
    let append = false;
    if (pour.elementsWeAppendTo.includes(element)) {
      element.innerHTML += html;
    } else {
      element.innerHTML = html;
    }
    
    // Now look for any attach="varName" attributes and attach them to the context.
    const elsToAttach = element.querySelectorAll('[attach]');
    if (elsToAttach.length) {   
      elsToAttach.forEach((el) => {
        let attachName = el.getAttribute('attach');
        if (attachName) {
          context[attachName] = el;
          el.pour = async function (template, values) {
            return await this.pour(el, template, values, context);
          }.bind(this);
        
          // Remove this so it won't be caught again if another template is appended.
          el.removeAttribute('attach');
        }
      });
      if (context === window) {
        console.warn('pour.mjs: the following elements were attached to the window. ' +
            'Did you mean to set pour.context to something else?', elsToAttach);
      }
    }
    
    // Now look for any scripts an attempt to run them as JavaScript.
    let scripts = element.getElementsByTagName('script');
    for (let script of scripts) {
      let js = Function(script.innerText);
      js();
    }
    return false;
  } catch(e) {
    console.error(e);
    element.innerHTML = 
        'Template Error: ' + e.statusText + '<pre>' + e.message + '</pre>';
    return e;
  }
}


/**
 * The context the pour function will render templates to. Also, any HTML entities
 * that get generated with a attach="someVariableName" will automatically be attached
 * back to the context under that name.
 */
pour.context = window;


/**
 * Normally a call to pour() will replace the contents of the element. The document's
 * body is an exception. Calls to pour will append to that one. You can add to this
 * list if you really need to.
 */
pour.elementsWeAppendTo = [];


/**
 * If there are values or functions you want to always make available in templates,
 * add them here. (Note that the template has direct access to your context by using
 * the this keyword in template code, so that's often a simpler way to get at shared
 * functions and things. But you might not like that aesthetically, so here's another
 * way to handle it.)
 * @example
 * pour.standardValues.capitalize = (str) => {
 *   return str.toString().toUpperCase();
 * }
 * pour.standardValues.copyright = 2026;
 */
pour.standardValues = {};

export { pour as default };
