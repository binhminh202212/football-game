(function(){
"use strict";

const ROLE_ORDER = ["GK","DF","DF","DF","DF","MF","MF","MF","MF","FW","FW"];
// ---- Phạt OVR khi xếp sai vị trí (đội hình chính, 11 slot cố định theo ROLE_ORDER) ----
// Thủ môn (GK) CHỈ được đứng vị trí GK, và vị trí GK CHỈ nhận thủ môn — chặn cứng, không cho đổi.
// Với DF/MF/FW: vẫn cho đổi chỗ nhau nhưng bị trừ OVR vì chơi trái vị trí sở trường.
const POSITION_MISMATCH_PENALTY = 10;
function slotFormationRole(list, idx){
  if(list !== 'starters') return null; // băng ghế dự bị không có vị trí cố định
  return ROLE_ORDER[idx] || null;
}
function isHardBlockedPlacement(playerRole, slotRole){
  if(!slotRole) return false;
  return (playerRole === 'GK') !== (slotRole === 'GK');
}
function getSlotEffectiveOvr(p, idx){
  if(!p) return 0;
  const slotRole = ROLE_ORDER[idx];
  if(p.role !== slotRole) return Math.max(1, p.ovr - POSITION_MISMATCH_PENALTY);
  return p.ovr;
}

const TEAMS = [
  { id:"BRA", name:"Brazil", flag:"🇧🇷", stars:5, c1:"#f2c400", c2:"#0b7a2c",
    players:["Alisson","Danilo","Marquinhos","Militão","Wendell","Casemiro","Bruno Guimarães","Lucas Paquetá","Raphinha","Vinícius Jr.","Rodrygo"] },
  { id:"ARG", name:"Argentina", flag:"🇦🇷", stars:5, c1:"#6fb8e6", c2:"#ffffff",
    players:["Emiliano Martínez","Nahuel Molina","Cristian Romero","Lisandro Martínez","Nicolás Tagliafico","Rodrigo De Paul","Enzo Fernández","Alexis Mac Allister","Ángel Di María","Lionel Messi","Julián Álvarez"] },
  { id:"FRA", name:"Pháp", flag:"🇫🇷", stars:5, c1:"#1e3a8a", c2:"#e11d2e",
    players:["Mike Maignan","Jules Koundé","William Saliba","Dayot Upamecano","Theo Hernández","Aurélien Tchouaméni","Eduardo Camavinga","Antoine Griezmann","Ousmane Dembélé","Kylian Mbappé","Marcus Thuram"] },
  { id:"GER", name:"Đức", flag:"🇩🇪", stars:4, c1:"#111111", c2:"#e3122d",
    players:["Manuel Neuer","Joshua Kimmich","Antonio Rüdiger","Jonathan Tah","David Raum","İlkay Gündoğan","Robert Andrich","Jamal Musiala","Leroy Sané","Kai Havertz","Niclas Füllkrug"] },
  { id:"ESP", name:"Tây Ban Nha", flag:"🇪🇸", stars:4, c1:"#e11d2e", c2:"#f2b134",
    players:["Unai Simón","Dani Carvajal","Aymeric Laporte","Robin Le Normand","Marc Cucurella","Rodri","Pedri","Fabián Ruiz","Nico Williams","Álvaro Morata","Mikel Oyarzabal"] },
  { id:"ENG", name:"Anh", flag:"🇬🇧", stars:4, c1:"#ffffff", c2:"#1e3a8a",
    players:["Jordan Pickford","Kyle Walker","John Stones","Marc Guéhi","Kieran Trippier","Declan Rice","Jude Bellingham","Phil Foden","Bukayo Saka","Harry Kane","Ollie Watkins"] },
  { id:"POR", name:"Bồ Đào Nha", flag:"🇵🇹", stars:4, c1:"#c8102e", c2:"#0b6e2c",
    players:["Diogo Costa","Diogo Dalot","Rúben Dias","António Silva","Nuno Mendes","Vitinha","Bruno Fernandes","Bernardo Silva","João Cancelo","Cristiano Ronaldo","Gonçalo Ramos"] },
  { id:"NED", name:"Hà Lan", flag:"🇳🇱", stars:3, c1:"#f2701c", c2:"#111111",
    players:["Bart Verbruggen","Jurriën Timber","Virgil van Dijk","Stefan de Vrij","Nathan Aké","Tijjani Reijnders","Frenkie de Jong","Xavi Simons","Cody Gakpo","Memphis Depay","Donyell Malen"] },
  { id:"ITA", name:"Ý", flag:"🇮🇹", stars:3, c1:"#1e6fd9", c2:"#ffffff",
    players:["Gianluigi Donnarumma","Giovanni Di Lorenzo","Alessandro Bastoni","Riccardo Calafiori","Federico Dimarco","Nicolò Barella","Jorginho","Davide Frattesi","Federico Chiesa","Mateo Retegui","Moise Kean"] },
  { id:"BEL", name:"Bỉ", flag:"🇧🇪", stars:3, c1:"#e3122d", c2:"#111111",
    players:["Koen Casteels","Timothy Castagne","Wout Faes","Jan Vertonghen","Arthur Theate","Amadou Onana","Youri Tielemans","Kevin De Bruyne","Jérémy Doku","Romelu Lukaku","Loïs Openda"] },
];

const CW = 880, CH = 520;
const PX0 = 26, PX1 = CW-26, PY0 = 26, PY1 = CH-26;
const PW = PX1-PX0, PH = PY1-PY0;
const GOAL_H = 118;
const GOAL_Y0 = (PY0+PY1)/2 - GOAL_H/2;
const GOAL_Y1 = (PY0+PY1)/2 + GOAL_H/2;
const GOAL_DEPTH = 16;

const FORMATION = [
  {x:0.045,y:0.5},
  {x:0.16,y:0.16},{x:0.16,y:0.40},{x:0.16,y:0.60},{x:0.16,y:0.84},
  {x:0.42,y:0.18},{x:0.42,y:0.40},{x:0.42,y:0.60},{x:0.42,y:0.82},
  {x:0.68,y:0.36},{x:0.68,y:0.64},
];

function fx(nx, side){ const t = side === 'A' ? nx : 1-nx; return PX0 + t*PW; }
function fy(ny){ return PY0 + ny*PH; }

let selfTeam = null, oppTeam = null;
let players = [];
let ball = { x:CW/2, y:CH/2, vx:0, vy:0, z:0, vz:0, owner:null, r:6 };
let controlled = null;
let score = { A:0, B:0 };
let matchTime = 180;
let running = false;
let lastTs = 0;
let keys = {};
let mouse = { x: CW/2, y: CH/2 };
let animId = null;
let goalPauseUntil = 0;
let kickoffPauseUntil = 0;

const PLAYER_R = 11;
const BASE_SPEED = 148;
const SHOT_SPEED = 470;
const PICKUP_R = 16;
const TACKLE_R = 30;
const GK_CATCH_R = 26;
const GRAVITY = 780;
const HOLD_MAX = 850;   // above this = max shot power

let charging = false;
let chargeStart = 0;
let chargeProgress = 0;
let particles = [];

// ---- Career / economy state ----
let wallet = 400;
let squadStore = {};          // teamId -> array of 11 { name, role, number, ovr }
let unlockedPlayers = new Set(); // tên các cầu thủ (trong pool market/legend/special) mà người chơi đã từng sở hữu
let tactic = 'balanced';      // 'attack' | 'balanced' | 'defense'
let matchMode = 'manual';     // 'manual' (điều khiển) | 'sim' (mô phỏng manager)
let lastTouchTeam = null;     // team that last touched the ball (for throw-in / corner / goal-kick)
let lastShooter = null;       // player who last took a shot (for goal attribution)
let matchGoals = [];          // { team, name }
let totalCards = 0;
let restartPauseUntil = 0;
let restartTeam = null;

// ---- Scout player (mở gói) ----
let scoutPending = null;   // true = đang chờ đá xong trận scout để random gói nhận được
let matchContext = 'normal'; // 'normal' | 'scout' | 'worldcup'
let packInventory = { normal:0, rare:0, mythic:0, legendary:0, ultimate:0, ownerpack:0 }; // số dư thẻ (gói chưa mở) theo loại
let wins = 0; // tổng số trận thắng (mọi chế độ) — dùng cho bảng xếp hạng

// ---- World Cup event ----
let worldCup = null; // { round, opponents:[team,team,team], done, champion }
const WC_ROUND_NAMES = ['Tứ kết','Bán kết','Chung kết'];
const WC_ROUND_BONUS = [300, 600, 1200];
const WC_CHAMPION_BONUS = 2500;

// ================= FIREBASE: đăng nhập, lưu online, bạn bè, bảng xếp hạng =================
const firebaseConfig = {
  apiKey: "AIzaSyBrzcz0mQfUCDnWo3Sxrr0WiOou0S4V37U",
  authDomain: "football-98597.firebaseapp.com",
  databaseURL: "https://football-98597-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "football-98597",
  storageBucket: "football-98597.firebasestorage.app",
  messagingSenderId: "201852691214",
  appId: "1:201852691214:web:8cc98d0cc3acf705b3ad5f",
  measurementId: "G-SVNYJ1VKLL"
};
let fbReady = false, auth = null, db = null;
try{
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.database();
  fbReady = true;
}catch(e){ console.warn('Firebase init lỗi, game vẫn chạy offline:', e); }

let currentUser = null;      // user Firebase hiện tại (null = chưa đăng nhập / chơi offline)
let cloudSaveData = null;    // dữ liệu save tải từ Firebase cho user hiện tại
let myDisplayName = null;    // tên hiển thị public (dùng cho bạn bè & BXH)

// ---- Lưu / tải tiến trình: mỗi phiên đăng nhập (hoặc chế độ offline) có 1 dữ liệu RIÊNG BIỆT ----
// Đã có hệ thống đăng nhập/đăng ký (Firebase) để lưu tiến trình theo tài khoản, nên localStorage
// chỉ đóng vai trò CACHE cho đúng phiên hiện tại (theo uid khi đăng nhập, hoặc 1 slot "offline" riêng
// khi chơi không đăng nhập) — không dùng chung 1 key cho mọi người để tránh lẫn dữ liệu giữa các tài khoản.
const SAVE_KEY_OFFLINE = 'sanCoVang_save_offline_v1';
function localSaveKey(){
  return currentUser ? ('sanCoVang_save_uid_' + currentUser.uid) : SAVE_KEY_OFFLINE;
}
function saveGame(){
  if(!selfTeam) return;
  const data = {
    selfTeamId: selfTeam.id,
    wallet,
    squadStore,
    unlockedPlayers: Array.from(unlockedPlayers),
    packInventory,
    worldCup,
    wins,
    savedAt: Date.now(),
  };
  try{ localStorage.setItem(localSaveKey(), JSON.stringify(data)); }
  catch(e){ /* localStorage có thể bị chặn (chế độ ẩn danh, hết dung lượng...) — bỏ qua, không làm gián đoạn game */ }

  if(fbReady && currentUser){
    try{
      db.ref('users/'+currentUser.uid+'/save').set(data);
      updateLeaderboardEntry();
    }catch(e){ /* mất mạng — dữ liệu vẫn an toàn ở localStorage, sẽ đồng bộ lại lần lưu sau */ }
  }
}
function updateLeaderboardEntry(){
  if(!fbReady || !currentUser || !selfTeam) return;
  const squad = squadStore[selfTeam.id];
  const avgOvr = squad ? squadAvgOvr(squad.starters) : 0;
  try{
    db.ref('leaderboard/'+currentUser.uid).set({
      displayName: myDisplayName || currentUser.email || 'Người chơi',
      teamName: selfTeam.name,
      teamFlag: selfTeam.flag,
      avgOvr, wallet, wins,
      nameColor: myNameColor || null,
      updatedAt: Date.now(),
    });
  }catch(e){}
}
function loadSaveData(){
  if(currentUser && cloudSaveData) return cloudSaveData;
  try{
    const raw = localStorage.getItem(localSaveKey());
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}
function clearSaveData(){
  try{ localStorage.removeItem(localSaveKey()); }catch(e){}
  if(fbReady && currentUser){
    try{ db.ref('users/'+currentUser.uid+'/save').remove(); }catch(e){}
  }
  cloudSaveData = null;
}
function applySaveData(data){
  const team = TEAMS.find(t=>t.id===data.selfTeamId);
  if(!team) return false;
  selfTeam = team;
  wallet = typeof data.wallet === 'number' ? data.wallet : wallet;
  squadStore = data.squadStore || {};
  unlockedPlayers = new Set(data.unlockedPlayers || []);
  packInventory = Object.assign({normal:0,rare:0,mythic:0,legendary:0,ultimate:0,ownerpack:0}, data.packInventory||{});
  worldCup = data.worldCup || null;
  wins = typeof data.wins === 'number' ? data.wins : 0;
  ensureSquad(selfTeam);
  return true;
}

const MARKET_POOL_SEED = [
  // Thủ môn
  {name:"Nemanja Vuković", role:"GK", ovr:91, price:640},
  {name:"Tobias Krämer", role:"GK", ovr:83, price:420},
  {name:"Igor Halas", role:"GK", ovr:74, price:220},
  {name:"Marek Dvořák", role:"GK", ovr:65, price:120},
  {name:"Sione Taufa", role:"GK", ovr:58, price:70},
  // Hậu vệ
  {name:"Aksel Berge", role:"DF", ovr:89, price:580},
  {name:"Matteo Greco", role:"DF", ovr:84, price:440},
  {name:"Pavel Sokol", role:"DF", ovr:78, price:320},
  {name:"Erik Solheim", role:"DF", ovr:74, price:240},
  {name:"Rui Andrade", role:"DF", ovr:71, price:190},
  {name:"Milan Horvat", role:"DF", ovr:66, price:130},
  {name:"Youssef Amrani", role:"DF", ovr:68, price:160},
  {name:"Callum Reid", role:"DF", ovr:61, price:90},
  {name:"Bilal Nasser", role:"DF", ovr:59, price:60},
  // Tiền vệ
  {name:"Ivo Kovač", role:"MF", ovr:90, price:620},
  {name:"Kwame Boateng", role:"MF", ovr:85, price:480},
  {name:"Ren Takahashi", role:"MF", ovr:81, price:400},
  {name:"Oskar Lindqvist", role:"MF", ovr:73, price:210},
  {name:"Faisal Rahman", role:"MF", ovr:76, price:280},
  {name:"Adrian Sokolsky", role:"MF", ovr:67, price:140},
  {name:"Milo Andersen", role:"MF", ovr:70, price:180},
  {name:"Junior Mbeki", role:"MF", ovr:63, price:100},
  {name:"Timo Vester", role:"MF", ovr:60, price:80},
  // Tiền đạo
  {name:"Diego Fontana", role:"FW", ovr:95, price:900},
  {name:"Rasmus Lind", role:"FW", ovr:92, price:760},
  {name:"Théo Marchand", role:"FW", ovr:87, price:560},
  {name:"Dario Renner", role:"FW", ovr:77, price:300},
  {name:"Samuel Osei", role:"FW", ovr:79, price:340},
  {name:"Tomás Herrera", role:"FW", ovr:72, price:200},
  {name:"Kian Okafor", role:"FW", ovr:69, price:150},
  {name:"Lucas Verdier", role:"FW", ovr:64, price:110},
  {name:"Enzo Baptiste", role:"FW", ovr:57, price:60},
];

// Cầu thủ huyền thoại — OVR 90+, cực hiếm xuất hiện trên thị trường
const LEGEND_POOL = [
  {name:"Cristiano Ronaldo", role:"FW", ovr:97, price:3200, legend:true},
  {name:"Lionel Messi", role:"FW", ovr:98, price:3400, legend:true},
  {name:"Neymar Jr.", role:"FW", ovr:93, price:2400, legend:true},
  {name:"Kylian Mbappé", role:"FW", ovr:95, price:2800, legend:true},
  {name:"Zinedine Zidane", role:"MF", ovr:94, price:2600, legend:true},
  {name:"Diego Maradona", role:"MF", ovr:96, price:3000, legend:true},
  {name:"Ronaldinho Gaúcho", role:"MF", ovr:92, price:2200, legend:true},
  {name:"Pelé", role:"FW", ovr:97, price:3200, legend:true},
  {name:"Johan Cruyff", role:"FW", ovr:93, price:2400, legend:true},
  {name:"Franz Beckenbauer", role:"DF", ovr:91, price:2000, legend:true},
  {name:"Achraf Hakimi", role:"DF", ovr:94, price:2600, legend:true},
  {name:"Trent Alexander-Arnold", role:"DF", ovr:95, price:2800, legend:true},
  {name:"Reece James", role:"DF", ovr:93, price:2400, legend:true},
  {name:"William Saliba", role:"DF", ovr:95, price:2800, legend:true},
  {name:"Antonio Rüdiger", role:"DF", ovr:95, price:2800, legend:true},
  {name:"Bruno Fernandes", role:"MF", ovr:99, price:3600, legend:true},
  {name:"Thierry Henry", role:"FW", ovr:93, price:2300, legend:true},
  {name:"Ronaldo Nazário", role:"FW", ovr:96, price:2900, legend:true},
  {name:"Roberto Baggio", role:"FW", ovr:91, price:2100, legend:true},
  {name:"Xavi Hernández", role:"MF", ovr:93, price:2300, legend:true},
  {name:"Andrea Pirlo", role:"MF", ovr:92, price:2200, legend:true},
  {name:"Kaká", role:"MF", ovr:92, price:2200, legend:true},
  {name:"Luís Figo", role:"MF", ovr:90, price:2000, legend:true},
  {name:"Gianluigi Buffon", role:"GK", ovr:94, price:2500, legend:true},
  {name:"Iker Casillas", role:"GK", ovr:92, price:2200, legend:true},
  {name:"Alfredo Di Stéfano", role:"FW", ovr:95, price:2700, legend:true},
];

// Cầu thủ cấp độ đặc biệt — hiếm hơn cả Huyền thoại thường, chỉ xuất hiện lồng trong tỉ lệ Legend.
// Độ hiếm tăng dần: LEGEND < FUTURE < SUPERIOR < FORBIDDEN
// level: 'future' (Xanh Dương+Trắng Gradient) | 'superior' (Rainbow Lấp Lánh) | 'forbidden' (Trắng+Đen Gradient)
const FUTURE_POOL = [
  {name:"Lamine Yamal", role:"FW", ovr:99, price:5200, legend:true, special:true, level:'future'},
  {name:"Warren Zaïre-Emery", role:"MF", ovr:99, price:5200, legend:true, special:true, level:'future'},
  {name:"Nico Paz", role:"MF", ovr:98, price:4900, legend:true, special:true, level:'future'},
  {name:"Nico O'Reilly", role:"DF", ovr:97, price:4600, legend:true, special:true, level:'future'},
  {name:"Ronaldo Jr.", role:"FW", ovr:96, price:4300, legend:true, special:true, level:'future'},
  {name:"Endrick", role:"FW", ovr:97, price:4700, legend:true, special:true, level:'future'},
  {name:"Kobbie Mainoo", role:"MF", ovr:96, price:4400, legend:true, special:true, level:'future'},
  {name:"Arda Güler", role:"MF", ovr:97, price:4700, legend:true, special:true, level:'future'},
  {name:"Pau Cubarsí", role:"DF", ovr:97, price:4700, legend:true, special:true, level:'future'},
  {name:"Désiré Doué", role:"FW", ovr:96, price:4400, legend:true, special:true, level:'future'},
  {name:"Estêvão", role:"FW", ovr:96, price:4400, legend:true, special:true, level:'future'},
  {name:"Franco Mastantuono", role:"MF", ovr:95, price:4100, legend:true, special:true, level:'future'},
  {name:"Dean Huijsen", role:"DF", ovr:96, price:4400, legend:true, special:true, level:'future'},
  {name:"Rodrigo Mora", role:"MF", ovr:95, price:4100, legend:true, special:true, level:'future'},
  {name:"João Neves", role:"MF", ovr:97, price:4700, legend:true, special:true, level:'future'},
];
const SUPERIOR_POOL = [
  {name:"Vozinha", role:"GK", ovr:100, price:5000, legend:true, special:true, level:'superior'},
  {name:"Thibaut Courtois", role:"GK", ovr:99, price:4800, legend:true, special:true, level:'superior'},
  {name:"Cafu", role:"DF", ovr:100, price:5600, legend:true, special:true, level:'superior'},
  {name:"Daniel Passarella", role:"DF", ovr:100, price:5600, legend:true, special:true, level:'superior'},
  {name:"Bobby Moore", role:"DF", ovr:101, price:5800, legend:true, special:true, level:'superior'},
  {name:"Sergio Ramos", role:"DF", ovr:102, price:6000, legend:true, special:true, level:'superior'},
  {name:"Franco Baresi", role:"DF", ovr:102, price:6000, legend:true, special:true, level:'superior'},
  {name:"Paolo Maldini", role:"DF", ovr:104, price:6400, legend:true, special:true, level:'superior'},
  {name:"Fabio Cannavaro", role:"DF", ovr:101, price:5800, legend:true, special:true, level:'superior'},
  {name:"Carles Puyol", role:"DF", ovr:101, price:5800, legend:true, special:true, level:'superior'},
  {name:"Alessandro Nesta", role:"DF", ovr:102, price:6000, legend:true, special:true, level:'superior'},
  {name:"Peter Schmeichel", role:"GK", ovr:100, price:5200, legend:true, special:true, level:'superior'},
  {name:"Manuel Neuer", role:"GK", ovr:101, price:5600, legend:true, special:true, level:'superior'},
  {name:"Philipp Lahm", role:"DF", ovr:100, price:5400, legend:true, special:true, level:'superior'},
  {name:"Giorgio Chiellini", role:"DF", ovr:101, price:5800, legend:true, special:true, level:'superior'},
  {name:"Sergio Busquets", role:"MF", ovr:99, price:5000, legend:true, special:true, level:'superior'},
  {name:"Xabi Alonso", role:"MF", ovr:100, price:5400, legend:true, special:true, level:'superior'},
  {name:"Gerard Piqué", role:"DF", ovr:99, price:5000, legend:true, special:true, level:'superior'},
];
const FORBIDDEN_POOL = [
  {name:"Lev Yashin", role:"GK", ovr:102, price:6200, legend:true, special:true, level:'forbidden'},
  {name:"Gordon Banks", role:"GK", ovr:101, price:5800, legend:true, special:true, level:'forbidden'},
  {name:"Cristiano Ronaldo 2008", role:"FW", ovr:106, price:7400, legend:true, special:true, level:'forbidden'},
  {name:"Lionel Messi 2009", role:"FW", ovr:106, price:7400, legend:true, special:true, level:'forbidden'},
  {name:"Neymar JR 2016", role:"FW", ovr:105, price:7200, legend:true, special:true, level:'forbidden'},
  {name:"Andrés Iniesta", role:"MF", ovr:106, price:7400, legend:true, special:true, level:'forbidden'},
  {name:"Roberto Carlos", role:"DF", ovr:107, price:7600, legend:true, special:true, level:'forbidden'},
  {name:"Ronaldinho 2005", role:"MF", ovr:106, price:7400, legend:true, special:true, level:'forbidden'},
  {name:"Zinedine Zidane 2002", role:"MF", ovr:106, price:7400, legend:true, special:true, level:'forbidden'},
  {name:"Ronaldo Nazário 1997", role:"FW", ovr:107, price:7600, legend:true, special:true, level:'forbidden'},
  {name:"Diego Maradona 1986", role:"MF", ovr:108, price:7800, legend:true, special:true, level:'forbidden'},
  {name:"Pelé 1970", role:"FW", ovr:108, price:7800, legend:true, special:true, level:'forbidden'},
  {name:"Franz Beckenbauer 1974", role:"DF", ovr:105, price:7200, legend:true, special:true, level:'forbidden'},
  {name:"Paolo Maldini 1994", role:"DF", ovr:105, price:7200, legend:true, special:true, level:'forbidden'},
  {name:"Xavi Hernández 2010", role:"MF", ovr:104, price:7000, legend:true, special:true, level:'forbidden'},
  {name:"Andrea Pirlo 2006", role:"MF", ovr:103, price:6800, legend:true, special:true, level:'forbidden'},
  {name:"George Best", role:"FW", ovr:103, price:6800, legend:true, special:true, level:'forbidden'},
];
// ---- Winner26: 11 cầu thủ đội hình ra sân trận Chung kết World Cup 2026, nơi Tây Ban Nha
// đánh bại Argentina 1-0 (hiệp phụ, 19/7/2026) để vô địch. OVR 99+, màu Vàng-Đỏ (cờ Tây Ban Nha).
// Sở hữu ĐỦ 11 thẻ sẽ mở khoá màu tên Vàng-Đỏ đặc biệt trong Chat.
// CHỈ xuất hiện trong Bộ sưu tập (Index) & có thể spawn tới hết 15/08/2026, sau đó biến mất vĩnh viễn.
const WINNER26_EXPIRY = new Date('2026-08-15T23:59:59+07:00').getTime();
const WINNER26_POOL = [
  {name:"Unai Simón",     role:"GK", ovr:99, price:50000, legend:true, special:true, level:'winner26'},
  {name:"Pedro Porro",    role:"DF", ovr:99, price:50000, legend:true, special:true, level:'winner26'},
  {name:"Pau Cubarsí",    role:"DF", ovr:99, price:50000, legend:true, special:true, level:'winner26'},
  {name:"Aymeric Laporte",role:"DF", ovr:99, price:50000, legend:true, special:true, level:'winner26'},
  {name:"Marc Cucurella", role:"DF", ovr:99, price:50000, legend:true, special:true, level:'winner26'},
  {name:"Rodri",          role:"MF", ovr:99, price:50000, legend:true, special:true, level:'winner26'},
  {name:"Fabián Ruiz",    role:"MF", ovr:99, price:50000, legend:true, special:true, level:'winner26'},
  {name:"Dani Olmo",      role:"MF", ovr:99, price:50000, legend:true, special:true, level:'winner26'},
  {name:"Álex Baena",     role:"MF", ovr:99, price:50000, legend:true, special:true, level:'winner26'},
  {name:"Lamine Yamal",   role:"FW", ovr:99, price:50000, legend:true, special:true, level:'winner26'},
  {name:"Mikel Oyarzabal",role:"FW", ovr:99, price:50000, legend:true, special:true, level:'winner26'},
];
function isWinner26Expired(){ return Date.now() > WINNER26_EXPIRY; }
// Cầu thủ Owner — độ hiếm CAO NHẤT trong game, chỉ có ĐÚNG 1 lá duy nhất.
// Bình thường CHỈ Admin Owner (tên "Rainz") mới sở hữu được cầu thủ này.
// Người chơi thường gần như không thể có được, trừ khi cực kỳ may mắn ở gói Ultimate
// (0,000001%) hoặc rơi ra ở thị trường chuyển nhượng (0,00000000000001%, giá chỉ 1.000 💰).
const OWNER_POOL = [
  {
    name:"Rainz",
    role:"FW",
    ovr:199,
    price:1000,
    legend:true,
    special:true,
    level:'owner',
    note:"OVR 199 · SIÊU MẠNH VŨ BÃO · CẢ TẤN CÔNG LẪN PHÒNG THỦ · VỊ TRÍ NÀO CŨNG ĐƯỢC · TỈ LỆ THẮNG 99,3%"
  },
];
// Tỉ lệ để 1 lượt ra Legend "biến" thành 1 cầu thủ cấp độ đặc biệt — rất thấp, chỉ 8%
const SPECIAL_SPAWN_CHANCE = 0.08;
// Trong 8% đó, phân bổ theo độ hiếm: Future dễ gặp nhất, Forbidden hiếm nhất
const SPECIAL_TIER_TABLE = [
  { level:'future',    weight:0.55, pool: FUTURE_POOL },
  { level:'superior',  weight:0.30, pool: SUPERIOR_POOL },
  { level:'forbidden', weight:0.15, pool: FORBIDDEN_POOL },
];
function pickSpecialPlayer(){
  const r = Math.random();
  let acc = 0;
  for(const tier of SPECIAL_TIER_TABLE){
    acc += tier.weight;
    if(r < acc) return { ...pickRandom(tier.pool) };
  }
  const last = SPECIAL_TIER_TABLE[SPECIAL_TIER_TABLE.length-1];
  return { ...pickRandom(last.pool) };
}

const BENCH_CAP = 8;
const MARKET_LISTING_SIZE = 10;
const LEGEND_SPAWN_CHANCE = 0.08; // mỗi ô có ~8% cơ hội là huyền thoại — khá hiếm

// Các gói Scout cầu thủ — mỗi gói có tỉ lệ ra cầu thủ huyền thoại (LEGEND) khác nhau.
// Mỗi gói: mở bằng cách đá 1 trận (miễn phí, tỉ lệ không đổi theo kết quả) hoặc mua thẳng.
const SCOUT_PACKS = [
  { id:'normal',    name:'Gói Normal',    icon:'⚪', legendChance:0.00001, price:150,  desc:'Rẻ, gần như chắc chắn ra cầu thủ thường' },
  { id:'rare',      name:'Gói Rare',      icon:'🔵', legendChance:0.04,    price:600,  desc:'Cơ hội nhỏ trúng huyền thoại' },
  { id:'mythic',    name:'Gói Mythic',    icon:'🟣', legendChance:0.20,    price:1800, desc:'Cơ hội khá cao trúng huyền thoại' },
  { id:'legendary', name:'Gói Legendary', icon:'🟡', legendChance:0.29,    price:3200, desc:'Cơ hội cao nhất trúng huyền thoại' },
  { id:'ultimate',  name:'Gói Ultimate',  icon:'💎', legendChance:0.915,   price:10000, desc:'Gói đỉnh nhất — cực nhiều Huyền thoại, Future, Superior, có cả Forbidden!' },
  { id:'ownerpack', name:'Gói Owner',     icon:'👑', legendChance:null,   price:15000, desc:'⏰ CHỈ mở bán 16:00–16:30 mỗi ngày — cơ hội hiếm có để chạm tay vào độ hiếm Owner!' },
];

// ---- Tỉ lệ riêng của gói Ultimate (không dùng cơ chế legendChance lồng nhau như các gói khác) ----
// Owner 0,000001% · Forbidden 1.5% · Superior 10% · Future 20% · Huyền thoại (Legend) 60% · còn lại là cầu thủ thường
const ULTIMATE_ODDS = { owner:0.00000001, forbidden:0.015, superior:0.10, future:0.20, legend:0.60 };
// ---- Tỉ lệ cực nhỏ để 1 lượt sinh ra ở Thị trường chuyển nhượng lại là cầu thủ Owner ----
// 0,00000000000001% — gần như không thể xảy ra. Nếu trúng, giá niêm yết CHỈ 1.000 💰.
const OWNER_MARKET_CHANCE = 0.0000000000000001;

// ---- Gói Owner: chỉ xuất hiện ở Scout Shop từ 16:00 đến 16:30 mỗi ngày (giờ máy người chơi) ----
// 50% ra độ hiếm Legend trở lên, trong đó: Forbidden 10% · Superior 10% · Owner 0,92% · phần còn lại là Legend thường
const OWNER_PACK_HOUR = 16;
const OWNER_PACK_DURATION_MIN = 30; // mở trong 30 phút: 16:00 -> 16:30
const OWNER_PACK_ODDS = { owner:0.0092, forbidden:0.10, superior:0.10, legend:0.5 - 0.0092 - 0.10 - 0.10 };
function isOwnerPackAvailable(){
  const now = new Date();
  return now.getHours() === OWNER_PACK_HOUR && now.getMinutes() < OWNER_PACK_DURATION_MIN;
}
function msUntilNextOwnerPackHour(){
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0,0,0);
  if(now.getHours() < OWNER_PACK_HOUR || (now.getHours()===OWNER_PACK_HOUR && now.getMinutes() < OWNER_PACK_DURATION_MIN)){
    next.setHours(OWNER_PACK_HOUR);
  } else {
    next.setDate(next.getDate()+1);
    next.setHours(OWNER_PACK_HOUR);
  }
  return next - now;
}
function msUntilOwnerPackClose(){
  const now = new Date();
  const close = new Date(now);
  close.setHours(OWNER_PACK_HOUR, OWNER_PACK_DURATION_MIN, 0, 0);
  return close - now;
}
function fmtCountdown(ms){
  const totalMin = Math.max(0, Math.floor(ms/60000));
  const h = Math.floor(totalMin/60), m = totalMin%60;
  return `${h}h${m.toString().padStart(2,'0')}p`;
}

function shuffleArr(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function regenerateMarket(){
  const regularShuffled = shuffleArr(MARKET_POOL_SEED);
  const legendShuffled = shuffleArr(LEGEND_POOL);
  let legendCursor = 0;
  const pool = [];
  for(let i=0;i<MARKET_LISTING_SIZE;i++){
    if(Math.random() < OWNER_MARKET_CHANCE){
      // Cực kỳ hiếm: Owner "Rainz" xuất hiện ở thị trường chuyển nhượng, giá chỉ 1.000 💰
      pool.push({ ...pickRandom(OWNER_POOL), price:1000 });
    } else if(Math.random() < LEGEND_SPAWN_CHANCE && legendCursor < legendShuffled.length){
      if(Math.random() < SPECIAL_SPAWN_CHANCE){
        pool.push(pickSpecialPlayer());
      } else {
        pool.push({ ...legendShuffled[legendCursor] });
        legendCursor++;
      }
    } else {
      pool.push({ ...regularShuffled[i % regularShuffled.length] });
    }
  }
  marketPool = pool;
}

let marketPool = [];
regenerateMarket();

function fmtMoney(n){ return Math.round(n).toLocaleString('vi-VN'); }
function renderWallet(){
  document.querySelectorAll('.wallet-badge-val').forEach(el=> el.textContent = fmtMoney(wallet));
  saveGame();
}
function ovrTier(ovr){ return ovr>=90 ? 'gold' : (ovr>=80 ? 'silver' : 'bronze'); }
function genOvr(stars){
  const base = 60 + stars*6;
  return clamp(base + Math.floor(Math.random()*11) - 5, 55, 99);
}
// Ước tính giá trị 1 cầu thủ không có giá gốc (cầu thủ mặc định trong đội hình ban đầu),
// dùng đường cong tương tự thang giá của MARKET_POOL_SEED để giá trị hợp lý theo OVR.
function estimatePlayerPrice(ovr){
  return Math.round(Math.pow(Math.max(ovr-50,5), 2) * 0.5);
}
const SELL_PRICE_RATIO = 0.5; // bán lại được 50% giá trị cầu thủ
function ensureSquad(teamData){
  if(squadStore[teamData.id]){
    // Vá cho save cũ/lỗi thiếu mảng starters/bench (ví dụ dữ liệu từ phiên bản cũ hơn) —
    // tránh crash renderSquadHub khi đọc squad.bench.length.
    const s = squadStore[teamData.id];
    if(!Array.isArray(s.starters)) s.starters = [];
    if(!Array.isArray(s.bench)) s.bench = [];
    return s;
  }
  const starters = [];
  for(let i=0;i<11;i++){
    const ovr = genOvr(teamData.stars);
    starters.push({ name: teamData.players[i], role: ROLE_ORDER[i], number: i+1, ovr, price: estimatePlayerPrice(ovr) });
  }
  // Không còn cầu thủ "Dự bị 1/2/3/4..." mặc định — băng ghế dự bị bắt đầu trống,
  // người chơi tự mua/scout cầu thủ để lấp đầy.
  const bench = [];
  squadStore[teamData.id] = { starters, bench };
  return squadStore[teamData.id];
}
function squadAvgOvr(list){
  if(!list.length) return 0;
  // Đội hình chính (đúng 11 người, khớp ROLE_ORDER) tính theo OVR hiệu quả — trừ điểm nếu xếp sai vị trí
  if(list.length === ROLE_ORDER.length){
    return Math.round(list.reduce((s,p,i)=> s+getSlotEffectiveOvr(p,i),0)/list.length);
  }
  return Math.round(list.reduce((s,p)=>s+p.ovr,0)/list.length);
}
let squadSelection = null; // { list, idx } for click/tap-to-swap fallback

function emojiForPlayer(p){
  if(p.level==='owner') return '👑';
  if(p.level==='winner26') return '🏆';
  if(p.level==='forbidden') return '⬛';
  if(p.level==='superior') return '🌈';
  if(p.level==='future') return '🔵';
  if(p.legend) return '🌟';
  if(p.role==='GK') return '🧤';
  if(p.role==='DF') return '🛡️';
  if(p.role==='MF') return '🎯';
  if(p.role==='FW') return '⚡';
  return '⚽';
}
function cardLevelClass(p){
  if(p.level==='owner') return 'owner';
  if(p.level==='winner26') return 'winner26';
  if(p.level==='forbidden') return 'forbidden';
  if(p.level==='superior') return 'superior';
  if(p.level==='future') return 'future';
  if(p.legend) return 'legend';
  return '';
}
function makeSquadSlot(p, list, idx){
  const div = document.createElement('div');
  const lvlCls = cardLevelClass(p);
  div.className = 'player-card' + (lvlCls ? ' '+lvlCls : '');
  div.draggable = true;
  div.dataset.list = list;
  div.dataset.idx = idx;
  const sellVal = Math.round((p.price!=null ? p.price : estimatePlayerPrice(p.ovr)) * SELL_PRICE_RATIO);
  const sellBtnHtml = list==='bench'
    ? `<button class="btn sell-btn" data-list="${list}" data-idx="${idx}" title="Bán cầu thủ này">💰 Bán ${fmtMoney(sellVal)}</button>`
    : '';
  const slotRole = slotFormationRole(list, idx);
  const mismatch = slotRole && p.role !== slotRole;
  const shownOvr = mismatch ? Math.max(1, p.ovr - POSITION_MISMATCH_PENALTY) : p.ovr;
  const mismatchTag = mismatch
    ? `<span class="card-mismatch" title="Chơi trái vị trí (${p.role} ở vị trí ${slotRole}) — trừ ${POSITION_MISMATCH_PENALTY} OVR">⚠️ -${POSITION_MISMATCH_PENALTY}</span>`
    : '';
  div.innerHTML = `
    <span class="card-ovr-badge ${ovrTier(shownOvr)}">${shownOvr}</span>
    <span class="card-role-badge">${p.role}</span>
    <div class="card-face">${emojiForPlayer(p)}</div>
    <div class="card-name">${escapeHtml(p.name)}</div>
    ${mismatchTag}
    ${sellBtnHtml}`;

  div.addEventListener('dragstart', (e)=>{
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({list, idx}));
    div.classList.add('dragging');
  });
  div.addEventListener('dragend', ()=> div.classList.remove('dragging'));
  div.addEventListener('dragover', (e)=>{ e.preventDefault(); div.classList.add('drag-over'); });
  div.addEventListener('dragleave', ()=> div.classList.remove('drag-over'));
  div.addEventListener('drop', (e)=>{
    e.preventDefault();
    div.classList.remove('drag-over');
    let data;
    try{ data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch(err){ return; }
    swapSquadPlayers(data.list, data.idx, list, idx);
  });
  div.addEventListener('click', (e)=>{
    if(e.target.closest('.sell-btn')) return; // nút bán tự xử lý riêng, không kích hoạt chọn-để-đổi chỗ
    if(!squadSelection){
      squadSelection = { list, idx };
      div.classList.add('selected');
      return;
    }
    if(squadSelection.list === list && squadSelection.idx === idx){
      squadSelection = null;
      div.classList.remove('selected');
      return;
    }
    swapSquadPlayers(squadSelection.list, squadSelection.idx, list, idx);
    squadSelection = null;
  });
  const sellBtn = div.querySelector('.sell-btn');
  if(sellBtn){
    sellBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      sellPlayer(parseInt(sellBtn.dataset.idx,10));
    });
  }
  return div;
}

function sellPlayer(benchIdx){
  const squad = ensureSquad(selfTeam);
  const p = squad.bench[benchIdx];
  if(!p) return;
  const sellVal = Math.round((p.price!=null ? p.price : estimatePlayerPrice(p.ovr)) * SELL_PRICE_RATIO);
  if(!confirm(`Bán ${p.name} (OVR ${p.ovr}) để nhận ${fmtMoney(sellVal)} 💰?`)) return;
  squad.bench.splice(benchIdx, 1);
  wallet += sellVal;
  squadSelection = null;
  renderSquadHub();
}

function swapSquadPlayers(listA, idxA, listB, idxB){
  const squad = ensureSquad(selfTeam);
  const arrA = squad[listA], arrB = squad[listB];
  if(!arrA || !arrB) return;
  idxA = parseInt(idxA,10); idxB = parseInt(idxB,10);
  if(listA===listB && idxA===idxB) return;
  const a = arrA[idxA], b = arrB[idxB];
  const slotRoleA = slotFormationRole(listA, idxA);
  const slotRoleB = slotFormationRole(listB, idxB);
  // b sẽ chuyển tới vị trí A, a sẽ chuyển tới vị trí B — kiểm tra chặn cứng thủ môn cả 2 chiều
  if(isHardBlockedPlacement(b.role, slotRoleA) || isHardBlockedPlacement(a.role, slotRoleB)){
    alert('🚫 Thủ môn chỉ được đứng vị trí Thủ môn — không thể đổi chỗ!');
    return;
  }
  arrA[idxA] = { ...b, number: a.number };
  arrB[idxB] = { ...a, number: b.number };
  renderSquadHub();
}

function renderSquadHub(){
  const squad = ensureSquad(selfTeam);
  const wrap = document.getElementById('squadHubList');
  wrap.innerHTML = '';
  squad.starters.forEach((p,i)=> wrap.appendChild(makeSquadSlot(p, 'starters', i)));
  renderWallet();
  if(currentUser) checkWinner26Complete();

  let avgEl = document.getElementById('squadAvgOvr');
  if(!avgEl){
    avgEl = document.createElement('div');
    avgEl.id = 'squadAvgOvr';
    avgEl.className = 'subtitle';
    avgEl.style.marginTop = '-8px';
    document.getElementById('squadHubList').before(avgEl);
  }
  avgEl.textContent = `Đội hình chính · OVR trung bình: ${squadAvgOvr(squad.starters)}`;

  let dragHint = document.getElementById('squadDragHint');
  if(!dragHint){
    dragHint = document.createElement('div');
    dragHint.id = 'squadDragHint';
    dragHint.className = 'hub-note';
    dragHint.style.marginTop = '2px';
    avgEl.after(dragHint);
  }
  dragHint.textContent = 'Kéo-thả (hoặc chạm để chọn rồi chạm cầu thủ khác) để đổi vị trí giữa đội hình chính và dự bị · Cầu thủ dự bị có thể bấm 💰 Bán để đổi lấy tiền';

  let benchTitle = document.getElementById('benchTitle');
  let benchWrap = document.getElementById('benchList');
  if(!benchTitle){
    benchTitle = document.createElement('div');
    benchTitle.id = 'benchTitle';
    benchTitle.className = 'subtitle';
    benchTitle.style.marginTop = '6px';
    document.getElementById('squadHubList').after(benchTitle);
  }
  if(!benchWrap){
    benchWrap = document.createElement('div');
    benchWrap.id = 'benchList';
    benchWrap.className = 'player-grid';
    benchTitle.after(benchWrap);
  }
  benchTitle.textContent = `Cầu thủ dự bị (${squad.bench.length}/${BENCH_CAP})`;
  benchWrap.innerHTML = '';
  if(!squad.bench.length){
    benchWrap.innerHTML = '<div style="color:var(--muted);font-size:12px;">Chưa có cầu thủ dự bị nào — mua thêm ở chợ chuyển nhượng.</div>';
  } else {
    squad.bench.forEach((p,i)=> benchWrap.appendChild(makeSquadSlot(p, 'bench', i)));
  }
}
function renderMarket(){
  renderWallet();
  const wrap = document.getElementById('marketList');
  wrap.innerHTML = '';
  if(!marketPool.length){
    wrap.innerHTML = '<div style="color:var(--muted)">Đã hết cầu thủ trên thị trường phiên này.</div>';
    return;
  }
  marketPool.forEach((mp, idx)=>{
    const div = document.createElement('div');
    div.className = 'market-card' + (mp.legend ? ' legend' : '') + (mp.level==='future' ? ' future' : '') + (mp.level==='superior' ? ' superior' : '') + (mp.level==='forbidden' ? ' forbidden' : '') + (mp.level==='owner' ? ' owner' : '') + (mp.level==='winner26' ? ' winner26' : '');
    const roleTag = mp.level==='owner' ? '👑 OWNER' : (mp.level==='winner26' ? '🏆 WINNER26' : (mp.level==='forbidden' ? '⬛⬜ FORBIDDEN' : (mp.level==='superior' ? '🌈 SUPERIOR' : (mp.level==='future' ? '🔵 FUTURE' : (mp.legend ? '🌟 HUYỀN THOẠI' : mp.role)))));
    div.title = mp.note || '';
    div.innerHTML = `<div class="mc-top"><span class="ovr-badge ${ovrTier(mp.ovr)}">${mp.ovr}</span><b>${mp.name}</b><span class="role-tag">${roleTag}</span></div>
      ${mp.level==='owner' ? `<div style="font-size:10px; color:#f3e8ff; margin-bottom:8px; line-height:1.4;">${mp.note}</div>` : ''}
      <div class="mc-bottom"><span>${fmtMoney(mp.price)} 💰</span><button class="btn buy-btn" data-idx="${idx}">Mua</button></div>`;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('.buy-btn').forEach(b=>{
    b.onclick = ()=> buyPlayer(parseInt(b.dataset.idx,10));
  });
}
function setMarketMsg(text){ document.getElementById('marketMsg').textContent = text; }

// ---------------- INDEX / BỘ SƯU TẬP CẦU THỦ ----------------
function fullPlayerPool(){
  return [
    ...MARKET_POOL_SEED.map(p=>({ ...p, group:'regular' })),
    ...LEGEND_POOL.map(p=>({ ...p, group:'legend' })),
    ...FUTURE_POOL.map(p=>({ ...p, group:p.level })),
    ...SUPERIOR_POOL.map(p=>({ ...p, group:p.level })),
    ...FORBIDDEN_POOL.map(p=>({ ...p, group:p.level })), // 'future' | 'superior' | 'forbidden'
    ...OWNER_POOL.map(p=>({ ...p, group:p.level })),     // 'owner' — độ hiếm cao nhất
    ...(isWinner26Expired() ? [] : WINNER26_POOL.map(p=>({ ...p, group:p.level }))), // biến mất sau 15/08/2026
  ];
}
const INDEX_GROUP_META = {
  regular:   { title:'⚪ Cầu thủ thường',      cardClass:'' },
  legend:    { title:'🌟 Huyền thoại',          cardClass:'legend' },
  future:    { title:'🔵 Future (Xanh Dương+Trắng Gradient)', cardClass:'future' },
  superior:  { title:'🌈 Superior (Rainbow Lấp Lánh)', cardClass:'superior' },
  forbidden: { title:'⬛⬜ Forbidden (Trắng+Đen Gradient)', cardClass:'forbidden' },
  owner:     { title:'👑 Owner (Tím Gradient) — chỉ Admin Owner "Rainz" mới sở hữu', cardClass:'owner' },
  winner26:  { title:'🏆 Winner26 (Vàng-Đỏ) — ĐTQG Tây Ban Nha vô địch World Cup 2026 · Chỉ có tới 15/08/2026!', cardClass:'winner26' },
};
function indexRoleTag(group, role){
  if(group==='owner') return '👑 OWNER';
  if(group==='winner26') return '🏆 WINNER26';
  if(group==='forbidden') return '⬛⬜ FORBIDDEN';
  if(group==='superior') return '🌈 SUPERIOR';
  if(group==='future') return '🔵 FUTURE';
  if(group==='legend') return '🌟 HUYỀN THOẠI';
  return role;
}
function renderIndex(){
  const all = fullPlayerPool();
  const unlockedCount = all.filter(p=>unlockedPlayers.has(p.name)).length;
  document.getElementById('indexProgress').textContent = `🔓 Đã mở khoá ${unlockedCount} / ${all.length} cầu thủ`;
  const wrap = document.getElementById('indexList');
  wrap.innerHTML = '';
  ['winner26','owner','forbidden','superior','future','legend','regular'].forEach(key=>{
    const list = all.filter(p=>p.group===key);
    if(!list.length) return;
    const meta = INDEX_GROUP_META[key];
    const doneInGroup = list.filter(p=>unlockedPlayers.has(p.name)).length;
    const section = document.createElement('div');
    section.className = 'index-section';
    section.innerHTML = `<div class="index-section-title">${meta.title} <span class="index-section-count">${doneInGroup}/${list.length}</span></div>`;
    const grid = document.createElement('div');
    grid.className = 'market-list';
    list.forEach(p=>{
      const unlocked = unlockedPlayers.has(p.name);
      const div = document.createElement('div');
      div.className = 'market-card index-card' + (unlocked ? ' '+meta.cardClass : ' locked');
      const roleTag = indexRoleTag(key, p.role);
      if(unlocked){
        div.innerHTML = `<div class="mc-top"><span class="ovr-badge ${ovrTier(p.ovr)}">${p.ovr}</span><b>${p.name}</b><span class="role-tag">${roleTag}</span></div>
          <div class="mc-bottom"><span>${p.role}</span><span style="color:#5ad17a;">✅ Đã sở hữu</span></div>`;
      } else {
        div.innerHTML = `<div class="mc-top"><span class="ovr-badge" style="background:#2a2a2a;color:#777;">??</span><b>${p.name}</b><span class="role-tag">🔒</span></div>
          <div class="mc-bottom"><span>${p.role}</span><span style="color:#888;">🔒 Chưa mở khoá</span></div>`;
      }
      grid.appendChild(div);
    });
    section.appendChild(grid);
    wrap.appendChild(section);
  });
}
function addToBench(squad, playerDef){
  squad.bench.push(playerDef);
  if(squad.bench.length > BENCH_CAP){
    squad.bench.sort((a,b)=>a.ovr-b.ovr);
    squad.bench.shift();
  }
}
function acquirePlayer(mp){
  unlockedPlayers.add(mp.name);
  // Thêm 1 cầu thủ vào đội hình của người chơi: vào đá chính nếu mạnh hơn người yếu nhất
  // cùng vị trí, ngược lại xuống ghế dự bị. Trả về câu thông báo mô tả kết quả.
  const squad = ensureSquad(selfTeam);
  const sameRole = squad.starters.map((s,i)=>({s,i})).filter(o=>o.s.role===mp.role);
  const pool = sameRole.length ? sameRole : squad.starters.map((s,i)=>({s,i}));
  pool.sort((a,b)=>a.s.ovr-b.s.ovr);
  const weakest = pool[0];
  if(mp.ovr > weakest.s.ovr){
    const demoted = squad.starters[weakest.i];
    squad.starters[weakest.i] = { name: mp.name, role: mp.role, number: weakest.i+1, ovr: mp.ovr, price: mp.price, level: mp.level };
    addToBench(squad, { name: demoted.name, role: demoted.role, ovr: demoted.ovr, price: demoted.price, level: demoted.level });
    return `${mp.name} đã vào đội hình chính! ${demoted.name} xuống dự bị.`;
  }
  addToBench(squad, { name: mp.name, role: mp.role, ovr: mp.ovr, price: mp.price, level: mp.level });
  return `${mp.name} đã gia nhập đội hình dự bị.`;
}

function buyPlayer(idx){
  const mp = marketPool[idx];
  if(!mp) return;
  if(wallet < mp.price){ setMarketMsg('Không đủ tiền!'); return; }
  wallet -= mp.price;
  const msg = acquirePlayer(mp);
  setMarketMsg(msg);
  marketPool.splice(idx,1);
  renderWallet(); renderMarket(); renderSquadHub();
}

// ---------------- SCOUT PLAYER (mở gói) ----------------
function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function openPack(packId){
  const pack = SCOUT_PACKS.find(p=>p.id===packId);
  if(!pack) return null;

  // Gói Ultimate dùng bảng tỉ lệ riêng: Forbidden 1.5% · Superior 10% · Future 20% · Legend 60% · Thường 8.5%
  if(pack.id === 'ultimate'){
    const r = Math.random();
    const o = ULTIMATE_ODDS;
    let mp, isLegend = false, isSpecialGK = false;
    if(r < o.owner){
      mp = { ...pickRandom(OWNER_POOL) }; isLegend = true; isSpecialGK = true;
    } else if(r < o.owner + o.forbidden){
      mp = { ...pickRandom(FORBIDDEN_POOL) }; isLegend = true; isSpecialGK = true;
    } else if(r < o.owner + o.forbidden + o.superior){
      mp = { ...pickRandom(SUPERIOR_POOL) }; isLegend = true; isSpecialGK = true;
    } else if(r < o.owner + o.forbidden + o.superior + o.future){
      mp = { ...pickRandom(FUTURE_POOL) }; isLegend = true; isSpecialGK = true;
    } else if(r < o.owner + o.forbidden + o.superior + o.future + o.legend){
      mp = { ...pickRandom(LEGEND_POOL) }; isLegend = true;
    } else {
      mp = { ...pickRandom(MARKET_POOL_SEED) };
    }
    return { pack, mp, isLegend, isSpecialGK };
  }

  // Gói Owner (chỉ có lúc 16:00 mỗi ngày): Owner 0.92% · Forbidden 10% · Superior 10% · Legend phần còn lại (tổng 50% legend trở lên)
  if(pack.id === 'ownerpack'){
    const r = Math.random();
    const o = OWNER_PACK_ODDS;
    let mp, isLegend = false, isSpecialGK = false;
    if(r < o.owner){
      mp = { ...pickRandom(OWNER_POOL) }; isLegend = true; isSpecialGK = true;
    } else if(r < o.owner + o.forbidden){
      mp = { ...pickRandom(FORBIDDEN_POOL) }; isLegend = true; isSpecialGK = true;
    } else if(r < o.owner + o.forbidden + o.superior){
      mp = { ...pickRandom(SUPERIOR_POOL) }; isLegend = true; isSpecialGK = true;
    } else if(r < o.owner + o.forbidden + o.superior + o.legend){
      mp = { ...pickRandom(LEGEND_POOL) }; isLegend = true;
    } else {
      mp = { ...pickRandom(MARKET_POOL_SEED) };
    }
    return { pack, mp, isLegend, isSpecialGK };
  }

  const isLegend = Math.random() < pack.legendChance;
  let mp, isSpecialGK = false;
  if(isLegend){
    if(Math.random() < SPECIAL_SPAWN_CHANCE){
      mp = pickSpecialPlayer();
      isSpecialGK = true;
    } else {
      mp = { ...pickRandom(LEGEND_POOL) };
    }
  } else {
    mp = { ...pickRandom(MARKET_POOL_SEED) };
  }
  return { pack, mp, isLegend, isSpecialGK };
}

// ---- Hiển thị số thẻ độ hiếm Owner đang tồn tại trong game (chỉ có đúng 1 lá "Rainz") ----
function scoutOwnerInfoHtml(){
  const total = OWNER_POOL.length;
  const owned = OWNER_POOL.filter(p=>unlockedPlayers.has(p.name)).length;
  return `<div class="market-card owner" style="margin-bottom:6px;">
    <div class="mc-top"><span style="font-size:20px;">👑</span><b>Độ hiếm Owner</b><span class="role-tag">${owned}/${total} thẻ đã sở hữu</span></div>
    <div style="font-size:11px; line-height:1.5;">Chỉ có <b>${total}</b> thẻ Owner duy nhất tồn tại trong toàn bộ game — cầu thủ <b>Rainz</b> (OVR 199).
    Bình thường chỉ Admin Owner tên <b>Rainz</b> mới sở hữu được. Người chơi thường gần như không thể có, trừ khi cực may mắn: 👑 gói Ultimate <b>0,000001%</b> · hoặc rơi ở thị trường chuyển nhượng <b>0,00000000000001%</b> (giá chỉ 1.000 💰).</div>
  </div>`;
}
function renderScout(){
  renderWallet();
  document.getElementById('scoutMatchInfoBox').innerHTML = scoutMatchInfoHtml();
  document.getElementById('scoutOwnerInfoBox').innerHTML = scoutOwnerInfoHtml();
  const wrap = document.getElementById('scoutList');
  wrap.innerHTML = '';
  SCOUT_PACKS.forEach(pack=>{
    if(pack.id === 'ownerpack'){
      const div = document.createElement('div');
      const available = isOwnerPackAvailable();
      div.className = 'market-card owner' + (available ? '' : ' locked');
      if(available){
        const owned = packInventory[pack.id] || 0;
        div.innerHTML = `<div class="mc-top"><span style="font-size:20px;">${pack.icon}</span><b>${pack.name}</b><span class="role-tag">🟢 ĐANG MỞ BÁN</span></div>
          <div style="font-size:12px; color:#f3e8ff; margin-bottom:8px;">${pack.desc}</div>
          <div style="font-size:12px; color:#f3e8ff; margin-bottom:8px;">⏳ Đóng bán sau <b>${fmtCountdown(msUntilOwnerPackClose())}</b></div>
          ${packOddsHtml(pack)}
          <div style="font-size:12px; margin-bottom:10px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span>Số dư thẻ: <b style="color:#f3e8ff;">${owned}</b></span>
            ${owned>0 ? `<button class="btn buy-btn" data-act="open" data-id="${pack.id}">🎁 Mở gói</button>` : ''}
          </div>
          <div class="mc-bottom" style="flex-wrap:wrap; gap:8px; justify-content:flex-end; color:#f3e8ff;">
            <span>${fmtMoney(pack.price)} 💰 <button class="btn buy-btn" data-act="buy" data-id="${pack.id}">Mua ngay gói này</button></span>
          </div>`;
      } else {
        div.style.opacity = '.55'; div.style.filter = 'grayscale(.6)';
        div.innerHTML = `<div class="mc-top"><span style="font-size:20px;">${pack.icon}</span><b>${pack.name}</b><span class="role-tag">🔒 ĐÓNG</span></div>
          <div style="font-size:12px; color:#f3e8ff;">${pack.desc}</div>
          <div style="font-size:12px; color:#f3e8ff; margin-top:8px;">⏰ Mở lại sau <b>${fmtCountdown(msUntilNextOwnerPackHour())}</b> (lúc ${OWNER_PACK_HOUR}:00–${OWNER_PACK_HOUR}:${OWNER_PACK_DURATION_MIN.toString().padStart(2,'0')} mỗi ngày)</div>`;
      }
      wrap.appendChild(div);
      return;
    }
    const owned = packInventory[pack.id] || 0;
    const div = document.createElement('div');
    div.className = 'market-card' + (pack.id==='legendary' || pack.id==='mythic' ? ' legend' : '') + (pack.id==='ultimate' ? ' ultimate' : '');
    const badgeText = pack.id==='ultimate'
      ? `Legend ${fmtPct(ULTIMATE_ODDS.legend*100)} · Forbidden ${fmtPct(ULTIMATE_ODDS.forbidden*100)} · 👑 Owner ${fmtPct(ULTIMATE_ODDS.owner*100)}`
      : `${(pack.legendChance*100).toFixed(pack.legendChance<0.01?3:0)}% LEGEND`;
    div.innerHTML = `<div class="mc-top"><span style="font-size:20px;">${pack.icon}</span><b>${pack.name}</b><span class="role-tag">${badgeText}</span></div>
      <div style="font-size:12px; color:var(--muted); margin-bottom:8px;">${pack.desc}</div>
      ${packOddsHtml(pack)}
      <div style="font-size:12px; margin-bottom:10px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span>Số dư thẻ: <b style="color:var(--amber);">${owned}</b></span>
        ${owned>0 ? `<button class="btn buy-btn" data-act="open" data-id="${pack.id}">🎁 Mở gói</button>` : ''}
      </div>
      <div class="mc-bottom" style="flex-wrap:wrap; gap:8px; justify-content:flex-end;">
        <span>${fmtMoney(pack.price)} 💰 <button class="btn buy-btn" data-act="buy" data-id="${pack.id}">Mua ngay gói này</button></span>
      </div>`;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('.buy-btn[data-act="buy"]').forEach(b=>{
    b.onclick = ()=> buyPackDirect(b.dataset.id);
  });
  wrap.querySelectorAll('.buy-btn[data-act="open"]').forEach(b=>{
    b.onclick = ()=> openPackAnimated(b.dataset.id);
  });
}

// ---- Tỉ lệ gói nhận được khi đá 1 trận Scout, theo số sao (độ khó) đối thủ ----
function scoutPackWeights(stars){
  if(stars <= 3) return { normal:70, rare:25,   mythic:4.5,  legendary:0.5 };
  if(stars === 4) return { normal:42, rare:34,  mythic:17,   legendary:7   };
  return                  { normal:18, rare:28,  mythic:32,   legendary:20, ultimate:2 }; // 5★ trở lên — có 2% rơi gói Ultimate
}

function pickWeightedPack(weights){
  const entries = Object.entries(weights);
  const total = entries.reduce((s,[,w])=>s+w, 0);
  let r = Math.random()*total;
  for(const [id,w] of entries){ if(r < w) return id; r -= w; }
  return entries[entries.length-1][0];
}

function scoutMatchInfoHtml(){
  const rows = [3,4,5].map(s=>{
    const w = scoutPackWeights(s);
    const total = w.normal+w.rare+w.mythic+w.legendary+(w.ultimate||0);
    const pct = k => fmtPct((w[k]||0)/total*100);
    const ultimatePart = w.ultimate ? ` · 💎 ${pct('ultimate')}` : '';
    return `<p><b>${starsHtml(s)}</b> đối thủ &nbsp; ⚪ ${pct('normal')} · 🔵 ${pct('rare')} · 🟣 ${pct('mythic')} · 🟡 ${pct('legendary')}${ultimatePart}</p>`;
  }).join('');
  return `<h4>🎲 Tỉ lệ gói nhận được khi đá trận</h4>${rows}<p style="color:var(--muted);font-size:11px;margin-top:6px;">Đối thủ càng nhiều sao (★) → tỉ lệ ra gói Mythic / Legendary / 💎 Ultimate càng cao. Thắng hay thua trận không ảnh hưởng tỉ lệ.</p>`;
}

function setScoutMsg(text){ document.getElementById('scoutMsg').textContent = text; }

function addPackToInventory(packId, n){
  packInventory[packId] = (packInventory[packId]||0) + n;
}

// ---- Tính tỉ lệ rarity thực tế của mỗi gói (dựa trên phân bố OVR trong pool thường) ----
function computeMarketTierBreakdown(){
  const counts = { gold:0, silver:0, bronze:0 };
  MARKET_POOL_SEED.forEach(p=>{ counts[ovrTier(p.ovr)]++; });
  const total = MARKET_POOL_SEED.length || 1;
  return { gold: counts.gold/total, silver: counts.silver/total, bronze: counts.bronze/total };
}
const MARKET_TIER_BREAKDOWN = computeMarketTierBreakdown();

function fmtPct(p){
  if(p<=0) return '0%';
  if(p<0.01) return p.toFixed(4)+'%';
  if(p<1) return p.toFixed(2)+'%';
  return p.toFixed(1)+'%';
}

function packOddsHtml(pack){
  if(pack.id === 'ownerpack'){
    const o = OWNER_PACK_ODDS;
    const normalPct = (1 - o.owner - o.forbidden - o.superior - o.legend) * 100;
    const legendPct = o.legend*100, superiorPct = o.superior*100, forbiddenPct = o.forbidden*100, ownerPct = o.owner*100;
    return `
      <div class="odds-bar">
        <div class="odds-seg odds-legend" style="width:${legendPct}%;" title="Huyền thoại ${fmtPct(legendPct)}"></div>
        <div class="odds-seg odds-superior" style="width:${superiorPct}%;" title="Superior ${fmtPct(superiorPct)}"></div>
        <div class="odds-seg odds-forbidden" style="width:${forbiddenPct}%;" title="Forbidden ${fmtPct(forbiddenPct)}"></div>
        <div class="odds-seg odds-owner" style="width:${ownerPct}%;" title="Owner ${fmtPct(ownerPct)}"></div>
        <div class="odds-seg odds-bronze" style="width:${normalPct}%;" title="Thường ${fmtPct(normalPct)}"></div>
      </div>
      <div class="odds-list">
        <span>🌟 Huyền thoại trở lên: <b>50%</b></span>
        <span>🌟 Huyền thoại: <b>${fmtPct(legendPct)}</b></span>
        <span>🌈 Superior: <b>${fmtPct(superiorPct)}</b></span>
        <span>⬛⬜ Forbidden: <b>${fmtPct(forbiddenPct)}</b></span>
        <span>👑 Owner: <b>${fmtPct(ownerPct)}</b></span>
        <span>⚪ Thường: <b>${fmtPct(normalPct)}</b></span>
      </div>`;
  }
  if(pack.id === 'ultimate'){
    const o = ULTIMATE_ODDS;
    const normalPct = (1 - o.owner - o.forbidden - o.superior - o.future - o.legend) * 100;
    const legendPct = o.legend*100, futurePct = o.future*100, superiorPct = o.superior*100, forbiddenPct = o.forbidden*100, ownerPct = o.owner*100;
    return `
      <div class="odds-bar">
        <div class="odds-seg odds-legend" style="width:${legendPct}%;" title="Huyền thoại ${fmtPct(legendPct)}"></div>
        <div class="odds-seg odds-future" style="width:${futurePct}%;" title="Future ${fmtPct(futurePct)}"></div>
        <div class="odds-seg odds-superior" style="width:${superiorPct}%;" title="Superior ${fmtPct(superiorPct)}"></div>
        <div class="odds-seg odds-forbidden" style="width:${forbiddenPct}%;" title="Forbidden ${fmtPct(forbiddenPct)}"></div>
        <div class="odds-seg odds-owner" style="width:${ownerPct}%;" title="Owner ${fmtPct(ownerPct)}"></div>
        <div class="odds-seg odds-bronze" style="width:${normalPct}%;" title="Thường ${fmtPct(normalPct)}"></div>
      </div>
      <div class="odds-list">
        <span>🌟 Huyền thoại: <b>${fmtPct(legendPct)}</b></span>
        <span>🔵 Future: <b>${fmtPct(futurePct)}</b></span>
        <span>🌈 Superior: <b>${fmtPct(superiorPct)}</b></span>
        <span>⬛⬜ Forbidden: <b>${fmtPct(forbiddenPct)}</b></span>
        <span>👑 Owner: <b>${fmtPct(ownerPct)}</b></span>
        <span>⚪ Thường: <b>${fmtPct(normalPct)}</b></span>
      </div>`;
  }
  const legendPct = pack.legendChance*100;
  const nonLegend = 1 - pack.legendChance;
  const goldPct = nonLegend*MARKET_TIER_BREAKDOWN.gold*100;
  const silverPct = nonLegend*MARKET_TIER_BREAKDOWN.silver*100;
  const bronzePct = nonLegend*MARKET_TIER_BREAKDOWN.bronze*100;
  const futurePct = legendPct * SPECIAL_SPAWN_CHANCE * SPECIAL_TIER_TABLE[0].weight;
  const superiorPct = legendPct * SPECIAL_SPAWN_CHANCE * SPECIAL_TIER_TABLE[1].weight;
  const forbiddenPct = legendPct * SPECIAL_SPAWN_CHANCE * SPECIAL_TIER_TABLE[2].weight;
  return `
    <div class="odds-bar">
      <div class="odds-seg odds-legend" style="width:${legendPct}%;" title="Huyền thoại ${fmtPct(legendPct)}"></div>
      <div class="odds-seg odds-gold" style="width:${goldPct}%;" title="Vàng ${fmtPct(goldPct)}"></div>
      <div class="odds-seg odds-silver" style="width:${silverPct}%;" title="Bạc ${fmtPct(silverPct)}"></div>
      <div class="odds-seg odds-bronze" style="width:${bronzePct}%;" title="Đồng ${fmtPct(bronzePct)}"></div>
    </div>
    <div class="odds-list">
      <span>🌟 Huyền thoại: <b>${fmtPct(legendPct)}</b></span>
      <span>🥇 Vàng: <b>${fmtPct(goldPct)}</b></span>
      <span>🥈 Bạc: <b>${fmtPct(silverPct)}</b></span>
      <span>🥉 Đồng: <b>${fmtPct(bronzePct)}</b></span>
      <span>🔵 Future: <b>${fmtPct(futurePct)}</b></span>
      <span>🌈 Superior: <b>${fmtPct(superiorPct)}</b></span>
      <span>⬛⬜ Forbidden: <b>${fmtPct(forbiddenPct)}</b></span>
    </div>`;
}

function buyPackDirect(packId){
  const pack = SCOUT_PACKS.find(p=>p.id===packId);
  if(!pack) return;
  if(packId==='ownerpack' && !isOwnerPackAvailable()){
    setScoutMsg(`Gói Owner chỉ mở bán từ ${OWNER_PACK_HOUR}:00 đến ${OWNER_PACK_HOUR}:${OWNER_PACK_DURATION_MIN.toString().padStart(2,'0')} mỗi ngày!`);
    return;
  }
  if(wallet < pack.price){ setScoutMsg('Không đủ tiền!'); return; }
  wallet -= pack.price;
  addPackToInventory(packId, 1);
  renderWallet(); renderScout();
  setScoutMsg(`Đã mua 1 ${pack.name}! Đang mở gói...`);
  openPackAnimated(packId);
}

function startScoutMatch(){
  scoutPending = true;
  matchContext = 'scout';
  goToPickOpp();
}

// ---------------- PACK OPENING ANIMATION ----------------
function spawnConfetti(container){
  for(let i=0;i<26;i++){
    const el = document.createElement('span');
    el.className = 'confetti-piece';
    el.textContent = ['⭐','✨','🌟'][Math.floor(Math.random()*3)];
    el.style.left = (Math.random()*100) + '%';
    el.style.animationDelay = (Math.random()*0.5) + 's';
    el.style.fontSize = (14 + Math.random()*14) + 'px';
    container.appendChild(el);
    setTimeout(()=> el.remove(), 2200);
  }
}

function openPackAnimated(packId){
  if((packInventory[packId]||0) <= 0) return;
  const pack = SCOUT_PACKS.find(p=>p.id===packId);
  const res = openPack(packId); // { pack, mp, isLegend }
  packInventory[packId]--;

  const overlay = document.getElementById('packOpenOverlay');
  const cardEl = document.getElementById('packCardEl');
  const backEl = document.getElementById('packBackEl');
  const iconEl = document.getElementById('packIconEl');
  const nameLabelEl = document.getElementById('packNameLabelEl');
  const closeBtn = document.getElementById('packOverlayCloseBtn');

  cardEl.classList.remove('flipped');
  backEl.classList.remove('legend-glow','future-glow','superior-glow','forbidden-glow','owner-glow','winner26-glow');
  backEl.innerHTML = '';
  iconEl.textContent = pack.icon;
  nameLabelEl.textContent = pack.name;
  closeBtn.style.display = 'none';
  overlay.classList.add('show');

  let opened = false;
  function doOpen(){
    if(opened) return;
    opened = true;
    const msg = acquirePlayer(res.mp);
    const tier = ovrTier(res.mp.ovr);
    const lvl = res.mp.level;
    if(res.isLegend) backEl.classList.add('legend-glow');
    if(lvl==='future') backEl.classList.add('future-glow');
    if(lvl==='superior') backEl.classList.add('superior-glow');
    if(lvl==='forbidden') backEl.classList.add('forbidden-glow');
    if(lvl==='owner') backEl.classList.add('owner-glow');
    if(lvl==='winner26') backEl.classList.add('winner26-glow');
    const specialBadge = lvl==='owner' ? '<div class="reveal-legend-badge owner-text">👑 OWNER</div>'
      : lvl==='winner26' ? '<div class="reveal-legend-badge winner26-text">🏆 WINNER26</div>'
      : lvl==='forbidden' ? '<div class="reveal-legend-badge forbidden-text">⬛⬜ FORBIDDEN</div>'
      : lvl==='superior' ? '<div class="reveal-legend-badge superior-text">🌈 SUPERIOR</div>'
      : lvl==='future' ? '<div class="reveal-legend-badge future-text">🔵 FUTURE</div>'
      : (res.isLegend ? '<div class="reveal-legend-badge">🌟 HUYỀN THOẠI</div>' : '');
    backEl.innerHTML = `
      <div class="ovr-badge ${tier}" style="font-size:16px; padding:6px 14px;">${res.mp.ovr}</div>
      <div class="reveal-name">${res.mp.name}</div>
      <div class="reveal-role">${res.mp.role}</div>
      ${specialBadge}
      ${lvl==='owner' ? `<div class="reveal-note" style="color:#f3e8ff;">${res.mp.note}</div>` : ''}
      <div class="reveal-note">${msg}</div>`;
    cardEl.classList.add('flipped');
    if(res.isLegend){
      setTimeout(()=> spawnConfetti(document.querySelector('.pack-stage')), 380);
    }
    if(lvl==='winner26') checkWinner26Complete();
    if((lvl==='forbidden' || lvl==='owner' || lvl==='winner26') && fbReady && db){
      const label = lvl==='owner' ? '👑 OWNER' : lvl==='winner26' ? '🏆 WINNER26' : '⬛⬜ FORBIDDEN';
      db.ref('serverAnnouncements').push({
        text: `🎉 ${myDisplayName||'Một người chơi'} vừa mở được ${label} — ${res.mp.name} từ ${pack.name}!`,
        at: firebase.database.ServerValue.TIMESTAMP,
      }).catch(()=>{});
    }
    setTimeout(()=>{ closeBtn.style.display = ''; }, 750);
    renderScout(); renderSquadHub(); renderWallet();
  }
  cardEl.onclick = doOpen;
}

document.getElementById('packOverlayCloseBtn').onclick = ()=>{
  document.getElementById('packOpenOverlay').classList.remove('show');
  document.querySelectorAll('.confetti-piece').forEach(el=> el.remove());
};
function doSubstitute(){
  if(!running || !controlled || controlled.sentOff) return;
  const squad = ensureSquad(selfTeam);
  if(!squad.bench.length){ flashBannerGeneric('Không còn cầu thủ dự bị!', '#8fb8a0'); return; }
  let candidates = squad.bench.filter(b=>b.role===controlled.role);
  if(!candidates.length) candidates = squad.bench;
  candidates = candidates.slice().sort((a,b)=>b.ovr-a.ovr);
  const incoming = candidates[0];
  const benchIdx = squad.bench.indexOf(incoming);
  const outgoing = { name: controlled.name, role: controlled.role, ovr: controlled.ovr, level: controlled.level };
  controlled.name = incoming.name;
  controlled.ovr = incoming.ovr;
  controlled.level = incoming.level;
  controlled.stamina = 100;
  squad.bench[benchIdx] = outgoing;
  flashBannerGeneric(`🔄 Vào sân: ${incoming.name}`, '#3c7ce3');
}

function starsHtml(n){
  let s = '';
  for(let i=0;i<5;i++) s += `<span class="star ${i<n?'on':'off'}">${i<n?'⭐':'☆'}</span>`;
  return s;
}

function diffLabel(n){
  const labels = {3:'Dễ', 4:'Trung bình', 5:'Khó nhằn'};
  return labels[n] || '';
}

function buildTeamGrid(container, onPick, excludeId){
  container.innerHTML = '';
  TEAMS.forEach(t=>{
    const card = document.createElement('div');
    card.className = 'team-card' + (t.id===excludeId ? ' disabled':'');
    card.style.setProperty('--c1', t.c1);
    card.style.setProperty('--c2', t.c2);
    card.innerHTML = `
      <div class="card-glow"></div>
      <div class="card-top">
        <div class="flag">${t.flag}</div>
        <div class="swatch" style="background:${t.c1}; box-shadow: inset 0 0 0 6px ${t.c2};"></div>
      </div>
      <div class="tname">${t.name}</div>
      <div class="stars">${starsHtml(t.stars)}</div>
      <div class="diff-label">${diffLabel(t.stars)}</div>
    `;
    if(t.id !== excludeId){ card.onclick = ()=> onPick(t); }
    container.appendChild(card);
  });
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

buildTeamGrid(document.getElementById('teamGridSelf'), (t)=>{
  // Chống mất tiến trình: nếu đã có save, không được tạo đội hình mới đè lên một cách âm thầm
  const existing = loadSaveData();
  if(existing){
    if(existing.selfTeamId === t.id){
      // Đúng đội đã lưu -> tự động tải lại tiến trình thay vì tạo mới (tránh mất ví/bộ sưu tập)
      if(applySaveData(existing)){
        renderSquadHub();
        showScreen('squadHubScreen');
        return;
      }
    } else {
      const oldTeam = TEAMS.find(x=>x.id===existing.selfTeamId);
      const oldName = oldTeam ? `${oldTeam.flag} ${oldTeam.name}` : 'đội trước đó';
      const ok = confirm(`Bạn đang có 1 ván lưu với ${oldName} (${fmtMoney(existing.wallet||0)} 💰).\nChọn đội khác sẽ XOÁ VĨNH VIỄN ván lưu này (ví tiền + bộ sưu tập).\nBạn có chắc muốn bắt đầu lại từ đầu không?`);
      if(!ok) return;
      clearSaveData();
    }
  }
  selfTeam = t;
  squadStore = {};
  unlockedPlayers = new Set();
  wallet = 400;
  packInventory = { normal:0, rare:0, mythic:0, legendary:0, ultimate:0, ownerpack:0 };
  worldCup = null;
  wins = 0;
  ensureSquad(selfTeam);
  renderSquadHub();
  saveGame();
  showScreen('squadHubScreen');
});

// ---- Tự động vào thẳng đội hình đã lưu của phiên hiện tại (đăng nhập/tài khoản nào -> dữ liệu đó) ----
// Không còn nút "Tiếp tục ván đã lưu" thủ công: đăng nhập/đăng ký đã xác định danh tính người chơi,
// nên nếu phiên này đã có dữ liệu thì tự động tải và vào thẳng màn hình đội hình.
function tryAutoResume(){
  const data = loadSaveData();
  const team = data ? TEAMS.find(t=>t.id===data.selfTeamId) : null;
  if(data && team && applySaveData(data)){
    renderSquadHub();
    showScreen('squadHubScreen');
    return true;
  }
  showScreen('pickTeamScreen');
  return false;
}

function goToPickOpp(){
  let sub = `Đối thủ càng nhiều sao (★) máy càng chơi khó hơn`;
  if(matchContext==='scout' && scoutPending){
    sub = `🔭 Đá trận này để RANDOM GÓI, ĐỐI THỦ CÀNG KHÓ TỈ LỆ MỞ RA GÓI LEGENDARY NHIỀU HƠN · ` + sub;
  }
  document.getElementById('oppSubtitle').textContent = sub;
  buildTeamGrid(document.getElementById('teamGridOpp'), (o)=>{
    oppTeam = o;
    ensureSquad(oppTeam);
    fillConfirm();
    showScreen('confirmScreen');
  }, selfTeam.id);
  showScreen('pickOppScreen');
}

document.getElementById('toMarketBtn').onclick = ()=>{ renderMarket(); showScreen('marketScreen'); };
document.getElementById('toOppBtn').onclick = ()=>{ matchContext='normal'; scoutPending=null; goToPickOpp(); };
document.getElementById('backBtnHub').onclick = ()=> showScreen('pickTeamScreen');
document.getElementById('toSquadBtn').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
document.getElementById('backBtnMarket').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
document.getElementById('toServerShopBtn').onclick = ()=>{ renderServerShop(); showScreen('serverShopScreen'); };
document.getElementById('backBtnServerShop').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
document.getElementById('toMarketFromEndBtn').onclick = ()=>{ renderMarket(); showScreen('marketScreen'); };
document.getElementById('backBtn').onclick = ()=>{ if(matchContext==='scout'){ scoutPending=null; matchContext='normal'; } showScreen('squadHubScreen'); };
document.getElementById('backBtn2').onclick = ()=> showScreen('pickOppScreen');

document.getElementById('toScoutBtn').onclick = ()=>{ setScoutMsg(''); renderScout(); showScreen('scoutScreen'); };
document.getElementById('scoutPlayMatchBtn').onclick = ()=> startScoutMatch();
document.getElementById('backBtnScout').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
document.getElementById('toIndexBtn').onclick = ()=>{ renderIndex(); showScreen('indexScreen'); };
document.getElementById('backBtnIndex').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };

document.getElementById('toWorldCupBtn').onclick = ()=>{ openWorldCupHub(); };
document.getElementById('wcExitBtn').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
document.getElementById('wcPlayBtn').onclick = ()=> playWorldCupRound();
document.getElementById('continueWorldCupBtn').onclick = ()=>{ renderWorldCup(); showScreen('worldCupScreen'); };

// ================= AUTH SCREEN (Đăng nhập / Đăng ký / Google / Offline) =================
let authMode = 'login'; // 'login' | 'register'
function setAuthMode(mode){
  authMode = mode;
  document.getElementById('authTabLogin').classList.toggle('active', mode==='login');
  document.getElementById('authTabRegister').classList.toggle('active', mode==='register');
  document.getElementById('authRegisterNameWrap').style.display = mode==='register' ? '' : 'none';
  document.getElementById('authSubmitBtn').textContent = mode==='register' ? 'Đăng ký' : 'Đăng nhập';
  document.getElementById('authMsg').textContent = '';
}
document.getElementById('authTabLogin').onclick = ()=> setAuthMode('login');
document.getElementById('authTabRegister').onclick = ()=> setAuthMode('register');
function setAuthMsg(text){ document.getElementById('authMsg').textContent = text; }

function fbErrorToVi(e){
  const c = (e && e.code) || '';
  if(c.includes('email-already-in-use')) return 'Email này đã được đăng ký rồi.';
  if(c.includes('invalid-email')) return 'Email không hợp lệ.';
  if(c.includes('weak-password')) return 'Mật khẩu quá yếu (cần từ 6 ký tự).';
  if(c.includes('user-not-found') || c.includes('wrong-password') || c.includes('invalid-credential')) return 'Sai email hoặc mật khẩu.';
  if(c.includes('popup-closed-by-user')) return 'Bạn đã đóng cửa sổ đăng nhập Google.';
  if(c.includes('network-request-failed')) return 'Lỗi mạng, thử lại nhé.';
  return 'Có lỗi xảy ra: ' + (e && e.message ? e.message : String(e));
}

async function registerUsername(uid, name){
  try{
    await db.ref('usernames/'+name.toLowerCase()).set(uid);
    await db.ref('users/'+uid+'/profile').set({ displayName:name, createdAt: Date.now() });
  }catch(e){}
}

document.getElementById('authSubmitBtn').onclick = async ()=>{
  if(!fbReady){ setAuthMsg('Firebase chưa sẵn sàng, hãy dùng "Chơi offline".'); return; }
  const email = document.getElementById('authEmail').value.trim();
  const pw = document.getElementById('authPassword').value;
  if(!email || !pw){ setAuthMsg('Nhập đầy đủ email và mật khẩu.'); return; }
  setAuthMsg('Đang xử lý...');
  try{
    if(authMode === 'register'){
      const name = document.getElementById('authDisplayName').value.trim() || email.split('@')[0];
      const cred = await auth.createUserWithEmailAndPassword(email, pw);
      await cred.user.updateProfile({ displayName: name });
      await registerUsername(cred.user.uid, name);
      myDisplayName = name;
    } else {
      await auth.signInWithEmailAndPassword(email, pw);
    }
    setAuthMsg('');
  }catch(e){ setAuthMsg(fbErrorToVi(e)); }
};

document.getElementById('authGoogleBtn').onclick = async ()=>{
  if(!fbReady){ setAuthMsg('Firebase chưa sẵn sàng, hãy dùng "Chơi offline".'); return; }
  setAuthMsg('Đang mở cửa sổ đăng nhập Google...');
  try{
    const provider = new firebase.auth.GoogleAuthProvider();
    const cred = await auth.signInWithPopup(provider);
    const isNew = cred.additionalUserInfo && cred.additionalUserInfo.isNewUser;
    if(isNew){
      const name = cred.user.displayName || (cred.user.email ? cred.user.email.split('@')[0] : 'Người chơi');
      await registerUsername(cred.user.uid, name);
      myDisplayName = name;
    }
    setAuthMsg('');
  }catch(e){ setAuthMsg(fbErrorToVi(e)); }
};

document.getElementById('authSkipBtn').onclick = ()=>{
  currentUser = null;
  document.getElementById('syncStatusNote').textContent = 'Chế độ offline — tiến trình chỉ lưu trên máy này, không có bạn bè/BXH.';
  tryAutoResume();
};

document.getElementById('logoutBtn').onclick = ()=>{
  if(fbReady && auth.currentUser){ auth.signOut(); }
  else { showScreen('authScreen'); }
};

if(fbReady){
  auth.onAuthStateChanged(async (user)=>{
    currentUser = user;
    if(user){
      document.getElementById('logoutBtn').style.display = '';
      try{
        const snap = await db.ref('users/'+user.uid+'/save').once('value');
        cloudSaveData = snap.val();
      }catch(e){ cloudSaveData = null; }
      if(!cloudSaveData){
        // Chưa có save trên cloud cho TÀI KHOẢN NÀY — chỉ lấy cache local đã lưu riêng cho chính
        // uid này trước đó (ví dụ lần trước offline mất mạng), tuyệt đối không lấy dữ liệu của
        // tài khoản/phiên khác trên cùng máy, để mỗi phiên đăng nhập luôn là 1 dữ liệu riêng biệt.
        try{
          const raw = localStorage.getItem('sanCoVang_save_uid_'+user.uid);
          if(raw) cloudSaveData = JSON.parse(raw);
        }catch(e){}
      }
      try{
        const pSnap = await db.ref('users/'+user.uid+'/profile').once('value');
        const profile = pSnap.val();
        myDisplayName = (profile && profile.displayName) || user.displayName || (user.email ? user.email.split('@')[0] : 'Người chơi');
        if(!profile){ await registerUsername(user.uid, myDisplayName); }
        myOwnedColors = (profile && profile.ownedColors) || {};
        myNameColor = (profile && profile.nameColor) || null;
      }catch(e){ myDisplayName = user.displayName || 'Người chơi'; }
      document.getElementById('syncStatusNote').textContent = `☁️ Đã đăng nhập: ${myDisplayName} — tiến trình tự động đồng bộ online, có thể chơi trên máy khác`;
      listenFriendRequests();
      listenPendingGifts();
      listenPendingPayouts();
      listenMyGuild();
      updateAdminUI();
      if(document.getElementById('authScreen').classList.contains('active')){
        try{ tryAutoResume(); checkWinner26Complete(); }
        catch(e){ console.error('tryAutoResume lỗi, chuyển về màn chọn đội:', e); showScreen('pickTeamScreen'); }
      }
    } else {
      document.getElementById('logoutBtn').style.display = 'none';
      cloudSaveData = null; myDisplayName = null;
      updateAdminUI();
      if(!document.getElementById('authScreen').classList.contains('active')){
        showScreen('authScreen');
      }
    }
  });
}

// ================= ADMIN PANEL (chỉ dành cho Rainz / rainz@gmail.com) =================
// Quyền admin yêu cầu ĐỦ 2 điều kiện: email đăng nhập đúng "rainz@gmail.com" VÀ tên hiển thị là "Rainz".
// Đây là admin panel spawn cầu thủ độ hiếm bất kỳ thẳng vào Chợ chuyển nhượng cho TOÀN SERVER
// (lưu qua Firebase Realtime Database, mọi người chơi đang online đều thấy & có thể mua).
const ADMIN_EMAIL = 'rainz@gmail.com';
const ADMIN_NAME = 'rainz';
function isAdminUser(){
  return !!(currentUser && currentUser.email &&
    currentUser.email.toLowerCase() === ADMIN_EMAIL &&
    (myDisplayName || '').toLowerCase() === ADMIN_NAME);
}
function updateAdminUI(){
  const btn = document.getElementById('toAdminBtn');
  if(btn) btn.style.display = isAdminUser() ? '' : 'none';
}
const ADMIN_RARITY_POOLS = {
  normal: MARKET_POOL_SEED, legend: LEGEND_POOL, future: FUTURE_POOL,
  superior: SUPERIOR_POOL, forbidden: FORBIDDEN_POOL, owner: OWNER_POOL,
  winner26: WINNER26_POOL,
};
function setAdminMsg(t){ const el = document.getElementById('adminMsg'); if(el) el.textContent = t; }
function populateAdminCardSelect(){
  const raritySel = document.getElementById('adminRaritySelect');
  const cardSel = document.getElementById('adminCardSelect');
  if(!raritySel || !cardSel) return;
  const pool = ADMIN_RARITY_POOLS[raritySel.value] || [];
  cardSel.innerHTML = pool.map((p,i)=> `<option value="${i}">${p.name} (OVR ${p.ovr})</option>`).join('');
}
const ADMIN_RARITY_LABELS = {
  normal:'⚪ Thường', legend:'🌟 Huyền thoại', future:'🔵 Future',
  superior:'🌈 Superior', forbidden:'⬛⬜ Forbidden', owner:'👑 Owner',
};
function spawnToServerShop(rarityKey, cardIdx, customPrice, qty){
  if(!isAdminUser()){ setAdminMsg('Bạn không có quyền Admin!'); return; }
  const pool = ADMIN_RARITY_POOLS[rarityKey];
  if(!pool || !pool.length){ setAdminMsg('Độ hiếm không hợp lệ.'); return; }
  const base = pool[cardIdx] || pool[0];
  if(!base){ setAdminMsg('Không tìm thấy thẻ đã chọn.'); return; }
  if(!fbReady || !db){ setAdminMsg('Chưa kết nối server (Firebase) — không thể spawn toàn server lúc này.'); return; }
  const n = Math.min(999, Math.max(1, qty || 1));
  const price = (customPrice && customPrice > 0) ? customPrice : base.price;
  // Chỉ tạo 1 dòng duy nhất trong Server Shop, mang theo số lượng tồn kho (stock) = n
  db.ref('globalShop').push({
    name: base.name, role: base.role, ovr: base.ovr, price, stock: n,
    legend: base.legend||false, special: base.special||false, level: base.level||null,
    spawnedBy: 'Rainz', spawnedAt: firebase.database.ServerValue.TIMESTAMP,
  }).then(()=>{
    setAdminMsg(`Đã spawn ${base.name} (${rarityKey}) vào Server Shop — Stock: ${n}!`);
    // Bắn thông báo cho TOÀN SERVER biết vừa có hàng mới
    const label = ADMIN_RARITY_LABELS[rarityKey] || rarityKey;
    db.ref('serverAnnouncements').push({
      text: `🌐 Admin Owner vừa spawn ${label} — ${base.name} x${n} vào Server Shop! Vào mua nhanh kẻo hết 🏃`,
      at: firebase.database.ServerValue.TIMESTAMP,
    }).catch(()=>{});
  }).catch(e=> setAdminMsg('Lỗi khi spawn: '+e.message));
}
function showServerToast(text){
  const el = document.getElementById('serverToast');
  if(!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(()=> el.classList.remove('show'), 6000);
}
let announceInitialLoadDone = false;
function listenServerAnnouncements(){
  if(!fbReady || !db) return;
  db.ref('serverAnnouncements').orderByChild('at').limitToLast(1).on('child_added', snap=>{
    if(!announceInitialLoadDone) return;
    const a = snap.val();
    if(a && a.text) showServerToast(a.text);
  });
  setTimeout(()=>{ announceInitialLoadDone = true; }, 1500);
}
let globalShopData = {};
function listenGlobalShop(){
  if(!fbReady || !db) return;
  db.ref('globalShop').on('value', snap=>{
    globalShopData = snap.val() || {};
    renderServerShop();
    renderAdminGlobalShop();
  });
}
function globalShopCardHtml(key, item, forAdmin){
  const lvlClass = item.level==='forbidden'?' forbidden':item.level==='superior'?' superior':item.level==='future'?' future':item.level==='owner'?' owner':item.level==='winner26'?' winner26':(item.legend?' legend':'');
  const roleTag = item.level==='owner'?'👑 OWNER':item.level==='winner26'?'🏆 WINNER26':item.level==='forbidden'?'⬛⬜ FORBIDDEN':item.level==='superior'?'🌈 SUPERIOR':item.level==='future'?'🔵 FUTURE':(item.legend?'🌟 HUYỀN THOẠI':item.role);
  const actionBtn = forAdmin
    ? `<button class="btn buy-btn" data-act="remove" data-key="${key}" style="background:linear-gradient(160deg,#ff8a8a,#e14b4b);">🗑️ Gỡ</button>`
    : `<button class="btn buy-btn" data-act="buyglobal" data-key="${key}">Mua</button>`;
  return `<div class="market-card${lvlClass}">
    <div class="mc-top"><span class="ovr-badge ${ovrTier(item.ovr)}">${item.ovr}</span><b>${item.name}</b><span class="role-tag">${roleTag}</span></div>
    <div style="font-size:12px; font-weight:800; margin-bottom:8px;">📦 Stock: <span style="color:var(--amber);">${item.stock ?? 1}</span></div>
    <div class="mc-bottom"><span>${fmtMoney(item.price)} 💰</span>${actionBtn}</div>
  </div>`;
}
function setServerShopMsg(t){ const el = document.getElementById('serverShopMsg'); if(el) el.textContent = t; }
function renderServerShop(){
  renderWallet();
  const list = document.getElementById('serverShopList');
  if(!list) return;
  const keys = Object.keys(globalShopData);
  list.innerHTML = keys.length
    ? keys.map(k=> globalShopCardHtml(k, globalShopData[k], false)).join('')
    : '<div style="color:var(--muted);">Hiện chưa có hàng nào — chờ Admin Owner spawn thêm nhé!</div>';
  list.querySelectorAll('.buy-btn[data-act="buyglobal"]').forEach(b=>{
    b.onclick = ()=> buyGlobalShopItem(b.dataset.key);
  });
}
function renderAdminGlobalShop(){
  const list = document.getElementById('adminGlobalShopList');
  if(!list) return;
  const keys = Object.keys(globalShopData);
  list.innerHTML = keys.length
    ? keys.map(k=> globalShopCardHtml(k, globalShopData[k], true)).join('')
    : '<div style="color:var(--muted);">Chưa có hàng nào đang spawn.</div>';
  list.querySelectorAll('.buy-btn[data-act="remove"]').forEach(b=>{
    b.onclick = ()=> db.ref('globalShop/'+b.dataset.key).remove();
  });
}
function buyGlobalShopItem(key){
  const item = globalShopData[key];
  if(!item) return;
  if(wallet < item.price){ setServerShopMsg('Không đủ tiền!'); return; }
  // Transaction giảm stock đi 1 — đảm bảo nhiều người bấm mua cùng lúc vẫn chia đúng số lượng tồn kho, ai nhanh tay được.
  db.ref('globalShop/'+key+'/stock').transaction(cur=>{
    if(cur === null || cur === undefined || cur <= 0) return; // hết hàng -> abort transaction
    return cur - 1;
  }).then(res=>{
    if(res.committed){
      wallet -= item.price;
      const msg = acquirePlayer({ name:item.name, role:item.role, ovr:item.ovr, price:item.price, legend:item.legend, level:item.level });
      setServerShopMsg(`${msg} (mua từ Server Shop)`);
      if(res.snapshot.val() === 0){ db.ref('globalShop/'+key).remove(); }
      db.ref('shopTransactions').push({
        buyerName: myDisplayName || 'Người chơi', itemName: item.name, price: item.price,
        at: firebase.database.ServerValue.TIMESTAMP,
      }).catch(()=>{});
      renderWallet(); renderServerShop(); renderSquadHub();
    } else {
      setServerShopMsg('Rất tiếc, đã hết stock hoặc người khác mua trước bạn!');
    }
  }).catch(e=> setServerShopMsg('Lỗi giao dịch: '+e.message));
}
if(fbReady) listenGlobalShop();
if(fbReady) listenServerAnnouncements();

// ================= CHAT TOÀN SERVER =================
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// ---- Bộ lọc chat (che từ ngữ không phù hợp) — chỉ chặn ở phía client, mang tính hỗ trợ ----
const CHAT_BAD_WORDS = [
  'dm','đm','đjt','djt','vcl','vl','clm','đcm','dcm','vkl','cc','đĩ','di','lồn','lon','cặc','cak','cak',
  'đéo','deo','ngu','óc chó','oc cho','fuck','shit','bitch','asshole','damn','địt','buồi','buoi',
];
function filterProfanity(text){
  let out = text;
  CHAT_BAD_WORDS.forEach(w=>{
    if(!w || w.length < 2) return;
    const pattern = w.split('').map(ch=> ch.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[\\s\\W_]*');
    const re = new RegExp(pattern, 'gi');
    out = out.replace(re, m=> '*'.repeat(m.length));
  });
  return out;
}
let chatEnabled = localStorage.getItem('sanCoVang_chatEnabled') !== 'false';
let top3Uids = new Set();
let top1Uid = null;
let chatMessages = [];
let chatListenerRef = null;
let chatChannel = 'global'; // 'global' | 'team' | 'guild'
function currentChatRefPath(){
  if(chatChannel === 'team' && selfTeam) return 'teamChat/'+selfTeam.id;
  if(chatChannel === 'guild' && myGuildId) return 'guildChat/'+myGuildId;
  return 'globalChat';
}
let pinnedAnnouncement = null;

function listenTop3(){
  if(!fbReady || !db) return;
  db.ref('leaderboard').orderByChild('wins').limitToLast(3).on('value', snap=>{
    const rows = Object.keys(snap.val() || {}).map(uid=>({ uid, ...snap.val()[uid] }));
    rows.sort((a,b)=>(b.wins||0)-(a.wins||0));
    top3Uids = new Set(rows.map(r=>r.uid));
    top1Uid = rows[0] ? rows[0].uid : null;
    renderChatMessages();
  });
}

function updateChatNavVisibility(){
  const btn = document.getElementById('toChatBtn');
  if(btn) btn.style.display = chatEnabled ? '' : 'none';
}

function startChatListener(){
  if(!fbReady || !db || chatListenerRef) return;
  chatListenerRef = db.ref(currentChatRefPath()).orderByChild('at').limitToLast(50);
  chatListenerRef.on('value', snap=>{
    const val = snap.val() || {};
    chatMessages = Object.keys(val).map(k=>({ key:k, ...val[k] })).sort((a,b)=>(a.at||0)-(b.at||0));
    renderChatMessages();
  });
  db.ref('pinnedAnnouncement').on('value', snap=>{
    pinnedAnnouncement = snap.val();
    renderPinnedAnnouncement();
  });
}
function stopChatListener(){
  if(chatListenerRef){ chatListenerRef.off(); chatListenerRef = null; }
  chatMessages = [];
}

function renderPinnedAnnouncement(){
  const box = document.getElementById('chatPinnedBox');
  if(!box) return;
  if(pinnedAnnouncement && pinnedAnnouncement.text){
    box.style.display = '';
    box.innerHTML = `📌 <b>${escapeHtml(pinnedAnnouncement.text)}</b>`;
  } else {
    box.style.display = 'none';
    box.innerHTML = '';
  }
}

const CHAT_REACTION_EMOJIS = ['👍','❤️','😂'];
function chatNameHtml(msg){
  const safeName = escapeHtml(msg.name || 'Người chơi');
  const uidAttr = msg.uid ? ` data-profile-uid="${msg.uid}"` : '';
  const title = getUserTitleClass(msg.uid, msg.name, msg.color);
  const cls = title.cls ? `chat-name ${title.cls}` : 'chat-name';
  const styleAttr = title.style ? ` style="cursor:pointer;${title.style}"` : ' style="cursor:pointer;"';
  return `<span class="${cls}"${styleAttr}${uidAttr}>${title.prefix}${safeName}</span>`;
}
function chatReactionsHtml(msg){
  const reactions = msg.reactions || {};
  return `<div class="chat-reactions" data-msg-key="${msg.key}">` + CHAT_REACTION_EMOJIS.map(emo=>{
    const users = reactions[emo] || {};
    const count = Object.keys(users).length;
    const mine = currentUser && users[currentUser.uid];
    return `<button class="chat-react-btn${mine?' mine':''}" data-emoji="${emo}" data-msg-key="${msg.key}">${emo} ${count>0?count:''}</button>`;
  }).join('') + `</div>`;
}
function renderChatMessages(){
  const box = document.getElementById('chatBox');
  if(!box) return;
  const nearBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 40;
  const blocked = getBlockedUids();
  const visibleMsgs = chatMessages.filter(m=> !blocked.includes(m.uid));
  box.innerHTML = visibleMsgs.length
    ? visibleMsgs.map(m=>{
        const t = m.at ? new Date(m.at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '';
        return `<div class="chat-msg">${chatNameHtml(m)}<span class="chat-time">${t}</span><div>${escapeHtml(filterProfanity(m.text||''))}</div>${chatReactionsHtml(m)}</div>`;
      }).join('')
    : '<div style="color:var(--muted); font-size:13px;">Chưa có tin nhắn nào — hãy là người đầu tiên bắt chuyện!</div>';
  if(nearBottom) box.scrollTop = box.scrollHeight;
  box.querySelectorAll('.chat-react-btn').forEach(b=>{
    b.onclick = ()=> toggleChatReaction(b.dataset.msgKey, b.dataset.emoji);
  });
  box.querySelectorAll('[data-profile-uid]').forEach(el=>{
    el.onclick = ()=> showProfileModal(el.dataset.profileUid);
  });
}
function toggleChatReaction(msgKey, emoji){
  if(!currentUser || !fbReady || !db) return;
  const ref = db.ref(`${currentChatRefPath()}/${msgKey}/reactions/${emoji}/${currentUser.uid}`);
  ref.once('value').then(snap=>{
    if(snap.exists()) ref.remove(); else ref.set(true);
  });
}
function setChatMsg(t){ const el = document.getElementById('chatMsg'); if(el) el.textContent = t; }
function sendChatMessage(){
  if(!chatEnabled){ setChatMsg('Chat đang tắt — vào Cài đặt để bật lại.'); return; }
  if(!currentUser){ setChatMsg('Bạn cần đăng nhập để chat.'); return; }
  const input = document.getElementById('chatInput');
  const raw = (input.value || '').trim();
  if(!raw) return;
  if(raw.length > 300){ setChatMsg('Tin nhắn tối đa 300 ký tự.'); return; }
  if(!fbReady || !db){ setChatMsg('Chưa kết nối server.'); return; }
  const text = filterProfanity(raw);
  db.ref(currentChatRefPath()).push({
    uid: currentUser.uid, name: myDisplayName || 'Người chơi', text, color: myNameColor || null,
    at: firebase.database.ServerValue.TIMESTAMP, isOwner: isAdminUser(),
  }).then(()=>{ input.value = ''; setChatMsg(''); })
    .catch(e=>{
      if(e.code === 'PERMISSION_DENIED') setChatMsg('Bạn đã bị cấm chat bởi Admin.');
      else setChatMsg('Gửi lỗi: '+e.message);
    });
}
if(fbReady) listenTop3();
if(chatEnabled && fbReady) startChatListener();
updateChatNavVisibility();

document.getElementById('toChatBtn').onclick = ()=>{
  renderChatMessages();
  renderPinnedAnnouncement();
  showScreen('chatScreen');
  setTimeout(()=>{ const box = document.getElementById('chatBox'); if(box) box.scrollTop = box.scrollHeight; }, 50);
};
document.getElementById('backBtnChat').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
document.getElementById('chatSendBtn').onclick = sendChatMessage;
document.getElementById('chatInput').addEventListener('keydown', (e)=>{ if(e.key === 'Enter') sendChatMessage(); });

document.getElementById('toSettingsBtn').onclick = ()=>{
  const btn = document.getElementById('chatToggleBtn');
  btn.textContent = chatEnabled ? 'BẬT' : 'TẮT';
  btn.style.background = chatEnabled ? 'linear-gradient(160deg,#7fe8d0,#1fae91)' : 'linear-gradient(160deg,#cfd6dc,#8b97a1)';
  renderSettingsColors();
  showScreen('settingsScreen');
};
document.getElementById('backBtnSettings').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
document.getElementById('chatToggleBtn').onclick = function(){
  chatEnabled = !chatEnabled;
  localStorage.setItem('sanCoVang_chatEnabled', chatEnabled ? 'true' : 'false');
  this.textContent = chatEnabled ? 'BẬT' : 'TẮT';
  this.style.background = chatEnabled ? 'linear-gradient(160deg,#7fe8d0,#1fae91)' : 'linear-gradient(160deg,#cfd6dc,#8b97a1)';
  updateChatNavVisibility();
  if(chatEnabled){ startChatListener(); } else { stopChatListener(); }
};

// ---- Hồ sơ người chơi công khai (bấm tên trong Chat/BXH) ----
function showProfileModal(uid){
  if(!uid || !fbReady || !db) return;
  const body = document.getElementById('profileModalBody');
  const actions = document.getElementById('profileModalActions');
  body.innerHTML = '<div style="text-align:center; color:var(--muted);">Đang tải hồ sơ...</div>';
  actions.innerHTML = '';
  showScreen('profileModalScreen');
  Promise.all([
    db.ref('leaderboard/'+uid).once('value'),
    db.ref('userGuild/'+uid).once('value'),
  ]).then(([pSnap, guildIdSnap])=>{
    const p = pSnap.val();
    if(!p){ body.innerHTML = '<div style="text-align:center; color:var(--muted);">Không tìm thấy hồ sơ.</div>'; return; }
    const title = getUserTitleClass(uid, p.displayName, p.nameColor);
    const guildIdVal = guildIdSnap.val();
    const isMe = currentUser && uid === currentUser.uid;
    body.innerHTML = `
      <div style="text-align:center; margin-bottom:10px;">
        <div style="font-size:20px;"><span class="${title.cls}" style="${title.style}">${title.prefix}${p.teamFlag||''} ${escapeHtml(p.displayName||'Người chơi')}</span></div>
        <div style="font-size:12px; color:var(--muted);">${escapeHtml(p.teamName||'')}</div>
      </div>
      <div style="display:flex; justify-content:space-around; text-align:center; margin:12px 0;">
        <div><div style="font-size:11px; color:var(--muted);">OVR TB</div><div style="font-weight:800;">${p.avgOvr||0}</div></div>
        <div><div style="font-size:11px; color:var(--muted);">Thắng</div><div style="font-weight:800;">${p.wins||0}</div></div>
        <div><div style="font-size:11px; color:var(--muted);">💰</div><div style="font-weight:800;">${fmtMoney(p.wallet||0)}</div></div>
      </div>
      <div style="font-size:12px; color:var(--muted); text-align:center;">🛡️ ${guildIdVal ? 'Đang trong 1 Guild' : 'Chưa tham gia Guild nào'}</div>`;
    if(isMe){ actions.innerHTML = ''; return; }
    const blocked = isBlocked(uid);
    let html = `<button class="btn buy-btn" id="pmDmBtn">💬 Nhắn tin riêng</button>
      <button class="btn buy-btn" id="pmBlockBtn" style="${blocked?'background:linear-gradient(160deg,#7be3a0,#1fae91);':''}">${blocked?'✅ Đã chặn (bấm để bỏ)':'🚫 Chặn người này'}</button>`;
    if(isAdminUser()){
      html += `<button class="btn buy-btn" id="pmBanBtn" style="background:linear-gradient(160deg,#ff8a8a,#e14b4b);">🔨 Cấm chat (Admin)</button>`;
    }
    actions.innerHTML = html;
    document.getElementById('pmDmBtn').onclick = ()=> openDm(uid, p.displayName||'Người chơi');
    document.getElementById('pmBlockBtn').onclick = ()=>{ toggleBlockUser(uid); showProfileModal(uid); };
    if(isAdminUser()){
      document.getElementById('pmBanBtn').onclick = ()=>{
        if(!confirm(`Cấm chat vĩnh viễn: ${p.displayName}?`)) return;
        db.ref('bannedChatUsers/'+uid).set(true).then(()=> alert('Đã cấm chat người này.'));
      };
    }
  }).catch(()=>{ body.innerHTML = '<div style="text-align:center; color:var(--muted);">Không tải được hồ sơ.</div>'; });
}
document.getElementById('closeProfileModalBtn').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };

// ---- Admin: ghim thông báo / cấm chat / xem log giao dịch Server Shop ----
document.getElementById('adminPinBtn').onclick = ()=>{
  if(!isAdminUser() || !fbReady) return;
  const text = (document.getElementById('adminPinInput').value || '').trim();
  if(!text) return;
  db.ref('pinnedAnnouncement').set({ text, at: firebase.database.ServerValue.TIMESTAMP })
    .then(()=> setAdminMsg('Đã ghim thông báo!')).catch(e=> setAdminMsg('Lỗi: '+e.message));
};
document.getElementById('adminUnpinBtn').onclick = ()=>{
  if(!isAdminUser() || !fbReady) return;
  db.ref('pinnedAnnouncement').remove().then(()=> setAdminMsg('Đã bỏ ghim.'));
};
document.getElementById('adminBanBtn').onclick = async ()=>{
  if(!isAdminUser() || !fbReady) return;
  const name = (document.getElementById('adminBanNameInput').value || '').trim().toLowerCase();
  if(!name) return;
  try{
    const snap = await db.ref('usernames/'+name).once('value');
    const uid = snap.val();
    if(!uid){ setAdminMsg('Không tìm thấy người dùng này.'); return; }
    await db.ref('bannedChatUsers/'+uid).set(true);
    setAdminMsg(`Đã cấm chat: ${name}`);
  }catch(e){ setAdminMsg('Lỗi: '+e.message); }
};
document.getElementById('adminUnbanBtn').onclick = async ()=>{
  if(!isAdminUser() || !fbReady) return;
  const name = (document.getElementById('adminBanNameInput').value || '').trim().toLowerCase();
  if(!name) return;
  try{
    const snap = await db.ref('usernames/'+name).once('value');
    const uid = snap.val();
    if(!uid){ setAdminMsg('Không tìm thấy người dùng này.'); return; }
    await db.ref('bannedChatUsers/'+uid).remove();
    setAdminMsg(`Đã bỏ cấm chat: ${name}`);
  }catch(e){ setAdminMsg('Lỗi: '+e.message); }
};
function renderAdminTxLog(){
  if(!isAdminUser() || !fbReady || !db) return;
  db.ref('shopTransactions').orderByChild('at').limitToLast(20).once('value').then(snap=>{
    const rows = Object.values(snap.val() || {}).sort((a,b)=>(b.at||0)-(a.at||0));
    const box = document.getElementById('adminTxLog');
    if(!box) return;
    box.innerHTML = rows.length
      ? rows.map(r=> `<p>🧾 <b>${escapeHtml(r.buyerName||'?')}</b> đã mua <b>${escapeHtml(r.itemName||'?')}</b> giá ${fmtMoney(r.price||0)} 💰</p>`).join('')
      : '<p style="color:var(--muted);">Chưa có giao dịch nào.</p>';
  });
}

// ================= MÙA GIẢI (SEASON) =================
function refreshAdminSeasonNum(){
  if(!fbReady || !db) return;
  db.ref('currentSeason').once('value').then(snap=>{
    const el = document.getElementById('adminSeasonNum');
    if(el) el.textContent = snap.val() || 1;
  });
}
document.getElementById('adminResetSeasonBtn').onclick = async ()=>{
  if(!isAdminUser() || !fbReady || !db) return;
  if(!confirm('Chắc chắn kết thúc mùa giải hiện tại? Bảng xếp hạng sẽ được lưu trữ và làm mới về 0 cho TẤT CẢ người chơi.')) return;
  try{
    const [lbSnap, seasonSnap] = await Promise.all([
      db.ref('leaderboard').once('value'), db.ref('currentSeason').once('value'),
    ]);
    const seasonNum = seasonSnap.val() || 1;
    await db.ref('seasonsArchive/season'+seasonNum).set({
      data: lbSnap.val() || {}, endedAt: firebase.database.ServerValue.TIMESTAMP,
    });
    await db.ref('leaderboard').remove();
    await db.ref('currentSeason').set(seasonNum + 1);
    await db.ref('serverAnnouncements').push({
      text: `🏁 Mùa giải ${seasonNum} đã kết thúc! Bảng xếp hạng đã được làm mới — Mùa ${seasonNum+1} bắt đầu!`,
      at: firebase.database.ServerValue.TIMESTAMP,
    });
    setAdminMsg(`Đã kết thúc mùa ${seasonNum} và reset bảng xếp hạng!`);
    refreshAdminSeasonNum();
  }catch(e){ setAdminMsg('Lỗi reset mùa giải: '+e.message); }
};
if(fbReady) refreshAdminSeasonNum();

// ---- Admin: tạo phiên Đấu giá ----
function populateAdminAuctionCardSelect(){
  const raritySel = document.getElementById('adminAuctionRaritySelect');
  const cardSel = document.getElementById('adminAuctionCardSelect');
  if(!raritySel || !cardSel) return;
  const pool = ADMIN_RARITY_POOLS[raritySel.value] || [];
  cardSel.innerHTML = pool.map((p,i)=> `<option value="${i}">${p.name} (OVR ${p.ovr})</option>`).join('');
}
document.getElementById('adminAuctionRaritySelect').onchange = populateAdminAuctionCardSelect;
document.getElementById('adminAuctionCreateBtn').onclick = ()=>{
  if(!isAdminUser() || !fbReady || !db) return;
  const rarity = document.getElementById('adminAuctionRaritySelect').value;
  const pool = ADMIN_RARITY_POOLS[rarity];
  const idx = parseInt(document.getElementById('adminAuctionCardSelect').value, 10) || 0;
  const base = pool[idx];
  if(!base){ setAdminMsg('Chưa chọn được thẻ.'); return; }
  const startPrice = parseInt(document.getElementById('adminAuctionStartPrice').value, 10) || 1000;
  const minutes = parseInt(document.getElementById('adminAuctionDuration').value, 10) || 60;
  db.ref('auctions').push({
    name: base.name, role: base.role, ovr: base.ovr, level: base.level||null, legend: base.legend||false,
    startPrice, currentBid: startPrice, currentBidderUid: null, currentBidderName: null,
    endsAt: Date.now() + minutes*60000, settled: false, claimed: false,
  }).then(()=>{
    setAdminMsg(`Đã tạo phiên đấu giá ${base.name}!`);
    db.ref('serverAnnouncements').push({
      text: `🔨 Phiên đấu giá mới: ${base.name}! Giá khởi điểm ${fmtMoney(startPrice)} 💰 — kéo dài ${minutes} phút!`,
      at: firebase.database.ServerValue.TIMESTAMP,
    });
  }).catch(e=> setAdminMsg('Lỗi: '+e.message));
};

// ---- Admin: tạo Promocode ----
document.getElementById('adminPromoCreateBtn').onclick = ()=>{
  if(!isAdminUser() || !fbReady || !db) return;
  const code = (document.getElementById('adminPromoCodeInput').value || '').trim().toUpperCase();
  if(!code){ setAdminMsg('Nhập mã code.'); return; }
  const rewardType = document.getElementById('adminPromoTypeSelect').value;
  const amount = parseInt(document.getElementById('adminPromoAmountInput').value, 10) || 0;
  const tier = document.getElementById('adminPromoTierSelect').value;
  const maxUses = parseInt(document.getElementById('adminPromoMaxUses').value, 10) || 100;
  db.ref('promoCodes/'+code).set({
    rewardType, amount, tier, maxUses, usedCount: 0,
    createdBy: 'Rainz', createdAt: firebase.database.ServerValue.TIMESTAMP,
  }).then(()=> setAdminMsg(`Đã tạo code ${code}!`))
    .catch(e=> setAdminMsg('Lỗi: '+e.message));
};

// ================= FUSION (NÂNG CẤP THẺ) =================
// Chỉ áp dụng cho cầu thủ Ở BĂNG GHẾ DỰ BỊ — tránh làm hỏng đội hình chính (luôn phải đủ 11 người).
const FUSION_NEXT = { normal:'legend', legend:'future', future:'superior', superior:'forbidden' };
const FUSION_TIER_LABEL = { normal:'⚪ Thường', legend:'🌟 Huyền thoại', future:'🔵 Future', superior:'🌈 Superior', forbidden:'⬛⬜ Forbidden' };
function getCardTier(p){
  if(p.level==='forbidden') return 'forbidden';
  if(p.level==='superior') return 'superior';
  if(p.level==='future') return 'future';
  if(p.legend) return 'legend';
  return 'normal';
}
let fusionSelected = []; // mảng các index trong squad.bench
function setFusionMsg(t){ const el = document.getElementById('fusionMsg'); if(el) el.textContent = t; }
function renderFusionList(){
  const squad = ensureSquad(selfTeam);
  const tier = document.getElementById('fusionTierSelect').value;
  const cards = squad.bench.map((p,idx)=>({p, idx})).filter(c=> getCardTier(c.p) === tier);
  fusionSelected = fusionSelected.filter(idx=> cards.some(c=>c.idx===idx));
  const box = document.getElementById('fusionCardList');
  box.innerHTML = cards.length ? cards.map(c=>{
    const checked = fusionSelected.includes(c.idx);
    return `<div class="squad-slot" data-idx="${c.idx}" style="cursor:pointer; ${checked?'outline:2px solid var(--amber);':''}">
      <span class="ovr-badge ${ovrTier(c.p.ovr)}">${c.p.ovr}</span><span class="sname">${escapeHtml(c.p.name)}</span><span class="role-tag">${c.p.role}</span>
      ${checked ? '<span style="color:var(--amber);font-weight:800;">✓ Đã chọn</span>' : ''}
    </div>`;
  }).join('') : '<div class="hub-note">Bạn chưa có đủ thẻ dự bị ở độ hiếm này (cần ít nhất 3).</div>';
  document.getElementById('fusionSelectedCount').textContent = fusionSelected.length;
  box.querySelectorAll('[data-idx]').forEach(el=>{
    el.onclick = ()=>{
      const idx = parseInt(el.dataset.idx, 10);
      const pos = fusionSelected.indexOf(idx);
      if(pos>=0) fusionSelected.splice(pos,1);
      else if(fusionSelected.length<3) fusionSelected.push(idx);
      renderFusionList();
    };
  });
}
document.getElementById('fusionTierSelect').onchange = ()=>{ fusionSelected=[]; setFusionMsg(''); renderFusionList(); };
document.getElementById('toFusionBtn').onclick = ()=>{
  fusionSelected = []; setFusionMsg('');
  renderFusionList();
  showScreen('fusionScreen');
};
document.getElementById('backBtnFusion').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
document.getElementById('fusionConfirmBtn').onclick = ()=>{
  if(fusionSelected.length !== 3){ setFusionMsg('Cần chọn đúng 3 thẻ cùng độ hiếm.'); return; }
  const tier = document.getElementById('fusionTierSelect').value;
  const nextTier = FUSION_NEXT[tier];
  if(!nextTier){ setFusionMsg('Độ hiếm này không thể fusion tiếp.'); return; }
  const squad = ensureSquad(selfTeam);
  // Xoá 3 thẻ đã chọn khỏi bench (xoá từ index cao xuống thấp để không lệch vị trí các thẻ còn lại)
  [...fusionSelected].sort((a,b)=>b-a).forEach(idx=> squad.bench.splice(idx,1));
  const pool = ADMIN_RARITY_POOLS[nextTier];
  const newCard = { ...pickRandom(pool) };
  const msg = acquirePlayer(newCard);
  saveGame();
  setFusionMsg(`🎉 Fusion thành công! Nhận được ${newCard.name} (${FUSION_TIER_LABEL[nextTier]}). ${msg}`);
  fusionSelected = [];
  renderFusionList();
  renderSquadHub();
};

// ================= CHAT RIÊNG THEO ĐỘI =================
document.querySelectorAll('#chatChannelTabs .tactic-btn').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('#chatChannelTabs .tactic-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    chatChannel = btn.dataset.channel;
    if(chatChannel === 'team' && !selfTeam){ setChatMsg('Bạn cần chọn đội trước khi dùng chat đội.'); chatChannel='global'; return; }
    stopChatListener();
    if(chatEnabled) startChatListener();
    renderChatMessages();
  };
});

// ================= TẶNG THẺ CHO BẠN BÈ (bản an toàn của Trade) =================
// Vì Rules không cho phép 1 người chơi ghi trực tiếp vào dữ liệu người khác (chống gian lận/nhân bản thẻ),
// việc tặng quà dùng hàng đợi trung gian 'gifts': người tặng tự xoá thẻ khỏi đội mình rồi tạo phiếu quà;
// người nhận tự thêm thẻ vào đội mình khi bấm "Nhận" — mỗi bên chỉ ghi vào dữ liệu của chính mình.
let giftTargetUid = null, giftTargetName = null;
function openGiftPicker(uid, name){
  giftTargetUid = uid; giftTargetName = name;
  document.getElementById('giftTargetLabel').textContent = `Chọn 1 thẻ dự bị để tặng cho ${name}`;
  renderGiftCardList();
  showScreen('giftPickScreen');
}
function renderGiftCardList(){
  const squad = ensureSquad(selfTeam);
  const box = document.getElementById('giftCardList');
  box.innerHTML = squad.bench.length ? squad.bench.map((p,idx)=>`
    <div class="squad-slot" data-idx="${idx}" style="cursor:pointer;">
      <span class="ovr-badge ${ovrTier(p.ovr)}">${p.ovr}</span><span class="sname">${escapeHtml(p.name)}</span><span class="role-tag">${p.role}</span>
      <button class="btn buy-btn" data-idx="${idx}">🎁 Tặng</button>
    </div>`).join('') : '<div class="hub-note">Bạn chưa có cầu thủ dự bị nào để tặng.</div>';
  box.querySelectorAll('.buy-btn').forEach(b=>{
    b.onclick = ()=> sendGift(parseInt(b.dataset.idx,10));
  });
}
function setGiftMsg(t){ const el = document.getElementById('giftMsg'); if(el) el.textContent = t; }
function sendGift(idx){
  if(!currentUser || !fbReady || !db || !giftTargetUid){ setGiftMsg('Có lỗi xảy ra, thử lại.'); return; }
  const squad = ensureSquad(selfTeam);
  const card = squad.bench[idx];
  if(!card) return;
  squad.bench.splice(idx, 1);
  saveGame();
  db.ref('gifts').push({
    fromUid: currentUser.uid, fromName: myDisplayName||'Người chơi',
    toUid: giftTargetUid, card, claimed: false,
    at: firebase.database.ServerValue.TIMESTAMP,
  }).then(()=>{
    setGiftMsg(`Đã tặng ${card.name} cho ${giftTargetName}!`);
    renderSquadHub();
    setTimeout(()=>{ renderFriendsList(); showScreen('friendsScreen'); }, 900);
  }).catch(e=>{
    // Lỗi gửi thất bại -> hoàn lại thẻ cho người tặng để tránh mất thẻ oan
    squad.bench.push(card); saveGame();
    setGiftMsg('Gửi quà lỗi, thẻ đã được hoàn lại: '+e.message);
  });
}
document.getElementById('backBtnGiftPick').onclick = ()=>{ renderFriendsList(); showScreen('friendsScreen'); };
function listenPendingGifts(){
  if(!fbReady || !db || !currentUser) return;
  db.ref('gifts').orderByChild('toUid').equalTo(currentUser.uid).on('value', snap=>{
    const all = snap.val() || {};
    const pending = Object.keys(all).filter(k=> !all[k].claimed).map(k=>({key:k, ...all[k]}));
    const box = document.getElementById('pendingGiftsBox');
    if(!box) return;
    if(!pending.length){ box.style.display = 'none'; box.innerHTML=''; return; }
    box.style.display = '';
    box.innerHTML = '<h4>🎁 Quà đang chờ nhận</h4>' + pending.map(g=> `
      <p style="display:flex; justify-content:space-between; align-items:center;">
        <span><b>${escapeHtml(g.fromName)}</b> tặng bạn <b>${escapeHtml(g.card.name)}</b> (OVR ${g.card.ovr})</span>
        <button class="btn buy-btn" data-key="${g.key}">Nhận</button>
      </p>`).join('');
    box.querySelectorAll('.buy-btn').forEach(b=>{
      b.onclick = ()=> claimGift(b.dataset.key, all[b.dataset.key].card);
    });
  });
}
function claimGift(key, card){
  const squad = ensureSquad(selfTeam);
  const msg = acquirePlayer({ ...card });
  saveGame();
  db.ref('gifts/'+key+'/claimed').set(true).then(()=>{
    setFriendMsg(`Đã nhận quà! ${msg}`);
    renderSquadHub();
  });
}

// ================= BAZAAR (chợ giữa người chơi) =================
let bazaarData = {};
function setBazaarMsg(t){ const el = document.getElementById('bazaarMsg'); if(el) el.textContent = t; }
function populateBazaarSellSelect(){
  const sel = document.getElementById('bazaarSellSelect');
  if(!sel || !selfTeam) return;
  const squad = ensureSquad(selfTeam);
  sel.innerHTML = squad.bench.length
    ? squad.bench.map((p,i)=> `<option value="${i}">${escapeHtml(p.name)} (OVR ${p.ovr})</option>`).join('')
    : '<option value="">-- Không có cầu thủ dự bị --</option>';
}
document.getElementById('bazaarSellBtn').onclick = ()=>{
  if(!currentUser || !fbReady || !db){ setBazaarMsg('Cần đăng nhập.'); return; }
  const idx = parseInt(document.getElementById('bazaarSellSelect').value, 10);
  const price = parseInt(document.getElementById('bazaarSellPrice').value, 10);
  if(isNaN(idx)){ setBazaarMsg('Bạn không có cầu thủ dự bị nào để bán.'); return; }
  if(!price || price <= 0){ setBazaarMsg('Nhập giá bán hợp lệ.'); return; }
  const squad = ensureSquad(selfTeam);
  const card = squad.bench[idx];
  if(!card) return;
  squad.bench.splice(idx, 1);
  saveGame(); renderSquadHub();
  db.ref('bazaar').push({
    sellerUid: currentUser.uid, sellerName: myDisplayName||'Người chơi',
    name: card.name, role: card.role, ovr: card.ovr, level: card.level||null, legend: card.legend||false,
    price, createdAt: firebase.database.ServerValue.TIMESTAMP,
  }).then(()=>{ setBazaarMsg(`Đã rao bán ${card.name} giá ${fmtMoney(price)} 💰!`); populateBazaarSellSelect(); })
    .catch(e=>{
      squad.bench.push(card); saveGame(); renderSquadHub();
      setBazaarMsg('Lỗi khi đăng bán, đã hoàn lại thẻ: '+e.message);
    });
};
function bazaarCardHtml(key, item, mine){
  const lvlCls = cardLevelClass(item);
  const roleTag = item.level==='owner'?'👑':item.level==='winner26'?'🏆':item.level==='forbidden'?'⬛⬜':item.level==='superior'?'🌈':item.level==='future'?'🔵':(item.legend?'🌟':item.role);
  return `<div class="player-card${lvlCls?' '+lvlCls:''}">
    <span class="card-ovr-badge ${ovrTier(item.ovr)}">${item.ovr}</span>
    <span class="card-role-badge">${roleTag}</span>
    <div class="card-face">${emojiForPlayer(item)}</div>
    <div class="card-name">${escapeHtml(item.name)}</div>
    <div style="font-size:10px; color:var(--amber); font-weight:800;">${fmtMoney(item.price)} 💰</div>
    <button class="btn sell-btn" data-key="${key}" data-mine="${mine?'1':'0'}" style="${mine?'background:linear-gradient(160deg,#cfd6dc,#8b97a1);':''}">${mine?'Huỷ bán':'Mua'}</button>
  </div>`;
}
function renderBazaar(){
  renderWallet();
  const listBox = document.getElementById('bazaarList');
  const myBox = document.getElementById('bazaarMyList');
  if(!listBox || !myBox) return;
  const keys = Object.keys(bazaarData);
  const others = keys.filter(k=> !currentUser || bazaarData[k].sellerUid !== currentUser.uid);
  const mine = keys.filter(k=> currentUser && bazaarData[k].sellerUid === currentUser.uid);
  myBox.innerHTML = mine.length ? mine.map(k=> bazaarCardHtml(k, bazaarData[k], true)).join('') : '<div class="hub-note">Bạn chưa rao bán gì.</div>';
  listBox.innerHTML = others.length ? others.map(k=> bazaarCardHtml(k, bazaarData[k], false)).join('') : '<div class="hub-note">Chưa có ai rao bán — hãy là người đầu tiên!</div>';
  [...myBox.querySelectorAll('[data-key]'), ...listBox.querySelectorAll('[data-key]')].forEach(b=>{
    b.onclick = ()=> b.dataset.mine==='1' ? cancelBazaarListing(b.dataset.key) : buyBazaarItem(b.dataset.key);
  });
}
function listenBazaar(){
  if(!fbReady || !db) return;
  db.ref('bazaar').on('value', snap=>{
    bazaarData = snap.val() || {};
    renderBazaar();
  });
}
function cancelBazaarListing(key){
  const item = bazaarData[key];
  if(!item || !currentUser || item.sellerUid !== currentUser.uid) return;
  db.ref('bazaar/'+key).remove().then(()=>{
    const squad = ensureSquad(selfTeam);
    squad.bench.push({ name:item.name, role:item.role, ovr:item.ovr, level:item.level, legend:item.legend });
    saveGame(); renderSquadHub();
    setBazaarMsg('Đã huỷ bán, thẻ đã về lại đội của bạn.');
  }).catch(e=> setBazaarMsg('Lỗi: '+e.message));
}
function buyBazaarItem(key){
  const item = bazaarData[key];
  if(!item || !currentUser){ setBazaarMsg('Cần đăng nhập.'); return; }
  if(item.sellerUid === currentUser.uid) return;
  if(wallet < item.price){ setBazaarMsg('Không đủ tiền!'); return; }
  db.ref('bazaar/'+key).transaction(cur=> cur===null ? undefined : null).then(res=>{
    if(res.committed){
      wallet -= item.price;
      const msg = acquirePlayer({ name:item.name, role:item.role, ovr:item.ovr, level:item.level, legend:item.legend });
      saveGame(); renderWallet(); renderSquadHub();
      setBazaarMsg(`Đã mua ${item.name}! ${msg}`);
      db.ref('pendingPayouts/'+item.sellerUid).push({
        amount: item.price, fromName: myDisplayName||'Người chơi', at: firebase.database.ServerValue.TIMESTAMP,
      }).catch(()=>{});
    } else {
      setBazaarMsg('Rất tiếc, người khác đã mua trước bạn!');
    }
  }).catch(e=> setBazaarMsg('Lỗi giao dịch: '+e.message));
}
function listenPendingPayouts(){
  if(!fbReady || !db || !currentUser) return;
  db.ref('pendingPayouts/'+currentUser.uid).on('child_added', snap=>{
    const payout = snap.val();
    if(!payout) return;
    wallet += payout.amount || 0;
    saveGame(); renderWallet();
    showServerToast(`💰 ${escapeHtml(payout.fromName||'Ai đó')} vừa mua hàng của bạn ở Bazaar: +${fmtMoney(payout.amount||0)} 💰`);
    snap.ref.remove();
  });
}
document.getElementById('toBazaarBtn').onclick = ()=>{
  setBazaarMsg('');
  populateBazaarSellSelect();
  renderBazaar();
  showScreen('bazaarScreen');
};
document.getElementById('backBtnBazaar').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
if(fbReady) listenBazaar();

// ================= GUILD =================
const GUILD_CREATE_COST = 5000;
const GUILD_WEEK_MS = 7*24*60*60*1000;
const GUILD_WEEKLY_REWARD = 2000;
let myGuildId = null;
let myGuildData = null;
let pendingGuildRequestId = null;
function setGuildMsg(t){ const el = document.getElementById('guildMsg'); if(el) el.textContent = t; }
function listenMyGuild(){
  if(!fbReady || !db || !currentUser) return;
  db.ref('userGuild/'+currentUser.uid).on('value', snap=>{
    const gid = snap.val();
    if(gid !== myGuildId){
      myGuildId = gid;
      if(myGuildData && myGuildData._ref) myGuildData._ref.off();
      myGuildData = null;
    }
    if(gid){
      pendingGuildRequestId = null;
      localStorage.removeItem('sanCoVang_pendingGuildRequest');
      const ref = db.ref('guilds/'+gid);
      ref.on('value', gSnap=>{
        myGuildData = gSnap.val() ? { id:gid, _ref:ref, ...gSnap.val() } : null;
        renderGuildScreen();
        updateChatGuildTabVisibility();
      });
    } else {
      pendingGuildRequestId = localStorage.getItem('sanCoVang_pendingGuildRequest');
      renderGuildScreen();
      updateChatGuildTabVisibility();
    }
  });
}
function updateChatGuildTabVisibility(){
  const tab = document.getElementById('chatGuildTab');
  if(tab) tab.style.display = myGuildId ? '' : 'none';
}
function renderGuildBrowseList(){
  if(!fbReady || !db) return;
  db.ref('guilds').once('value').then(snap=>{
    const all = snap.val() || {};
    const box = document.getElementById('guildBrowseList');
    if(!box) return;
    const rows = Object.keys(all).map(id=>({ id, ...all[id] }));
    box.innerHTML = rows.length ? rows.map(g=>{
      const count = Object.keys(g.members||{}).length;
      const requested = pendingGuildRequestId === g.id;
      const btn = requested
        ? `<span style="color:var(--amber); font-size:12px;">⏳ Đang chờ duyệt</span>`
        : `<button class="btn buy-btn" data-gid="${g.id}">Xin tham gia</button>`;
      return `<div class="squad-slot"><span class="sname">🛡️ ${escapeHtml(g.name)}</span><span class="role-tag">${count} thành viên</span>${btn}</div>`;
    }).join('') : '<div class="hub-note">Chưa có Guild nào — hãy tạo Guild đầu tiên!</div>';
    box.querySelectorAll('[data-gid]').forEach(b=> b.onclick = ()=> requestJoinGuild(b.dataset.gid));
  });
  if(pendingGuildRequestId){
    db.ref(`guilds/${pendingGuildRequestId}/joinRequests/${currentUser.uid}`).once('value').then(reqSnap=>{
      if(!reqSnap.exists()){
        db.ref(`guilds/${pendingGuildRequestId}/members/${currentUser.uid}`).once('value').then(memSnap=>{
          if(memSnap.exists()){
            db.ref('userGuild/'+currentUser.uid).set(pendingGuildRequestId);
          } else {
            pendingGuildRequestId = null;
            localStorage.removeItem('sanCoVang_pendingGuildRequest');
            setGuildMsg('Yêu cầu tham gia của bạn đã bị từ chối.');
            renderGuildBrowseList();
          }
        });
      }
    });
  }
}
function renderGuildScreen(){
  const noBox = document.getElementById('guildNoGuildBox');
  const inBox = document.getElementById('guildInGuildBox');
  if(!noBox || !inBox) return;
  if(!myGuildId || !myGuildData){
    noBox.style.display = ''; inBox.style.display = 'none';
    renderGuildBrowseList();
    return;
  }
  noBox.style.display = 'none'; inBox.style.display = '';
  const members = myGuildData.members || {};
  const uids = Object.keys(members);
  const isOwner = currentUser && myGuildData.ownerUid === currentUser.uid;
  const colorInfo = NAME_COLOR_CATALOG.find(c=>c.id===myGuildData.nameColor);
  const guildColorStyle = myGuildData.nameColor==='gold' ? 'class="chat-name-top3"' : myGuildData.nameColor==='purple' ? 'class="chat-name-owner"' : colorInfo ? `style="color:${colorInfo.hex};"` : '';
  document.getElementById('guildTitleName').innerHTML = `🛡️ <span ${guildColorStyle}>${escapeHtml(myGuildData.name)}</span>`;
  document.getElementById('guildMemberCount').textContent = `${uids.length} thành viên · Chủ guild: ${myGuildData.ownerName||'?'}`;
  document.getElementById('guildMemberList').innerHTML = uids.length
    ? uids.map(uid=>{
        const isOwnerOfGuild = uid === myGuildData.ownerUid;
        return `<div class="squad-slot" data-profile-uid="${uid}" style="cursor:pointer;">
          <span class="sname">${isOwnerOfGuild?'👑 ':''}${escapeHtml(members[uid].name||'?')}</span>
        </div>`;
      }).join('')
    : '';
  document.getElementById('guildMemberList').querySelectorAll('[data-profile-uid]').forEach(el=>{
    el.onclick = ()=> showProfileModal(el.dataset.profileUid);
  });
  renderGuildRewardBox();
  if(isOwner){
    renderGuildJoinRequests();
    renderGuildColorSettings();
  } else {
    const reqBox = document.getElementById('guildJoinRequestsBox'); if(reqBox) reqBox.style.display = 'none';
    const colorBox = document.getElementById('guildColorSettingsBox'); if(colorBox) colorBox.style.display = 'none';
  }
}
function renderGuildJoinRequests(){
  const box = document.getElementById('guildJoinRequestsBox');
  if(!box || !myGuildId) return;
  box.style.display = '';
  db.ref(`guilds/${myGuildId}/joinRequests`).once('value').then(snap=>{
    const reqs = snap.val() || {};
    const uids = Object.keys(reqs);
    box.innerHTML = `<div class="hub-note" style="margin-top:14px;">📋 Yêu cầu tham gia đang chờ duyệt (${uids.length}):</div>` +
      (uids.length ? uids.map(uid=> `
        <div class="squad-slot">
          <span class="sname">${escapeHtml(reqs[uid].name||'?')}</span>
          <button class="btn buy-btn" data-act="approve" data-uid="${uid}">✅ Duyệt</button>
          <button class="btn buy-btn" data-act="reject" data-uid="${uid}" style="background:linear-gradient(160deg,#ff8a8a,#e14b4b);">❌ Từ chối</button>
        </div>`).join('') : '<div class="hub-note">Không có yêu cầu nào.</div>');
    box.querySelectorAll('[data-act="approve"]').forEach(b=> b.onclick = ()=> approveJoinRequest(b.dataset.uid, reqs[b.dataset.uid].name));
    box.querySelectorAll('[data-act="reject"]').forEach(b=> b.onclick = ()=> rejectJoinRequest(b.dataset.uid));
  });
}
function approveJoinRequest(uid, name){
  db.ref(`guilds/${myGuildId}/members/${uid}`).set({ name: name||'Người chơi', joinedAt: firebase.database.ServerValue.TIMESTAMP })
    .then(()=> db.ref(`guilds/${myGuildId}/joinRequests/${uid}`).remove())
    .then(()=>{ setGuildMsg(`Đã duyệt ${name} vào Guild!`); renderGuildJoinRequests(); renderGuildScreen(); })
    .catch(e=> setGuildMsg('Lỗi: '+e.message));
}
function rejectJoinRequest(uid){
  db.ref(`guilds/${myGuildId}/joinRequests/${uid}`).remove()
    .then(()=>{ setGuildMsg('Đã từ chối yêu cầu.'); renderGuildJoinRequests(); })
    .catch(e=> setGuildMsg('Lỗi: '+e.message));
}
// ---- Guild Settings: màu tên Guild — Vàng/Tím chỉ mở khoá nếu Guild có thành viên Admin hoặc lọt Top 3 sức mạnh ----
async function checkGuildSpecialColorEligible(){
  if(!myGuildData) return false;
  const members = myGuildData.members || {};
  const hasAdmin = Object.values(members).some(m=> (m.name||'').toLowerCase() === ADMIN_NAME);
  if(hasAdmin) return true;
  try{
    const [guildsSnap, lbSnap] = await Promise.all([
      db.ref('guilds').once('value'), db.ref('leaderboard').once('value'),
    ]);
    const allGuilds = guildsSnap.val() || {};
    const lb = lbSnap.val() || {};
    const power = Object.keys(allGuilds).map(gid=>{
      const mems = Object.keys(allGuilds[gid].members||{});
      const sum = mems.reduce((s,uid)=> s + ((lb[uid]&&lb[uid].avgOvr)||0), 0);
      return { gid, sum };
    }).sort((a,b)=> b.sum - a.sum).slice(0,3).map(x=>x.gid);
    return power.includes(myGuildId);
  }catch(e){ return false; }
}
async function renderGuildColorSettings(){
  const box = document.getElementById('guildColorSettingsBox');
  if(!box) return;
  box.style.display = '';
  const eligible = await checkGuildSpecialColorEligible();
  const solidHtml = NAME_COLOR_CATALOG.map(c=> `
    <div class="color-swatch" data-guild-color="${c.id}">
      <div class="color-swatch-dot" style="background:${c.hex};"></div>
      <div class="color-swatch-label">${c.label}</div>
    </div>`).join('');
  const goldLocked = !eligible;
  const purpleLocked = !eligible;
  const goldHtml = `<div class="color-swatch${goldLocked?' locked':''}" data-guild-color="${goldLocked?'':'gold'}">
      <div class="color-swatch-dot ${goldLocked?'locked-dot':''}" ${goldLocked?'':'style="background:linear-gradient(135deg,#a5720a,#ffe08a,#f6c453);"'}>${goldLocked?'??':''}</div>
      <div class="color-swatch-label">Vàng${goldLocked?' (khoá)':''}</div>
    </div>`;
  const purpleHtml = `<div class="color-swatch${purpleLocked?' locked':''}" data-guild-color="${purpleLocked?'':'purple'}">
      <div class="color-swatch-dot ${purpleLocked?'locked-dot':''}" ${purpleLocked?'':'style="background:linear-gradient(135deg,#4c1d95,#c084fc,#e9d5ff);"'}>${purpleLocked?'??':''}</div>
      <div class="color-swatch-label">Tím${purpleLocked?' (khoá)':''}</div>
    </div>`;
  box.innerHTML = `<div class="hub-note" style="margin-top:14px;">🎨 Cài đặt màu tên Guild ${eligible?'— Guild có Admin hoặc Top 3 sức mạnh, đã mở khoá Vàng/Tím!':'— cần có thành viên Admin hoặc lọt Top 3 sức mạnh Guild để mở khoá Vàng/Tím'}:</div>
    <div class="color-grid">${solidHtml}${goldHtml}${purpleHtml}</div>`;
  box.querySelectorAll('.color-swatch:not(.locked)').forEach(el=>{
    el.onclick = ()=> setGuildColor(el.dataset.guildColor);
  });
}
function setGuildColor(colorId){
  if(!currentUser || !myGuildId) return;
  db.ref('guilds/'+myGuildId+'/nameColor').set(colorId)
    .then(()=> setGuildMsg('Đã đổi màu tên Guild!'))
    .catch(e=> setGuildMsg('Lỗi: '+e.message));
}
function renderGuildRewardBox(){
  const box = document.getElementById('guildRewardBox');
  if(!box || !currentUser || !myGuildId) return;
  const weekNum = Math.floor(Date.now() / GUILD_WEEK_MS);
  db.ref(`guildRewardClaims/${myGuildId}/${weekNum}/${currentUser.uid}`).once('value').then(snap=>{
    if(snap.exists()){
      box.innerHTML = `✅ Bạn đã nhận thưởng tuần này rồi. Tuần sau quay lại nhé!`;
    } else {
      box.innerHTML = `🎁 Có thưởng tuần này (${fmtMoney(GUILD_WEEKLY_REWARD)} 💰) chưa nhận! <button class="btn buy-btn" id="guildClaimRewardBtn">Nhận ngay</button>`;
      document.getElementById('guildClaimRewardBtn').onclick = ()=> claimGuildWeeklyReward(weekNum);
    }
  });
}
function claimGuildWeeklyReward(weekNum){
  if(!currentUser || !fbReady || !db) return;
  db.ref(`guildRewardClaims/${myGuildId}/${weekNum}/${currentUser.uid}`).set(true).then(()=>{
    wallet += GUILD_WEEKLY_REWARD;
    saveGame(); renderWallet();
    setGuildMsg(`🎉 Nhận thưởng tuần thành công: +${fmtMoney(GUILD_WEEKLY_REWARD)} 💰`);
    renderGuildRewardBox();
  }).catch(e=> setGuildMsg('Lỗi nhận thưởng: '+e.message));
}
document.getElementById('guildCreateBtn').onclick = ()=>{
  if(!currentUser || !fbReady || !db){ setGuildMsg('Cần đăng nhập.'); return; }
  const name = (document.getElementById('guildNameInput').value || '').trim();
  if(!name){ setGuildMsg('Nhập tên Guild.'); return; }
  if(wallet < GUILD_CREATE_COST){ setGuildMsg(`Cần ${fmtMoney(GUILD_CREATE_COST)} 💰 để tạo Guild.`); return; }
  const ref = db.ref('guilds').push();
  ref.set({
    name, ownerUid: currentUser.uid, ownerName: myDisplayName||'Người chơi',
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    members: { [currentUser.uid]: { name: myDisplayName||'Người chơi', joinedAt: firebase.database.ServerValue.TIMESTAMP } },
  }).then(()=> db.ref('userGuild/'+currentUser.uid).set(ref.key))
    .then(()=>{
      wallet -= GUILD_CREATE_COST; saveGame(); renderWallet();
      setGuildMsg('Đã tạo Guild!');
    }).catch(e=> setGuildMsg('Lỗi: '+e.message));
};
function requestJoinGuild(gid){
  if(!currentUser || !fbReady || !db) return;
  if(myGuildId){ setGuildMsg('Bạn cần rời Guild hiện tại trước.'); return; }
  db.ref(`guilds/${gid}/joinRequests/${currentUser.uid}`).set({ name: myDisplayName||'Người chơi', requestedAt: firebase.database.ServerValue.TIMESTAMP })
    .then(()=>{
      pendingGuildRequestId = gid;
      localStorage.setItem('sanCoVang_pendingGuildRequest', gid);
      setGuildMsg('Đã gửi yêu cầu tham gia — chờ chủ Guild duyệt!');
      renderGuildBrowseList();
    }).catch(e=> setGuildMsg('Lỗi: '+e.message));
}
document.getElementById('guildLeaveBtn').onclick = ()=>{
  if(!currentUser || !myGuildId || !fbReady || !db) return;
  if(!confirm('Rời Guild hiện tại?')) return;
  db.ref(`guilds/${myGuildId}/members/${currentUser.uid}`).remove()
    .then(()=> db.ref('userGuild/'+currentUser.uid).remove())
    .then(()=> setGuildMsg('Đã rời Guild.'))
    .catch(e=> setGuildMsg('Lỗi: '+e.message));
};
document.getElementById('toGuildBtn').onclick = ()=>{ setGuildMsg(''); renderGuildScreen(); showScreen('guildScreen'); };
document.getElementById('backBtnGuild').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
document.getElementById('guildChatBtn').onclick = ()=>{
  document.querySelectorAll('#chatChannelTabs .tactic-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('chatGuildTab').classList.add('active');
  chatChannel = 'guild';
  stopChatListener();
  if(chatEnabled) startChatListener();
  renderChatMessages(); renderPinnedAnnouncement();
  showScreen('chatScreen');
};

// ================= ĐẤU GIÁ (AUCTION) =================
let auctionData = {};
function listenAuctions(){
  if(!fbReady || !db) return;
  db.ref('auctions').on('value', snap=>{
    auctionData = snap.val() || {};
    renderAuctionList();
    checkMyAuctionWins();
  });
}
function fmtAuctionCountdown(endsAt){
  const ms = endsAt - Date.now();
  if(ms <= 0) return 'Đã kết thúc';
  const totalSec = Math.floor(ms/1000);
  const h = Math.floor(totalSec/3600), m = Math.floor((totalSec%3600)/60), s = totalSec%60;
  return h>0 ? `${h}h${m}p còn lại` : `${m}p${s}s còn lại`;
}
function renderAuctionList(){
  const box = document.getElementById('auctionList');
  if(!box) return;
  renderWallet();
  const keys = Object.keys(auctionData);
  box.innerHTML = keys.length ? keys.map(key=>{
    const a = auctionData[key];
    const lvlClass = a.level==='forbidden'?' forbidden':a.level==='superior'?' superior':a.level==='future'?' future':a.level==='owner'?' owner':(a.legend?' legend':'');
    const ended = Date.now() >= a.endsAt;
    const roleTag = a.level==='owner'?'👑 OWNER':a.level==='forbidden'?'⬛⬜ FORBIDDEN':a.level==='superior'?'🌈 SUPERIOR':a.level==='future'?'🔵 FUTURE':(a.legend?'🌟 HUYỀN THOẠI':a.role);
    return `<div class="market-card${lvlClass}">
      <div class="mc-top"><span class="ovr-badge ${ovrTier(a.ovr)}">${a.ovr}</span><b>${escapeHtml(a.name)}</b><span class="role-tag">${roleTag}</span></div>
      <div style="font-size:12px; margin-bottom:6px;">💰 Giá hiện tại: <b>${fmtMoney(a.currentBid||a.startPrice)}</b>${a.currentBidderName?` — dẫn đầu: <b>${escapeHtml(a.currentBidderName)}</b>`:''}</div>
      <div style="font-size:11px; color:var(--amber); margin-bottom:8px;">⏳ ${fmtAuctionCountdown(a.endsAt)}</div>
      ${!ended ? `<div class="mc-bottom"><input type="number" min="${(a.currentBid||a.startPrice)+50}" placeholder="Giá thầu..." id="bid-${key}" style="width:110px; padding:6px 8px; border-radius:8px; border:1px solid #2c5d42; background:var(--panel-3); color:var(--ink);"><button class="btn buy-btn" data-key="${key}">Đặt giá</button></div>` : `<div class="mc-bottom"><span style="color:var(--muted);">Phiên đã kết thúc — chờ xử lý...</span></div>`}
    </div>`;
  }).join('') : '<div class="hub-note">Hiện chưa có phiên đấu giá nào.</div>';
  box.querySelectorAll('[data-key]').forEach(b=>{
    b.onclick = ()=> placeBid(b.dataset.key);
  });
}
function placeBid(key){
  if(!currentUser || !fbReady || !db){ document.getElementById('auctionMsg').textContent = 'Cần đăng nhập.'; return; }
  const input = document.getElementById('bid-'+key);
  const amount = parseInt(input.value, 10);
  const a = auctionData[key];
  if(!a || Date.now() >= a.endsAt){ document.getElementById('auctionMsg').textContent = 'Phiên đã kết thúc.'; return; }
  const minBid = (a.currentBid||a.startPrice) + 50;
  if(!amount || amount < minBid){ document.getElementById('auctionMsg').textContent = `Giá thầu tối thiểu: ${fmtMoney(minBid)}`; return; }
  if(amount > wallet){ document.getElementById('auctionMsg').textContent = 'Bạn không đủ tiền cho giá thầu này.'; return; }
  db.ref('auctions/'+key).transaction(cur=>{
    if(!cur || Date.now() >= cur.endsAt) return; // hết giờ -> abort
    if(amount <= (cur.currentBid||cur.startPrice)) return; // ai đó vừa trả cao hơn -> abort
    cur.currentBid = amount; cur.currentBidderUid = currentUser.uid; cur.currentBidderName = myDisplayName||'Người chơi';
    return cur;
  }).then(res=>{
    document.getElementById('auctionMsg').textContent = res.committed ? 'Đặt giá thành công!' : 'Đặt giá thất bại — có người trả cao hơn hoặc phiên đã đóng.';
  });
}
function checkMyAuctionWins(){
  if(!currentUser) return;
  Object.keys(auctionData).forEach(key=>{
    const a = auctionData[key];
    if(Date.now() >= a.endsAt && !a.settled){
      // Hết giờ nhưng chưa chốt -> client đầu tiên phát hiện sẽ chốt (transaction chống đua)
      db.ref('auctions/'+key+'/settled').transaction(cur=> cur ? undefined : true);
    }
    if(a.settled && a.currentBidderUid === currentUser.uid && !a.claimed){
      const msg = acquirePlayer({ name:a.name, role:a.role, ovr:a.ovr, price:a.currentBid, legend:a.legend, level:a.level });
      saveGame();
      db.ref('auctions/'+key+'/claimed').set(true).then(()=>{
        flashBannerGeneric && null;
        alert(`🎉 Bạn đã thắng đấu giá ${a.name}! ${msg}`);
        renderSquadHub(); renderAuctionList();
      });
    }
  });
}
document.getElementById('toAuctionBtn').onclick = ()=>{ renderAuctionList(); showScreen('auctionScreen'); };
document.getElementById('backBtnAuction').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
if(fbReady) listenAuctions();
setInterval(()=>{ if(document.getElementById('auctionScreen').classList.contains('active')) renderAuctionList(); checkMyAuctionWins(); }, 5000);

// ================= PROMOCODE =================
document.getElementById('toPromoBtn').onclick = ()=>{ document.getElementById('promoMsg').textContent=''; showScreen('promoScreen'); };
document.getElementById('backBtnPromo').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };
document.getElementById('promoRedeemBtn').onclick = async ()=>{
  const msgEl = document.getElementById('promoMsg');
  if(!currentUser || !fbReady || !db){ msgEl.textContent = 'Cần đăng nhập để nhập code.'; return; }
  const code = (document.getElementById('promoInput').value || '').trim().toUpperCase();
  if(!code){ return; }
  msgEl.textContent = 'Đang kiểm tra...';
  try{
    const [codeSnap, redeemedSnap] = await Promise.all([
      db.ref('promoCodes/'+code).once('value'),
      db.ref('promoRedemptions/'+code+'/'+currentUser.uid).once('value'),
    ]);
    const info = codeSnap.val();
    if(!info){ msgEl.textContent = 'Code không tồn tại.'; return; }
    if(redeemedSnap.exists()){ msgEl.textContent = 'Bạn đã dùng code này rồi.'; return; }
    if(info.maxUses && (info.usedCount||0) >= info.maxUses){ msgEl.textContent = 'Code đã hết lượt sử dụng.'; return; }
    if(info.expiresAt && Date.now() > info.expiresAt){ msgEl.textContent = 'Code đã hết hạn.'; return; }
    // Đánh dấu đã dùng trước (transaction tăng usedCount an toàn khi nhiều người cùng nhập)
    const txRes = await db.ref('promoCodes/'+code+'/usedCount').transaction(cur=>{
      const c = cur || 0;
      if(info.maxUses && c >= info.maxUses) return; // abort
      return c + 1;
    });
    if(!txRes.committed){ msgEl.textContent = 'Code vừa hết lượt sử dụng.'; return; }
    await db.ref('promoRedemptions/'+code+'/'+currentUser.uid).set(true);
    let rewardMsg = '';
    if(info.rewardType === 'gold'){
      wallet += info.amount || 0;
      rewardMsg = `+${fmtMoney(info.amount||0)} 💰`;
    } else if(info.rewardType === 'card'){
      const pool = ADMIN_RARITY_POOLS[info.tier] || MARKET_POOL_SEED;
      const card = { ...pickRandom(pool) };
      rewardMsg = acquirePlayer(card);
    }
    saveGame(); renderWallet(); renderSquadHub();
    msgEl.textContent = `🎉 Nhận thưởng thành công! ${rewardMsg}`;
    document.getElementById('promoInput').value = '';
  }catch(e){ msgEl.textContent = 'Lỗi: '+e.message; }
};

// ================= TÊN LẤP LÁNH NHIỀU DANH HIỆU =================
function getUserTitleClass(uid, name, colorId){
  if((name||'').toLowerCase() === ADMIN_NAME) return { cls:'chat-name-owner', prefix:'👑 ', style:'' };
  if(top1Uid && uid === top1Uid) return { cls:'chat-name-top1', prefix:'🥇 ', style:'' };
  if(uid && top3Uids.has(uid)) return { cls:'chat-name-top3', prefix:'', style:'' };
  if(myGuildData && myGuildData.ownerUid === uid) return { cls:'chat-name-guild', prefix:'🛡️ ', style:'' };
  if(colorId === 'redgold') return { cls:'chat-name-winner26', prefix:'🏆 ', style:'' };
  const c = NAME_COLOR_CATALOG.find(x=>x.id===colorId);
  if(c) return { cls:'', prefix:'', style:`color:${c.hex};font-weight:800;` };
  return { cls:'', prefix:'', style:'' };
}

// ================= MÀU TÊN (NAME COLOR) =================
// Màu bình thường bán trong Shop — KHÔNG bao gồm Vàng (Top BXH) và Tím (Owner), 2 màu đó không bán.
const NAME_COLOR_CATALOG = [
  { id:'red',    label:'Đỏ',           hex:'#ff5f5f', price:2000 },
  { id:'orange', label:'Cam',          hex:'#ffa552', price:2000 },
  { id:'green',  label:'Xanh lá',      hex:'#5fe085', price:2000 },
  { id:'cyan',   label:'Xanh da trời', hex:'#5fd0ff', price:2000 },
  { id:'blue',   label:'Xanh dương',   hex:'#5f8fff', price:2000 },
  { id:'pink',   label:'Hồng',         hex:'#ff8fd6', price:2000 },
  { id:'white',  label:'Trắng',        hex:'#ffffff', price:2000 },
  { id:'lime',   label:'Xanh chuối',   hex:'#c6ff5f', price:2000 },
];
let myOwnedColors = {};   // { colorId: true }
let myNameColor = null;   // colorId đang trang bị
function saveNameColorData(){
  if(!currentUser || !fbReady || !db) return;
  db.ref('users/'+currentUser.uid+'/profile/ownedColors').set(myOwnedColors);
  db.ref('users/'+currentUser.uid+'/profile/nameColor').set(myNameColor);
  updateLeaderboardEntry();
}
function checkWinner26Complete(){
  if(!selfTeam || !currentUser) return false;
  const squad = ensureSquad(selfTeam);
  const owned = new Set([...squad.starters, ...squad.bench].filter(p=>p.level==='winner26').map(p=>p.name));
  const complete = WINNER26_POOL.every(p=> owned.has(p.name));
  if(complete && !myOwnedColors['redgold']){
    myOwnedColors = { ...myOwnedColors, redgold:true };
    saveNameColorData();
    alert('🏆 Chúc mừng! Bạn đã sở hữu ĐỦ 11 cầu thủ Winner26 — mở khoá màu tên VÀNG-ĐỎ đặc biệt! Vào Cài đặt để trang bị.');
  }
  return complete;
}
function buyNameColor(colorId){
  const c = NAME_COLOR_CATALOG.find(x=>x.id===colorId);
  if(!c || myOwnedColors[colorId]) return;
  if(wallet < c.price){ document.getElementById('shopMsg').textContent = 'Không đủ tiền!'; return; }
  wallet -= c.price;
  myOwnedColors = { ...myOwnedColors, [colorId]:true };
  saveGame(); saveNameColorData(); renderWallet();
  document.getElementById('shopMsg').textContent = `Đã mua màu ${c.label}!`;
  renderShopColors();
}
function equipNameColor(colorId){
  if(colorId !== null && !myOwnedColors[colorId]) return;
  myNameColor = colorId;
  saveNameColorData();
  renderShopColors(); renderSettingsColors();
}
function colorSwatchHtml(c, owned, equipped){
  if(!owned){
    return `<div class="color-swatch locked">
      <div class="color-swatch-dot locked-dot">??</div>
      <div class="color-swatch-label">???</div>
      ${c.price ? `<div class="color-swatch-price">${fmtMoney(c.price)} 💰</div>` : ''}
    </div>`;
  }
  return `<div class="color-swatch${equipped?' equipped':''}" data-color-id="${c.id}">
    <div class="color-swatch-dot" style="background:${c.hex};"></div>
    <div class="color-swatch-label">${c.label}${equipped?' ✓':''}</div>
  </div>`;
}
function renderShopColors(){
  renderWallet();
  const box = document.getElementById('shopColorGrid');
  if(!box) return;
  box.innerHTML = NAME_COLOR_CATALOG.map(c=>{
    const owned = !!myOwnedColors[c.id];
    if(!owned){
      return `<div class="color-swatch" data-buy-color="${c.id}">
        <div class="color-swatch-dot" style="background:${c.hex}; opacity:.45;"></div>
        <div class="color-swatch-label">${c.label}</div>
        <div class="color-swatch-price">${fmtMoney(c.price)} 💰</div>
      </div>`;
    }
    return colorSwatchHtml(c, true, myNameColor===c.id).replace('<div class="color-swatch', `<div data-equip-color="${c.id}" class="color-swatch`);
  }).join('');
  box.querySelectorAll('[data-buy-color]').forEach(el=> el.onclick = ()=> buyNameColor(el.dataset.buyColor));
  box.querySelectorAll('[data-equip-color]').forEach(el=> el.onclick = ()=> equipNameColor(el.dataset.equipColor));
}
function renderSettingsColors(){
  const box = document.getElementById('settingsColorGrid');
  if(!box) return;
  const defaultSwatch = `<div class="color-swatch${!myNameColor?' equipped':''}" data-equip-color="__default__">
    <div class="color-swatch-dot" style="background:#cfd6dc;"></div>
    <div class="color-swatch-label">Mặc định${!myNameColor?' ✓':''}</div>
  </div>`;
  const ownedSwatches = NAME_COLOR_CATALOG.map(c=> colorSwatchHtml(c, !!myOwnedColors[c.id], myNameColor===c.id)
    .replace('<div class="color-swatch', myOwnedColors[c.id] ? `<div data-equip-color="${c.id}" class="color-swatch` : '<div class="color-swatch')).join('');
  const redgoldOwned = !!myOwnedColors['redgold'];
  const redgoldSwatch = redgoldOwned
    ? `<div class="color-swatch${myNameColor==='redgold'?' equipped':''}" data-equip-color="redgold">
        <div class="color-swatch-dot" style="background:linear-gradient(135deg,#7a0d0d,#ffd60a);"></div>
        <div class="color-swatch-label">🏆 Vàng-Đỏ${myNameColor==='redgold'?' ✓':''}</div>
      </div>`
    : `<div class="color-swatch locked"><div class="color-swatch-dot locked-dot">??</div><div class="color-swatch-label">???</div></div>`;
  box.innerHTML = defaultSwatch + ownedSwatches + redgoldSwatch;
  box.querySelectorAll('[data-equip-color]').forEach(el=>{
    el.onclick = ()=> equipNameColor(el.dataset.equipColor === '__default__' ? null : el.dataset.equipColor);
  });
}
document.getElementById('toShopBtn').onclick = ()=>{ document.getElementById('shopMsg').textContent=''; renderShopColors(); showScreen('shopScreen'); };
document.getElementById('backBtnShop').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };

// ================= BLOCK NGƯỜI CHƠI (chỉ ẩn phía bạn) =================
function getBlockedUids(){
  try{ return JSON.parse(localStorage.getItem('sanCoVang_blocked')||'[]'); }catch(e){ return []; }
}
function isBlocked(uid){ return getBlockedUids().includes(uid); }
function toggleBlockUser(uid){
  let list = getBlockedUids();
  if(list.includes(uid)) list = list.filter(u=>u!==uid);
  else list.push(uid);
  localStorage.setItem('sanCoVang_blocked', JSON.stringify(list));
  renderChatMessages();
}

// ================= TIN NHẮN RIÊNG (DM) =================
let dmPeerUid = null, dmPeerName = null, dmListenerRef = null;
function dmPairKey(a,b){ return [a,b].sort().join('_'); }
function openDm(uid, name){
  if(!currentUser) return;
  dmPeerUid = uid; dmPeerName = name;
  document.getElementById('dmPeerName').textContent = escapeHtml(name);
  if(dmListenerRef) dmListenerRef.off();
  dmListenerRef = db.ref('dms/'+dmPairKey(currentUser.uid, uid)).orderByChild('at').limitToLast(50);
  dmListenerRef.on('value', snap=>{
    const val = snap.val() || {};
    const msgs = Object.values(val).sort((a,b)=>(a.at||0)-(b.at||0));
    const box = document.getElementById('dmBox');
    box.innerHTML = msgs.length ? msgs.map(m=>{
      const mine = m.fromUid === currentUser.uid;
      return `<div class="chat-msg" style="text-align:${mine?'right':'left'};"><b style="font-size:11px;color:var(--muted);">${mine?'Bạn':escapeHtml(m.fromName)}</b><div>${escapeHtml(filterProfanity(m.text||''))}</div></div>`;
    }).join('') : '<div class="hub-note">Chưa có tin nhắn nào.</div>';
    box.scrollTop = box.scrollHeight;
  });
  showScreen('dmScreen');
}
document.getElementById('dmSendBtn').onclick = ()=>{
  if(!currentUser || !dmPeerUid || !fbReady || !db) return;
  const input = document.getElementById('dmInput');
  const text = filterProfanity((input.value||'').trim());
  if(!text) return;
  db.ref('dms/'+dmPairKey(currentUser.uid, dmPeerUid)).push({
    fromUid: currentUser.uid, fromName: myDisplayName||'Người chơi', toUid: dmPeerUid, text,
    at: firebase.database.ServerValue.TIMESTAMP,
  }).then(()=>{ input.value=''; });
};
document.getElementById('dmInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') document.getElementById('dmSendBtn').click(); });
document.getElementById('backBtnDm').onclick = ()=>{
  if(dmListenerRef){ dmListenerRef.off(); dmListenerRef=null; }
  renderSquadHub(); showScreen('squadHubScreen');
};

// ================= BẠN BÈ =================
function setFriendMsg(t){ document.getElementById('friendMsg').textContent = t; }

function listenFriendRequests(){
  if(!fbReady || !currentUser) return;
  db.ref('users/'+currentUser.uid+'/friendRequests/incoming').on('value', snap=>{
    renderFriendRequests(snap.val() || {});
  });
}

function renderFriendRequests(reqs){
  const box = document.getElementById('friendRequestsBox');
  const keys = Object.keys(reqs);
  if(!keys.length){ box.style.display = 'none'; box.innerHTML = ''; return; }
  box.style.display = '';
  box.innerHTML = `<h4>📨 Lời mời kết bạn (${keys.length})</h4>` + keys.map(uid=>{
    const r = reqs[uid];
    return `<p style="display:flex; align-items:center; gap:10px; justify-content:space-between;">
      <span>${r.displayName || 'Người chơi'}</span>
      <span>
        <button class="btn buy-btn" data-act="accept" data-uid="${uid}" style="padding:5px 12px; font-size:11px;">✅ Đồng ý</button>
        <button class="btn ghost buy-btn" data-act="decline" data-uid="${uid}" style="padding:5px 12px; font-size:11px;">✖ Từ chối</button>
      </span>
    </p>`;
  }).join('');
  box.querySelectorAll('[data-act="accept"]').forEach(b=> b.onclick = ()=> acceptFriendRequest(b.dataset.uid));
  box.querySelectorAll('[data-act="decline"]').forEach(b=> b.onclick = ()=> declineFriendRequest(b.dataset.uid));
}

async function acceptFriendRequest(fromUid){
  if(!fbReady || !currentUser) return;
  try{
    await db.ref('users/'+currentUser.uid+'/friends/'+fromUid).set(true);
    await db.ref('users/'+fromUid+'/friends/'+currentUser.uid).set(true);
    await db.ref('users/'+currentUser.uid+'/friendRequests/incoming/'+fromUid).remove();
    await db.ref('users/'+fromUid+'/friendRequests/outgoing/'+currentUser.uid).remove();
    setFriendMsg('Đã trở thành bạn bè!');
    renderFriendsList();
  }catch(e){ setFriendMsg('Có lỗi xảy ra khi đồng ý kết bạn.'); }
}
async function declineFriendRequest(fromUid){
  if(!fbReady || !currentUser) return;
  try{
    await db.ref('users/'+currentUser.uid+'/friendRequests/incoming/'+fromUid).remove();
    await db.ref('users/'+fromUid+'/friendRequests/outgoing/'+currentUser.uid).remove();
  }catch(e){}
}

document.getElementById('friendSearchBtn').onclick = async ()=>{
  if(!fbReady || !currentUser){ setFriendMsg('Bạn cần đăng nhập (không phải chế độ offline) để dùng tính năng bạn bè.'); return; }
  const name = document.getElementById('friendSearchInput').value.trim();
  if(!name){ setFriendMsg('Nhập tên hiển thị cần tìm.'); return; }
  setFriendMsg('Đang tìm...');
  try{
    const snap = await db.ref('usernames/'+name.toLowerCase()).once('value');
    const uid = snap.val();
    if(!uid){ setFriendMsg('Không tìm thấy người chơi với tên này.'); return; }
    if(uid === currentUser.uid){ setFriendMsg('Không thể tự kết bạn với chính mình 😄'); return; }
    const friendSnap = await db.ref('users/'+currentUser.uid+'/friends/'+uid).once('value');
    if(friendSnap.val()){ setFriendMsg('Hai bạn đã là bạn bè rồi!'); return; }
    await db.ref('users/'+uid+'/friendRequests/incoming/'+currentUser.uid).set({ displayName: myDisplayName || 'Người chơi', at: Date.now() });
    await db.ref('users/'+currentUser.uid+'/friendRequests/outgoing/'+uid).set({ displayName: name, at: Date.now() });
    setFriendMsg(`Đã gửi lời mời kết bạn tới "${name}"!`);
    document.getElementById('friendSearchInput').value = '';
  }catch(e){ setFriendMsg('Có lỗi xảy ra, thử lại nhé.'); }
};

async function renderFriendsList(){
  const list = document.getElementById('friendsList');
  if(!fbReady || !currentUser){ list.innerHTML = '<div class="hub-note">Đăng nhập để dùng tính năng bạn bè.</div>'; return; }
  list.innerHTML = '<div class="hub-note">Đang tải...</div>';
  try{
    const snap = await db.ref('users/'+currentUser.uid+'/friends').once('value');
    const friends = snap.val() || {};
    const uids = Object.keys(friends);
    if(!uids.length){ list.innerHTML = '<div class="hub-note">Chưa có bạn bè nào — thử tìm và kết bạn ở trên nhé!</div>'; return; }
    const entries = await Promise.all(uids.map(uid=> db.ref('leaderboard/'+uid).once('value').then(s=>({uid, data:s.val()}))));
    list.innerHTML = '';
    entries.forEach(({uid,data})=>{
      const div = document.createElement('div');
      div.className = 'squad-slot';
      div.style.cursor = 'default';
      if(!data){
        div.innerHTML = `<span class="sname">Người chơi (${uid.slice(0,6)})</span><span class="role-tag">Chưa có dữ liệu</span>`;
      } else {
        div.innerHTML = `<span class="role-tag">${data.teamFlag||''}</span><span class="sname">${escapeHtml(data.displayName||'Người chơi')} <span style="color:var(--muted);font-size:11px;">(${escapeHtml(data.teamName||'')})</span></span>
          <span class="ovr-badge gold" title="OVR trung bình">${data.avgOvr||0}</span>
          <span style="font-size:11px;color:var(--amber);">${fmtMoney(data.wallet||0)}💰</span>
          <span style="font-size:11px;color:#7be3a0;">🏆${data.wins||0}</span>
          <button class="btn buy-btn" data-gift-uid="${uid}" data-gift-name="${escapeHtml(data.displayName||'Người chơi')}">🎁 Tặng</button>`;
      }
      list.appendChild(div);
    });
    list.querySelectorAll('[data-gift-uid]').forEach(b=>{
      b.onclick = ()=> openGiftPicker(b.dataset.giftUid, b.dataset.giftName);
    });
  }catch(e){ list.innerHTML = '<div class="hub-note">Không tải được danh sách bạn bè.</div>'; }
}

document.getElementById('toFriendsBtn').onclick = ()=>{
  setFriendMsg('');
  renderFriendsList();
  showScreen('friendsScreen');
};
document.getElementById('backBtnFriends').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };

// ================= BẢNG XẾP HẠNG =================
let lbSort = 'ovr';
function setLbMsg(t){ document.getElementById('leaderboardMsg').textContent = t; }

async function renderLeaderboard(){
  const box = document.getElementById('leaderboardList');
  if(!fbReady){ box.innerHTML = ''; setLbMsg('Firebase chưa sẵn sàng.'); return; }
  setLbMsg('Đang tải bảng xếp hạng...');
  box.innerHTML = '';
  try{
    const snap = await db.ref('leaderboard').once('value');
    const all = snap.val() || {};
    let rows = Object.keys(all).map(uid=> ({ uid, ...all[uid] }));
    const keyMap = { ovr:'avgOvr', wallet:'wallet', wins:'wins' };
    const key = keyMap[lbSort];
    rows.sort((a,b)=> (b[key]||0)-(a[key]||0));
    rows = rows.slice(0, 20);
    if(!rows.length){ setLbMsg(''); box.innerHTML = '<p>Chưa có ai trên bảng xếp hạng — hãy là người đầu tiên!</p>'; return; }
    const medals = ['🥇','🥈','🥉'];
    const valueLabel = lbSort==='ovr' ? (r)=>`OVR ${r.avgOvr||0}` : lbSort==='wallet' ? (r)=>`${fmtMoney(r.wallet||0)} 💰` : (r)=>`${r.wins||0} trận thắng`;
    box.innerHTML = `<h4>${lbSort==='ovr'?'💪 OVR đội hình mạnh nhất':lbSort==='wallet'?'💰 Nhiều tiền nhất':'🏆 Thắng nhiều nhất'}</h4>` +
      rows.map((r,i)=>{
        const title = getUserTitleClass(r.uid, r.displayName, r.nameColor);
        const nameHtml = `<span class="${title.cls}" style="cursor:pointer;${title.style}" data-profile-uid="${r.uid}">${title.prefix}${escapeHtml(r.displayName||'Người chơi')}</span>`;
        return `<p style="display:flex; justify-content:space-between; ${currentUser && r.uid===currentUser.uid ? 'color:var(--amber);font-weight:800;' : ''}">
        <span>${medals[i]||(i+1)+'.'} ${r.teamFlag||''} ${nameHtml} <span style="color:var(--muted);font-weight:400;font-size:11px;">(${escapeHtml(r.teamName||'')})</span></span>
        <span><b>${valueLabel(r)}</b></span>
      </p>`;
      }).join('');
    box.querySelectorAll('[data-profile-uid]').forEach(el=>{
      el.onclick = ()=> showProfileModal(el.dataset.profileUid);
    });
    setLbMsg('');
  }catch(e){ setLbMsg('Không tải được bảng xếp hạng, thử lại nhé.'); }
}

document.querySelectorAll('#lbTabRow .tactic-btn').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('#lbTabRow .tactic-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    lbSort = btn.dataset.lb;
    renderLeaderboard();
  };
});

