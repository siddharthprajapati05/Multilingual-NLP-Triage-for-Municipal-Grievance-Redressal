'''
MGRS AI inference module (used by the notebook AND shipped to ai-service/app/).
Pipeline: language detection -> optional translation to English -> category + urgency
          -> department lookup -> resolution-day lookup.
'''
import json
import os

import torch
import torch.nn as nn
from transformers import AutoModel, AutoModelForSeq2SeqLM, AutoTokenizer

CATEGORIES = ["Sanitation", "Water Supply", "Street Lighting", "Roads & Maintenance",
              "Parks & Recreation", "Electrical", "Health", "General"]

DEPARTMENT = {
    "Sanitation": "Sanitation Department",
    "Water Supply": "Water Supply Department",
    "Street Lighting": "Street Lighting Department",
    "Roads & Maintenance": "Roads & Infrastructure",
    "Parks & Recreation": "Parks & Recreation",
    "Electrical": "Electrical Department",
    "Health": "Health Department",
    "General": "General Administration",
}
DEPT_CODE = {
    "Sanitation": "SANITATION", "Water Supply": "WATER", "Street Lighting": "LIGHTING",
    "Roads & Maintenance": "ROADS", "Parks & Recreation": "PARKS", "Electrical": "ELECTRICAL",
    "Health": "HEALTH", "General": "ADMIN",
}
URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH"]

# Spec section 13 - rule-based estimate (NOT learned from data)
RESOLUTION_DAYS = {
    ("Sanitation", "HIGH"): 2, ("Sanitation", "MEDIUM"): 5, ("Sanitation", "LOW"): 10,
    ("Water Supply", "HIGH"): 1, ("Water Supply", "MEDIUM"): 4, ("Water Supply", "LOW"): 8,
    ("Street Lighting", "HIGH"): 3, ("Street Lighting", "MEDIUM"): 7, ("Street Lighting", "LOW"): 14,
    ("Roads & Maintenance", "HIGH"): 3, ("Roads & Maintenance", "MEDIUM"): 7, ("Roads & Maintenance", "LOW"): 15,
    ("Parks & Recreation", "HIGH"): 5, ("Parks & Recreation", "MEDIUM"): 10, ("Parks & Recreation", "LOW"): 15,
    ("Electrical", "HIGH"): 1, ("Electrical", "MEDIUM"): 3, ("Electrical", "LOW"): 7,
    ("Health", "HIGH"): 1, ("Health", "MEDIUM"): 3, ("Health", "LOW"): 7,
    ("General", "HIGH"): 3, ("General", "MEDIUM"): 7, ("General", "LOW"): 14,
}

LANG_NAMES = {"en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu", "mr": "Marathi",
              "bn": "Bengali", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam", "pa": "Punjabi",
              "hin": "Hinglish"}
NLLB_CODES = {"hi": "hin_Deva", "mr": "mar_Deva", "bn": "ben_Beng", "ta": "tam_Taml",
              "te": "tel_Telu", "gu": "guj_Gujr", "kn": "kan_Knda", "ml": "mal_Mlym", "pa": "pan_Guru"}

# Danger words that always escalate urgency to HIGH (spec section 9; 'leak' is left out on purpose
# because it would flag every dripping pipe as an emergency).
HIGH_KEYWORDS = [
    # English
    "fire", "flood", "accident", "accidents", "death", "died", "injury", "injured", "emergency", "danger",
    "collapse", "explosion", "sewage overflow", "contaminated", "contaminated water", "live wire", "electric shock",
    "open manhole", "electrocut", "live electric", "sparking", "sparks", "exposed wire", "fallen tree",
    "pothole accident", "deep pothole", "cave-in", "no drinking water", "no water supply", "water supply stopped",
    "no water for", "water crisis",
    # Hindi
    "आग", "बाढ़", "दुर्घटना", "मृत्यु", "मौत", "आपातकाल", "आपात", "खतरा", "करंट", "गंभीर", "पानी नहीं आ रहा", "पीने का पानी",
    # Bengali
    "দুর্ঘটনা", "আগুন", "বন্যা", "মৃত্যু", "মৃত", "বিপদ", "জরুরি", "বিদ্যুৎস্পৃষ্ট", "গর্তে দুর্ঘটনা", "জল নেই", "পানীয় জল",
    # Tamil
    "விபத்து", "தீ", "வெள்ளம்", "அவசரம்", "அவசர", "மரணம்", "ஆபத்து", "மின்சாரம்",
    # Telugu
    "ప్రమాదం", "అగ్ని", "వరద", "మరణం", "అత్యవసర", "ప్రమాదకర", "విద్యుత్",
    # Marathi
    "अपघात", "आग", "पूर", "मृत्यू", "धोका", "तातडीने", "शॉक",
    # Kannada
    "ಅಪಘಾತ", "ಬೆಂಕಿ", "ಪ್ರವಾಹ", "ತುರ್ತು", "ಸಾವು", "ಅಪಾಯ",
    # Gujarati
    "અકસ્માત", "આગ", "પૂર", "મૃત્યુ", "જોખમ", "તાકીદ",
    # Malayalam
    "അപകടം", "തീ", "വെള്ളപ്പൊക്കം", "മരണം", "അടിയന്തരം", "അപകടകരമായ",
    # Punjabi
    "ਹਾਦਸਾ", "ਅੱਗ", "ਹੜ੍ਹ", "ਮੌਤ", "ਐਮਰਜੈਂਸੀ", "ਖ਼ਤਰਾ",
]


