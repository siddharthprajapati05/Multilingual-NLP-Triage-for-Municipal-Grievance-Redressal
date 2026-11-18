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
    "fire", "flood", "accident", "death", "died", "injury", "injured", "emergency", "danger",
    "collapse", "explosion", "sewage overflow", "contaminated", "live wire", "electric shock",
    "open manhole", "electrocut", "live electric", "sparking", "sparks", "exposed wire", "fallen tree",
    "आग", "बाढ़", "दुर्घटना", "मृत्यु", "आपातकाल", "आपात",
    "தீ", "வெள்ளம்", "அவசரம்", "அவசர",
    "ಬೆಂಕಿ", "ಪ್ರವಾಹ", "ತುರ್ತು",
]


def rule_urgency(*texts):
    blob = " ".join(t for t in texts if t).lower()
    return "HIGH" if any(k in blob for k in HIGH_KEYWORDS) else None


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
        return hint if hint in ("en", "hin") else "en"
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
        # 1. Fast online translation (completes in ~0.2s)
        try:
            import urllib.request, urllib.parse, json
            sl = lang if lang and lang != 'hin' else 'auto'
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={sl}&tl=en&dt=t&q=" + urllib.parse.quote(text)
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                res = ''.join([x[0] for x in data[0] if x and x[0]])
                if res and res.strip():
                    return res.strip()
        except Exception:
            pass

        # 2. Fallback to local NLLB-200 model if enabled
        if self.translate_enabled and lang in NLLB_CODES:
            try:
                self._load_translator()
                return nllb_translate([text], NLLB_CODES[lang], "eng_Latn", self._t_tok, self._t_model,
                                      self.device, batch_size=1)[0]
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
        if lang in ("en", "hin"):
            translated = text  # already Latin script (romanised Hindi is not translated)
        else:
            translated = self.translate_to_english(text, lang)
        category, conf, urgency, _ = self.classify(text)
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