document.getElementById('toLeaderboardBtn').onclick = ()=>{
  renderLeaderboard();
  showScreen('leaderboardScreen');
};
document.getElementById('backBtnLeaderboard').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };

document.getElementById('toAdminBtn').onclick = ()=>{
  if(!isAdminUser()){ updateAdminUI(); return; }
  setAdminMsg('');
  populateAdminCardSelect();
  populateAdminAuctionCardSelect();
  renderAdminGlobalShop();
  renderAdminTxLog();
  refreshAdminSeasonNum();
  showScreen('adminScreen');
};
document.getElementById('adminRaritySelect').onchange = populateAdminCardSelect;
document.getElementById('adminSpawnBtn').onclick = ()=>{
  const rarityKey = document.getElementById('adminRaritySelect').value;
  const cardIdx = parseInt(document.getElementById('adminCardSelect').value, 10) || 0;
  const priceVal = parseInt(document.getElementById('adminPriceInput').value, 10);
  const qtyVal = parseInt(document.getElementById('adminQtyInput').value, 10);
  spawnToServerShop(rarityKey, cardIdx, isNaN(priceVal) ? null : priceVal, isNaN(qtyVal) ? 1 : qtyVal);
};
document.getElementById('backBtnAdmin').onclick = ()=>{ renderSquadHub(); showScreen('squadHubScreen'); };

