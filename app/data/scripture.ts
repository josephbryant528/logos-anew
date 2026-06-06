export interface OriginalWord {
  id: string;
  original: string;
  transliteration: string;
  gloss: string;
  lemma: string;
  strongsNumber: string;
  partOfSpeech: string;
  parsing: string;
  extendedDefinition: string;
}

export interface ScriptureVerse {
  book: string;
  chapter: number;
  verse: number;
  language: "greek" | "hebrew";
  words: OriginalWord[];
  esv: string;
  kjv: string;
}

export interface Commentary {
  id: string;
  source: string;
  author: string;
  era: string;
  verseKey: string;
  text: string;
}

export const PASSAGES: ScriptureVerse[] = [
  // John 1:1–3 (Greek)
  {
    book: "John", chapter: 1, verse: 1, language: "greek",
    esv: "In the beginning was the Word, and the Word was with God, and the Word was God.",
    kjv: "In the beginning was the Word, and the Word was with God, and the Word was God.",
    words: [
      { id: "jn1.1.1", original: "Ἐν", transliteration: "En", gloss: "In", lemma: "ἐν", strongsNumber: "G1722", partOfSpeech: "Preposition", parsing: "prep", extendedDefinition: "A primary preposition denoting position (in place, time or state)." },
      { id: "jn1.1.2", original: "ἀρχῇ", transliteration: "archē", gloss: "beginning", lemma: "ἀρχή", strongsNumber: "G746", partOfSpeech: "Noun", parsing: "N-DSF", extendedDefinition: "Beginning, origin, first cause. Used in LXX Gen 1:1 for the commencement of creation." },
      { id: "jn1.1.3", original: "ἦν", transliteration: "ēn", gloss: "was", lemma: "εἰμί", strongsNumber: "G1510", partOfSpeech: "Verb", parsing: "V-IIA-3S", extendedDefinition: "The imperfect tense (ēn) indicates continuous existence in the past — the Word already existed when the beginning began." },
      { id: "jn1.1.4", original: "ὁ", transliteration: "ho", gloss: "the", lemma: "ὁ", strongsNumber: "G3588", partOfSpeech: "Article", parsing: "Art-NMS", extendedDefinition: "Definite article, masculine nominative singular. Marks the following noun as a specific, identified referent." },
      { id: "jn1.1.5", original: "λόγος", transliteration: "Logos", gloss: "Word", lemma: "λόγος", strongsNumber: "G3056", partOfSpeech: "Noun", parsing: "N-NMS", extendedDefinition: "Word, reason, discourse. In Stoic philosophy, the rational principle governing all things. John uses it to identify Jesus as the divine Reason and Speech of God." },
      { id: "jn1.1.6", original: "καὶ", transliteration: "kai", gloss: "and", lemma: "καί", strongsNumber: "G2532", partOfSpeech: "Conjunction", parsing: "conj", extendedDefinition: "And, also, even. Coordinates clauses." },
      { id: "jn1.1.7", original: "ὁ", transliteration: "ho", gloss: "the", lemma: "ὁ", strongsNumber: "G3588", partOfSpeech: "Article", parsing: "Art-NMS", extendedDefinition: "Definite article." },
      { id: "jn1.1.8", original: "λόγος", transliteration: "Logos", gloss: "Word", lemma: "λόγος", strongsNumber: "G3056", partOfSpeech: "Noun", parsing: "N-NMS", extendedDefinition: "See above. The Word is the subject of all three clauses in this verse." },
      { id: "jn1.1.9", original: "ἦν", transliteration: "ēn", gloss: "was", lemma: "εἰμί", strongsNumber: "G1510", partOfSpeech: "Verb", parsing: "V-IIA-3S", extendedDefinition: "Continuous past existence." },
      { id: "jn1.1.10", original: "πρὸς", transliteration: "pros", gloss: "with", lemma: "πρός", strongsNumber: "G4314", partOfSpeech: "Preposition", parsing: "prep", extendedDefinition: "Toward, with, in relation to. Pros + accusative indicates face-to-face relationship, intimate communion, not mere proximity." },
      { id: "jn1.1.11", original: "τὸν", transliteration: "ton", gloss: "the", lemma: "ὁ", strongsNumber: "G3588", partOfSpeech: "Article", parsing: "Art-AMS", extendedDefinition: "Definite article, accusative singular, required by pros." },
      { id: "jn1.1.12", original: "θεόν", transliteration: "Theon", gloss: "God", lemma: "θεός", strongsNumber: "G2316", partOfSpeech: "Noun", parsing: "N-AMS", extendedDefinition: "God. Here with the article (ton Theon) — the Father as a specific, personal being. The Word was in relationship with this God." },
      { id: "jn1.1.13", original: "καὶ", transliteration: "kai", gloss: "and", lemma: "καί", strongsNumber: "G2532", partOfSpeech: "Conjunction", parsing: "conj", extendedDefinition: "Coordinating conjunction." },
      { id: "jn1.1.14", original: "θεὸς", transliteration: "Theos", gloss: "God", lemma: "θεός", strongsNumber: "G2316", partOfSpeech: "Noun", parsing: "N-NMS", extendedDefinition: "Note: anarthrous (no article). This is Colwell's Rule context — the predicate noun before the verb lacks the article to stress quality/nature, not indefiniteness. The Word shares the divine nature." },
      { id: "jn1.1.15", original: "ἦν", transliteration: "ēn", gloss: "was", lemma: "εἰμί", strongsNumber: "G1510", partOfSpeech: "Verb", parsing: "V-IIA-3S", extendedDefinition: "Was, continuous past." },
      { id: "jn1.1.16", original: "ὁ", transliteration: "ho", gloss: "the", lemma: "ὁ", strongsNumber: "G3588", partOfSpeech: "Article", parsing: "Art-NMS", extendedDefinition: "Article identifying the subject." },
      { id: "jn1.1.17", original: "λόγος", transliteration: "Logos", gloss: "Word", lemma: "λόγος", strongsNumber: "G3056", partOfSpeech: "Noun", parsing: "N-NMS", extendedDefinition: "The Word — subject of the final clause." },
    ]
  },
  {
    book: "John", chapter: 1, verse: 2, language: "greek",
    esv: "He was in the beginning with God.",
    kjv: "The same was in the beginning with God.",
    words: [
      { id: "jn1.2.1", original: "οὗτος", transliteration: "houtos", gloss: "This one / He", lemma: "οὗτος", strongsNumber: "G3778", partOfSpeech: "Pronoun", parsing: "P-NMS", extendedDefinition: "Demonstrative pronoun referring back to the Logos of v. 1, confirming continuity of subject." },
      { id: "jn1.2.2", original: "ἦν", transliteration: "ēn", gloss: "was", lemma: "εἰμί", strongsNumber: "G1510", partOfSpeech: "Verb", parsing: "V-IIA-3S", extendedDefinition: "Continuous past existence, reinforcing the pre-existence stated in v. 1." },
      { id: "jn1.2.3", original: "ἐν", transliteration: "en", gloss: "in", lemma: "ἐν", strongsNumber: "G1722", partOfSpeech: "Preposition", parsing: "prep", extendedDefinition: "In, at." },
      { id: "jn1.2.4", original: "ἀρχῇ", transliteration: "archē", gloss: "beginning", lemma: "ἀρχή", strongsNumber: "G746", partOfSpeech: "Noun", parsing: "N-DSF", extendedDefinition: "Resuming the temporal anchor from v. 1." },
      { id: "jn1.2.5", original: "πρὸς", transliteration: "pros", gloss: "with", lemma: "πρός", strongsNumber: "G4314", partOfSpeech: "Preposition", parsing: "prep", extendedDefinition: "Face-to-face relationship with the Father." },
      { id: "jn1.2.6", original: "τὸν", transliteration: "ton", gloss: "the", lemma: "ὁ", strongsNumber: "G3588", partOfSpeech: "Article", parsing: "Art-AMS", extendedDefinition: "Article." },
      { id: "jn1.2.7", original: "θεόν", transliteration: "Theon", gloss: "God", lemma: "θεός", strongsNumber: "G2316", partOfSpeech: "Noun", parsing: "N-AMS", extendedDefinition: "The personal God, the Father." },
    ]
  },
  {
    book: "John", chapter: 1, verse: 3, language: "greek",
    esv: "All things were made through him, and without him was not any thing made that was made.",
    kjv: "All things were made by him; and without him was not any thing made that was made.",
    words: [
      { id: "jn1.3.1", original: "πάντα", transliteration: "panta", gloss: "All things", lemma: "πᾶς", strongsNumber: "G3956", partOfSpeech: "Adjective", parsing: "Adj-ANP", extendedDefinition: "All, every, the whole. Used substantively here as the direct object." },
      { id: "jn1.3.2", original: "δι'", transliteration: "di'", gloss: "through", lemma: "διά", strongsNumber: "G1223", partOfSpeech: "Preposition", parsing: "prep", extendedDefinition: "Through, by means of. The Word is the instrumental agent of creation, not its initiator — a nuance distinguishing the Son from the Father in Trinitarian thought." },
      { id: "jn1.3.3", original: "αὐτοῦ", transliteration: "autou", gloss: "him", lemma: "αὐτός", strongsNumber: "G0846", partOfSpeech: "Pronoun", parsing: "P-GMS", extendedDefinition: "Him — referring to the Logos." },
      { id: "jn1.3.4", original: "ἐγένετο", transliteration: "egeneto", gloss: "came into being", lemma: "γίνομαι", strongsNumber: "G1096", partOfSpeech: "Verb", parsing: "V-AOI-3S", extendedDefinition: "Came to be, was made. Aorist, contrasting with the imperfect ēn in vv. 1-2. Created things 'came into being'; the Logos simply 'was'." },
      { id: "jn1.3.5", original: "καὶ", transliteration: "kai", gloss: "and", lemma: "καί", strongsNumber: "G2532", partOfSpeech: "Conjunction", parsing: "conj", extendedDefinition: "And." },
      { id: "jn1.3.6", original: "χωρὶς", transliteration: "chōris", gloss: "apart from / without", lemma: "χωρίς", strongsNumber: "G5565", partOfSpeech: "Preposition", parsing: "prep", extendedDefinition: "Without, apart from, separately from." },
      { id: "jn1.3.7", original: "αὐτοῦ", transliteration: "autou", gloss: "him", lemma: "αὐτός", strongsNumber: "G0846", partOfSpeech: "Pronoun", parsing: "P-GMS", extendedDefinition: "Him — the Logos." },
      { id: "jn1.3.8", original: "ἐγένετο", transliteration: "egeneto", gloss: "came into being", lemma: "γίνομαι", strongsNumber: "G1096", partOfSpeech: "Verb", parsing: "V-AOI-3S", extendedDefinition: "Came to be." },
      { id: "jn1.3.9", original: "οὐδὲ", transliteration: "oude", gloss: "not even", lemma: "οὐδέ", strongsNumber: "G3761", partOfSpeech: "Conjunction", parsing: "conj", extendedDefinition: "Not even, neither, nor." },
      { id: "jn1.3.10", original: "ἕν", transliteration: "hen", gloss: "one thing", lemma: "εἷς", strongsNumber: "G1520", partOfSpeech: "Numeral", parsing: "Num-ANS", extendedDefinition: "One — emphatic. Not one single thing came into being without the Logos." },
    ]
  },
  // Genesis 1:1–3 (Hebrew)
  {
    book: "Genesis", chapter: 1, verse: 1, language: "hebrew",
    esv: "In the beginning, God created the heavens and the earth.",
    kjv: "In the beginning God created the heaven and the earth.",
    words: [
      { id: "gn1.1.1", original: "בְּרֵאשִׁית", transliteration: "bə·rê·šîṯ", gloss: "In the beginning", lemma: "רֵאשִׁית", strongsNumber: "H7225", partOfSpeech: "Noun", parsing: "N-fsc", extendedDefinition: "Beginning, first, chief. The construct form with prefixed preposition bet. Unlike John 1:1, the article is absent in Hebrew, suggesting 'in a beginning' — though Jewish tradition interprets this as the absolute beginning of time." },
      { id: "gn1.1.2", original: "בָּרָא", transliteration: "bā·rā", gloss: "created", lemma: "בָּרָא", strongsNumber: "H1254", partOfSpeech: "Verb", parsing: "V-Qal-Perf-3ms", extendedDefinition: "Create. Crucially, this verb in the Qal stem is used exclusively with God as subject in the OT — never of human making. It implies production without prior material (creatio ex nihilo), though the text does not explicitly state this." },
      { id: "gn1.1.3", original: "אֱלֹהִים", transliteration: "ʾĕ·lō·hîm", gloss: "God", lemma: "אֱלֹהִים", strongsNumber: "H430", partOfSpeech: "Noun", parsing: "N-mp", extendedDefinition: "God. Morphologically plural (the '-im' suffix), yet paired with the singular verb bārāʾ. This has been interpreted as a plural of majesty (grammatical intensification) or, in Christian interpretation, as an early hint of plurality within unity." },
      { id: "gn1.1.4", original: "אֵת", transliteration: "ʾêṯ", gloss: "[direct object marker]", lemma: "אֵת", strongsNumber: "H853", partOfSpeech: "Particle", parsing: "part", extendedDefinition: "The definite direct object marker. Untranslatable into English; it signals that the following noun is the specific, definite object of the verb. Here used twice to mark both 'the heavens' and 'the earth'." },
      { id: "gn1.1.5", original: "הַשָּׁמַיִם", transliteration: "haš·šā·ma·yim", gloss: "the heavens", lemma: "שָׁמַיִם", strongsNumber: "H8064", partOfSpeech: "Noun", parsing: "N-mp-def", extendedDefinition: "Heavens, sky. Always plural in Hebrew (a dual/plural of extent). Can refer to the physical sky, the stellar heavens, or the divine dwelling — often all simultaneously in biblical usage." },
      { id: "gn1.1.6", original: "וְאֵת", transliteration: "wə·ʾêṯ", gloss: "and [direct object]", lemma: "אֵת", strongsNumber: "H853", partOfSpeech: "Particle", parsing: "part+conj", extendedDefinition: "Conjunction waw + object marker, introducing the second object." },
      { id: "gn1.1.7", original: "הָאָרֶץ", transliteration: "hā·ʾā·reṣ", gloss: "the earth", lemma: "אֶרֶץ", strongsNumber: "H776", partOfSpeech: "Noun", parsing: "N-fs-def", extendedDefinition: "Earth, land, ground. With the article, referring to the definite earth as a cosmic entity, not merely the soil." },
    ]
  },
  {
    book: "Genesis", chapter: 1, verse: 2, language: "hebrew",
    esv: "The earth was without form and void, and darkness was over the face of the deep. And the Spirit of God was hovering over the face of the waters.",
    kjv: "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.",
    words: [
      { id: "gn1.2.1", original: "וְהָאָרֶץ", transliteration: "wə·hā·ʾā·reṣ", gloss: "Now the earth", lemma: "אֶרֶץ", strongsNumber: "H776", partOfSpeech: "Noun", parsing: "N-fs-def+conj", extendedDefinition: "The conjunction here (waw-disjunctive) introduces a circumstantial clause describing the state of the earth at the time of v. 1's creation — likely describing the initial unformed state." },
      { id: "gn1.2.2", original: "הָיְתָה", transliteration: "hā·yə·ṯāh", gloss: "was", lemma: "הָיָה", strongsNumber: "H1961", partOfSpeech: "Verb", parsing: "V-Qal-Perf-3fs", extendedDefinition: "Was, became, existed. The qal perfect of hayah. 'Became' is a possible translation (hayah often marks change of state), leading some to propose a gap between v.1 and v.2 — the 'Gap Theory' — though most scholars read this as simple description of the initial state." },
      { id: "gn1.2.3", original: "תֹהוּ", transliteration: "ṯō·hū", gloss: "formless / without form", lemma: "תֹּהוּ", strongsNumber: "H8414", partOfSpeech: "Noun", parsing: "N-ms", extendedDefinition: "Formlessness, emptiness, waste. Used in Jer 4:23 to describe the de-creation of the land in judgment ('tohu vabohu' there). Describes the earth as lacking shape, structure, or distinguishable features." },
      { id: "gn1.2.4", original: "וָבֹהוּ", transliteration: "wā·ḇō·hū", gloss: "and void", lemma: "בֹּהוּ", strongsNumber: "H922", partOfSpeech: "Noun", parsing: "N-ms+conj", extendedDefinition: "Emptiness, void. Occurs only with tohu (Gen 1:2; Jer 4:23; Isa 34:11). The pairing 'tohu wabohu' is a hendiadys conveying total emptiness and formlessness." },
      { id: "gn1.2.5", original: "רוּחַ", transliteration: "rū·aḥ", gloss: "Spirit / breath / wind", lemma: "רוּחַ", strongsNumber: "H7307", partOfSpeech: "Noun", parsing: "N-cs", extendedDefinition: "Wind, breath, spirit. The construct form preceding ʾĕlōhîm. This is the most theologically loaded word in v. 2. Interpretations include: (1) a violent storm-wind from God (natural reading), (2) the Spirit of God as a divine agent (theological reading), (3) an exceedingly great wind (superlative idiom). The LXX translates pneuma Theou, 'Spirit of God'." },
      { id: "gn1.2.6", original: "אֱלֹהִים", transliteration: "ʾĕ·lō·hîm", gloss: "of God", lemma: "אֱלֹהִים", strongsNumber: "H430", partOfSpeech: "Noun", parsing: "N-mp", extendedDefinition: "God, in construct relationship with ruach — the genitive 'of God' modifying the spirit/wind." },
      { id: "gn1.2.7", original: "מְרַחֶפֶת", transliteration: "mə·ra·ḥe·p̄eṯ", gloss: "was hovering", lemma: "רָחַף", strongsNumber: "H7363", partOfSpeech: "Verb", parsing: "V-Piel-Part-fs", extendedDefinition: "Hover, flutter, brood over. Piel participle (intensive/repeated action). This verb appears only here and in Deut 32:11 where an eagle 'flutters' over its young. The image is of protective, life-giving motion — as though the Spirit is incubating the creation." },
    ]
  },
  {
    book: "Genesis", chapter: 1, verse: 3, language: "hebrew",
    esv: 'And God said, "Let there be light," and there was light.',
    kjv: "And God said, Let there be light: and there was light.",
    words: [
      { id: "gn1.3.1", original: "וַיֹּאמֶר", transliteration: "way·yō·mer", gloss: "And said", lemma: "אָמַר", strongsNumber: "H559", partOfSpeech: "Verb", parsing: "V-Qal-ConsecImpf-3ms", extendedDefinition: "Said. The waw-consecutive imperfect drives the narrative forward — the main story line resumes. God's speech is the mechanism of creation in v. 3–25; speech creates reality." },
      { id: "gn1.3.2", original: "אֱלֹהִים", transliteration: "ʾĕ·lō·hîm", gloss: "God", lemma: "אֱלֹהִים", strongsNumber: "H430", partOfSpeech: "Noun", parsing: "N-mp", extendedDefinition: "God — the subject of the creative speech." },
      { id: "gn1.3.3", original: "יְהִי", transliteration: "yə·hî", gloss: "Let there be", lemma: "הָיָה", strongsNumber: "H1961", partOfSpeech: "Verb", parsing: "V-Qal-Jussive-3ms", extendedDefinition: "Let there be. Jussive mood, expressing a wish or command directed at a third party. This is the divine fiat — not a request but a sovereign decree. John 1:3 echoes this: all things came to be through the Word (Logos)." },
      { id: "gn1.3.4", original: "אוֹר", transliteration: "ʾō·wr", gloss: "light", lemma: "אוֹר", strongsNumber: "H216", partOfSpeech: "Noun", parsing: "N-ms", extendedDefinition: "Light. Physical light, but in biblical symbolism also knowledge, life, divine presence (cf. Ps 27:1; John 8:12). The creation of light on Day 1 before the luminaries on Day 4 has prompted much discussion — perhaps establishing light as a principle before its physical instruments." },
      { id: "gn1.3.5", original: "וַיְהִי", transliteration: "way·yə·hî", gloss: "and there was", lemma: "הָיָה", strongsNumber: "H1961", partOfSpeech: "Verb", parsing: "V-Qal-ConsecImpf-3ms", extendedDefinition: "And it was. The waw-consecutive consummates the divine speech — God speaks and reality immediately conforms. This pattern of 'God said... and it was' (×8 in Gen 1) structures the whole creation account." },
      { id: "gn1.3.6", original: "אוֹר", transliteration: "ʾō·wr", gloss: "light", lemma: "אוֹר", strongsNumber: "H216", partOfSpeech: "Noun", parsing: "N-ms", extendedDefinition: "Light — repeated from the command, showing perfect fulfillment." },
    ]
  },
];

