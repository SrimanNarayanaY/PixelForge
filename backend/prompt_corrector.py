"""
PixelForge AI Prompt Corrector & Enhancer
Automatically fixes spelling mistakes, typos, and grammatical errors in user prompts
before passing them to image and video generation models.
"""

import re
from typing import Tuple

# High-frequency typos and slang in image prompts
EXPLICIT_TYPOS = {
    # Articles, conjunctions, prepositions
    "te": "the", "th": "the", "tha": "the", "da": "the", "de": "the", "taht": "that",
    "ti": "to", "fo": "for", "fro": "from", "wid": "with", "wit": "with", "wiv": "with",
    "nd": "and", "annd": "and", "or": "or", "ur": "your", "u": "you", "r": "are",
    "plz": "please", "pls": "please", "pic": "picture", "bg": "background",

    # Subjects & Characters
    "boyy": "boy", "boii": "boy", "gerl": "girl", "gril": "girl", "gurl": "girl",
    "womman": "woman", "womn": "woman", "mann": "man", "persn": "person",
    "chiled": "child", "babe": "baby", "bby": "baby", "faimly": "family",
    "warriorr": "warrior", "samuraii": "samurai", "ninjaa": "ninja", "knite": "knight",
    "astronut": "astronaut", "dogg": "dog", "catt": "cat", "animall": "animal",

    # Actions / Verbs
    "swimmin": "swimming", "swiming": "swimming", "swimm": "swim",
    "runnin": "running", "runing": "running",
    "walkin": "walking", "walkking": "walking",
    "playin": "playing", "flyin": "flying", "flyying": "flying",
    "sittin": "sitting", "siting": "sitting",
    "dancin": "dancing", "dnce": "dance",
    "standin": "standing", "lookin": "looking", "smilin": "smiling",
    "wearin": "wearing", "holdin": "holding", "sleepin": "sleeping",

    # Places, Nature & Environment
    "pol": "pool", "pule": "pool", "poool": "pool",
    "watr": "water", "watter": "water", "wtr": "water",
    "moutain": "mountain", "montain": "mountain", "mountian": "mountain",
    "ocen": "ocean", "oceen": "ocean", "seea": "sea", "rivr": "river",
    "forst": "forest", "forrest": "forest", "jungel": "jungle",
    "gardn": "garden", "parrk": "park", "castel": "castle", "cassel": "castle",
    "ciyt": "city", "ctiy": "city", "stret": "street", "strt": "street",
    "bldng": "building", "hous": "house", "roome": "room",

    # Weather & Atmosphere
    "suny": "sunny", "rainey": "rainy", "rainin": "raining", "stomy": "stormy",
    "clowd": "cloud", "clowdy": "cloudy", "wether": "weather",
    "twilightt": "twilight", "sunsett": "sunset", "sunrize": "sunrise",

    # Objects & Tech
    "carr": "car", "caar": "car", "plne": "plane", "airoplane": "airplane",
    "boatt": "boat", "bycicle": "bicycle", "bycycle": "bicycle", "bik": "bike",
    "spacship": "spaceship", "robott": "robot",

    # Aesthetic & AI Keywords
    "bueatiful": "beautiful", "beutiful": "beautiful", "beautifull": "beautiful",
    "butiful": "beautiful", "prity": "pretty", "cutte": "cute",
    "cyberpuk": "cyberpunk", "cyberpnk": "cyberpunk", "ciberpunk": "cyberpunk",
    "animee": "anime", "animie": "anime",
    "fotorealistic": "photorealistic", "photoreal": "photorealistic", "realstic": "realistic",
    "cinmatic": "cinematic", "cinamatic": "cinematic",
    "detaled": "detailed", "detaile": "detailed", "masterpice": "masterpiece",
    "glowin": "glowing", "glown": "glowing", "brigt": "bright",
}