document.querySelectorAll('#tacticRow .tactic-btn').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('#tacticRow .tactic-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    tactic = btn.dataset.tactic;
  };
});

document.querySelectorAll('#modeRow .mode-btn').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('#modeRow .mode-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    matchMode = btn.dataset.mode;
  };
});

function fillConfirm(){
  let noteEl = document.getElementById('confirmContextNote');
  if(!noteEl){
    noteEl = document.createElement('div');
    noteEl.id = 'confirmContextNote';
    noteEl.className = 'subtitle';
    noteEl.style.marginBottom = '0';
    document.querySelector('#confirmScreen .vs-row').before(noteEl);
  }
  if(matchContext==='scout' && scoutPending){
    noteEl.textContent = `🔭 Trận Scout — thắng/thua không ảnh hưởng, gói nhận được RANDOM · đối thủ càng khó (★) tỉ lệ ra gói Legendary càng cao`;
    noteEl.style.display = '';
  } else if(matchContext==='worldcup' && worldCup){
    noteEl.textContent = `🏆 World Cup — ${WC_ROUND_NAMES[worldCup.round]}`;
    noteEl.style.display = '';
  } else {
    noteEl.textContent = '';
    noteEl.style.display = 'none';
  }
  document.getElementById('confirmSelf').innerHTML =
    `<div class="flag" style="font-size:40px;">${selfTeam.flag}</div><div class="tname">${selfTeam.name}</div><div class="stars">${starsHtml(selfTeam.stars)}</div><div style="font-size:11px;color:var(--muted);margin-top:4px;">Đội của bạn</div>`;
  document.getElementById('confirmOpp').innerHTML =
    `<div class="flag" style="font-size:40px;">${oppTeam.flag}</div><div class="tname">${oppTeam.name}</div><div class="stars">${starsHtml(oppTeam.stars)}</div><div style="font-size:11px;color:var(--muted);margin-top:4px;">Đối thủ (máy) · ${diffLabel(oppTeam.stars)}</div>`;
  tactic = 'balanced';
  document.querySelectorAll('#tacticRow .tactic-btn').forEach(b=> b.classList.toggle('active', b.dataset.tactic==='balanced'));
  matchMode = 'manual';
  document.querySelectorAll('#modeRow .mode-btn').forEach(b=> b.classList.toggle('active', b.dataset.mode==='manual'));
}