def rule_urgency(*texts):
    blob = " ".join(t for t in texts if t).lower()
    return "HIGH" if any(k in blob for k in HIGH_KEYWORDS) else None


CATEGORY_KEYWORDS = {
    "Water Supply": [
        "drinking water", "water supply", "pipeline", "pipe leak", "water crisis",
        "panni", "pani", "paani", "nal", "toti", "jal", "tanker",
        "पानी", "जल", "नल", "पाइप", "टैंकर", "জল", "পানীয় জল"
    ],
    "Sanitation": [
        "garbage", "trash", "waste", "dustbin", "sewage overflow", "bad smell",
        "kachra", "gandagi", "safai", "badboo", "कचरा", "सफाई", "गंदगी", "আবর্জনা", "ময়লা"
    ],
    "Street Lighting": [
        "street light", "streetlight", "light pole", "streetlamp", "darkness",
        "batti", "andhera", "लाइट", "बत्ती", "अंधेरा", "আলো", "বাতি"
    ],
    "Roads & Maintenance": [
        "pothole", "potholes", "footpath", "divider", "pavement", "deep pothole",
        "sadak", "gaddha", "gaddhe", "rasta", "सड़क", "गड्ढा", "রাস্তা", "গর্ত"
    ],
    "Electrical": [
        "transformer", "electric shock", "short circuit", "live wire", "exposed wire",
        "bijli", "current", "taar", "power cut", "बिजली", "करंट", "বিদ্যুৎ"
    ],
}


def rule_category(*texts):
    blob = " ".join(t for t in texts if t).lower()
    for cat, kws in CATEGORY_KEYWORDS.items():
        for kw in kws:
            if f" {kw} " in f" {blob} ":
                return cat
    return None


COMMON_HINGLISH_WORDS = {
    "humare", "hamare", "yha", "yahan", "wahan", "pe", "din", "se", "panni", "pani",
    "paani", "nhi", "nahi", "nahin", "ara", "aa", "raha", "rahi", "rahe", "hai",
    "hain", "karo", "kripya", "jaldi", "bijli", "sadak", "kachra", "ganda", "saaf",
    "batti", "kharab", "gaddha", "gaddhe", "gully", "nal", "nalo", "tota", "paip",
    "bahut", "bohot", "kuch", "shikayat", "kijiye", "bhi", "tha", "thi", "the", "par"
}


def is_hinglish(text):
    words = [w.strip(".,!?:;'\"()[]{}").lower() for w in text.split()]
    match_count = sum(1 for w in words if w in COMMON_HINGLISH_WORDS)
    return match_count >= 2 or (len(words) <= 5 and match_count >= 1)


# ---------------------------------------------------------------- language detection
_SCRIPTS = [("bn", 0x0980, 0x09FF), ("pa", 0x0A00, 0x0A7F), ("gu", 0x0A80, 0x0AFF),
            ("ta", 0x0B80, 0x0BFF), ("te", 0x0C00, 0x0C7F), ("kn", 0x0C80, 0x0CFF),
            ("ml", 0x0D00, 0x0D7F), ("dev", 0x0900, 0x097F)]