export const COMMENTARIES: Commentary[] = [
  {
    id: "c1", source: "Commentary on the Gospel of John", author: "John Calvin", era: "1553 AD", verseKey: "John 1:1",
    text: "He does not say that 'in the beginning the Word was made,' but that 'he was.' From this we conclude that at the very time when the world was created, the Word already existed — that he had no beginning in time, but an eternal essence. There is also point in the circumstance of time, for the evangelist does not simply say that the Word 'was' but that he 'was in the beginning.' Now the Divine essence has no beginning; therefore the eternity of the Word is clearly demonstrated."
  },
  {
    id: "c2", source: "Homilies on the Gospel of John", author: "John Chrysostom", era: "c. 391 AD", verseKey: "John 1:1",
    text: "Mark how he baffles the attempt. He says 'In the beginning was the Word,' and does not say 'became' or 'came to be,' but 'was,' which word, when predicated of God, has no beginning... Observe too how the Evangelist uses the very same expressions respecting the Son as he uses concerning the Father. For as he says of the Father, 'God,' so he says of the Son, 'the Word was God.'"
  },
  {
    id: "c3", source: "Matthew Henry's Commentary", author: "Matthew Henry", era: "1710 AD", verseKey: "John 1:1",
    text: "The eternity of Christ: 'In the beginning was the Word.' The Word existed not only at and before the beginning of the new-covenant dispensation, not only before the beginning of the Mosaic dispensation... but before the beginning of the world. When the beginning was, the Word was; which intimates that he had no beginning: he was when time itself began to be, and therefore before it."
  },
  {
    id: "c4", source: "Against Heresies", author: "Irenaeus of Lyon", era: "c. 180 AD", verseKey: "John 1:3",
    text: "John, the disciple of the Lord, preaches this faith, and seeks, by the proclamation of the Gospel, to remove that error which by Cerinthus had been disseminated among men... declaring that there is one God, the Maker of all things, and that He is not the fruit of any defect... 'All things were made by Him, and without Him was nothing made.'"
  },
  {
    id: "c5", source: "Commentary on John", author: "Augustine of Hippo", era: "c. 406 AD", verseKey: "John 1:3",
    text: "What then was made? The heaven and earth and things that are in the earth: the sea, the things that are in the sea; and all things that in them are. 'All things were made by Him.' What is 'all'? All. In this 'all' there is no exception for 'nothing.' Then the Word itself is not in the number of those things which were made... Therefore it was not made, therefore it is God."
  },
  {
    id: "c6", source: "Commentary on Genesis", author: "John Calvin", era: "1554 AD", verseKey: "Genesis 1:1",
    text: "Moses simply intends to assert that the world was not perfected at its very commencement, in the manner in which it is now seen, but that it was created an unfinished mass... This is the meaning of the word 'created,' to denote a production of something out of nothing. The term 'heavens' and 'earth' comprehend whatever is in the world, even though Moses afterwards treats of its different parts."
  },
  {
    id: "c7", source: "Hexaemeron (Six Days of Creation)", author: "Basil of Caesarea", era: "c. 370 AD", verseKey: "Genesis 1:1",
    text: "'In the beginning God created' — what a glorious beginning to a discourse! It was not idle curiosity that led the great Moses to mark so exactly the beginning of time... He shows us a world which had a beginning, and that time also had a beginning, together with the world. He says: 'In the beginning God created,' that is to say, in the beginning of time God created the heavens and the earth."
  },
  {
    id: "c8", source: "Commentary on Genesis", author: "Martin Luther", era: "1535 AD", verseKey: "Genesis 1:1",
    text: "Here Moses begins the account of the creation and briefly describes it, explaining with what order and by what means it was completed... This passage clearly refutes the Manicheans, who imagined two principles — good and evil. For if God is the Creator of all things, then there is no principle of evil equal to Him, but the evil that is in the world has arisen from the good through defection and sin."
  },
  {
    id: "c9", source: "On the Holy Spirit", author: "Basil of Caesarea", era: "c. 375 AD", verseKey: "Genesis 1:2",
    text: "Consider what I say: the Spirit of God moved upon the waters. Does this not mean that the Spirit was conserving the material nature of the waters, in the manner that a bird hatching its eggs conveys vital heat and vivifying force into that which is being brooded upon? Such is the exact force of the word in Hebrew, the Spirit 'brooded' — as a bird sitting on eggs gives them warmth and imparts to them vital energy."
  },
  {
    id: "c10", source: "City of God", author: "Augustine of Hippo", era: "c. 413 AD", verseKey: "Genesis 1:3",
    text: "Let us believe that God spoke, and it was done... not with any organ of speech, but with that eternal and ineffable Word, the Word of God, by which all things were made. For John begins his Gospel with this very truth: 'In the beginning was the Word, and the Word was with God, and the Word was God. He was in the beginning with God. All things were made through him.' That Word commanded this light to be."
  },
];