// ---------------- WORLD CUP EVENT ----------------
function openWorldCupHub(){
  if(!worldCup){
    const pool = shuffleArr(TEAMS.filter(t=>t.id!==selfTeam.id)).sort((a,b)=>a.stars-b.stars);
    worldCup = { round:0, opponents: pool.slice(0,3), status:'active' };
    saveGame();
  }
  renderWorldCup();
  showScreen('worldCupScreen');
}

function renderWorldCup(){
  if(!worldCup) return;
  const box = document.getElementById('wcBracketBox');
  const rows = WC_ROUND_NAMES.map((label,i)=>{
    const opp = worldCup.opponents[i];
    let statusTxt = 'Sắp đấu';
    if(i < worldCup.round) statusTxt = '✅ Đã thắng';
    else if(i === worldCup.round && worldCup.status==='active') statusTxt = '▶ Hiện tại';
    if(worldCup.status==='eliminated' && i===worldCup.round) statusTxt = '❌ Đã thua';
    return `<p><b>${label}</b> — vs ${opp.flag} ${opp.name} (${starsHtml(opp.stars)}) · ${statusTxt}</p>`;
  }).join('');
  box.innerHTML = `<h4>🏆 Bảng đấu</h4>${rows}`;

  const vsRow = document.getElementById('wcVsRow');
  const playBtn = document.getElementById('wcPlayBtn');
  if(worldCup.status==='champion'){
    document.getElementById('wcSubtitle').textContent = '🏆 BẠN ĐÃ VÔ ĐỊCH WORLD CUP!';
    vsRow.innerHTML = '';
    playBtn.style.display = 'none';
  } else if(worldCup.status==='eliminated'){
    document.getElementById('wcSubtitle').textContent = 'Bạn đã bị loại khỏi World Cup lần này.';
    vsRow.innerHTML = '';
    playBtn.textContent = 'Bắt đầu lượt World Cup mới';
    playBtn.style.display = '';
    playBtn.onclick = ()=>{ worldCup=null; openWorldCupHub(); };
  } else {
    const opp = worldCup.opponents[worldCup.round];
    document.getElementById('wcSubtitle').textContent = `${WC_ROUND_NAMES[worldCup.round]} · Thắng để đi tiếp`;
    vsRow.innerHTML = `<div class="vs-card"><div class="flag" style="font-size:34px;">${selfTeam.flag}</div><div class="tname">${selfTeam.name}</div></div>
      <div class="vs-text">VS</div>
      <div class="vs-card"><div class="flag" style="font-size:34px;">${opp.flag}</div><div class="tname">${opp.name}</div><div class="stars">${starsHtml(opp.stars)}</div></div>`;
    playBtn.textContent = 'Đá vòng đấu';
    playBtn.style.display = '';
    playBtn.onclick = playWorldCupRound;
  }
}