def detect_language(text, hint=None):
    # Script decides the language, except Devanagari (Hindi vs Marathi) which uses the hint or langdetect.
    counts = {}
    for ch in text:
        o = ord(ch)
        for name, lo, hi in _SCRIPTS:
            if lo <= o <= hi:
                counts[name] = counts.get(name, 0) + 1
                break
    latin = sum(1 for ch in text if ch.isascii() and ch.isalpha())
    indic = sum(counts.values())
    if indic == 0 or latin > indic * 3:
        if hint and hint != "en":
            return hint
        return "en"
    script = max(counts, key=counts.get)
    if script != "dev":
        return script
    if hint in ("hi", "mr"):
        return hint
    try:
        from langdetect import DetectorFactory, detect_langs
        DetectorFactory.seed = 0
        probs = {x.lang: x.prob for x in detect_langs(text)}
        if "mr" in probs or "hi" in probs:
            return "mr" if probs.get("mr", 0) > probs.get("hi", 0) else "hi"
    except Exception:
        pass
    return "hi"


# ---------------------------------------------------------------- translation (NLLB-200)
def nllb_translate(texts, src_code, tgt_code, tok, model, device, batch_size=32,
                   max_input_tokens=128, max_new_tokens=64, num_beams=1):
    # Translate a list of strings; returns a list in the original order.
    tok.src_lang = src_code
    tgt_id = tok.convert_tokens_to_ids(tgt_code)
    order = sorted(range(len(texts)), key=lambda i: len(texts[i]))
    out = [""] * len(texts)
    for s in range(0, len(order), batch_size):
        idx = order[s:s + batch_size]
        enc = tok([texts[i] for i in idx], return_tensors="pt", padding=True, truncation=True,
                  max_length=max_input_tokens).to(device)
        with torch.inference_mode():
            gen = model.generate(**enc, forced_bos_token_id=tgt_id, max_new_tokens=max_new_tokens,
                                 num_beams=num_beams, no_repeat_ngram_size=4)
        for i, t in zip(idx, tok.batch_decode(gen, skip_special_tokens=True)):
            out[i] = t
    return out


# ---------------------------------------------------------------- the classifier
class MultiTaskModel(nn.Module):
    def __init__(self, encoder, n_cat, n_urg, dropout=0.1):
        super().__init__()
        self.encoder = encoder
        hidden = encoder.config.hidden_size
        self.drop = nn.Dropout(dropout)
        self.cat_head = nn.Linear(hidden, n_cat)
        self.urg_head = nn.Linear(hidden, n_urg)

    def forward(self, input_ids, attention_mask):
        h = self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state
        m = attention_mask.unsqueeze(-1).to(h.dtype)
        pooled = self.drop((h * m).sum(1) / m.sum(1).clamp(min=1))
        return self.cat_head(pooled), self.urg_head(pooled)

    def save(self, path):
        os.makedirs(path, exist_ok=True)
        self.encoder.save_pretrained(os.path.join(path, "encoder"))
        torch.save({"cat_head": self.cat_head.state_dict(), "urg_head": self.urg_head.state_dict()},
                   os.path.join(path, "heads.pt"))

    @classmethod
    def load(cls, path, device="cpu"):
        encoder = AutoModel.from_pretrained(os.path.join(path, "encoder"))
        meta = json.load(open(os.path.join(path, "meta.json"), encoding="utf-8"))
        model = cls(encoder, len(meta["categories"]), len(meta["urgency_levels"]))
        heads = torch.load(os.path.join(path, "heads.pt"), map_location="cpu")
        model.cat_head.load_state_dict(heads["cat_head"])
        model.urg_head.load_state_dict(heads["urg_head"])
        return model.to(device).eval()