export interface BibleBook {
  name: string;
  chapters: number;
  language: "hebrew" | "greek" | "aramaic";
  testament: "OT" | "NT";
  abbreviation: string;
}

export const BIBLE_BOOKS: BibleBook[] = [
  { name: "Genesis",        chapters: 50,  language: "hebrew",  testament: "OT", abbreviation: "Gen"   },
  { name: "Exodus",         chapters: 40,  language: "hebrew",  testament: "OT", abbreviation: "Exod"  },
  { name: "Leviticus",      chapters: 27,  language: "hebrew",  testament: "OT", abbreviation: "Lev"   },
  { name: "Numbers",        chapters: 36,  language: "hebrew",  testament: "OT", abbreviation: "Num"   },
  { name: "Deuteronomy",    chapters: 34,  language: "hebrew",  testament: "OT", abbreviation: "Deut"  },
  { name: "Joshua",         chapters: 24,  language: "hebrew",  testament: "OT", abbreviation: "Josh"  },
  { name: "Judges",         chapters: 21,  language: "hebrew",  testament: "OT", abbreviation: "Judg"  },
  { name: "Ruth",           chapters: 4,   language: "hebrew",  testament: "OT", abbreviation: "Ruth"  },
  { name: "1 Samuel",       chapters: 31,  language: "hebrew",  testament: "OT", abbreviation: "1Sam"  },
  { name: "2 Samuel",       chapters: 24,  language: "hebrew",  testament: "OT", abbreviation: "2Sam"  },
  { name: "1 Kings",        chapters: 22,  language: "hebrew",  testament: "OT", abbreviation: "1Kgs"  },
  { name: "2 Kings",        chapters: 25,  language: "hebrew",  testament: "OT", abbreviation: "2Kgs"  },
  { name: "1 Chronicles",   chapters: 29,  language: "hebrew",  testament: "OT", abbreviation: "1Chr"  },
  { name: "2 Chronicles",   chapters: 36,  language: "hebrew",  testament: "OT", abbreviation: "2Chr"  },
  { name: "Ezra",           chapters: 10,  language: "hebrew",  testament: "OT", abbreviation: "Ezra"  },
  { name: "Nehemiah",       chapters: 13,  language: "hebrew",  testament: "OT", abbreviation: "Neh"   },
  { name: "Esther",         chapters: 10,  language: "hebrew",  testament: "OT", abbreviation: "Esth"  },
  { name: "Job",            chapters: 42,  language: "hebrew",  testament: "OT", abbreviation: "Job"   },
  { name: "Psalms",         chapters: 150, language: "hebrew",  testament: "OT", abbreviation: "Ps"    },
  { name: "Proverbs",       chapters: 31,  language: "hebrew",  testament: "OT", abbreviation: "Prov"  },
  { name: "Ecclesiastes",   chapters: 12,  language: "hebrew",  testament: "OT", abbreviation: "Eccl"  },
  { name: "Song of Solomon",chapters: 8,   language: "hebrew",  testament: "OT", abbreviation: "Song"  },
  { name: "Isaiah",         chapters: 66,  language: "hebrew",  testament: "OT", abbreviation: "Isa"   },
  { name: "Jeremiah",       chapters: 52,  language: "hebrew",  testament: "OT", abbreviation: "Jer"   },
  { name: "Lamentations",   chapters: 5,   language: "hebrew",  testament: "OT", abbreviation: "Lam"   },
  { name: "Ezekiel",        chapters: 48,  language: "hebrew",  testament: "OT", abbreviation: "Ezek"  },
  { name: "Daniel",         chapters: 12,  language: "aramaic", testament: "OT", abbreviation: "Dan"   },
  { name: "Hosea",          chapters: 14,  language: "hebrew",  testament: "OT", abbreviation: "Hos"   },
  { name: "Joel",           chapters: 3,   language: "hebrew",  testament: "OT", abbreviation: "Joel"  },
  { name: "Amos",           chapters: 9,   language: "hebrew",  testament: "OT", abbreviation: "Amos"  },
  { name: "Obadiah",        chapters: 1,   language: "hebrew",  testament: "OT", abbreviation: "Obad"  },
  { name: "Jonah",          chapters: 4,   language: "hebrew",  testament: "OT", abbreviation: "Jonah" },
  { name: "Micah",          chapters: 7,   language: "hebrew",  testament: "OT", abbreviation: "Mic"   },
  { name: "Nahum",          chapters: 3,   language: "hebrew",  testament: "OT", abbreviation: "Nah"   },
  { name: "Habakkuk",       chapters: 3,   language: "hebrew",  testament: "OT", abbreviation: "Hab"   },
  { name: "Zephaniah",      chapters: 3,   language: "hebrew",  testament: "OT", abbreviation: "Zeph"  },
  { name: "Haggai",         chapters: 2,   language: "hebrew",  testament: "OT", abbreviation: "Hag"   },
  { name: "Zechariah",      chapters: 14,  language: "hebrew",  testament: "OT", abbreviation: "Zech"  },
  { name: "Malachi",        chapters: 4,   language: "hebrew",  testament: "OT", abbreviation: "Mal"   },
  { name: "Matthew",        chapters: 28,  language: "greek",   testament: "NT", abbreviation: "Matt"  },
  { name: "Mark",           chapters: 16,  language: "greek",   testament: "NT", abbreviation: "Mark"  },
  { name: "Luke",           chapters: 24,  language: "greek",   testament: "NT", abbreviation: "Luke"  },
  { name: "John",           chapters: 21,  language: "greek",   testament: "NT", abbreviation: "John"  },
  { name: "Acts",           chapters: 28,  language: "greek",   testament: "NT", abbreviation: "Acts"  },
  { name: "Romans",         chapters: 16,  language: "greek",   testament: "NT", abbreviation: "Rom"   },
  { name: "1 Corinthians",  chapters: 16,  language: "greek",   testament: "NT", abbreviation: "1Cor"  },
  { name: "2 Corinthians",  chapters: 13,  language: "greek",   testament: "NT", abbreviation: "2Cor"  },
  { name: "Galatians",      chapters: 6,   language: "greek",   testament: "NT", abbreviation: "Gal"   },
  { name: "Ephesians",      chapters: 6,   language: "greek",   testament: "NT", abbreviation: "Eph"   },
  { name: "Philippians",    chapters: 4,   language: "greek",   testament: "NT", abbreviation: "Phil"  },
  { name: "Colossians",     chapters: 4,   language: "greek",   testament: "NT", abbreviation: "Col"   },
  { name: "1 Thessalonians",chapters: 5,   language: "greek",   testament: "NT", abbreviation: "1Thes" },
  { name: "2 Thessalonians",chapters: 3,   language: "greek",   testament: "NT", abbreviation: "2Thes" },
  { name: "1 Timothy",      chapters: 6,   language: "greek",   testament: "NT", abbreviation: "1Tim"  },
  { name: "2 Timothy",      chapters: 4,   language: "greek",   testament: "NT", abbreviation: "2Tim"  },
  { name: "Titus",          chapters: 3,   language: "greek",   testament: "NT", abbreviation: "Titus" },
  { name: "Philemon",       chapters: 1,   language: "greek",   testament: "NT", abbreviation: "Phlm"  },
  { name: "Hebrews",        chapters: 13,  language: "greek",   testament: "NT", abbreviation: "Heb"   },
  { name: "James",          chapters: 5,   language: "greek",   testament: "NT", abbreviation: "Jas"   },
  { name: "1 Peter",        chapters: 5,   language: "greek",   testament: "NT", abbreviation: "1Pet"  },
  { name: "2 Peter",        chapters: 3,   language: "greek",   testament: "NT", abbreviation: "2Pet"  },
  { name: "1 John",         chapters: 5,   language: "greek",   testament: "NT", abbreviation: "1John" },
  { name: "2 John",         chapters: 1,   language: "greek",   testament: "NT", abbreviation: "2John" },
  { name: "3 John",         chapters: 1,   language: "greek",   testament: "NT", abbreviation: "3John" },
  { name: "Jude",           chapters: 1,   language: "greek",   testament: "NT", abbreviation: "Jude"  },
  { name: "Revelation",     chapters: 22,  language: "greek",   testament: "NT", abbreviation: "Rev"   },
];

export function getVerseKey(book: string, chapter: number, verse: number) {
  return `${book} ${chapter}:${verse}`;
}

export function getCommentariesForVerse(book: string, chapter: number, verse: number): Commentary[] {
  const key = getVerseKey(book, chapter, verse);
  return COMMENTARIES.filter(c => c.verseKey === key);
}