function playWorldCupRound(){
  if(!worldCup || worldCup.status!=='active') return;
  oppTeam = worldCup.opponents[worldCup.round];
  ensureSquad(oppTeam);
  matchContext = 'worldcup';
  scoutPending = null;
  fillConfirm();
  showScreen('confirmScreen');
}

document.getElementById('startBtn').onclick = startMatch;
document.getElementById('playAgainBtn').onclick = ()=> showScreen('pickTeamScreen');

function makeTeamPlayers(teamData, side){
  const squad = ensureSquad(teamData);
  const arr = [];
  for(let i=0;i<11;i++){
    const f = FORMATION[i];
    const def = squad.starters[i];
    const slotRole = ROLE_ORDER[i];
    const effOvr = getSlotEffectiveOvr(def, i);
    arr.push({
      id: side+'_'+i, team: side, role: slotRole, isGK: slotRole==='GK',
      name: def.name, number: def.number, ovr: effOvr, level: def.level,
      x: fx(f.x, side), y: fy(f.y),
      homeNX: f.x, homeNY: f.y,
      facingX: side==='A'?1:-1, facingY:0,
      tackleCd:0, pickupCd:0,
      colorMain: teamData.c1, colorAcc: teamData.c2,
      skill: teamData.stars,
      stamina: 100, yellowCards: 0, sentOff: false,
    });
  }
  return arr;
}