class MGRSPredictor:
    def __init__(self, model_dir, translate=True, nllb_name=None, device=None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.meta = json.load(open(os.path.join(model_dir, "meta.json"), encoding="utf-8"))
        self.tok = AutoTokenizer.from_pretrained(model_dir)
        self.model = MultiTaskModel.load(model_dir, self.device)
        self.version = self.meta.get("model_version", "mgrs-v1")
        self.max_len = self.meta.get("max_len", 128)
        self.translate_enabled = translate
        self.nllb_name = nllb_name or self.meta.get("translator", "facebook/nllb-200-distilled-600M")
        self._t_tok = None
        self._t_model = None

    def _load_translator(self):
        if self._t_model is None:
            self._t_tok = AutoTokenizer.from_pretrained(self.nllb_name)
            dtype = torch.float16 if self.device == "cuda" else torch.float32
            self._t_model = AutoModelForSeq2SeqLM.from_pretrained(self.nllb_name, torch_dtype=dtype)
            self._t_model = self._t_model.to(self.device).eval()

    def translate_to_english(self, text, lang):
        if not text or not text.strip():
            return text
        import urllib.request, urllib.parse, json, re

        query_text = text
        # If text is Hinglish / Romanized Hindi, disambiguate colloquial terms
        if is_hinglish(text) or any(w in text.lower() for w in ["panni", "pani", "paani", "nhi", "ara", "yha"]):
            query_text = re.sub(r'\bpanni\b', 'paani (tap water supply)', query_text, flags=re.IGNORECASE)
            query_text = re.sub(r'\byha\b', 'yahan', query_text, flags=re.IGNORECASE)
            query_text = re.sub(r'\bnhi\b', 'nahi', query_text, flags=re.IGNORECASE)
            query_text = re.sub(r'\bara\b', 'aa raha', query_text, flags=re.IGNORECASE)

        def post_process_translation(res_str):
            if not res_str:
                return res_str
            cleaned = res_str.strip()
            # Municipal safeguard: "pani/panni" in municipal complaints means water supply, not weather rain
            if any(w in text.lower() for w in ["panni", "pani", "paani", "nal"]) and "rain" in cleaned.lower():
                cleaned = re.sub(r'\bhad any rain\b', 'had water supply', cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(r'\bany rain\b', 'water supply', cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(r'\brain\b', 'water supply', cleaned, flags=re.IGNORECASE)
            return cleaned

        sl = lang if lang and lang != 'hin' else 'auto'
        # 1. Primary Engine: Google client=dict-chrome-ex (fast & does not hit gtx 429)
        try:
            url = f"https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl={sl}&tl=en&dt=t&q=" + urllib.parse.quote(query_text)
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                res = ''.join([x[0] for x in data[0] if x and x[0]])
                if res and res.strip():
                    return post_process_translation(res)
        except Exception:
            pass

        # 2. Secondary Engine: MyMemory Public API fallback
        try:
            url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(query_text)}&langpair={sl}|en"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                res = data.get('responseData', {}).get('translatedText')
                if res and res.strip() and not res.startswith('MYMEMORY WARNING'):
                    return post_process_translation(res)
        except Exception:
            pass

        # 3. Third Fallback: Local NLLB-200 model if enabled
        if self.translate_enabled and lang in NLLB_CODES:
            try:
                self._load_translator()
                raw_res = nllb_translate([query_text], NLLB_CODES[lang], "eng_Latn", self._t_tok, self._t_model,
                                         self.device, batch_size=1)[0]
                return post_process_translation(raw_res)
            except Exception as exc:
                print("translation failed:", repr(exc)[:200])
        return None

    @torch.inference_mode()
    def classify(self, text):
        enc = self.tok([text], return_tensors="pt", truncation=True, max_length=self.max_len).to(self.device)
        lc, lu = self.model(enc["input_ids"], enc["attention_mask"])
        pc, pu = lc.float().softmax(-1)[0], lu.float().softmax(-1)[0]
        ci, ui = int(pc.argmax()), int(pu.argmax())
        return CATEGORIES[ci], float(pc[ci]), URGENCY_LEVELS[ui], float(pu[ui])

    def predict(self, text, language=None):
        text = (text or "").strip()
        lang = detect_language(text, language)

        # Detect Hinglish (Hindi words in English alphabet) even if submitted as 'en'
        if (lang == "en" or not language or language == "en") and is_hinglish(text):
            lang = "hi"

        if lang == "en":
            translated = text
        else:
            translated = self.translate_to_english(text, lang) or text

        # If we successfully translated Hinglish / regional text to English,
        # classify the clean English text so IndicBERTv2 sees standard vocabulary
        classify_text = translated if (translated and translated != text) else text
        category, conf, urgency, _ = self.classify(classify_text)

        # Apply category keyword safety check (e.g. prevents "panni/water" from becoming Street Lighting)
        safety_cat = rule_category(text, translated)
        if safety_cat:
            category = safety_cat

        if rule_urgency(text, translated):
            urgency = "HIGH"

        return {
            "category": category,
            "department": DEPARTMENT[category],
            "urgency": urgency,
            "confidence": round(conf, 4),
            "translated_text": translated,
            "detected_language": lang,
            "estimated_resolution_days": RESOLUTION_DAYS[(category, urgency)],
            "model_version": self.version,
            "ai_pending": False,
        }
