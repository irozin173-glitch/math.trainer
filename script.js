document.addEventListener('DOMContentLoaded', () => {
let currentLevel = 1;
let currentExample = 1;
let score = 0;
let correctAnswers = 0;
let totalAnswers = 0;
let streak = 0;
let maxStreak = 0;
let gameMode = '';
let originalGameMode = '';
let startLevel = parseInt(localStorage.getItem('startLevel')) || 1;
let timeLimit = parseInt(localStorage.getItem('timeLimit')) || 60;
let fontSize = localStorage.getItem('fontSize') || 'normal';
let timeLeft = timeLimit;
let timerInterval = null;
let currentTask = null;
let statistics = { all: [] };
let soundEnabled = true;
let isAnswerChecked = false;
let bestLevels = {};
let audioCtx = null; 
let houseState = { solved: 0, total: 3, errors: 0 };
const levelParams = {
1: { min: 1, max: 10, multMax: 5, taskMax: 5 },
2: { min: 11, max: 20, multMax: 6, taskMax: 7 },
3: { min: 21, max: 30, multMax: 8, taskMax: 10 },
4: { min: 31, max: 40, multMax: 9, taskMax: 12 },
5: { min: 41, max: 50, multMax: 10, taskMax: 15 },
6: { min: 51, max: 60, multMax: 11, taskMax: 18 },
7: { min: 61, max: 70, multMax: 12, taskMax: 20 },
8: { min: 71, max: 80, multMax: 12, taskMax: 22 },
9: { min: 81, max: 90, multMax: 12, taskMax: 25 },
10: { min: 91, max: 100, multMax: 12, taskMax: 30 }
};
const initAudioContext = () => {
if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
if (audioCtx.state === 'suspended') audioCtx.resume();
};
const playCorrectSound = () => {
if (!soundEnabled) return;
initAudioContext();
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
gain.gain.setValueAtTime(0, audioCtx.currentTime);
gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
osc.start(audioCtx.currentTime);
osc.stop(audioCtx.currentTime + 0.3);
};
const playWrongSound = () => {
if (!soundEnabled) return;
initAudioContext();
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.frequency.setValueAtTime(200, audioCtx.currentTime);
osc.frequency.setValueAtTime(150, audioCtx.currentTime + 0.1);
osc.frequency.setValueAtTime(100, audioCtx.currentTime + 0.2);
gain.gain.setValueAtTime(0, audioCtx.currentTime);
gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
osc.start(audioCtx.currentTime);
osc.stop(audioCtx.currentTime + 0.4);
};
const playLevelUpSound = () => {
if (!soundEnabled) return;
initAudioContext();
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.frequency.setValueAtTime(262, audioCtx.currentTime);
osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.1);
osc.frequency.setValueAtTime(392, audioCtx.currentTime + 0.2);
osc.frequency.setValueAtTime(523, audioCtx.currentTime + 0.3);
osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.4);
gain.gain.setValueAtTime(0, audioCtx.currentTime);
gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
osc.start(audioCtx.currentTime);
osc.stop(audioCtx.currentTime + 0.6);
};
const playGameOverSound = () => {
if (!soundEnabled) return;
initAudioContext();
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.frequency.setValueAtTime(523, audioCtx.currentTime);
osc.frequency.setValueAtTime(494, audioCtx.currentTime + 0.2);
osc.frequency.setValueAtTime(466, audioCtx.currentTime + 0.4);
osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.6);
gain.gain.setValueAtTime(0, audioCtx.currentTime);
gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);
osc.start(audioCtx.currentTime);
osc.stop(audioCtx.currentTime + 1.0);
};
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getExtendedRandomInt = (level) => {
const p = levelParams[level];
const r = Math.random();
// Используем кастомный диапазон для свободной тренировки
if (originalGameMode === 'free_training' && numberRangeMin && numberRangeMax) {
return getRandomInt(numberRangeMin, numberRangeMax);
}
if (r < 0.7) return getRandomInt(p.min, p.max);
if (r < 0.9 && level > 1) return getRandomInt(levelParams[level-1].min, levelParams[level-1].max);
if (level > 2) return getRandomInt(levelParams[level-2].min, levelParams[level-2].max);
return getRandomInt(p.min, p.max);
};
const getExtendedRandomIntForMultiplication = (level) => {
// Используем кастомный диапазон для свободной тренировки
if (originalGameMode === 'free_training' && numberRangeMin && numberRangeMax) {
return getRandomInt(Math.max(2, numberRangeMin), Math.min(10, numberRangeMax));
}
let m = level <= 2 ? 5 : level <= 4 ? 6 : level <= 6 ? 8 : level <= 8 ? 9 : 10;
const r = Math.random();
if (r < 0.7) return getRandomInt(2, m);
if (r < 0.9 && level > 1) return getRandomInt(2, level - 1 <= 2 ? 5 : level - 1 <= 4 ? 6 : level - 1 <= 6 ? 8 : level - 1 <= 8 ? 9 : 10);
if (level > 2) return getRandomInt(2, level - 2 <= 2 ? 5 : level - 2 <= 4 ? 6 : level - 2 <= 6 ? 8 : level - 2 <= 8 ? 9 : 10);
return getRandomInt(2, m);
};
const safeEval = (expr) => {
expr = expr.replace(/×/g, '*').replace(/÷/g, '/');
if (!/^[0-9+\-*/.\s()]+$/.test(expr)) return 0;
try { return Function('"use strict"; return (' + expr + ')')(); } catch (e) { return 0; }
};
const getPlural = (n, o, t, f) => {
n = Math.abs(n) % 100;
if (n >= 5 && n <= 20) return f;
n %= 10;
if (n === 1) return o;
if (n >= 2 && n <= 4) return t;
return f;
};
const wordSubjects = [
// Фрукты и ягоды (15)
{one:'яблоко',two:'яблока',five:'яблок'},{one:'груша',two:'груши',five:'груш'},{one:'слива',two:'сливы',five:'слив'},{one:'вишня',two:'вишни',five:'вишен'},{one:'клубника',two:'клубники',five:'клубники'},{one:'малина',two:'малины',five:'малины'},{one:'смородина',two:'смородины',five:'смородины'},{one:'дыня',two:'дыни',five:'дынь'},{one:'арбуз',two:'арбуза',five:'арбузов'},{one:'лимон',two:'лимона',five:'лимонов'},{one:'апельсин',two:'апельсина',five:'апельсинов'},{one:'банан',two:'банана',five:'бананов'},{one:'мандарин',two:'мандарина',five:'мандаринов'},{one:'персик',two:'персика',five:'персиков'},{one:'орех',two:'ореха',five:'орехов'},
// Овощи (10)
{one:'морковь',two:'моркови',five:'морковей'},{one:'картофелина',two:'картофелины',five:'картофелин'},{one:'помидор',two:'помидора',five:'помидоров'},{one:'огурец',two:'огурца',five:'огурцов'},{one:'луковица',two:'луковицы',five:'луковиц'},{one:'репка',two:'репки',five:'репок'},{one:'свекла',two:'свеклы',five:'свекл'},{one:'капуста',two:'капусты',five:'кочанов'},{one:'горошина',two:'горошины',five:'горошин'},{one:'семечко',two:'семечка',five:'семечек'},
// Игрушки (12)
{one:'кукла',two:'куклы',five:'кукол'},{one:'машинка',two:'машинки',five:'машинок'},{one:'мяч',two:'мяча',five:'мячей'},{one:'кубик',two:'кубика',five:'кубиков'},{one:'робот',two:'робота',five:'роботов'},{one:'мишка',two:'мишки',five:'мишек'},{one:'зайка',two:'зайки',five:'заек'},{one:'котик',two:'котика',five:'котиков'},{one:'собачка',two:'собачки',five:'собачек'},{one:'машинка',two:'машинки',five:'машинок'},{one:'конструктор',two:'конструктора',five:'конструкторов'},{one:'пазл',two:'пазла',five:'пазлов'},
// Школьные принадлежности (10)
{one:'карандаш',two:'карандаша',five:'карандашей'},{one:'ручка',two:'ручки',five:'ручек'},{one:'линейка',two:'линейки',five:'линеек'},{one:'ластик',two:'ластика',five:'ластиков'},{one:'тетрадь',two:'тетради',five:'тетрадей'},{one:'книга',two:'книги',five:'книг'},{one:'пенал',two:'пенала',five:'пеналов'},{one:'рюкзак',two:'рюкзака',five:'рюкзаков'},{one:'альбом',two:'альбома',five:'альбомов'},{one:'фломастер',two:'фломастера',five:'фломастеров'},
// Еда и сладости (8)
{one:'конфета',two:'конфеты',five:'конфет'},{one:'печенье',two:'печенья',five:'печенья'},{one:'пряник',two:'пряника',five:'пряников'},{one:'пирожок',two:'пирожка',five:'пирожков'},{one:'булочка',two:'булочки',five:'булочек'},{one:'торт',two:'торта',five:'тортов'},{one:'пицца',two:'пиццы',five:'кусков пиццы'},{one:' мороженое',two:'мороженого',five:'мороженых'},
// Животные (10)
{one:'котенок',two:'котенка',five:'котят'},{one:'щенок',two:'щенка',five:'щенков'},{one:'птица',two:'птицы',five:'птиц'},{one:'рыбка',two:'рыбки',five:'рыбок'},{one:'хомяк',two:'хомяка',five:'хомяков'},{one:'морская свинка',two:'морские свинки',five:'морских свинок'},{one:'кролик',two:'кролика',five:'кроликов'},{one:'попугай',two:'попугая',five:'попугаев'},{one:'черепаха',two:'черепахи',five:'черепах'},{one:'бабочка',two:'бабочки',five:'бабочек'},
// Деньги (3)
{one:'монета',two:'монеты',five:'монет'},{one:'рубль',two:'рубля',five:'рублей'},{one:'копейка',two:'копейки',five:'копеек'},
// Природные явления и другое (7)
{one:'снежинка',two:'снежинки',five:'снежинок'},{one:'листок',two:'листка',five:'листков'},{one:'цветок',two:'цветка',five:'цветов'},{one:'гриб',two:'гриба',five:'грибов'},{one:'камень',two:'камня',five:'камней'},{one:'ракушка',two:'ракушки',five:'ракушек'},{one:'жёлудь',two:'жёлудя',five:'жёлудей'}
];
const loadBestLevels = () => { const s = localStorage.getItem('mathTrainer_bestLevels'); if(s) bestLevels = JSON.parse(s); };
const saveBestLevels = () => localStorage.setItem('mathTrainer_bestLevels', JSON.stringify(bestLevels));
const getCurrentBestLevel = () => bestLevels[originalGameMode] || 1;
const updateBestLevel = () => {
if (currentLevel > getCurrentBestLevel()) {
bestLevels[originalGameMode] = currentLevel;
saveBestLevels();
const el = document.getElementById('level');
if(el) { el.classList.add('level-up-anim'); setTimeout(() => el.classList.remove('level-up-anim'), 500); }
}
};
const loadStatistics = () => { const s = localStorage.getItem('mathTrainer_statistics'); if(s) statistics = JSON.parse(s); else statistics = { all: [] }; };
const saveStatistics = () => localStorage.setItem('mathTrainer_statistics', JSON.stringify(statistics));
const addStatistics = (type, c, t) => {
const now = new Date();
statistics.all.push({ date: now.toISOString(), correct: c, total: t, accuracy: Math.round((c/t)*100), gameMode: originalGameMode });
const y = new Date(); y.setFullYear(y.getFullYear()-1);
statistics.all = statistics.all.filter(r => new Date(r.date) >= y);
saveStatistics();
};
const filterRecordsByPeriod = (records, period) => {
const now = new Date();
let cut;
if(period === 'today') cut = new Date(now.getFullYear(), now.getMonth(), now.getDate());
else if(period === 'week') { cut = new Date(); cut.setDate(cut.getDate()-7); }
else if(period === 'month') { cut = new Date(); cut.setDate(cut.getDate()-30); }
else cut = new Date(0);
return records.filter(r => new Date(r.date) >= cut);
};
// --- Навигация ---
window.showSubMenu = (type) => {
document.getElementById('menu').classList.add('hidden');
document.querySelectorAll('.submenu, .dropdown-menu').forEach(m => m.classList.add('hidden'));
const el = document.getElementById(type);
if(el) el.classList.remove('hidden');
};
window.showMainMenu = () => {
document.querySelectorAll('.submenu, .dropdown-menu').forEach(m => m.classList.add('hidden'));
// Очищаем сохранение при возврате в главное меню
localStorage.removeItem('mathTrainer_lastMode');
localStorage.removeItem('mathTrainer_lastStats');
document.getElementById('continue-btn').classList.add('hidden');
document.getElementById('menu').classList.remove('hidden');
};
window.toggleMiniGames = () => {
document.getElementById('menu').classList.add('hidden');
document.getElementById('mini-games-menu').classList.remove('hidden');
};
window.showSettings = () => {
document.getElementById('menu').classList.add('hidden');
document.getElementById('settings').classList.remove('hidden');
};
window.showHelp = () => {
document.getElementById('menu').classList.add('hidden');
document.getElementById('help').classList.remove('hidden');
};
window.showMenu = () => {
stopTimer();
document.getElementById('game').classList.add('hidden');
document.getElementById('results').classList.add('hidden');
document.getElementById('stats').classList.add('hidden');
document.getElementById('settings').classList.add('hidden');
document.getElementById('help').classList.add('hidden');
document.querySelectorAll('.submenu, .dropdown-menu').forEach(m => m.classList.add('hidden'));
document.getElementById('menu').classList.remove('hidden');
// Показываем кнопку "Продолжить" если есть сохранённая игра
const lastMode = localStorage.getItem('mathTrainer_lastMode');
const lastStats = localStorage.getItem('mathTrainer_lastStats');
if(lastMode && lastStats) {
const continueBtn = document.getElementById('continue-btn');
if(continueBtn) {
continueBtn.classList.remove('hidden');
// Показываем название последнего режима в заголовке
const modeNames = {
'simpleAll': 'Простые операции',
'addition': 'Сложение',
'subtraction': 'Вычитание',
'multiplication': 'Умножение',
'division': 'Деление',
'complexAll': 'Сложные задания',
'parentheses': 'Скобки',
'variables': 'Переменные',
'units': 'Единицы измерения',
'expressions': 'Выражения',
'equations': 'Уравнения',
'wordProblems': 'Текстовые задачи',
'complexEquations': 'Сложные уравнения',
'compareExpressions': 'Сравнение выражений',
'timed_mode': 'Счёт на время',
'free_training': 'Свободная тренировка',
'find_pair': 'Найди пару',
'number_hunt': 'Числовые домики',
'logic_chains': 'Логические цепочки',
'pattern_finder': 'Закономерности',
'quick_math': 'Верно/Неверно',
'color_math': 'Вставь знак',
'multiplication_table': 'Таблица умножения',
'multiplication_all': 'Вся таблица',
'multiplication_selected': 'Выборочная таблица'
};
const modeTitle = continueBtn.querySelector('.btn-title');
if(modeTitle) {
modeTitle.textContent = 'Продолжить игру: ' + (modeNames[lastMode] || lastMode);
}
}
}
};
window.continueGame = () => {
document.getElementById('results').classList.add('hidden');
// Читаем режим из localStorage вместо originalGameMode
const savedMode = localStorage.getItem('mathTrainer_lastMode');
if(savedMode) {
startGame(savedMode);
} else { 
showMenu();
}
};
window.toggleSound = () => {
soundEnabled = !soundEnabled;
const btn = document.getElementById('sound-toggle');
if(btn) { btn.textContent = soundEnabled ? 'ВКЛ' : 'ВЫКЛ'; btn.style.background = soundEnabled ? '#27ae60' : '#e74c3c'; }
};
window.changeTheme = () => {
const sel = document.getElementById('theme-select');
if(!sel) return;
// Меняем только цвет фона, сохраняя паттерн с цифрами
const themeColors = {
'default': '#667eea',
'sunny': '#f39c12',
'sky': '#3498db',
'forest': '#27ae60'
};
document.body.style.backgroundColor = themeColors[sel.value] || themeColors['default'];
};

