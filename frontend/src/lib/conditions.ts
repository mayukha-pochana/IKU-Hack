// Recognised conditions for the profile search (common conditions seen in UK primary care and on
// ClinicalTrials.gov). Only names on this list can be added, so typos and made-up entries are rejected.
// Aliases map everyday words to the listed name.
export const CONDITIONS = [
  "Acne", "Addison's disease", "ADHD", "Age-related macular degeneration", "Alcohol use disorder", "Allergic rhinitis (hay fever)",
  "Alopecia areata", "Alzheimer's disease", "Anaemia", "Ankylosing spondylitis", "Anorexia nervosa", "Anxiety", "Asthma",
  "Atopic dermatitis", "Atrial fibrillation", "Autism", "Back pain", "Bipolar disorder", "Bladder cancer", "Bowel cancer",
  "Brain tumour", "Breast cancer", "Bronchiectasis", "Bronchitis", "Bulimia", "Cataracts", "Cerebral palsy", "Cervical cancer",
  "Chronic fatigue syndrome (ME/CFS)", "Chronic kidney disease", "Chronic pain", "Coeliac disease", "Colitis", "COPD",
  "Coronary heart disease", "COVID-19", "Long COVID", "Crohn's disease", "Cystic fibrosis", "Dementia", "Depression",
  "Type 1 diabetes", "Type 2 diabetes", "Gestational diabetes", "Diabetic retinopathy", "Down syndrome", "Dry eye disease",
  "Eczema", "Endometriosis", "Epilepsy", "Fibromyalgia", "Food allergy", "Gallstones", "GERD (acid reflux)", "Glaucoma", "Gout",
  "Graves' disease", "Haemophilia", "Hashimoto's thyroiditis", "Head and neck cancer", "Heart failure", "Hepatitis B", "Hepatitis C",
  "Hidradenitis suppurativa", "High blood pressure", "High cholesterol", "HIV", "Huntington's disease", "Hypothyroidism",
  "Hyperthyroidism", "Idiopathic pulmonary fibrosis", "Insomnia", "Interstitial cystitis", "Irritable bowel syndrome (IBS)",
  "Kidney cancer", "Kidney stones", "Leukaemia", "Liver cancer", "Liver disease", "Lung cancer", "Lupus", "Lymphoma",
  "Melanoma", "Menopause symptoms", "Migraine", "Motor neurone disease (ALS)", "Multiple myeloma", "Multiple sclerosis",
  "Muscular dystrophy", "Myasthenia gravis", "Non-alcoholic fatty liver disease", "Obesity", "Obsessive-compulsive disorder (OCD)",
  "Obstructive sleep apnoea", "Osteoarthritis", "Osteoporosis", "Ovarian cancer", "Pancreatic cancer", "Pancreatitis",
  "Parkinson's disease", "Peripheral arterial disease", "Polycystic ovary syndrome (PCOS)", "Postnatal depression",
  "Post-traumatic stress disorder (PTSD)", "Prostate cancer", "Psoriasis", "Psoriatic arthritis", "Pulmonary hypertension",
  "Restless legs syndrome", "Rheumatoid arthritis", "Rosacea", "Sarcoidosis", "Schizophrenia", "Sciatica", "Scleroderma",
  "Sickle cell disease", "Sinusitis", "Sjögren's syndrome", "Skin cancer", "Sleep disorders", "Smoking cessation",
  "Stomach cancer", "Stroke", "Substance use disorder", "Testicular cancer", "Thalassaemia", "Thyroid cancer", "Tinnitus",
  "Tuberculosis", "Ulcerative colitis", "Urinary incontinence", "Urinary tract infection", "Uterine fibroids", "Vitiligo",
] as const;

const ALIASES: Record<string, string> = {
  "hay fever": "Allergic rhinitis (hay fever)", "hypertension": "High blood pressure", "blood pressure": "High blood pressure",
  "diabetes": "Type 2 diabetes", "t1d": "Type 1 diabetes", "t2d": "Type 2 diabetes", "ibs": "Irritable bowel syndrome (IBS)",
  "pcos": "Polycystic ovary syndrome (PCOS)", "ptsd": "Post-traumatic stress disorder (PTSD)", "ocd": "Obsessive-compulsive disorder (OCD)",
  "ms": "Multiple sclerosis", "als": "Motor neurone disease (ALS)", "mnd": "Motor neurone disease (ALS)", "me": "Chronic fatigue syndrome (ME/CFS)",
  "cfs": "Chronic fatigue syndrome (ME/CFS)", "reflux": "GERD (acid reflux)", "acid reflux": "GERD (acid reflux)", "heartburn": "GERD (acid reflux)",
  "afib": "Atrial fibrillation", "a-fib": "Atrial fibrillation", "cholesterol": "High cholesterol", "underactive thyroid": "Hypothyroidism",
  "overactive thyroid": "Hyperthyroidism", "sleep apnea": "Obstructive sleep apnoea", "sleep apnoea": "Obstructive sleep apnoea",
  "colon cancer": "Bowel cancer", "colorectal cancer": "Bowel cancer", "anemia": "Anaemia", "leukemia": "Leukaemia",
  "dermatitis": "Atopic dermatitis", "arthritis": "Osteoarthritis", "covid": "COVID-19", "heart disease": "Coronary heart disease",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").trim();

/** The listed name for exactly what someone typed (name or alias), or null if it isn't recognised. */
export function recognise(input: string): string | null {
  const q = norm(input);
  if (!q) return null;
  return CONDITIONS.find((c) => norm(c) === q) ?? ALIASES[q] ?? null;
}

/** Up to `limit` suggestions: names starting with the query first, then names containing it, then alias hits. */
export function searchConditions(input: string, limit = 8): string[] {
  const q = norm(input);
  if (!q) return [];
  const starts = CONDITIONS.filter((c) => norm(c).startsWith(q));
  const contains = CONDITIONS.filter((c) => !norm(c).startsWith(q) && norm(c).includes(q));
  const alias = Object.entries(ALIASES).filter(([k]) => k.startsWith(q)).map(([, v]) => v);
  return [...new Set<string>([...starts, ...contains, ...alias])].slice(0, limit);
}