function resetKickoff(fullReset){
  if(fullReset || !players.length){
    const pA = makeTeamPlayers(selfTeam, 'A');
    const pB = makeTeamPlayers(oppTeam, 'B');
    players = pA.concat(pB);
  } else {
    for(const p of players){
      if(p.sentOff) continue; // stays off the pitch for the rest of the match
      const f = FORMATION[p.number-1];
      p.x = fx(f.x, p.team); p.y = fy(f.y);
    }
  }
  ball.x = CW/2; ball.y = CH/2; ball.vx=0; ball.vy=0; ball.z=0; ball.vz=0; ball.owner=null;
  lastTouchTeam = null;
  if(!controlled || controlled.sentOff){
    controlled = players.find(p=>p.team==='A' && p.role==='FW' && !p.sentOff) || players.find(p=>p.team==='A' && !p.sentOff);
  }
  charging = false; chargeProgress = 0;
  kickoffPauseUntil = performance.now() + 900;
}

function startMatch(){
  score.A = 0; score.B = 0;
  matchTime = 180;
  particles = [];
  matchGoals = [];
  lastShooter = null;
  lastTouchTeam = null;
  totalCards = 0;

  if(matchMode === 'sim'){
    runSimulation();
    return;
  }

  document.getElementById('nameA').textContent = `${selfTeam.flag} ${selfTeam.name}`;
  document.getElementById('nameB').textContent = `${oppTeam.name} ${oppTeam.flag}`;
  document.getElementById('dotA').style.background = selfTeam.c1;
  document.getElementById('dotB').style.background = oppTeam.c1;
  document.getElementById('cardsInfo').textContent = 'Thẻ phạt: 0';
  updateScoreHud();
  resetKickoff(true);
  showScreen('matchScreen');
  running = true;
  lastTs = performance.now();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

function updateScoreHud(){ document.getElementById('score').textContent = `${score.A} - ${score.B}`; }

window.addEventListener('keydown', (e)=>{
  if(!e.key) return;
  const k = e.key.toLowerCase();
  if(['w','a','s','d'].includes(k)) keys[k]=true;
  if(k==='e') doTackle();
  if(k==='q') doSwitch();
  if(k==='r') doSubstitute();
});
window.addEventListener('keyup', (e)=>{
  if(!e.key) return;
  const k = e.key.toLowerCase();
  if(['w','a','s','d'].includes(k)) keys[k]=false;
});

const canvas = document.getElementById('pitch');
canvas.addEventListener('contextmenu', (e)=> e.preventDefault());
canvas.addEventListener('mousemove', (e)=>{
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (CW/r.width);
  mouse.y = (e.clientY - r.top) * (CH/r.height);
});
canvas.addEventListener('mousedown', (e)=>{
  if(e.button === 0){
    if(!running || !controlled || ball.owner !== controlled) return;
    charging = true;
    chargeStart = performance.now();
  } else if(e.button === 2){
    if(!running || !controlled || ball.owner !== controlled) return;
    doPass();
  }
});
window.addEventListener('mouseup', (e)=>{
  if(e.button !== 0) return;
  if(!charging) return;
  charging = false;
  if(!running || !controlled || ball.owner !== controlled){ chargeProgress = 0; return; }
  const held = performance.now() - chargeStart;
  const power = clamp(held / HOLD_MAX, 0, 1);
  doShoot(power);
  chargeProgress = 0;
});

function ovrFactorOf(p){ return 0.85 + ((p.ovr||75)-55)/44*0.30; }

function doShoot(power){
  if(!running || !controlled) return;
  if(ball.owner !== controlled) return;
  const dx = mouse.x - ball.x, dy = mouse.y - ball.y;
  const d = Math.hypot(dx,dy) || 1;
  const finalPower = 0.42 + 0.58*power;
  const ovrShot = ovrFactorOf(controlled);
  ball.owner = null;
  ball.vx = dx/d * SHOT_SPEED * finalPower * ovrShot;
  ball.vy = dy/d * SHOT_SPEED * finalPower * ovrShot;
  ball.vz = 210 + 320*power;
  ball.z = Math.max(ball.z, 2);
  ball.lastTeam = controlled.team;
  lastTouchTeam = controlled.team;
  lastShooter = controlled;
  controlled.pickupCd = 0.35;
}

function doPass(){
  if(!running || !controlled) return;
  if(ball.owner !== controlled) return;
  const mates = players.filter(p=>p.team===controlled.team && p!==controlled && !p.sentOff);
  if(!mates.length) return;
  mates.sort((a,b)=> dist(a,controlled)-dist(b,controlled));
  const mate = mates[0];
  const leadX = mate.x + (mate.facingX||0)*12;
  const leadY = mate.y + (mate.facingY||0)*12;
  const dx = leadX - ball.x, dy = leadY - ball.y;
  const d = Math.hypot(dx,dy) || 1;
  ball.owner = null;
  ball.vx = dx/d * (SHOT_SPEED*0.5);
  ball.vy = dy/d * (SHOT_SPEED*0.5);
  ball.vz = 60;
  ball.z = Math.max(ball.z, 1);
  lastTouchTeam = controlled.team;
  controlled.pickupCd = 0.2;
  mate.pickupCd = Math.min(mate.pickupCd, 0.05);
}

function doTackle(){
  if(!running || !controlled || controlled.sentOff) return;
  if(controlled.tackleCd > 0) return;
  controlled.tackleCd = 0.55;
  if(ball.owner && ball.owner.team !== controlled.team){
    const d = dist(controlled, ball.owner);
    if(d < TACKLE_R){
      const atkOvr = ball.owner.ovr || 75;
      const defOvr = controlled.ovr || 75;
      const chance = clamp(0.60 - (atkOvr-55)/44*0.28 + (defOvr-75)/300, 0.18, 0.85);
      if(Math.random() < chance){
        ball.owner.pickupCd = 0.25;
        ball.owner = controlled;
        lastTouchTeam = controlled.team;
      } else {
        const fouled = ball.owner;
        const fx0 = fouled.x, fy0 = fouled.y, fteam = fouled.team;
        ball.owner = null;
        ball.vx = (Math.random()-0.5)*90;
        ball.vy = (Math.random()-0.5)*90;
        if(Math.random() < 0.16){
          commitFoul(controlled, fx0, fy0, fteam);
        }
      }
    }
  } else if(!ball.owner){
    if(dist(controlled, ball) < TACKLE_R+10){ controlled.pickupCd = 0; }
  }
}

function commitFoul(offender, x, y, forTeam){
  offender.yellowCards = (offender.yellowCards||0) + 1;
  totalCards++;
  document.getElementById('cardsInfo').textContent = 'Thẻ phạt: ' + totalCards;
  let msg = '🟨 Thẻ vàng: ' + offender.name;
  let color = '#f6c453';
  if(offender.yellowCards >= 2){
    offender.sentOff = true;
    offender.x = -9999; offender.y = -9999;
    msg = '🟥 Thẻ đỏ (2 vàng): ' + offender.name;
    color = '#e3543c';
    if(offender === controlled) doSwitch();
  }
  flashBannerGeneric(msg, color);
  setTimeout(()=> startRestart('freekick', x, y, forTeam), 700);
}

function doSwitch(){
  if(!running) return;
  const mine = players.filter(p=>p.team==='A' && p!==controlled && !p.sentOff);
  if(!mine.length) return;
  mine.sort((a,b)=> dist(a,ball)-dist(b,ball));
  controlled = mine[0];
}

function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
function goalCenter(side){ return side==='A' ? {x:PX1, y:(PY0+PY1)/2} : {x:PX0, y:(PY0+PY1)/2}; }
function ownGoalCenter(side){ return side==='A' ? {x:PX0, y:(PY0+PY1)/2} : {x:PX1, y:(PY0+PY1)/2}; }

function loop(ts){
  if(!running) return;
  const dt = Math.min(0.033, (ts-lastTs)/1000);
  lastTs = ts;
  const paused = performance.now() < goalPauseUntil || performance.now() < kickoffPauseUntil || performance.now() < restartPauseUntil;

  updateParticles(dt);

  if(charging){
    if(!controlled || ball.owner !== controlled){
      charging = false; chargeProgress = 0;
    } else {
      const held = performance.now() - chargeStart;
      chargeProgress = clamp(held / HOLD_MAX, 0, 1);
    }
  }

  if(!paused){
    matchTime -= dt;
    if(matchTime <= 0){ matchTime = 0; endMatch(); return; }
    document.getElementById('timer').textContent = fmtTime(matchTime);

    for(const p of players){ if(p.tackleCd>0) p.tackleCd -= dt; if(p.pickupCd>0) p.pickupCd -= dt; }

    updateControlled(dt);
    updateAI(dt);
    updateBall(dt);
    resolvePickups();
    checkGoal();
  }

  const fillEl = document.getElementById('staminaFill');
  if(fillEl && controlled){ fillEl.style.width = clamp(controlled.stamina,0,100) + '%'; }

  draw();
  animId = requestAnimationFrame(loop);
}

function fmtTime(t){
  const m = Math.floor(t/60), s = Math.floor(t%60);
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

function updateControlled(dt){
  if(!controlled) return;
  let dx=0, dy=0;
  if(keys['w']) dy -= 1;
  if(keys['s']) dy += 1;
  if(keys['a']) dx -= 1;
  if(keys['d']) dx += 1;
  const len = Math.hypot(dx,dy);
  const staminaFactor = 0.55 + 0.45*(controlled.stamina/100);
  const ovrFactor = 0.80 + ((controlled.ovr||75)-55)/44*0.35;
  if(len>0){
    dx/=len; dy/=len;
    controlled.facingX = dx; controlled.facingY = dy;
    controlled.x = clamp(controlled.x + dx*BASE_SPEED*ovrFactor*staminaFactor*dt, PX0+PLAYER_R, PX1-PLAYER_R);
    controlled.y = clamp(controlled.y + dy*BASE_SPEED*ovrFactor*staminaFactor*dt, PY0+PLAYER_R, PY1-PLAYER_R);
    controlled.stamina = clamp(controlled.stamina - 7*dt, 0, 100);
  } else {
    controlled.stamina = clamp(controlled.stamina + 9*dt, 0, 100);
  }
  if(ball.owner && ball.owner.team==='A' && ball.owner!==controlled && !ball.owner.sentOff){
    controlled = ball.owner;
  }
}

function updateAI(dt){
  const possTeam = ball.owner ? ball.owner.team : null;

  for(const p of players){
    if(p === controlled) continue;
    if(p.sentOff) continue;

    const stars = p.team==='A' ? selfTeam.stars : oppTeam.stars;
    const ovrFactor = 0.80 + ((p.ovr||75)-55)/44*0.35;
    const staminaFactor = 0.55 + 0.45*(p.stamina/100);
    const speed = BASE_SPEED * ovrFactor * staminaFactor * (p.isGK?0.9:1);

    let targetX, targetY;

    if(p.isGK){
      const lineX = p.team==='A' ? PX0+30 : PX1-30;
      let ty = clamp(ball.y, GOAL_Y0+10, GOAL_Y1-10);
      targetX = lineX; targetY = ty;
      if(!ball.owner && dist(p,ball) < 70){
        targetX = clamp(ball.x, p.team==='A'?PX0+10:PX1-90, p.team==='A'?PX0+90:PX1-10);
      }
    } else if(p === ball.owner){
      const goal = goalCenter(p.team);
      const dgx = goal.x - p.x, dgy = goal.y - p.y;
      const dg = Math.hypot(dgx,dgy)||1;
      const shootRange = 210 + stars*10;

      const nearestOpp = players
        .filter(q=>q.team!==p.team)
        .reduce((best,q)=>{ const d=dist(p,q); return (!best||d<best.d)?{q,d}:best; }, null);
      const pressured = nearestOpp && nearestOpp.d < 46;

      let passedThisFrame = false;
      if(pressured && dg >= shootRange*0.6 && Math.random() < 0.22 + stars*0.02){
        // look for the most advanced open teammate to pass to
        const mates = players.filter(q=>q.team===p.team && q!==p && !q.isGK);
        let bestMate = null, bestScore = -Infinity;
        for(const m of mates){
          const advance = p.team==='A' ? (m.x-p.x) : (p.x-m.x); // progress toward opp goal
          const opennessRef = players.filter(q=>q.team!==p.team)
            .reduce((min,q)=> Math.min(min, dist(m,q)), 999);
          const passDist = dist(p,m);
          if(passDist < 60 || passDist > 320) continue;
          const score = advance*0.6 + opennessRef*1.4 - passDist*0.15;
          if(score > bestScore){ bestScore = score; bestMate = m; }
        }
        if(bestMate){
          const leadX = bestMate.x + (bestMate.facingX||0)*14;
          const leadY = bestMate.y + (bestMate.facingY||0)*14;
          const ddx = leadX-ball.x, ddy = leadY-ball.y;
          const dd = Math.hypot(ddx,ddy)||1;
          ball.owner = null;
          ball.vx = ddx/dd*(SHOT_SPEED*0.62);
          ball.vy = ddy/dd*(SHOT_SPEED*0.62);
          ball.vz = 70;
          ball.z = Math.max(ball.z, 1);
          lastTouchTeam = p.team;
          p.pickupCd = 0.3;
          bestMate.pickupCd = Math.min(bestMate.pickupCd, 0.05);
          targetX = p.x; targetY = p.y;
          passedThisFrame = true;
        }
      }

      if(!passedThisFrame){
        if(dg < shootRange && Math.random() < 0.02 + stars*0.004){
          const targY = goal.y + (Math.random()-0.5)*70;
          const targX = goal.x;
          const ddx = targX-ball.x, ddy = targY-ball.y;
          const dd = Math.hypot(ddx,ddy)||1;
          const ovrShot = ovrFactorOf(p);
          ball.owner = null;
          ball.vx = ddx/dd*SHOT_SPEED*0.92*ovrShot;
          ball.vy = ddy/dd*SHOT_SPEED*0.92*ovrShot;
          ball.vz = 240 + stars*20;
          ball.z = Math.max(ball.z, 2);
          lastTouchTeam = p.team;
          lastShooter = p;
          p.pickupCd = 0.35;
          targetX = p.x; targetY = p.y;
        } else {
          targetX = p.x + dgx/dg*40;
          targetY = p.y + dgy/dg*40 + (Math.random()-0.5)*16;
        }
      }
    } else if(possTeam === p.team){
      const shiftX = (ball.x - fx(p.homeNX,p.team)) * 0.18;
      const shiftY = (ball.y - fy(p.homeNY)) * 0.18;
      targetX = fx(p.homeNX,p.team) + shiftX;
      targetY = fy(p.homeNY) + shiftY;
    } else if(possTeam && possTeam !== p.team){
      const teammates = players.filter(q=>q.team===p.team && !q.isGK && q!==controlled);
      teammates.sort((a,b)=>dist(a,ball)-dist(b,ball));
      let numPressers = stars >= 5 ? 3 : (stars >= 4 ? 2 : 1);
      if(p.team === 'A'){
        if(tactic==='attack') numPressers = Math.min(4, numPressers+1);
        else if(tactic==='defense') numPressers = Math.max(1, numPressers-1);
      }
      const pressers = teammates.slice(0,numPressers);
      if(pressers.includes(p)){
        targetX = ball.x; targetY = ball.y;
      } else {
        const shiftX = (ball.x - fx(p.homeNX,p.team)) * 0.12;
        const shiftY = (ball.y - fy(p.homeNY)) * 0.12;
        targetX = fx(p.homeNX,p.team) + shiftX*0.6;
        targetY = fy(p.homeNY) + shiftY*0.6;
      }
    } else {
      const teammates = players.filter(q=>q.team===p.team && !q.isGK && q!==controlled);
      teammates.sort((a,b)=>dist(a,ball)-dist(b,ball));
      if(teammates[0]===p){
        targetX = ball.x; targetY = ball.y;
      } else {
        targetX = fx(p.homeNX,p.team) + (ball.x-fx(p.homeNX,p.team))*0.15;
        targetY = fy(p.homeNY) + (ball.y-fy(p.homeNY))*0.15;
      }
    }

    targetX = clamp(targetX, PX0+PLAYER_R, PX1-PLAYER_R);
    targetY = clamp(targetY, PY0+PLAYER_R, PY1-PLAYER_R);

    const ddx = targetX-p.x, ddy = targetY-p.y;
    const dd = Math.hypot(ddx,ddy);
    if(dd > 2){
      p.x = clamp(p.x + ddx/dd*speed*dt, PX0+PLAYER_R, PX1-PLAYER_R);
      p.y = clamp(p.y + ddy/dd*speed*dt, PY0+PLAYER_R, PY1-PLAYER_R);
      p.facingX = ddx/dd; p.facingY = ddy/dd;
      p.stamina = clamp(p.stamina - 5*dt, 0, 100);
    } else {
      p.stamina = clamp(p.stamina + 8*dt, 0, 100);
    }
  }
}

function updateBall(dt){
  if(ball.owner){
    const o = ball.owner;
    ball.x = o.x + o.facingX*16;
    ball.y = o.y + o.facingY*16;
    ball.vx = 0; ball.vy = 0;
    ball.z = 0; ball.vz = 0;
    return;
  }
  ball.x += ball.vx*dt;
  ball.y += ball.vy*dt;
  const fric = Math.pow(0.55, dt*2);
  ball.vx *= fric; ball.vy *= fric;
  if(Math.hypot(ball.vx,ball.vy) < 4){ ball.vx=0; ball.vy=0; }

  if(ball.z > 0 || ball.vz !== 0){
    ball.z += ball.vz*dt;
    ball.vz -= GRAVITY*dt;
    if(ball.z <= 0){
      ball.z = 0;
      if(Math.abs(ball.vz) > 60){ ball.vz *= -0.35; } else { ball.vz = 0; }
    }
  }

  if(ball.y < PY0+ball.r || ball.y > PY1-ball.r){
    const throwY = ball.y < PY0+ball.r ? PY0+2 : PY1-2;
    const forTeam = lastTouchTeam === 'A' ? 'B' : (lastTouchTeam === 'B' ? 'A' : 'A');
    startRestart('throwin', clamp(ball.x, PX0+10, PX1-10), throwY, forTeam);
    return;
  }

  const inGoalY = ball.y > GOAL_Y0 && ball.y < GOAL_Y1;
  if(!inGoalY){
    if(ball.x < PX0+ball.r){
      if(lastTouchTeam === 'A'){
        const cornerY = ball.y < CH/2 ? PY0+6 : PY1-6;
        startRestart('corner', PX0+10, cornerY, 'B');
      } else {
        startRestart('goalkick', PX0+60, CH/2, 'A');
      }
      return;
    }
    if(ball.x > PX1-ball.r){
      if(lastTouchTeam === 'B'){
        const cornerY = ball.y < CH/2 ? PY0+6 : PY1-6;
        startRestart('corner', PX1-10, cornerY, 'A');
      } else {
        startRestart('goalkick', PX1-60, CH/2, 'B');
      }
      return;
    }
  }
}

function resolvePickups(){
  if(ball.owner) return;
  if(ball.z > 10) return; // ball flying through the air - out of reach
  let best = null, bestD = 999;
  for(const p of players){
    if(p.pickupCd > 0) continue;
    const d = dist(p, ball);
    if(d < PICKUP_R && d < bestD){ bestD = d; best = p; }
  }
  if(!best) return;

  if(best.isGK && dist(best,ball) < GK_CATCH_R){
    let chance;
    if(best.level === 'forbidden'){
      chance = 1 - 0.0097; // Forbidden: chỉ 0.97% cơ hội bóng vào lưới
    } else if(best.level === 'superior'){
      chance = 1 - 0.02; // Superior: chỉ 2% cơ hội bóng vào lưới
    } else {
      chance = clamp(0.35 + ((best.ovr||75)-55)/44*0.45, 0.3, 0.85);
    }
    if(Math.random() < chance){
      ball.owner = best;
      lastTouchTeam = best.team;
    } else {
      // spilled save: ball deflects away instead of being caught
      const ang = Math.random()*Math.PI*2;
      ball.vx = Math.cos(ang)*160;
      ball.vy = Math.sin(ang)*160;
      best.pickupCd = 0.3;
      lastTouchTeam = best.team;
    }
    return;
  }
  ball.owner = best;
  lastTouchTeam = best.team;
}

function checkGoal(){
  if(ball.owner) return;
  const inGoalY = ball.y > GOAL_Y0+6 && ball.y < GOAL_Y1-6;
  if(!inGoalY) return;
  if(ball.x <= PX0 - 2){
    score.B++; updateScoreHud();
    recordGoal('B');
    flashBanner(oppTeam.flag + ' ' + oppTeam.name.toUpperCase(), oppTeam.c1, oppTeam.c2);
    spawnGoalParticles(PX0+GOAL_DEPTH/2, ball.y, oppTeam.c1, oppTeam.c2);
    setTimeout(()=>resetKickoff(false), 1400);
    goalPauseUntil = performance.now() + 1500;
  } else if(ball.x >= PX1 + 2){
    score.A++; updateScoreHud();
    recordGoal('A');
    flashBanner(selfTeam.flag + ' ' + selfTeam.name.toUpperCase(), selfTeam.c1, selfTeam.c2);
    spawnGoalParticles(PX1-GOAL_DEPTH/2, ball.y, selfTeam.c1, selfTeam.c2);
    setTimeout(()=>resetKickoff(false), 1400);
    goalPauseUntil = performance.now() + 1500;
  }
}

function recordGoal(team){
  const scorerName = (lastShooter && lastShooter.team===team) ? lastShooter.name : 'Không rõ (bóng bật ra)';
  matchGoals.push({ team, name: scorerName });
}

function spawnGoalParticles(x,y,c1,c2){
  for(let i=0;i<44;i++){
    const ang = Math.random()*Math.PI*2;
    const speed = 60 + Math.random()*220;
    particles.push({
      x, y,
      vx: Math.cos(ang)*speed,
      vy: Math.sin(ang)*speed - 140,
      vz: 0,
      life: 1,
      decay: 0.7 + Math.random()*0.6,
      size: 2.5 + Math.random()*3,
      color: Math.random() < 0.5 ? c1 : c2,
    });
  }
}

function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const pt = particles[i];
    pt.x += pt.vx*dt;
    pt.y += pt.vy*dt;
    pt.vy += 340*dt;
    pt.life -= pt.decay*dt;
    if(pt.life <= 0) particles.splice(i,1);
  }
}