window.changeStartLevel = () => {
const sel = document.getElementById('level-select');
if(!sel) return;
startLevel = parseInt(sel.value);
localStorage.setItem('startLevel', startLevel);
};

window.changeTimeLimit = () => {
const sel = document.getElementById('time-select');
if(!sel) return;
timeLimit = parseInt(sel.value);
localStorage.setItem('timeLimit', timeLimit);
};

window.changeFontSize = () => {
const sel = document.getElementById('font-select');
if(!sel) return;
fontSize = sel.value;
localStorage.setItem('fontSize', fontSize);
applyFontSize();
};

const applyFontSize = () => {
if (fontSize === 'small') {
document.documentElement.style.setProperty('--font-scale', '0.85');
} else if (fontSize === 'large') {
document.documentElement.style.setProperty('--font-scale', '1.15');
} else { 
document.documentElement.style.setProperty('--font-scale', '1');
}
};

window.clearAllStats = () => {
if (confirm('Вы уверены, что хотите удалить все результаты? Это действие нельзя отменить.')) {
localStorage.removeItem('mathTrainer_statistics');
localStorage.removeItem('mathTrainer_bestLevels');
statistics = { all: [] };
bestLevels = {};
alert('Все результаты удалены!');
}
};

window.startFreeTraining = () => {
const topics = [];
if (document.getElementById('topic-addition')?.checked) topics.push('addition');
if (document.getElementById('topic-subtraction')?.checked) topics.push('subtraction');
if (document.getElementById('topic-multiplication')?.checked) topics.push('multiplication');
if (document.getElementById('topic-division')?.checked) topics.push('division');
if (document.getElementById('topic-parentheses')?.checked) topics.push('parentheses');
if (document.getElementById('topic-variables')?.checked) topics.push('variables');
if (document.getElementById('topic-units')?.checked) topics.push('units');
if (document.getElementById('topic-expressions')?.checked) topics.push('expressions');
if (document.getElementById('topic-equations')?.checked) topics.push('equations');
if (document.getElementById('topic-wordProblems')?.checked) topics.push('wordProblems');

if (topics.length === 0) {
alert('Выбери хотя бы одну тему!');
return;
}

// Читаем диапазон чисел
numberRangeMin = parseInt(document.getElementById('num-min')?.value || '10');
numberRangeMax = parseInt(document.getElementById('num-max')?.value || '50');

selectedTopics = topics;
startGame('free_training');
};

let multiplicationNumber = 0;
let selectedMultiplicationNumbers = [2, 3, 4, 5]; // По умолчанию выбраны 2-5

// Диапазон чисел для свободной тренировки
let numberRangeMin = 10;
let numberRangeMax = 50;

window.startSelectedMultiplication = () => {
const nums = [];
for (let i = 2; i <= 10; i++) {
if (document.getElementById(`mult-${i}`)?.checked) nums.push(i);
}
if (nums.length === 0) {
alert('Выбери хотя бы одно число!');
return;
}
selectedMultiplicationNumbers = nums;
if (nums.length === 1) {
multiplicationNumber = nums[0];
startGame('multiplication_table');
} else {
startGame('multiplication_selected');
}
};

window.startMultiplicationTable = (num) => {
multiplicationNumber = num;
if (num === 0) {
selectedTopics = ['multiplication'];
startGame('multiplication_all');
} else {
startGame('multiplication_table');
}
};

// --- Игровая логика ---
window.startGame = (mode) => {
gameMode = mode; originalGameMode = mode; currentLevel = startLevel; currentExample = 1; score = 0; correctAnswers = 0; totalAnswers = 0; streak = 0; maxStreak = 0; isAnswerChecked = false;
houseState = { solved: 0, total: 3, errors: 0 };
// Сбрасываем прогресс-бар
const bar = document.getElementById('level-progress');
if(bar) bar.style.width = '0%';
const streakEl = document.getElementById('streak-display');
if(streakEl) streakEl.classList.remove('active');
if(mode.includes('timed')) {
timeLeft = timeLimit;
const t = document.getElementById('timer'); if(t) { t.classList.remove('hidden'); document.getElementById('time-left').textContent = timeLimit; }
const s = document.getElementById('score-counter'); if(s) { s.classList.remove('hidden'); document.getElementById('correct-count').textContent = '0'; }
startTimer();
} else {
const t = document.getElementById('timer'); if(t) t.classList.add('hidden');
const s = document.getElementById('score-counter'); if(s) s.classList.add('hidden');
}
document.getElementById('menu').classList.add('hidden');
document.querySelectorAll('.submenu, .dropdown-menu').forEach(m => m.classList.add('hidden'));
document.getElementById('game').classList.remove('hidden');
generateTask();
updateDisplay();
};
window.stopGame = () => {
stopTimer(); playGameOverSound(); document.getElementById('game').classList.add('hidden');
const s = document.getElementById('score-counter'); if(s) s.classList.add('hidden');
addStatistics('all', correctAnswers, totalAnswers);
// Сохраняем прогресс для кнопки "Продолжить"
localStorage.setItem('mathTrainer_lastMode', gameMode);
localStorage.setItem('mathTrainer_lastStats', JSON.stringify({
correctAnswers, totalAnswers, maxStreak, currentLevel
}));
document.getElementById('results').classList.remove('hidden');
document.getElementById('total-examples').textContent = totalAnswers;
document.getElementById('result-correct').textContent = correctAnswers;
document.getElementById('result-wrong').textContent = totalAnswers - correctAnswers;
document.getElementById('best-level').textContent = getCurrentBestLevel();
};
const startTimer = () => {
timerInterval = setInterval(() => {
timeLeft--;
const t = document.getElementById('time-left'); if(t) t.textContent = timeLeft;
if(timeLeft <= 0) endGame();
}, 1000);
};
const stopTimer = () => { if(timerInterval) clearInterval(timerInterval); timerInterval = null; };
let selectedTopics = ['addition','subtraction','multiplication','division'];

