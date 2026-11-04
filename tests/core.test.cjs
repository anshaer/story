'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),E=require(path.join(root,'engine.js')),demo=JSON.parse(fs.readFileSync(path.join(root,'sample.json'),'utf8'));
class Element{constructor(tag){this.tagName=tag;this.children=[];this.textContent='';this.className='';this.attributes={};this.paused=true;}append(...nodes){this.children.push(...nodes);}prepend(...nodes){this.children.unshift(...nodes);}replaceChildren(...nodes){this.children=[...nodes];}get childElementCount(){return this.children.length;}setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return k==='src'?this.src||null:this.attributes[k]||null;}removeAttribute(k){if(k==='src')this.src='';delete this.attributes[k];}addEventListener(){}querySelector(){return null;}querySelectorAll(){return [];}remove(){}pause(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}click(){this.onclick?.();}}
global.document={createElement:t=>new Element(t)};global.Audio=class extends Element{constructor(){super('audio');}};
const storage=new Map();global.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
function all(x){return [x,...x.children.flatMap(c=>typeof c==='object'?all(c):[])];}
function choose(m,text){const b=all(m).find(x=>x.tagName==='button'&&x.textContent===text);assert.ok(b,'missing choice '+text);assert.ok(!b.disabled,'disabled choice '+text);b.click();}
assert.deepEqual(E.validate(demo).errors,[]);
const m=new Element('main'),player=E.createPlayer(m,demo,{storageKey:'test'});
player.newRound();assert.equal(player.getState().round,1,'fresh play starts at round 1');
assert.equal(all(m).some(x=>x.textContent==='七天前：把第一條紅布綁上樹'),false);
choose(m,'沿著紅布往下走');choose(m,'吃掉餅乾');choose(m,'繼續走');assert.deepEqual(player.getState().endings,['good']);
choose(m,'開始下一輪');assert.equal(player.getState().round,2);assert.equal(player.getState().vars.warmth,1);
choose(m,'七天前：把第一條紅布綁上樹');choose(m,'把餅乾放進鐵盒');choose(m,'先到小屋生火');assert.ok(player.getState().endings.includes('truth'));
const save=JSON.parse(JSON.stringify({project:demo.id,...player.getState()}));
player.clear();assert.equal(player.getState().round,1);assert.deepEqual(player.getState().endings,[]);
choose(m,'沿著紅布往下走');choose(m,'留給弟弟');choose(m,'坐下來，等風小一點');assert.ok(player.getState().endings.includes('lost'));
player.loadState(save);player.start();choose(m,'七天前：把第一條紅布綁上樹');choose(m,'留一點給自己，再替她找近路');assert.ok(player.getState().endings.includes('detour'));
assert.throws(()=>player.loadState({...save,vars:{warmth:'wrong',trace:false}}),/不相容/);
assert.throws(()=>player.loadState({...save,endings:['missing']}),/移除/);
const r=new Element('main'),resumed=E.createPlayer(r,demo,{storageKey:'test'});resumed.resume();assert.equal(resumed.getState().node,'detour');const before=resumed.getState().round;resumed.newRound();assert.equal(resumed.getState().round,before+1);
const broken=E.clone(demo);broken.nodes[0].choices[0].target='missing';assert.ok(E.validate(broken).errors.some(x=>x.includes('不存在的節點')));
broken.nodes[0].choices[0].conditions={bad:true};assert.ok(E.validate(broken).errors.some(x=>x.includes('conditions')));
assert.equal(E.conditionsPass([{key:'x',op:'==',value:2}],{vars:{x:'2'},endings:[],round:1}),false);
assert.deepEqual(E.applyEffects({x:1},{set:{x:3},add:{x:-2}}),{x:1});
assert.equal(E.safeSrc('javascript:alert(1)'),false);assert.equal(E.safeSrc('data:text/html,test'),false);
// Extract export helpers before attaching editor UI listeners; no browser dependency.
let app=fs.readFileSync(path.join(root,'app.js'),'utf8');app=app.slice(0,app.indexOf('for(const b of document.querySelectorAll'))+'window.TestExports={gameHTML,zipStore};})();';
const context={StoryEngine:E,DEMO_STORY:demo,window:{STORY_ENGINE_SOURCE:global.STORY_ENGINE_SOURCE},document:global.document,TextEncoder,Uint8Array,DataView,Blob,console,setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(app,context);
const game=context.window.TestExports.gameHTML(demo);assert.ok(game.includes('story-data'));assert.ok(!game.includes('src="engine.js"'));assert.ok(game.includes('data:image/svg+xml;base64,'));
const malicious=E.clone(demo);malicious.nodes[0].text='</script><script>alert(1)</script>';const escaped=context.window.TestExports.gameHTML(malicious);assert.ok(escaped.includes('\\u003c/script>'));assert.ok(!escaped.includes('</script><script>alert(1)'));
const data=game.match(/<script type="application\/json" id="story-data">([\s\S]*?)<\/script>/)[1];assert.equal(JSON.parse(data).title,demo.title);
for(const script of game.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
fs.writeFileSync(path.join(root,'demo-game.html'),game);
(async()=>{const zip=context.window.TestExports.zipStore([['index.html',game],['中文測試.txt','內容 ✓'],['binary.bin',new Uint8Array([0,128,255])]]);fs.writeFileSync(path.join(root,'tests','export-test.zip'),Buffer.from(await zip.arrayBuffer()));console.log('PASS: all four endings, second-round unlock, round counts, save/load, validation, XSS escaping, standalone HTML and ZIP generation.');})().catch(e=>{console.error(e);process.exitCode=1;});
// Smoke-test editor initialization and a real form update with a minimal DOM.
const ids=new Map();
class UIElement extends Element{constructor(t){super(t);this.value='';this.style={};this.classList={toggle(){},add(){},remove(){}};}showModal(){this.open=true;}close(){this.open=false;}setCustomValidity(){}reportValidity(){}}
global.document={createElement:t=>new UIElement(t),createTextNode:t=>({textContent:t,children:[]}),getElementById:id=>{if(!ids.has(id))ids.set(id,new UIElement('div'));return ids.get(id);},querySelectorAll:()=>[]};
const fullContext={StoryEngine:E,DEMO_STORY:demo,window:{STORY_ENGINE_SOURCE:global.STORY_ENGINE_SOURCE,addEventListener(){}},document:global.document,localStorage:global.localStorage,TextEncoder,Uint8Array,DataView,Blob,console,setTimeout,clearTimeout,confirm:()=>true,prompt:()=>null,FileReader:class{}};
vm.createContext(fullContext);vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),fullContext);
assert.equal(fullContext.window.StoryFork.getProject().nodes.length,10);
const form=ids.get('nodeForm');const titleLabel=form.children.findIndex(x=>x.textContent==='場景標題');const titleInput=form.children[titleLabel+1];titleInput.value='已修改標題';titleInput.onchange();assert.equal(fullContext.window.StoryFork.getProject().nodes[0].title,'已修改標題');
console.log('PASS: editor initialization, node inspector form and title update.');
