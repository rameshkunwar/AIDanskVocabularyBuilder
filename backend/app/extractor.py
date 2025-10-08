import re 
from collections import Counter 
import nltk
nltk.download('punkt')

def simple_tokenize(text:str):
    tokens = re.findall(r"[A-Za-zÆØÅæøå]+", text)
    return [t.lower() for t in tokens]

def extract_words_from_text(text:str):
    tokens = simple_tokenize(text)
    counts = Counter(tokens)
    return counts

# optional: syllable estimator (simple heuristic)
def estimate_syllables(word:str) -> int:
    # naive: count vowel groups (including Danish vowels)
    groups = re.findall(r"[aeiouyæøåAEIOUYÆØÅ]+", word)
    return max(1, len(groups))