const getRandomSimpleOperation = () => ['addition','subtraction','division','multiplication'][Math.floor(Math.random()*4)];
const getRandomComplexOperation = () => ['parentheses','variables','units','expressions','equations','wordProblems','complexEquations','compareExpressions'][Math.floor(Math.random()*8)];
const getRandomAnyOperation = () => selectedTopics[Math.floor(Math.random() * selectedTopics.length)] || 'addition';
// --- Генераторы ---
const generateAddition = () => {
const a = getExtendedRandomInt(currentLevel), b = getExtendedRandomInt(currentLevel);
currentTask = { question: `${a} + ${b}`, answer: a + b, type: 'number' };
document.getElementById('expression-container').innerHTML = `
<div style="display:flex;align-items:center;justify-content:center;gap:15px;margin:20px 0;flex-wrap:wrap;font-size:42px;font-weight:bold;">
<div style="background:linear-gradient(135deg, #3498db, #2980b9);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(52,152,219,0.4);">${a}</div>
<div style="color:#27ae60;">+</div>
<div style="background:linear-gradient(135deg, #e74c3c, #c0392b);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(231,76,60,0.4);">${b}</div>
<div style="color:#27ae60;">=</div>
<div style="background:linear-gradient(135deg, #f1c40f, #f39c12);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(241,196,15,0.4);animation: pulse 1s infinite;">?</div>
</div>`;
showNumberInput();
};
const generateSubtraction = () => {
let a = getExtendedRandomInt(currentLevel), b = getExtendedRandomInt(currentLevel);
if(a < b) { const t=a; a=b; b=t; }
currentTask = { question: `${a} - ${b}`, answer: a - b, type: 'number' };
document.getElementById('expression-container').innerHTML = `
<div style="display:flex;align-items:center;justify-content:center;gap:15px;margin:20px 0;flex-wrap:wrap;font-size:42px;font-weight:bold;">
<div style="background:linear-gradient(135deg, #9b59b6, #8e44ad);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(155,89,182,0.4);">${a}</div>
<div style="color:#e74c3c;">−</div>
<div style="background:linear-gradient(135deg, #1abc9c, #16a085);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(26,188,156,0.4);">${b}</div>
<div style="color:#e74c3c;">=</div>
<div style="background:linear-gradient(135deg, #f1c40f, #f39c12);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(241,196,15,0.4);animation: pulse 1s infinite;">?</div>
</div>`;
showNumberInput();
};
const generateMultiplication = () => {
const a = getExtendedRandomInt(currentLevel), b = getExtendedRandomIntForMultiplication(currentLevel);
currentTask = { question: `${a} × ${b}`, answer: a * b, type: 'number' };
document.getElementById('expression-container').innerHTML = `
<div style="display:flex;align-items:center;justify-content:center;gap:15px;margin:20px 0;flex-wrap:wrap;font-size:42px;font-weight:bold;">
<div style="background:linear-gradient(135deg, #e67e22, #d35400);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(230,126,34,0.4);">${a}</div>
<div style="color:#e67e22;">×</div>
<div style="background:linear-gradient(135deg, #27ae60, #229954);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(39,174,96,0.4);">${b}</div>
<div style="color:#e67e22;">=</div>
<div style="background:linear-gradient(135deg, #f1c40f, #f39c12);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(241,196,15,0.4);animation: pulse 1s infinite;">?</div>
</div>`;
showNumberInput();
};
const generateDivision = () => {
const b = getRandomInt(2, 8), ans = getRandomInt(2, 10), a = b * ans;
currentTask = { question: `${a} ÷ ${b}`, answer: ans, type: 'number' };
document.getElementById('expression-container').innerHTML = `
<div style="display:flex;align-items:center;justify-content:center;gap:15px;margin:20px 0;flex-wrap:wrap;font-size:42px;font-weight:bold;">
<div style="background:linear-gradient(135deg, #34495e, #2c3e50);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(52,73,94,0.4);">${a}</div>
<div style="color:#34495e;">÷</div>
<div style="background:linear-gradient(135deg, #e74c3c, #c0392b);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(231,76,60,0.4);">${b}</div>
<div style="color:#34495e;">=</div>
<div style="background:linear-gradient(135deg, #f1c40f, #f39c12);color:white;width:80px;height:80px;border-radius:15px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 15px rgba(241,196,15,0.4);animation: pulse 1s infinite;">?</div>
</div>`;
showNumberInput();
};
const generateParentheses = () => {
const a = getExtendedRandomInt(currentLevel), b = getExtendedRandomInt(currentLevel), c = getExtendedRandomIntForMultiplication(currentLevel);
const types = [{expr:`(${a} + ${b}) × ${c}`,ans:(a+b)*c},{expr:`(${a} - ${b}) × ${c}`,ans:(a-b)*c},{expr:`${a} × (${b} + ${c})`,ans:a*(b+c)},{expr:`${a} × (${b} - ${c})`,ans:a*(b-c)}];
if((a+b)%c===0) types.push({expr:`(${a} + ${b}) ÷ ${c}`,ans:(a+b)/c});
if((a-b)%c===0 && a>b) types.push({expr:`(${a} - ${b}) ÷ ${c}`,ans:(a-b)/c});
if(a%(b+c)===0) types.push({expr:`${a} ÷ (${b} + ${c})`,ans:a/(b+c)});
if(a%(b-c)===0 && b>c) types.push({expr:`${a} ÷ (${b} - ${c})`,ans:a/(b-c)});
const s = types[Math.floor(Math.random()*types.length)];
currentTask = { question: s.expr, answer: s.ans, type: 'number' };
document.getElementById('expression-container').innerHTML = `<div class="game-task-text-sm" style="color: #2c3e50;">${s.expr} = ?</div>`;
showNumberInput();
};
const generateVariables = () => {
const type = Math.floor(Math.random() * 4);
let x, a, expr;
const p = levelParams[currentLevel];
if (type === 0) { 
x = getExtendedRandomInt(currentLevel);
a = getExtendedRandomInt(currentLevel);
expr = `x + ${a} = ${x + a}`;
} else if (type === 1) { 
a = getExtendedRandomInt(currentLevel);
const minVal = Math.max(p.min, a);
x = getRandomInt(minVal, p.max);
expr = `x - ${a} = ${x - a}`;
} else if (type === 2) { 
x = getExtendedRandomInt(currentLevel);
a = getExtendedRandomInt(currentLevel);
expr = `${a} + x = ${a + x}`;
} else { 
a = getExtendedRandomInt(currentLevel);
const maxVal = Math.min(p.max, a);
x = getRandomInt(p.min, maxVal);
expr = `${a} - x = ${a - x}`;
}
currentTask = {question: expr, answer: x, type: 'number'};
document.getElementById('expression-container').innerHTML = `<div class="task-text" style="font-size: 42px; font-weight: bold; margin: 40px 0;">${expr}<br><span style="color:#333;">x = ?</span></div>`;
showNumberInput();
};
const generateUnits = () => {
    // Типы задач: 0-перевод в меньшую, 1-перевод в большую, 2-сравнение, 3-сложение/вычитание
    const taskType = getRandomInt(0, 3);
    
    // Единицы измерения для 2 класса: дм/см, м/дм, руб/коп
    const unitPairs = [
        { big: 'дм', small: 'см', ratio: 10 },
        { big: 'м', small: 'дм', ratio: 10 },
        { big: 'руб', small: 'коп', ratio: 100 },
    ];
    
    const pair = unitPairs[Math.floor(Math.random() * unitPairs.length)];
    
    // === Тип 0: Перевод из большей в меньшую (1 дм 3 см = ? см) ===
    if (taskType === 0) {
        const bigVal = getRandomInt(1, 3);
        const smallVal = getRandomInt(1, pair.ratio - 1);
        const answer = bigVal * pair.ratio + smallVal;
        
        currentTask = { 
            question: `${bigVal} ${pair.big} ${smallVal} ${pair.small}`, 
            answer: answer, 
            type: 'number' 
        };
        
        document.getElementById('expression-container').innerHTML = `
            <div class="task-text" style="font-size:38px; font-weight:bold; margin:40px 0;">
                <div style="display:inline-flex; align-items:center; gap:10px;">
                    <span style="background:#e8f5e9; padding:10px 15px; border-radius:10px;">${bigVal} ${pair.big}</span>
                    <span style="color:#27ae60;">+</span>
                    <span style="background:#e8f5e9; padding:10px 15px; border-radius:10px;">${smallVal} ${pair.small}</span>
                    <span style="color:#27ae60;">=</span>
                    <span style="background:#fff3cd; padding:10px 20px; border-radius:10px; border:2px dashed #ffc107;">? ${pair.small}</span>
                </div>
            </div>`;
        showNumberInput();
        return;
    }
    
    // === Тип 1: Перевод из меньшей в большую (15 см = ? см или 15 см = ? дм + ? см) ===
    if (taskType === 1) {
        const bigVal = getRandomInt(1, 3);
        const smallVal = getRandomInt(1, pair.ratio - 1);
        const totalSmall = bigVal * pair.ratio + smallVal;
        
        // 50% - просто перевод в меньшую единицу (уже есть в типе 0)
        // 50% - разложение на сумму двух единиц
        const simpleMode = Math.random() > 0.5;
        
        if (simpleMode) {
            // Простой перевод: 15 см = ? дм (без остатка)
            const roundBig = getRandomInt(1, 3) * pair.ratio;
            currentTask = { 
                question: `${roundBig} ${pair.small} = ? ${pair.big}`, 
                answer: roundBig / pair.ratio, 
                type: 'number'
            };
            document.getElementById('expression-container').innerHTML = `
                <div class="task-text" style="font-size:38px; font-weight:bold; margin:40px 0;">
                    <div style="display:inline-flex; align-items:center; gap:10px;">
                        <span style="background:#e3f2fd; padding:10px 15px; border-radius:10px;">${roundBig} ${pair.small}</span>
                        <span style="color:#1976d2;">=</span>
                        <span style="background:#fff3cd; padding:10px 20px; border-radius:10px; border:2px dashed #ffc107;">? ${pair.big}</span>
                    </div>
                </div>`;
            showNumberInput();
            return;
        }
        
        // Сложный перевод: раскладываем на сумму (прячем одну часть)
        currentTask = { 
            question: `${totalSmall} ${pair.small}`, 
            answer: 0, // не используется, ответ в bigAnswer или smallAnswer
            type: 'oneNumber',
            answerValue: 0
        };
        
        // Случайно прячем либо большие, либо маленькие единицы
        const hideBig = Math.random() > 0.5;
        
        if (hideBig) {
            // 273 коп = ? руб + 73 коп
            currentTask.answerValue = bigVal;
            currentTask.answer = bigVal;
            document.getElementById('expression-container').innerHTML = `
                <div class="task-text" style="font-size:38px; font-weight:bold; margin:40px 0;">
                    <div style="display:inline-flex; align-items:center; gap:10px;">
                        <span style="background:#e3f2fd; padding:10px 15px; border-radius:10px;">${totalSmall} ${pair.small}</span>
                        <span style="color:#1976d2;">=</span>
                        <span style="background:#fff3cd; padding:10px 15px; border-radius:10px; border:2px dashed #ffc107;">? ${pair.big}</span>
                        <span style="color:#1976d2;">+</span>
                        <span style="background:#e8f5e9; padding:10px 15px; border-radius:10px;">${smallVal} ${pair.small}</span>
                    </div>
                </div>`;
        } else {
            // 273 коп = 2 руб + ? коп
            currentTask.answerValue = smallVal;
            currentTask.answer = smallVal;
            document.getElementById('expression-container').innerHTML = `
                <div class="task-text" style="font-size:38px; font-weight:bold; margin:40px 0;">
                    <div style="display:inline-flex; align-items:center; gap:10px;">
                        <span style="background:#e3f2fd; padding:10px 15px; border-radius:10px;">${totalSmall} ${pair.small}</span>
                        <span style="color:#1976d2;">=</span>
                        <span style="background:#e8f5e9; padding:10px 15px; border-radius:10px;">${bigVal} ${pair.big}</span>
                        <span style="color:#1976d2;">+</span>
                        <span style="background:#fff3cd; padding:10px 15px; border-radius:10px; border:2px dashed #ffc107;">? ${pair.small}</span>
                    </div>
                </div>`;
        }
        
        showNumberInput();
        return;
    }
    
    // === Тип 2: Сравнение величин ===
    if (taskType === 2) {
        const val1 = getRandomInt(1, 15);
        const val2Big = getRandomInt(1, 2);
        const val2Small = getRandomInt(0, 9);
        const val2Total = val2Big * pair.ratio + val2Small;
        
        const leftIsFirst = Math.random() > 0.5;
        
        let leftStr = leftIsFirst ? `${val1} ${pair.small}` : (val2Small > 0 ? `${val2Big} ${pair.big} ${val2Small} ${pair.small}` : `${val2Big} ${pair.big}`);
        let rightStr = leftIsFirst ? (val2Small > 0 ? `${val2Big} ${pair.big} ${val2Small} ${pair.small}` : `${val2Big} ${pair.big}`) : `${val1} ${pair.small}`;
        
        const leftTotal = leftIsFirst ? val1 : val2Total;
        const rightTotal = leftIsFirst ? val2Total : val1;
        
        let correctSign;
        if (leftTotal === rightTotal) correctSign = '=';
        else if (leftTotal > rightTotal) correctSign = '>';
        else correctSign = '<';
        
        currentTask = { question: `${leftStr} ? ${rightStr}`, answer: correctSign, type: 'symbol' };
        
        document.getElementById('expression-container').innerHTML = `
            <div class="task-text" style="font-size:34px; font-weight:bold; margin:40px 0;">
                <div style="display:inline-flex; align-items:center; gap:15px; flex-wrap:wrap; justify-content:center;">
                    <span style="background:#fce4ec; padding:10px 15px; border-radius:10px;">${leftStr}</span>
                    <span style="background:#fff3cd; padding:10px 20px; border-radius:10px; border:2px dashed #ffc107; min-width:50px;">?</span>
                    <span style="background:#fce4ec; padding:10px 15px; border-radius:10px;">${rightStr}</span>
                </div>
            </div>`;
        showCompareButtons();
        return;
    }
    
    // === Тип 3: Простое сложение/вычитание ===
    const a = getExtendedRandomInt(currentLevel);
    const b = getExtendedRandomInt(currentLevel);
    let q, ans;
    
    if (Math.random() > 0.5) {
        q = `${a} ${pair.small} + ${b} ${pair.small}`;
        ans = a + b;
    } else {
        const max = Math.max(a, b);
        const min = Math.min(a, b);
        q = `${max} ${pair.small} - ${min} ${pair.small}`;
        ans = max - min;
    }
    
    currentTask = { question: q, answer: ans, type: 'number' };
    document.getElementById('expression-container').innerHTML = `
        <div class="task-text" style="font-size:42px; font-weight:bold; margin:40px 0;">
            ${q} = ?
        </div>`;
    showNumberInput();
};
const generateExpressions = () => {
const a = getExtendedRandomInt(currentLevel), b = getExtendedRandomIntForMultiplication(currentLevel), c = getExtendedRandomIntForMultiplication(currentLevel);
const types = [{expr:`${a} + ${b} × ${c}`,ans:a+b*c},{expr:`${a} × ${b} + ${c}`,ans:a*b+c},{expr:`${a} - ${b} × ${c}`,ans:a-b*c},{expr:`${a} × ${b} - ${c}`,ans:a*b-c}];
if(a%b===0) { types.push({expr:`${a} ÷ ${b} + ${c}`,ans:a/b+c}); types.push({expr:`${a} ÷ ${b} - ${c}`,ans:a/b-c}); }
if(c%b===0) { types.push({expr:`${a} + ${c} ÷ ${b}`,ans:a+c/b}); types.push({expr:`${a} - ${c} ÷ ${b}`,ans:a-c/b}); }
const s = types[Math.floor(Math.random()*types.length)];
currentTask = {question:s.expr, answer:s.ans, type:'number'};
document.getElementById('expression-container').innerHTML = `<div class="game-task-text-sm" style="color: #2c3e50;">${s.expr} = ?</div>`;
showNumberInput();
};
const generateEquations = () => {
const type = Math.floor(Math.random() * 3);
let x, a, expr;
const p = levelParams[currentLevel];
if (type === 0) { 
a = getExtendedRandomIntForMultiplication(currentLevel);
const maxMult = Math.floor(100 / a);
const limit = Math.min(p.max, maxMult);
if (limit >= 2) x = getRandomInt(2, limit);
else x = 2;
expr = `${a} × x = ${a*x}`;
} else if (type === 1) { 
x = getExtendedRandomInt(currentLevel);
a = getExtendedRandomInt(currentLevel);
expr = `${a} + x = ${a+x}`;
} else {
a = getExtendedRandomInt(currentLevel);
const maxVal = Math.min(p.max, a);
x = getRandomInt(p.min, maxVal);
expr = `${a} - x = ${Math.max(a-x,0)}`;
}
currentTask = {question: expr, answer: x, type: 'number'};
document.getElementById('expression-container').innerHTML = `<div class="task-text" style="font-size: 42px; font-weight: bold; margin: 40px 0;">${expr}<br><span style="color:#333;">x = ?</span></div>`;
showNumberInput();
};
const generateComplexEquations = () => {
const type = Math.floor(Math.random() * 4);
let x, a, b, expr;
const p = levelParams[currentLevel];
if (type === 0) { 
a = getRandomInt(2, 3);
b = getRandomInt(1, 5);
const maxRes = 100; 
x = getRandomInt(p.min, Math.floor((maxRes / a) - b));
if (x < p.min) x = p.min;
expr = `${a}(x + ${b}) = ${a*(x+b)}`;
} else if (type === 1) { 
a = getRandomInt(2, 3);
b = getRandomInt(1, 5);
x = getRandomInt(Math.max(p.min, b), p.max);
expr = `${a}(x - ${b}) = ${a*(x-b)}`;
} else if (type === 2) { 
a = getRandomInt(2, 4);
b = getRandomInt(1, 10);
const maxRes = 100;
x = getRandomInt(p.min, Math.floor((maxRes - b) / a));
if (x < p.min) x = p.min;
expr = `${a}x + ${b} = ${a*x+b}`;
} else {
a = getRandomInt(2, 4);
b = getRandomInt(1, 10);
const minAx = b;
const minX = Math.ceil(minAx / a);
x = getRandomInt(Math.max(p.min, minX), p.max);
expr = `${a}x - ${b} = ${a*x-b}`;
}
currentTask = {question: expr, answer: x, type: 'number'};
document.getElementById('expression-container').innerHTML = `<div class="game-task-text-xs" style="color: #2c3e50;">${expr}<br><span style="color:#333;">x = ?</span></div>`;
showNumberInput();
};
const generateCompareExpressions = () => {
const a = getExtendedRandomInt(currentLevel), b = getExtendedRandomInt(currentLevel), c = getExtendedRandomInt(currentLevel);
const l = a+b, r = c*2;
currentTask = {question:`${a} + ${b} ? ${c} × 2`, answer:l>r?'>':l<r?'<':'=', type:'symbol'};
document.getElementById('expression-container').innerHTML = `<div class="task-text" style="font-size: 48px; font-weight: bold; margin: 40px 0;">${a} + ${b} ? ${c} × 2</div>`;
showCompareButtons();
};
const generateWordProblems = () => {
const s = wordSubjects[Math.floor(Math.random()*wordSubjects.length)];
const n1 = getRandomInt(1,10+currentLevel), n2 = getRandomInt(1,10+currentLevel);
let t, ans;
const r = Math.random();

// Варианты формулировок для вычитания
const subtractPhrases = [
    `В корзине было ${0}. Взяли ${1}. Сколько ${2} осталось?`,
    `На столе лежало ${0}. Убрали ${1}. Сколько ${2} осталось?`,
    `В вазе было ${0}. Взяли ${1}. Сколько ${2} осталось?`,
    `На полке стояло ${0}. Унесли ${1}. Сколько ${2} осталось?`,
    `В коробке было ${0}. Вынули ${1}. Сколько ${2} осталось?`
];

// Новые типы задач
if(r<0.15) { 
    // Сложение двух детей
    ans=n1+n2; 
    t=`У Пети ${n1} ${getPlural(n1,s.one,s.two,s.five)}, а у Васи ${n2} ${getPlural(n2,s.one,s.two,s.five)}. Сколько всего ${s.five} у них вместе?`; 
}
else if(r<0.25) { 
    // Вычитание
    const max=Math.max(n1,n2), min=Math.min(n1,n2); 
    ans=max-min; 
    const phrase = subtractPhrases[Math.floor(Math.random() * subtractPhrases.length)];
    t = phrase
        .replace('${0}', max + ' ' + getPlural(max,s.one,s.two,s.five))
        .replace('${1}', min + ' ' + getPlural(min,s.one,s.two,s.five))
        .replace('${2}', s.five);
}
else if(r<0.35) { 
    // Умножение
    const m = getRandomInt(2,5); 
    ans=n1*m; 
    t=`В одну коробку положили ${n1} ${getPlural(n1,s.one,s.two,s.five)}. Сколько ${s.five} в ${m} коробках?`; 
}
else if(r<0.45) { 
    // Деление
    const d = getRandomInt(2,5), tot = n1*d; 
    ans=n1; 
    t=`${tot} ${getPlural(tot,s.one,s.two,s.five)} разложили на ${d} кучки. Сколько ${s.five} в каждой кучке?`; 
}
else if(r<0.55) {
    // Задачи на деньги
    const price = getRandomInt(2, 10);
    const count = getRandomInt(2, 5);
    ans = price * count;
    t=`Конфета стоит ${price} рублей. Сколько стоят ${count} ${getPlural(count, 'конфета', 'конфеты', 'конфет')}?`;
}
else if(r<0.65) {
    // Задачи на сравнение
    const a = getRandomInt(5, 20+currentLevel);
    const b = getRandomInt(5, 20+currentLevel);
    ans = Math.abs(a - b);
    t=`У Маши ${a} ${getPlural(a,s.one,s.two,s.five)}, а у Дашы ${b} ${getPlural(b,s.one,s.two,s.five)}. На сколько ${s.five} у одной девочки больше, чем у другой?`;
}
else if(r<0.75) {
    // Задачи на остаток
    const total = getRandomInt(10, 30);
    const given = getRandomInt(1, Math.min(total-1, 10));
    ans = total - given;
    t=`Было ${total} ${getPlural(total,s.one,s.two,s.five)}. Отдали другу ${given} ${getPlural(given,s.one,s.two,s.five)}. Сколько ${s.five} осталось?`;
}
else if(r<0.85) {
    // Задачи на два действия
    const a = getRandomInt(3, 10);
    const b = getRandomInt(2, 5);
    const c = getRandomInt(2, 5);
    ans = a * b - c;
    t=`Купили ${b} тетради по ${a} рублей и заплатили ${c} рубля сдачи. Сколько рублей было у покупателя?`;
}
else {
    // Задачи на периметр
    const side = getRandomInt(2, 8);
    ans = side * 4;
    t=`Сторона квадрата равна ${side} см. Найди периметр квадрата (сумма всех сторон).`;
}
currentTask = {question:t, answer:ans, type:'number'};
const el = document.getElementById('text-question');
if(el) { el.textContent=t; el.classList.remove('hidden'); el.style.cssText='font-size:22px;line-height:1.5;margin-bottom:20px;color:#2c3e50;'; }
showNumberInput();
};
// --- Мини-игры ---
const shuffleArray = (arr) => { for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]; } };
const generateEasyPairs = (lvl, n) => {
const p = [];
// Диапазон чисел растет с уровнем (как в домиках)
const maxAdd = 5 + lvl * 2;  // ур.1 = 7, ур.5 = 15, ур.10 = 25
const maxSub = 5 + lvl * 3;  // ур.1 = 8, ур.5 = 20, ур.10 = 35
for(let i=0;i<n;i++){
const ty = ['comp','add','sub'][Math.floor(Math.random()*3)];
let ex, an;
if(ty==='comp'){ const t=getRandomInt(5, maxAdd), p1=getRandomInt(1, t-1); ex=`${t} = ${p1} + ?`; an=(t-p1).toString(); }
else if(ty==='add'){ const a=getRandomInt(1, maxAdd), b=getRandomInt(1, maxAdd); ex=`${a} + ${b}`; an=(a+b).toString(); }
else { const c=getRandomInt(5, maxSub), d=getRandomInt(1, c); ex=`${c} - ${d}`; an=(c-d).toString(); }
p.push({ex, an});
}
return p;
};
const generateHardPairs = (lvl, n) => {
const p = [];
// Диапазон чисел растет с уровнем
const maxMul = Math.min(4 + lvl, 10);   // ур.1 = 5, ур.6 = 10 (макс)
const maxDiv = Math.min(4 + lvl, 12);   // ур.1 = 5, ур.8 = 12 (макс)
const maxCmp = 10 + lvl * 10;           // ур.1 = 20, ур.10 = 110
for(let i=0;i<n;i++){
const ty = ['mul','cmp','div'][Math.floor(Math.random()*3)];
let ex, an;
if(ty==='mul'){ const m1=getRandomInt(2, maxMul), m2=getRandomInt(2, maxMul); ex=`${m1} × ${m2}`; an=(m1*m2).toString(); }
else if(ty==='cmp'){ const n1=getRandomInt(10, maxCmp), n2=getRandomInt(10, maxCmp), s=n1>n2?'>':n1<n2?'<':'='; ex=`${n1} ? ${n2}`; an=s; }
else { const d=getRandomInt(2, maxDiv), q=getRandomInt(2, maxDiv); ex=`${d*q} ÷ ${d}`; an=q.toString(); }
p.push({ex, an});
}
return p;
};
window.showFindPairGame = (pairs) => {
document.getElementById('answer').classList.add('hidden');
document.getElementById('check-btn').classList.add('hidden');
document.getElementById('compare-btns').classList.add('hidden');
document.getElementById('tf-btns').classList.add('hidden');
let cards = [];
pairs.forEach((p,i) => {
cards.push({id:'ex_'+i, con:p.ex, ans:p.an, ty:'ex'});
cards.push({id:'an_'+i, con:p.an, ans:p.an, ty:'an'});
});
shuffleArray(cards);
let h = `<div class="find-pair-game"><div class="game-header-info"><p>Ходы: <span id="moves-count">0</span></p><p>Найдено: <span id="pairs-found">0</span>/${pairs.length}</p></div><div class="cards-grid">`;
cards.forEach(c => {
h += `<div class="card" data-id="${c.id}" data-ans="${c.ans}" data-ty="${c.ty}" onclick="flipCard('${c.id}')"><div class="card-inner"><div class="card-front">?</div><div class="card-back">${c.con}</div></div></div>`;
});
h += `</div><div class="find-pair-controls"><button class="menu-btn" onclick="generateFindPairTask()">Новая игра</button><button class="menu-btn" onclick="showMenu()">В меню</button></div></div>`;
document.getElementById('expression-container').innerHTML = h;
window.findPairGame = { cards, flipped:[], moves:0, matches:0, total:pairs.length };
};
window.flipCard = (id) => {
const g = window.findPairGame;
if(!g || g.flipped.length>=2) return;
const c = document.querySelector(`[data-id="${id}"]`);
if(!c || c.classList.contains('flipped') || c.classList.contains('matched')) return;
c.classList.add('flipped'); g.flipped.push(id);
if(g.flipped.length===2) {
g.moves++; document.getElementById('moves-count').textContent = g.moves;
setTimeout(() => {
const [id1,id2] = g.flipped;
const c1 = document.querySelector(`[data-id="${id1}"]`), c2 = document.querySelector(`[data-id="${id2}"]`);
if(c1.dataset.ans===c2.dataset.ans && c1.dataset.ty!==c2.dataset.ty) {
c1.classList.add('matched'); c2.classList.add('matched'); g.matches++;
document.getElementById('pairs-found').textContent = g.matches;
playCorrectSound();
if(g.matches===g.total) setTimeout(()=>completeFindPairGame(), 500);
} else {
c1.classList.remove('flipped'); c2.classList.remove('flipped'); playWrongSound();
}
g.flipped = [];
}, 1000);
}
};
const completeFindPairGame = () => {
const g = window.findPairGame;
correctAnswers = g.matches; totalAnswers = g.total;
addStatistics('all', correctAnswers, totalAnswers); updateBestLevel();
showMessage(`Отлично! Найдено за ${g.moves} ${getPlural(g.moves, 'ход', 'хода', 'ходов')}!`, true); playLevelUpSound();
setTimeout(() => { currentLevel++; updateDisplay(); generateTask(); }, 1500);
};
window.generateFindPairTask = () => {
if(currentLevel>10) {
stopTimer();
document.getElementById('expression-container').innerHTML = `<div style="text-align:center;padding:20px;"><h2 style="color:#27ae60;">🎉 Пройдено!</h2><p>Ты прошел все уровни!</p><br><button class="menu-btn" onclick="showMenu()">В меню</button></div>`;
return;
}
// Количество пар растет с уровнем: 2 пары на 1-2 уровне, 3 на 3-4, 4 на 5-6, 5 на 7-8, 6 на 9-10
let numPairs = 2;
if (currentLevel >= 3) numPairs = 3;
if (currentLevel >= 5) numPairs = 4;
if (currentLevel >= 7) numPairs = 5;
if (currentLevel >= 9) numPairs = 6;

// Очищаем контейнер перед созданием новой игры
document.getElementById('expression-container').innerHTML = '';
window.findPairGame = null;
showFindPairGame(currentLevel<=5 ? generateEasyPairs(currentLevel, numPairs) : generateHardPairs(currentLevel, numPairs));
};
// --- ОБНОВЛЕННЫЙ ДИЗАЙН: Числовые домики ---
const generateNumberHuntTask = () => {
if(currentLevel > 10) {
stopTimer();
document.getElementById('expression-container').innerHTML = `<div style="text-align:center;padding:20px;"><h2 style="color:#27ae60;">🎉 Пройдено!</h2><p>Ты прошел все уровни Числовых домиков!</p><br><button class="menu-btn" onclick="showMenu()">В меню</button></div>`;
return;
}
// Количество домиков растет с уровнем: 2 на 1-2 уровне, 3 на 3-5, 4 на 6-8, 5 на 9-10
let numHouses = 2;
if (currentLevel >= 3) numHouses = 3;
if (currentLevel >= 6) numHouses = 4;
if (currentLevel >= 9) numHouses = 5;

houseState = { solved: 0, total: numHouses, errors: 0 };
const maxVal = 5 + currentLevel * 2; 
let html = `<div style="text-align:center; font-family: sans-serif;">
<h3 style="color:#2c3e50; margin-bottom:10px;">Числовые домики</h3>
<p style="color:#7f8c8d; margin-bottom:25px;">Уровень ${currentLevel} из 10. Реши все ${numHouses} ${getPlural(numHouses, 'пример', 'примера', 'примеров')}</p>
<div style="display:flex; flex-direction:column; gap:20px; align-items:center; margin-top:10px;">`;
for (let i = 0; i < numHouses; i++) {
const num1 = getRandomInt(1, maxVal);
const num2 = getRandomInt(1, maxVal);
const target = num1 + num2;
const isNum1Hidden = Math.random() > 0.5;
const hiddenValue = isNum1Hidden ? num1 : num2;
let opts = [hiddenValue];
while (opts.length < 3) {
let r = getRandomInt(1, maxVal * 2);
if (!opts.includes(r)) opts.push(r);
}
shuffleArray(opts);
const cardStyle = `background:white; padding:20px; border-radius:15px; width:100%; max-width:340px; box-shadow:0 4px 15px rgba(0,0,0,0.08); margin:0 auto; border:1px solid #e0e0e0; transition: transform 0.2s;`;
const numBoxStyle = `background:#f8f9fa; border:2px solid #dee2e6; color:#2c3e50; font-weight:bold; font-size:24px; width:60px; height:60px; display:flex; align-items:center; justify-content:center; border-radius:10px;`;
const hiddenBoxStyle = `background:#fff3cd; border:2px dashed #ffc107; color:#856404; font-weight:bold; font-size:28px; width:60px; height:60px; display:flex; align-items:center; justify-content:center; border-radius:10px; animation: pulse 2s infinite;`;
const targetBoxStyle = `background: linear-gradient(135deg, #27ae60, #2ecc71); color:white; font-weight:bold; font-size:24px; padding:0 20px; height:60px; display:flex; align-items:center; justify-content:center; border-radius:10px; box-shadow:0 4px 6px rgba(39, 174, 96, 0.3);`;
const btnStyle = `flex:1; padding:12px 0; font-size:18px; border:none; border-radius:8px; cursor:pointer; background:#ecf0f1; color:#2c3e50; font-weight:bold; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
html += `<div class="house-card" style="${cardStyle}">
<div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-bottom:20px;">
<span style="${isNum1Hidden ? hiddenBoxStyle : numBoxStyle}">${isNum1Hidden ? '?' : num1}</span>
<span style="font-size:28px; color:#7f8c8d; font-weight:bold;">+</span>
<span style="${isNum1Hidden ? numBoxStyle : hiddenBoxStyle}">${isNum1Hidden ? num2 : '?'}</span>
<span style="font-size:28px; color:#7f8c8d; font-weight:bold;">=</span>
<span style="${targetBoxStyle}">${target}</span>
</div>
<div style="display:flex; justify-content:center; gap:10px;">
${opts.map(o => `<button class="menu-btn" onclick="window.verifyHouse(this, ${o === hiddenValue})" style="${btnStyle}">${o}</button>`).join('')}
</div>
</div>`;
}
html += `</div></div>`;
document.getElementById('expression-container').innerHTML = html;
};
window.verifyHouse = (btn, isCorrect) => {
const parentRow = btn.parentElement.parentElement;
const btnsInRow = parentRow.querySelectorAll('.menu-btn');
if (btnsInRow[0].disabled && parentRow.querySelector('button[style*="background: rgb(39, 174, 96)"]')) return;
if (isCorrect) {
btnsInRow.forEach(b => {
b.disabled = true;
if (b === btn) {
b.style.background = '#27ae60'; b.style.color = 'white';
} else { b.style.opacity = '0.5'; }
});
playCorrectSound();
houseState.solved++;
totalAnswers++;
correctAnswers++;
if (houseState.solved === houseState.total) {
setTimeout(() => {
score += 10 * currentLevel;
showMessage('Правильно! ✓', true);
playLevelUpSound();
currentLevel++; updateBestLevel(); updateDisplay();
generateTask();
}, 500);
}
} else {
playWrongSound();
btn.style.background = '#e74c3c'; btn.style.color = 'white';
btn.disabled = true; 
totalAnswers++;
houseState.errors++;
if (houseState.errors >= 2) {
document.querySelectorAll('#expression-container .menu-btn').forEach(b => b.disabled = true);
showMessage('Ошибка! Уровень перезапускается...', false);
setTimeout(() => {
generateNumberHuntTask();
}, 1500);
}
}
};
// --- ОБНОВЛЕННЫЙ ДИЗАЙН: Логические цепочки ---
const generateLogicChainsTask = () => {
if(currentLevel > 10) {
stopTimer();
document.getElementById('expression-container').innerHTML = `<div style="text-align:center;padding:20px;"><h2 style="color:#27ae60;">🎉 Пройдено!</h2><p>Ты прошел все уровни!</p><br><button class="menu-btn" onclick="showMenu()">В меню</button></div>`;
return;
}
// Сложность зависит от шага и типа цепочки
// Уровень 1-3: шаг 2-3, возрастающие, числа до 20
// Уровень 4-6: шаг 3-5, убывающие добавляются, числа до 40
// Уровень 7-10: шаг 5-8, убывающие часто, числа до 60
let step, start, direction;
if (currentLevel <= 3) {
step = getRandomInt(2, 3);
start = getRandomInt(1, 10);
direction = 'up';
} else if (currentLevel <= 6) {
step = getRandomInt(3, 5);
start = getRandomInt(5, 25);
direction = Math.random() > 0.5 ? 'up' : 'down';
} else {
step = getRandomInt(5, 8);
start = getRandomInt(15, 40);
direction = Math.random() > 0.3 ? 'down' : 'up';
}
const chainLength = 4; // фиксированная длина
const seq = [];
for(let i=0; i<chainLength; i++) {
if (direction === 'up') {
seq.push(start + i * step);
} else { 
seq.push(start - i * step);
}
}
const idx = Math.floor(Math.random() * chainLength);
const answer = seq[idx];
seq[idx] = '?';
currentTask = {question:`Продолжи: ${seq.join(', ')}`, answer:answer, type:'number'};
const colors = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
const color = colors[currentLevel % colors.length];
const bubbleStyle = `display:inline-flex; align-items:center; justify-content:center; width:55px; height:55px; background:linear-gradient(135deg, ${color}, ${color}dd); color:white; font-weight:bold; font-size:22px; border-radius:12px; box-shadow:0 4px 8px rgba(0,0,0,0.15); margin:3px;`;
const arrowStyle = `display:inline-flex; align-items:center; justify-content:center; width:35px; color:#95a5a6; font-size:24px; font-weight:bold;`;
const qBubbleStyle = `display:inline-flex; align-items:center; justify-content:center; width:55px; height:55px; background:linear-gradient(135deg, #f1c40f, #f39c12); color:white; font-weight:bold; font-size:28px; border-radius:12px; box-shadow:0 4px 8px rgba(0,0,0,0.15); margin:3px; animation: pulse 1s infinite;`;
let html = `
<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:350px; font-family: sans-serif;">
<div style="background:white; padding:25px 35px; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.1); text-align:center; width:100%; max-width:500px;">
<h3 style="color:#2c3e50; margin-bottom:8px; font-size:22px;">🔗 Логическая цепочка</h3>
<p style="color:#7f8c8d; margin-bottom:25px; font-size:14px;">Уровень ${currentLevel} из 10 • Найди закономерность</p>
<div style="display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:5px; margin-bottom:30px;">
${seq.map((n, i) => `
${i > 0 ? `<div style="${arrowStyle}">${direction === 'up' ? '➜' : '➔'}</div>` : ''}
<div style="${n === '?' ? qBubbleStyle : bubbleStyle}">${n}</div>
`).join('')}
</div>
<div style="display:flex; align-items:center; justify-content:center; gap:10px;">
<input type="number" id="answer" style="font-size:24px; padding:12px 15px; width:100px; text-align:center; border:3px solid ${color}; border-radius:12px; outline:none;">
<button id="check-btn" class="menu-btn" onclick="checkAnswer()" style="font-size:18px; padding:12px 25px; background:${color};">Проверить</button>
</div>
</div>
</div>`;
document.getElementById('expression-container').innerHTML = html;
document.getElementById('answer').focus();
document.getElementById('answer').addEventListener('keypress', (e) => { if(e.key === 'Enter') checkAnswer(); });
};
// --- ОБНОВЛЕННЫЙ ДИЗАЙН: Найди закономерность ---
const generatePatternFinderTask = () => {
if(currentLevel > 10) {
stopTimer();
document.getElementById('expression-container').innerHTML = `<div style="text-align:center;padding:20px;"><h2 style="color:#27ae60;">🎉 Пройдено!</h2><p>Ты прошел все уровни!</p><br><button class="menu-btn" onclick="showMenu()">В меню</button></div>`;
return;
}
// Сложность зависит от типа паттерна и величины чисел
// Уровень 1-3: простые арифметические (+2, +3, +5, чётные, нечётные)
// Уровень 4-6: умножение (×2, ×3) и убывание (-2, -3)
// Уровень 7-10: квадраты, сложное убывание (-5, -7), большие числа
let patterns;
if (currentLevel <= 3) {
patterns = [
{ seq: [2,4,6,8,10,12], desc: '+2' },
{ seq: [3,6,9,12,15,18], desc: '+3' },
{ seq: [5,10,15,20,25,30], desc: '+5' },
{ seq: [1,3,5,7,9,11], desc: 'нечётные' },
{ seq: [2,4,6,8,10,12], desc: 'чётные' },
];
} else if (currentLevel <= 6) {
patterns = [
{ seq: [2,4,8,16,32,64], desc: '×2' },
{ seq: [3,6,12,24,48,96], desc: '×2' },
{ seq: [20,18,16,14,12,10], desc: '-2' },
{ seq: [30,27,24,21,18,15], desc: '-3' },
{ seq: [50,45,40,35,30,25], desc: '-5' },
{ seq: [4,8,12,16,20,24], desc: '+4' },
];
} else {
patterns = [
{ seq: [1,4,9,16,25,36], desc: 'квадраты' },
{ seq: [2,5,10,17,26,37], desc: 'квадраты+1' },
{ seq: [100,90,80,70,60,50], desc: '-10' },
{ seq: [50,43,36,29,22,15], desc: '-7' },
{ seq: [1,2,4,8,16,32], desc: '×2' },
{ seq: [1,3,6,10,15,21], desc: '+1,+2,+3...' },
];
}
const pattern = patterns[Math.floor(Math.random() * patterns.length)];
const displaySeq = pattern.seq.slice(0, 4);
const answer = pattern.seq[4];
currentTask = {question:`Следующее число: ${displaySeq.join(', ')}`, answer:answer, type:'number'};
const colors = ['#9b59b6', '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#e67e22'];
const color = colors[currentLevel % colors.length];
const tileStyle = `display:inline-flex; align-items:center; justify-content:center; width:60px; height:60px; background:linear-gradient(135deg, ${color}, ${color}dd); color:white; font-weight:bold; font-size:24px; border-radius:12px; box-shadow:0 4px 0 ${color}99; margin:5px;`;
const qTileStyle = `display:inline-flex; align-items:center; justify-content:center; width:60px; height:60px; background:linear-gradient(135deg, #ecf0f1, #bdc3c7); color:#7f8c8d; font-weight:bold; font-size:32px; border-radius:12px; box-shadow:0 4px 0 #95a5a6; margin:5px; animation: pulse 1s infinite;`;
let html = `
<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:350px; font-family: sans-serif;">
<div style="background:white; padding:25px 35px; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.1); text-align:center; width:100%; max-width:500px;">
<h3 style="color:#2c3e50; margin-bottom:8px; font-size:22px;">🔍 Найди закономерность</h3>
<p style="color:#7f8c8d; margin-bottom:25px; font-size:14px;">Уровень ${currentLevel} из 10 • Какое число следующее?</p>
<div style="display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:5px; margin-bottom:30px;">
${displaySeq.map(n => `<div style="${tileStyle}">${n}</div>`).join('')}
<div style="${qTileStyle}">?</div>
</div>
<div style="display:flex; align-items:center; justify-content:center; gap:10px;">
<input type="number" id="answer" style="font-size:24px; padding:12px 15px; width:100px; text-align:center; border:3px solid ${color}; border-radius:12px; outline:none;">
<button id="check-btn" class="menu-btn" onclick="checkAnswer()" style="font-size:18px; padding:12px 25px; background:${color};">Проверить</button>
</div>
</div>
</div>`;
document.getElementById('expression-container').innerHTML = html;
document.getElementById('answer').focus();
document.getElementById('answer').addEventListener('keypress', (e) => { if(e.key === 'Enter') checkAnswer(); });
};
// --- НОВАЯ ИГРА: Быстрый счет -> Верно или Неверно ---
const generateQuickMathTask = () => {
if(currentLevel > 10) {
stopTimer();
document.getElementById('expression-container').innerHTML = `<div style="text-align:center;padding:20px;"><h2 style="color:#27ae60;">🎉 Пройдено!</h2><p>Ты прошел все уровни!</p><br><button class="menu-btn" onclick="showMenu()">В меню</button></div>`;
return;
}
// Усложнение: больше чисел с уровнем
const maxNum = 8 + currentLevel * 2; // ур.1=10, ур.10=28
const ops = ['+', '-', '×'];
const op = ops[Math.floor(Math.random() * ops.length)];
let a, b, res, isCorrect;
if (op === '+') {
a = getRandomInt(5, maxNum);
b = getRandomInt(5, maxNum);
res = a + b;
} else if (op === '-') {
a = getRandomInt(10, maxNum + 10);
b = getRandomInt(5, a);
res = a - b;
} else { 
a = getRandomInt(2, Math.min(5 + currentLevel, 10));
b = getRandomInt(2, Math.min(5 + currentLevel, 10));
res = a * b;
}
isCorrect = Math.random() > 0.35 - currentLevel * 0.01; // чуть сложнее на высоких уровнях
let displayRes = res;
if (!isCorrect) {
const offset = getRandomInt(1, 3 + Math.floor(currentLevel / 3));
displayRes = res + (Math.random() > 0.5 ? offset : -offset);
if (displayRes < 0) displayRes = res + offset;
}
currentTask = { question: `${a} ${op} ${b} = ${displayRes}`, answer: isCorrect, type: 'boolean' };
const colors = ['#e74c3c', '#3498db', '#2ecc71'];
const color = colors[currentLevel % colors.length];
let html = `
<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:350px; font-family: sans-serif;">
<div style="background:white; padding:35px 40px; border-radius:25px; box-shadow:0 15px 40px rgba(0,0,0,0.12); text-align:center; width:100%; max-width:450px; border:3px solid ${color};">
<div style="margin-bottom:20px;">
<span style="display:inline-block; background:${color}22; color:${color}; padding:8px 20px; border-radius:20px; font-size:14px; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">Уровень ${currentLevel} из 10</span>
</div>
<h3 style="color:#2c3e50; margin-bottom:25px; font-size:20px;">Верно ли равенство?</h3>
<div style="font-size:52px; font-weight:bold; color:#2c3e50; margin-bottom:35px; font-family:'Courier New', monospace; background:#f8f9fa; padding:20px; border-radius:15px;">
${a} <span style="color:${color};">${op}</span> ${b} = <span style="color:#7f8c8d;">${displayRes}</span>
</div>
<div style="display:flex; gap:20px; justify-content:center;">
<button onclick="window.checkQuickMathTF(true)" style="flex:1; background:linear-gradient(135deg, #27ae60, #2ecc71); color:white; border:none; padding:18px 25px; font-size:20px; font-weight:bold; border-radius:15px; cursor:pointer; box-shadow:0 6px 0 #1e8449; transition: transform 0.1s, box-shadow 0.1s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 0 #1e8449'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 0 #1e8449'">✅ Верно</button>
<button onclick="window.checkQuickMathTF(false)" style="flex:1; background:linear-gradient(135deg, #e74c3c, #c0392b); color:white; border:none; padding:18px 25px; font-size:20px; font-weight:bold; border-radius:15px; cursor:pointer; box-shadow:0 6px 0 #922b21; transition: transform 0.1s, box-shadow 0.1s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 0 #922b21'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 0 #922b21'">❌ Неверно</button>
</div>
</div>
</div>
`;
document.getElementById('expression-container').innerHTML = html;
};
window.checkQuickMathTF = (userChoice) => {
if (isAnswerChecked) return;
isAnswerChecked = true;
const isCorrect = userChoice === currentTask.answer;
handleAnswer(isCorrect);
};
// --- ОБНОВЛЕННЫЙ ДИЗАЙН: Вставь знак ---
const generateColorMathTask = () => {
if(currentLevel > 10) {
stopTimer();
document.getElementById('expression-container').innerHTML = `<div style="text-align:center;padding:20px;"><h2 style="color:#27ae60;">🎉 Пройдено!</h2><p>Ты прошел все уровни!</p><br><button class="menu-btn" onclick="showMenu()">В меню</button></div>`;
return;
}
// Усложнение: больше числа с уровнем
const maxNum = 8 + currentLevel * 2;
let a, b, result, correctOp;
const r = Math.random();
if (r < 0.25) { 
a = getRandomInt(1, maxNum);
b = getRandomInt(1, maxNum);
result = a + b; correctOp = '+'; 
} else if (r < 0.5) { 
a = getRandomInt(5, maxNum + 5);
b = getRandomInt(1, a);
result = a - b; correctOp = '-'; 
} else if (r < 0.75) { 
a = getRandomInt(2, Math.min(5 + currentLevel, 10));
b = getRandomInt(2, Math.min(5 + currentLevel, 10));
result = a * b; correctOp = '×'; 
} else { 
b = getRandomInt(2, Math.min(4 + currentLevel, 10));
result = getRandomInt(2, Math.min(4 + currentLevel, 10));
a = b * result;
correctOp = '÷'; 
}
const opColors = {
'+': { bg: '#27ae60', hover: '#1e8449' },    
'-': { bg: '#e74c3c', hover: '#c0392b' },    
'×': { bg: '#3498db', hover: '#2980b9' },    
'÷': { bg: '#9b59b6', hover: '#8e44ad' }     
};
const ops = ['+', '-', '×', '÷'];
const color = '#3498db';  // Нейтральный цвет для результата
const numBoxStyle = `background:linear-gradient(135deg, #f8f9fa, #e9ecef); border:3px solid #dee2e6; color:#2c3e50; font-weight:bold; font-size:36px; width:80px; height:80px; display:flex; align-items:center; justify-content:center; border-radius:15px; box-shadow:0 4px 0 #bdc3c7;`;
const targetBoxStyle = `background: linear-gradient(135deg, ${color}, #2980b9); color:white; font-weight:bold; font-size:36px; padding:0 30px; height:80px; display:flex; align-items:center; justify-content:center; border-radius:15px; box-shadow:0 6px 0 #2980b9;`;
const questionBoxStyle = `background:linear-gradient(135deg, #f1c40f, #f39c12); border:3px dashed #e67e22; color:#fff; font-weight:bold; font-size:36px; width:80px; height:80px; display:flex; align-items:center; justify-content:center; border-radius:15px; animation: pulse 1s infinite; box-shadow:0 4px 0 #d68910;`;
let html = `
<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:400px; font-family: sans-serif;">
<div style="background:white; padding:30px 40px; border-radius:25px; box-shadow:0 15px 40px rgba(0,0,0,0.12); text-align:center; width:100%; max-width:500px;">
<h3 style="color:#2c3e50; margin-bottom:8px; font-size:22px;">➕ Вставь знак</h3>
<p style="color:#7f8c8d; margin-bottom:25px; font-size:14px;">Уровень ${currentLevel} из 10 • Какой знак?</p>
<div style="display:flex; align-items:center; justify-content:center; gap:15px; margin-bottom:35px; flex-wrap:wrap; justify-content:center;">
<div style="${numBoxStyle}">${a}</div>
<div style="${questionBoxStyle}">?</div>
<div style="${numBoxStyle}">${b}</div>
<div style="font-size:36px; color:#7f8c8d; font-weight:bold;">=</div>
<div style="${targetBoxStyle}">${result}</div>
</div>
<div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:15px; width:100%; max-width:380px; margin:0 auto;">
${ops.map(op => `
<button 
onclick="window.verifyInsertSign('${op}', '${correctOp}')" 
style="
background: linear-gradient(135deg, ${opColors[op].bg}, ${opColors[op].hover}); 
color: white; 
border: none; 
padding: 20px 0; 
font-size: 36px; 
font-weight: bold; 
border-radius: 15px; 
cursor: pointer; 
box-shadow: 0 6px 0 ${opColors[op].hover};
transition: transform 0.1s, box-shadow 0.1s;
"
onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 9px 0 ${opColors[op].hover}'"
onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 0 ${opColors[op].hover}'"
>
${op}
</button>
`).join('')}
</div>
</div>
</div>
`;
document.getElementById('expression-container').innerHTML = html;
};
window.verifyInsertSign = (selected, correct) => {
if (isAnswerChecked) return;
isAnswerChecked = true;
if (selected === correct) {
playCorrectSound();
score += 10 * currentLevel;
correctAnswers++;
totalAnswers++;
showMessage('Правильно! ✓', true);
if (correctAnswers % 3 === 0) {
currentLevel++;
playLevelUpSound();
updateBestLevel();
}
updateDisplay();
setTimeout(generateTask, 1000);
} else {
playWrongSound();
showMessage('Неправильно! Ответ: ' + correct, false);
totalAnswers++;
if(currentLevel>1) currentLevel--;
setTimeout(generateTask, 1500);
}
};

// --- Таблица умножения ---
const generateMultiplicationTableTask = () => {
const num = multiplicationNumber;
const multiplier = getRandomInt(1, 10);
currentTask = { question: `${num} × ${multiplier}`, answer: num * multiplier, type: 'number' };
document.getElementById('expression-container').innerHTML = `
<div style="text-align:center;">
<div style="background:linear-gradient(135deg, #9b59b6, #8e44ad); color:white; padding:10px 25px; border-radius:20px; display:inline-block; margin-bottom:20px; font-weight:bold;">
✖️ Таблица на ${num}
</div>
<div class="game-task-text-lg" style="color: #2c3e50;">
${num} × ${multiplier} = ?
</div>
</div>`;
showNumberInput();
};

const generateMultiplicationSelectedTask = () => {
const num = selectedMultiplicationNumbers[Math.floor(Math.random() * selectedMultiplicationNumbers.length)];
const multiplier = getRandomInt(2, 10);
currentTask = { question: `${num} × ${multiplier}`, answer: num * multiplier, type: 'number' };
const numsStr = selectedMultiplicationNumbers.join(', ');
document.getElementById('expression-container').innerHTML = `
<div style="text-align:center;">
<div style="background:linear-gradient(135deg, #9b59b6, #8e44ad); color:white; padding:10px 25px; border-radius:20px; display:inline-block; margin-bottom:20px; font-weight:bold;">
✖️ Таблица: ${numsStr}
</div>
<div class="game-task-text-lg" style="color: #2c3e50;">
${num} × ${multiplier} = ?
</div>
</div>`;
showNumberInput();
};

const generateMultiplicationAllTask = () => {
const num = selectedMultiplicationNumbers.length > 0 
    ? selectedMultiplicationNumbers[Math.floor(Math.random() * selectedMultiplicationNumbers.length)]
    : getRandomInt(2, 10);
const multiplier = getRandomInt(2, 10);
currentTask = { question: `${num} × ${multiplier}`, answer: num * multiplier, type: 'number' };
document.getElementById('expression-container').innerHTML = `
<div style="text-align:center;">
<div style="background:linear-gradient(135deg, #9b59b6, #8e44ad); color:white; padding:10px 25px; border-radius:20px; display:inline-block; margin-bottom:20px; font-weight:bold;">
🎲 Вся таблица
</div>
<div class="game-task-text-lg" style="color: #2c3e50;">
${num} × ${multiplier} = ?
</div>
</div>`;
showNumberInput();
};
// --- Диспетчер ---
const generateTask = () => {
const answerEl = document.getElementById('answer');
const checkBtn = document.getElementById('check-btn');
const compareBtns = document.getElementById('compare-btns');
const tfBtns = document.getElementById('tf-btns');
if(answerEl) answerEl.classList.add('hidden');
if(checkBtn) checkBtn.classList.add('hidden');
if(compareBtns) compareBtns.classList.add('hidden');
if(tfBtns) tfBtns.classList.add('hidden');
document.getElementById('expression-container').innerHTML = '<div id="text-question" class="hidden"></div>';
const m = document.getElementById('message');
if(m){
m.textContent='';
m.className='';
}
let op = originalGameMode;
if(op==='simpleAll') op = getRandomSimpleOperation();
else if(op==='complexAll') op = getRandomComplexOperation();
else if(op==='free_training' || op==='timed_mode') op = getRandomAnyOperation();
if(op==='addition') generateAddition();
else if(op==='subtraction') generateSubtraction();
else if(op==='multiplication') generateMultiplication();
else if(op==='division') generateDivision();
else if(op==='parentheses') generateParentheses();
else if(op==='variables') generateVariables();
else if(op==='units') generateUnits();
else if(op==='expressions') generateExpressions();
else if(op==='equations') generateEquations();
else if(op==='wordProblems') generateWordProblems();
else if(op==='complexEquations') generateComplexEquations();
else if(op==='compareExpressions') generateCompareExpressions();
else if(op==='find_pair') generateFindPairTask();
else if(op==='number_hunt') generateNumberHuntTask();
else if(op==='logic_chains') generateLogicChainsTask();
else if(op==='pattern_finder') generatePatternFinderTask();
else if(op==='quick_math') generateQuickMathTask();
else if(op==='color_math') generateColorMathTask();
else if(op==='multiplication_table') generateMultiplicationTableTask();
else if(op==='multiplication_all') generateMultiplicationAllTask();
else if(op==='multiplication_selected') generateMultiplicationSelectedTask();
else { showMenu(); return; }
const e = document.getElementById('example-num'); 
if(e) e.textContent=currentExample;
const i = document.getElementById('answer'); 
if(i && !i.classList.contains('hidden')){
i.value=''; 
i.focus();
}
isAnswerChecked = false;
};
// --- UI ---
const showNumberInput = () => {
document.getElementById('answer').classList.remove('hidden');
document.getElementById('check-btn').classList.remove('hidden');
document.getElementById('compare-btns').classList.add('hidden');
document.getElementById('tf-btns').classList.add('hidden');
};
const showCompareButtons = () => {
document.getElementById('compare-btns').classList.remove('hidden');
document.getElementById('answer').classList.add('hidden');
document.getElementById('check-btn').classList.add('hidden');
document.getElementById('tf-btns').classList.add('hidden');
};
const showTrueFalseButtons = () => {
document.getElementById('tf-btns').classList.remove('hidden');
document.getElementById('answer').classList.add('hidden');
document.getElementById('check-btn').classList.add('hidden');
document.getElementById('compare-btns').classList.add('hidden');
};
window.checkComparison = (s) => { if(isAnswerChecked) return; isAnswerChecked=true; handleAnswer(s===currentTask.answer); };
window.checkExpression = (b) => { if(isAnswerChecked) return; isAnswerChecked=true; handleAnswer(b===currentTask.answer); };
window.checkAnswer = () => {
if(isAnswerChecked) return;
const v = document.getElementById('answer').value.trim();
if(!v) { showMessage('Введи ответ!', false); return; }
isAnswerChecked = true;
let ok = false;
if(currentTask.type==='number') ok = parseInt(v) === currentTask.answer;
else if(currentTask.type==='symbol') ok = v === currentTask.answer;
else if(currentTask.type==='twoNumbers') {
    const parts = v.replace(/[,;]+/g, ' ').trim().split(/\s+/);
    ok = parts.length >= 2 && 
         parseInt(parts[0]) === currentTask.bigAnswer && 
         parseInt(parts[1]) === currentTask.smallAnswer;
}
handleAnswer(ok);
};
const praises = [
'Правильно! ✓', 'Супер! 🌟', 'Молодец! 👏', 'Так держать! 💪', 
'Отлично! 🎉', 'Умница! ⭐', 'Браво! 🏆', 'Великолепно! 💎'
];
const streakMessages = [
'', '🔥 1 подряд!', '🔥🔥 2 подряд!', '🔥🔥🔥 3 подряд!',
'🔥🔥🔥🔥 4 подряд!', '🔥🔥🔥🔥🔥 5 подряд!', '🔥 ЦЕЛАЯ СЕРИЯ! 🔥'
];

const handleAnswer = (ok) => {
totalAnswers++;
if(ok) {
correctAnswers++;
streak++;
if(streak > maxStreak) maxStreak = streak;
score += 10 * currentLevel;
// Бонус за серию
if(streak >= 3) score += 5 * streak;
// Показываем похвалу с серией
const praise = praises[Math.floor(Math.random() * praises.length)];
const streakMsg = streak >= 6 ? streakMessages[6] : streakMessages[streak];
showMessage(streak >= 3 ? streakMsg : praise, true);
playCorrectSound();
// Обновляем счетчик правильных ответов в режиме "на время"
if(gameMode.includes('timed')) {
const cnt = document.getElementById('correct-count');
if(cnt) cnt.textContent = correctAnswers;
}
if(correctAnswers % 3 === 0) { currentLevel++; updateBestLevel(); playLevelUpSound(); }
} else {
streak = 0;
let wrongAnswer = currentTask.answer;
// Для типа boolean выводим "Верно" или "Неверно"
if (currentTask.type === 'boolean') {
wrongAnswer = currentTask.answer ? 'Верно' : 'Неверно';
}
showMessage('Неправильно! Ответ: ' + wrongAnswer, false); playWrongSound();
if(currentLevel>1) currentLevel--;
}
updateDisplay();
setTimeout(() => {
currentExample++;
if(gameMode.includes('timed') && timeLeft<=0) endGame();
else generateTask();
}, 1200);
};
const showMessage = (t, ok) => {
const m = document.getElementById('message');
if(m) { m.textContent=t; m.style.color=ok?'#27ae60':'#e74c3c'; m.className=ok?'correct-anim':'wrong-anim'; }
};
const updateDisplay = () => {
const l = document.getElementById('level'); if(l) l.textContent=currentLevel;
const e = document.getElementById('example-num'); if(e) e.textContent=currentExample;
// Обновляем прогресс-бар (3 правильных ответа = 100%)
const progress = (correctAnswers % 3) / 3 * 100;
const bar = document.getElementById('level-progress');
if(bar) bar.style.width = progress + '%';
// Обновляем отображение серии
const streakEl = document.getElementById('streak-display');
if(streakEl) {
if(streak >= 3) {
streakEl.textContent = `🔥 ${streak} подряд!`;
streakEl.classList.add('active');
} else {
streakEl.classList.remove('active');
}
}
};
const endGame = () => {
stopTimer(); playGameOverSound(); addStatistics('all', correctAnswers, totalAnswers); showResults();
};
window.showResults = (period) => {
stopTimer(); document.getElementById('game').classList.add('hidden');
if(!period) {
// При просмотре результатов - сохраняем возможность продолжить
document.getElementById('results').classList.remove('hidden');
document.getElementById('stats').classList.add('hidden');
document.getElementById('total-examples').textContent=totalAnswers;
document.getElementById('result-correct').textContent=correctAnswers;
document.getElementById('result-wrong').textContent=totalAnswers-correctAnswers;
document.getElementById('best-streak').textContent=maxStreak;
document.getElementById('best-level').textContent=getCurrentBestLevel();
// Показываем звёзды
const accuracy = totalAnswers > 0 ? Math.round(correctAnswers / totalAnswers * 100) : 0;
const starsEl = document.getElementById('results-stars');
const titleEl = document.getElementById('results-title');
if (accuracy >= 90) {
starsEl.textContent = '⭐⭐⭐';
titleEl.textContent = 'Превосходно! 🏆';
} else if (accuracy >= 70) {
starsEl.textContent = '⭐⭐';
titleEl.textContent = 'Отлично! 🎉';
} else if (accuracy >= 50) {
starsEl.textContent = '⭐';
titleEl.textContent = 'Хорошо! 👍';
} else {
starsEl.textContent = '';
titleEl.textContent = 'Продолжай тренироваться! 💪';
}
// Показываем достижения
const achievements = [];
if (totalAnswers >= 10) achievements.push('🏅 Первые 10 примеров');
if (correctAnswers === totalAnswers && totalAnswers >= 5) achievements.push('💎 Без ошибок!');
if (maxStreak >= 5) achievements.push('🔥 Серия 5 подряд!');
if (maxStreak >= 10) achievements.push('🔥🔥 Серия 10 подряд!');
if (currentLevel >= 5) achievements.push('📈 Уровень 5+');
if (currentLevel >= 10) achievements.push('🌟 Максимальный уровень!');
const achEl = document.getElementById('results-achievements');
if (achEl) {
achEl.innerHTML = achievements.length 
? achievements.map(a => `<span class="achievement-badge">${a}</span>`).join('')
: '';
}
return;
}
document.getElementById('results').classList.add('hidden');
document.getElementById('stats').classList.remove('hidden');
document.querySelectorAll('.submenu').forEach(m=>m.classList.add('hidden'));

// Меняем заголовок в зависимости от периода
const periodLabels = {
'today': 'Сегодня',
'week': 'За неделю',
'month': 'За месяц',
'all': 'Всего'
};
const solvedLabel = document.querySelector('#stats .stats-content p:first-child');
if (solvedLabel) {
solvedLabel.innerHTML = `${periodLabels[period] || 'Решено'}: <b id="today-solved">0</b>`;
}

const recs = filterRecordsByPeriod(statistics.all, period);
const s = recs.reduce((a,r)=>a+r.total,0), c = recs.reduce((a,r)=>a+r.correct,0), acc = s?Math.round(c/s*100):0;
document.getElementById('today-solved').textContent=s;
document.getElementById('today-correct').textContent=c;
document.getElementById('today-accuracy').textContent=acc+'%';
document.getElementById('best-level-stats').textContent=getCurrentBestLevel();
createDetailedStats(recs, period);
};
const getModeDisplayName = (m) => {
const n = {'addition':'➕ Сложение','subtraction':'➖ Вычитание','multiplication':'✖️ Умножение','division':'➗ Деление','simpleAll':'🎲 Все простые','parentheses':'🅰️ Скобки','variables':'🅱️ Переменные','units':'📏 Единицы','expressions':'🅲 Выражения','equations':'🅳 Уравнения','wordProblems':'📝 Текстовые','complexEquations':'🅴 Сл. уравнения','compareExpressions':'🆚 Сравнение','complexAll':'🎯 Все сложные','timed_mode':'⏱️ На время','free_training':'📚 Свободная','find_pair':'🎯 Найди пару','number_hunt':'🏠 Числовые домики','logic_chains':'🧩 Логика','pattern_finder':'🔍 Закономерность','quick_math':'⚡ Верно/Неверно','color_math':'➕ Вставь знак','multiplication_table':'✖️ Таблица на...','multiplication_all':'🎲 Вся таблица','multiplication_selected':'✖️ Выборочная таблица'};
return n[m]||m;
};
const createDetailedStats = (recs, period) => {
const c = document.querySelector('.stats-content');
const old = document.getElementById('detailed-stats');
if(old) old.remove();
const d = document.createElement('div'); d.id='detailed-stats'; d.style.cssText='margin-top:20px;text-align:left;';
if(!recs.length) {
d.innerHTML=`<p style="color:#666;text-align:center;margin:20px 0;">${period==='today'?'Сегодня':period==='week'?'За неделю':period==='month'?'За месяц':'Пока'} нет результатов</p>`;
c.appendChild(d); return;
}

// Итоги дня
const today = new Date().toLocaleDateString('ru-RU');
const todayRecs = recs.filter(r => new Date(r.date).toLocaleDateString('ru-RU') === today);
if (todayRecs.length > 0 && period === 'today') {
const todayTotal = todayRecs.reduce((a,r) => a + r.total, 0);
const todayCorrect = todayRecs.reduce((a,r) => a + r.correct, 0);
const todayAcc = todayTotal ? Math.round(todayCorrect / todayTotal * 100) : 0;
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yestStr = yesterday.toLocaleDateString('ru-RU');
const yestRecs = statistics.all.filter(r => new Date(r.date).toLocaleDateString('ru-RU') === yestStr);
const yestTotal = yestRecs.reduce((a,r) => a + r.total, 0);
const diff = todayTotal - yestTotal;
d.innerHTML += `
<div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:15px;border-radius:12px;margin-bottom:15px;text-align:center;">
<div style="font-size:14px;opacity:0.9;margin-bottom:5px;">📊 Итоги дня</div>
<div style="font-size:24px;font-weight:bold;">${todayTotal} примеров</div>
<div style="font-size:14px;opacity:0.9;margin-top:5px;">Точность: ${todayAcc}% ${yestTotal > 0 ? (diff >= 0 ? `(${diff >= 0 ? '+' : ''}${diff} к вчера)` : '') : ''}</div>
</div>`;
}

const grp = {};
recs.forEach(r => {
const dt = new Date(r.date).toLocaleDateString('ru-RU');
if(!grp[dt]) grp[dt]={t:0,c:0,g:[],d:dt};
grp[dt].t+=r.total; grp[dt].c+=r.correct; grp[dt].g.push(r);
});
const dates = Object.keys(grp).sort((a,b)=>new Date(b.split('.').reverse().join('-'))-new Date(a.split('.').reverse().join('-')));
let h = '<h4 style="color:#333;margin:15px 0 10px 0;font-size:16px;">📋 Подробно:</h4>';
dates.forEach(dt => {
const g = grp[dt], acc = g.t?Math.round(g.c/g.t*100):0, day = new Date(dt.split('.').reverse().join('-')).toLocaleDateString('ru-RU',{weekday:'long'});
h+=`<div style="background:white;padding:12px;margin:8px 0;border-radius:8px;border-left:4px solid #667eea;"><div style="font-weight:bold;color:#333;margin-bottom:5px;">${dt} (${day.charAt(0).toUpperCase()+day.slice(1)})</div><div style="font-size:14px;color:#666;margin-bottom:8px;">Решено: <span style="color:#333;font-weight:bold;">${g.t}</span> | Правильно: <span style="color:#27ae60;font-weight:bold;">${g.c}</span> | Точность: <span style="color:${acc>=80?'#27ae60':acc>=60?'#f39c12':'#e74c3c'};font-weight:bold;">${acc}%</span></div><div style="font-size:12px;color:#999;">${g.g.length} игр(ы)</div></div>`;
});
const best = recs.reduce((b,cur) => {
const ca = cur.total?cur.correct/cur.total:0, ba = b.total?b.correct/b.total:0;
return ca>ba?cur:b;
});
if(best) {
const ba = best.total?Math.round(best.correct/best.total*100):0;
h+=`<div style="background:linear-gradient(135deg,#27ae60,#2ecc71);color:white;padding:15px;margin:15px 0;border-radius:10px;text-align:center;"><div style="font-size:18px;font-weight:bold;margin-bottom:5px;">🏆 Лучший результат</div><div style="font-size:14px;">${best.correct}/${best.total} (${ba}%)</div><div style="font-size:12px;opacity:0.9;">${new Date(best.date).toLocaleDateString('ru-RU')}</div></div>`;
}
const mStats = {};
recs.forEach(r => { if(!mStats[r.gameMode]) mStats[r.gameMode]={t:0,c:0,n:0}; mStats[r.gameMode].t+=r.total; mStats[r.gameMode].c+=r.correct; mStats[r.gameMode].n++; });
if(Object.keys(mStats).length) {
h+='<h4 style="color:#333;margin:15px 0 10px 0;font-size:16px;">🎯 По режимам:</h4>';
Object.keys(mStats).forEach(m => {
const d = mStats[m], a = d.t?Math.round(d.c/d.t*100):0;
h+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin:5px 0;background:#f8f9fa;border-radius:6px;"><span style="font-size:13px;color:#333;">${getModeDisplayName(m)}</span><span style="font-size:13px;color:${a>=80?'#27ae60':a>=60?'#f39c12':'#e74c3c'};font-weight:bold;">${d.c}/${d.t} (${a}%)</span></div>`;
});
}
d.innerHTML += h; c.appendChild(d);
};
loadBestLevels(); loadStatistics();

// Загружаем сохранённые настройки
const levelSel = document.getElementById('level-select');
if(levelSel) {
levelSel.value = startLevel.toString();
}

const timeSel = document.getElementById('time-select');
if(timeSel) {
timeSel.value = timeLimit.toString();
}

const fontSel = document.getElementById('font-select');
if(fontSel) {
fontSel.value = fontSize;
}

applyFontSize();

// Обновляем отображение времени в таймере
const timeDisplay = document.getElementById('time-left');
if(timeDisplay) {
timeDisplay.textContent = timeLimit;
}
});