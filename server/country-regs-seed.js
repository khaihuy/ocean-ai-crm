// International cosmetic ingredient regulations by country
// { i: inci_name, c: country, s: status, m: max_conc, n: conditions, r: source_ref }
// status: 'allowed' | 'restricted' | 'prohibited' | 'not_approved' | 'pending' | 'not_listed'
// countries: JP=Japan MHLW, KR=Korea MFDS, CN=China NMPA, US=FDA OTC, VN=Vietnam BYT/ASEAN
module.exports = [
  // ── UV FILTERS ──────────────────────────────────────────────────────────────
  // TITANIUM DIOXIDE
  { i:'TITANIUM DIOXIDE', c:'JP', s:'allowed', m:'25%', r:'MHLW Cosmetics Standards' },
  { i:'TITANIUM DIOXIDE', c:'KR', s:'allowed', m:'25%', r:'MFDS Cosmetics Act Annex' },
  { i:'TITANIUM DIOXIDE', c:'CN', s:'allowed', m:'25%', r:'NMPA Cosmetic Ingredient List' },
  { i:'TITANIUM DIOXIDE', c:'US', s:'allowed', m:'25%', n:'FDA OTC sunscreen monograph', r:'21 CFR 352' },
  { i:'TITANIUM DIOXIDE', c:'VN', s:'allowed', m:'25%', r:'Thông tư 06/2011/TT-BYT' },

  // ZINC OXIDE
  { i:'ZINC OXIDE', c:'JP', s:'allowed', m:'20%', r:'MHLW Cosmetics Standards' },
  { i:'ZINC OXIDE', c:'KR', s:'allowed', m:'25%', r:'MFDS Cosmetics Act Annex' },
  { i:'ZINC OXIDE', c:'CN', s:'allowed', m:'25%', r:'NMPA Cosmetic Ingredient List' },
  { i:'ZINC OXIDE', c:'US', s:'allowed', m:'25%', n:'FDA OTC sunscreen monograph', r:'21 CFR 352' },
  { i:'ZINC OXIDE', c:'VN', s:'allowed', m:'25%', r:'Thông tư 06/2011/TT-BYT' },

  // BENZOPHENONE-3 (Oxybenzone)
  { i:'BENZOPHENONE-3', c:'JP', s:'allowed', m:'5%', r:'MHLW Cosmetics Standards' },
  { i:'BENZOPHENONE-3', c:'KR', s:'allowed', m:'5%', n:'Labeling required', r:'MFDS Notice 2020-12' },
  { i:'BENZOPHENONE-3', c:'CN', s:'allowed', m:'10%', r:'NMPA Cosmetic Ingredient List' },
  { i:'BENZOPHENONE-3', c:'US', s:'allowed', m:'6%', n:'FDA OTC; Hawaii banned in reef-safe zones', r:'21 CFR 352' },
  { i:'BENZOPHENONE-3', c:'VN', s:'allowed', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // BENZOPHENONE-4
  { i:'BENZOPHENONE-4', c:'JP', s:'allowed', m:'5%', r:'MHLW Cosmetics Standards' },
  { i:'BENZOPHENONE-4', c:'KR', s:'allowed', m:'5%', r:'MFDS Cosmetics Act Annex' },
  { i:'BENZOPHENONE-4', c:'CN', s:'allowed', m:'10%', r:'NMPA Cosmetic Ingredient List' },
  { i:'BENZOPHENONE-4', c:'US', s:'not_listed', r:'Not in FDA OTC monograph' },
  { i:'BENZOPHENONE-4', c:'VN', s:'allowed', m:'5%', r:'Thông tư 06/2011/TT-BYT' },

  // BENZOPHENONE-5
  { i:'BENZOPHENONE-5', c:'JP', s:'allowed', m:'5%', r:'MHLW Cosmetics Standards' },
  { i:'BENZOPHENONE-5', c:'KR', s:'allowed', m:'5%', r:'MFDS Cosmetics Act Annex' },
  { i:'BENZOPHENONE-5', c:'CN', s:'not_listed', r:'NMPA' },
  { i:'BENZOPHENONE-5', c:'US', s:'not_listed', r:'Not in FDA OTC monograph' },
  { i:'BENZOPHENONE-5', c:'VN', s:'allowed', m:'5%', r:'Thông tư 06/2011/TT-BYT' },

  // BENZOPHENONE-6
  { i:'BENZOPHENONE-6', c:'JP', s:'allowed', m:'10%', r:'MHLW Cosmetics Standards' },
  { i:'BENZOPHENONE-6', c:'KR', s:'not_listed', r:'MFDS' },
  { i:'BENZOPHENONE-6', c:'CN', s:'not_listed', r:'NMPA' },
  { i:'BENZOPHENONE-6', c:'US', s:'not_listed', r:'Not in FDA OTC monograph' },
  { i:'BENZOPHENONE-6', c:'VN', s:'allowed', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // BENZOPHENONE-8
  { i:'BENZOPHENONE-8', c:'JP', s:'allowed', m:'3%', r:'MHLW Cosmetics Standards' },
  { i:'BENZOPHENONE-8', c:'KR', s:'not_listed', r:'MFDS' },
  { i:'BENZOPHENONE-8', c:'CN', s:'not_listed', r:'NMPA' },
  { i:'BENZOPHENONE-8', c:'US', s:'allowed', m:'3%', r:'21 CFR 352' },
  { i:'BENZOPHENONE-8', c:'VN', s:'allowed', m:'3%', r:'Thông tư 06/2011/TT-BYT' },

  // ETHYLHEXYL METHOXYCINNAMATE (Octinoxate)
  { i:'ETHYLHEXYL METHOXYCINNAMATE', c:'JP', s:'allowed', m:'20%', r:'MHLW Cosmetics Standards' },
  { i:'ETHYLHEXYL METHOXYCINNAMATE', c:'KR', s:'allowed', m:'7.5%', r:'MFDS Cosmetics Act Annex' },
  { i:'ETHYLHEXYL METHOXYCINNAMATE', c:'CN', s:'allowed', m:'10%', r:'NMPA Cosmetic Ingredient List' },
  { i:'ETHYLHEXYL METHOXYCINNAMATE', c:'US', s:'pending', m:'7.5%', n:'Awaiting FDA final monograph; currently marketed', r:'FDA Proposed Rule 2019' },
  { i:'ETHYLHEXYL METHOXYCINNAMATE', c:'VN', s:'allowed', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // BUTYL METHOXYDIBENZOYLMETHANE (Avobenzone)
  { i:'BUTYL METHOXYDIBENZOYLMETHANE', c:'JP', s:'not_approved', n:'Not on MHLW approved UV filter list', r:'MHLW Cosmetics Standards' },
  { i:'BUTYL METHOXYDIBENZOYLMETHANE', c:'KR', s:'allowed', m:'8%', r:'MFDS Cosmetics Act Annex' },
  { i:'BUTYL METHOXYDIBENZOYLMETHANE', c:'CN', s:'allowed', m:'5%', r:'NMPA Cosmetic Ingredient List' },
  { i:'BUTYL METHOXYDIBENZOYLMETHANE', c:'US', s:'allowed', m:'3%', n:'FDA OTC approved', r:'21 CFR 352' },
  { i:'BUTYL METHOXYDIBENZOYLMETHANE', c:'VN', s:'allowed', m:'5%', r:'Thông tư 06/2011/TT-BYT' },

  // HOMOSALATE
  { i:'HOMOSALATE', c:'JP', s:'allowed', m:'10%', r:'MHLW Cosmetics Standards' },
  { i:'HOMOSALATE', c:'KR', s:'allowed', m:'5%', r:'MFDS Cosmetics Act Annex' },
  { i:'HOMOSALATE', c:'CN', s:'allowed', m:'10%', r:'NMPA Cosmetic Ingredient List' },
  { i:'HOMOSALATE', c:'US', s:'allowed', m:'15%', n:'Pending FDA final review; endocrine concern', r:'21 CFR 352' },
  { i:'HOMOSALATE', c:'VN', s:'allowed', m:'7.34%', r:'Thông tư 06/2011/TT-BYT' },

  // ETHYLHEXYL SALICYLATE (Octisalate)
  { i:'ETHYLHEXYL SALICYLATE', c:'JP', s:'allowed', m:'5%', r:'MHLW Cosmetics Standards' },
  { i:'ETHYLHEXYL SALICYLATE', c:'KR', s:'allowed', m:'5%', r:'MFDS Cosmetics Act Annex' },
  { i:'ETHYLHEXYL SALICYLATE', c:'CN', s:'allowed', m:'5%', r:'NMPA Cosmetic Ingredient List' },
  { i:'ETHYLHEXYL SALICYLATE', c:'US', s:'allowed', m:'5%', n:'FDA OTC approved', r:'21 CFR 352' },
  { i:'ETHYLHEXYL SALICYLATE', c:'VN', s:'allowed', m:'5%', r:'Thông tư 06/2011/TT-BYT' },

  // ETHYLHEXYL TRIAZONE
  { i:'ETHYLHEXYL TRIAZONE', c:'JP', s:'not_approved', r:'MHLW Cosmetics Standards' },
  { i:'ETHYLHEXYL TRIAZONE', c:'KR', s:'allowed', m:'5%', r:'MFDS Cosmetics Act Annex' },
  { i:'ETHYLHEXYL TRIAZONE', c:'CN', s:'allowed', m:'5%', r:'NMPA Cosmetic Ingredient List' },
  { i:'ETHYLHEXYL TRIAZONE', c:'US', s:'pending', n:'Awaiting FDA review (Time & Extent Application)', r:'FDA TEA' },
  { i:'ETHYLHEXYL TRIAZONE', c:'VN', s:'allowed', m:'5%', r:'Thông tư 06/2011/TT-BYT' },

  // ETHYLHEXYL DIMETHYL PABA
  { i:'ETHYLHEXYL DIMETHYL PABA', c:'JP', s:'allowed', m:'8%', r:'MHLW Cosmetics Standards' },
  { i:'ETHYLHEXYL DIMETHYL PABA', c:'KR', s:'allowed', m:'8%', r:'MFDS Cosmetics Act Annex' },
  { i:'ETHYLHEXYL DIMETHYL PABA', c:'CN', s:'allowed', m:'8%', r:'NMPA Cosmetic Ingredient List' },
  { i:'ETHYLHEXYL DIMETHYL PABA', c:'US', s:'allowed', m:'8%', n:'FDA OTC approved', r:'21 CFR 352' },
  { i:'ETHYLHEXYL DIMETHYL PABA', c:'VN', s:'allowed', m:'8%', r:'Thông tư 06/2011/TT-BYT' },

  // 4-METHYLBENZYLIDENE CAMPHOR
  { i:'4-METHYLBENZYLIDENE CAMPHOR', c:'JP', s:'allowed', m:'4%', r:'MHLW Cosmetics Standards' },
  { i:'4-METHYLBENZYLIDENE CAMPHOR', c:'KR', s:'allowed', m:'4%', r:'MFDS Cosmetics Act Annex' },
  { i:'4-METHYLBENZYLIDENE CAMPHOR', c:'CN', s:'allowed', m:'4%', r:'NMPA Cosmetic Ingredient List' },
  { i:'4-METHYLBENZYLIDENE CAMPHOR', c:'US', s:'pending', n:'Not in current FDA monograph; TEA submitted', r:'FDA TEA' },
  { i:'4-METHYLBENZYLIDENE CAMPHOR', c:'VN', s:'allowed', m:'4%', r:'Thông tư 06/2011/TT-BYT' },

  // PHENYLBENZIMIDAZOLE SULFONIC ACID (Ensulizole)
  { i:'PHENYLBENZIMIDAZOLE SULFONIC ACID', c:'JP', s:'not_approved', r:'MHLW Cosmetics Standards' },
  { i:'PHENYLBENZIMIDAZOLE SULFONIC ACID', c:'KR', s:'allowed', m:'4%', r:'MFDS Cosmetics Act Annex' },
  { i:'PHENYLBENZIMIDAZOLE SULFONIC ACID', c:'CN', s:'allowed', m:'3%', r:'NMPA Cosmetic Ingredient List' },
  { i:'PHENYLBENZIMIDAZOLE SULFONIC ACID', c:'US', s:'allowed', m:'4%', n:'FDA OTC approved', r:'21 CFR 352' },
  { i:'PHENYLBENZIMIDAZOLE SULFONIC ACID', c:'VN', s:'allowed', m:'8%', r:'Thông tư 06/2011/TT-BYT' },

  // CAMPHOR BENZALKONIUM METHOSULFATE
  { i:'CAMPHOR BENZALKONIUM METHOSULFATE', c:'JP', s:'not_approved', r:'MHLW' },
  { i:'CAMPHOR BENZALKONIUM METHOSULFATE', c:'KR', s:'not_listed', r:'MFDS' },
  { i:'CAMPHOR BENZALKONIUM METHOSULFATE', c:'CN', s:'allowed', m:'6%', r:'NMPA' },
  { i:'CAMPHOR BENZALKONIUM METHOSULFATE', c:'US', s:'not_listed', r:'Not in FDA monograph' },
  { i:'CAMPHOR BENZALKONIUM METHOSULFATE', c:'VN', s:'allowed', m:'6%', r:'Thông tư 06/2011/TT-BYT' },

  // TEREPHTHALYLIDENE DICAMPHOR SULFONIC ACID (Mexoryl SX)
  { i:'TEREPHTHALYLIDENE DICAMPHOR SULFONIC ACID', c:'JP', s:'not_approved', r:'MHLW' },
  { i:'TEREPHTHALYLIDENE DICAMPHOR SULFONIC ACID', c:'KR', s:'allowed', m:'10%', r:'MFDS' },
  { i:'TEREPHTHALYLIDENE DICAMPHOR SULFONIC ACID', c:'CN', s:'allowed', m:'10%', r:'NMPA' },
  { i:'TEREPHTHALYLIDENE DICAMPHOR SULFONIC ACID', c:'US', s:'pending', n:'TEA submitted; not yet approved', r:'FDA TEA' },
  { i:'TEREPHTHALYLIDENE DICAMPHOR SULFONIC ACID', c:'VN', s:'allowed', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // DROMETRIZOLE TRISILOXANE (Mexoryl XL)
  { i:'DROMETRIZOLE TRISILOXANE', c:'JP', s:'not_approved', r:'MHLW' },
  { i:'DROMETRIZOLE TRISILOXANE', c:'KR', s:'allowed', m:'15%', r:'MFDS' },
  { i:'DROMETRIZOLE TRISILOXANE', c:'CN', s:'allowed', m:'15%', r:'NMPA' },
  { i:'DROMETRIZOLE TRISILOXANE', c:'US', s:'pending', n:'TEA submitted; not yet approved', r:'FDA TEA' },
  { i:'DROMETRIZOLE TRISILOXANE', c:'VN', s:'allowed', m:'15%', r:'Thông tư 06/2011/TT-BYT' },

  // METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL (Tinosorb M)
  { i:'METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL', c:'JP', s:'not_approved', r:'MHLW' },
  { i:'METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL', c:'KR', s:'allowed', m:'10%', r:'MFDS' },
  { i:'METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL', c:'CN', s:'allowed', m:'10%', r:'NMPA' },
  { i:'METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL', c:'US', s:'pending', n:'TEA submitted; not yet approved', r:'FDA TEA' },
  { i:'METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL', c:'VN', s:'allowed', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE (Tinosorb S)
  { i:'BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE', c:'JP', s:'not_approved', r:'MHLW' },
  { i:'BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE', c:'KR', s:'allowed', m:'10%', r:'MFDS' },
  { i:'BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE', c:'CN', s:'allowed', m:'10%', r:'NMPA' },
  { i:'BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE', c:'US', s:'pending', n:'TEA submitted; not yet approved', r:'FDA TEA' },
  { i:'BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE', c:'VN', s:'allowed', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE (Uvinul A Plus)
  { i:'DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE', c:'JP', s:'not_approved', r:'MHLW' },
  { i:'DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE', c:'KR', s:'allowed', m:'10%', r:'MFDS' },
  { i:'DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE', c:'CN', s:'allowed', m:'10%', r:'NMPA' },
  { i:'DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE', c:'US', s:'pending', n:'TEA submitted; not yet approved', r:'FDA TEA' },
  { i:'DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE', c:'VN', s:'allowed', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // ISCOTRIZINOL (Uvinul T 150)
  { i:'ISCOTRIZINOL', c:'JP', s:'not_approved', r:'MHLW' },
  { i:'ISCOTRIZINOL', c:'KR', s:'allowed', m:'10%', r:'MFDS' },
  { i:'ISCOTRIZINOL', c:'CN', s:'allowed', m:'10%', r:'NMPA' },
  { i:'ISCOTRIZINOL', c:'US', s:'pending', r:'FDA TEA' },
  { i:'ISCOTRIZINOL', c:'VN', s:'allowed', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // TRIS-BIPHENYL TRIAZINE
  { i:'TRIS-BIPHENYL TRIAZINE', c:'JP', s:'not_approved', r:'MHLW' },
  { i:'TRIS-BIPHENYL TRIAZINE', c:'KR', s:'allowed', m:'10%', r:'MFDS' },
  { i:'TRIS-BIPHENYL TRIAZINE', c:'CN', s:'allowed', m:'10%', r:'NMPA' },
  { i:'TRIS-BIPHENYL TRIAZINE', c:'US', s:'pending', r:'FDA TEA' },
  { i:'TRIS-BIPHENYL TRIAZINE', c:'VN', s:'allowed', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // POLYSILICONE-15
  { i:'POLYSILICONE-15', c:'JP', s:'not_approved', r:'MHLW Cosmetics Standards' },
  { i:'POLYSILICONE-15', c:'KR', s:'not_listed', r:'MFDS' },
  { i:'POLYSILICONE-15', c:'CN', s:'not_listed', r:'NMPA' },
  { i:'POLYSILICONE-15', c:'US', s:'pending', r:'FDA TEA' },
  { i:'POLYSILICONE-15', c:'VN', s:'allowed', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // ISOAMYL P-METHOXYCINNAMATE
  { i:'ISOAMYL P-METHOXYCINNAMATE', c:'JP', s:'allowed', m:'10%', r:'MHLW' },
  { i:'ISOAMYL P-METHOXYCINNAMATE', c:'KR', s:'not_listed', r:'MFDS' },
  { i:'ISOAMYL P-METHOXYCINNAMATE', c:'CN', s:'not_listed', r:'NMPA' },
  { i:'ISOAMYL P-METHOXYCINNAMATE', c:'US', s:'not_listed', r:'Not in FDA monograph' },
  { i:'ISOAMYL P-METHOXYCINNAMATE', c:'VN', s:'allowed', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // ── PRESERVATIVES ────────────────────────────────────────────────────────────
  // PHENOXYETHANOL
  { i:'PHENOXYETHANOL', c:'JP', s:'allowed', m:'1%', r:'MHLW Cosmetics Standards' },
  { i:'PHENOXYETHANOL', c:'KR', s:'allowed', m:'1%', r:'MFDS Notice' },
  { i:'PHENOXYETHANOL', c:'CN', s:'allowed', m:'1%', r:'NMPA Cosmetic Ingredient List' },
  { i:'PHENOXYETHANOL', c:'US', s:'allowed', n:'No specific limit; GRAS status', r:'FDA Cosmetics' },
  { i:'PHENOXYETHANOL', c:'VN', s:'allowed', m:'1%', r:'Thông tư 06/2011/TT-BYT' },

  // METHYLPARABEN
  { i:'METHYLPARABEN', c:'JP', s:'allowed', m:'1%', r:'MHLW Cosmetics Standards' },
  { i:'METHYLPARABEN', c:'KR', s:'allowed', m:'0.4% (single) / 0.8% (mixture)', r:'MFDS Notice' },
  { i:'METHYLPARABEN', c:'CN', s:'allowed', m:'1%', r:'NMPA Cosmetic Ingredient List' },
  { i:'METHYLPARABEN', c:'US', s:'allowed', n:'No specific limit in cosmetics', r:'FDA Cosmetics' },
  { i:'METHYLPARABEN', c:'VN', s:'allowed', m:'0.4% (single) / 0.8% (mixture)', r:'Thông tư 06/2011/TT-BYT' },

  // ETHYLPARABEN
  { i:'ETHYLPARABEN', c:'JP', s:'allowed', m:'1%', r:'MHLW' },
  { i:'ETHYLPARABEN', c:'KR', s:'allowed', m:'0.4% (single)', r:'MFDS' },
  { i:'ETHYLPARABEN', c:'CN', s:'allowed', m:'1%', r:'NMPA' },
  { i:'ETHYLPARABEN', c:'US', s:'allowed', n:'No specific limit', r:'FDA' },
  { i:'ETHYLPARABEN', c:'VN', s:'allowed', m:'0.4% (single)', r:'Thông tư 06/2011/TT-BYT' },

  // PROPYLPARABEN
  { i:'PROPYLPARABEN', c:'JP', s:'allowed', m:'0.3%', r:'MHLW' },
  { i:'PROPYLPARABEN', c:'KR', s:'allowed', m:'0.14% (combined with Butylparaben)', r:'MFDS' },
  { i:'PROPYLPARABEN', c:'CN', s:'allowed', m:'0.3%', r:'NMPA' },
  { i:'PROPYLPARABEN', c:'US', s:'allowed', n:'No specific limit', r:'FDA' },
  { i:'PROPYLPARABEN', c:'VN', s:'allowed', m:'0.14%', r:'Thông tư 06/2011/TT-BYT' },

  // BUTYLPARABEN
  { i:'BUTYLPARABEN', c:'JP', s:'allowed', m:'0.3%', r:'MHLW' },
  { i:'BUTYLPARABEN', c:'KR', s:'allowed', m:'0.14% (combined with Propylparaben)', r:'MFDS' },
  { i:'BUTYLPARABEN', c:'CN', s:'not_approved', n:'Not permitted in China cosmetics', r:'NMPA' },
  { i:'BUTYLPARABEN', c:'US', s:'allowed', n:'No specific limit', r:'FDA' },
  { i:'BUTYLPARABEN', c:'VN', s:'allowed', m:'0.14%', r:'Thông tư 06/2011/TT-BYT' },

  // BENZYL ALCOHOL
  { i:'BENZYL ALCOHOL', c:'JP', s:'allowed', n:'Permitted as preservative and solvent', r:'MHLW' },
  { i:'BENZYL ALCOHOL', c:'KR', s:'allowed', m:'1%', r:'MFDS' },
  { i:'BENZYL ALCOHOL', c:'CN', s:'allowed', m:'1%', r:'NMPA' },
  { i:'BENZYL ALCOHOL', c:'US', s:'allowed', n:'GRAS; no specific limit', r:'FDA' },
  { i:'BENZYL ALCOHOL', c:'VN', s:'allowed', m:'1%', r:'Thông tư 06/2011/TT-BYT' },

  // SODIUM BENZOATE / BENZOIC ACID
  { i:'SODIUM BENZOATE', c:'JP', s:'allowed', m:'0.2% (as acid)', r:'MHLW' },
  { i:'SODIUM BENZOATE', c:'KR', s:'allowed', m:'0.5% (as acid)', r:'MFDS' },
  { i:'SODIUM BENZOATE', c:'CN', s:'allowed', m:'0.5%', r:'NMPA' },
  { i:'SODIUM BENZOATE', c:'US', s:'allowed', r:'FDA' },
  { i:'SODIUM BENZOATE', c:'VN', s:'allowed', m:'0.5%', r:'Thông tư 06/2011/TT-BYT' },
  { i:'BENZOIC ACID', c:'JP', s:'allowed', m:'0.2%', r:'MHLW' },
  { i:'BENZOIC ACID', c:'KR', s:'allowed', m:'0.5%', r:'MFDS' },
  { i:'BENZOIC ACID', c:'CN', s:'allowed', m:'0.5%', r:'NMPA' },
  { i:'BENZOIC ACID', c:'US', s:'allowed', r:'FDA' },
  { i:'BENZOIC ACID', c:'VN', s:'allowed', m:'0.5%', r:'Thông tư 06/2011/TT-BYT' },

  // SORBIC ACID / POTASSIUM SORBATE
  { i:'SORBIC ACID', c:'JP', s:'allowed', m:'0.6%', r:'MHLW' },
  { i:'SORBIC ACID', c:'KR', s:'allowed', m:'0.6%', r:'MFDS' },
  { i:'SORBIC ACID', c:'CN', s:'allowed', m:'0.6%', r:'NMPA' },
  { i:'SORBIC ACID', c:'US', s:'allowed', r:'FDA' },
  { i:'SORBIC ACID', c:'VN', s:'allowed', m:'0.6%', r:'Thông tư 06/2011/TT-BYT' },
  { i:'POTASSIUM SORBATE', c:'JP', s:'allowed', m:'0.6% (as sorbic acid)', r:'MHLW' },
  { i:'POTASSIUM SORBATE', c:'KR', s:'allowed', m:'0.6%', r:'MFDS' },
  { i:'POTASSIUM SORBATE', c:'CN', s:'allowed', m:'0.6%', r:'NMPA' },
  { i:'POTASSIUM SORBATE', c:'US', s:'allowed', r:'FDA' },
  { i:'POTASSIUM SORBATE', c:'VN', s:'allowed', m:'0.6%', r:'Thông tư 06/2011/TT-BYT' },

  // DEHYDROACETIC ACID
  { i:'DEHYDROACETIC ACID', c:'JP', s:'allowed', m:'0.5%', r:'MHLW' },
  { i:'DEHYDROACETIC ACID', c:'KR', s:'allowed', m:'0.6%', r:'MFDS' },
  { i:'DEHYDROACETIC ACID', c:'CN', s:'allowed', m:'0.6%', r:'NMPA' },
  { i:'DEHYDROACETIC ACID', c:'US', s:'allowed', r:'FDA' },
  { i:'DEHYDROACETIC ACID', c:'VN', s:'allowed', m:'0.6%', r:'Thông tư 06/2011/TT-BYT' },

  // CHLORPHENESIN
  { i:'CHLORPHENESIN', c:'JP', s:'allowed', m:'0.3%', r:'MHLW' },
  { i:'CHLORPHENESIN', c:'KR', s:'allowed', m:'0.3%', r:'MFDS' },
  { i:'CHLORPHENESIN', c:'CN', s:'allowed', m:'0.3%', r:'NMPA' },
  { i:'CHLORPHENESIN', c:'US', s:'allowed', r:'FDA' },
  { i:'CHLORPHENESIN', c:'VN', s:'allowed', m:'0.3%', r:'Thông tư 06/2011/TT-BYT' },

  // DMDM HYDANTOIN
  { i:'DMDM HYDANTOIN', c:'JP', s:'not_listed', n:'Formaldehyde releasers not commonly used in Japan', r:'MHLW' },
  { i:'DMDM HYDANTOIN', c:'KR', s:'allowed', m:'0.6%', n:'Formaldehyde releaser; labeling required', r:'MFDS' },
  { i:'DMDM HYDANTOIN', c:'CN', s:'allowed', m:'0.2%', r:'NMPA' },
  { i:'DMDM HYDANTOIN', c:'US', s:'allowed', m:'0.6%', r:'FDA' },
  { i:'DMDM HYDANTOIN', c:'VN', s:'allowed', m:'0.6%', r:'Thông tư 06/2011/TT-BYT' },

  // IMIDAZOLIDINYL UREA
  { i:'IMIDAZOLIDINYL UREA', c:'JP', s:'allowed', m:'0.6%', r:'MHLW' },
  { i:'IMIDAZOLIDINYL UREA', c:'KR', s:'allowed', m:'0.6%', r:'MFDS' },
  { i:'IMIDAZOLIDINYL UREA', c:'CN', s:'allowed', m:'0.6%', r:'NMPA' },
  { i:'IMIDAZOLIDINYL UREA', c:'US', s:'allowed', r:'FDA' },
  { i:'IMIDAZOLIDINYL UREA', c:'VN', s:'allowed', m:'0.6%', r:'Thông tư 06/2011/TT-BYT' },

  // DIAZOLIDINYL UREA
  { i:'DIAZOLIDINYL UREA', c:'JP', s:'not_listed', r:'MHLW' },
  { i:'DIAZOLIDINYL UREA', c:'KR', s:'allowed', m:'0.5%', r:'MFDS' },
  { i:'DIAZOLIDINYL UREA', c:'CN', s:'allowed', m:'0.5%', r:'NMPA' },
  { i:'DIAZOLIDINYL UREA', c:'US', s:'allowed', r:'FDA' },
  { i:'DIAZOLIDINYL UREA', c:'VN', s:'allowed', m:'0.5%', r:'Thông tư 06/2011/TT-BYT' },

  // CHLOROXYLENOL (PCMX)
  { i:'CHLOROXYLENOL', c:'JP', s:'allowed', m:'0.3%', r:'MHLW' },
  { i:'CHLOROXYLENOL', c:'KR', s:'allowed', m:'0.5%', r:'MFDS' },
  { i:'CHLOROXYLENOL', c:'CN', s:'allowed', m:'0.5%', r:'NMPA' },
  { i:'CHLOROXYLENOL', c:'US', s:'allowed', r:'FDA' },
  { i:'CHLOROXYLENOL', c:'VN', s:'allowed', m:'0.5%', r:'Thông tư 06/2011/TT-BYT' },

  // CAPRYLYL GLYCOL
  { i:'CAPRYLYL GLYCOL', c:'JP', s:'allowed', r:'MHLW' },
  { i:'CAPRYLYL GLYCOL', c:'KR', s:'allowed', r:'MFDS' },
  { i:'CAPRYLYL GLYCOL', c:'CN', s:'allowed', r:'NMPA IECIC' },
  { i:'CAPRYLYL GLYCOL', c:'US', s:'allowed', r:'FDA' },
  { i:'CAPRYLYL GLYCOL', c:'VN', s:'allowed', r:'Thông tư 06/2011/TT-BYT' },

  // ETHYLHEXYLGLYCERIN
  { i:'ETHYLHEXYLGLYCERIN', c:'JP', s:'allowed', r:'MHLW' },
  { i:'ETHYLHEXYLGLYCERIN', c:'KR', s:'allowed', r:'MFDS' },
  { i:'ETHYLHEXYLGLYCERIN', c:'CN', s:'allowed', r:'NMPA IECIC' },
  { i:'ETHYLHEXYLGLYCERIN', c:'US', s:'allowed', r:'FDA' },
  { i:'ETHYLHEXYLGLYCERIN', c:'VN', s:'allowed', r:'Thông tư 06/2011/TT-BYT' },

  // TRICLOSAN
  { i:'TRICLOSAN', c:'JP', s:'restricted', m:'0.3%', n:'Antibacterial products only', r:'MHLW' },
  { i:'TRICLOSAN', c:'KR', s:'prohibited', n:'Banned in all rinse-off and leave-on products (2017)', r:'MFDS Notice 2017-4' },
  { i:'TRICLOSAN', c:'CN', s:'restricted', m:'0.3%', r:'NMPA' },
  { i:'TRICLOSAN', c:'US', s:'prohibited', n:'Banned in OTC antiseptic wash products (2016)', r:'FDA Rule 2016' },
  { i:'TRICLOSAN', c:'VN', s:'restricted', m:'0.3%', r:'Thông tư 06/2011/TT-BYT' },

  // FORMALDEHYDE
  { i:'FORMALDEHYDE', c:'JP', s:'restricted', m:'0.2%', n:'Must not be detectable in baby products', r:'MHLW' },
  { i:'FORMALDEHYDE', c:'KR', s:'restricted', m:'0.2%', n:'Labeling required; banned in children\'s products', r:'MFDS' },
  { i:'FORMALDEHYDE', c:'CN', s:'restricted', m:'0.2%', r:'NMPA' },
  { i:'FORMALDEHYDE', c:'US', s:'restricted', n:'No federal ban; labeling required >0.1%', r:'FDA' },
  { i:'FORMALDEHYDE', c:'VN', s:'restricted', m:'0.2%', r:'Thông tư 06/2011/TT-BYT' },

  // ── RESTRICTED / ACTIVE INGREDIENTS ──────────────────────────────────────────
  // HYDROQUINONE
  { i:'HYDROQUINONE', c:'JP', s:'restricted', m:'2%', n:'Restricted to OTC whitening products', r:'MHLW' },
  { i:'HYDROQUINONE', c:'KR', s:'prohibited', n:'Banned in cosmetics; prescription drug only', r:'MFDS' },
  { i:'HYDROQUINONE', c:'CN', s:'restricted', m:'0.1%', n:'Not permitted for general cosmetics; limited to professional use', r:'NMPA' },
  { i:'HYDROQUINONE', c:'US', s:'restricted', n:'OTC whitening banned (2020 final rule); Rx only', r:'FDA Final Rule 2020' },
  { i:'HYDROQUINONE', c:'VN', s:'restricted', n:'Prohibited in general cosmetics; prescription only', r:'BYT' },

  // KOJIC ACID
  { i:'KOJIC ACID', c:'JP', s:'allowed', m:'2%', r:'MHLW (whitening agent)' },
  { i:'KOJIC ACID', c:'KR', s:'allowed', m:'2%', r:'MFDS' },
  { i:'KOJIC ACID', c:'CN', s:'allowed', m:'2%', r:'NMPA' },
  { i:'KOJIC ACID', c:'US', s:'allowed', n:'No specific limit in cosmetics', r:'FDA' },
  { i:'KOJIC ACID', c:'VN', s:'allowed', m:'1%', r:'Thông tư 06/2011/TT-BYT' },

  // SALICYLIC ACID
  { i:'SALICYLIC ACID', c:'JP', s:'restricted', m:'2% (skincare) / 3% (shampoo)', r:'MHLW' },
  { i:'SALICYLIC ACID', c:'KR', s:'restricted', m:'2% (leave-on) / 3% (rinse-off)', r:'MFDS' },
  { i:'SALICYLIC ACID', c:'CN', s:'restricted', m:'2%', r:'NMPA' },
  { i:'SALICYLIC ACID', c:'US', s:'allowed', m:'0.5–2%', n:'FDA OTC acne monograph', r:'21 CFR 333' },
  { i:'SALICYLIC ACID', c:'VN', s:'restricted', m:'2%', r:'Thông tư 06/2011/TT-BYT' },

  // RETINOL
  { i:'RETINOL', c:'JP', s:'allowed', n:'No specific limit in cosmetics; MHLW guideline recommended', r:'MHLW' },
  { i:'RETINOL', c:'KR', s:'restricted', m:'2500 IU/g (face)', n:'Restricted concentration', r:'MFDS' },
  { i:'RETINOL', c:'CN', s:'restricted', m:'0.3% (face)', r:'NMPA Notice 2021' },
  { i:'RETINOL', c:'US', s:'allowed', n:'No specific FDA limit; PCPC guideline 0.3% face', r:'FDA / PCPC' },
  { i:'RETINOL', c:'VN', s:'restricted', m:'0.3% (face) / 0.05% (body)', r:'Thông tư 06/2011/TT-BYT' },

  // RETINOIC ACID
  { i:'RETINOIC ACID', c:'JP', s:'not_listed', n:'Not permitted in cosmetics; Rx drug only (Tretinoin)', r:'MHLW' },
  { i:'RETINOIC ACID', c:'KR', s:'prohibited', n:'Banned in cosmetics; prescription drug', r:'MFDS' },
  { i:'RETINOIC ACID', c:'CN', s:'prohibited', n:'Prohibited in cosmetics', r:'NMPA' },
  { i:'RETINOIC ACID', c:'US', s:'not_listed', n:'Prescription drug (Tretinoin); not in cosmetics', r:'FDA' },
  { i:'RETINOIC ACID', c:'VN', s:'prohibited', n:'Cấm trong mỹ phẩm; chỉ dùng theo đơn thuốc', r:'BYT' },

  // GLYCOLIC ACID
  { i:'GLYCOLIC ACID', c:'JP', s:'allowed', n:'No specific limit', r:'MHLW' },
  { i:'GLYCOLIC ACID', c:'KR', s:'restricted', m:'10% (consumer) / higher (professional)', r:'MFDS' },
  { i:'GLYCOLIC ACID', c:'CN', s:'restricted', m:'6%', r:'NMPA' },
  { i:'GLYCOLIC ACID', c:'US', s:'allowed', m:'10% (consumer)', n:'AHA; sunscreen warning required', r:'FDA / PCPC' },
  { i:'GLYCOLIC ACID', c:'VN', s:'restricted', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // LACTIC ACID
  { i:'LACTIC ACID', c:'JP', s:'allowed', r:'MHLW' },
  { i:'LACTIC ACID', c:'KR', s:'restricted', m:'10% (consumer)', r:'MFDS' },
  { i:'LACTIC ACID', c:'CN', s:'allowed', r:'NMPA IECIC' },
  { i:'LACTIC ACID', c:'US', s:'allowed', n:'AHA; sunscreen warning recommended', r:'FDA' },
  { i:'LACTIC ACID', c:'VN', s:'restricted', m:'10%', r:'Thông tư 06/2011/TT-BYT' },

  // ALPHA-ARBUTIN
  { i:'ALPHA-ARBUTIN', c:'JP', s:'allowed', m:'2%', n:'MHLW approved whitening agent', r:'MHLW' },
  { i:'ALPHA-ARBUTIN', c:'KR', s:'allowed', m:'2% (face) / 0.5% (body)', r:'MFDS' },
  { i:'ALPHA-ARBUTIN', c:'CN', s:'allowed', m:'2%', r:'NMPA' },
  { i:'ALPHA-ARBUTIN', c:'US', s:'allowed', n:'No specific limit', r:'FDA' },
  { i:'ALPHA-ARBUTIN', c:'VN', s:'allowed', m:'2%', r:'Thông tư 06/2011/TT-BYT' },

  // ARBUTIN
  { i:'ARBUTIN', c:'JP', s:'allowed', m:'3% (whitening)', r:'MHLW' },
  { i:'ARBUTIN', c:'KR', s:'allowed', m:'7%', r:'MFDS' },
  { i:'ARBUTIN', c:'CN', s:'allowed', m:'7%', r:'NMPA' },
  { i:'ARBUTIN', c:'US', s:'allowed', n:'No specific limit', r:'FDA' },
  { i:'ARBUTIN', c:'VN', s:'allowed', m:'7%', r:'Thông tư 06/2011/TT-BYT' },

  // RESORCINOL
  { i:'RESORCINOL', c:'JP', s:'restricted', m:'0.1%', n:'Hair dye only', r:'MHLW' },
  { i:'RESORCINOL', c:'KR', s:'restricted', m:'0.5%', n:'Oxidative hair dye only', r:'MFDS' },
  { i:'RESORCINOL', c:'CN', s:'restricted', n:'Hair dye only; concentration restricted', r:'NMPA' },
  { i:'RESORCINOL', c:'US', s:'allowed', m:'2%', n:'OTC acne/dandruff use permitted', r:'21 CFR 333' },
  { i:'RESORCINOL', c:'VN', s:'restricted', m:'0.5%', n:'Nhuộm tóc oxi hóa', r:'Thông tư 06/2011/TT-BYT' },

  // ── PROHIBITED SUBSTANCES ────────────────────────────────────────────────────
  // BUTYLPHENYL METHYLPROPIONAL (Lilial)
  { i:'BUTYLPHENYL METHYLPROPIONAL', c:'JP', s:'prohibited', n:'Banned as Reprotoxic Category 1B', r:'MHLW (following EU)' },
  { i:'BUTYLPHENYL METHYLPROPIONAL', c:'KR', s:'prohibited', n:'Banned', r:'MFDS' },
  { i:'BUTYLPHENYL METHYLPROPIONAL', c:'CN', s:'restricted', n:'Under review', r:'NMPA' },
  { i:'BUTYLPHENYL METHYLPROPIONAL', c:'US', s:'allowed', n:'Still permitted in cosmetics; no FDA ban', r:'FDA' },
  { i:'BUTYLPHENYL METHYLPROPIONAL', c:'VN', s:'prohibited', n:'Cấm theo ASEAN Cosmetic Directive', r:'BYT' },

  // HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE (HICC / Lyral)
  { i:'HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE', c:'JP', s:'prohibited', r:'MHLW' },
  { i:'HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE', c:'KR', s:'prohibited', r:'MFDS' },
  { i:'HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE', c:'CN', s:'restricted', n:'Under review', r:'NMPA' },
  { i:'HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE', c:'US', s:'allowed', n:'No FDA ban; RIFM recommends avoidance', r:'FDA / RIFM' },
  { i:'HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE', c:'VN', s:'prohibited', n:'Cấm theo ASEAN Cosmetic Directive', r:'BYT' },

  // RETINOIC ACID already above

  // TRICLOSAN already above
];