function flashBannerGeneric(text, color){
  const el = document.getElementById('bannerOverlay');
  el.style.background = `radial-gradient(circle, ${color}33 0%, rgba(3,15,10,.65) 70%)`;
  document.getElementById('bannerText').textContent = text;
  document.getElementById('bannerText').style.color = color;
  el.classList.add('show');
  setTimeout(()=>{ el.classList.remove('show'); el.style.background=''; }, 750);
}

function startRestart(type, x, y, forTeam){
  ball.owner = null; ball.vx = 0; ball.vy = 0; ball.vz = 0; ball.z = 0;
  ball.x = clamp(x, PX0+4, PX1-4);
  ball.y = clamp(y, PY0+4, PY1-4);
  restartTeam = forTeam;
  restartPauseUntil = performance.now() + 800;
  const labels = { throwin:'NÉM BIÊN', corner:'PHẠT GÓC', goalkick:'PHÁT BÓNG', freekick:'SÚT PHẠT' };
  const teamObj = forTeam==='A' ? selfTeam : oppTeam;
  flashBannerGeneric(`${labels[type]} · ${teamObj.name.toUpperCase()}`, teamObj.c1);
  setTimeout(assignRestartPossession, 800);
}

function assignRestartPossession(){
  if(!restartTeam || !running) return;
  const eligible = players.filter(p=>p.team===restartTeam && !p.sentOff);
  if(!eligible.length){ restartTeam = null; return; }
  eligible.sort((a,b)=>dist(a,ball)-dist(b,ball));
  const p = eligible[0];
  p.x = clamp(ball.x + (p.team==='A' ? -14 : 14), PX0+PLAYER_R, PX1-PLAYER_R);
  p.y = clamp(ball.y, PY0+PLAYER_R, PY1-PLAYER_R);
  ball.owner = p;
  lastTouchTeam = p.team;
  if(p.team === 'A') controlled = p;
  restartTeam = null;
}