# Vocabulary for edit-distance candidate matching
COMMON_VOCAB = set("""
a about above across action adventure aesthetic after afternoon airplane alien alone
amazing ancient anime animal arch armor art astronaut atmosphere aurora autumn baby
background battle beach bear beautiful beauty bed bicycle big bird black blue boat
body book boy bridge bright building bush butter butterfly cabin campfire candle car
castle cat cave celebration cherry city classic clean cliff cloud cloudy colorful
concept cool cosmic country couple cow creature crystal cute cyberpunk dance dancing
dark dawn daylight deep deer demon desert detailed diamond digital dinosaur dirty
dog dragon dramatic dream drink driving drone dry dust dynamic eagle earth electric
element elephant elf emerald empty epic ethereal eye face fairy falling fantasy farm
fast feather female field fiery fire fish flame floating flower fluffy flying fog
forest fountain fox free fresh friend futuristic galaxy garden giant girl glass
glitch gold golden grass gray green ground hair halo hand handsome happy hard hat
head heart heavy helmet hero high highway hill historical holding horse hot hotel
house huge human ice illusion illustration intimate island jacket japanese jungle
katana king knight lake landscape lantern leaves legend light lightning lion little
liquid long looking lord lovely luxury macro magic majestic male man marble master
masterpiece mechanical medieval mist modern monster moon morning motion mountain
moving mud mushroom music mystery myth natural nature near neon night ninja ocean oil old
orange owl paint painter painting palace palm panther path peaceful peacock people
person pet phoenix photo photographer photographic photorealistic picture pine pink
pirate planet plant plastic playing pool portrait power powerful princess purple
rabbit race rain rainbow rainy realistic red reflection relax retro river road robot
rock roof room rose ruins runner running rural sailing samurai sand sapphire sci-fi
sculpture sea secret shadow shark shine shiny ship shock shoot shot silhouette
silver simple sitting sky skyline sleep small smile smiling smoke smooth snow solar
soul space sparkling speed spider spirit splash sport spring star statue stone storm
stormy street studio stylish summer sun sunny sunrise sunset super supercar swamp
sweet swim swimming sword temple texture the tiger tiny titan town train travel tree
tropical twilight ultra under underwater universe urban valley vehicle vintage violet vision
visual vivid volcano wallpaper warm warrior water waterfall wave weapon weather
white wild window wing winter with wolf woman wood world yellow young youth zen
""".split())


# Stopwords and short valid words that must NEVER be mutated
VALID_SHORT_WORDS = {
    "a", "an", "at", "as", "by", "do", "go", "he", "hi", "if", "in", "is", "it",
    "me", "my", "no", "of", "on", "or", "so", "to", "up", "us", "we", "am", "be",
    "and", "the", "for", "but", "not", "you", "all", "any", "can", "had", "has",
    "her", "him", "his", "how", "its", "let", "may", "new", "now", "old", "one",
    "our", "out", "own", "say", "she", "too", "use", "war", "way", "who", "why"
}


def _edits1(word: str):
    letters = "abcdefghijklmnopqrstuvwxyz"
    splits = [(word[:i], word[i:]) for i in range(len(word) + 1)]
    deletes = [L + R[1:] for L, R in splits if R]
    transposes = [L + R[1] + R[0] + R[2:] for L, R in splits if len(R) > 1]
    replaces = [L + c + R[1:] for L, R in splits if R for c in letters]
    inserts = [L + c + R for L, R in splits for c in letters]
    return set(deletes + transposes + replaces + inserts)


def _correct_word(word: str) -> str:
    lower_w = word.lower()

    # 1. Exact match in explicit common typos
    if lower_w in EXPLICIT_TYPOS:
        return EXPLICIT_TYPOS[lower_w]

    # 2. Protected short valid words (never mutate 'an', 'in', 'at', etc.)
    if lower_w in VALID_SHORT_WORDS:
        return lower_w

    # 3. Already a valid known English word
    if lower_w in COMMON_VOCAB:
        return lower_w

    # 4. Handle truncated action suffixes: e.g. swimmin -> swimming, runnin -> running
    if len(lower_w) >= 5 and lower_w.endswith("in") and not lower_w.endswith("ain"):
        candidate_ing = lower_w + "g"
        return candidate_ing

    # 5. Handle repeated accidental letters: e.g. poool -> pool, booy -> boy
    dedup = re.sub(r"(.)\1{2,}", r"\1\1", lower_w)
    if dedup in EXPLICIT_TYPOS:
        return EXPLICIT_TYPOS[dedup]
    if dedup in COMMON_VOCAB:
        return dedup

    # 6. Fuzzy match via 1-edit distance for words with length >= 4
    if len(lower_w) >= 4:
        e1_candidates = [w for w in _edits1(lower_w) if w in COMMON_VOCAB]
        if e1_candidates:
            return max(e1_candidates, key=len)

    return lower_w


def correct_prompt(prompt: str) -> Tuple[str, bool]:
    """
    Corrects spelling errors and typos in an image prompt.
    Returns: (corrected_prompt, was_modified)
    """
    if not prompt or not prompt.strip():
        return prompt, False

    cleaned_input = re.sub(r"\s+", " ", prompt).strip()
    tokens = cleaned_input.split(" ")
    corrected_tokens = []
    has_changes = False

    for token in tokens:
        # Separate word from trailing punctuation
        m = re.match(r"^([a-zA-Z0-9_\-\']+)([\.,!?;:]*)$", token)
        if not m:
            corrected_tokens.append(token)
            continue

        word_core, punct = m.groups()
        corrected_word = _correct_word(word_core)

        # Check if changed
        if corrected_word != word_core.lower():
            has_changes = True

        # Preserve original casing style (Title case or UPPERCASE)
        if word_core.isupper() and len(word_core) > 1:
            corrected_word = corrected_word.upper()
        elif word_core[0].isupper():
            corrected_word = corrected_word.capitalize()

        corrected_tokens.append(corrected_word + punct)

    corrected_prompt_str = " ".join(corrected_tokens)
    return corrected_prompt_str, has_changes
