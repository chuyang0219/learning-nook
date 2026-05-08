/* ============================================================
   template.js — Script 2 template for book synopsis pages

   USAGE:
   1. Fill in CHARS, LOCS, LANG_CODE, qAnswers, and qFeedback.
   2. Write the result via shell heredoc (avoids Python apostrophe escaping):
        cat > /tmp/script2.js << 'JSEOF'
        [filled-in content]
        JSEOF
   3. Verify no single quotes leaked:
        python3 -c "s=open('/tmp/script2.js').read(); assert \"'\" not in s, 'single quotes found'; print('OK')"
   4. Splice into the HTML (replace the existing <script>...<\/script> block).

   RULES:
   - All strings must use double quotes — no apostrophes anywhere.
     Write "Raskolnikovs friend" not "Raskolnikov's friend".
   - LANG_CODE: BCP-47 code matching the novel's original language.
     English novels → "en-GB". Russian → "ru-RU". French → "fr-FR". etc.
   - qAnswers: set correct letters independently per question.
     Not all the same letter. Correct answer must not always be the longest option.
   - qFeedback: one key matching the correct letter, one key "wrong" for all incorrect.
   ============================================================ */

var CHARS = {
  /* Fill one entry per named character (and important unnamed roles).
     Key: CamelCase identifier matching data-char attributes in the HTML.
     pron:  phonetic guide, stressed syllable in CAPS.
     speak: full name (or role label) — used by speechSynthesis.
     desc:  one sentence, no apostrophes — who they are and why they matter. */

  /* Example:
  Anna:  { pron:"ah-NAH",    speak:"Anna Karenina", desc:"Aristocrat trapped between duty and desire." },
  Levin: { pron:"LYEH-vin",  speak:"Konstantin Levin", desc:"Landowner seeking authentic meaning in rural life." }
  */
};

var LOCS = {
  /* Fill one entry per recurring location (4-6 total).
     Key: CamelCase identifier matching data-loc attributes in the HTML.
     pron: phonetic guide, stressed syllable in CAPS.
     desc: one sentence, no apostrophes — what it is and why it matters narratively. */

  /* Example:
  Pemberley: { pron:"PEM-ber-lee", desc:"Darcy estate in Derbyshire — its beauty and upkeep are moral evidence of his character." }
  */
};

var tipbox      = document.getElementById("tipbox");
var tipname     = document.getElementById("tipname");
var tippron     = document.getElementById("tippron");
var tiprontext  = document.getElementById("tiprontext");
var tipspeak    = document.getElementById("tipspeak");
var tipdesc     = document.getElementById("tipdesc");
var hideTimer   = null;
var currentSpeakText = "";

function placeTip(e) {
  if (window.innerWidth <= 640) {
    tipbox.style.left   = "16px";
    tipbox.style.right  = "16px";
    tipbox.style.width  = "auto";
    tipbox.style.top    = "auto";
    tipbox.style.bottom = "80px";
    return;
  }
  tipbox.style.right  = "";
  tipbox.style.bottom = "";
  tipbox.style.width  = "256px";
  var TW = 256;
  var x = e.clientX + 16;
  if (x + TW > window.innerWidth) x = e.clientX - TW;
  if (x < 8) x = 8;
  var y = e.clientY + 16;
  if (y + 150 > window.innerHeight) y = e.clientY - 154;
  if (y < 8) y = 8;
  tipbox.style.left = x + "px";
  tipbox.style.top  = y + "px";
}

function showTip(el, e) {
  clearTimeout(hideTimer);
  var isChar = el.classList.contains("cn-tip");
  var key    = isChar ? el.getAttribute("data-char") : el.getAttribute("data-loc");
  var data   = isChar ? CHARS[key] : LOCS[key];
  if (!data) return;
  currentSpeakText = isChar ? data.speak : key;
  tipname.textContent = isChar ? data.speak : key;
  tippron.style.display = "flex";
  tiprontext.textContent = data.pron;
  tipdesc.textContent = data.desc;
  placeTip(e);
  tipbox.style.display = "block";
}

function hideTip() {
  hideTimer = setTimeout(function(){ tipbox.style.display = "none"; }, 150);
}

tipbox.addEventListener("mouseenter", function(){ clearTimeout(hideTimer); });
tipbox.addEventListener("mouseleave", hideTip);

tipspeak.addEventListener("click", function(e) {
  e.stopPropagation();
  if (!window.speechSynthesis || !currentSpeakText) return;
  var u = new SpeechSynthesisUtterance(currentSpeakText);
  u.lang = "[LANG_CODE]";
  u.rate = 0.8;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
});

if (window.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = function(){};
}

document.querySelectorAll(".cn-tip, .loc-tip").forEach(function(el) {
  el.addEventListener("mouseenter", function(e){ showTip(el, e); });
  el.addEventListener("mouseleave", hideTip);
});

if ("ontouchstart" in window) {
  document.querySelectorAll(".cn-tip, .loc-tip").forEach(function(el) {
    el.addEventListener("touchstart", function(e) {
      e.preventDefault();
      clearTimeout(hideTimer);
      var t = e.touches[0];
      showTip(el, { clientX: t.clientX, clientY: t.clientY });
    });
  });
  document.addEventListener("touchstart", function(e) {
    if (!tipbox.contains(e.target) &&
        !e.target.classList.contains("cn-tip") &&
        !e.target.classList.contains("loc-tip")) {
      clearTimeout(hideTimer);
      tipbox.style.display = "none";
    }
  });
}

var qAnswers = {
  /* Set correct letter independently per question — not all the same.
     Correct answer must not be the longest option.
     1: "b", 2: "c", 3: "a"  — example only, set per book */
};
var qDone  = {};
var qScore = 0;
var qFeedback = {
  /* One entry per question number. Keys: correct letter + "wrong" (covers all incorrect).
     1: {
       b: "Correct. [Why this answer is right — what the question reveals about theme/character.]",
       wrong: "[What the wrong answers miss — the insight the reader should take away.]"
     },
     2: { ... },
     3: { ... }
  */
};

function answer(qNum, choice) {
  if (qDone[qNum]) { return; }
  qDone[qNum] = true;
  var correct = qAnswers[qNum];
  if (choice === correct) { qScore++; }
  var qq   = document.getElementById("qq" + qNum);
  var btns = qq.querySelectorAll(".quiz-opts button");
  var letters = ["a","b","c","d"];
  btns.forEach(function(btn, i) {
    var letter = letters[i];
    if (letter === correct)      { btn.classList.add("correct"); }
    else if (letter === choice)  { btn.classList.add("wrong"); }
    btn.disabled = true;
  });
  var fb = document.getElementById("qf" + qNum);
  var feedbackSet = qFeedback[qNum];
  fb.textContent = (choice === correct) ? feedbackSet[correct] : feedbackSet["wrong"];
  fb.style.display = "block";
  if (Object.keys(qDone).length === 3) {
    var msgs = ["Keep reading.", "Good — you have the shape of it.", "Very good.", "Excellent."];
    var scoreEl = document.getElementById("qz-score");
    scoreEl.textContent = "Score: " + qScore + "/3 — " + msgs[qScore];
    scoreEl.style.display = "block";
  }
}