function flashBanner(teamName, c1, c2){
  const el = document.getElementById('bannerOverlay');
  el.style.background = `radial-gradient(circle, ${c1}33 0%, rgba(3,15,10,.65) 70%)`;
  document.getElementById('bannerText').textContent = '⚽ BÀN THẮNG! ' + teamName;
  document.getElementById('bannerText').style.color = c1;
  el.classList.add('show');
  setTimeout(()=>{ el.classList.remove('show'); el.style.background=''; }, 1400);
}

// ---- Manager mode: quick match simulation ----
let simTimer = null;
let simEvents = [];
let simIdx = 0;
let simFinal = { A:0, B:0 };

function poissonSample(lambda){
  const L = Math.exp(-lambda);
  let p = 1, k = 0;
  do { k++; p *= Math.random(); } while(p > L);
  return k-1;
}

function teamRating(starters, forTactic){
  let atk = 0, def = 0;
  starters.forEach(p=>{
    if(p.role==='FW'){ atk += p.ovr*1.3; def += p.ovr*0.15; }
    else if(p.role==='MF'){ atk += p.ovr*0.8; def += p.ovr*0.5; }
    else if(p.role==='DF'){ atk += p.ovr*0.15; def += p.ovr*1.2; }
    else { def += p.ovr*1.0; }
  });
  if(forTactic==='attack'){ atk *= 1.18; def *= 0.85; }
  else if(forTactic==='defense'){ atk *= 0.82; def *= 1.18; }
  return { atk, def };
}

function pickScorer(starters){
  const weighted = starters.map(p=>{
    let w = p.ovr;
    if(p.role==='FW') w *= 3;
    else if(p.role==='MF') w *= 1.5;
    else if(p.role==='DF') w *= 0.4;
    else w *= 0.05;
    return { p, w };
  });
  const total = weighted.reduce((s,x)=>s+x.w, 0);
  let r = Math.random()*total;
  for(const x of weighted){ r -= x.w; if(r <= 0) return x.p; }
  return weighted[0].p;
}

function runSimulation(){
  const squadA = ensureSquad(selfTeam).starters;
  const squadB = ensureSquad(oppTeam).starters;
  players = squadA.map(p=>({ ...p, sentOff:false, team:'A' }))
    .concat(squadB.map(p=>({ ...p, sentOff:false, team:'B' })));

  const oppTactic = ['attack','balanced','balanced','defense'][Math.floor(Math.random()*4)];
  const selfR = teamRating(squadA, tactic);
  const oppR = teamRating(squadB, oppTactic);
  const selfXG = clamp(1.35 * (selfR.atk / Math.max(40, oppR.def)), 0.15, 4.2);
  const oppXG = clamp(1.15 * (oppR.atk / Math.max(40, selfR.def)), 0.15, 4.2);
  const goalsA = poissonSample(selfXG);
  const goalsB = poissonSample(oppXG);
  simFinal = { A: goalsA, B: goalsB };

  simEvents = [];
  for(let i=0;i<goalsA;i++){
    simEvents.push({ minute: 1+Math.floor(Math.random()*90), team:'A', name: pickScorer(squadA).name });
  }
  for(let i=0;i<goalsB;i++){
    simEvents.push({ minute: 1+Math.floor(Math.random()*90), team:'B', name: pickScorer(squadB).name });
  }
  simEvents.sort((a,b)=>a.minute-b.minute);
  simIdx = 0;

  document.getElementById('simVsRow').innerHTML = `
    <div class="vs-card"><div class="flag" style="font-size:32px;">${selfTeam.flag}</div><div class="tname">${selfTeam.name}</div><div style="font-size:11px;color:var(--muted);">Chiến thuật: ${tacticLabel(tactic)}</div></div>
    <div class="vs-text">VS</div>
    <div class="vs-card"><div class="flag" style="font-size:32px;">${oppTeam.flag}</div><div class="tname">${oppTeam.name}</div><div style="font-size:11px;color:var(--muted);">Chiến thuật: ${tacticLabel(oppTactic)}</div></div>`;
  document.getElementById('simScore').textContent = '0 - 0';
  document.getElementById('simLog').innerHTML = '<p style="color:var(--muted)">🏟️ Trận đấu bắt đầu…</p>';
  showScreen('simScreen');

  const startTs = performance.now();
  const totalDurationMs = 3400;
  function tick(){
    const elapsed = performance.now() - startTs;
    const virtualMinute = clamp(Math.floor((elapsed/totalDurationMs)*90), 0, 90);
    while(simIdx < simEvents.length && simEvents[simIdx].minute <= virtualMinute){
      applySimEvent(simEvents[simIdx]);
      simIdx++;
    }
    if(elapsed >= totalDurationMs){
      finishSimulation();
      return;
    }
    simTimer = setTimeout(tick, 90);
  }
  simTimer = setTimeout(tick, 300);
}

function tacticLabel(t){
  return t==='attack' ? '⚡ Tấn công' : (t==='defense' ? '🛡️ Phòng thủ' : '⚖️ Cân bằng');
}

function applySimEvent(ev){
  if(ev.team==='A') score.A++; else score.B++;
  matchGoals.push({ team: ev.team, name: ev.name });
  document.getElementById('simScore').textContent = `${score.A} - ${score.B}`;
  const teamLabel = ev.team==='A' ? selfTeam.name : oppTeam.name;
  const log = document.getElementById('simLog');
  const p = document.createElement('p');
  p.innerHTML = `⚽ <b>${ev.minute}'</b> ${ev.name} <span style="color:var(--muted)">(${teamLabel})</span>`;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
}

function finishSimulation(){
  if(simTimer){ clearTimeout(simTimer); simTimer = null; }
  for(; simIdx < simEvents.length; simIdx++){ applySimEvent(simEvents[simIdx]); }
  score.A = simFinal.A; score.B = simFinal.B;
  document.getElementById('simScore').textContent = `${score.A} - ${score.B}`;
  running = false;
  setTimeout(endMatch, 500);
}

document.getElementById('simSkipBtn').onclick = ()=>{
  if(simTimer){ clearTimeout(simTimer); simTimer = null; }
  finishSimulation();
};

function computeReward(){
  const base = 60;
  const goalsBonus = score.A*25;
  let resultBonus, resultLabel;
  if(score.A>score.B){ resultBonus=150; resultLabel='Thắng trận'; }
  else if(score.A===score.B){ resultBonus=60; resultLabel='Hòa'; }
  else { resultBonus=20; resultLabel='Thua trận (an ủi)'; }
  return { base, goalsBonus, resultBonus, resultLabel, total: base+goalsBonus+resultBonus };
}

function rewardBreakdownHtml(r){
  return `<h4>💰 Tiền thưởng trận đấu</h4>
    <p>Phí ra sân: +${fmtMoney(r.base)} 💰</p>
    <p>Bàn thắng ghi được (${score.A}): +${fmtMoney(r.goalsBonus)} 💰</p>
    <p>${r.resultLabel}: +${fmtMoney(r.resultBonus)} 💰</p>
    <p><b>Tổng cộng: +${fmtMoney(r.total)} 💰</b> · Ví hiện tại: ${fmtMoney(wallet)} 💰</p>`;
}

function scorersHtml(){
  if(!matchGoals.length) return `<h4>⚽ Bàn thắng</h4><p>Không có bàn thắng nào trong trận.</p>`;
  const lines = matchGoals.map(g=>{
    const teamLabel = g.team==='A' ? selfTeam.name : oppTeam.name;
    return `<p>⚽ ${g.name} <span style="color:var(--muted)">(${teamLabel})</span></p>`;
  }).join('');
  return `<h4>⚽ Bàn thắng</h4>${lines}`;
}

function motmHtml(){
  if(!matchGoals.length){
    const alive = players.filter(p=>!p.sentOff);
    if(!alive.length) return '';
    alive.sort((a,b)=>(b.ovr||0)-(a.ovr||0));
    const p = alive[0];
    return `<h4>🏅 Cầu thủ xuất sắc trận đấu</h4><p>${p.name} (OVR ${p.ovr})</p>`;
  }
  const counts = {};
  matchGoals.forEach(g=>{ counts[g.name] = (counts[g.name]||0)+1; });
  let bestName=null, bestCount=0;
  Object.keys(counts).forEach(n=>{ if(counts[n]>bestCount){ bestCount=counts[n]; bestName=n; } });
  const p = players.find(pp=>pp.name===bestName);
  return `<h4>🏅 Cầu thủ xuất sắc trận đấu</h4><p>${bestName} — ${bestCount} bàn${p?` (OVR ${p.ovr})`:''}</p>`;
}

function endMatch(){
  running = false;
  cancelAnimationFrame(animId);
  const r = computeReward();
  wallet += r.total;
  if(score.A > score.B) wins++;
  renderWallet();
  regenerateMarket();
  document.getElementById('finalScore').textContent = `${selfTeam.flag} ${selfTeam.name}  ${score.A} - ${score.B}  ${oppTeam.name} ${oppTeam.flag}`;
  document.getElementById('endTitle').textContent =
    score.A>score.B ? 'BẠN ĐÃ THẮNG!' : (score.A<score.B ? 'BẠN ĐÃ THUA' : 'HÒA');
  document.getElementById('rewardBreakdown').innerHTML = rewardBreakdownHtml(r);
  document.getElementById('goalScorersBox').innerHTML = scorersHtml();
  document.getElementById('motmBox').innerHTML = motmHtml();

  const scoutBox = document.getElementById('scoutRevealBox');
  const wcBox = document.getElementById('worldCupBox');
  const wcContinueBtn = document.getElementById('continueWorldCupBtn');
  scoutBox.style.display = 'none'; scoutBox.innerHTML = '';
  wcBox.style.display = 'none'; wcBox.innerHTML = '';
  wcContinueBtn.style.display = 'none';

  if(matchContext === 'scout' && scoutPending){
    const weights = scoutPackWeights(oppTeam.stars);
    const rolledId = pickWeightedPack(weights);
    const pack = SCOUT_PACKS.find(p=>p.id===rolledId);
    addPackToInventory(rolledId, 1);
    scoutBox.style.display = '';
    scoutBox.innerHTML = `<h4>🔭 Nhận thưởng Scout</h4><p>Đối thủ ${oppTeam.stars}★ → Bạn RANDOM được <b>1 ${pack.name}</b>! Đã cộng vào số dư thẻ.</p><p style="color:var(--muted);">Vào màn Scout cầu thủ và bấm "🎁 Mở gói" để xem bạn nhận được ai.</p>`;
    scoutPending = null;
    matchContext = 'normal';
  } else if(matchContext === 'worldcup' && worldCup){
    const win = score.A > score.B;
    if(win){
      const bonus = WC_ROUND_BONUS[worldCup.round] || 0;
      wallet += bonus;
      renderWallet();
      worldCup.round++;
      if(worldCup.round >= worldCup.opponents.length){
        worldCup.status = 'champion';
        wallet += WC_CHAMPION_BONUS;
        renderWallet();
        addPackToInventory('legendary', 1);
        wcBox.style.display = '';
        wcBox.innerHTML = `<h4>🏆 VÔ ĐỊCH WORLD CUP!</h4><p>Thưởng vô địch: +${fmtMoney(WC_CHAMPION_BONUS)} 💰</p><p>Phần thưởng đặc biệt: <b>1 Gói Legendary</b> đã cộng vào số dư thẻ Scout — vào mở để nhận cầu thủ!</p>`;
      } else {
        wcBox.style.display = '';
        wcBox.innerHTML = `<h4>🏆 World Cup</h4><p>Thắng ${WC_ROUND_NAMES[worldCup.round-1]}! Thưởng: +${fmtMoney(bonus)} 💰</p><p>Vòng tiếp theo: ${WC_ROUND_NAMES[worldCup.round]} vs ${worldCup.opponents[worldCup.round].flag} ${worldCup.opponents[worldCup.round].name}</p>`;
        wcContinueBtn.style.display = '';
      }
    } else {
      worldCup.status = 'eliminated';
      wcBox.style.display = '';
      wcBox.innerHTML = `<h4>🏆 World Cup</h4><p>Bạn đã bị loại tại ${WC_ROUND_NAMES[worldCup.round]}.</p>`;
      saveGame();
    }
    matchContext = 'normal';
  }

  showScreen('endScreen');
}

const ctx = canvas.getContext('2d');

function draw(){
  ctx.clearRect(0,0,CW,CH);

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(PX0,PY0,PW,PH);
  ctx.beginPath(); ctx.moveTo(CW/2,PY0); ctx.lineTo(CW/2,PY1); ctx.stroke();
  ctx.beginPath(); ctx.arc(CW/2,CH/2,52,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(CW/2,CH/2,3,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fill();

  ctx.strokeRect(PX0, (PY0+PY1)/2-95, 92, 190);
  ctx.strokeRect(PX1-92, (PY0+PY1)/2-95, 92, 190);
  ctx.strokeRect(PX0, (PY0+PY1)/2-46, 40, 92);
  ctx.strokeRect(PX1-40, (PY0+PY1)/2-46, 40, 92);

  // goal nets (hatched mesh) drawn behind the frame
  drawGoalNet(PX0-GOAL_DEPTH, GOAL_Y0, GOAL_DEPTH, GOAL_H, true);
  drawGoalNet(PX1, GOAL_Y0, GOAL_DEPTH, GOAL_H, false);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(PX0-GOAL_DEPTH, GOAL_Y0, GOAL_DEPTH, GOAL_H);
  ctx.strokeRect(PX1, GOAL_Y0, GOAL_DEPTH, GOAL_H);
  // goal posts (thicker verticals) for a crisper frame
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(PX0-GOAL_DEPTH,GOAL_Y0); ctx.lineTo(PX0-GOAL_DEPTH,GOAL_Y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PX1+GOAL_DEPTH,GOAL_Y0); ctx.lineTo(PX1+GOAL_DEPTH,GOAL_Y1); ctx.stroke();

  // ground shadows (drawn first, under everyone)
  for(const p of players){
    ctx.beginPath();
    ctx.ellipse(p.x, p.y+PLAYER_R*0.75, PLAYER_R*0.85, PLAYER_R*0.32, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();
  }
  // ball's ground shadow: stays on the pitch even while the ball is in the air,
  // and shrinks/fades the higher the ball flies - sells the arc.
  const shadowScale = clamp(1 - ball.z/170, 0.32, 1);
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y+ball.r*0.7, ball.r*0.9*shadowScale, ball.r*0.35*shadowScale, 0, 0, Math.PI*2);
  ctx.fillStyle = `rgba(0,0,0,${0.32*shadowScale})`;
  ctx.fill();

  for(const p of players){
    const isBallCarrier = ball.owner === p;
    if(isBallCarrier){
      ctx.beginPath();
      ctx.arc(p.x,p.y,PLAYER_R+7,0,Math.PI*2);
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(255,210,63,0.8)';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if(p === controlled){
      ctx.beginPath();
      ctx.arc(p.x,p.y,PLAYER_R+11,0,Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4,3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // shot power ring while charging
      if(charging && chargeProgress > 0){
        ctx.beginPath();
        ctx.arc(p.x,p.y,PLAYER_R+17,-Math.PI/2, -Math.PI/2 + chargeProgress*Math.PI*2);
        ctx.strokeStyle = powerColor(chargeProgress);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = powerColor(chargeProgress);
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    ctx.beginPath();
    ctx.arc(p.x,p.y,PLAYER_R,0,Math.PI*2);
    ctx.fillStyle = p.isGK ? '#222' : p.colorMain;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = p.colorAcc;
    ctx.stroke();

    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = contrastColor(p.isGK?'#222':p.colorMain);
    ctx.fillText(p.number, p.x, p.y+1);

    const label = shortName(p.name);
    ctx.font = '10px sans-serif';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(3,15,10,0.55)';
    ctx.fillRect(p.x - tw/2 - 3, p.y - PLAYER_R - 15, tw+6, 13);
    ctx.fillStyle = '#eafff0';
    ctx.fillText(label, p.x, p.y - PLAYER_R - 9);
  }

  // ball: rises visually with z-height, scales up slightly, casts the shadow drawn above
  const ballDrawY = ball.y - ball.z;
  const ballScale = 1 + Math.min(ball.z,170)*0.0035;
  ctx.beginPath();
  ctx.arc(ball.x, ballDrawY, ball.r*ballScale, 0, Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4 + ball.z*0.05;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#333';
  ctx.stroke();

  // goal celebration particles
  for(const pt of particles){
    ctx.globalAlpha = clamp(pt.life,0,1);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2);
    ctx.fillStyle = pt.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // stadium vignette for depth
  const vg = ctx.createRadialGradient(CW/2,CH/2, CH*0.25, CW/2,CH/2, CH*0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,CW,CH);
}

function drawGoalNet(gx, gy, gw, gh, facesRight){
  ctx.save();
  ctx.beginPath();
  ctx.rect(gx, gy, gw, gh);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  const step = 7;
  for(let i=-gh; i<gw+gh; i+=step){
    ctx.beginPath(); ctx.moveTo(gx+i, gy); ctx.lineTo(gx+i-gh, gy+gh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx+i, gy); ctx.lineTo(gx+i+gh, gy+gh); ctx.stroke();
  }
  ctx.restore();
}

function powerColor(t){
  // green (weak) -> amber -> red (max power)
  if(t < 0.5) return `rgb(${Math.round(120+270*t)},210,90)`;
  return `rgb(255,${Math.round(210-210*(t-0.5)*2)},70)`;
}

renderWallet();

function shortName(n){ const parts = n.split(' '); return parts[parts.length-1]; }
function contrastColor(hex){
  if(!hex.startsWith('#')) return '#fff';
  const c = hex.substring(1);
  const r = parseInt(c.substring(0,2),16), g=parseInt(c.substring(2,4),16), b=parseInt(c.substring(4,6),16);
  const yiq = (r*299+g*587+b*114)/1000;
  return yiq >= 140 ? '#111' : '#fff';
}

})();
