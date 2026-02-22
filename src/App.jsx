/**
 * Montauban Multivers
 * Licence MIT — Collectif du 2 Juillet (C2J) / MGEC Montauban
 * https://mgec-montauban.fr
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  Wallet, Brain, Users, Thermometer, ChevronRight, Eye, RotateCcw, 
  Share2, Lock, HelpCircle, X, Target, BarChart3, Heart, User,
  AlertCircle, Clock, Coins
} from 'lucide-react';

// ==================== CONFIGURATION SUPABASE ====================


// ==================== SYSTÈME DE CONDITIONS ====================

const checkConditions = (choice, stats, flags, crossFlags = {}, conseilFlags = {}) => {
  const conditions = choice.conditions || {};
  const reasons = [];

  // Vérifier stat minimum (FIX: supporte plusieurs stats dans un seul objet)
  if (conditions.requiresMinStat) {
    for (const [stat, min] of Object.entries(conditions.requiresMinStat)) {
      if (stats[stat] < min) {
        reasons.push({ 
          type: 'stat_low', 
          stat, 
          required: min, 
          current: stats[stat],
          icon: stat === 'resources' ? Coins : stat === 'moral' ? Brain : stat === 'links' ? Users : Thermometer
        });
      }
    }
  }

  // Vérifier stat maximum (pour choix "désespérés")
  if (conditions.requiresMaxStat) {
    for (const [stat, max] of Object.entries(conditions.requiresMaxStat)) {
      if (stats[stat] > max) {
        reasons.push({ 
          type: 'stat_high', 
          stat, 
          required: max, 
          current: stats[stat],
          icon: AlertCircle
        });
      }
    }
  }

  // Vérifier flag requis
  if (conditions.requiresFlag && !flags[conditions.requiresFlag]) {
    reasons.push({ 
      type: 'missing_flag', 
      flag: conditions.requiresFlag,
      icon: Lock
    });
  }

  // Vérifier flag bloquant
  if (conditions.blockedByFlag && flags[conditions.blockedByFlag]) {
    reasons.push({ 
      type: 'blocked_flag', 
      flag: conditions.blockedByFlag,
      icon: X
    });
  }

  // Vérifier flag cross-personnage
  if (conditions.requiresCrossFlag) {
    for (const [character, flag] of Object.entries(conditions.requiresCrossFlag)) {
      if (!crossFlags[`${character}_${flag}`]) {
        reasons.push({ 
          type: 'cross_flag', 
          character, 
          flag,
          icon: Users
        });
      }
    }
  }

  // Vérifier flag Conseil requis (décision municipale prise avant de jouer)
  if (conditions.requiresConseilFlag && !conseilFlags[conditions.requiresConseilFlag]) {
    reasons.push({
      type: 'conseil_flag',
      flag: conditions.requiresConseilFlag,
      icon: Lock
    });
  }

  // Vérifier flag Conseil bloquant (choix impossible si la mairie a pris cette décision)
  if (conditions.blockedByConseilFlag && conseilFlags[conditions.blockedByConseilFlag]) {
    reasons.push({
      type: 'conseil_blocked',
      flag: conditions.blockedByConseilFlag,
      icon: X
    });
  }

  return {
    available: reasons.length === 0,
    reasons
  };
};

const getBlockedText = (choice, reasons) => {
  if (choice.blockedText) return choice.blockedText;
  
  const reason = reasons[0];
  if (!reason) return "Cette option n'est pas disponible.";

  switch (reason.type) {
    case 'stat_low':
      if (reason.stat === 'moral') return "Tu n'as pas l'énergie pour ça. Pas maintenant.";
      if (reason.stat === 'resources') return "Tu n'as pas les moyens. Pas ce mois-ci.";
      if (reason.stat === 'links') return "Tu ne connais personne qui pourrait t'aider.";
      if (reason.stat === 'comfort') return "Ton corps ne suivrait pas.";
      break;
    case 'stat_high':
      return "Tu n'en es pas encore là.";
    case 'missing_flag':
      return "Tu n'as pas rencontré les bonnes personnes.";
    case 'blocked_flag':
      return "Cette porte s'est fermée.";
    case 'cross_flag':
      return "Quelqu'un d'autre aurait dû agir pour que ça existe.";
    default:
      return "Cette option n'est pas disponible.";
  }
};

// ==================== PALETTES PAR MONDE (subtile) ====================
// ==================== PARTAGE & SYNTHÈSE ====================

const GAME_URL = 'https://montauban-multivers.vercel.app';

const DOMAIN_LABELS_SHARE = {
  transports: 'Se déplacer',
  travail: 'Travailler',
  sante: 'Se soigner',
  education: 'Apprendre',
  alimentation: 'Manger',
  logement: 'Se loger',
  securite: 'Sécurité',
  climat: 'Environnement',
  liens: 'Liens sociaux',
  citoyennete: 'Participer',
  droits: 'Droits',
};

const STAT_EMOJI = {
  resources: '💰',
  moral: '🧠',
  links: '🤝',
  comfort: '🌡️',
};

/**
 * Génère un texte de synthèse personnalisé selon le parcours du joueur.
 * Conçu pour être lisible seul, sans le jeu sous les yeux.
 */
const generateShareText = ({ character, stats, history, survived }) => {
  if (!character || !history.length) return '';

  const finalStats = stats;
  const totalMean = Math.round(
    (finalStats.resources + finalStats.moral + finalStats.links + finalStats.comfort) / 4
  );

  // Résumé de survie
  const survivalLine = survived
    ? `J'ai survécu ma semaine à Montauban en jouant ${character.name} (${character.age} ans, ${character.role}).`
    : `Je n'ai pas survécu ma semaine à Montauban en jouant ${character.name}.`;

  // 2-3 choix marquants (ceux qui font bouger les stats le plus ou les flags narratifs)
  const worldAChoices = history.filter(h => h.world === 'A').slice(0, 2);
  const worldBChoices = history.filter(h => h.world === 'B').slice(0, 2);

  const choicesLines = [];
  if (worldAChoices.length) {
    choicesLines.push(`Dans la Ville A (${DOMAIN_LABELS_SHARE[worldAChoices[0].domain] || worldAChoices[0].domain}) : "${worldAChoices[0].choiceLabel}"`);
  }
  if (worldBChoices.length) {
    choicesLines.push(`Dans la Ville B (${DOMAIN_LABELS_SHARE[worldBChoices[0].domain] || worldBChoices[0].domain}) : "${worldBChoices[0].choiceLabel}"`);
  }

  // Stat la plus basse = tension principale
  const minStatKey = Object.entries(finalStats).sort((a, b) => a[1] - b[1])[0][0];
  const minStatName = { resources: 'les ressources', moral: 'le moral', links: 'les liens', comfort: 'le confort' }[minStatKey];
  const tensionLine = survived
    ? `C'est ${minStatName} qui m'a le plus coûté.`
    : `C'est ${minStatName} qui a tout fait basculer.`;

  const fullText = [
    survivalLine,
    '',
    choicesLines.join('\n'),
    '',
    tensionLine,
    '',
    `Les mêmes besoins. Deux villes différentes. Les règles changent tout.`,
    '',
    `▶ Joue ta semaine : ${GAME_URL}`,
    `#MontaubanMultivers #MGEC`,
  ].join('\n');

  return fullText;
};

/**
 * Lance le partage natif (mobile) ou ouvre le modal (desktop).
 */
const shareContent = async ({ text, onFallback }) => {
  // Web Share API — fonctionne sur mobile Chrome/Safari/Android
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Montauban Multivers — ma semaine',
        text,
        url: GAME_URL,
      });
      return;
    } catch (e) {
      // Annulé par l'utilisateur ou non supporté → fallback
    }
  }
  onFallback();
};

const encodeShare = (text) => encodeURIComponent(text);

const SHARE_PLATFORMS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: 'bg-green-600 hover:bg-green-500',
    icon: '💬',
    getUrl: (text) => `https://wa.me/?text=${encodeShare(text)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    color: 'bg-blue-700 hover:bg-blue-600',
    icon: 'f',
    getUrl: (text) => `https://www.facebook.com/sharer/sharer.php?u=${encodeShare(GAME_URL)}&quote=${encodeShare(text)}`,
  },
  {
    id: 'x',
    label: 'X / Twitter',
    color: 'bg-black hover:bg-white/10 border border-white/20',
    icon: '𝕏',
    getUrl: (text) => `https://twitter.com/intent/tweet?text=${encodeShare(text)}`,
  },
  {
    id: 'email',
    label: 'Email',
    color: 'bg-white/10 hover:bg-white/20 border border-white/20',
    icon: '✉',
    getUrl: (text) => `mailto:?subject=Joue%20ta%20semaine%20%C3%A0%20Montauban&body=${encodeShare(text)}`,
  },
];

// ==================== MÉMOIRE NARRATIVE ====================
// Lignes contextuelles injectées au début d'une scène si un flag est actif.
// Format : { flag, text, notFlag? }
// Affichées en italique, avant le contexte principal — elles montrent que
// le personnage SE SOUVIENT de ce qui s'est passé avant.

const MEMORY_LINES = {
  // ── MAMADOU ──────────────────────────────────────────────────────────
  mamadou_s2: [
    {
      flag: 'mamadou_verbalise',
      text: "Tu connais déjà ce bruit. Les portières. La semaine dernière aussi. 90 euros d'amende. Tu les as encore dans la tête.",
    },
    {
      flag: 'mamadou_metRachid',
      text: "Tu penses à Rachid. Il t'avait dit qu'il avait arrêté Deliveroo à cause de ça, entre autres. « À un moment, ça use. »",
    },
  ],
  mamadou_s3: [
    {
      flag: 'mamadou_metRachid',
      text: "Rachid t'avait parlé de ce dispositif. « Formation payée, six mois. » Tu n'avais pas retenu le nom. Mais l'idée.",
    },
    {
      flag: 'mamadou_resiste',
      text: "Tu as les épaules lourdes depuis hier. Le contrôle. Les deux heures contre le mur. Gérard qui t'attendait en bas.",
    },
    {
      flag: 'mamadou_filme',
      text: "Ta vidéo tourne encore. 2000 vues. Un avocat a écrit. Un collectif aussi. Tu n'as pas encore répondu à personne.",
    },
  ],
  mamadou_s4: [
    {
      flag: 'mamadou_resiste',
      text: "Ton corps garde la trace d'hier. Tu es resté debout contre un mur pendant deux heures.",
    },
    {
      flag: 'mamadou_avertissement',
      text: "Deuxième avertissement. Tu penses à ça en pédalant. Combien il en faut pour être suspendu ?",
    },
  ],
  mamadou_s5: [
    {
      flag: 'mamadou_formation',
      text: "L'agent de la Maison de l'Emploi avait mentionné la Carte Commune en passant. « Y'a aussi ça, si vous êtes dans les critères. » Tu n'avais pas bien écouté.",
    },
    {
      flag: 'mamadou_malaise',
      text: "Ton corps dit quelque chose depuis jeudi. Tu fais attention à ne pas passer le cap où les genoux lâchent.",
    },
  ],
  mamadou_s6: [
    {
      flag: 'mamadou_malaise',
      text: "Depuis jeudi, tu fais moins de kilomètres. Le corps décide parfois à ta place.",
    },
    {
      flag: 'mamadou_carteCommune',
      text: "Philippe t'avait dit que Rachid pouvait t'expliquer les paniers partagés. Tu as le numéro quelque part.",
    },
  ],
  mamadou_s7: [
    {
      flag: 'mamadou_formation',
      text: "Tu sais que des trucs existent. La Maison de l'Emploi. Les dispositifs. C'est la première fois que tu sais ça.",
    },
    {
      flag: 'mamadou_carteCommune',
      text: "Philippe t'avait dit que Rachid organisait des trucs dans le quartier. Des assemblées. Ce genre de choses.",
    },
    {
      flag: 'mamadou_resiste',
      text: "Tu as pris la parole face aux flics. Tu t'en souviens encore. C'était inconfortable. Mais c'était ta voix.",
    },
  ],

  // ── INÈS ─────────────────────────────────────────────────────────────
  ines_s2: [
    {
      flag: 'ines_surmenage',
      text: "Trois nuits à plus de douze heures. Ton dos le dit depuis ce matin. Le corps comptabilise ce que tu refuses de compter.",
    },
    {
      flag: 'ines_participe',
      text: "Tu pensais à l'équipe en venant. À Fatima. À ce que ça ferait de ne pas aller travailler malade.",
    },
  ],
  ines_s4: [
    {
      flag: 'ines_urgences',
      text: "Tu as perdu quatre heures aux urgences la semaine dernière. Pour toi. Pas pour un patient. Pour ton dos. La honte que tu ressentais d'occuper une place.",
    },
    {
      flag: 'ines_kine',
      text: "Le kiné avait dit « repos complet » trois fois. Tu t'en souviens parce que personne ne te soigne jamais, toi.",
    },
    {
      flag: 'ines_centreSante',
      text: "La Dr. Benali t'avait regardée différemment. Pas comme un numéro de sécurité sociale. Comme quelqu'un.",
    },
  ],
  ines_s5: [
    {
      flag: 'ines_yanis',
      text: "Yanis. Sa photo est dans ton casier depuis mardi. Un patient qui t'a donné quelque chose — et toi qui lui as donné quelque chose aussi.",
    },
    {
      flag: 'ines_accepte',
      text: "Tu as dit oui aux double gardes. Ça remonte à la semaine dernière. La fatigue, elle, ne remonte pas — elle s'accumule.",
    },
  ],
  ines_s6: [
    {
      flag: 'ines_liaison',
      text: "Fatima sait. Tu le vois dans la façon qu'elle a de ne pas regarder Marc quand tu entres dans la pièce.",
    },
    {
      flag: 'ines_surmenage',
      text: "Ton corps a gardé quelque chose de toutes ces semaines trop longues. Une vigilance permanente. Comme si dormir, c'était risqué.",
    },
  ],
  ines_s7: [
    {
      flag: 'ines_courrier',
      text: "Ta lettre circule. Dans les casiers. Dans les couloirs. Tu ne sais pas qui l'a lue. Mais elle est là, quelque part, avec ton nom dessus.",
    },
    {
      flag: 'ines_courrier_anonyme',
      text: "Ta lettre circule. Sans nom. Tu ne sais pas si c'est du courage ou de la lâcheté. Peut-être les deux.",
    },
    {
      flag: 'ines_centreSante',
      text: "La Dr. Benali t'avait dit qu'elle avait « des contacts au collectif soignant ». Tu n'avais pas compris sur le moment.",
    },
  ],

  // ── CLÉMENT ──────────────────────────────────────────────────────────
  clement_s2: [
    {
      flag: 'clement_voiture',
      text: "Sophie n'a pas dit au revoir ce matin. Pas de dispute. Juste rien. Tu sais ce que ça veut dire.",
    },
    {
      flag: 'clement_visio',
      text: "Ton chef a été clair au téléphone : « Le présentiel, c'est politique. » Tu penses encore à ça dans le TER.",
    },
  ],
  clement_s3: [
    {
      flag: 'clement_prive',
      text: "Émile en privé. C'est dit. C'est signé. Tu attends de voir ce que ça va changer dans le regard de Sophie.",
    },
    {
      flag: 'clement_public',
      text: "Tu as choisi le public. Et tu t'y tiens. Mais la réunion de ce soir teste ce choix.",
    },
  ],
  clement_s4: [
    {
      flag: 'clement_comite',
      text: "Le comité de parents. Tu t'es battu. Tu as eu l'impression de perdre. Mais trois autres parents t'ont remercié dans le couloir.",
    },
    {
      flag: 'clement_ecole',
      text: "Émile comprend mieux depuis la rencontre avec l'enseignant. Ou tu veux y croire. Les deux, peut-être.",
    },
  ],
  clement_s5: [
    {
      flag: 'clement_depart',
      text: "La démission est dans ta poche intérieure. Pas encore remise. Elle attend.",
    },
    {
      flag: 'clement_negocie',
      text: "Tu as négocié ton reclassement. Six mois de transition. Tu ne sais pas encore si c'est de la sagesse ou de la résignation.",
    },
  ],
  clement_s6: [
    {
      flag: 'clement_renove',
      text: "Ta maison est chaude maintenant. Pour la première fois en dix ans, il ne fait pas froid dans le salon en décembre.",
    },
    {
      flag: 'clement_collectif',
      text: "Jean-Marc te serre la main différemment depuis les travaux groupés. Vous avez fait quelque chose ensemble. Ça laisse une trace.",
    },
  ],

  // ── FRANÇOISE ────────────────────────────────────────────────────────
  francoise_s2: [
    {
      flag: 'francoise_maryse',
      text: "Maryse t'a envoyé un SMS hier soir. Juste : « Merci. » Deux mots. Tu les as relus trois fois.",
    },
    {
      flag: 'francoise_centreSocial',
      text: "La dame du centre social t'a dit que d'autres habitaient la même situation. Ça t'a soulagée d'une façon que tu n'expliques pas.",
    },
  ],
  francoise_s4: [
    {
      flag: 'francoise_corrige',
      text: "Tu as corrigé l'agent. Il était dans l'erreur. Il a reconnu. Ça t'a surprise toi-même.",
    },
    {
      flag: 'francoise_dossier',
      text: "Le dossier est là, sur la table. Tu l'as relu deux fois. Tu commences à connaître tes droits par cœur.",
    },
  ],
  francoise_s6: [
    {
      flag: 'francoise_leila',
      text: "Leïla t'a dit merci la semaine dernière. Pas pour une raison précise. Juste merci. Tu ne savais pas quoi répondre.",
    },
    {
      flag: 'francoise_temoignage',
      text: "Ton témoignage est dans la brochure du collectif. Une demi-page. Ton prénom, ton âge, ta situation. Imprimé, noir sur blanc.",
    },
  ],

  // ── PHILIPPE ─────────────────────────────────────────────────────────
  philippe_s2: [
    {
      flag: 'philippe_negocie',
      text: "La coopérative n'était pas d'accord sur le prix. Tu as tenu. Ça t'a coûté une relation. Tu ne sais pas encore si ça valait.",
    },
    {
      flag: 'philippe_partage',
      text: "Gérard a la même situation que toi. Vous en avez parlé sur le marché samedi. Ça soulage de savoir qu'on n'est pas seul.",
    },
  ],
  philippe_s4: [
    {
      flag: 'philippe_collectifEau',
      text: "Le collectif eau, c'est une réunion par mois. Tu vas y aller. Ou pas. Tu n'as pas décidé.",
    },
    {
      flag: 'philippe_tarifProducteur',
      text: "Le tarif a changé. C'est dans le contrat maintenant. Pour la première fois depuis trente ans, tu sais ce que tu vas gagner en juin.",
    },
  ],
  philippe_s6: [
    {
      flag: 'philippe_convention',
      text: "Les cantines scolaires reçoivent tes légumes depuis septembre. Ce matin, ton fils t'a envoyé une photo d'un enfant qui mange une de tes tomates. Il avait l'air content.",
    },
    {
      flag: 'philippe_declare',
      text: "Tu es déclaré maintenant. Ça a l'air simple dit comme ça. Ça ne l'était pas.",
    },
  ],

  // ── LÉO ──────────────────────────────────────────────────────────────
  leo_s2: [
    {
      flag: 'leo_motion',
      text: "La motion est passée. Tout le monde s'en fout encore. Mais elle est passée.",
    },
    {
      flag: 'leo_cynique',
      text: "Tu avais dit à Mathieu que c'était des conneries. Il t'a regardé d'une façon que tu n'oublies pas.",
    },
  ],
  leo_s4: [
    {
      flag: 'leo_budgetParticipatif',
      text: "Le budget participatif. Vous avez voté pour. Ça va peut-être aboutir. Ou pas. Mais vous avez voté.",
    },
    {
      flag: 'leo_passJeunes',
      text: "Le pass jeunes, tu l'as eu. 50 euros par mois pour des activités. Tu ne sais toujours pas trop quoi en faire.",
    },
  ],
  leo_s6: [
    {
      flag: 'leo_travaille',
      text: "Tu travailles maintenant. Deux jours par semaine. Ce n'est pas beaucoup. Mais tu sais ce que c'est, maintenant.",
    },
    {
      flag: 'leo_citoyenne',
      text: "L'assemblée citoyenne. Tu t'y es inscrit. Ou tu as essayé. Quelqu'un d'autre a parlé mieux que toi. Mais tu étais là.",
    },
  ],

  // ── NADIA ────────────────────────────────────────────────────────────
  nadia_s2: [
    {
      flag: 'nadia_quotient',
      text: "126 euros remboursés par la CAF. Tu les as reçus jeudi. 500 euros sur un an à cause d'une case pas cochée. Tu continues à y penser.",
    },
    {
      flag: 'nadia_cantine',
      text: "La cantine. Tu continues à payer. Sofiane mange là-bas. C'est une chose de moins à gérer le matin.",
    },
  ],
  nadia_s4: [
    {
      flag: 'nadia_recommande',
      text: "Le courrier recommandé. Tu l'as gardé, la preuve. Le proprio sait maintenant que tu sais.",
    },
    {
      flag: 'nadia_logement',
      text: "L'appartement de Villebourbon. 480 euros charges comprises. Tu as encore le papier dans le sac.",
    },
  ],
  nadia_s6: [
    {
      flag: 'nadia_creche',
      text: "La crèche. Yanis y va maintenant. Ces deux heures par jour, tu ne savais pas qu'elles pouvaient changer autant de choses.",
    },
    {
      flag: 'nadia_bouvier',
      text: "Mme Bouvier t'a rendu un service la semaine dernière. Le kimono de son petit-fils pour Yanis. Ce genre de gestes, tu ne les oublies pas.",
    },
  ],
};

// ==================== FINS MULTIPLES ====================
// Calculée à la fin de la partie selon la combinaison de flags.
// Affichée dans l'écran de récapitulatif, après la comparaison des villes.

const ENDING_PROFILES = {
  mamadou: [
    {
      id: 'transformation',
      condition: (flags) =>
        (flags.mamadou_assemblee || flags.mamadou_observateur) &&
        (flags.mamadou_formation || flags.mamadou_metRachid),
      titre: 'Une trajectoire qui bascule',
      texte: `Tu es livreur à vélo. Tu le seras peut-être encore demain. Mais quelque chose s'est déplacé cette semaine.

Tu as rencontré des gens. Tu as pris la parole, ou tu l'as entendue. Tu as vu que des alternatives existaient — pas parfaites, pas garanties, mais réelles.

La semaine prochaine, tu appelleras peut-être Rachid. Ou tu iras à la prochaine assemblée. Ou tu ne feras rien de tout ça. Mais tu sais maintenant que des choses sont possibles. Et ça, on ne peut pas te le reprendre.`,
      couleur: 'border-emerald-400/30 bg-emerald-950/10',
      label: 'text-emerald-400',
    },
    {
      id: 'ancrage',
      condition: (flags) =>
        (flags.mamadou_metRachid || flags.mamadou_carteCommune || flags.mamadou_formation) &&
        !flags.mamadou_assemblee,
      titre: 'Un filet commence à se tisser',
      texte: `Tu as rencontré des gens cette semaine. Ou utilisé des dispositifs que tu ne connaissais pas. Quelque chose a commencé.

Ce n'est pas une révolution. C'est un numéro dans ton téléphone. Un crédit utilisé. Une porte entrouverte.

Pour quelqu'un qui tient depuis des mois à bout de bras, c'est déjà beaucoup.`,
      couleur: 'border-amber-400/20 bg-amber-950/10',
      label: 'text-amber-400',
    },
    {
      id: 'survie',
      condition: () => true, // fallback
      titre: 'Tu as tenu',
      texte: `Tu as tenu. La semaine est finie. Tu es encore debout.

Personne ne sait vraiment ce que ça coûte. Les kilomètres. Les calculs dans ta tête. Les choix impossibles.

Tu as tenu seul. Dans une ville qui ne t'a pas facilité la tâche. La semaine prochaine recommence. Tu tiendras encore.`,
      couleur: 'border-white/10 bg-white/5',
      label: 'text-white/50',
    },
  ],

  ines: [
    {
      id: 'parole',
      condition: (flags) => flags.ines_parole || (flags.ines_pool && flags.ines_liaison),
      titre: 'La parole comme outil',
      texte: `Tu as pris la parole. Dans une salle de réunion. Avec des gens qui avaient plus de grades que toi.

Et quelque chose a changé. Pas le système — pas encore. Mais l'idée que ta voix compte dans la pièce.

Aide-soignante depuis onze ans, tu savais soigner. Tu apprends maintenant à revendiquer. Ce n'est pas la même chose. Et c'est important que ce ne soit pas la même chose.`,
      couleur: 'border-emerald-400/30 bg-emerald-950/10',
      label: 'text-emerald-400',
    },
    {
      id: 'solidarite',
      condition: (flags) => flags.ines_pool || flags.ines_centreSante || flags.ines_participe,
      titre: 'Tenir ensemble',
      texte: `Tu as découvert cette semaine que tenir à plusieurs, c'est tenir autrement.

Le collectif. Le centre de santé. Fatima. Yanis. Tous ces fils. Ils ne résolvent pas tout. Mais ils changent la texture de la fatigue.

Tu es toujours épuisée. Mais tu n'es plus seule dans cet épuisement. C'est une différence réelle.`,
      couleur: 'border-amber-400/20 bg-amber-950/10',
      label: 'text-amber-400',
    },
    {
      id: 'epuisement',
      condition: () => true,
      titre: 'Le prix du silence',
      texte: `Tu as tenu. Comme toujours. En absorbant. En ne disant rien.

Le système fonctionne parce que des gens comme toi continuent à faire tourner la machine sans jamais demander qu'on répare la machine.

Tu méritais mieux cette semaine. Et la semaine prochaine aussi.`,
      couleur: 'border-white/10 bg-white/5',
      label: 'text-white/50',
    },
  ],

  clement: [
    {
      id: 'bifurcation',
      condition: (flags) =>
        (flags.clement_depart || flags.clement_negocie) &&
        (flags.clement_collectif || flags.clement_public),
      titre: 'Quelque chose bifurque',
      texte: `Tu as passé des années à optimiser. Ta carrière. Tes trajets. Ton image au COPIL.

Cette semaine, tu as fait autre chose. Un voisin. Un choix d'école. Une conversation avec Sophie qui n'était pas une dispute.

Tu ne sais pas encore vers quoi ça bifurque. Mais ça bifurque. Et tu sens que c'est bien.`,
      couleur: 'border-emerald-400/30 bg-emerald-950/10',
      label: 'text-emerald-400',
    },
    {
      id: 'questionnement',
      condition: (flags) => flags.clement_visio || flags.clement_public || flags.clement_renove,
      titre: 'La vie qu\'on s\'était promis',
      texte: `Tu t'étais promis quelque chose. Le TER. L'école publique. La maison rénovée. Le deal avec Sophie.

Cette semaine, tu as tenu certaines promesses. Pas toutes. La vie fait ça — elle effiloche les idéaux sans qu'on le remarque.

Mais tu t'en souviens, toi. Du deal original. Et ça compte.`,
      couleur: 'border-amber-400/20 bg-amber-950/10',
      label: 'text-amber-400',
    },
    {
      id: 'adaptation',
      condition: () => true,
      titre: 'S\'adapter, encore',
      texte: `Tu t'es adapté. Encore. C'est pour ça qu'on te paie bien — ta capacité à absorber, à recalibrer, à tenir dans des systèmes qui ne sont pas faits pour toi.

Tu es très bon à ça.

La question que tu ne te poses pas encore : à quoi est-ce que tu t'adaptes, exactement ?`,
      couleur: 'border-white/10 bg-white/5',
      label: 'text-white/50',
    },
  ],

  nadia: [
    {
      id: 'droits',
      condition: (flags) =>
        (flags.nadia_quotient || flags.nadia_recommande) && flags.nadia_logement,
      titre: 'Apprendre ses droits',
      texte: `Tu ne savais pas que tu avais autant de droits. Ou tu le savais vaguement — mais les droits qu'on n'utilise pas, c'est comme les droits qu'on n'a pas.

Cette semaine, tu en as utilisé quelques-uns. La CAF. Le courrier recommandé. Le dossier logement. Des papiers, des cases, des démarches.

Pas glamour. Mais chaque case cochée, c'est quelque chose que personne ne peut plus t'enlever.`,
      couleur: 'border-emerald-400/30 bg-emerald-950/10',
      label: 'text-emerald-400',
    },
    {
      id: 'respiration',
      condition: (flags) => flags.nadia_loisirs || flags.nadia_creche || flags.nadia_basket,
      titre: 'Un peu d\'air',
      texte: `Tu as eu du temps cette semaine. Pas beaucoup. Quelques heures, peut-être.

Mais tu as lu. Ou tu t'es assise. Ou tu as regardé Yanis tomber et se relever au judo.

Ce n'est pas du luxe. C'est du respirable. Et tu t'en souviens parce que ça manquait depuis si longtemps.`,
      couleur: 'border-amber-400/20 bg-amber-950/10',
      label: 'text-amber-400',
    },
    {
      id: 'gestion',
      condition: () => true,
      titre: 'La grande compétence invisible',
      texte: `Tu gères. C'est un mot qui ne pèse pas ce qu'il devrait peser.

Gérer deux enfants. Gérer un budget au centime. Gérer un propriétaire qui ne répond pas. Gérer la cantine, la CAF, les dossiers.

Le monde tourne grâce à des gens comme toi qui gèrent en silence. C'est une compétence immense. Et elle est totalement invisible.`,
      couleur: 'border-white/10 bg-white/5',
      label: 'text-white/50',
    },
  ],

  francoise: [
    {
      id: 'engagement',
      condition: (flags) => flags.francoise_temoignage || (flags.francoise_dossier && flags.francoise_leila),
      titre: 'De la colère à l\'action',
      texte: `Tu avais de la colère en entrant dans cette semaine. Elle était là depuis des années.

Elle n'a pas disparu. Mais elle a trouvé une forme. Un dossier. Un témoignage. Un prénom dans une brochure.

Tu ne savais pas que tu pouvais faire ça. Maintenant tu sais.`,
      couleur: 'border-emerald-400/30 bg-emerald-950/10',
      label: 'text-emerald-400',
    },
    {
      id: 'resilience',
      condition: (flags) => flags.francoise_maryse || flags.francoise_centreSocial,
      titre: 'Les liens qui tiennent',
      texte: `Cette semaine a montré que tu n'es pas seule. Maryse. Le centre social. Leïla.

Le réseau ne s'est pas construit tout seul. Tu l'as construit. Peut-être sans le savoir.

Ces liens ne règlent pas tout. Mais ils empêchent de tomber seule.`,
      couleur: 'border-amber-400/20 bg-amber-950/10',
      label: 'text-amber-400',
    },
    {
      id: 'endurance',
      condition: () => true,
      titre: 'Soixante ans et toujours debout',
      texte: `Tu as 61 ans. Tu te bats depuis des années contre des systèmes qui ne t'ont pas attendue.

Tu es toujours debout. Ce n'est pas rien.

Ce n'est pas suffisant non plus. Mais c'est là.`,
      couleur: 'border-white/10 bg-white/5',
      label: 'text-white/50',
    },
  ],

  philippe: [
    {
      id: 'transmission',
      condition: (flags) => flags.philippe_convention && flags.philippe_repreneur,
      titre: 'Transmettre quelque chose de vivant',
      texte: `Tu as un repreneur. Et un contrat avec les cantines. C'est rare — une ferme qui se transmet avec ses débouchés, ses réseaux, sa place dans le territoire.

Tu n'as pas vendu. Tu as transmis. Il y a une différence.`,
      couleur: 'border-emerald-400/30 bg-emerald-950/10',
      label: 'text-emerald-400',
    },
    {
      id: 'ancrage',
      condition: (flags) => flags.philippe_convention || flags.philippe_groupement,
      titre: 'La terre comme projet politique',
      texte: `Tu fais pousser des légumes depuis trente ans. Cette semaine, tu as compris que c'est aussi un acte politique.

Ce que tu cultives nourrit des enfants à la cantine. À 30 kilomètres. Dans des assiettes que tu ne vois pas.

C'est une chaîne. Et tu en es un maillon essentiel.`,
      couleur: 'border-amber-400/20 bg-amber-950/10',
      label: 'text-amber-400',
    },
    {
      id: 'resistance',
      condition: () => true,
      titre: 'Résister, c\'est aussi rester',
      texte: `Rester paysan en 2024 à Montauban, c'est résister. Pas de manière spectaculaire. Juste en continuant.

Tu te lèves à 5h. Tu vendras tes légumes samedi. Et dimanche, tu recommences.

C'est une forme de ténacité que peu de gens comprennent vraiment.`,
      couleur: 'border-white/10 bg-white/5',
      label: 'text-white/50',
    },
  ],

  leo: [
    {
      id: 'engagement',
      condition: (flags) => flags.leo_inscrit || (flags.leo_citoyenne && flags.leo_budgetParticipatif),
      titre: 'Décider de compter',
      texte: `Tu avais 18 ans au début de la semaine. Tu en as toujours 18.

Mais tu t'es inscrit. Ou tu as voté. Ou tu as levé la main dans une assemblée.

Ces gestes semblent petits. Ils ne le sont pas. La plupart des gens de ta génération ne les font pas.`,
      couleur: 'border-emerald-400/30 bg-emerald-950/10',
      label: 'text-emerald-400',
    },
    {
      id: 'questionnement',
      condition: (flags) => flags.leo_motion || flags.leo_temoin,
      titre: 'Voir comment ça marche',
      texte: `Tu n'étais pas censé voir comment ça marche. Les réunions, les délibérations, les coulisses.

Tu as vu. Ce n'est pas beau à tous les endroits. Mais c'est réel.

Et maintenant que tu sais comment ça marche, tu as le choix : regarder de loin, ou entrer dans la salle.`,
      couleur: 'border-amber-400/20 bg-amber-950/10',
      label: 'text-amber-400',
    },
    {
      id: 'attente',
      condition: () => true,
      titre: 'L\'avenir n\'est pas encore écrit',
      texte: `Tu as 18 ans. La semaine s'est passée. Tu n'as pas résolu grand-chose.

Mais tu es encore là. Et à 18 ans, c'est parfois le plus important.`,
      couleur: 'border-white/10 bg-white/5',
      label: 'text-white/50',
    },
  ],
};

const computeEndingProfile = (charId, flags) => {
  const profiles = ENDING_PROFILES[charId];
  if (!profiles) return null;
  return profiles.find(p => p.condition(flags)) || profiles[profiles.length - 1];
};

// ==================== SAUVEGARDE LOCALE ====================
const SAVE_KEY = 'montauban_save_v1';

const saveGame = (state) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      ...state,
      savedAt: Date.now(),
    }));
  } catch (e) { /* localStorage indisponible */ }
};

const loadGame = () => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    // Ne pas charger une sauvegarde de plus de 7 jours
    if (Date.now() - save.savedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
    return save;
  } catch (e) { return null; }
};

const clearSave = () => {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
};

const formatSaveDate = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const diffH = Math.round((now - d) / 3600000);
  if (diffH < 1) return 'il y a quelques minutes';
  if (diffH < 24) return `il y a ${diffH}h`;
  return `il y a ${Math.round(diffH / 24)} jour${diffH > 48 ? 's' : ''}`;
};

// ==================== ANALYTICS (Supabase) ====================
// Table à créer dans Supabase :
// analytics_events(id, created_at, player_id, event, data JSONB)

const trackEvent = async (supabase, playerId, event, data = {}) => {
  if (!supabase || !playerId) return;
  try {
    await supabase.from('analytics_events').insert([{
      player_id: playerId,
      event,
      data,
    }]);
  } catch (e) { /* silencieux */ }
};

// ==================== WORLD_PALETTE ====================
const WORLD_PALETTE = {
  A: { tint: 'from-slate-950 via-stone-950 to-slate-950', accent: 'border-slate-800/30' },
  B: { tint: 'from-stone-950 via-slate-950 to-stone-950', accent: 'border-stone-800/30' },
};

// ==================== DESCRIPTIONS DES JAUGES ====================

const STAT_INFO = {
  resources: {
    name: "Ressources",
    icon: Wallet,
    color: "amber",
    description: "L'argent. Le temps. La marge. Ce qui te permet de tenir. Quand ça touche le fond, tu dois partir."
  },
  moral: {
    name: "Moral",
    icon: Brain,
    color: "purple",
    description: "L'énergie qu'il te reste pour te battre. La dignité. Le feu. Quand ça s'éteint, tu craques."
  },
  links: {
    name: "Liens",
    icon: Users,
    color: "blue",
    description: "Les gens. Le réseau. Ceux qui répondent quand tu appelles. Quand il n'y a plus personne, tu es seul."
  },
  comfort: {
    name: "Confort",
    icon: Thermometer,
    color: "emerald",
    description: "Ton corps. Ton logement. L'environnement. Quand ça lâche, tu tombes."
  }
};

// ==================== DONNÉES DES PERSONNAGES ====================

const CHARACTERS = {

  // ============ MAMADOU - Livreur auto-entrepreneur ============
  mamadou: {
    id: 'mamadou',
    name: 'Mamadou',
    age: 28,
    role: 'Livreur auto-entrepreneur',
    description: "Arrivé de Bamako à 19 ans. Naturalisé. Trois plateformes, un vélo, un rêve de formation. 47 kilomètres par jour en moyenne. Tu connais chaque nid-de-poule de Montauban.",
    initialStats: { resources: 50, moral: 50, links: 30, comfort: 40 },
    scenes: [
      // SCÈNE 0 - Monde A - Transports / Travail
      {
        id: 'mamadou_s0',
        world: 'A',
        domain: 'transports',
        context: `11h47. La sueur colle ton t-shirt au sac isotherme. Rue de la République : barrières orange, gravats, ce putain de chantier qui n'en finit pas depuis trois semaines.

Ton téléphone vibre. Le client. Troisième message en dix minutes.

« C'est pour aujourd'hui ? »

Tu regardes la zone piétonne. Le détour officiel, c'est douze minutes. Ton score de rapidité est à 78% — en dessous de 75, tu perds le bonus du mois. 180 euros.

Hier, tu as vu les flics verbaliser Koné. 90 euros. Il coupait par le même endroit.

La chaleur monte du bitume. Tu sens le poids du sac sur tes épaules. Le poids de tout.`,
        choices: [
          {
            id: 'detour',
            label: "Prendre le détour. Tant pis pour le score.",
            conditions: {},
            consequence: `Quatorze minutes de plus. Tes mollets brûlent dans la montée du boulevard Alsace-Lorraine.

Le client ouvre la porte avant que tu sonnes. Il regarde sa montre, puis toi, puis la boîte. Il ne dit rien. Pas de pourboire. La porte se ferme.

Ton téléphone affiche : 74,2%.

Bonus perdu.

Tu remontes sur le vélo. Tu penses aux 180 euros. À ce que tu aurais fait avec. La formation de mécanicien, peut-être. Ou juste le loyer sans stress pour une fois.`,
            impact: { resources: -20, moral: -10, links: 0, comfort: 0 },
            setsFlag: null,
          },
          {
            id: 'couper',
            label: "Couper par la zone piétonne. Vite.",
            conditions: {},
            consequence: `Tu t'engages sur les pavés. Un couple de vieux te regarde passer, désapprobateurs. Tu t'en fous.

Et puis la voix.

« Monsieur ! Arrêtez-vous ! »

L'agent arrive de nulle part. Gilet jaune fluo. Il a déjà le carnet en main.

« C'est interdit. Vous le savez. »

Tu sais. 90 euros. Autant que Koné.

Tu livres quand même à l'heure. Le client sourit. « Ah, parfait ! » Il te donne deux euros de pourboire.

Deux euros. Tu as perdu 88.`,
            impact: { resources: -25, moral: -15, links: 0, comfort: 5 },
            setsFlag: 'mamadou_verbalise',
          },
          {
            id: 'annuler',
            label: "Annuler la livraison. Tu ne peux pas gagner.",
            conditions: {
              requiresMaxStat: { moral: 35 } // choix désespéré
            },
            blockedText: "Tu n'en es pas encore à abandonner des courses.",
            consequence: `Tu appuies sur « Problème avec la livraison ». Motif : « Accès bloqué ».

Le téléphone vibre immédiatement. La plateforme. « Annulation non justifiée. Avertissement n°2. »

Tu ranges le téléphone. Tu t'assois sur un banc, à l'ombre. Le burger refroidit dans ton sac.

Une vieille dame passe. Elle te regarde avec quelque chose qui ressemble à de la pitié. Ou du mépris. Tu ne sais plus faire la différence.`,
            impact: { resources: -10, moral: -25, links: -5, comfort: 10 },
            setsFlag: 'mamadou_avertissement',
          }
        ]
      },

      // SCÈNE 1 - Monde B - Transports / Lien social
      {
        id: 'mamadou_s1',
        world: 'B',
        domain: 'transports',
        context: `14h20. Rue de la Résistance. Le quartier a changé depuis l'an dernier — ils appellent ça un « superîlot ». Moins de voitures, plus de place.

Une piste cyclable temporaire serpente entre les travaux. Peinture jaune sur bitume noir. Pas belle, mais elle existe.

Tu passes devant le « Commun » — l'ancien local de la Poste, transformé en... tu ne sais pas trop quoi. Des gens entrent et sortent. Il y a de l'ombre à l'intérieur. Et un robinet, d'après le panneau.

Ta gourde est vide depuis une heure. Ta prochaine livraison est dans vingt minutes. C'est jouable, mais serré.

Un type à dreadlocks fume devant l'entrée. Il te fait un signe de tête.`,
        choices: [
          {
            id: 'piste',
            label: "Prendre la piste, livrer, continuer.",
            conditions: {},
            consequence: `La piste est étroite. Tu frôles une poussette — la mère te lance un regard noir, puis voit ton sac isotherme et hausse les épaules.

Tu livres à l'heure. Le client — un type en télétravail, écouteurs aux oreilles — prend le sac sans te regarder. « Merci. » La porte se ferme.

Tu repars. La gorge sèche. Le soleil tape.

Tu passes devant le Commun sans t'arrêter. Le type à dreadlocks n'est plus là.`,
            impact: { resources: 10, moral: 0, links: 0, comfort: -5 },
            setsFlag: null,
          },
          {
            id: 'commun',
            label: "T'arrêter au Commun. Cinq minutes.",
            conditions: {},
            consequence: `Tu poses ton vélo contre le mur. Le type à dreadlocks s'appelle Rachid. Il te tend un verre d'eau avant que tu demandes.

« Livreur ? »

« Ouais. »

« Moi j'étais Deliveroo y'a deux ans. J'ai arrêté. » Il montre l'intérieur du local. « Maintenant je fais ça. Atelier vélo, repair café, cours de français le mardi. »

Tu bois. L'eau est froide.

« On cherche quelqu'un pour la mécanique. Formation payée. Si ça t'intéresse. »

Tu penses à ta livraison. Tu es en retard. Mais tu restes encore deux minutes. Tu prends son numéro.`,
            impact: { resources: -10, moral: 15, links: 20, comfort: 10 },
            setsFlag: 'mamadou_metRachid',
          },
          {
            id: 'ignorer',
            label: "Ignorer le Commun. Tu n'as pas le temps pour ces trucs.",
            conditions: {},
            consequence: `Tu passes devant sans ralentir. Le type à dreadlocks dit quelque chose que tu n'entends pas.

Tu livres à l'heure. Le client est content. La plateforme est contente. Ton score remonte.

Le soir, tu repenses au local. À l'eau froide. À ce que le type voulait te dire.

Mais c'est comme ça. On n'a pas le temps pour les « peut-être ».`,
            impact: { resources: 10, moral: -5, links: -5, comfort: 0 },
            setsFlag: 'mamadou_ignoréCommun',
          }
        ]
      },

      // SCÈNE 2 - Monde A - Sécurité
      {
        id: 'mamadou_s2',
        world: 'A',
        domain: 'securite',
        context: `18h05. Tu ranges ton vélo devant chez toi, rue des Carmes. Le soleil tape encore sur la brique rouge. La crampe dans ton mollet droit — 52 kilomètres aujourd'hui.

Une Mégane blanche ralentit. Tu connais ce bruit. Celui du moteur qui se met au point mort. Celui des portières qui s'ouvrent.

« Contrôle d'identité. »

Deux agents. Le plus vieux a des yeux fatigués. Le jeune a la main près de la ceinture.

Ton voisin Gérard est à sa fenêtre. Rideau entrouvert. Il ne bouge pas. Il regarde.

Troisième contrôle ce mois-ci.

Tu sens quelque chose monter. Une brûlure familière. Entre la rage et l'épuisement.`,
        choices: [
          {
            id: 'cooperer',
            label: "Tendre tes papiers. Sans un mot.",
            conditions: {},
            consequence: `Tu donnes tout. Carte d'identité française. Justificatif de domicile. Attestation auto-entrepreneur. Tu les gardes toujours sur toi maintenant.

Le jeune fouille ton sac isotherme. Il soulève la Tupperware de riz.

« C'est quoi ça ? »

« Mon dîner. »

Il repose la boîte. Ils vérifient. Ils appellent. Ils attendent. 22 minutes.

« C'est bon. »

Ils repartent. Tu ne dis rien. Gérard a fermé son rideau.

Tu rentres chez toi. Le riz est froid.`,
            impact: { resources: -5, moral: -20, links: 0, comfort: 0 },
            setsFlag: null,
          },
          {
            id: 'demander',
            label: "Leur demander le cadre juridique du contrôle.",
            conditions: {
              requiresMinStat: { moral: 35 }
            },
            blockedText: "Tu n'as pas l'énergie pour ça. Pas aujourd'hui. Tu tends les papiers.",
            consequence: `« Excusez-moi. Je peux connaître le cadre légal du contrôle ? Article 78-2 ? »

Le vieux te regarde. Vraiment, cette fois.

« Vous êtes avocat ? »

« Non. Livreur. Mais j'ai des droits, non ? »

Le jeune rigole. « Il se croit malin. » Il appelle du renfort. Par précaution, dit-il.

Une heure. Debout contre le mur. Ils trouvent ton couteau suisse — celui que tu utilises pour couper les ficelles des colis. « C'est limite », dit le vieux. Ils te laissent partir avec un regard qui dit « on se reverra ».

Gérard t'attend en bas des escaliers. 

« T'aurais dû fermer ta gueule. » 

Un temps.

« Mais t'as bien fait. »`,
            impact: { resources: -15, moral: -15, links: 15, comfort: -10 },
            setsFlag: 'mamadou_resiste',
          },
          {
            id: 'filmer',
            label: "Sortir ton téléphone. Filmer.",
            conditions: {
              requiresMinStat: { moral: 45, links: 25 }
            },
            blockedText: "Tu n'as pas le cran. Ou pas assez de gens derrière toi si ça tourne mal.",
            consequence: `Tu sors ton téléphone. Tu actives la caméra.

« Vous faites quoi là ? » Le jeune avance.

« Je documente le contrôle. C'est mon droit. »

Ça dure deux heures. Renfort. Questions. Menaces voilées. Ils finissent par partir.

Le soir, tu postes la vidéo. 200 vues. Puis 2000. Un avocat te contacte. Un collectif aussi.

Tu ne sais pas si c'était courageux ou stupide. Peut-être les deux.`,
            impact: { resources: -20, moral: 10, links: 25, comfort: -15 },
            setsFlag: 'mamadou_filme',
          }
        ]
      },

      // SCÈNE 3 - Monde B - Formation
      {
        id: 'mamadou_s3',
        world: 'B',
        domain: 'travail',
        context: `10h. Jour de repos. Ton téléphone vibre.

SMS de la Maison de l'Emploi : « Rappel : RDV dispositif Crédit Temps-Formation, 14h. Merci de confirmer. »

Tu avais postulé il y a deux mois. Tu avais presque oublié.

14h, c'est dans quatre heures. Si tu y vas, tu perds une demi-journée de livraisons. 40, 50 euros peut-être.

Ton coloc Youssef rentre de sa nuit à l'hôpital. Il te voit avec le téléphone.

« C'est quoi ? »

« Un truc de formation. Mais c'est cet après-midi. »

Il pose son sac. « Et tu hésites ? »`,
        choices: [
          {
            id: 'aller',
            label: "Y aller. C'est peut-être ta chance.",
            conditions: {},
            consequence: `La Maison de l'Emploi sent le café froid et le désinfectant. Mais l'agent — une femme d'une cinquantaine d'années avec des lunettes rondes — t'écoute.

Vraiment.

Elle te parle du dispositif. Formation de mécanicien cycle, six mois. 800 euros par mois pendant la formation. Pas énorme, mais garanti.

« Et après ? »

« On a des partenariats. Des ateliers vélo, des boutiques. Et il y a le Commun, à Sapiac. Ils cherchent quelqu'un. »

Tu penses à Rachid. Au verre d'eau. À la piste cyclable jaune.

« Je dois réfléchir. »

« Prenez le temps. Mais pas trop. Les places partent vite. »`,
            impact: { resources: -15, moral: 20, links: 10, comfort: 0 },
            setsFlag: 'mamadou_formation',
          },
          {
            id: 'reporter',
            label: "Reporter. L'argent d'abord.",
            conditions: {},
            consequence: `Tu réponds au SMS. « Empêché. Prochain créneau ? »

La réponse arrive une heure plus tard. « Prochain RDV disponible : 6 semaines. »

Six semaines. D'ici là, tu auras oublié. Ou tu seras tellement crevé que tu ne pourras pas y aller.

Tu livres toute la journée. 67 euros. Moins l'essence. Moins l'entretien du vélo. Moins la bouffe.

Le soir, tu calcules. Ça fait 45 euros net. Pour dix heures de travail.

4,50 de l'heure.

Tu regardes le plafond longtemps.`,
            impact: { resources: 15, moral: -15, links: 0, comfort: 5 },
            setsFlag: 'mamadou_reporte',
          },
          {
            id: 'youssef',
            label: "Demander à Youssef ce qu'il en pense.",
            conditions: {
              requiresMinStat: { links: 25 }
            },
            blockedText: "Tu n'es pas assez proche de lui pour demander ce genre de conseil.",
            consequence: `Youssef s'assoit. Il a l'air crevé — douze heures de garde aux urgences — mais il t'écoute.

« C'est quoi le pire qui puisse arriver ? »

« Je perds une demi-journée. »

« Et le mieux ? »

Tu réfléchis. Le mieux. Tu n'y penses jamais, au mieux.

Il sourit. « Vas-y. Je te prête 50 balles si t'en as besoin ce mois-ci. »

Tu y vas. Et pour la première fois depuis longtemps, tu te sens moins seul.`,
            impact: { resources: -10, moral: 25, links: 15, comfort: 5 },
            setsFlag: 'mamadou_formation',
          }
        ]
      },

      // SCÈNE 4 - Monde A - Climat
      {
        id: 'mamadou_s4',
        world: 'A',
        domain: 'climat',
        context: `15h30. Canicule. 38°C à l'ombre, sauf qu'il n'y a pas d'ombre.

Ta gourde est vide depuis une heure. Les fontaines Wallace de la place Nationale sont à sec — tu as vu le panneau ce matin : « Mesure d'économie d'eau ».

Il y a un Carrefour City au coin de la rue. Une bouteille d'eau, c'est 2,20 euros.

Il y a aussi le restaurant où tu viens de livrer. Ils ont de l'eau. Gratuite. Mais il faudrait demander.

Ta gorge est sèche comme du carton. Ta tête tourne un peu.`,
        choices: [
          {
            id: 'acheter',
            label: "Acheter une bouteille. Tu n'as pas le choix.",
            conditions: {},
            consequence: `2,20 euros. Tu bois la moitié d'un coup, debout devant le frigo ouvert du Carrefour. Le vigile te regarde mais ne dit rien.

Tu en achètes une deuxième. Pour la route.

4,40 euros. Presque une heure de travail.

Tu ressors. Le soleil t'écrase. Tu penses aux fontaines fermées. À l'eau qui coule quelque part, pour quelqu'un d'autre.`,
            impact: { resources: -10, moral: -5, links: 0, comfort: 10 },
            setsFlag: null,
          },
          {
            id: 'restaurant',
            label: "Retourner au restaurant demander de l'eau.",
            conditions: {},
            consequence: `Tu pousses la porte vitrée. La clim te frappe comme une gifle — froide, délicieuse.

Le serveur te reconnaît. Il fronce les sourcils.

« On n'est pas une fontaine. »

« Juste un verre d'eau. S'il vous plaît. »

Il hésite. Regarde vers la cuisine. Finit par te donner un verre d'eau du robinet. Sans sourire. Sans un mot.

Tu bois. Tu dis merci. Tu sors.

L'eau était froide. Mais le goût dans ta bouche, c'est celui de la honte.`,
            impact: { resources: 0, moral: -15, links: -10, comfort: 5 },
            setsFlag: null,
          },
          {
            id: 'continuer',
            label: "Continuer. Tu as connu pire.",
            conditions: {
              requiresMinStat: { comfort: 35 }
            },
            blockedText: "Non. Tu ne peux pas continuer comme ça. Ton corps refuse.",
            consequence: `Tu remontes sur le vélo. La tête tourne. Les jambes tournent.

Deux livraisons plus tard, tu t'arrêtes. Tu ne sais plus où tu es. Le monde tangue.

Un passant te demande si ça va. Tu ne réponds pas. Tu t'assois par terre, contre un mur.

Quelqu'un t'apporte de l'eau. Tu ne sais pas qui. Tu bois. Tu restes assis longtemps.

Ta journée est finie.`,
            impact: { resources: -15, moral: -20, links: 5, comfort: -25 },
            setsFlag: 'mamadou_malaise',
          }
        ]
      },

      // SCÈNE 5 - Monde B - Alimentation
      {
        id: 'mamadou_s5',
        world: 'B',
        domain: 'alimentation',
        context: `13h. Samedi. Tu passes devant le marché couvert. L'odeur des tomates, du basilic, du poulet rôti.

Un stand attire ton œil. « Carte Commune acceptée ».

Tu l'as, cette carte. On te l'a donnée à la mairie il y a trois mois. Tu ne l'as jamais utilisée. Tu ne sais pas trop comment ça marche. Ou peut-être que tu sais, mais que ça te gêne.

C'est pour les pauvres, non ?

Et toi, tu es quoi ?

Le maraîcher — un type massif avec une casquette — te fait signe. « Tu veux goûter ? » Il te tend une tomate cœur-de-bœuf.`,
        choices: [
          {
            id: 'carte',
            label: "Sortir la carte. Essayer.",
            conditions: {},
            consequence: `Tu tends la carte comme si elle allait te brûler.

Le maraîcher la passe dans un petit lecteur. « 25 euros de crédit ce mois-ci. Tu veux quoi ? »

Tu choisis. Tomates. Courgettes. Un melon.

« 8,50. Il te reste 16,50 pour le mois. »

Tu ranges les légumes dans ton sac. Le maraîcher te regarde.

« T'es le livreur, non ? Je t'ai vu passer en vélo. »

« Ouais. »

« Je m'appelle Philippe. Si tu veux des légumes frais, passe le samedi. C'est fait pour ça. »

Tu repars avec un sentiment bizarre. Entre la fierté et autre chose. Quelque chose qui ressemble à de l'espoir.`,
            impact: { resources: 15, moral: 15, links: 15, comfort: 5 },
            setsFlag: 'mamadou_carteCommune',
          },
          {
            id: 'passer',
            label: "Passer ton chemin. C'est pas pour toi.",
            conditions: {},
            consequence: `Tu hoches la tête vers le maraîcher — non merci — et tu continues.

Tu achètes un kebab au camion du coin. 7 euros. Le pain est un peu sec. La viande est correcte.

Tu manges debout, appuyé contre ton vélo. Tu penses à la carte dans ton portefeuille. À ce que ta mère dirait si elle te voyait refuser de la nourriture gratuite.

Mais c'est pas gratuit. C'est de l'aide. Et l'aide, ça a un prix que tu n'arrives pas à nommer.`,
            impact: { resources: -10, moral: -10, links: 0, comfort: 0 },
            setsFlag: null,
          },
          {
            id: 'demander',
            label: "Demander au maraîcher comment ça marche exactement.",
            conditions: {
              requiresMinStat: { links: 20 }
            },
            blockedText: "Tu n'oses pas engager la conversation.",
            consequence: `« La Carte Commune, ça marche comment ? »

Philippe pose ses courgettes. Il prend le temps.

« C'est un crédit mensuel. 25 euros pour tout le monde sous un certain revenu. Mais c'est pas juste pour acheter. Y'a des ateliers cuisine, des paniers partagés. Tu peux aussi donner des heures — réparation vélo, coups de main — et ça augmente ton crédit. »

Tu écoutes. C'est plus compliqué que tu pensais. Et moins humiliant.

« Rachid du Commun, il peut t'expliquer mieux. Tu le connais ? »

Tu hoches la tête. Oui. Tu le connais.`,
            impact: { resources: 5, moral: 20, links: 20, comfort: 5 },
            setsFlag: 'mamadou_carteCommune',
          }
        ]
      },

      // SCÈNE 6 - Monde A - Logement
      {
        id: 'mamadou_s6',
        world: 'A',
        domain: 'logement',
        context: `Dimanche, 11h. Youssef pose son café.

« Faut que je te dise. J'ai trouvé un poste à Toulouse. Je pars à la fin du mois. »

Tu le regardes. Le café refroidit entre tes mains.

« Le loyer... »

« Je sais. Désolé. »

790 euros par mois. Tu en paies 395. Sans lui, c'est impossible.

Tu as trois semaines pour trouver un autre coloc. Ou un studio moins cher. Ou un miracle.`,
        choices: [
          {
            id: 'annonce',
            label: "Poster une annonce tout de suite.",
            conditions: {},
            consequence: `Tu passes une heure sur LeBonCoin. « Colocation Sapiac, chambre 12m², 395€ CC, cherche personne calme et sérieuse. »

Trois réponses en deux jours.

Un étudiant qui veut payer 250. « C'est négociable ? » Non.

Un type qui pose trop de questions sur tes horaires. Bizarre.

Une fille qui cherche « calme absolu ». Tu travailles à 6h du matin. Ça va pas le faire.

Tu fermes l'appli. Tu regardes le plafond.`,
            impact: { resources: 0, moral: -15, links: 0, comfort: -10 },
            setsFlag: null,
          },
          {
            id: 'studio',
            label: "Chercher un studio seul.",
            conditions: {},
            consequence: `Tu passes la journée sur les sites d'annonces.

Les studios abordables sont à Bas-Pays. 40 minutes de vélo du centre. L'hiver, sous la pluie, ça va être l'enfer.

Tu en visites un. 450 euros. 18m². Une fenêtre qui donne sur un mur.

Le proprio te regarde. « Vous faites quoi comme travail ? »

« Livreur. Auto-entrepreneur. »

Il hoche la tête. « Je vous rappelle. »

Il ne rappelle jamais.`,
            impact: { resources: -10, moral: -20, links: -5, comfort: -15 },
            setsFlag: null,
          },
          {
            id: 'rachid',
            label: "Appeler Rachid. Il connaît peut-être quelqu'un.",
            conditions: {
              requiresFlag: 'mamadou_metRachid'
            },
            blockedText: "Tu ne connais personne qui pourrait t'aider.",
            consequence: `Rachid répond à la deuxième sonnerie.

« J'ai peut-être un plan. Y'a un gars au Commun, Mehdi, il cherche un coloc. Son appart est à Villebourbon. 350 balles chacun. »

Tu rencontres Mehdi le lendemain. Électricien. Calme. Il fait des confitures le dimanche.

« Ça te va si je rentre tôt le matin ? »

« Je me lève à 5h de toute façon. »

Poignée de main. Affaire conclue.

Tu n'en reviens pas. Un problème, résolu. Comme ça. Parce que quelqu'un connaissait quelqu'un.`,
            impact: { resources: 5, moral: 25, links: 20, comfort: 10 },
            setsFlag: 'mamadou_nouveauColoc',
          }
        ]
      },

      // SCÈNE 7 - Monde B - Citoyenneté
      {
        id: 'mamadou_s7',
        world: 'B',
        domain: 'citoyennete',
        context: `Lundi, 19h. Un message de Rachid.

« Assemblée de quartier ce soir à Sapiac. On parle du budget participatif. Tu viens ? »

Assemblée de quartier. Tu ne sais pas trop ce que c'est. Des gens qui parlent dans une salle ? Des trucs de vieux ?

Mais Rachid t'a trouvé un coloc. Il t'a parlé de la formation. Il t'a donné de l'eau quand tu crevais de soif.

Tu lui dois bien ça, non ?

Ou alors tu rentres, tu manges, tu dors. Comme d'habitude.`,
        choices: [
          {
            id: 'aller',
            label: "Y aller. Tu verras bien.",
            conditions: {
              requiresFlag: 'mamadou_metRachid'
            },
            blockedText: "Rachid ne t'a jamais invité.",
            consequence: `Une salle des fêtes. Une trentaine de personnes. Beaucoup de vieux, mais pas que.

On parle des poubelles. Du parc qui ferme trop tôt. D'un projet de jardin partagé. Des trucs concrets.

Et puis quelqu'un demande : « Et les pistes cyclables ? C'est dangereux sur le boulevard. »

Tu lèves la main sans réfléchir. « Je suis livreur. Je fais 50 bornes par jour. Je peux en parler. »

Le silence. Puis une dame sourit. « On vous écoute. »

Tu parles. De la rue de la République. Des travaux sans fin. Des flics. De la chaleur.

Les gens écoutent. Vraiment.

Tu ressors avec un sentiment étrange. Comme si tu existais un peu plus qu'avant.`,
            impact: { resources: -5, moral: 30, links: 25, comfort: 5 },
            setsFlag: 'mamadou_assemblee',
          },
          {
            id: 'refuser',
            label: "Refuser. Tu es crevé.",
            conditions: {},
            consequence: `Tu réponds à Rachid. « Désolé, pas ce soir. Crevé. »

Il répond juste « OK. » avec un pouce.

Tu restes chez toi. Tu scrolles sur ton téléphone. Une vidéo de chats. Une pub pour des baskets. Un article sur le réchauffement climatique que tu ne lis pas.

Le lendemain, Rachid te raconte l'assemblée. Le débat sur les vélos. L'idée de budget participatif pour les pistes cyclables.

« Dommage que t'étais pas là. T'aurais eu des trucs à dire. »

Ouais. T'aurais eu des trucs à dire.`,
            impact: { resources: 5, moral: -10, links: -15, comfort: 10 },
            setsFlag: null,
          },
          {
            id: 'distance',
            label: "Y aller, mais rester en retrait. Observer.",
            conditions: {},
            consequence: `Tu te mets au fond de la salle. Tu ne parles pas.

Les gens discutent. Se disputent parfois. Votent à main levée. C'est bordélique mais vivant.

Une vieille dame se tourne vers toi à la fin. « Vous êtes nouveau ? »

« Oui. »

« Vous reviendrez ? »

Tu ne sais pas quoi répondre. Tu hausses les épaules. Elle sourit.

« On a besoin de jeunes. Réfléchissez-y. »

Tu repars sans avoir dit un mot. Mais tu as vu quelque chose. Un monde qui fonctionne autrement.`,
            impact: { resources: -5, moral: 10, links: 10, comfort: 5 },
            setsFlag: 'mamadou_observateur',
          }
        ]
      }
    ]
  },

  // ============ INÈS - Aide-soignante ============
  ines: {
  id: 'ines',
  name: 'Inès',
  age: 35,
  role: 'Aide-soignante',
  description: "Huit ans à l'hôpital de Montauban. Un T2 à Villebourbon. Pas de voiture. Un vélo. Des gardes qui s'enchaînent. Un corps qui commence à dire non.",
  initialStats: { resources: 45, moral: 40, links: 35, comfort: 45 },
  scenes: [

    // ──────────────────────────────────────────
    // SCÈNE 0 — Monde A — Travail
    // Le téléphone qui sonne un jour de repos.
    // ──────────────────────────────────────────
    {
      id: 'ines_s0',
      world: 'A',
      domain: 'travail',
      context: `7h15. Ton téléphone sonne. Tu sais avant de décrocher.

« Inès ? C'est Marc. On est en sous-effectif ce week-end. Tu peux prendre le samedi ? Je sais que c'est ton troisième d'affilée mais— »

Tu regardes ton café refroidir. Ta sœur t'a invitée à dîner samedi. Tu as dit oui. Tu étais contente.

« Il y a la prime », ajoute Marc. 180 euros. C'est le loyer d'une semaine.

Ta main tremble un peu. Fatigue ou colère, tu ne sais plus.`,
      choices: [
        {
          id: 'accepter',
          label: "Accepter. Comme toujours.",
          conditions: {},
          consequence: `« D'accord. »

Tu raccroches. Tu appelles ta sœur.

« Je suis vraiment désolée. Le boulot. »

Silence au bout du fil. Puis : « Je comprends. » Elle ne comprend pas. Comment elle pourrait ?

Le week-end passe. Trois toilettes mortuaires. Une famille qui pleure. Un patient qui te traite de conne parce que tu as mis trop de temps à venir.

180 euros. Tu les comptes le lundi. Ils ont le goût du formol.`,
          impact: { resources: 20, moral: -25, links: -20, comfort: -15 },
          setsFlag: 'ines_accepte',
        },
        {
          id: 'refuser',
          label: "Refuser. Pour une fois.",
          conditions: {
            requiresMinStat: { moral: 35 }
          },
          blockedText: "Tu n'as pas la force de dire non. Tu dis oui. Comme toujours.",
          consequence: `« Non. Je ne peux pas. Pas un troisième week-end d'affilée. »

Silence.

« Je comprends. On trouvera quelqu'un d'autre. »

Tu raccroches. Tes mains tremblent. Tu viens de dire non.

Samedi soir, chez ta sœur. Du vin, des pâtes, des rires. Ta nièce te montre ses dessins. C'est un dinosaure, ou peut-être un chat.

Au fond de toi, une petite voix dit que tu aurais dû accepter. Tu l'ignores. Ce soir, elle peut se taire.`,
          impact: { resources: -5, moral: 15, links: 15, comfort: 10 },
          setsFlag: 'ines_refuse',
        },
        {
          id: 'negocier',
          label: "Demander une rotation. Un planning équitable.",
          conditions: {
            requiresMinStat: { links: 30 }
          },
          blockedText: "Tu ne connais pas assez tes collègues pour proposer ça.",
          consequence: `« Marc. Ça fait trois semaines que je fais les week-ends. Pourquoi c'est toujours moi ? »

Silence. Tu l'entends respirer.

« Parce que tu dis toujours oui, Inès. »

Ça fait mal parce que c'est vrai.

« Et si on faisait une rotation ? On est sept dans l'équipe. Deux week-ends par mois chacun, maximum. »

Il soupire. « Je vais voir ce que je peux faire. »

Il ne fait rien. Mais tes collègues ont entendu parler de ta proposition. Deux d'entre elles te disent merci à la machine à café.`,
          impact: { resources: -5, moral: 10, links: 20, comfort: 5 },
          setsFlag: 'ines_rotation',
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 1 — Monde B — Travail
    // Le nouveau planning co-construit.
    // ──────────────────────────────────────────
    {
      id: 'ines_s1',
      world: 'B',
      domain: 'travail',
      context: `14h. Réunion d'équipe. C'est nouveau, ces réunions. Avant, on n'avait pas le temps.

Marc — le cadre — présente un tableau. « Nouveau planning. Co-construit avec les syndicats. Chacun choisit ses week-ends sur la base du volontariat. Maximum deux par mois. »

Tu regardes le tableau. C'est lisible. Les week-ends sont colorés, les noms répartis.

Quelqu'un demande : « Et si personne veut prendre un week-end ? »

Marc hausse les épaules. « On embauchera des remplaçants. C'est prévu au budget. »

Tu n'es pas sûre d'y croire. Mais c'est sur un papier officiel. C'est déjà ça.`,
      choices: [
        {
          id: 'deux',
          label: "T'inscrire pour deux week-ends. Tu fais ta part.",
          conditions: {},
          consequence: `Tu choisis les 8 et 22. Les dates qui t'arrangent.

« C'est bon pour toi ? » demande Marc.

« Ouais. C'est... bien, ce nouveau truc. »

Il sourit. « C'était pas gagné. Faut remercier le collectif soignant. Ils ont poussé pendant des mois. »

Tu ne faisais pas partie du collectif. Tu n'avais pas le temps. Mais quelqu'un s'est battu pour ce tableau. Pour ces couleurs. Pour ces choix.

Tu te dis que tu devrais peut-être venir aux prochaines réunions.`,
          impact: { resources: 10, moral: 15, links: 10, comfort: 5 },
          setsFlag: 'ines_participe',
        },
        {
          id: 'zero',
          label: "Ne prendre aucun week-end ce mois-ci. Tu en as besoin.",
          conditions: {},
          consequence: `Tu laisses la feuille vide. Personne ne dit rien. C'est dans les règles.

Le week-end arrive. Tu restes chez toi. Tu fais des choses que tu ne fais jamais — des courses au marché, une sieste l'après-midi, un film le soir.

Mais le lundi, tu croises Fatima. Elle a l'air crevée.

« Week-end difficile ? »

« On était trois au lieu de cinq. Deux malades. »

Elle ne te reproche rien. Mais tu sens le poids.

Le collectif, c'est ça. Ça repose sur tout le monde. Et quand quelqu'un s'absente, les autres portent.`,
          impact: { resources: -5, moral: 5, links: -10, comfort: 20 },
          setsFlag: null,
        },
        {
          id: 'plus',
          label: "Proposer de prendre un troisième week-end pour aider.",
          conditions: {
            requiresMinStat: { comfort: 40 }
          },
          blockedText: "Ton corps dit non. Tu le sens. Trois week-ends, c'est trop.",
          consequence: `« Je peux en prendre un troisième si vous êtes en galère. »

Marc te regarde. « T'es sûre ? »

« Ouais. Je me sens mieux en ce moment. »

C'est à moitié vrai. Mais Fatima te sourit, et Aïcha te dit merci, et tu te sens utile. Vraiment utile.

Le troisième week-end, tu finis avec le dos en feu et la tête vide. Mais tu as tenu. Tu tiens toujours.`,
          impact: { resources: 10, moral: 5, links: 20, comfort: -20 },
          setsFlag: 'ines_surmenage',
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 2 — Monde A — Santé
    // Le dos. Le clou entre les omoplates.
    // ──────────────────────────────────────────
    {
      id: 'ines_s2',
      world: 'A',
      domain: 'sante',
      context: `Mercredi, 6h40. Tu te retournes dans le lit et le dos te cloue sur place. Ce n'est plus une douleur — c'est un veto. Ton corps qui dit : plus comme ça.

Trois semaines que ça dure. Au début c'était un pincement en fin de garde, le genre de truc que tu chasses en étirant les bras. Maintenant c'est un clou planté entre les omoplates dès le réveil.

Tu appelles ton médecin traitant. La secrétaire a une voix fatiguée — la même que la tienne.

« Premier créneau : dans trois semaines. Ça vous va ? »

Trois semaines. Tu calcules. Vingt et une gardes. Soixante-trois patients à lever, tourner, porter. Ton dos compte chaque geste à l'avance.`,
      choices: [
        {
          id: 'attendre',
          label: "Prendre le rendez-vous. Serrer les dents.",
          conditions: {},
          consequence: `Tu prends du Doliprane. Matin et soir. Ça émousse la douleur sans l'effacer — comme mettre un chiffon sur une alarme incendie.

Tu adaptes tes gestes. Tu te penches moins. Tu portes différemment. Tu demandes à Fatima de t'aider pour les transferts lit-fauteuil, ceux qui te vrillent les lombaires.

Au bout d'une semaine, c'est ta nuque qui lâche. Puis tes épaules. Ton corps redistribue la douleur comme de l'eau qui cherche une faille.

Trois semaines passent. Le médecin palpe, grimace.

« C'est installé. Vous auriez dû venir plus tôt. »

Tu ne dis rien. Tu aurais voulu, oui. Mais qui soigne les soignants quand les soignants sont tous pris ?`,
          impact: { resources: 0, moral: -15, links: 0, comfort: -25 },
          setsFlag: null,
        },
        {
          id: 'urgences',
          label: "Aller aux urgences après ta garde.",
          conditions: {},
          consequence: `23h. Tu es dans la salle d'attente. De l'autre côté du comptoir, cette fois. C'est bizarre — tu connais le bruit des néons, l'odeur de Javel tiède, le grésillement du distributeur. Mais en tant que patiente, tout est plus lent.

Quatre heures. L'interne a l'air plus fatigué que toi. Peut-être qu'il l'est.

« Contracture sévère. Repos, anti-inflammatoires, kiné. Vous travaillez dans quoi ? »

« Ici. Je suis aide-soignante. »

Il lève les yeux de son écran. Vraiment. Il te regarde comme on regarde un collègue blessé au front.

« Vous devriez vous arrêter quelques jours. »

Tu hoches la tête. Tu retournes travailler le lendemain. Parce que si tu t'arrêtes, Fatima est seule. Et Fatima a une sciatique, elle aussi.`,
          impact: { resources: -10, moral: -20, links: 5, comfort: -10 },
          setsFlag: 'ines_urgences',
        },
        {
          id: 'kine',
          label: "Appeler directement un kiné. Payer de ta poche.",
          conditions: {
            requiresMinStat: { resources: 40 }
          },
          blockedText: "40 euros la séance sans ordonnance. Tu n'as pas les moyens. Pas ce mois-ci.",
          consequence: `Le kiné peut te prendre vendredi. 45 euros sans ordonnance. Ton estomac se serre au moment de payer.

Mais ses mains trouvent le nœud entre tes omoplates. En dix minutes, tu respires mieux. Un vrai souffle. Tu avais oublié ce que ça faisait.

« Stress, postures de transfert, manque de sommeil. Classique chez les soignantes. Vous êtes ma troisième aide-soignante du mois. »

Tu ris. Jaune. Une épidémie de dos cassés.

« Je vous revois la semaine prochaine ? »

Tu hoches la tête. 90 euros pour deux séances. Ton dos va mieux. Ton compte en banque, moins. Mais au moins tu peux lever Mme Duval sans que la pièce tourne.`,
          impact: { resources: -20, moral: 10, links: 0, comfort: 15 },
          setsFlag: 'ines_kine',
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 3 — Monde B — Santé
    // Le Centre de Santé Municipal. Quelque chose
    // qui ressemble à ce que devrait être le soin.
    // ──────────────────────────────────────────
    {
      id: 'ines_s3',
      world: 'B',
      domain: 'sante',
      context: `Jeudi, 12h15. Tu passes devant le Centre de Santé Municipal de Villebourbon. C'est nouveau — six mois que ça a ouvert. Ancienne maison de quartier retapée. Une plaque sobre : « Médecins salariés. Sans dépassement. Sans rendez-vous le midi. »

Sans rendez-vous.

Tu t'arrêtes. Le dos te lance. Les anti-inflammatoires que tu prends depuis deux semaines te bouffent l'estomac, et la douleur revient à chaque transfert de patient.

À l'intérieur, tu aperçois une salle d'attente qui ne ressemble pas à une salle d'attente. Des plantes. Un coin enfants. Pas de magazines de 2019.

Tu regardes ta montre. 45 minutes de pause. Ta garde reprend à 13h.

Tu pourrais entrer. Ou tu pourrais manger — ton sandwich est dans ton sac, et tu n'as rien avalé depuis 6h.`,
      choices: [
        {
          id: 'entrer',
          label: "Entrer. Le dos ne peut plus attendre.",
          conditions: {},
          consequence: `La médecin s'appelle Dr. Benali. La quarantaine, cheveux courts, pas de blouse — juste un stéthoscope et des yeux qui écoutent.

Elle te palpe en trois minutes. « TMS classique. Mais le plus intéressant, c'est ce que ton corps essaie de te dire. »

Tu la regardes bizarrement.

« Vous portez combien de patients par jour ? »

« Dix, douze. Ça dépend des jours. »

« Sans lève-personne ? »

« On en a un. Il est en panne depuis mars. »

Elle écrit. Pas une ordonnance — un courrier. Pour le médecin du travail. Pour signaler.

« Votre dos, c'est pas un problème individuel, Inès. C'est un problème d'organisation. Mais en attendant qu'ils bougent, voilà pour le kiné — zéro reste à charge avec le centre. »

Tu ressors avec une ordonnance et un drôle de sentiment. Quelqu'un a nommé ce que tu n'arrivais pas à dire : ce n'est pas ton corps qui est cassé, c'est ton travail.`,
          impact: { resources: 5, moral: 25, links: 10, comfort: 15 },
          setsFlag: 'ines_centreSante',
        },
        {
          id: 'manger',
          label: "Manger d'abord. La pause est courte.",
          conditions: {},
          consequence: `Tu t'assois sur un banc face au centre. Sandwich thon-crudités. Le pain est un peu mou. Le thon est correct.

Tu regardes les gens entrer et sortir. Une vieille dame avec une canne. Un père avec un gamin enrhumé. Une femme enceinte.

Ils ont tous l'air... normaux. Pas stressés. Pas en train de calculer si c'est 40 ou 50 euros la consultation.

Tu finis ton sandwich. Tu n'entres pas. Ta garde reprend dans dix minutes.

Le soir, le dos te réveille à 3h du matin. Tu prends un Doliprane. Tu penses au centre. À demain. Tu t'endors en te promettant d'y retourner.

Tu n'y retournes pas.`,
          impact: { resources: 0, moral: -10, links: 0, comfort: -10 },
          setsFlag: null,
        },
        {
          id: 'dossier',
          label: "Entrer — et demander si ton dossier patient peut être partagé avec l'hôpital.",
          conditions: {
            requiresMinStat: { links: 30 }
          },
          blockedText: "Tu ne te sens pas assez légitime pour demander un truc pareil.",
          consequence: `Dr. Benali ne se contente pas de t'examiner. Quand tu poses la question du dossier partagé, elle sourit.

« On y travaille. Le Dossier Médical Partagé Ville-Hôpital. C'est pas encore parfait, mais l'idée, c'est que la patiente de 82 ans que vous voyez à 3h du matin aux urgences, le médecin de nuit ait son historique. Pas un PDF illisible — un vrai dossier. »

Tu penses à Mme Rossi. Arrivée aux urgences le mois dernier sans aucun dossier. Allergique à la codéine. Personne ne le savait. Ça a failli mal tourner.

« Si le centre fonctionne bien, dit Benali, vous aurez moins de réhospitalisations. Moins de charge sur vos gardes. »

Moins de charge. Ça te semble irréel. Comme un mot d'une langue étrangère que tu aurais apprise enfant et oubliée.`,
          impact: { resources: 0, moral: 20, links: 20, comfort: 10 },
          setsFlag: 'ines_centreSante',
          // Cross-flag : rend possible le dossier partagé pour Françoise
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 4 — Monde A — Travail / Soin
    // Garde de nuit. Yanis, 7 ans. Le moment
    // où la vocation percute le protocole.
    // ──────────────────────────────────────────
    {
      id: 'ines_s4',
      world: 'A',
      domain: 'travail',
      context: `Vendredi, 22h40. Garde de nuit en pédiatrie. Le service baigne dans cette lumière bleutée des veilleuses que tu connais par cœur — la couleur de l'insomnie hospitalière.

Yanis, 7 ans. Appendicite. Opéré ce matin. Sa mère est rentrée à 20h — elle a un autre enfant à la maison, pas de garde, pas le choix.

Il ne dort pas. Tu le vois depuis le couloir : assis dans son lit, il fixe la porte. Il a un doudou serré contre lui — un lapin gris qui a perdu une oreille.

Le protocole est clair : ronde toutes les deux heures, vérification des constantes, pas de stationnement prolongé dans les chambres.

Mais Yanis a 7 ans. Et il est seul. Et il a peur.

L'autre aile attend. Six patients. La sonnette de la 12 a déjà sonné deux fois.`,
      choices: [
        {
          id: 'rester',
          label: "Rester avec Yanis. Cinq minutes.",
          conditions: {},
          consequence: `Tu t'assois au bord du lit. Le matelas en plastique craque.

« Tu ne dors pas ? »

Il secoue la tête. Ses yeux sont immenses dans la pénombre.

« Maman revient demain. Tu veux que je te raconte un truc en attendant ? »

Il hoche la tête. Tu improvises. Un lapin gris qui perd son oreille dans une forêt et qui part la chercher. Tu ne sais pas d'où ça vient. Peut-être de nulle part. Peut-être de partout.

Il s'endort au bout de huit minutes. Tu restes encore deux minutes. La sonnette de la 12 sonne pour la troisième fois.

Tu te lèves. Le dos te rappelle à l'ordre. Mais quelque chose dans ta poitrine — un truc chaud, ancien — te dit que tu as fait ce pour quoi tu es là.

La cadre de nuit te croise dans le couloir. « T'étais où ? La 12 attend. »

Tu ne réponds pas.`,
          impact: { resources: 0, moral: 15, links: 10, comfort: -10 },
          setsFlag: 'ines_yanis',
        },
        {
          id: 'protocole',
          label: "Vérifier ses constantes et passer à la suite. Pas le temps.",
          conditions: {},
          consequence: `Tu entres. Tension, température, pouls. Tout est normal. Tu notes.

Yanis te regarde. « Tu restes ? »

« Je ne peux pas, bonhomme. J'ai d'autres patients. Essaie de dormir, d'accord ? »

Il ne dit rien. Il serre le lapin gris.

Tu fermes la porte. Tu vas à la 12, à la 14, à la 16. Tu fais ton travail. Tu le fais bien.

À 2h du matin, tu repasses devant la chambre de Yanis. Il dort. Le lapin est par terre. Tu le ramasses, tu le recoins contre lui. Il ne se réveille pas.

Ta gorge se serre. Tu continues. La nuit est longue. Tu es efficace. Tu es morte à l'intérieur.`,
          impact: { resources: 5, moral: -20, links: -5, comfort: 5 },
          setsFlag: null,
        },
        {
          id: 'appeler',
          label: "Appeler la mère de Yanis. Elle devrait savoir.",
          conditions: {
            requiresMinStat: { moral: 35 }
          },
          blockedText: "Appeler une mère à 23h ? Tu imagines le regard de Marc si ça remonte. Non.",
          consequence: `Tu hésites. Le protocole ne dit rien sur les appels nocturnes. Mais il ne les interdit pas non plus.

Tu appelles. Trois sonneries.

« Allô ? Yanis ? Il va bien ? » La voix est paniquée. Immédiate. La voix d'une mère qui attend le pire.

« Tout va bien, madame. Yanis va bien. Mais il ne dort pas, et je me disais que peut-être votre voix l'aiderait. »

Silence. Puis : « Vous pouvez lui mettre le haut-parleur ? »

Tu mets le téléphone contre l'oreille de Yanis. Tu entends la voix de sa mère — douce, une berceuse peut-être. Tu ne restes pas. Tu refermes la porte.

Le lendemain, la mère est là à 8h. Elle te cherche dans le couloir.

« Merci. »

Un seul mot. Il pèse plus que les 180 euros du week-end.`,
          impact: { resources: 0, moral: 20, links: 15, comfort: 0 },
          setsFlag: 'ines_yanis',
          // Cross-flag : Nadia (mère de Yanis) — reconnaissance
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 5 — Monde B — Travail / Soin
    // La sortie de Yanis. Continuité des soins.
    // Ce que ça fait quand le système fonctionne.
    // (Ou quand tu dois quand même choisir.)
    // ──────────────────────────────────────────
    {
      id: 'ines_s5',
      world: 'B',
      domain: 'travail',
      context: `Samedi, 14h. Yanis sort aujourd'hui. Sa mère est arrivée tôt — elle a l'air reposée. Le service de garde d'enfants à horaires décalés a pris en charge son fils aîné cette nuit. Elle a dormi.

Tu prépares la sortie. Le nouveau protocole prévoit un « entretien de liaison » : quinze minutes avec la famille pour expliquer les soins de suite, le suivi kiné, les signaux d'alerte.

Mais tu as aussi Mme Garnier en 8, qui vient de faire une chute, et le nouveau patient en 3 qui arrive dans une heure.

L'infirmière de liaison n'est pas là — congé maladie. Personne ne l'a remplacée.

Quinze minutes. C'est rien. Mais c'est aussi tout.`,
      choices: [
        {
          id: 'entretien',
          label: "Prendre les quinze minutes. Yanis mérite un vrai suivi.",
          conditions: {},
          consequence: `Tu t'assois avec la mère de Yanis. Nadia — elle s'appelle Nadia. Tu ne le savais pas.

Tu expliques : la cicatrice, les gestes à éviter, le kiné. Tu écris le numéro du Centre de Santé de Villebourbon sur un post-it.

« Si quelque chose vous inquiète, appelez-les. Ils connaissent le dossier — tout est dans le système partagé maintenant. »

Nadia range le post-it dans son portefeuille. Soigneusement. Comme un talisman.

Yanis te montre son dessin. Un bonhomme avec des cheveux noirs et une blouse verte. « C'est toi. »

Tu ris. Tu as les larmes aux yeux mais tu ris.

Tu retournes dans le service avec vingt minutes de retard. Mme Garnier t'attend. Tu cours. Mais tu cours avec quelque chose de léger dans la poitrine.`,
          impact: { resources: -5, moral: 20, links: 15, comfort: -5 },
          setsFlag: 'ines_liaison',
        },
        {
          id: 'rapide',
          label: "Faire l'entretien en cinq minutes. L'essentiel, pas plus.",
          conditions: {},
          consequence: `Tu donnes les papiers à Nadia. « Voilà les consignes. Si quelque chose ne va pas, appelez le 15. »

Elle hoche la tête, un peu perdue. Tu vois qu'elle a des questions. Mais Mme Garnier attend, le nouveau patient arrive, et l'horloge ne s'arrête pas pour les bonnes intentions.

Tu pars. Yanis te fait un signe de la main.

Le soir, tu repenses à Nadia. Est-ce qu'elle a compris les consignes pour la cicatrice ? Est-ce qu'elle sait qu'il ne doit pas courir pendant trois semaines ? Tu n'es pas sûre d'avoir dit ça.

Tu te dis que tu aurais pu. Que quinze minutes, c'était possible. Que tu les as données à Mme Garnier, ces quinze minutes. Et que Mme Garnier n'avait rien de grave.`,
          impact: { resources: 5, moral: -15, links: -10, comfort: 5 },
          setsFlag: null,
        },
        {
          id: 'deleguer',
          label: "Demander à Fatima de prendre Mme Garnier pendant que tu fais l'entretien.",
          conditions: {
            requiresMinStat: { links: 35 },
            requiresFlag: 'ines_yanis'
          },
          blockedText: "Tu ne te sens pas légitime à demander. Ou Yanis ne te connaît pas assez pour que ça ait du poids.",
          consequence: `Tu croises Fatima dans le couloir.

« Fatima, tu peux prendre Mme Garnier vingt minutes ? Je fais la liaison pour le petit qui sort. »

Elle te regarde. Elle est fatiguée — elle est toujours fatiguée. Mais elle voit ta tête. Elle voit que c'est important.

« Vas-y. Mais tu me revaudras ça. »

L'entretien dure vingt-cinq minutes. Tu prends le temps. Nadia pose toutes ses questions. Yanis montre son dessin au lapin à une oreille.

Quand tu reviens, Fatima a géré Mme Garnier et accueilli le nouveau patient. Elle te lance un regard épuisé mais complice.

« C'est ça, le collectif, non ? »

Tu hoches la tête. C'est ça. C'est exactement ça.`,
          impact: { resources: 0, moral: 25, links: 20, comfort: 0 },
          setsFlag: 'ines_liaison',
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 6 — Monde A — Travail / Politique
    // Le courrier collectif. Signer ou pas.
    // La frontière entre résister et se mettre en danger.
    // ──────────────────────────────────────────
    {
      id: 'ines_s6',
      world: 'A',
      domain: 'travail',
      context: `Dimanche, 13h. Pause déjeuner au réfectoire. L'odeur de blanquette tiède, le bruit des couverts en inox.

Fatima pose une feuille devant toi. Un courrier adressé à la direction de l'hôpital et à l'ARS. Quatre pages. Tu parcours.

« ...conditions de travail dégradées... ratio soignant/patient non conforme... risques psychosociaux documentés... demandons le recrutement immédiat de trois aides-soignantes et la réparation du matériel défectueux... »

En bas, quinze signatures. Des noms que tu connais. Fatima. Aïcha. Le Dr. Morel. L'interne qui t'a vue aux urgences.

Fatima te regarde. « On a besoin de toi, Inès. Plus on est nombreux, plus c'est dur de nous ignorer. »

Tu lis la dernière ligne : « Copie à la presse locale. »

La presse. Ce n'est plus un courrier interne. C'est une déclaration de guerre.

Marc passe dans le couloir. Il ne voit pas la feuille. Pas encore.`,
      choices: [
        {
          id: 'signer',
          label: "Signer. Tu en as assez de serrer les dents.",
          conditions: {
            requiresMinStat: { moral: 30 }
          },
          blockedText: "Tu n'as plus la force. Tu as peur. Tu baisses les yeux.",
          consequence: `Tu prends le stylo. Ta main ne tremble pas. Tu signes.

Fatima serre ta main sous la table.

Le courrier part le jeudi. Vendredi, le directeur convoque Marc. Marc convoque l'équipe. L'ambiance est glaciale.

« Je ne sais pas qui a eu cette idée, mais sachez que les courriers à la presse, ça a des conséquences. »

Il ne dit pas lesquelles. Il n'a pas besoin. Tu les imagines très bien.

Mais le soir, en rentrant à vélo, tu pédales plus léger. Comme si la signature avait ôté un poids que tu portais depuis des mois. Le poids du silence.

Le journal local publie un article trois jours plus tard. Deux lignes. Noyées entre les résultats sportifs et la fête du cassoulet. Mais elles existent.`,
          impact: { resources: -10, moral: 20, links: 15, comfort: -5 },
          setsFlag: 'ines_courrier',
        },
        {
          id: 'pasigner',
          label: "Ne pas signer. Tu ne peux pas te permettre d'être dans le viseur.",
          conditions: {},
          consequence: `« Désolée, Fatima. Je peux pas. Si ça remonte... »

Elle range la feuille. Son visage se ferme une seconde, puis elle hoche la tête.

« Je comprends. »

C'est le « je comprends » qui te tue. Le même que celui de ta sœur. Celui qui veut dire : tu as le droit, mais je suis déçue.

Le courrier part sans toi. L'article paraît sans toi. Tes collègues n'en parlent pas devant toi — pas par méchanceté, mais parce que tu n'es pas dans le cercle.

Tu travailles. Tu fais tes gardes. Tu tiens. Mais la cantine, le couloir, la machine à café — il y a maintenant deux mondes dans le service. Ceux qui ont signé, et les autres.

Tu es dans les autres.`,
          impact: { resources: 5, moral: -20, links: -15, comfort: 5 },
          setsFlag: 'ines_pasigne',
        },
        {
          id: 'anonyme',
          label: "Proposer de rester anonyme dans le courrier.",
          conditions: {
            requiresMinStat: { links: 30 }
          },
          blockedText: "Tu n'oses pas demander un traitement de faveur. C'est tout le monde ou personne.",
          consequence: `« Fatima. Je suis d'accord sur le fond. Mais si mon nom apparaît dans un courrier à la presse, avec Marc... j'ai peur. »

Fatima réfléchit. « On peut te mettre en "et 4 signataires anonymes". La direction saura pas qui. Mais ça fait un nom de moins en clair. »

Tu hésites. C'est lâche ? C'est prudent ? La frontière est floue.

Tu signes. En anonyme. Tu te sens comme quelqu'un qui crie dans une foule — personne ne sait que c'est toi, mais le bruit est là.

Le courrier part. L'article paraît. Tes collègues te regardent comme avant. Tu es dans le cercle sans y être.

C'est un compromis. Il a le goût de tous les compromis : ni bon ni mauvais. Tiède.`,
          impact: { resources: 0, moral: 5, links: 5, comfort: 0 },
          setsFlag: 'ines_courrier_anonyme',
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 7 — Monde B — Travail / Collectif
    // La réunion du Collectif Soignant.
    // Le moment où la parole devient un outil.
    // ──────────────────────────────────────────
    {
      id: 'ines_s7',
      world: 'B',
      domain: 'travail',
      context: `Lundi, 17h30. Salle de réunion au rez-de-chaussée. Le Collectif Soignant se réunit une fois par mois — depuis six mois, c'est inscrit dans le règlement intérieur. Temps de travail effectif, pas bénévole. Payé.

Autour de la table : Fatima, Aïcha, le Dr. Morel, deux infirmières, un brancardier, et toi. Marc est là aussi — c'est nouveau, les cadres participent maintenant.

L'ordre du jour : le pool de remplaçants. L'idée est simple — une liste de soignants intérimaires formés, mutualisée entre les services, financée par l'ARS. Quand quelqu'un tombe malade, on puise dans le pool. Plus de sous-effectif chronique.

Fatima présente le dossier. C'est solide. Chiffres, plannings, budget.

Marc lève la main. « Le budget, justement. L'ARS a validé 60% du financement. Il manque 40%. La direction propose de le prendre sur la prime de fin d'année. »

Silence.

Ta prime de fin d'année, c'est 400 euros. C'est le vélo neuf que tu voulais. C'est le week-end chez ta sœur que tu t'étais promis.`,
      choices: [
        {
          id: 'accepter_pool',
          label: "Accepter. Le pool de remplaçants, ça vaut ta prime.",
          conditions: {},
          consequence: `Tu respires un grand coup. « Quatre cent euros contre ne plus finir mes gardes en pleurant dans le vestiaire ? Je signe. »

Silence. Puis Fatima rit. Aïcha aussi. Même Marc a un demi-sourire.

Le vote passe. 6 pour, 1 contre (le brancardier qui a trois gosses), 1 abstention.

Le pool est créé. Les trois premiers mois, tu sens la différence. Quand Aïcha est malade, une remplaçante arrive. Formée. Pas perdue. Tu ne fais plus le travail de deux personnes.

C'est pas le paradis. La remplaçante ne connaît pas Mme Garnier. Elle ne sait pas que M. Toussaint refuse de manger si on ne lui parle pas de foot. Mais elle est là.

Le vélo attendra. Ta sœur comprend. Et toi, tu respires un peu mieux.`,
          impact: { resources: -15, moral: 25, links: 20, comfort: 10 },
          setsFlag: 'ines_pool',
        },
        {
          id: 'refuser_pool',
          label: "Voter contre. La direction doit trouver l'argent autrement.",
          conditions: {},
          consequence: `« Non. L'ARS doit financer à 100%. C'est pas à nous de payer pour que l'hôpital fonctionne normalement. »

Marc te regarde. « En théorie, oui. En pratique, le budget est voté. C'est ça ou rien pour cette année. »

Le vote passe quand même — 5 pour, 2 contre (toi et le brancardier). Fatima te regarde avec un air compliqué. Pas de reproche. Mais de la lassitude.

Le pool est créé. Tu en bénéficies comme les autres. Les remplaçants arrivent quand il faut. La charge diminue.

Mais ta prime est amputée quand même. Et tu n'as pas voté pour. Tu en profites sans y avoir consenti.

Le sentiment qui reste, c'est celui du passager clandestin. Pas agréable.`,
          impact: { resources: -10, moral: -10, links: -10, comfort: 10 },
          setsFlag: null,
        },
        {
          id: 'parole',
          label: "Prendre la parole. Proposer un autre financement.",
          conditions: {
            requiresMinStat: { moral: 40, links: 35 }
          },
          blockedText: "Tu n'as pas l'énergie ni le réseau pour prendre cette parole.",
          consequence: `Tu lèves la main. Le cœur bat. Tu n'as jamais pris la parole en réunion. Pas comme ça.

« Et si on allait chercher les 40% ailleurs ? Il y a le fonds d'amélioration des conditions de travail — le FACT. On y a droit. Ça prend trois mois mais c'est faisable. »

Silence. Le Dr. Morel te regarde par-dessus ses lunettes. « Comment tu sais ça ? »

Tu ne sais pas comment tu sais ça. Tu l'as lu quelque part. Ou Fatima l'a mentionné un jour. Ou c'est la Dr. Benali du centre de santé qui en a parlé.

Marc prend des notes. « Je vérifie et je reviens vers vous. »

Deux semaines plus tard, la demande FACT est déposée. Trois mois après, le financement tombe. Le pool est créé. La prime est préservée.

Fatima te serre dans ses bras dans le couloir. « C'est toi qui as débloqué ça. »

Toi. Inès. Aide-soignante. Tu as débloqué quelque chose.`,
          impact: { resources: 0, moral: 30, links: 25, comfort: 5 },
          setsFlag: 'ines_parole',
        }
      ]
    }
  ]
},

  // ============ CLÉMENT - Cadre Airbus ============
  clement: {
  id: 'clement',
  name: 'Clément',
  age: 46,
  role: 'Responsable programme chez Airbus',
  description: "Ingénieur Arts et Métiers. 18 ans chez Airbus. Un pavillon à Montauban, une femme enseignante, deux enfants. Le TER de 6h52 chaque matin. Tu as fait les bons choix. Non ?",
  initialStats: { resources: 70, moral: 55, links: 50, comfort: 65 },
  // Note : Clément démarre haut. Il a plus à perdre.
  // Le jeu va le frotter au réel qu'il évitait.
  scenes: [

    // ──────────────────────────────────────────
    // SCÈNE 0 — Monde A — Transports / Travail
    // Le TER. Le rituel qui se fissure.
    // ──────────────────────────────────────────
    {
      id: 'clement_s0',
      world: 'A',
      domain: 'transports',
      context: `6h47. Gare de Montauban Ville-Bourbon. Le quai sent le métal froid et le café tiède du distributeur. Le panneau d'affichage clignote.

« TER 872541 — Toulouse Matabiau — Retard estimé : 45 min. »

Quarante-cinq minutes. Tu as un comité de pilotage à 8h30. Le genre de réunion où ton absence se remarque.

Autour de toi, les habitués. Le type en bleu de travail qui fixe ses chaussures. La fille avec le casque Bose qui ferme les yeux. Le vieux prof qui lit Le Monde debout, comme chaque matin depuis dix ans.

Tu pourrais attendre. Tu pourrais prendre la voiture — elle est garée à 300 mètres, tu as toujours un plan B.

Le plan B, c'est 55 minutes sur l'A62, 15 euros de péage, 8 euros de parking. Et le sentiment familier de perdre une bataille contre un système que personne n'a l'air de vouloir réparer.

Ton téléphone vibre. Mail de ton chef : « Clément, tu as les slides pour le COPIL ? »`,
      choices: [
        {
          id: 'attendre',
          label: "Attendre le TER. Tu as choisi ce mode de vie.",
          conditions: {},
          consequence: `Tu t'assois sur le banc métallique. Le froid remonte par le pantalon.

Tu travailles sur ton laptop. Les slides du COPIL. Les chiffres du programme A321. Le retard de livraison du fournisseur polonais. Les problèmes des autres, cadrés dans des rectangles PowerPoint.

Le TER arrive avec 52 minutes de retard. Tu rates le COPIL. Ton chef te transfère le compte-rendu avec un commentaire sec : « Dommage pour le retard. »

Dommage. C'est un mot qui dit beaucoup de choses dans la culture Airbus. Ça dit : tu as déçu. Ça dit : ne recommence pas.

Le soir, en attendant le TER retour (14 minutes de retard — presque normal), tu te demandes combien de temps tu peux continuer à défendre un choix de vie que personne autour de toi ne comprend.`,
          impact: { resources: -5, moral: -15, links: -5, comfort: -5 },
          setsFlag: null,
        },
        {
          id: 'voiture',
          label: "Prendre la voiture. Le COPIL n'attend pas.",
          conditions: {},
          consequence: `Tu marches jusqu'au parking. Le moteur du SUV démarre au quart de tour. Climatisation, Bluetooth, podcast sur le management agile.

L'A62 est fluide à cette heure. Tu arrives à 7h50, trente minutes d'avance. Le parking souterrain d'Airbus sent le béton propre et l'argent.

Le COPIL se passe bien. Tes slides sont carrées. Ton chef hoche la tête.

Le soir, tu fais les comptes. 23 euros de trajet. Péage, essence, parking. Tu les ajoutes aux 23 de mardi, aux 23 de la semaine dernière.

Sophie — ta femme — regarde le relevé bancaire.

« Tu as repris la voiture ? »

« Le TER avait 45 minutes de retard. »

« Je sais. Mais on avait dit... »

Vous aviez dit. Beaucoup de choses que vous aviez dites. Le TER, c'est pas que du transport. C'est un symbole. Celui d'une vie que vous vouliez. Et chaque fois que tu prends la voiture, le symbole s'effrite un peu.`,
          impact: { resources: -15, moral: 5, links: -5, comfort: 10 },
          setsFlag: 'clement_voiture',
        },
        {
          id: 'teletravail',
          label: "Envoyer un mail : tu fais le COPIL en visio depuis la gare.",
          conditions: {
            requiresMinStat: { moral: 50 }
          },
          blockedText: "Tu n'oses pas. Chez Airbus, le présentiel, c'est politique. L'absence, c'est un message.",
          consequence: `Tu t'installes au café de la gare. Wifi acceptable. Tu branches la visio sur ton laptop, AirPods enfoncés, le bruit de la machine à expresso en fond.

« Désolé pour le cadre. TER retardé de 50 minutes. »

Ton chef fronce les sourcils. Deux collègues coupent leur caméra. Tu présentes tes slides avec le serveur qui passe derrière toi.

C'est professionnel. C'est un peu humiliant. Mais tu n'as pas perdu 23 euros et tu n'as pas trahi le deal avec Sophie.

Le soir, ton chef t'appelle. « Clément. La visio depuis un café, c'est pas sérieux. On est en phase critique sur l'A321. J'ai besoin de toi sur site. »

Tu ne dis rien. Tu penses : j'ai besoin, moi aussi. De quoi, exactement — tu ne sais pas encore.`,
          impact: { resources: 0, moral: -10, links: -10, comfort: 5 },
          setsFlag: 'clement_visio',
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 1 — Monde B — Transports
    // Le TER fonctionne. Et ce que ça change.
    // ──────────────────────────────────────────
    {
      id: 'clement_s1',
      world: 'B',
      domain: 'transports',
      context: `6h48. Gare de Montauban. Le panneau affiche :

« TER 872541 — Toulouse Matabiau — À l'heure. »

Tu te surprends à sourire. C'est bête — un train à l'heure ne devrait pas être un événement. Mais après des mois de cadençage renforcé (un train toutes les 20 minutes aux heures de pointe), l'habitude s'installe.

Sur le quai, plus de monde qu'avant. La fille au casque Bose est toujours là. Le vieux prof aussi. Mais il y a des nouveaux — des gens qui avaient abandonné le train.

Tu montes. Tu t'assois. Tu ouvres ton laptop. 42 minutes jusqu'à Matabiau. C'est ton bureau mobile.

Sophie t'a envoyé un message : « N'oublie pas la réunion parents-profs à 18h. Émile a des soucis en maths. »

18h. Ton TER retour est à 17h32. Ça passe. À condition de partir à l'heure.

Ton chef t'a aussi envoyé un mail : « Réunion prolongée probable ce soir. Sujet budgets 2027. »`,
      choices: [
        {
          id: 'parents',
          label: "Répondre à Sophie : tu seras là. Point.",
          conditions: {},
          consequence: `Tu réponds à ton chef : « Je dois partir à 17h25 pour un rendez-vous familial. Je peux envoyer mes inputs par mail avant. »

La réponse est laconique. « OK. »

Tu sais ce que ça veut dire. Tu sais que Benoît, lui, restera. Que la prochaine promotion se joue aussi dans ces réunions du soir. Que l'engagement, chez Airbus, se mesure en heures de présence, pas en qualité de travail.

Mais tu es à la réunion parents-profs à 18h02. Émile te voit arriver et sourit. L'enseignante t'explique les difficultés. C'est concret, c'est atteignable, c'est ton fils.

Dans le TER du retour, tu avais lu un article. Une étude sur les pères qui assistent aux réunions scolaires. Corrélation avec la réussite des enfants. Tu n'y avais pas cru. Maintenant, tu vois le sourire d'Émile et tu te dis que les corrélations, parfois, ce sont juste des histoires vraies.`,
          impact: { resources: -5, moral: 15, links: 15, comfort: 5 },
          setsFlag: 'clement_parents',
        },
        {
          id: 'rester',
          label: "Rester à la réunion. Sophie peut y aller seule.",
          conditions: {},
          consequence: `Tu écris à Sophie : « Réunion prolongée. Tu peux y aller ? Désolé. »

La réponse : « OK. »

Un OK sec. Tu connais ce OK. C'est le OK qui va te coûter trois jours de froid.

La réunion budgets 2027 dure jusqu'à 19h45. Ton chef te serre la main en sortant. « Merci d'être resté, Clément. On a besoin de gens fiables. »

Fiable. C'est le mot qu'il utilise. Le mot qui te gardait debout à 23 ans, fier comme un chêne. À 46, il a un goût de cendre.

Tu prends le TER de 20h12. La gare de Montauban est presque vide. Sophie dort quand tu arrives. Ou fait semblant.

Émile a eu 8 en maths. Tu ne le sais pas encore.`,
          impact: { resources: 10, moral: -15, links: -20, comfort: 0 },
          setsFlag: 'clement_reste',
        },
        {
          id: 'negocier',
          label: "Proposer à Sophie de venir à la réunion ensemble — toi en visio, elle sur place.",
          conditions: {
            requiresMinStat: { links: 45 }
          },
          blockedText: "Sophie et toi n'êtes plus au stade où on improvise des solutions ensemble.",
          consequence: `Tu appelles Sophie. « Écoute — je peux pas partir mais je peux me connecter en visio pendant la réunion parents-profs. Tu mets le haut-parleur, je suis là. »

Silence. Puis : « C'est débile. »

« Peut-être. Mais je serai là. »

L'enseignante est surprise. Un père en costume sur un écran de téléphone pendant qu'elle montre les cahiers. Mais elle joue le jeu.

Tu poses deux questions. Tu écoutes. Émile te fait coucou sur l'écran.

C'est imparfait. C'est bancal. C'est un compromis. Mais Sophie te dit le soir : « Au moins t'as essayé. »

C'est pas grand-chose. Mais en ce moment, « essayer » c'est le maximum que tu peux donner.`,
          impact: { resources: 5, moral: 5, links: 5, comfort: 0 },
          setsFlag: null,
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 2 — Monde A — Fiscalité / Éducation
    // L'école, l'argent, et les choix qu'on
    // ne pensait pas devoir faire.
    // ──────────────────────────────────────────
    {
      id: 'clement_s2',
      world: 'A',
      domain: 'education',
      context: `Samedi, 10h. Sophie te tend une lettre. Papier à en-tête de l'école publique.

« Suppression des dédoublements en CM2 à la rentrée. Effectifs portés à 32 élèves par classe. Suppression de l'intervenant musique. Budget périscolaire réduit de 40%. »

Tu lis deux fois. Émile est en CM1. L'année prochaine, c'est lui.

Sophie a déjà son téléphone en main. « Ma collègue met ses enfants à Saint-Martin. Le privé. 1800 euros l'année. »

1800 euros. Tu peux te le permettre. C'est pas le problème. Le problème, c'est ce que ça dit. Sur l'école publique. Sur Montauban. Sur les choix que vous avez faits en vous installant ici.

Léa, ta fille de 14 ans, est au collège public. Elle s'y plaît. Elle a ses amis. Mais le collège aussi perd des moyens.

Tu regardes la lettre. Le logo de la mairie est en haut à droite. Tu ne sais pas à qui il appartient. Tu ne sais pas à qui la colère devrait s'adresser.`,
      choices: [
        {
          id: 'prive',
          label: "Inscrire Émile dans le privé. Sa scolarité d'abord.",
          conditions: {},
          consequence: `Tu visites Saint-Martin un mercredi. Pelouse verte, tableau numérique, intervenant théâtre. La directrice est polie, efficace, souriante. Tout est propre.

Émile est inscrit. 1800 euros. Tu signes sans que la main tremble.

Le premier jour, il revient content. « Y'a un labo de sciences, papa ! Avec un vrai microscope ! »

Un vrai microscope. Le genre de truc qui devrait être dans toutes les écoles. Le genre de truc que tu paies maintenant parce que quelqu'un a décidé que ça n'avait pas de valeur.

Sophie est soulagée. Toi, tu ne sais pas. Tu penses à la classe de CM2 publique, avec ses 32 élèves et son budget raboté. Aux gamins qui y restent parce que leurs parents n'ont pas 1800 euros.

Tu as fait le choix rationnel. Celui que tout le monde fait. Celui qui vide l'école publique une famille à la fois.`,
          impact: { resources: -20, moral: -10, links: -15, comfort: 10 },
          setsFlag: 'clement_prive',
        },
        {
          id: 'public',
          label: "Garder Émile au public. Et se battre pour améliorer.",
          conditions: {
            requiresMinStat: { moral: 45 }
          },
          blockedText: "Tu n'as pas l'énergie de mener ce combat. Le privé, c'est plus simple.",
          consequence: `« On reste au public. »

Sophie te regarde. « T'es sûr ? Avec 32 par classe ? »

« On va se battre. Les parents d'élèves, le conseil d'école. On n'est pas les seuls à être furieux. »

Tu t'inscris à la FCPE. Tu assistes à ta première réunion. Douze parents dans une salle qui sent la craie. La directrice est épuisée mais reconnaissante.

Tu apprends des choses. Que la suppression des dédoublements vient d'une décision rectorale, pas municipale. Que la mairie a coupé le budget périscolaire de 40% pour financer la vidéosurveillance. Que le conseiller municipal en charge de l'éducation n'a pas d'enfants scolarisés.

Tu rentres chez toi en colère. Mais une colère utile — celle qui sait où frapper.

Émile est en CM2 avec 32 élèves. Il s'en sort. L'enseignante est formidable. Mais elle est seule.`,
          impact: { resources: -5, moral: 15, links: 20, comfort: -10 },
          setsFlag: 'clement_public',
        },
        {
          id: 'mixte',
          label: "Garder Émile au public cette année. Évaluer à Noël.",
          conditions: {},
          consequence: `« On attend. On regarde. Si ça va vraiment mal, on avise. »

Sophie n'est pas convaincue. « Tu temporises. Comme d'habitude. »

Elle a raison. C'est ce que tu fais. Tu temporises. Tu évalues. Tu reportes la décision. C'est ton métier — les décisions différées, les plans de contingence, les matrices de risques.

Sauf que c'est ton fils. Pas un programme Airbus.

Émile rentre chaque soir avec des devoirs. Il les fait. Il s'en sort. Rien de dramatique. Rien de brillant non plus.

À Noël, tu réévalues. Rien n'a changé. Tu repousses à Pâques. Sophie ne dit plus rien. C'est pire que quand elle argumentait.`,
          impact: { resources: 0, moral: -10, links: -5, comfort: 0 },
          setsFlag: null,
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 3 — Monde B — Éducation
    // L'école qui fonctionne. Le parent d'élève
    // qui découvre qu'on peut faire autrement.
    // ──────────────────────────────────────────
    {
      id: 'clement_s3',
      world: 'B',
      domain: 'education',
      context: `Mercredi, 14h. Réunion du conseil d'école. Depuis cette année, les réunions sont le mercredi après-midi — « pour que les parents qui travaillent puissent venir », a dit la directrice.

Tu n'étais jamais venu avant. Sophie y allait. Mais Sophie a un stage de formation ce mercredi.

La salle est pleine. Vingt parents. L'enseignant de CM1 d'Émile. La directrice. Et une élue municipale — une petite brune qui prend des notes.

Sujet du jour : le projet « Cour Oasis ». Végétalisation de la cour, points d'eau, coin calme. Budget municipal + budget participatif des parents.

L'enseignant montre des photos d'autres écoles. Des arbres, de l'ombre, des bancs en bois. Émile, assis à côté de toi, murmure : « Trop bien. »

L'élue prend la parole. « Le budget municipal couvre 70%. Les 30% restants, on les soumet au vote des parents. Si le projet est retenu au budget participatif, on lance les travaux à la Toussaint. »

Un père lève la main. « Et si c'est pas retenu ? »

« Alors on fait avec ce qu'on a. Comme avant. »`,
      choices: [
        {
          id: 'impliquer',
          label: "Proposer tes compétences. Tu sais gérer un budget et un planning.",
          conditions: {},
          consequence: `Tu lèves la main. « Je suis responsable programme chez Airbus. La gestion de projet, c'est mon métier. Je peux aider à structurer le dossier pour le budget participatif. »

Silence. L'élue te regarde avec un mélange de surprise et d'intérêt.

« Vendu. »

Tu passes les deux semaines suivantes à faire du Airbus pour l'école de ton fils. Diagramme de Gantt. Budget prévisionnel. Analyse de risques. L'enseignant hallucine. « C'est plus carré que nos dossiers rectoraux. »

Le projet est retenu. Deuxième sur 14 propositions. Émile saute dans tes bras à l'annonce.

C'est bizarre. Tu pilotes des programmes à 200 millions d'euros. Mais c'est un projet de cour d'école à 15 000 euros qui te donne le sentiment d'avoir fait quelque chose d'utile.`,
          impact: { resources: -10, moral: 25, links: 20, comfort: 5 },
          setsFlag: 'clement_ecole',
        },
        {
          id: 'voter',
          label: "Voter pour le projet. Mais pas plus.",
          conditions: {},
          consequence: `Tu votes. Émile est content. Tu repars.

Les semaines passent. D'autres parents portent le projet. Le dossier est moins carré que ce que tu aurais fait. Mais il passe quand même — quatrième sur 14.

Les travaux commencent. Émile te raconte chaque jour l'avancement. « Aujourd'hui ils ont planté un arbre, papa ! Un vrai ! »

Tu hoches la tête. Tu es content pour lui. Mais quelque chose gratte. Le sentiment d'avoir été spectateur d'un truc qui te concernait.

Sophie le dit mieux : « Tu aurais pu les aider. Ils avaient besoin de quelqu'un qui sait structurer. »

Elle a raison. Comme souvent. Mais le TER, le COPIL, les budgets 2027 — le temps, ce capital que personne ne fabrique.`,
          impact: { resources: 0, moral: 0, links: 5, comfort: 0 },
          setsFlag: null,
        },
        {
          id: 'critiquer',
          label: "Poser des questions sur la gouvernance. Qui décide vraiment ?",
          conditions: {
            requiresMinStat: { moral: 50 }
          },
          blockedText: "Tu ne te sens pas légitime. Tu n'es jamais venu aux réunions avant.",
          consequence: `« J'ai une question. Qui décide de la répartition budgétaire ? Les parents votent, d'accord. Mais qui fixe le cadre ? Qui choisit les 14 projets sur lesquels on vote ? »

L'élue te regarde. « La commission participative. Cinq élus, cinq citoyens tirés au sort. »

« Et les critères ? »

« Publics. Sur le site de la mairie. »

Tu la pousses encore. « Et si un projet gros porteur monopolise le budget au détriment des petits ? Vous avez un mécanisme de rééquilibrage ? »

Elle sourit. « Vous êtes ingénieur, non ? »

« Ça se voit tant que ça ? »

La salle rit. L'élue te propose de rejoindre le comité de suivi. Tu acceptes. C'est un rôle que tu connais — celui qui pose les bonnes questions au mauvais moment.`,
          impact: { resources: -5, moral: 15, links: 15, comfort: 0 },
          setsFlag: 'clement_comite',
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 4 — Monde A — Travail
    // Restructuration. Le mot que personne
    // ne prononce mais que tout le monde entend.
    // ──────────────────────────────────────────
    {
      id: 'clement_s4',
      world: 'A',
      domain: 'travail',
      context: `Mardi, 14h30. Convocation RH. Bureau sans fenêtre au deuxième étage. Tu connais ce bureau — c'est là que Benoît a appris pour son reclassement l'an dernier.

La DRH a le sourire poli des mauvaises nouvelles.

« Clément. Merci d'être venu. Dans le cadre du plan de transformation industrielle, certains programmes sont réorganisés. Votre poste de responsable programme A321 est... repositionné. »

Repositionné. Pas supprimé. Repositionné. Tu décodes le jargon RH comme un vétéran démine un champ. « Repositionné » veut dire : ton poste existe encore, mais à Hambourg.

« Vous avez trois options. Mobilité vers Hambourg. Reclassement sur un autre programme — il y a un poste de chef de lot sur l'A350, même coefficient. Ou... le dispositif de départ volontaire. »

Hambourg. Reclassement. Départ.

Sophie. Émile. Léa. Le pavillon. Le TER. Les choix que tu as faits.

Tu sens tes mains sur les accoudoirs. Tu les serre.`,
      choices: [
        {
          id: 'reclassement',
          label: "Accepter le reclassement. Tu restes. Tu recules.",
          conditions: {},
          consequence: `Chef de lot. Un cran en dessous. Même salaire — pour l'instant. La promesse de « retrouver un niveau équivalent à moyen terme ». Tu sais ce que ça vaut.

Tu rentres le soir. Sophie te regarde.

« Alors ? »

« Je reste à Toulouse. Sur un autre programme. C'est... un ajustement. »

Elle entend ce que tu ne dis pas. Elle s'approche. Elle te serre.

Les premiers jours sur l'A350 sont humiliants. Tu as 18 ans d'expérience. Le chef de programme en a 8. Il t'explique des choses que tu faisais avant sa sortie d'école.

Tu serres les dents. Tu apprends le nouveau programme. Tu te tais en réunion. Le soir, tu rentres par le TER et tu regardes Montauban défiler par la fenêtre. Ta ville. Tes choix. Ton compromis.`,
          impact: { resources: -5, moral: -25, links: 0, comfort: 5 },
          setsFlag: 'clement_reclassement',
        },
        {
          id: 'depart',
          label: "Étudier le dispositif de départ. Peut-être que c'est une porte.",
          conditions: {
            requiresMinStat: { moral: 50 }
          },
          blockedText: "Quitter Airbus ? Tu ne sais faire que ça. Tu n'y penses même pas.",
          consequence: `Tu demandes les détails. Le dispositif est correct : 18 mois de salaire, portage salarial pendant la transition, bilan de compétences financé.

Tu rentres avec la brochure. Sophie la lit en silence.

« Tu ferais quoi ? »

La question tombe comme un bloc de béton. Tu ferais quoi ? 46 ans, ingénieur aéro, une seule boîte au CV. Tu ferais quoi ?

Tu ne dors pas de la nuit. Tu fais des listes. Consultant indépendant. Professeur en école d'ingénieurs. Reconversion. Le mot te fait peur.

Au bout d'une semaine, tu retournes à la RH. « Je garde l'option ouverte. Donnez-moi le bilan de compétences. »

C'est pas un oui. C'est pas un non. C'est la première fois depuis 18 ans que tu envisages une vie sans badge Airbus. L'abîme et le vertige, en même temps.`,
          impact: { resources: 0, moral: 10, links: 0, comfort: -15 },
          setsFlag: 'clement_depart',
        },
        {
          id: 'negocier_poste',
          label: "Refuser les trois options. Négocier autre chose.",
          conditions: {
            requiresMinStat: { links: 45 }
          },
          blockedText: "Tu n'as pas le réseau interne pour négocier hors cadre.",
          consequence: `« Ces trois options ne me conviennent pas. Mon expertise, c'est la gestion de programme sur la famille A320. Je veux un poste équivalent à Toulouse. »

La DRH hausse un sourcil. « Il n'y en a pas, Clément. »

« Il y en aura. Le ramp-up de l'A321XLR est dans 18 mois. Vous allez recruter des responsables programme. Je veux être en haut de la liste. »

Tu sors ton téléphone. Trois SMS à des collègues bien placés, envoyés pendant la réunion. Le réseau. Ce truc invisible que tu as construit en 18 ans de cafés, de pots de départ et de séminaires à Arcachon.

Ça prend trois semaines. Mais un mail arrive : « Mission de transition, six mois, support au programme A321XLR. Même coefficient. Sujet à confirmation pour le poste définitif. »

C'est pas gagné. Mais c'est pas perdu. Tu as joué ta carte. Le réseau a tenu.`,
          impact: { resources: -5, moral: 15, links: -10, comfort: 0 },
          setsFlag: 'clement_negocie',
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 5 — Monde B — Écologie / Logement
    // La rénovation énergétique. Quand la
    // transition écologique arrive chez toi.
    // ──────────────────────────────────────────
    {
      id: 'clement_s5',
      world: 'B',
      domain: 'logement',
      context: `Samedi, 9h. Lettre recommandée de la mairie.

« Diagnostic de Performance Énergétique — Obligation de rénovation. Votre habitation classée E au DPE doit atteindre la classe C avant le 31/12/2028. Aides disponibles : MaPrimeRénov' bonifiée + Éco-prêt à taux zéro + accompagnement technique municipal gratuit. »

Tu lis les chiffres. Isolation des combles : 8 000 euros. Pompe à chaleur : 14 000. Fenêtres double vitrage (les six) : 6 000. Total : 28 000 euros. Aides déductibles : 16 000. Reste à charge : 12 000.

12 000 euros. Le prix d'une voiture. Le prix d'une année de privé pour Émile et Léa.

Sophie lit par-dessus ton épaule. « C'est obligatoire ? »

« En 2028, oui. Si on ne le fait pas, on ne peut plus louer le bien. Et la valeur immobilière chute. »

Tu regardes ta maison. Les murs en brique. Les volets en bois que tu as repeints toi-même. Le jardin. L'abricotier qu'Émile a planté.

C'est ta maison. Et quelqu'un te dit de la changer.`,
      choices: [
        {
          id: 'renover',
          label: "Lancer la rénovation. C'est le bon moment avec les aides.",
          conditions: {
            requiresMinStat: { resources: 55 }
          },
          blockedText: "12 000 euros de reste à charge. Tu n'as pas cette marge en ce moment.",
          consequence: `Tu appelles le service municipal d'accompagnement. Un technicien vient le mercredi suivant. Il est compétent, pas commercial — il ne vend rien.

« Votre maison est typique du pavillonnaire des années 90. Bonne structure, isolation catastrophique. On peut faire les combles et la PAC cette année, les fenêtres l'année prochaine. Ça étale le reste à charge. »

Tu signes. Les travaux commencent en octobre. Trois semaines de poussière, de bâches et de bruit.

Mais le premier hiver avec l'isolation, ta facture de gaz baisse de 40%. Sophie ne met plus deux pulls dans le salon. Émile fait ses devoirs sans gants.

12 000 euros. C'est un investissement. C'est aussi une soumission à une norme que tu n'as pas choisie. Mais ta maison est chaude. Et tu te dis que chauffer correctement ta famille, c'est peut-être le début du bon sens.`,
          impact: { resources: -25, moral: 10, links: 5, comfort: 20 },
          setsFlag: 'clement_renove',
        },
        {
          id: 'reporter_reno',
          label: "Reporter à 2027. Tu as le temps.",
          conditions: {},
          consequence: `Tu ranges la lettre. 2028, c'est dans deux ans. Les aides seront peut-être meilleures. Ou les obligations assouplies. Ou le gouvernement changera.

Sophie te regarde. « Tu repousses. »

« Je temporise. »

« C'est la même chose, Clément. »

L'hiver arrive. La maison est froide comme d'habitude. Le gaz coûte cher comme d'habitude. Rien n'a changé.

Sauf que le voisin, lui, a fait les travaux. Sa maison ne ressemble plus à un frigo de novembre. Sa facture a baissé. Il te montre les chiffres avec un sourire qui ne dit pas « je suis meilleur que toi » mais qui le crie quand même.`,
          impact: { resources: 5, moral: -15, links: -5, comfort: -10 },
          setsFlag: null,
        },
        {
          id: 'collectif_reno',
          label: "Proposer une rénovation groupée avec les voisins. Négocier un meilleur prix.",
          conditions: {
            requiresMinStat: { links: 45 }
          },
          blockedText: "Tu ne connais pas assez tes voisins pour monter un projet collectif.",
          consequence: `Tu sonnes chez Jean-Marc (retraité, même lotissement), chez les Dupuis (famille avec trois enfants, maison jumelle à la tienne), et chez Mme Vidal (veuve, petite retraite, maison classée F).

Quatre maisons. Le technicien municipal calcule : en groupant les commandes, le reste à charge baisse de 20%.

Mais Mme Vidal ne peut pas payer. Même avec les aides.

Le technicien propose une solution : un « tiers-payant rénovation ». La mairie avance les frais pour les ménages modestes. Le remboursement se fait sur les économies d'énergie. Mme Vidal ne paie rien maintenant.

Tu coordonnes le projet. Tu fais du Airbus pour ton lotissement — planning, budget, suivi. C'est la deuxième fois en un mois que tes compétences servent à quelque chose de concret.

Sophie te regarde faire. « Tu es meilleur quand tu gères des trucs qui ont du sens. »

Tu ne sais pas quoi répondre. Parce qu'elle a raison.`,
          impact: { resources: -15, moral: 20, links: 25, comfort: 15 },
          setsFlag: 'clement_collectif',
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 6 — Monde A — Liens sociaux / Sécurité
    // Le voisinage. La peur. Et ce qu'elle fait
    // aux gens comme toi.
    // ──────────────────────────────────────────
    {
      id: 'clement_s6',
      world: 'A',
      domain: 'securite',
      context: `Dimanche, 8h. Sophie te montre son téléphone. Le groupe WhatsApp du lotissement. 47 messages depuis hier soir.

Une tentative de cambriolage chez les Dupuis. Fenêtre forcée, rien volé — le chien a aboyé. Mais tout le monde est en alerte.

Jean-Marc (le retraité d'en face, ancien gendarme) a déjà pris les choses en main : « Réunion ce soir chez moi. On met en place une surveillance citoyenne. J'ai contacté le conseiller municipal en charge de la sécurité — il vient avec des propositions. »

Tu lis les messages. Le ton monte vite. « C'est les gens du campement de la route de Toulouse. » « Il faut des caméras. » « On paie des impôts pour rien. »

Les gens du campement. Tu ne sais pas qui ils sont. Tu sais qu'il y a des caravanes, que ça fait six mois, que la mairie n'a rien fait. Ou tout fait. Tu ne sais pas.

Émile te regarde. « On va se faire cambrioler ? »

« Non, bonhomme. C'est chez les voisins. »

Il n'a pas l'air rassuré.`,
      choices: [
        {
          id: 'reunion',
          label: "Aller à la réunion. Tu veux comprendre.",
          conditions: {},
          consequence: `Le salon de Jean-Marc sent le cigare froid. Quinze voisins. Le conseiller municipal — un type trapu en polo — distribue des brochures « Voisins Vigilants ».

Jean-Marc veut des caméras. Le conseiller propose des rondes de police renforcées. Mme Vidal veut un mur.

Tu écoutes. Tu comptes les fois où quelqu'un dit « ces gens-là ». Sept.

Tu poses une question : « On sait qui a fait ça ? Il y a une plainte ? »

Jean-Marc te regarde. « On n'a pas besoin de plainte pour savoir. »

Tu rentres chez toi avec un autocollant « Voisins Vigilants » que tu ne colles pas. Le sentiment est trouble — tu veux protéger ta famille, mais la réunion ne parlait pas de protection. Elle parlait de territoire.

Le lendemain, tu croises un gamin du campement qui fait du vélo sur le trottoir. Il te fait un signe de tête. Tu lui rends. Jean-Marc, derrière son rideau, prend des notes.`,
          impact: { resources: 0, moral: -15, links: 10, comfort: -5 },
          setsFlag: 'clement_vigilants',
        },
        {
          id: 'ignorer_reunion',
          label: "Ne pas y aller. Tu n'aimes pas où ça va.",
          conditions: {},
          consequence: `Tu ne vas pas à la réunion. Sophie y va — « pour savoir ».

Elle revient une heure plus tard. Le visage fermé.

« C'est quoi ? »

« Ils veulent des rondes et des caméras. Jean-Marc a parlé du campement pendant vingt minutes. Le conseiller a promis une "action ferme". »

Tu soupires. « C'est du vent. »

« Non, Clément. C'est pas du vent. C'est eux qui décident du quartier dans lequel on vit. Et toi, tu n'étais pas là. »

Elle monte se coucher. Tu restes dans le salon. Le WhatsApp continue de vibrer. Des photos de voitures « suspectes ». Des points d'exclamation.

Tu ne dis rien. Tu ne fais rien. Et le quartier se transforme sans toi.`,
          impact: { resources: 0, moral: -10, links: -15, comfort: 5 },
          setsFlag: null,
        },
        {
          id: 'contrer',
          label: "Y aller et poser les faits. Quelqu'un doit calmer le jeu.",
          conditions: {
            requiresMinStat: { moral: 50, links: 40 }
          },
          blockedText: "Tu n'as ni l'énergie ni la légitimité dans ce groupe pour contredire le mouvement.",
          consequence: `Tu y vas avec ta tablette. Chiffres de la délinquance du quartier, téléchargés sur le site de la préfecture. Statistiques sur l'efficacité des caméras de surveillance. Article sur les « Voisins Vigilants » et les dérives documentées.

Jean-Marc n'est pas content. « Tu viens avec tes études ? On parle de nos familles ! »

« Justement. Je veux les protéger avec des faits, pas avec de la peur. »

Ça calme la salle. Pas tout le monde — Mme Vidal te regarde comme un traître. Mais trois voisins te soutiennent. Le conseiller municipal, lui, se tait. Il n'avait pas prévu qu'on lise les chiffres.

Tu ne gagnes rien. Les caméras seront installées. Mais tu as posé un doute. Un caillou dans la mécanique.

Le soir, Émile te dit : « T'as été courageux, papa. »

Tu ne sais pas si c'est vrai. Mais l'entendre, ça fait du bien.`,
          impact: { resources: -5, moral: 15, links: -5, comfort: 0 },
          setsFlag: 'clement_contreVigilants',
        }
      ]
    },

    // ──────────────────────────────────────────
    // SCÈNE 7 — Monde B — Citoyenneté
    // Le budget participatif. Le moment où tu
    // perds un vote — et ce que ça fait.
    // ──────────────────────────────────────────
    {
      id: 'clement_s7',
      world: 'B',
      domain: 'citoyennete',
      context: `Lundi, 19h. Salle polyvalente de Villebourbon. Assemblée citoyenne pour le budget participatif. Tu y es allé deux fois — ce soir c'est le vote final.

Les projets retenus : 14 propositions. Tu as porté le projet « Cour Oasis ». Il est en bonne position.

Mais il y a un autre projet : un jardin partagé au lotissement des Musiciens, porté par une association de quartier populaire. Le budget ne peut financer que 8 projets sur 14.

Le jardin et la Cour Oasis sont à la 7ème et 8ème place. L'un passera, l'autre non. Et les 200 personnes dans la salle vont voter.

Tu regardes la présentation du jardin. C'est bien. Des familles, des gamins, de la terre. Le type qui présente — la trentaine, accent du coin — est nerveux mais sincère.

Et puis tu penses à Émile. À l'abricotier. À ton dossier carré avec son diagramme de Gantt.

Dans la salle, il y a plus de gens des Musiciens que de ton quartier. Logique — c'est plus populaire, plus dense. La démocratie, c'est aussi ça : le nombre.`,
      choices: [
        {
          id: 'fair_play',
          label: "Voter pour le meilleur projet. Même si c'est pas le tien.",
          conditions: {
            requiresMinStat: { moral: 45 }
          },
          blockedText: "Lâcher ton projet après tout ce travail ? Tu n'y arrives pas.",
          consequence: `Tu votes pour le jardin partagé. Et pour la Cour Oasis en deuxième choix.

Le résultat tombe. Le jardin est 7ème. La Cour est 9ème. Éliminée.

Émile sera déçu. Toi aussi. Tu as passé des heures sur ce dossier.

Mais le type du jardin — il s'appelle Karim — vient te voir après. « J'ai vu ton projet. C'était solide. L'année prochaine, on le pousse ensemble. »

Ensemble. Le mot te surprend. Tu es cadre Airbus. Il est animateur social. Vous n'avez rien en commun — sauf une cour d'école et un jardin, et une salle polyvalente un lundi soir.

Tu lui serres la main. C'est le genre de poignée de main qui ne vaut rien sur un CV mais qui vaut quelque chose dans une vie.

Sophie, quand tu lui racontes, dit simplement : « C'est comme ça que ça devrait marcher. »`,
          impact: { resources: -5, moral: 20, links: 20, comfort: -5 },
          setsFlag: 'clement_fairplay',
        },
        {
          id: 'campaign',
          label: "Faire campagne pour ton projet. Tu as travaillé dessus.",
          conditions: {},
          consequence: `Tu prends la parole. Tes slides sont propres. Tes arguments sont carrés. Tu es bon à ça — convaincre.

Le vote tombe. La Cour est 7ème. Le jardin est 9ème.

Émile est aux anges. Toi, tu souris. Mais en sortant, tu croises le regard de Karim. Pas hostile. Juste... fatigué.

Son projet à lui, c'était pas des slides. C'était des familles qui n'ont pas de jardin. Des gamins qui jouent sur du béton.

Sophie te demande : « T'es content ? »

« Le projet a gagné. »

« C'est pas ce que je demande. »

Tu ne réponds pas. La victoire a le goût étrange de tous les arbitrages que tu fais au boulot : le meilleur argumentaire gagne, pas le besoin le plus urgent.

Tu te couches. Tu penses au jardin. Aux gamins sur le béton. Tu décides que l'année prochaine, tu soutiendras leur projet. Mais cette promesse-là, tu te la fais souvent.`,
          impact: { resources: -5, moral: -10, links: -10, comfort: 10 },
          setsFlag: 'clement_gagne',
        },
        {
          id: 'alliance',
          label: "Proposer à Karim de fusionner vos projets avant le vote.",
          conditions: {
            requiresMinStat: { links: 50 }
          },
          blockedText: "Tu ne connais pas Karim. Tu n'as pas la relation pour proposer ça.",
          consequence: `Tu t'approches de Karim pendant la pause.

« Et si on fusionnait ? Cour Oasis à l'école + jardin partagé aux Musiciens = un projet unique, plus gros, mieux classé. On demande un budget commun. »

Il te regarde. « Tu me proposes une alliance ? »

« Je te propose un meilleur projet. »

Il réfléchit. L'animatrice de l'association le rejoint. Ils discutent. Tu attends.

« OK. Mais le jardin passe en premier dans la présentation. C'est notre quartier qui en a le plus besoin. »

Tu acceptes. La Cour Oasis passe en deuxième.

Le projet fusionné finit 4ème. Financé. Le jardin ET la cour.

C'est le genre de solution que tu trouves au boulot tous les jours. Sauf qu'au boulot, personne ne te serre dans ses bras après. Karim, si.`,
          impact: { resources: -10, moral: 25, links: 25, comfort: 5 },
          setsFlag: 'clement_alliance',
        }
      ]
    }
  ]
},

  // ============ FRANÇOISE - Retraitée ============
  francoise: {
  id: 'francoise',
  name: 'Françoise',
  age: 72,
  role: 'Retraitée, ancienne bibliothécaire',
  description: "42 ans de bibliothèque municipale. Une retraite à 1340 euros. Un appartement rue de la Mairie, troisième étage sans ascenseur. Martine est morte il y a trois ans. Tu vis seule avec ses livres et un chat qui s'appelle Colette.",
  initialStats: { resources: 40, moral: 45, links: 30, comfort: 35 },
  scenes: [

    // S0 — Monde A — Isolement / Canicule
    {
      id: 'francoise_s0',
      world: 'A',
      domain: 'climat',
      context: `Mardi, 14h. 39°C. L'appartement est un four — les murs en brique du XVIIIe gardent la chaleur comme un reproche.

Tu as fermé les volets ce matin, comme on te l'a dit à la radio. L'obscurité aide un peu. Colette est étalée sur le carrelage de la cuisine, seul endroit frais.

Ta bouteille d'eau est tiède. Le ventilateur brasse de l'air chaud. Tu as mis une serviette mouillée sur ta nuque — le truc de Martine, celle qui avait toujours un plan.

Le téléphone sonne. Le numéro de la mairie.

« Madame Duval ? Registre canicule. On vérifie que vous allez bien. Vous avez besoin de quelque chose ? »

La voix est jeune, pressée. Elle a une liste. Tu es sur la liste.

Tu regardes l'appartement. Les livres. Colette. La photo de Martine sur le buffet.

Tu vas bien. Tu ne vas pas bien. Tu ne sais plus ce que ça veut dire.`,
      choices: [
        {
          id: 'bien',
          label: "Dire que tout va bien. Tu ne veux embêter personne.",
          conditions: {},
          consequence: `« Ça va, merci. J'ai de l'eau, j'ai fermé les volets. »

« Très bien. N'hésitez pas à appeler le 3975 si besoin. Bonne journée. »

Clic.

Tu reposes le téléphone. Bonne journée. À 39°C, seule, au troisième étage, avec des escaliers que tes genoux refusent de descendre plus d'une fois par jour.

Le soir, la température descend à 28. Tu ouvres les volets. L'air est lourd, immobile. Tu manges une salade de tomates devant le journal de 20h. Les urgences de Montauban sont saturées. Trois personnes âgées hospitalisées pour déshydratation.

Tu bois un grand verre d'eau. Par précaution. Par peur.`,
          impact: { resources: 0, moral: -20, links: -10, comfort: -15 },
          setsFlag: null,
        },
        {
          id: 'aide',
          label: "Demander s'il y a un endroit frais où aller.",
          conditions: {},
          consequence: `« Est-ce qu'il y a... un endroit climatisé ? Je suis au troisième sans ascenseur, je ne peux pas descendre et remonter plusieurs fois. »

Silence. La voix cherche dans ses fiches.

« Euh... il y a la médiathèque, mais elle ferme à 17h. Et le centre commercial Aussonne. Vous avez un moyen de transport ? »

Tu n'as pas de voiture. Le bus 3 passe au bout de la rue, mais l'arrêt est en plein soleil et tu ne sais pas si tu tiendras debout vingt minutes.

« Je vais me débrouiller. Merci. »

Tu ne te débrouilles pas. Tu restes. Colette miaule. Tu lui donnes de l'eau fraîche. Au moins elle, tu peux l'aider.

La nuit, tu dors mal. Tu penses à Martine. Elle aurait trouvé une solution. Elle trouvait toujours.`,
          impact: { resources: -5, moral: -15, links: -5, comfort: -10 },
          setsFlag: null,
        },
        {
          id: 'voisine',
          label: "Appeler ta voisine du dessous. Maryse.",
          conditions: {
            requiresMinStat: { links: 25 }
          },
          blockedText: "Tu n'as plus les numéros de personne. Depuis Martine, tu as laissé les liens s'effilocher.",
          consequence: `Maryse décroche. « Françoise ? Ça va ? »

« Il fait 40 degrés chez moi. »

« Monte — enfin, descends. J'ai la clim. Et j'ai fait du gaspacho. »

Tu descends un étage. Tes genoux protestent mais tu arrives. L'appartement de Maryse est frais, un peu trop, tu frissonnes. Le gaspacho est délicieux.

Vous parlez. De la chaleur. De l'immeuble. De Martine — Maryse l'aimait bien.

« Tu devrais descendre plus souvent, Françoise. Pas que quand il fait 40. »

Elle a raison. Tu le sais. Mais le troisième étage sans ascenseur, c'est pas qu'un problème physique. C'est un refuge. Descendre, c'est accepter de voir le monde sans Martine.`,
          impact: { resources: 0, moral: 15, links: 20, comfort: 15 },
          setsFlag: 'francoise_maryse',
        }
      ]
    },

    // S1 — Monde B — Liens / Canicule
    {
      id: 'francoise_s1',
      world: 'B',
      domain: 'climat',
      context: `Mardi, 11h. Coup de sonnette. Tu ouvres.

Une jeune femme. Vingt-cinq ans, cheveux courts, sac à dos. Badge : « Service Fraîcheur — Mairie de Montauban ».

« Bonjour madame. Je suis Leïla. On passe voir les personnes inscrites au registre canicule. Je vous apporte un kit — ventilateur brumisateur, bouteilles d'eau, et le numéro direct du service. Et si vous voulez, il y a une salle climatisée au centre social de Villebourbon. On fait la navette en minibus toutes les heures. »

Tu la regardes. Elle est essoufflée — troisième étage, pas d'ascenseur, en pleine chaleur.

« Vous êtes montée à pied ? »

Elle sourit. « Comme vous tous les jours. »`,
      choices: [
        {
          id: 'accepter_kit',
          label: "Accepter le kit et la navette. Pour une fois.",
          conditions: {},
          consequence: `Le minibus est climatisé. Dedans, quatre personnes. Un vieux monsieur avec un béret. Une dame avec un chien dans un sac. Un couple qui se tient la main.

Le centre social est frais. Il y a du thé glacé, des fauteuils, un écran qui passe un vieux film — « Les Demoiselles de Rochefort ». Tu ne l'avais pas revu depuis 1967.

Tu t'assois. Le monsieur au béret s'appelle Raymond. Il a 81 ans. Il était facteur. Il te parle de Montauban « avant ».

Tu lui parles de la bibliothèque. De Martine. Tu ne sais pas pourquoi — tu ne parles jamais de Martine aux inconnus.

« Elle était comment ? » demande Raymond.

« Drôle. Et têtue. Et elle lisait plus vite que moi, ce qui me rendait folle. »

Il rit. Tu ris. C'est la première fois que tu ris en parlant de Martine.`,
          impact: { resources: 5, moral: 25, links: 20, comfort: 15 },
          setsFlag: 'francoise_centreSocial',
        },
        {
          id: 'kit_seul',
          label: "Prendre le kit, mais rester chez toi.",
          conditions: {},
          consequence: `Le brumisateur est une bénédiction. Tu le mets devant le fauteuil et tu fermes les yeux. L'air est presque frais. Presque.

Leïla te laisse sa carte. « Vous pouvez m'appeler quand vous voulez. Même juste pour parler. C'est dans le service. »

Juste pour parler. Tu retournes la carte entre tes doigts. Ça fait longtemps que personne ne t'a proposé ça.

Tu ne l'appelles pas. Mais tu gardes la carte dans le tiroir de la table de nuit. Celui de Martine.`,
          impact: { resources: 5, moral: 5, links: 5, comfort: 10 },
          setsFlag: null,
        },
        {
          id: 'inviter',
          label: "Inviter Leïla à entrer. Tu as du thé.",
          conditions: {
            requiresMinStat: { moral: 40 }
          },
          blockedText: "Tu n'as pas l'énergie d'accueillir quelqu'un. Le désordre, la vaisselle, la solitude visible.",
          consequence: `Leïla s'assoit à la table de la cuisine. Tu prépares du thé — le Earl Grey de Martine, celui que tu n'avais pas ouvert depuis des mois.

Elle regarde les livres. « Vous étiez bibliothécaire ? »

« Quarante-deux ans. »

« Ma grand-mère aussi lisait beaucoup. Elle est morte pendant le Covid. Seule. C'est pour ça que je fais ce boulot. »

Vous buvez le thé en silence. C'est un silence confortable — le genre qui n'a pas besoin de mots.

En partant, Leïla te dit : « Il y a un atelier lecture au centre social le jeudi. Des gens qui lisent et qui en parlent. Vous seriez parfaite. »

Tu ne dis pas oui. Tu ne dis pas non. Tu gardes le tract.`,
          impact: { resources: -5, moral: 20, links: 15, comfort: 5 },
          setsFlag: 'francoise_leila',
        }
      ]
    },

    // S2 — Monde A — Droits / Reconnaissance
    {
      id: 'francoise_s2',
      world: 'A',
      domain: 'droits',
      context: `Jeudi, 10h. Mairie de Montauban. File d'attente pour les actes d'état civil.

Tu es là pour un papier. Un simple papier. Certificat de situation maritale pour le dossier de pension de réversion.

Martine et toi vous êtes mariées en 2015. Deux ans après la loi. La mairie de Montauban, à l'époque, avait traîné des pieds. Le maire-adjoint avait « des réserves personnelles ». Vous aviez attendu quatre mois pour une date.

L'agent au guichet te demande : « Nom du conjoint ? »

« Martine Duval. Née Perrin. »

Il tape. Fronce les sourcils.

« Votre… mari ? »

« Ma femme. »

Il te regarde. Il regarde l'écran. Il regarde de nouveau.

« Je vais devoir vérifier avec ma responsable. Le système n'affiche pas correctement les... situations. »

Les situations. C'est le mot qu'il utilise.`,
      choices: [
        {
          id: 'attendre',
          label: "Attendre. C'est un bug informatique, rien de plus.",
          conditions: {},
          consequence: `Tu attends. Quarante minutes. La responsable arrive, s'excuse, tape autre chose. Le certificat sort.

« Voilà, madame. Désolée pour l'attente. »

Tu prends le papier. Tes mains ne tremblent pas. C'est juste un papier. Un de plus.

Mais en sortant, tu passes devant la plaque de la mairie. Le drapeau. La devise. Liberté, Égalité, Fraternité.

Tu penses à Martine. Aux quatre mois d'attente pour le mariage. Aux quarante minutes pour un certificat. Au mot « situation » dans la bouche d'un fonctionnaire.

Tu rentres chez toi. Tu nourris Colette. Tu t'assois dans le fauteuil de Martine. Tu pleures. Pas de tristesse. De fatigue.`,
          impact: { resources: -5, moral: -20, links: 0, comfort: -5 },
          setsFlag: null,
        },
        {
          id: 'corriger',
          label: "Corriger : « Ma femme. Pas ma situation. »",
          conditions: {
            requiresMinStat: { moral: 40 }
          },
          blockedText: "Tu n'as plus la force de corriger les gens. Ça fait cinquante ans que tu corriges.",
          consequence: `« Ma femme. Pas une "situation". Un mariage. Légal. Républicain. En 2015. Dans cette mairie. »

L'agent rougit. La responsable arrive plus vite.

Le certificat sort en dix minutes. La responsable te le donne avec un « Toutes mes excuses, madame. Le système sera corrigé. »

Tu sors. Le soleil tape. Tu t'assois sur un banc place Nationale.

Ça fait cinquante ans. Cinquante ans à corriger, expliquer, justifier. De la clandestinité des années 70 au mariage de 2015. Et encore aujourd'hui, un agent qui ne sait pas taper « épouse ».

Mais tu l'as dit. Tu l'as corrigé. Et demain, la prochaine personne qui viendra avec le même papier sera peut-être traitée normalement.

C'est ça, l'héritage. Pas les livres. Les corrections.`,
          impact: { resources: -5, moral: 15, links: 5, comfort: 0 },
          setsFlag: 'francoise_corrige',
        },
        {
          id: 'ecrire',
          label: "Demander le nom de la responsable. Tu vas écrire au Défenseur des droits.",
          conditions: {
            requiresMinStat: { moral: 45, links: 25 }
          },
          blockedText: "Tu n'as pas l'énergie ni les contacts pour porter ça plus loin.",
          consequence: `La responsable blêmit quand tu prononces « Défenseur des droits ».

Le certificat sort en cinq minutes.

Tu rentres chez toi. Tu écris. Une lettre formelle, sans émotion, factuelle. Quarante-deux ans de bibliothèque, ça t'a appris à écrire pour être lue.

Tu ne sais pas si ça aboutira. Ces procédures durent des mois, des années. Mais la lettre existe. Elle est postée. Elle porte ton nom et celui de Martine.

Trois semaines plus tard, un accusé de réception. Le dossier est ouvert.

Maryse, quand tu lui racontes, te serre le bras. « Martine serait fière. »

Oui. Elle serait fière. Et furieuse que ce soit encore nécessaire.`,
          impact: { resources: -10, moral: 20, links: 10, comfort: 0 },
          setsFlag: 'francoise_defenseur',
        }
      ]
    },

    // S3 — Monde B — Santé
    {
      id: 'francoise_s3',
      world: 'B',
      domain: 'sante',
      context: `Vendredi, 9h30. Rendez-vous au Centre de Santé Municipal. Tu y vas depuis qu'il a ouvert — c'est au rez-de-chaussée, et le médecin te tutoie sans que ça te dérange.

Dr. Benali t'examine. Tension, cœur, genoux. Les genoux, c'est le sujet.

« Françoise. L'arthrose progresse. Il faut qu'on parle de ton logement. Le troisième étage sans ascenseur, à un moment, ça ne sera plus possible. »

Tu le sais. Depuis deux ans tu le sais. Chaque marche est une négociation avec tes rotules.

« Il y a un nouveau programme municipal — adaptation du logement. Ils installent un monte-escalier ou financent un déménagement en rez-de-chaussée. Mais il faut faire le dossier. »

Le dossier. Encore un dossier. Tu en as rempli trente dans ta vie. Mais celui-là veut dire : admettre que le troisième étage, l'appartement de Martine, les livres, la vue sur les toits — c'est peut-être fini.`,
      choices: [
        {
          id: 'dossier_logement',
          label: "Prendre le dossier. C'est raisonnable.",
          conditions: {},
          consequence: `Le dossier est épais mais clair. Photos du logement, certificat médical, justificatifs de revenus. Dr. Benali remplit sa partie tout de suite.

« Le monte-escalier, c'est six semaines de délai. Pris en charge à 80%. »

Tu rentres avec le dossier dans ton sac. Tu le poses sur la table de la cuisine. Colette s'assoit dessus.

Le soir, tu le remplis. Chaque case est un petit renoncement. « Nature du handicap ». « Niveau d'autonomie ». Des mots cliniques pour dire : tes genoux ne montent plus les escaliers.

Tu envoies le dossier le lundi. Le monte-escalier est installé en novembre. Le bruit du moteur te réveille les premiers jours. Puis tu t'habitues.

Tu montes et tu descends. Chez Maryse. Au marché. Au centre social. Colette te regarde passer comme si tu avais trahi les escaliers.`,
          impact: { resources: -5, moral: 10, links: 10, comfort: 25 },
          setsFlag: 'francoise_dossier',
        },
        {
          id: 'refuser_dossier',
          label: "Refuser. Tu n'es pas encore là.",
          conditions: {},
          consequence: `« Je monte encore mes escaliers. Le jour où je ne pourrai plus, on verra. »

Dr. Benali te regarde. « Le problème, Françoise, c'est que le jour où tu ne pourras plus, tu seras coincée chez toi. Et le dossier prend six semaines. »

Tu sais. Mais l'appartement de Martine. Les livres rangés par ses mains. La vue sur les toits, le clocher, les martinets en été.

Tu ne remplis pas le dossier. Tu montes tes escaliers. Un de moins chaque mois. En décembre, tu ne sors plus que tous les deux jours.

Colette miaule devant la porte. Elle voudrait descendre. Toi aussi.`,
          impact: { resources: 0, moral: -10, links: -10, comfort: -20 },
          setsFlag: null,
        },
        {
          id: 'partage',
          label: "Demander si le dossier médical peut être partagé avec l'hôpital. Pour tout simplifier.",
          conditions: {
            requiresMinStat: { links: 30 }
          },
          blockedText: "Tu ne te sens pas en position de demander des choses compliquées.",
          consequence: `« Et si tous mes médecins avaient le même dossier ? Je suis fatiguée de tout réexpliquer à chaque fois. L'arthrose, le traitement, l'allergie à la pénicilline... »

Dr. Benali sourit. « Le Dossier Médical Partagé Ville-Hôpital. On le met en place. Ton dossier est déjà dessus — si tu es d'accord, l'hôpital y a accès aussi. »

Tu signes. Un formulaire. Un seul.

Le mois suivant, quand tu vas aux urgences pour une chute (la troisième marche, celle qui grince), l'interne a ton dossier. Pas de questions. Pas de « vous prenez quoi comme médicament ? » à 2h du matin.

C'est un détail. Un petit détail administratif. Mais à 72 ans, les détails font la différence entre la dignité et l'humiliation.`,
          impact: { resources: 0, moral: 15, links: 15, comfort: 10 },
          setsFlag: 'francoise_dossierPartage',
        }
      ]
    },

    // S4 — Monde A — Isolement / Mémoire
    {
      id: 'francoise_s4',
      world: 'A',
      domain: 'liens',
      context: `Samedi, 15h. Le facteur a glissé un tract sous ta porte. « Grande Brocante de la Place Nationale — Dimanche ».

Tu aimais les brocantes. Martine et toi, vous y alliez chaque dimanche d'été. Elle achetait des livres. Tu achetais de la vaisselle inutile. Vous rentriez chargées comme des mules et heureuses comme des gamines.

Dimanche matin, tu te lèves. Tu mets une robe. Tu te regardes dans le miroir. Une vieille dame te regarde en retour.

Les escaliers. Troisième étage. Tes genoux posent un ultimatum : si tu descends maintenant, tu ne remontes pas avant ce soir.

Dehors, il fait beau. Tu entends la rumeur de la brocante par la fenêtre ouverte.`,
      choices: [
        {
          id: 'descendre',
          label: "Descendre. Tant pis pour les genoux.",
          conditions: {
            requiresMinStat: { comfort: 30 }
          },
          blockedText: "Tes genoux disent non. Définitivement non.",
          consequence: `Chaque marche est un petit combat. Tu te tiens à la rampe. Tu comptes. Cinquante-quatre marches. Tu les connais par cœur.

La brocante est belle. Soleil, parasols, l'odeur de la socca du stand corse. Tu flânes. Tu touches des livres sans les acheter. Tu souris à des inconnus qui ne te regardent pas.

Un stand vend des vinyles. Tu trouves Barbara — « L'aigle noir ». Martine l'écoutait le dimanche matin.

Tu l'achètes. 3 euros. Tu ne l'écouteras probablement jamais — tu n'as plus de platine.

Le soir, les genoux sont en feu. Tu ne pourras pas descendre demain. Peut-être pas après-demain.

Mais tu as le disque. Tu le poses sur la table de nuit. Côté Martine.`,
          impact: { resources: -5, moral: 15, links: 5, comfort: -20 },
          setsFlag: null,
        },
        {
          id: 'fenetre',
          label: "Rester. Regarder par la fenêtre.",
          conditions: {},
          consequence: `Tu t'assois au balcon. Colette sur les genoux. D'en haut, la brocante est un tableau vivant — des couleurs, du mouvement, des rires.

Tu restes deux heures. Le soleil tourne. L'ombre du clocher traverse la place.

Tu reconnais des gens. Maryse, en bas, qui fouille dans un carton de livres. Le voisin du premier qui négocie une lampe. Des gens qui vivent.

Toi, tu regardes. Comme au cinéma. Sauf qu'au cinéma, tu choisis d'être spectateur.

Le soir, Maryse sonne. Elle t'a acheté un livre. « Je l'ai vu et j'ai pensé à toi. »

C'est « La Promesse de l'aube » de Gary. Tu l'as déjà lu trois fois. Tu ne le dis pas. Tu dis merci.`,
          impact: { resources: 0, moral: -15, links: 5, comfort: 5 },
          setsFlag: null,
        },
        {
          id: 'appeler_maryse',
          label: "Appeler Maryse. Lui demander de t'accompagner.",
          conditions: {
            requiresFlag: 'francoise_maryse'
          },
          blockedText: "Tu n'as personne à appeler pour ce genre de chose.",
          consequence: `Maryse monte te chercher. Elle te prend le bras dans l'escalier. C'est humiliant et réconfortant en même temps.

La brocante, à son bras, c'est différent. Vous riez devant une collection de cendriers en forme de coquillage. Elle marchande un vase. Tu trouves un recueil de poésie de Sappho — édition de 1962, couverture abîmée.

Au café de la place, Maryse commande deux menthes à l'eau.

« Tu devrais sortir plus, Françoise. »

« Je sais. »

« Non, tu sais pas. Tu crois que rester là-haut c'est être fidèle à Martine. Mais Martine, elle sortait. Elle vivait. Toi tu te conserves. »

Ça fait mal. Mais les choses vraies font mal.

Tu remontes les escaliers en serrant le livre contre toi. Tes genoux protestent. Mais tu es descendue. Tu as vu le soleil. Tu as été vue.`,
          impact: { resources: -5, moral: 20, links: 20, comfort: -10 },
          setsFlag: 'francoise_brocante',
        }
      ]
    },

    // S5 — Monde B — Transmission / Témoignage
    {
      id: 'francoise_s5',
      world: 'B',
      domain: 'citoyennete',
      context: `Mercredi, 14h. Le centre social de Villebourbon. Tu y viens maintenant — le jeudi pour l'atelier lecture, mais aujourd'hui c'est autre chose.

Leïla t'a appelée. « Françoise, le lycée Bourdelle fait une journée sur l'histoire des droits civiques. Ils cherchent des témoins. Des gens qui ont vécu les combats. »

Des témoins. Tu n'as jamais témoigné. Martine voulait. Elle disait : « Si on ne raconte pas, ils oublieront. »

Tu n'as jamais raconté. Pas les années 70 — la peur, les codes, les bars clandestins. Pas le PACS en 1999 — la joie amère d'un sous-mariage. Pas 2013 — les manifestations contre vous, les pancartes, le mot « abomination » écrit en lettres capitales.

Tu as 72 ans. Combien de chances de raconter il te reste ?

Le lycée est à vingt minutes en bus. Le bus 4 s'arrête devant.`,
      choices: [
        {
          id: 'temoigner',
          label: "Y aller. Raconter.",
          conditions: {
            requiresMinStat: { moral: 35 }
          },
          blockedText: "Tu n'as pas la force de t'exposer comme ça. Pas aujourd'hui.",
          consequence: `La salle est pleine. Cent vingt lycéens. Le bruit, les téléphones, l'agitation. Tu as envie de partir.

Puis ils se taisent. Tu ne sais pas pourquoi. Peut-être que tu as l'air de quelqu'un qui a quelque chose à dire.

Tu parles. De 1974. D'une boîte de nuit à Toulouse qui s'appelait « Le Zinc ». De Martine, rencontrée là-bas, un samedi soir. De la peur d'être vue. De la bibliothèque comme refuge — les livres ne jugent pas.

Un garçon au fond lève la main. « Vous avez eu peur toute votre vie ? »

Tu réfléchis. « Non. J'ai eu peur pendant trente ans. Puis j'ai eu Martine. Et la peur est devenue plus petite que l'amour. Mais elle n'a jamais complètement disparu. »

Silence.

En sortant, une fille te donne un dessin. Un cœur arc-en-ciel avec écrit « Merci Françoise ». Tu le plies dans ton portefeuille.`,
          impact: { resources: -5, moral: 30, links: 20, comfort: 0 },
          setsFlag: 'francoise_temoignage',
        },
        {
          id: 'ecrire_plutot',
          label: "Écrire ton témoignage plutôt que le dire. Tu es meilleure avec les mots écrits.",
          conditions: {},
          consequence: `Tu passes la semaine à écrire. Quatre pages. Corrigées, recorrigées. Quarante-deux ans de bibliothèque, ça laisse des traces — tu sais la valeur d'un mot bien placé.

Leïla transmet ton texte au lycée. L'enseignant le lit à voix haute devant la classe.

Tu n'es pas là. Tu ne vois pas les visages. Mais Leïla te raconte : le silence, les questions, une élève qui pleurait.

« Ils veulent te rencontrer. »

Peut-être. Un jour. Mais les mots sont là. Ils existent en dehors de toi maintenant. Même si tu disparais demain, quelqu'un saura que Françoise et Martine ont existé.

C'est ça, la transmission. Pas être là. Être lue.`,
          impact: { resources: 0, moral: 20, links: 10, comfort: 5 },
          setsFlag: 'francoise_temoignage',
        },
        {
          id: 'decliner',
          label: "Décliner. Ce n'est pas à toi de porter ça.",
          conditions: {},
          consequence: `« Leïla. Je suis fatiguée de raconter. De justifier. De prouver que j'ai le droit d'exister. Je l'ai fait pendant cinquante ans. C'est au tour de quelqu'un d'autre. »

Leïla comprend. Ou fait semblant.

La journée au lycée a lieu sans toi. Un autre témoin parle — un homme, plus jeune, militant associatif. Il est bon, paraît-il.

Tu ne regrettes pas. Ou un peu. Le soir, tu relis les lettres de Martine. Celle de 2013, après la Manif pour Tous : « Si on ne raconte pas, Françoise, ils diront qu'on n'existait pas. »

Tu ranges la lettre. Tu nourris Colette. Tu ne racontes pas.`,
          impact: { resources: 0, moral: -15, links: -5, comfort: 5 },
          setsFlag: null,
        }
      ]
    },

    // S6 — Monde A — Dignité
    {
      id: 'francoise_s6',
      world: 'A',
      domain: 'liens',
      context: `Dimanche, 11h. Le supermarché. Tu fais tes courses une fois par semaine — le strict nécessaire, ce que tu peux porter en un sac.

À la caisse, la machine refuse ta carte. « Plafond de paiement dépassé ».

Tu ne comprends pas. Tu as 340 euros sur le compte. Les courses font 47 euros. La caissière te regarde.

« Vous avez une autre carte ? »

Tu n'as pas d'autre carte. Tu as cette carte, ce compte, cette retraite de 1340 euros dont 580 partent dans le loyer.

Derrière toi, la file s'allonge. Un homme soupire. Fort.

La caissière essaie une deuxième fois. Refusé.

Tu sens la chaleur monter. Pas celle de la canicule. Celle de la honte.`,
      choices: [
        {
          id: 'partir',
          label: "Partir. Laisser les courses. Tu reviendras.",
          conditions: {},
          consequence: `« Excusez-moi. » Tu poses le sac. Tu sors.

Dehors, tu t'assois sur un muret. Tu appelles la banque. Attente musicale. Quinze minutes.

C'est un « blocage préventif ». Un paiement suspect détecté — ton abonnement France Loisirs, 12 euros, depuis 30 ans. L'algorithme a décidé que c'était suspect.

Le conseiller débloque en deux minutes. « Toutes nos excuses, madame. »

Tu retournes faire tes courses. Le sac est toujours à la caisse. La caissière a mis tes surgelés au frais. Sans qu'on le lui demande.

« Merci. »

Elle hausse les épaules. « C'est normal. »

Non. Ce n'est pas normal. C'est rare. Et tu le sais.`,
          impact: { resources: -5, moral: -15, links: 0, comfort: 0 },
          setsFlag: null,
        },
        {
          id: 'liquide',
          label: "Payer en liquide. Tu as toujours un billet de secours.",
          conditions: {
            requiresMinStat: { resources: 35 }
          },
          blockedText: "Tu n'as pas de liquide. Plus depuis le début du mois.",
          consequence: `Tu sors un billet de 50 du fond de ton portefeuille. Le billet de secours. Celui que Martine t'avait appris à toujours garder.

La caissière rend la monnaie. La file avance. Personne ne dit rien. L'incident est clos.

Mais en rentrant, tu comptes. 1340 euros. 580 de loyer. 85 de mutuelle. 45 d'électricité. 30 de téléphone. Restent 600 pour manger, les médicaments, Colette, et vivre.

Vivre. Le mot est élastique. Il peut vouloir dire beaucoup de choses. À 72 ans, il veut dire : tenir.`,
          impact: { resources: -10, moral: -5, links: 0, comfort: 0 },
          setsFlag: null,
        },
        {
          id: 'demander',
          label: "Demander à la personne derrière toi de passer d'abord, le temps de régler.",
          conditions: {},
          consequence: `« Excusez-moi, passez devant. J'ai un souci de carte. »

L'homme qui soupirait passe. Sans un mot. La femme après lui aussi.

Puis un gamin — seize, dix-sept ans — pose ses courses à côté des tiennes. « Je vais attendre. Pas pressé. »

Il s'appelle Léo. Il achète des céréales et du jus d'orange.

Tu appelles la banque pendant qu'il attend. Le conseiller débloque la carte. Tu paies.

« Merci d'avoir attendu. »

« De rien. Ma grand-mère avait le même problème avec sa banque. Elle disait que les machines sont plus bêtes que les gens. »

Tu souris. Tu sors du magasin avec tes courses et un sentiment oublié : quelqu'un t'a vue comme une personne, pas comme un obstacle.`,
          impact: { resources: -5, moral: 10, links: 10, comfort: 0 },
          setsFlag: 'francoise_leo',
        }
      ]
    },

    // S7 — Monde B — Réseau / Vigilance
    {
      id: 'francoise_s7',
      world: 'B',
      domain: 'liens',
      context: `Lundi, 16h. Maryse t'appelle.

« Françoise. Il y a un truc nouveau dans le quartier. Un "réseau de vigilance bienveillante". C'est la mairie qui lance ça. L'idée c'est que les voisins veillent les uns sur les autres — pas pour surveiller, pour soutenir. Courses, compagnie, alertes santé. »

Tu écoutes. Le mot « vigilance » te met mal à l'aise. Ça fait délation. Ça fait Vichy.

« C'est pas pareil, Françoise. C'est volontaire. C'est entre nous. Il y a une réunion au centre social vendredi. »

Tu penses à la canicule. Au troisième étage. À la fois où tu es tombée dans l'escalier et où personne n'a su pendant deux jours.

Tu penses aussi à Martine. Morte un mardi. Retrouvée le jeudi. Par toi. Parce que personne d'autre ne venait.`,
      choices: [
        {
          id: 'rejoindre',
          label: "Aller à la réunion. Écouter, au moins.",
          conditions: {},
          consequence: `Le centre social est plein. Tu reconnais des visages — Raymond, Leïla, Maryse évidemment.

Le dispositif est simple : chaque personne volontaire est reliée à deux ou trois voisins. Un appel ou une visite par semaine. Si quelqu'un ne répond pas pendant 48h, alerte.

Tu te mets en binôme avec Raymond et Maryse. Raymond te fait rire — il raconte ses tournées de facteur comme des épopées.

La première semaine, Maryse t'appelle le lundi. Raymond le jeudi. Tu les appelles le mercredi.

C'est rien. Trois coups de fil. Mais le mercredi soir, tu réalises que quelqu'un t'attendra demain. Que si tu ne réponds pas, quelqu'un viendra.

Martine est morte un mardi. Si ce réseau avait existé, on l'aurait trouvée le mercredi.`,
          impact: { resources: 0, moral: 25, links: 25, comfort: 10 },
          setsFlag: 'francoise_vigilance',
        },
        {
          id: 'proposer',
          label: "Y aller — et proposer d'y ajouter une dimension culturelle.",
          conditions: {
            requiresMinStat: { moral: 40 },
            requiresFlag: 'francoise_centreSocial'
          },
          blockedText: "Tu ne connais pas assez ce monde pour y proposer des choses.",
          consequence: `À la réunion, tu lèves la main.

« Si on se voit chaque semaine, pourquoi ne pas en profiter pour faire quelque chose ensemble ? Un livre partagé. Un film. Une discussion. Pas juste vérifier qu'on est vivants — vivre ensemble. »

Leïla te regarde avec des yeux brillants. « Un café-lecture itinérant ? Chez les uns et les autres ? »

Raymond tape sur la table. « Chez moi en premier ! J'ai du porto. »

Le premier café-lecture a lieu chez Raymond. Huit personnes. Tu lis un passage d'Annie Ernaux. Raymond lit une BD de Tintin. Maryse lit une recette de cassoulet — « c'est de la littérature, se défend-elle. C'est du patrimoine. »

Tu ris. Tu ris vraiment. Ça faisait longtemps.`,
          impact: { resources: -5, moral: 30, links: 30, comfort: 10 },
          setsFlag: 'francoise_vigilance',
        },
        {
          id: 'distance_f',
          label: "Ne pas y aller. Tu n'aimes pas l'idée d'être surveillée.",
          conditions: {},
          consequence: `Tu appelles Maryse. « Je ne suis pas à l'aise avec ça. La surveillance, les listes, même bienveillantes... »

Maryse comprend. Elle n'insiste pas.

Le réseau se met en place sans toi. Tu vois Maryse partir le vendredi. Tu l'entends au téléphone avec Raymond.

Tu es libre. Personne ne t'appellera le mercredi. Personne ne viendra si tu ne réponds pas.

Un soir, tu glisses dans la cuisine. Tu te rattrapes au comptoir. Colette miaule. Ton genou hurle.

Tu restes par terre dix minutes. Le temps de rassembler la force de te relever. Tu penses au réseau. Aux 48h avant l'alerte. À Martine, retrouvée le jeudi.

Tu te relèves. Tu ne t'inscris toujours pas. Mais tu laisses la porte entrebâillée, maintenant. Au cas où.`,
          impact: { resources: 0, moral: -10, links: -15, comfort: -5 },
          setsFlag: null,
        }
      ]
    }
  ]
},

  // ============ PHILIPPE - Maraîcher ============
  philippe: {
  id: 'philippe',
  name: 'Philippe',
  age: 55,
  role: 'Maraîcher',
  description: "Trente ans de terre. Six hectares à Piquecos, trente minutes de Montauban. Un stand au marché le samedi. Des dettes, un dos, un fils qui ne veut pas reprendre. Ta femme est partie il y a cinq ans. La terre est restée.",
  initialStats: { resources: 35, moral: 50, links: 40, comfort: 40 },
  scenes: [

    // S0 — Monde A — Travail / Économie
    {
      id: 'philippe_s0',
      world: 'A',
      domain: 'travail',
      context: `Samedi, 5h30. Le camion tousse dans le noir. Tu charges les cagettes — tomates, courgettes, aubergines, les premières figues.

Le marché couvert ouvre à 7h. Tu es là à 6h15, comme chaque samedi depuis vingt ans.

Mais aujourd'hui, il y a un papier scotché à l'entrée. « Nouvelle réglementation : augmentation du droit de place de 40%. Application immédiate. »

40%. Tu calcules. Le droit de place passe de 45 à 63 euros le samedi. C'est 18 euros de plus. 72 euros de plus par mois.

Tu regardes les autres maraîchers. Gérard emballe déjà ses poireaux. Il n'a pas lu le papier. Ou il fait semblant.

Le marché, c'est 60% de ton chiffre d'affaires. Sans marché, tu livres aux restaus et tu vends en bord de route. Ça paie le gasoil. C'est tout.`,
      choices: [
        {
          id: 'payer',
          label: "Payer. Tu n'as pas le choix.",
          conditions: {},
          consequence: `Tu paies. 63 euros. Tu les sors du portefeuille en comptant chaque billet.

La matinée est correcte. 280 euros de vente. Moins les 63 de place, moins les 35 de gasoil, moins les 40 de semences du mois. Il te reste 142 euros pour la journée.

142 euros. Pour dix heures de travail, debout, à parler à des gens qui négocient le prix de tes tomates comme si c'étaient des actions en Bourse.

Le soir, tu fais les comptes du mois. Le résultat est le même que d'habitude : tu survis. La terre produit. Toi, tu t'uses.

Le papier de la mairie est sur le tableau de bord du camion. 40%. Tu te demandes qui a décidé ça. Et s'il a déjà mis les pieds dans un champ.`,
          impact: { resources: -15, moral: -15, links: 0, comfort: -5 },
          setsFlag: null,
        },
        {
          id: 'negocier_place',
          label: "Aller voir le gestionnaire du marché. Discuter.",
          conditions: {
            requiresMinStat: { moral: 40 }
          },
          blockedText: "Tu n'as pas l'énergie de te battre avec l'administration. Tu paies.",
          consequence: `Le gestionnaire s'appelle Dumont. Bureau au fond du marché, derrière les toilettes. Il a l'air embêté.

« C'est pas moi, Philippe. C'est la mairie. Budget de fonctionnement. »

« 40% d'un coup ? Sans prévenir ? On est cinq producteurs locaux sur ce marché. Les autres sont des revendeurs. Vous nous traitez pareil ? »

Il soupire. « Le tarif est le même pour tout le monde. »

Pour tout le monde. Le revendeur qui achète ses tomates en Espagne à 0,80 le kilo et les vend 3 euros paie le même droit de place que toi qui les fais pousser à trente minutes d'ici.

Tu sors sans rien obtenir. Mais Gérard t'a entendu à travers la cloison. « Tu as raison. On devrait faire un truc. »

« Un truc ». Gérard dit toujours ça. Il ne fait jamais rien. Mais cette fois, peut-être.`,
          impact: { resources: -10, moral: 5, links: 10, comfort: 0 },
          setsFlag: 'philippe_negocie',
        },
        {
          id: 'partager',
          label: "Proposer à Gérard de partager un stand. Diviser les frais.",
          conditions: {
            requiresMinStat: { links: 35 }
          },
          blockedText: "Gérard et toi, c'est cordial mais pas plus. Tu ne te vois pas lui proposer ça.",
          consequence: `Gérard réfléchit. Ses poireaux, tes tomates. Pas les mêmes clients, pas les mêmes produits. Ça peut marcher.

« Moitié-moitié ? »

« Moitié-moitié. Et on tourne — un samedi c'est toi qui tiens, l'autre c'est moi. »

Ça te libère un samedi sur deux. Tu n'avais pas eu un samedi libre depuis... tu ne sais plus. Des années.

Le premier samedi libre, tu dors jusqu'à 8h. Le silence de la maison te réveille. Tu ne sais pas quoi faire d'un samedi matin sans marché.

Tu vas au champ. Évidemment. Mais tu y vas sans urgence. Tu regardes les rangs de tomates. Tu les arroses lentement. Pour une fois, c'est du plaisir, pas du travail.`,
          impact: { resources: 5, moral: 15, links: 15, comfort: 10 },
          setsFlag: 'philippe_partage',
        }
      ]
    },

    // S1 — Monde B — Travail / Économie
    {
      id: 'philippe_s1',
      world: 'B',
      domain: 'travail',
      context: `Samedi, 6h30. Le marché couvert. Sur ton stand, un nouveau panneau : « Producteur local — Carte Commune acceptée ».

C'est la mairie qui les a fournis. Avec un petit lecteur de carte, branché sur ton téléphone. Chaque passage de Carte Commune est remboursé directement sur ton compte, à prix producteur — pas au rabais.

Tu n'étais pas convaincu au début. L'aide alimentaire, c'est pas ton monde. Toi tu vends des légumes, pas de la charité.

Mais ce matin, un type passe. La trentaine, sac isotherme sur le dos. Il regarde les tomates.

« C'est vous Philippe ? Rachid du Commun m'a parlé de vous. »

Il sort sa Carte Commune.

Tu le regardes. Un livreur. Qui achète tes tomates avec une carte municipale. Et qui te connaît par son prénom.`,
      choices: [
        {
          id: 'tarif_producteur',
          label: "Lui vendre au tarif producteur. C'est le deal.",
          conditions: {},
          consequence: `Tomates, courgettes, un melon. 8,50 euros. Il paie avec la carte.

« C'est des bonnes, tes tomates. »

« Elles viennent de Piquecos. Trente minutes d'ici. »

Il hoche la tête. Il s'appelle Mamadou. Il fait 50 bornes par jour en vélo. Il livre des repas qu'il n'a pas les moyens de manger.

Tu lui donnes un melon de plus. « Celui-là est pour toi. Il est un peu mûr pour la vente. »

C'est un mensonge. Le melon est parfait. Mais tu connais la fierté. Tu la respectes.

Le soir, tu fais les comptes. Les Cartes Communes représentent 15% de tes ventes du jour. C'est pas la fortune. Mais c'est stable. Prévisible. Pas comme les clients qui négocient.`,
          impact: { resources: 10, moral: 15, links: 15, comfort: 0 },
          setsFlag: 'philippe_tarifProducteur',
        },
        {
          id: 'prix_normal',
          label: "Vendre au prix normal. La Carte Commune, c'est pas une raison de brader.",
          conditions: {},
          consequence: `Tu vends au prix affiché. 3,50 le kilo de tomates. La Carte passe.

Mamadou ne dit rien. Il paie. Il prend ses tomates et repart.

Tu as vendu au même prix qu'à tout le monde. C'est juste. C'est le marché.

Mais le soir, en rangeant le stand, tu repenses au deal. « Prix producteur ». Ça veut dire un peu moins de marge mais un volume garanti. Tu as refusé un client fidèle pour 50 centimes le kilo.

Gérard, lui, a joué le jeu. Il a vendu 30% de plus que toi. Les Cartes Communes reviennent chez lui.

Le capitalisme, même à l'échelle d'un stand de marché, récompense ceux qui s'adaptent. Toi, tu t'accroches à tes prix comme à tes rangs de tomates : droit, régulier, prévisible. Et seul.`,
          impact: { resources: 5, moral: -5, links: -10, comfort: 0 },
          setsFlag: null,
        },
        {
          id: 'discuter',
          label: "Discuter avec Mamadou. Tu veux comprendre comment ça marche.",
          conditions: {},
          consequence: `Tu prends dix minutes. Mamadou t'explique : la Carte, le Commun, les ateliers. Tu lui expliques : la terre, les saisons, le coût réel d'une tomate.

« Tu sais combien ça me coûte, une tomate ? En eau, en semence, en temps ? 1,20 euro le kilo. Je les vends 3,50. La marge, c'est pas du luxe — c'est l'amortissement du tracteur, la mutuelle, le gazole. »

Il écoute. Vraiment.

« Et la Carte, elle te rembourse combien ? »

« 3 euros le kilo. Prix producteur. »

« C'est correct. »

Oui. C'est correct. Et ce qui est correct, dans ton métier, c'est déjà beaucoup.

Vous échangez vos numéros. Un maraîcher et un livreur. Deux types qui se lèvent avant le soleil pour nourrir des gens qui ne savent pas combien ça coûte.`,
          impact: { resources: 5, moral: 15, links: 20, comfort: 5 },
          setsFlag: 'philippe_tarifProducteur',
        }
      ]
    },

    // S2 — Monde A — Eau / Climat
    {
      id: 'philippe_s2',
      world: 'A',
      domain: 'climat',
      context: `Mercredi, 7h. L'arrosage automatique ne s'est pas déclenché. Tu vérifies — coupure d'eau. Un arrêté préfectoral : restriction de niveau 3. Interdiction d'irrigation entre 8h et 20h.

Tu regardes tes plants. Les tomates ont soif. Les courgettes tiennent encore. Les salades sont cuites — au sens propre.

Six hectares. Tu irrigues au goutte-à-goutte depuis dix ans — pas par écologie, par économie. Mais même le goutte-à-goutte est interdit en journée maintenant.

Il faudrait irriguer la nuit. Se lever à 3h. Vérifier les lignes. Re-dormir à 5h. Se lever à 6h pour le marché.

Ou accepter de perdre les salades. Et une partie des tomates.

Le voisin — Marchal, grand céréalier, 200 hectares — a un forage privé. Lui irrigue quand il veut. L'arrêté ne s'applique qu'à l'eau du réseau.`,
      choices: [
        {
          id: 'nuit',
          label: "Irriguer la nuit. Tu dormiras quand tu seras mort.",
          conditions: {
            requiresMinStat: { comfort: 30 }
          },
          blockedText: "Ton corps refuse. Tu ne tiens plus debout à 3h du matin.",
          consequence: `3h15. Le réveil sonne dans le noir. Tu enfiles les bottes. Le champ sent la terre sèche.

Tu ouvres les vannes. Le goutte-à-goutte murmure. Les plants boivent. Tu restes une heure à vérifier — une fuite sur la ligne 4, un bouchon sur la 7.

Tu rentres à 4h30. Le lit est froid. Tu te rendors à 5h. Le réveil sonne à 6h.

Tu tiens une semaine. Puis deux. La troisième semaine, tu t'endors au volant du camion en revenant du marché. Le fossé te réveille. Pas de dégât. Juste la peur.

Les salades sont sauvées. Ton dos, ta tête, ton sommeil — non.`,
          impact: { resources: 10, moral: -10, links: 0, comfort: -25 },
          setsFlag: null,
        },
        {
          id: 'perdre',
          label: "Laisser crever les salades. Sauver l'essentiel.",
          conditions: {},
          consequence: `Tu arraches les salades le jeudi. Trois rangs. Quarante kilos qui ne seront pas vendus.

C'est pas la première fois. La sécheresse de 2022, la grêle de 2019, le gel de 2021. La terre donne et reprend.

Mais cette fois, c'est l'eau qu'on te coupe. Pas le ciel. L'administration. Pendant que Marchal arrose ses 200 hectares de maïs avec son forage.

Le samedi au marché, un client demande des salades. « Plus de salades. Restriction d'eau. »

Il hausse les épaules. « J'irai au Leclerc. »

Au Leclerc. Où les salades viennent d'Espagne. Arrosées avec l'eau du Guadalquivir. Qui s'assèche aussi, mais plus loin, donc personne ne compte.`,
          impact: { resources: -15, moral: -15, links: -5, comfort: 5 },
          setsFlag: null,
        },
        {
          id: 'collectif_eau',
          label: "Appeler les autres maraîchers. On est tous dans la même merde.",
          conditions: {
            requiresMinStat: { links: 35 }
          },
          blockedText: "Tu ne connais pas assez les autres pour lancer ça.",
          consequence: `Tu appelles Gérard, Marie-Claire (bio, 4 hectares), et Sanjay (safran, récemment installé). Même problème. Même colère.

Vous écrivez à la chambre d'agriculture. Copie au préfet. Le ton est factuel — les chiffres, les pertes, la différence entre goutte-à-goutte et irrigation par aspersion.

« On consomme 10 fois moins d'eau que Marchal. On nourrit 10 fois plus de gens au kilo. Et c'est nous qu'on coupe. »

La réponse met trois semaines. « L'arrêté est général. Pas d'exception. »

Mais le journal local reprend votre courrier. Un article. Petit, mais visible.

Sanjay dit : « C'est un début. »

Toi, tu regardes tes tomates qui survivent malgré tout. La terre s'adapte. Toi aussi. Mais tu es fatigué de t'adapter.`,
          impact: { resources: -10, moral: 10, links: 20, comfort: -5 },
          setsFlag: 'philippe_collectifEau',
        }
      ]
    },

    // S3 — Monde B — Eau / Gestion publique
    {
      id: 'philippe_s3',
      world: 'B',
      domain: 'climat',
      context: `Jeudi, 10h. Convocation à la mairie — « Commission municipale de l'eau ». Tu as reçu le courrier il y a deux semaines. Premier réflexe : poubelle. Deuxième réflexe : Gérard y va. Troisième réflexe : tu y vas.

La salle est petite. Autour de la table : deux élus, un hydrologue, une associative, Gérard, toi, et trois autres agriculteurs — dont Marchal, avec sa montre en or et son air d'homme qui a l'habitude des réunions.

L'hydrologue présente les chiffres. Le Tarn est bas. Les nappes aussi. Il faut répartir.

L'élue — adjointe à la transition écologique — pose le cadre. « La proposition : tarification progressive. Les gros consommateurs paient plus cher au mètre cube. Les petits maraîchers en goutte-à-goutte sont protégés. Et on finance des retenues collinaires partagées. »

Marchal lève la main. « Les retenues, c'est bien. La tarification progressive, c'est une taxe déguisée. »

Tu le regardes. 200 hectares de maïs irrigués par aspersion. La tarification progressive, c'est lui qu'elle vise.`,
      choices: [
        {
          id: 'soutenir',
          label: "Soutenir la tarification. C'est juste.",
          conditions: {},
          consequence: `« Philippe Gardel, maraîcher, Piquecos. Six hectares en goutte-à-goutte. Je consomme 800 mètres cubes par an. Marchal en consomme 30 000. On est pas dans le même monde. La tarification progressive, c'est du bon sens. »

Marchal te foudroie du regard. Vous vous connaissez depuis trente ans. Voisins de terre. Pas amis. Plus maintenant.

Le vote est consultatif. 5 voix pour la tarification, 2 contre (Marchal et un céréalier). L'élue note.

En sortant, Gérard te serre la main. « Ça va te coûter avec Marchal. »

Tu sais. Marchal prête son tracteur en cas de panne. Marchal connaît tout le monde à la chambre d'agriculture. Marchal est le genre de type dont tu as besoin quand ça va mal.

Mais l'eau, c'est l'eau. Et la terre ne ment pas.`,
          impact: { resources: 0, moral: 20, links: 10, comfort: 0 },
          setsFlag: 'philippe_commissionEau',
        },
        {
          id: 'prudent',
          label: "Écouter sans prendre position. Tu ne veux pas te griller avec Marchal.",
          conditions: {},
          consequence: `Tu ne dis rien. Gérard parle. L'associative parle. Marchal parle beaucoup.

Le vote passe quand même — sans ta voix. L'élue te regarde en sortant. Un regard qui ne juge pas mais qui note.

Marchal te tape l'épaule au parking. « T'as bien fait de pas te mêler de ça, Philippe. Ces histoires de tarification, c'est politique. Nous on est des paysans, pas des politiciens. »

Tu hoches la tête. Mais tu sais que le prix de l'eau, c'est pas de la politique. C'est de la survie. Et que Marchal confond les deux parce qu'il peut se le permettre.`,
          impact: { resources: 5, moral: -10, links: 5, comfort: 0 },
          setsFlag: null,
        },
        {
          id: 'retenue',
          label: "Proposer une retenue collinaire partagée entre petits maraîchers.",
          conditions: {
            requiresMinStat: { links: 40 }
          },
          blockedText: "Tu n'as pas assez d'alliés pour porter ce projet.",
          consequence: `Tu déposes une feuille sur la table. Un croquis — fait à la main, sur du papier quadrillé. La colline derrière chez Gérard. Un bassin de rétention. Trois exploitations connectées.

« L'eau de pluie, on la laisse filer. Si on la capte en hiver, on irrigue en été sans toucher au réseau. Le terrain est à Gérard — il est d'accord. Le financement, c'est la commission qui décide. »

L'hydrologue examine le croquis. « C'est faisable. Capacité estimée : 3000 mètres cubes. Assez pour trois exploitations maraîchères. »

L'élue sourit. « On intègre ça au budget participatif ? »

Tu hoches la tête. Un paysan de 55 ans qui fait un dessin sur du papier quadrillé et qui change le cours de l'eau. Martine — non, pas Martine. Ta terre. Ta terre serait fière.`,
          impact: { resources: -5, moral: 25, links: 20, comfort: 10 },
          setsFlag: 'philippe_retenue',
        }
      ]
    },

    // S4 — Monde A — Emploi saisonnier
    {
      id: 'philippe_s4',
      world: 'A',
      domain: 'travail',
      context: `Lundi, 6h. Saison des tomates. Tu as besoin de bras. Deux semaines de récolte, minimum.

L'an dernier, c'était Mehdi. Bon bosseur, ponctuel, il connaissait les gestes. Mais Mehdi est parti — Toulouse, un CDI en entrepôt.

Tu as mis une annonce. Trois réponses.

Un étudiant qui veut « l'expérience agricole ». Il a des mains de pianiste. Il tiendra deux jours.

Une femme, cinquante ans, qui a fait les vendanges dans le Gers. Solide. Mais elle veut être déclarée — évidemment. Charges patronales : 450 euros pour deux semaines.

Et un type sans papiers, recommandé par un autre maraîcher. Qui bossera pour la moitié du prix. En liquide. Sans problèmes.

Tu regardes tes rangs de tomates. Elles n'attendront pas ta conscience.`,
      choices: [
        {
          id: 'declarer',
          label: "Embaucher la femme. Déclarer. C'est la loi.",
          conditions: {
            requiresMinStat: { resources: 30 }
          },
          blockedText: "450 euros de charges. Tu n'as pas cette trésorerie.",
          consequence: `Elle s'appelle Sylvie. Ancienne ouvrière viticole. Elle arrive à 6h, repart à 14h, ne se plaint pas. Ses mains savent ce qu'elles font.

En deux semaines, la récolte est rentrée. Tu la paies. Avec les charges. 1200 euros tout compris. Ton compte pleure.

Mais Sylvie reviendra l'an prochain. Et l'année d'après. C'est ça, le travail déclaré — pas que des charges, aussi de la fidélité.

Le soir de la dernière journée, elle te laisse un pot de confiture de figues. « De mon jardin. Pour dire merci. »

Tu ouvres le pot le dimanche matin. La confiture est bonne. Le goût de quelque chose de correct.`,
          impact: { resources: -20, moral: 15, links: 15, comfort: 0 },
          setsFlag: 'philippe_declare',
        },
        {
          id: 'noir',
          label: "Prendre le type sans papiers. Tu n'as pas le luxe des principes.",
          conditions: {},
          consequence: `Il s'appelle Ahmed. Il ne parle pas beaucoup. Il travaille vite. Trop vite, parfois — tu dois lui dire de ralentir, les tomates s'abîment.

Tu le paies en liquide. 400 euros pour deux semaines. Moitié prix. Il ne se plaint pas. Il n'est pas en position de se plaindre.

La récolte est rentrée. Les chiffres sont bons.

Mais un soir, tu le raccompagnes en camion. Il dort dans une tente, derrière la zone industrielle. Il a 35 ans. Il était mécanicien en Tunisie.

Tu lui donnes un sac de légumes. Il dit merci. Tu repars.

Le goût dans ta bouche, c'est celui de tous les compromis que tu fais pour que la terre continue. Amer. Familier.`,
          impact: { resources: 10, moral: -25, links: -5, comfort: 5 },
          setsFlag: 'philippe_noir',
        },
        {
          id: 'seul',
          label: "Faire tout seul. Comme d'habitude.",
          conditions: {},
          consequence: `Deux semaines. Six hectares. Seul.

Les quatre premiers jours, ça va. Les muscles se souviennent. Le cinquième jour, le dos bloque. Le septième, tu perds 200 kilos de tomates — trop mûres, pas récoltées à temps.

Tu fais les comptes. 200 kilos à 3,50. 700 euros au sol. Qui pourrissent.

Le dixième jour, tu tombes dans le rang 3. Pas une chute — un effondrement. Le corps qui dit : c'est fini pour aujourd'hui.

Tu restes assis entre les plants. Les tomates te regardent. Tu les regardes. Trente ans que tu fais ça. Trente ans que la terre demande plus que tu ne peux donner.`,
          impact: { resources: -15, moral: -20, links: -10, comfort: -20 },
          setsFlag: null,
        }
      ]
    },

    // S5 — Monde B — Circuits courts / Cantine
    {
      id: 'philippe_s5',
      world: 'B',
      domain: 'alimentation',
      context: `Mardi, 14h. Rendez-vous à la mairie avec l'adjointe aux cantines scolaires. Objet : convention d'approvisionnement local.

L'idée est simple : les cantines de Montauban achètent directement aux producteurs locaux. Pas de grossiste. Pas de centrale d'achat. Du champ à l'assiette, trente kilomètres max.

Les chiffres : 2000 repas par jour. 40% du budget alimentaire réservé au local. C'est dans le cahier des charges.

Pour toi, ça représente 200 kilos de légumes par semaine, de septembre à juin. À un prix fixé pour l'année — pas le marché mondial, pas le cours de la tomate espagnole. Un prix juste.

L'adjointe te tend le contrat. Cinq pages. Tu n'as pas l'habitude des contrats.`,
      choices: [
        {
          id: 'signer_convention',
          label: "Signer. C'est ce que tu attends depuis trente ans.",
          conditions: {},
          consequence: `Tu signes. Le stylo tremble un peu — la main d'un paysan qui n'a pas l'habitude des bureaux.

200 kilos par semaine. C'est un revenu stable. Prévisible. Le mot que tu ne connais pas dans ton métier.

La première livraison est un lundi de septembre. Tu amènes les cagettes à la cuisine centrale. Le chef regarde tes tomates.

« C'est des vraies. »

Tu ne comprends pas. « Évidemment que c'est des vraies. »

Il rit. « Tu sais pas ce qu'on nous envoie d'habitude. »

Tu sais pas. Et tu ne veux pas savoir. Mais tes tomates sont dans les assiettes des gamins de Montauban. Et ça, c'est quelque chose.

Le soir, tu appelles Gérard. « Y'a de la place pour toi aussi dans la convention. »`,
          impact: { resources: 20, moral: 20, links: 15, comfort: 5 },
          setsFlag: 'philippe_convention',
        },
        {
          id: 'hesiter',
          label: "Demander du temps. Un contrat, c'est un engagement.",
          conditions: {},
          consequence: `« Je peux réfléchir ? Une semaine ? »

L'adjointe hoche la tête. « Bien sûr. Mais les cantines ouvrent dans trois semaines. On a besoin de savoir. »

Tu rentres chez toi avec le contrat. Tu le lis trois fois. Les clauses de qualité — bio ou raisonné. Les volumes — 200 kilos, c'est beaucoup pour six hectares. Les pénalités de retard — si tu ne livres pas, la cantine achète ailleurs et te facture la différence.

Tu appelles ton fils. Il est analyste financier à Lyon. Il ne comprend rien à la terre mais il sait lire un contrat.

« Papa, c'est correct. Le prix est juste. Les pénalités sont standard. Signe. »

Tu signes le vendredi. Parce que ton fils a dit de signer. Et parce que tu sais que c'est correct. Mais le délai t'a coûté — la mairie a donné les poireaux à Gérard. Qui n'a pas hésité, lui.`,
          impact: { resources: 10, moral: 5, links: 0, comfort: 0 },
          setsFlag: 'philippe_convention',
        },
        {
          id: 'refuser_convention',
          label: "Refuser. Tu ne veux pas dépendre de la mairie.",
          conditions: {},
          consequence: `« Non merci. Je vends au marché. Je suis indépendant. »

L'adjointe ne cache pas sa déception. « On a besoin de producteurs locaux, Philippe. »

« Et moi j'ai besoin de liberté. »

Le mot sonne bien. Liberté. Mais à 55 ans, la liberté du maraîcher, c'est la liberté de se lever à 5h sans filet, de dépendre du temps, du marché et de la santé de ton dos.

Gérard signe. Marie-Claire aussi. Sanjay aussi. Ils livrent les cantines. Ils ont un revenu stable. Toi, tu as ta fierté et tes insomnies.

La liberté, en agriculture, ça veut dire : pas de patron. Ça veut aussi dire : pas de coussin quand tu tombes.`,
          impact: { resources: -5, moral: 5, links: -15, comfort: 0 },
          setsFlag: null,
        }
      ]
    },

    // S6 — Monde A — Transmission
    {
      id: 'philippe_s6',
      world: 'A',
      domain: 'liens',
      context: `Dimanche, 12h. Ton fils appelle. De Lyon.

« Papa. Il faut qu'on parle de la ferme. »

Tu sais ce qui vient. Ça fait deux ans que tu le sais.

« Je ne reprendrai pas. »

Le silence est long. Tu regardes par la fenêtre. Les rangs de tomates, les tuteurs en bois, le cerisier que ton père a planté.

« Et tu veux que je fasse quoi ? »

« Vendre, peut-être. Ou trouver quelqu'un. Je sais pas, papa. Mais tu peux pas continuer comme ça. Tu as 55 ans et tu bosses comme un type de 30. »

Il a raison. Évidemment qu'il a raison. Les chiffres sont de son côté. La terre n'est pas rentable. Le dos lâche. La solitude pèse.

Mais vendre six hectares de terre que ton père t'a donnés — c'est pas un bilan financier. C'est un deuil.`,
      choices: [
        {
          id: 'vendre',
          label: "Réfléchir à vendre. Il a peut-être raison.",
          conditions: {},
          consequence: `Tu fais estimer. L'agent immobilier — un type en costume qui n'a jamais touché la terre — regarde les parcelles.

« C'est bien situé. Trente minutes de Montauban. Avec un permis de construire, on peut... »

« Non. C'est de la terre agricole. Pas du terrain à bâtir. »

Il hausse les épaules. « En terre agricole, ça vaut 35 000 euros les six hectares. C'est pas grand-chose. »

35 000 euros. Trente ans de ta vie. Le prix d'une voiture d'occasion.

Tu ne vends pas. Pas maintenant. Mais tu as regardé le chiffre. Et le chiffre t'a regardé en retour.`,
          impact: { resources: 0, moral: -25, links: -5, comfort: 0 },
          setsFlag: null,
        },
        {
          id: 'continuer',
          label: "Continuer. Tant que le corps tient.",
          conditions: {
            requiresMinStat: { comfort: 35 }
          },
          blockedText: "Le corps ne tient plus. Tu le sais. Il le sait.",
          consequence: `« Je continue. »

Ton fils soupire. « Papa... »

« Tant que je peux monter sur le tracteur, je continue. Le jour où je peux pas, on en reparle. »

Il raccroche. Le silence revient. Tu sors. Le champ t'attend.

Tu travailles jusqu'au coucher du soleil. Les gestes sont automatiques — trente ans de mémoire dans les mains. Tu ne penses à rien. C'est le seul moment de la journée où tu ne penses à rien.

Le soir, le dos te rappelle. Les genoux aussi. Tu prends un anti-inflammatoire avec le dîner. Comme hier. Comme demain.`,
          impact: { resources: 5, moral: 5, links: -10, comfort: -15 },
          setsFlag: null,
        },
        {
          id: 'chercher',
          label: "Chercher un repreneur. Quelqu'un qui aime la terre.",
          conditions: {
            requiresMinStat: { links: 35 }
          },
          blockedText: "Tu ne connais personne dans le réseau qui cherche une terre.",
          consequence: `Tu appelles la chambre d'agriculture. Répertoire des porteurs de projet.

Trois semaines plus tard, un couple vient voir la ferme. Lui, ancien cuisinier. Elle, agronome. La trentaine, les yeux grands ouverts.

« On cherche une exploitation maraîchère à taille humaine. Avec un accès au marché local. »

Tu leur montres les parcelles. Le système de goutte-à-goutte. Le cerisier. Le sol — argileux, profond, riche.

Ils se regardent. Tu connais ce regard. C'est celui que tu avais à trente ans quand tu as vu cette terre pour la première fois.

« On peut faire un bail progressif ? Tu nous accompagnes la première année ? »

Tu hoches la tête. C'est pas vendre. C'est pas abandonner. C'est transmettre.

Le mot change tout.`,
          impact: { resources: 0, moral: 25, links: 20, comfort: 5 },
          setsFlag: 'philippe_repreneur',
        }
      ]
    },

    // S7 — Monde B — Groupement d'employeurs
    {
      id: 'philippe_s7',
      world: 'B',
      domain: 'travail',
      context: `Mercredi, 9h. Réunion à la Maison de l'Agriculture. Sujet : groupement d'employeurs agricoles.

L'idée de la mairie : mutualiser les besoins en main-d'œuvre. Toi tu as besoin de quelqu'un deux semaines en été. Gérard pareil, mais au printemps. Marie-Claire en automne. À trois, ça fait un emploi quasi permanent.

Le groupement embauche. Les charges sont mutualisées. Le salarié a un CDI. Toi, tu as des bras quand tu en as besoin, sans gérer la paperasse.

L'animatrice du groupement est efficace. Elle a les chiffres. Ça coûte 15% de plus que le travail non déclaré. Mais c'est légal, stable, et le salarié est formé.

Marchal est là aussi. Il n'en a pas besoin — il a son propre personnel. Mais il est venu pour voir. Pour comprendre. Pour juger, peut-être.`,
      choices: [
        {
          id: 'adherer',
          label: "Adhérer au groupement. C'est la bonne solution.",
          conditions: {},
          consequence: `Tu signes l'adhésion. 120 euros par an. En échange : un salarié formé, deux semaines en été, une semaine à l'automne. Toutes les charges prises en charge par le groupement.

Le premier salarié s'appelle Jules. Vingt-quatre ans. BTS agricole. Il connaît les gestes — pas comme un paysan, mais il apprend vite.

Tu lui montres les rangs. Le goutte-à-goutte. Le cerisier. Il écoute. Il note dans un carnet.

Au bout de deux semaines, la récolte est rentrée. Sans que ton dos explose. Sans liquide sous la table. Sans culpabilité.

Jules passe chez Gérard ensuite. Puis chez Marie-Claire. Il a un CDI. Il loue un studio à Montauban. Il vit.

C'est ça que tu voulais, non ? Que quelqu'un vive de la terre sans en crever.`,
          impact: { resources: -10, moral: 25, links: 20, comfort: 15 },
          setsFlag: 'philippe_groupement',
        },
        {
          id: 'observer',
          label: "Attendre un an. Voir si ça tient avant de s'engager.",
          conditions: {},
          consequence: `Gérard adhère. Marie-Claire aussi. Sanjay hésite comme toi.

L'été arrive. Tu es seul dans le champ. Gérard a Jules. Toi tu as ton dos et tes anti-inflammatoires.

La récolte prend trois semaines au lieu de deux. Tu perds encore des kilos de tomates. Le camion tousse. Tu tousses aussi.

En septembre, Gérard te raconte. « Jules est super. Et j'ai pu prendre trois jours de repos en août. »

Trois jours de repos. En août. En agriculture. Tu ne savais pas que c'était possible.

Tu t'inscris au groupement en octobre. Pour la prochaine saison. Mais cet été-là, tu l'as payé de ta santé.`,
          impact: { resources: -10, moral: -10, links: -5, comfort: -15 },
          setsFlag: null,
        },
        {
          id: 'formation',
          label: "Adhérer — et proposer de former les salariés toi-même.",
          conditions: {
            requiresMinStat: { moral: 45, links: 40 }
          },
          blockedText: "Tu n'as ni l'énergie ni la légitimité perçue pour ça.",
          consequence: `« Les BTS, c'est bien. Mais un gamin qui a jamais touché ma terre, il va me bousiller les rangs de tomates. Je veux les former moi-même. Une journée chez moi avant la saison. »

L'animatrice accepte. Marchal ricane : « Tu fais professeur maintenant ? »

Tu ignores. La formation a lieu en mai. Quatre jeunes. Tu leur montres les gestes — pas ceux des manuels, ceux que trente ans de terre ont gravés dans tes mains.

L'un d'eux — Amina, 22 ans, fille d'un restaurateur — pose des questions que personne ne t'avait posées depuis ton fils à 6 ans. « Pourquoi les rangs sont espacés comme ça ? Pourquoi tu arroses le soir et pas le matin ? »

Parce que. Parce que mon père faisait comme ça. Parce que la terre me l'a appris. Parce que trente ans, ça laisse un savoir que les livres n'ont pas.

Tu rentres chez toi le soir avec un sentiment étrange. Quelqu'un a voulu apprendre ce que tu sais. Ça n'a pas de prix.`,
          impact: { resources: -5, moral: 30, links: 25, comfort: 5 },
          setsFlag: 'philippe_groupement',
        }
      ]
    }
  ]
},

  // ============ LÉO - Lycéen ============
  leo: {
  id: 'leo',
  name: 'Léo',
  age: 17,
  role: 'Lycéen en Première',
  description: "Première générale au lycée Bourdelle. Ta mère est infirmière, ton père est parti quand tu avais 8 ans. Un vélo, un téléphone fissuré, une colère que tu ne sais pas encore nommer. Tu votes dans un an.",
  initialStats: { resources: 30, moral: 60, links: 45, comfort: 50 },
  scenes: [

    // S0 — Monde A — Éducation / Citoyenneté
    {
      id: 'leo_s0',
      world: 'A',
      domain: 'education',
      context: `Lundi, 10h. Cours d'EMC — Enseignement Moral et Civique. M. Ferrand parle de la démocratie locale. Le budget municipal. La fiscalité. Des mots qui glissent sur la classe comme l'eau sur du plastique.

Sauf que Ferrand dit un truc qui t'accroche : « Le budget de Montauban, c'est 120 millions d'euros. Dont 8 millions pour la vidéosurveillance. Et 600 000 pour la culture. »

8 millions. 600 000. Tu fais le calcul dans ta tête. Treize fois plus pour les caméras que pour les livres.

Kenza, à côté de toi, lève la main. « C'est les habitants qui décident du budget ? »

Ferrand hésite. « En théorie, les élus décident au nom des habitants. En pratique... c'est plus compliqué. »

En pratique. C'est toujours « en pratique ». En théorie t'as des droits. En pratique t'as 17 ans et personne ne t'écoute.

Ferrand propose un exercice : rédiger une motion citoyenne sur un sujet local. Par groupes de quatre. « Choisissez un thème. Argumentez. On la présente au conseil municipal des jeunes. »

Le conseil municipal des jeunes. Un truc qui existe sur le papier et que personne n'a jamais vu fonctionner.`,
      choices: [
        {
          id: 'motion',
          label: "Proposer une motion sur le budget culture vs sécurité.",
          conditions: {
            requiresMinStat: { moral: 45 }
          },
          blockedText: "Tu n'as pas l'énergie de te lancer là-dedans. C'est un exercice scolaire, pas une révolution.",
          consequence: `Tu lèves la main. « On fait le budget. Pourquoi 8 millions pour les caméras et 600 000 pour la culture. »

Ferrand te regarde. Un sourire. Le genre de sourire des profs qui attendaient que quelqu'un morde.

Kenza, Samir et Jade sont dans ton groupe. Vous passez deux heures à éplucher le budget municipal — en ligne, tout est public, personne ne le lit jamais.

La motion fait trois pages. C'est maladroit, c'est naïf, et Samir a mis trois fautes d'orthographe au mot « surveillance ». Mais c'est argumenté.

Ferrand la transmet au conseil municipal des jeunes. Qui la transmet à... personne, probablement. Mais tu l'as écrite. Et Kenza l'a postée sur Instagram. 47 likes. C'est pas une révolution. C'est un début.`,
          impact: { resources: -5, moral: 20, links: 15, comfort: 0 },
          setsFlag: 'leo_motion',
        },
        {
          id: 'suivre',
          label: "Faire l'exercice, mais sur un sujet facile. Les transports.",
          conditions: {},
          consequence: `Transports. Tout le monde est d'accord : le bus 3 est pourri, le dernier passe à 19h30, et le dimanche c'est le désert.

La motion est propre. Factuelle. Ennuyeuse. Ferrand met 14/20. « Bon travail, mais pas de prise de risque. »

Pas de prise de risque. Tu ranges la copie. Tu sais qu'il a raison. Le budget culture vs sécurité, c'était le vrai sujet. Mais le vrai sujet fait peur.

Kenza te regarde en sortant. « T'aurais pu faire mieux. »

Elle a raison. Tout le monde a raison. Sauf toi, qui fais le minimum pour que personne ne le remarque.`,
          impact: { resources: 5, moral: -10, links: 0, comfort: 5 },
          setsFlag: null,
        },
        {
          id: 'refuser',
          label: "Dire que c'est du théâtre. Le conseil des jeunes ne sert à rien.",
          conditions: {},
          consequence: `« Monsieur. Le conseil municipal des jeunes, il se réunit combien de fois par an ? »

Ferrand hésite. « Deux fois. En théorie. »

« Et il a obtenu quoi, concrètement, depuis sa création ? »

Silence. Ferrand est honnête — c'est sa qualité et son défaut. « Pas grand-chose. Un banc dans le parc Chambord. »

« Un banc. En dix ans. Donc on rédige une motion pour un banc. »

La classe rit. Ferrand ne rit pas. « Tu as raison sur le constat, Léo. Mais le cynisme, c'est le meilleur allié de ceux qui veulent que rien ne change. »

Ça te reste en travers. Parce qu'il a raison aussi.

Tu fais l'exercice. Sans conviction. Sans enthousiasme. Le minimum.`,
          impact: { resources: 0, moral: -5, links: -5, comfort: 0 },
          setsFlag: 'leo_cynique',
        }
      ]
    },

    // S1 — Monde B — Éducation / Citoyenneté
    {
      id: 'leo_s1',
      world: 'B',
      domain: 'education',
      context: `Mardi, 14h. Convocation au CDI. Pas une punition — une invitation. Ferrand et la CPE organisent un « Atelier Citoyen » : les lycéens préparent des propositions pour le budget participatif de la ville.

Le budget participatif. Pas celui du lycée — celui de la ville. 500 000 euros. Les habitants votent. Et cette année, pour la première fois, les 16-18 ans aussi.

Tu peux voter. À 17 ans. Sur un vrai budget. Avec de vraies conséquences.

Ferrand distribue la liste des projets soumis. Tu parcours. Un jardin partagé aux Musiciens. Une cour d'école végétalisée. Des arceaux vélo couverts. Un local de répétition pour les musiciens.

Kenza pointe un projet : « Piste cyclable sécurisée boulevard Alsace-Lorraine. » Elle te regarde. « C'est ton trajet, non ? »

C'est ton trajet. Chaque matin. Le boulevard où tu frôles les rétros des SUV.`,
      choices: [
        {
          id: 'impliquer_bp',
          label: "T'impliquer. Défendre le projet vélo.",
          conditions: {},
          consequence: `Tu prends le projet vélo. Tu connais le boulevard — chaque nid-de-poule, chaque angle mort, l'endroit exact où les voitures se rabattent sans regarder.

Tu fais une présentation. Pas PowerPoint — une vidéo. Ton téléphone fissuré, scotché sur le guidon, le trajet filmé un mardi matin. Le bruit des klaxons. Le frôlement du bus. Le trou dans le bitume qui t'a fait tomber en octobre.

Kenza monte le son. Samir ajoute des sous-titres. Jade met la musique.

La vidéo fait 2 minutes. À l'assemblée citoyenne, tu la passes sur l'écran. Les gens regardent. Certains ont les yeux grands ouverts — ils n'avaient jamais vu le boulevard depuis un vélo.

Le projet vélo finit 5ème. Financé. Ta vidéo est sur le site de la mairie.

Tu n'as pas changé le monde. Mais tu as montré un bout de ton monde. Et quelqu'un a regardé.`,
          impact: { resources: -5, moral: 25, links: 20, comfort: 5 },
          setsFlag: 'leo_budgetParticipatif',
        },
        {
          id: 'voter_seul',
          label: "Voter, mais sans t'impliquer plus. C'est déjà bien.",
          conditions: {},
          consequence: `Tu votes en ligne. Trois clics. Projet vélo en premier choix. Jardin partagé en deuxième.

C'est fait. Tu as exercé ton droit. Le premier vrai vote de ta vie — pas un sondage de classe, pas un « qui veut de la pizza ? » — un vote qui bouge de l'argent.

Le résultat tombe une semaine plus tard. Le projet vélo est 7ème. Pas financé. Il manquait 30 voix.

30 voix. Tu penses aux gens de ta classe qui n'ont pas voté. Aux potes qui ont dit « ça sert à rien ». Aux 30 voix qui dormaient dans des poches de téléphone.

Kenza, elle, a fait campagne sur Insta. Son projet (le local musique) est passé. Elle te regarde avec un truc qui ressemble à de la pitié.

« Faut pas juste voter, Léo. Faut convaincre. »`,
          impact: { resources: 0, moral: -5, links: -5, comfort: 0 },
          setsFlag: null,
        },
        {
          id: 'porter_autre',
          label: "Soutenir le projet de quelqu'un d'autre plutôt que le tien.",
          conditions: {
            requiresMinStat: { links: 40 }
          },
          blockedText: "Tu ne connais pas assez de gens pour jouer les médiateurs.",
          consequence: `Le projet jardin partagé aux Musiciens est porté par un type — Karim, animateur social. Tu le vois à l'assemblée préparatoire. Il est nerveux, pas à l'aise avec le micro.

Tu vas le voir. « Tu veux un coup de main ? Je peux faire une vidéo de ton projet. »

Il te regarde. Un lycéen de 17 ans qui propose de l'aider. Il hésite. Puis : « Ouais. Viens samedi aux Musiciens. Je te montre le terrain. »

Le samedi, tu filmes. Le terrain vague. Les gamins qui jouent sur le béton. Karim qui explique ce que ça pourrait être.

La vidéo tourne. Le projet jardin finit 3ème. Financé.

Tu n'as rien gagné pour toi. Mais tu as appris un truc : le pouvoir, c'est pas que voter. C'est raconter l'histoire de quelqu'un pour que d'autres l'entendent.`,
          impact: { resources: -5, moral: 20, links: 25, comfort: 0 },
          setsFlag: 'leo_budgetParticipatif',
        }
      ]
    },

    // S2 — Monde A — Transports
    {
      id: 'leo_s2',
      world: 'A',
      domain: 'transports',
      context: `Mercredi, 17h45. Entraînement de basket fini. Le dernier bus est à 18h10. Tu es à 15 minutes à pied de l'arrêt.

Tu cours. Le sac tape sur le dos. Le téléphone vibre — ta mère : « Tu rentres comment ? »

Bonne question.

Le bus 3 s'arrête à 19h30 le mercredi. Si tu rates celui de 18h10, c'est fini. Trois kilomètres à pied dans le noir. Ou ta mère qui sort de sa garde pour venir te chercher — et qui sera crevée demain.

Tu arrives à l'arrêt à 18h08. Essoufflé. Le panneau clignote : « Bus 3 — Retard estimé : 12 min. »

12 minutes. En décembre. Il fait nuit. Le banc est mouillé. L'abribus n'a pas de toit — il a été vandalise le mois dernier et personne ne l'a réparé.

Un autre type attend. La vingtaine. Capuche. Il fixe son téléphone.`,
      choices: [
        {
          id: 'attendre_bus',
          label: "Attendre. Le bus finira par arriver.",
          conditions: {},
          consequence: `Le bus arrive à 18h24. Quatorze minutes de retard. Le chauffeur ne s'excuse pas — il a l'air aussi fatigué que toi.

Tu t'assois au fond. Le bus pue le diesel et le désinfectant. Trois arrêts. Tu descends.

Ta mère est à la maison. « T'as mangé ? »

« Non. »

Elle te fait des pâtes. Elle est en pyjama. Elle commence sa garde à 6h demain. Elle devrait dormir.

Tu manges les pâtes. Tu penses au bus. Au toit cassé. Aux 12 minutes sous la pluie. À tous les mercredis comme celui-là.

Un jour tu auras le permis. Une voiture. Tu ne dépendras plus du bus 3 et de ses retards. Mais d'ici là — combien de mercredis ?`,
          impact: { resources: 0, moral: -15, links: 0, comfort: -10 },
          setsFlag: null,
        },
        {
          id: 'appeler_mere',
          label: "Appeler ta mère. Elle viendra.",
          conditions: {},
          consequence: `« Maman, le bus est en retard. Tu peux venir ? »

Silence. Tu entends le bruit de la télé derrière. Elle se lève.

Vingt minutes plus tard, la Clio se gare devant l'arrêt. Ta mère a mis un manteau par-dessus son pyjama.

« Monte. »

Tu montes. Elle ne dit rien. Tu ne dis rien.

À la maison, elle retourne se coucher. Sa garde commence à 6h. Elle a perdu une heure de sommeil pour trois kilomètres de route.

Tu te sens comme un poids. Pas un fils — un poids logistique. Un problème de transport que le système ne résout pas et que ta mère absorbe avec son corps.`,
          impact: { resources: -5, moral: -10, links: -10, comfort: 10 },
          setsFlag: null,
        },
        {
          id: 'marcher',
          label: "Marcher. T'es pas en sucre.",
          conditions: {
            requiresMinStat: { comfort: 40 }
          },
          blockedText: "Il fait nuit, il pleut, t'as pas mangé. Non.",
          consequence: `Tu marches. Trois kilomètres. Les voitures passent sans ralentir. Les phares t'éblouissent. Le trottoir s'arrête au bout de 500 mètres — après, c'est le bas-côté.

Tu mets tes écouteurs. De la musique. Le rythme aide. Un pas, un beat, un pas.

Tu arrives chez toi à 19h. Trempé. Affamé. Mais debout.

Ta mère te regarde. « T'as marché ? »

« Le bus était en retard. »

Elle ne dit rien. Elle pose une assiette. Tu manges. Tu es fatigué mais il y a un truc — un truc stupide, peut-être — une fierté. Tu as marché dans le noir et tu es rentré. Sans aide. Sans bus. Sans personne.

C'est pas de la liberté. C'est de la survie maquillée en autonomie. Mais à 17 ans, la différence est floue.`,
          impact: { resources: 0, moral: 5, links: 0, comfort: -15 },
          setsFlag: null,
        }
      ]
    },

    // S3 — Monde B — Transports
    {
      id: 'leo_s3',
      world: 'B',
      domain: 'transports',
      context: `Mercredi, 18h. Entraînement fini. Tu sors du gymnase et tu vois le panneau : « Pass Jeunes — Transports gratuits pour les 12-25 ans ».

C'est nouveau. Depuis septembre. Le bus, le vélo en libre-service, et même le TER jusqu'à Toulouse le week-end. Gratuit.

Tu as la carte dans ton portefeuille. Tu l'utilises tous les jours. Mais ce soir, c'est le week-end qui t'intéresse. Samir t'a proposé d'aller à un concert à Toulouse samedi. Rap. 15 euros l'entrée.

Le TER est gratuit. Il te reste juste l'entrée à payer. 15 euros. C'est ton budget snack de la semaine.

Ta mère ne dira rien — elle est de garde samedi soir de toute façon. Mais 15 euros, c'est 15 euros.`,
      choices: [
        {
          id: 'concert',
          label: "Y aller. Tu as 17 ans, tu as le droit de vivre.",
          conditions: {
            requiresMinStat: { resources: 25 }
          },
          blockedText: "15 euros. Tu n'as pas cette marge. Pas cette semaine.",
          consequence: `Le TER de 17h32. Gratuit. Tu montres ta carte. Le contrôleur hoche la tête sans te regarder — il a l'habitude, maintenant.

Toulouse en 25 minutes. Samir t'attend devant la salle. Le concert est dans un hangar reconverti. 200 personnes. La basse fait trembler le sol.

Tu danses. Tu cries. Tu oublies le lycée, le bus, les cours d'EMC, le budget de la ville. Tu as 17 ans et le son est trop fort et c'est exactement ce qu'il faut.

Le TER de 23h40 — le dernier, cadencé jusqu'à minuit maintenant. Tu t'endors contre la vitre. Montauban arrive trop vite.

15 euros. Le meilleur investissement du mois.`,
          impact: { resources: -10, moral: 25, links: 15, comfort: 5 },
          setsFlag: 'leo_passJeunes',
        },
        {
          id: 'economiser',
          label: "Rester. Économiser les 15 euros.",
          conditions: {},
          consequence: `Tu dis à Samir que tu peux pas. « La thune. »

Il comprend. Ou pas. Il a un père qui file du cash. Pas toi.

Samedi soir, tu restes à la maison. Ta mère est de garde. L'appartement est vide. Tu scrolles. Samir poste des stories du concert. Le son, les gens, la lumière.

Tu fermes le téléphone. Tu mets un film. Tu t'endors sur le canapé.

15 euros. C'est rien. C'est tout. C'est la différence entre être là et regarder les autres y être.`,
          impact: { resources: 5, moral: -15, links: -10, comfort: 5 },
          setsFlag: null,
        },
        {
          id: 'proposer',
          label: "Proposer à Samir de faire un concert ici, gratuit, plutôt que d'aller à Toulouse.",
          conditions: {
            requiresMinStat: { links: 40 }
          },
          blockedText: "Tu ne connais pas assez de monde pour organiser ça.",
          consequence: `« Et si on organisait un truc ici ? Au local de quartier. Y'a des gens qui rappent au lycée. Jade fait du beatbox. On fait une scène ouverte. »

Samir te regarde. « Genre un open mic ? »

« Genre un truc à nous. Gratuit. Pas besoin du TER. »

Ça prend deux semaines. Le local de Villebourbon dit oui. Jade ramène une enceinte. Samir fait l'affiche. Tu gères le son avec ton téléphone et une enceinte Bluetooth.

Trente personnes viennent. C'est pas 200. Mais c'est trente personnes qui n'auraient pas bougé un samedi soir à Montauban.

Kenza rappe un texte qu'elle a écrit. C'est bon. Vraiment bon. Tu ne savais pas.

Le lendemain, Ferrand te dit : « J'ai vu ta soirée sur Instagram. C'est ça, la citoyenneté. »

Tu lèves les yeux au ciel. Mais au fond, il a peut-être pas tort.`,
          impact: { resources: -5, moral: 20, links: 25, comfort: 5 },
          setsFlag: 'leo_passJeunes',
        }
      ]
    },

    // S4 — Monde A — Emploi / Précarité jeune
    {
      id: 'leo_s4',
      world: 'A',
      domain: 'travail',
      context: `Vendredi, 16h. Ta mère t'attend à la cuisine.

« Léo. Il faut qu'on parle d'argent. »

Tu sais ce qui vient. Le frigo est moins plein qu'avant. Les pâtes plus fréquentes. L'électricité augmente, la mutuelle aussi, et son salaire d'infirmière stagne.

« Tu pourrais trouver un petit boulot le week-end ? Même quelques heures. Ça nous aiderait. »

Elle ne dit pas « je n'y arrive plus ». Mais ses yeux le disent.

Tu as 17 ans. Tu passes le bac dans six mois. Tu fais du basket trois fois par semaine.

Travailler le week-end, c'est renoncer à quoi ? Au basket ? Aux révisions ? Au sommeil ?`,
      choices: [
        {
          id: 'bosser',
          label: "Chercher un job. Elle en a besoin.",
          conditions: {},
          consequence: `Tu trouves un truc en une semaine. McDo, samedi et dimanche midi. 8 heures. 90 euros net.

Le premier samedi, tu apprends que le sourire fait partie de l'uniforme. Le deuxième samedi, tu apprends à vider une friteuse à 100°C sans te brûler. Le troisième, tu apprends que le manager s'appelle Jordan, il a 22 ans, et il est aussi crevé que toi.

Tu donnes les 90 euros à ta mère. Elle les prend sans rien dire. Le lundi, le frigo est plein.

Le bac blanc est dans trois semaines. Tu révises le soir, après le basket, après les cours. Le sommeil est un luxe. Les notes baissent un peu. Ferrand te regarde en cours. Il ne dit rien. Il voit.`,
          impact: { resources: 15, moral: -10, links: -5, comfort: -15 },
          setsFlag: 'leo_travaille',
        },
        {
          id: 'refuser_job',
          label: "Dire non. Le bac d'abord.",
          conditions: {
            requiresMinStat: { moral: 50 }
          },
          blockedText: "Tu ne peux pas lui dire non. Pas avec ces yeux-là.",
          consequence: `« Maman. Je passe le bac dans six mois. Si je rate, je fais quoi ? McDo à plein temps ? C'est ça que tu veux ? »

Elle recule. Comme si tu l'avais giflée.

« Non. Tu as raison. Excuse-moi. »

Tu regrettes immédiatement. Pas les mots — le ton. Celui d'un adulte qui parle à un adulte. Sauf que tu n'es pas un adulte. Et elle est ta mère.

Le soir, tu l'entends au téléphone. Elle demande une avance à sa sœur. 200 euros. Tu entends le silence de la fierté qui se plie.

Tu révises. Les notes tiennent. Le bac approche. Et dans la cuisine, les pâtes sont toujours là, silencieuses, bon marché, inépuisables.`,
          impact: { resources: -5, moral: 5, links: -10, comfort: 5 },
          setsFlag: null,
        },
        {
          id: 'solution',
          label: "Proposer autre chose. Tu as une idée.",
          conditions: {
            requiresMinStat: { links: 40 }
          },
          blockedText: "Tu n'as pas le réseau pour inventer une solution alternative.",
          consequence: `« Et si je donnais des cours particuliers ? Kenza fait ça. 12 euros de l'heure. Maths et français. Je suis bon en maths. »

Ta mère te regarde. « Tu connais des gens ? »

Tu écris à Ferrand. Il te met en contact avec deux familles. Un gamin de 4ème qui galère en maths. Une fille de 3ème qui prépare le brevet.

Trois heures par semaine. 36 euros. C'est moins que le McDo. Mais tu choisis tes horaires. Tu révises en même temps. Et le gamin de 4ème progresse — il passe de 6 à 10 en deux mois.

C'est pas assez pour remplir le frigo. Mais ta mère sourit quand tu lui donnes les billets. Et toi, tu as trouvé un truc qui te prend pas ta vie pour la donner à quelqu'un d'autre.`,
          impact: { resources: 10, moral: 15, links: 15, comfort: 0 },
          setsFlag: 'leo_cours',
        }
      ]
    },

    // S5 — Monde B — Citoyenneté
    {
      id: 'leo_s5',
      world: 'B',
      domain: 'citoyennete',
      context: `Samedi, 10h. Journée « Citoyen d'un jour » organisée par la mairie. Les 16-18 ans sont invités à passer une journée dans un service municipal. Pompiers, médiathèque, urbanisme, police municipale, cantine.

Ferrand en a parlé en cours. « C'est pas obligatoire. Mais c'est gratuit, c'est une journée off du lycée, et ça compte dans le dossier Parcoursup. »

Parcoursup. Le mot magique qui fait bouger les lycéens. Tu t'es inscrit. Tu as choisi « urbanisme ».

À 9h, tu es devant le service. Un type en polo t'accueille. « Léo ? Moi c'est Romain, chargé de projet. Aujourd'hui tu vas voir comment on décide où mettre un passage piéton. »

Un passage piéton. C'est pas très glorieux. Mais Romain a l'air sérieux. Et il a un plan de Montauban affiché au mur avec des Post-it de couleur partout.`,
      choices: [
        {
          id: 'fond',
          label: "T'investir à fond. Tu veux comprendre comment ça marche.",
          conditions: {},
          consequence: `Romain te montre tout. Les demandes des habitants (350 par an). Le budget (limité). Les critères de priorisation. L'accident de vélo du boulevard Herriot qui a déclenché le réaménagement.

Tu passes la matinée sur le terrain — littéralement. Romain te file un gilet jaune et un formulaire. Tu comptes les piétons au carrefour de la rue de la Mairie. Pendant 45 minutes.

C'est chiant. C'est aussi la première fois que tu comprends que derrière chaque passage piéton, il y a quelqu'un qui a compté des gens debout au bord d'un trottoir.

L'après-midi, tu assistes à une réunion. Romain défend un réaménagement devant l'école Michelet. Un élu objecte : « Pas de budget cette année. »

Tu vois Romain encaisser. Sourire. Repartir avec ses Post-it.

Le soir, tu comprends un truc : la politique, c'est pas que des discours. C'est des Post-it, des comptages, et des gens qui se battent pour un passage piéton.`,
          impact: { resources: 0, moral: 20, links: 15, comfort: 0 },
          setsFlag: 'leo_citoyenne',
        },
        {
          id: 'minimum',
          label: "Faire le minimum. C'est pour Parcoursup, pas pour la gloire.",
          conditions: {},
          consequence: `Tu suis Romain. Tu hoches la tête. Tu poses deux questions. Tu remplis le formulaire de présence.

Romain le voit. Il ne dit rien. Il a l'habitude — les lycéens qui viennent pour la ligne sur le CV, pas pour le fond.

À 16h, tu signes ta feuille de présence et tu pars. Romain te serre la main. « Si ça t'intéresse un jour, le service recrute des stagiaires. »

Ça ne t'intéresse pas. Pas aujourd'hui. Mais en rentrant, tu passes devant le carrefour de la rue de la Mairie. Celui que Romain veut réaménager. Tu regardes les piétons qui traversent. Tu les comptes sans le vouloir.

Certains trucs s'impriment malgré toi.`,
          impact: { resources: 5, moral: 0, links: 5, comfort: 0 },
          setsFlag: null,
        },
        {
          id: 'proposer_video',
          label: "Proposer à Romain de documenter sa journée en vidéo.",
          conditions: {
            requiresFlag: 'leo_budgetParticipatif'
          },
          blockedText: "Tu n'as pas encore l'expérience vidéo pour proposer ça.",
          consequence: `« Romain, et si je filmais ta journée ? Pour montrer aux gens ce que c'est, l'urbanisme à Montauban. Pas un truc institutionnel — un vrai truc. »

Il hésite. Puis : « Vas-y. Mais tu montres pas les dossiers confidentiels. »

Tu filmes. Le bureau, les Post-it, le terrain, le comptage de piétons, la réunion. Tu montes le soir — trois minutes, musique, sous-titres.

La vidéo fait 800 vues sur la page de la mairie. C'est pas viral. Mais une mère d'élève commente : « On savait pas que quelqu'un bossait sur ça. Merci. »

Romain t'envoie un message le lendemain. « L'élu a vu la vidéo. Il veut reparler du budget pour le carrefour Michelet. »

Un passage piéton. 800 vues. Un élu qui change d'avis. C'est minuscule. C'est immense.`,
          impact: { resources: -5, moral: 25, links: 20, comfort: 0 },
          setsFlag: 'leo_citoyenne',
        }
      ]
    },

    // S6 — Monde A — Liens / Justice
    {
      id: 'leo_s6',
      world: 'A',
      domain: 'securite',
      context: `Jeudi, 18h. Tu sors du lycée. Kenza marche à côté de toi. Vous parlez du bac, de Parcoursup, du concert que Samir a raté.

Devant le Monoprix, un contrôle de police. Deux agents. Un homme noir, la trentaine, sac isotherme sur le dos. Livreur, visiblement.

Ils vérifient ses papiers. Il a l'air calme. Fatigué. Les bras le long du corps.

Un des agents fouille son sac. L'autre prend des notes.

Kenza s'arrête. « C'est le troisième que je vois cette semaine. »

Toi aussi. Mais tu n'y fais plus attention. Ou tu fais semblant.

L'homme te regarde. Une seconde. Pas un appel à l'aide — juste un regard. Celui de quelqu'un qui vérifie si quelqu'un voit.`,
      choices: [
        {
          id: 'rester_voir',
          label: "Rester. Regarder. Être témoin.",
          conditions: {},
          consequence: `Tu t'arrêtes. Tu ne filmes pas — pas de provocation. Tu restes debout à cinq mètres. Tu regardes.

L'agent te jette un coup d'œil. « Circulez. »

Tu ne bouges pas. Kenza non plus.

Le contrôle dure dix minutes. L'homme récupère ses papiers. Il repart. En passant devant toi, il hoche la tête. Imperceptible.

Tu ne sais pas son nom. Tu ne le reverras peut-être jamais. Mais tu as vu. Et il sait que tu as vu.

Kenza, en marchant : « Ça sert à quoi de regarder ? »

Tu ne sais pas. Peut-être à rien. Peut-être que voir, c'est le premier pas avant d'agir. Ou peut-être que c'est un alibi pour ne rien faire.

À 17 ans, la frontière entre le courage et l'inaction est un mystère.`,
          impact: { resources: 0, moral: 10, links: 5, comfort: -5 },
          setsFlag: 'leo_temoin',
        },
        {
          id: 'filmer_scene',
          label: "Sortir ton téléphone. Filmer.",
          conditions: {
            requiresMinStat: { moral: 55 }
          },
          blockedText: "Tu n'as pas le cran. Pas aujourd'hui. Tu baisses les yeux et tu passes.",
          consequence: `Tu sors le téléphone. L'écran fissuré capte la scène.

L'agent te voit. « Rangez ça. »

« C'est mon droit. Espace public. »

Le ton monte. L'autre agent s'approche. Kenza te tire le bras. « Léo, arrête. »

Tu ranges le téléphone. Mais tu as trente secondes de vidéo. L'homme contrôlé, les agents, le sac fouillé.

Le soir, tu hésites à poster. Trente secondes, c'est rien. C'est hors contexte. C'est de l'huile sur le feu ou un témoignage nécessaire — ça dépend qui regarde.

Tu ne postes pas. Tu gardes la vidéo. Elle est là, dans ton téléphone fissuré, entre les photos de chat et les screenshots de cours. Un petit morceau de réel que personne ne verra.

Mais toi, tu sais qu'il est là.`,
          impact: { resources: -5, moral: 5, links: 5, comfort: -10 },
          setsFlag: 'leo_temoin',
        },
        {
          id: 'passer_leo',
          label: "Continuer. C'est pas tes affaires.",
          conditions: {},
          consequence: `Tu passes. Kenza aussi, après une hésitation.

Vous marchez en silence. Au bout de cent mètres, Kenza dit : « Tu crois qu'il va bien ? »

« Je sais pas. »

« C'est pas normal, Léo. Trois contrôles en une semaine au même endroit. »

Tu sais. Mais savoir et faire, c'est deux verbes différents. Et à 17 ans, sans pouvoir, sans réseau, sans voiture, sans badge, sans rien d'autre qu'un téléphone fissuré — que fais-tu ?

Le soir, tu tombes sur un article. Contrôles au faciès, Montauban. Aucun chiffre officiel. Aucune étude. Comme si ça n'existait pas.

Tu fermes l'article. Tu ouvres tes cours de maths. Le bac n'attend pas la justice.`,
          impact: { resources: 0, moral: -15, links: -5, comfort: 5 },
          setsFlag: null,
        }
      ]
    },

    // S7 — Monde B — Inscription électorale / Transmission
    {
      id: 'leo_s7',
      world: 'B',
      domain: 'citoyennete',
      context: `Lundi, 12h. Cantine du lycée. Kenza pose un tract devant toi.

« Inscription sur les listes électorales. Automatique à 18 ans, mais tu peux vérifier et choisir ton bureau de vote dès maintenant. Permanence à la mairie jeudi. »

Tu as 17 ans. Dans quatre mois, tu en auras 18. Les municipales sont dans un an.

Kenza te regarde. « Tu vas voter ? »

La question est simple. La réponse devrait l'être. Mais tu repenses à Ferrand, au budget participatif, à Romain et ses Post-it, au concert, au bus 3. À tout ce que tu as vu cette année.

« À quoi ça sert ? »

Kenza pose sa fourchette. « Si ça servait à rien, ils feraient pas autant d'efforts pour que les gens s'abstiennent. »`,
      choices: [
        {
          id: 'inscrire',
          label: "Aller vérifier ton inscription. C'est la base.",
          conditions: {},
          consequence: `Jeudi, 16h. La mairie. Un bureau, une fonctionnaire, un formulaire.

« Léo Garnier, né le 14 juillet. Inscription automatique confirmée. Bureau de vote : école Michelet. »

L'école Michelet. Celle du passage piéton de Romain. Celle que tu connais par cœur.

Tu remplis le formulaire. Carte d'électeur envoyée en mars.

En sortant, tu passes devant le panneau des élus. Leurs photos. Leurs noms. Tu n'en connais aucun. Ou presque — l'adjointe aux cantines, tu l'as vue dans une vidéo de Kenza.

Dans un an, tu voteras. Pour ou contre ces visages. Pour ou contre un budget qui met 8 millions dans les caméras ou 500 000 dans un budget participatif.

C'est un bout de papier. Une croix dans une case. Mais c'est la première fois que le système te donne un levier. Un petit. Lourd.`,
          impact: { resources: 0, moral: 20, links: 10, comfort: 0 },
          setsFlag: 'leo_inscrit',
        },
        {
          id: 'campagne',
          label: "Vérifier ton inscription — et lancer une campagne d'inscription au lycée.",
          conditions: {
            requiresMinStat: { moral: 50, links: 45 }
          },
          blockedText: "Tu n'as ni l'énergie ni le réseau pour mobiliser les autres.",
          consequence: `Tu vas à la mairie. Tu vérifies. Puis tu reviens au lycée avec une idée.

« Ferrand. Et si on faisait une permanence d'inscription au lycée ? Un stand, une heure, un jeudi. Juste pour que les gens vérifient. »

Ferrand dit oui. La CPE dit oui. Kenza fait l'affiche. Samir ramène des bonbons (« pour attirer les gens, Léo, faut des bonbons »).

Le stand marche. 23 inscriptions vérifiées. Dont 8 qui n'étaient pas à jour — changement d'adresse, erreur de bureau.

23 personnes. 8 corrigées. C'est pas une révolution. C'est 8 votes qui existeront et qui n'auraient pas existé.

Ferrand te serre la main en fin de journée. « Ça, c'est de l'EMC. »

Tu lèves les yeux au ciel. Mais tu souris.`,
          impact: { resources: -5, moral: 30, links: 25, comfort: 0 },
          setsFlag: 'leo_inscrit',
        },
        {
          id: 'douter',
          label: "Ne pas y aller. Tu n'es pas sûr que ça change quoi que ce soit.",
          conditions: {},
          consequence: `Tu ne vas pas à la mairie. Tu restes inscrit automatiquement — c'est la loi. Mais tu ne vérifies pas.

Les mois passent. La carte d'électeur arrive. Tu la ranges dans le tiroir avec les relevés de notes et les papiers du divorce de tes parents.

Kenza vote aux municipales. Samir aussi. Même Jordan du McDo.

Toi, tu ne sais pas. Le jour J, tu te lèves. Tu regardes le tiroir. Le bureau de vote est à 500 mètres.

Est-ce que tu y vas ? C'est une autre histoire. Celle de dans un an. Celle que tu n'as pas encore écrite.`,
          impact: { resources: 0, moral: -10, links: -5, comfort: 0 },
          setsFlag: null,
        }
      ]
    }
  ]
},

  // ============ NADIA - Mère isolée ============
  nadia: {
  id: 'nadia',
  name: 'Nadia',
  age: 42,
  role: 'Mère isolée, agent administratif',
  description: "Deux enfants : Sofiane, 12 ans, et Yanis, 7 ans. Un CDI à temps partiel à la CAF. Un T3 à Sapiac, deuxième étage. 1180 euros par mois, APL incluses. Tu jongle. Depuis le départ de Karim, tu ne fais que jongler.",
  initialStats: { resources: 35, moral: 45, links: 35, comfort: 40 },
  scenes: [

    // S0 — Monde A — Alimentation / Cantine
    {
      id: 'nadia_s0',
      world: 'A',
      domain: 'alimentation',
      context: `Lundi, 7h30. Tu prépares les cartables. Yanis veut son doudou. Sofiane cherche ses baskets. Le café refroidit.

Sur la table, la facture de cantine. 127 euros pour le mois. Tarif quotient familial 4 — tu es juste au-dessus du seuil réduit. 127 euros, c'est le budget courses d'une semaine.

Sofiane regarde par-dessus ton épaule. « Maman, le gars à la cantine il dit que c'est du surgelé. Ça a le goût de rien. »

Yanis, lui, mange tout. Yanis mange toujours tout.

Tu regardes le relevé de compte sur ton téléphone. 243 euros jusqu'à la fin du mois. La cantine. L'électricité. Les chaussures de Sofiane (les pieds, ça grandit, ça n'attend pas).

La liste dans ta tête tourne. Comme d'habitude. Comme toujours.`,
      choices: [
        {
          id: 'payer_cantine',
          label: "Payer la cantine. Ils mangent au moins un repas correct par jour.",
          conditions: {},
          consequence: `Tu paies. 127 euros. Par virement. Le compte affiche 116 euros pour les vingt jours restants. 5,80 par jour. Pour trois personnes.

Tu fais la liste. Pâtes. Riz. Lentilles. Légumes surgelés. Pas de viande cette semaine. Le poulet, c'est pour le week-end.

Sofiane dit que la cantine c'est « dégueulasse ». Yanis dit que c'est « bon ». La vérité est entre les deux — les légumes sont fades, le dessert est industriel, mais c'est chaud et c'est là.

Le vendredi soir, tu ouvres le frigo. Trois œufs, un fond de crème fraîche, des restes de riz.

Tu fais une omelette au riz. Sofiane lève un sourcil. « C'est quoi ça ? »

« C'est de la cuisine créative. Mange. »

Il mange. Tu ne manges pas. Tu dis que t'as pas faim. C'est un mensonge — mais les mensonges de mère ne comptent pas.`,
          impact: { resources: -15, moral: -10, links: 0, comfort: -5 },
          setsFlag: 'nadia_cantine',
        },
        {
          id: 'sandwich',
          label: "Les retirer de la cantine. Sandwichs maison.",
          conditions: {},
          consequence: `Tu les retires. 127 euros économisés. Le matin, tu te lèves quinze minutes plus tôt pour préparer les sandwichs. Jambon, fromage, une pomme.

Yanis est content — il mange son sandwich sous le préau avec ses copains. Sofiane a honte. « Tout le monde mange à la cantine, maman. »

Pas tout le monde. Mais assez pour que la différence se voie.

Au bout de deux semaines, Sofiane ne mange plus ses sandwichs. Tu les retrouves dans son sac le soir, écrasés, le pain ramolli.

« Sofiane. Tu manges pas ? »

« J'ai pas faim à midi. »

Il a 12 ans. Il a faim à midi. Mais il a plus honte que faim.

Tu le remets à la cantine le mois suivant. 127 euros. La honte coûte plus cher que la cantine.`,
          impact: { resources: 10, moral: -20, links: -10, comfort: -5 },
          setsFlag: null,
        },
        {
          id: 'dossier_caf',
          label: "Refaire ton dossier CAF. Tu as peut-être droit au quotient 3.",
          conditions: {
            requiresMinStat: { moral: 40 }
          },
          blockedText: "Le dossier CAF, c'est trois heures de paperasse. Tu n'as pas l'énergie.",
          consequence: `Tu passes la soirée sur le site de la CAF. Mot de passe oublié. Nouveau mot de passe. Pages qui chargent. Documents à scanner avec ton téléphone — la qualité est pourrie mais ça passe.

Tu recomptes tes revenus. Avec les APL, les allocations familiales, le temps partiel, le crédit d'impôt... Tu es à 12 euros sous le seuil du quotient 3.

12 euros. Pendant un an, tu payais 127 au lieu de 85. 42 euros de trop par mois. 500 euros sur l'année.

La CAF requalifie ton dossier. Rétroactif sur trois mois. Remboursement de 126 euros.

126 euros. C'est les chaussures de Sofiane. C'est un mois de courses en plus. C'est trois heures de ta soirée pour un formulaire mal foutu.

Tu regardes l'écran. Les chiffres. Les cases. Le système qui te doit 500 euros parce qu'une case n'était pas cochée.`,
          impact: { resources: 15, moral: 10, links: 0, comfort: 0 },
          setsFlag: 'nadia_quotient',
        }
      ]
    },

    // S1 — Monde B — Alimentation / Cantine
    {
      id: 'nadia_s1',
      world: 'B',
      domain: 'alimentation',
      context: `Lundi, 8h. Tu déposes Yanis à l'école. La directrice a affiché un nouveau panneau : « Cantine scolaire — Tarification solidaire. Repas de 0,50€ à 6€ selon revenus. Produits locaux. Menu végétarien le jeudi. »

0,50 euros le repas. Pour toi, ça ferait 22 euros par mois au lieu de 127. Tu relis trois fois.

Sofiane lit par-dessus ton épaule. « C'est vrai ? 50 centimes ? »

« Si c'est écrit, c'est vrai. »

« Et c'est bon ? Parce que la cantine d'avant, c'était... »

Tu sais. La cantine d'avant, c'était du surgelé réchauffé. Celle-ci promet du local. Tu vois le nom d'un maraîcher sur le panneau : Philippe Gardel, Piquecos.

Tu ne sais pas qui c'est. Mais quelqu'un fournit des vraies tomates à l'école de ton fils.`,
      choices: [
        {
          id: 'inscrire_new',
          label: "Les inscrire. 22 euros. C'est un miracle.",
          conditions: {},
          consequence: `22 euros. Par mois. Pour deux enfants. Cinq repas par semaine.

Yanis revient le premier jour avec un sourire. « C'était bon, maman. Y'avait des vraies carottes. Pas les carottes en boîte. »

Des vraies carottes. Tu souris. C'est con de sourire pour des carottes. Mais c'est ça, ta vie — les victoires sont à la taille des batailles.

Sofiane est plus mesuré. « C'est mieux. Le dessert est pas ouf, mais le plat ça va. »

105 euros de moins par mois. 105 euros. C'est les chaussures de Sofiane. C'est un manteau pour Yanis. C'est une sortie au cinéma, peut-être. La première depuis des mois.

Tu ranges la facture. 22 euros. Et pour la première fois depuis longtemps, le chiffre ne fait pas mal.`,
          impact: { resources: 20, moral: 20, links: 5, comfort: 5 },
          setsFlag: 'nadia_cantine',
        },
        {
          id: 'mefiance',
          label: "Vérifier d'abord. 50 centimes, y'a forcément un piège.",
          conditions: {},
          consequence: `Tu appelles l'école. La secrétaire t'explique : tarification basée sur le quotient familial, calculé automatiquement par la CAF. Pas de dossier supplémentaire.

« Et la qualité ? C'est quoi, du local ? »

« Un cuisinier sur place. Fournisseurs dans un rayon de 30 km. Le menu est en ligne chaque semaine. »

Tu vérifies le menu. Blanquette de veau, purée maison, poire. Ou : dahl de lentilles, riz complet, compote. C'est... normal. Sain. Pas du luxe, pas du carton.

Tu les inscris. Avec le sentiment bizarre que quelque chose de correct vient de t'arriver sans que tu aies dû te battre pour l'obtenir.

C'est tellement inhabituel que tu te méfies encore deux semaines. Puis tu arrêtes. Parce que Yanis mange. Et que Sofiane ne se plaint plus.`,
          impact: { resources: 15, moral: 10, links: 0, comfort: 5 },
          setsFlag: 'nadia_cantine',
        },
        {
          id: 'cuisiner',
          label: "Continuer les repas maison. Tu sais ce que tes enfants mangent.",
          conditions: {},
          consequence: `Tu ne les inscris pas. 50 centimes, c'est tentant. Mais tu cuisines pour tes enfants depuis qu'ils sont nés. C'est ton truc. Ton territoire. Le seul endroit où tu contrôles tout.

Le matin, tu prépares. Le soir, tu prépares. Le dimanche, tu batch-cook comme disent les magazines.

C'est épuisant. Mais les boîtes sont propres, les repas sont équilibrés, et personne ne décide à ta place ce que mangent Yanis et Sofiane.

Au bout d'un mois, Sofiane dit : « Lucas mange à la cantine. Il dit que c'est vachement bien maintenant. »

Tu ne réponds pas. Tu coupes les carottes. Les vraies, celles du marché. Celles que tu paies 3,50 le kilo.

C'est de la fierté. C'est aussi de l'épuisement déguisé en choix.`,
          impact: { resources: -5, moral: 5, links: -5, comfort: -10 },
          setsFlag: null,
        }
      ]
    },

    // S2 — Monde A — Logement
    {
      id: 'nadia_s2',
      world: 'A',
      domain: 'logement',
      context: `Mercredi, 20h. La baignoire fuit. Pas un goutte-à-goutte — un filet continu qui fait une flaque sur le carrelage.

Tu as mis une bassine. La bassine se remplit en quatre heures. Quatre fois par jour, tu la vides.

Le propriétaire ne répond pas. Troisième message cette semaine. Troisième silence.

Tu pourrais appeler un plombier toi-même. 80 à 120 euros, d'après Internet. Tu n'as pas 80 euros.

Tu pourrais ne rien faire. La fuite est petite. Mais l'humidité monte. Des taches noires apparaissent au bas du mur. Sofiane tousse la nuit depuis deux semaines.

Yanis pense que la bassine est un jeu. Il y met son bateau pirate. Tu le laisses. Au moins quelqu'un s'amuse.`,
      choices: [
        {
          id: 'relancer',
          label: "Relancer le propriétaire. Par courrier recommandé cette fois.",
          conditions: {
            requiresMinStat: { moral: 40 }
          },
          blockedText: "Tu n'as pas l'énergie de te battre avec le proprio. Tu vides la bassine.",
          consequence: `Courrier recommandé. 6,50 euros. Tu recopies un modèle trouvé sur service-public.fr. Lettre formelle, date de la première signalement, photos de la fuite et des moisissures.

Le propriétaire rappelle le lendemain. Pas content. « J'envoie quelqu'un la semaine prochaine. »

La semaine prochaine, c'est dans huit jours. Huit jours de bassine. Mais quelqu'un vient.

Le plombier regarde, siffle entre ses dents. « Le joint est mort depuis des mois. Et l'humidité derrière le mur... faut ouvrir. »

Le proprio paie. En traînant. Le mur est ouvert pendant dix jours. La poussière est partout. Yanis tousse aussi maintenant.

Mais c'est réparé. Et tu as la lettre recommandée. La preuve. Le papier qui dit : j'ai demandé, vous n'avez pas répondu.`,
          impact: { resources: -10, moral: 10, links: 0, comfort: 5 },
          setsFlag: 'nadia_recommande',
        },
        {
          id: 'debrouiller',
          label: "Réparer toi-même. YouTube + Leroy Merlin.",
          conditions: {},
          consequence: `Tu regardes trois tutos. Joint de baignoire, niveau débutant. Tu achètes un tube de silicone (8 euros) et un grattoir (4 euros).

Le samedi, Sofiane est chez un copain, Yanis est devant un dessin animé. Tu t'enfermes dans la salle de bain.

Deux heures. Le vieux joint vient par morceaux. Le nouveau va de travers. Tu recommences. La deuxième couche est mieux.

La fuite s'arrête. Pas complètement — un suintement, encore. Mais la bassine se remplit en 24h au lieu de 4.

C'est pas parfait. C'est du bricolage de survie. Mais tu l'as fait. Avec tes mains, un tube à 8 euros et un téléphone fissuré.

Le soir, Sofiane rentre. « Ça sent bizarre dans la salle de bain. »

« Ça sent la victoire, Sofiane. Mange tes pâtes. »`,
          impact: { resources: -10, moral: 15, links: 0, comfort: 10 },
          setsFlag: null,
        },
        {
          id: 'rien',
          label: "Rien faire. Tu vides la bassine. Tu gères.",
          conditions: {},
          consequence: `Tu vides la bassine. Quatre fois par jour. C'est devenu un geste, comme faire le café ou étendre le linge.

Les moisissures progressent. Sofiane tousse. Tu lui donnes du sirop. Le sirop coûte 7 euros et dure une semaine.

Au bout d'un mois, le propriétaire passe pour récupérer un papier. Il voit la bassine. Il voit le mur.

« Pourquoi vous m'avez pas dit ? »

Tu le regardes. Les trois messages. Les deux appels. Le silence.

Il envoie un plombier le lendemain. Parce qu'il a vu. Pas parce que tu as dit. Voir compte plus que dire. C'est une leçon que tu connais déjà.`,
          impact: { resources: 0, moral: -20, links: 0, comfort: -15 },
          setsFlag: null,
        }
      ]
    },

    // S3 — Monde B — Logement
    {
      id: 'nadia_s3',
      world: 'B',
      domain: 'logement',
      context: `Jeudi, 14h. Rendez-vous au service logement de la mairie. Tu as déposé un dossier de demande de mutation — un T3 plus grand, avec un loyer encadré.

L'agent te reçoit. Il a ton dossier. Fiches de paie, composition familiale, justificatifs.

« On a un T3 disponible à Villebourbon. Quartier rénové. Loyer encadré à 480 euros. Charges comprises. APL applicables. »

480 euros. Tu paies 520 actuellement, sans les charges. Et l'appartement actuel a la baignoire qui fuit, les moisissures, et le bruit de la route.

« Il y a une cuisine équipée, un balcon, et un local vélo. L'école de Yanis est à 200 mètres. Le centre de santé est en bas de la rue. »

Tu lis le descriptif. Tu relis. Tu cherches le piège.

« Il y a une liste d'attente ? »

« Oui. Mais votre dossier est prioritaire — famille monoparentale avec enfants. Délai estimé : deux mois. »

Deux mois. Pas deux ans. Deux mois.`,
      choices: [
        {
          id: 'accepter_logement',
          label: "Accepter. Tu prends.",
          conditions: {},
          consequence: `Tu signes le dossier de pré-attribution. L'agent te donne une date de visite.

L'appartement est au deuxième étage. Lumineux. La cuisine a un plan de travail neuf. Le balcon donne sur un jardin intérieur — pas grand, mais vert.

Yanis court dans le couloir. « C'est ma chambre, ça ? »

Sofiane est plus prudent. Il ouvre les placards, vérifie la pression de l'eau. Il a 12 ans et il vérifie la plomberie. Tu ne sais pas si c'est triste ou admiratif.

Le déménagement a lieu en novembre. Trois amis, un camion emprunté, des cartons de récup. Tout tient en six allers-retours.

Le premier soir, tu fais des pâtes dans la nouvelle cuisine. Yanis mange sur le balcon. Sofiane met de la musique. Pas fort — il sait.

Tu t'assois. Tu respires. L'air est différent ici. Pas l'air du logement — l'air de toi. Plus léger.`,
          impact: { resources: 10, moral: 25, links: 10, comfort: 25 },
          setsFlag: 'nadia_logement',
        },
        {
          id: 'visiter_d_abord',
          label: "Visiter d'abord. Tu ne signes rien sans voir.",
          conditions: {},
          consequence: `Tu visites le samedi. Avec les enfants. Sofiane vérifie tout — les prises, les fenêtres, le chauffe-eau.

L'appartement est correct. Pas luxueux. Correct. La peinture est fraîche. Le sol est propre. La salle de bain n'a pas de moisissures.

Yanis ouvre le robinet de la cuisine. L'eau coule. Pas de fuite.

« Maman, l'eau elle marche ! »

Tu ris. Puis tu ne ris plus. Parce qu'un enfant de 7 ans ne devrait pas être surpris qu'un robinet fonctionne.

Tu signes le lundi. Deux mois d'attente. Le déménagement est en décembre. Il fait froid. Mais l'appartement est chaud. Vraiment chaud.`,
          impact: { resources: 5, moral: 20, links: 5, comfort: 20 },
          setsFlag: 'nadia_logement',
        },
        {
          id: 'garder_ancien',
          label: "Hésiter. Villebourbon, c'est loin de tout. Tu perds tes repères.",
          conditions: {},
          consequence: `Villebourbon. Tu ne connais pas le quartier. L'école est différente. Le trajet pour la CAF change. Le Leclerc est plus loin.

Tu hésites. Deux semaines. L'agent rappelle. « Madame, le logement ne peut pas rester bloqué indéfiniment. »

Tu prends encore une semaine. Sofiane te regarde vider la bassine.

« Maman. On peut partir d'ici ? »

Ce n'est pas une question. C'est une demande. Celle d'un gamin de 12 ans qui tousse la nuit et qui en a marre.

Tu rappelles l'agent. Le logement est toujours libre. Tu signes. Mais le retard t'a coûté — le déménagement tombe en plein hiver, pendant les contrôles de Sofiane au collège.

Tu gères. Tu jongle. Comme d'habitude.`,
          impact: { resources: 0, moral: 5, links: 0, comfort: 10 },
          setsFlag: 'nadia_logement',
        }
      ]
    },

    // S4 — Monde A — Garde d'enfants
    {
      id: 'nadia_s4',
      world: 'A',
      domain: 'travail',
      context: `Vendredi, 17h. La garderie ferme à 18h30. Ta cheffe t'appelle à 16h50.

« Nadia, tu peux rester jusqu'à 19h ? On a un dossier urgent. »

19h. La garderie ferme à 18h30. Sofiane peut rentrer seul — il a 12 ans, il a la clé. Mais Yanis a 7 ans. Yanis ne peut pas rester seul.

Ta sœur est à Toulouse. Ta mère est à Casablanca. Karim est... tu ne sais pas où est Karim.

Le dossier urgent, c'est un audit. Ta cheffe a besoin de toi. Pas envie de toi — besoin. Le mot qui ne laisse pas le choix.

Tu regardes l'heure. 16h52. Il te reste 98 minutes pour trouver une solution à un problème que le système n'a pas prévu.`,
      choices: [
        {
          id: 'rester_bureau',
          label: "Rester. Appeler Sofiane, lui demander de récupérer Yanis.",
          conditions: {
            requiresMinStat: { links: 30 }
          },
          blockedText: "Sofiane a 12 ans. Tu ne peux pas lui confier ça. Pas encore.",
          consequence: `Tu appelles Sofiane. « Écoute. Je suis bloquée au travail. Tu peux aller chercher Yanis à la garderie à 18h20 ? Tu connais le chemin. »

Silence. Puis : « OK. »

Tu restes au bureau. Le dossier est fait à 19h10. Ta cheffe te remercie.

Tu rentres à 19h40. Sofiane et Yanis sont sur le canapé. Dessin animé. Yanis mange des céréales à même la boîte.

« Ça s'est bien passé ? »

Sofiane hausse les épaules. « La dame de la garderie a fait une tête quand elle m'a vu. Elle a dit que c'était "pas régulier". »

Pas régulier. Un garçon de 12 ans qui va chercher son frère. Pas régulier dans un monde qui ne prévoit pas les mères seules qui travaillent à 19h.

Tu serres Sofiane. Il se raidit — il a 12 ans, les câlins c'est « relou ». Mais il ne se dégage pas tout de suite.`,
          impact: { resources: 10, moral: -15, links: -5, comfort: 0 },
          setsFlag: null,
        },
        {
          id: 'partir',
          label: "Dire non à ta cheffe. Yanis passe avant le dossier.",
          conditions: {
            requiresMinStat: { moral: 45 }
          },
          blockedText: "Tu n'oses pas. L'audit, la cheffe, le CDI. Tu ne peux pas risquer ça.",
          consequence: `« Désolée. J'ai personne pour récupérer mon fils. Je dois partir à 18h10. »

Ta cheffe te regarde. Le silence dure trois secondes. Trois secondes de jugement.

« D'accord. Le dossier attendra lundi. »

Elle dit « d'accord » comme on dit « tant pis ». Tu prends ton manteau. Tu cours.

Tu arrives à la garderie à 18h25. Yanis t'attend avec son sac. Il sourit. « T'es là ! »

Tu es là. Oui. C'est ton super-pouvoir et ton boulet. Tu es toujours là.

Le lundi, le dossier est fait. Ta cheffe ne dit rien. Mais le regard a changé. Celui qui dit : pas fiable pour les urgences. Pas disponible. Mère.`,
          impact: { resources: -5, moral: 15, links: 10, comfort: 5 },
          setsFlag: null,
        },
        {
          id: 'voisine_nadia',
          label: "Appeler la voisine. Mme Bouvier garde parfois Yanis.",
          conditions: {
            requiresMinStat: { links: 35 }
          },
          blockedText: "Tu n'as pas de voisine à qui demander ça. Pas ici.",
          consequence: `Mme Bouvier décroche. « Bien sûr. Je le récupère. Il peut manger ici si tu veux. »

Tu raccroches. Tes yeux piquent. C'est con de pleurer pour un coup de fil. Mais Mme Bouvier vient de te donner deux heures. Deux heures de temps. Le seul truc que personne ne fabrique.

Tu finis le dossier. Ta cheffe est contente. Tu récupères Yanis à 19h30 chez Mme Bouvier. Il a mangé des crêpes. Il est heureux.

« Maman, Mme Bouvier elle fait des meilleures crêpes que toi. »

« Traître. »

Il rit. Tu ris. Mme Bouvier rit. Le soulagement a le son du rire.`,
          impact: { resources: 5, moral: 15, links: 15, comfort: 5 },
          setsFlag: 'nadia_bouvier',
        }
      ]
    },

    // S5 — Monde B — Garde / Réseau
    {
      id: 'nadia_s5',
      world: 'B',
      domain: 'travail',
      context: `Lundi, 12h. Réunion d'information à la mairie : « Crèche à horaires décalés — Ouverture prochaine ».

Une crèche ouverte de 5h30 à 22h. Pour les parents qui travaillent en horaires atypiques — soignants, livreurs, agents d'entretien, restauration.

Yanis a 7 ans. Trop grand pour la crèche. Mais le dispositif inclut un « accueil périscolaire élargi » pour les 6-10 ans. Mêmes horaires. Encadrement professionnel.

Le tarif est indexé sur les revenus. Pour toi : 2,50 euros la demi-journée.

La coordinatrice explique : « L'idée, c'est que le temps ne soit plus un obstacle à l'emploi. Si vous avez une opportunité de temps plein, de formation, de garde supplémentaire — le dispositif est là. »

Temps plein. Tu es à 28h par semaine à la CAF. Pas par choix — par nécessité de garde.`,
      choices: [
        {
          id: 'inscrire_yanis',
          label: "Inscrire Yanis. Et demander un passage à temps plein à la CAF.",
          conditions: {},
          consequence: `Tu inscris Yanis. Le dossier prend quinze minutes. Pas trois heures — quinze minutes.

Tu appelles ta cheffe. « Si le périscolaire couvre jusqu'à 19h, je peux passer à 35h. »

Le silence est différent de celui de la dernière fois. Pas du jugement — de la surprise.

« Nadia. Ça fait deux ans que je veux te proposer le temps plein. Mais tu as toujours dit non. »

Parce que je n'avais personne pour Yanis. Mais ça, tu ne le dis pas.

Le passage à 35h, c'est 380 euros de plus par mois. 380 euros. Les chaussures de Sofiane, le cinéma, un week-end, un imprévu sans panique.

Le premier soir en périscolaire élargi, Yanis revient avec un dessin. « On a fait de la peinture. Et le monsieur il m'a appris à jouer aux échecs. »

380 euros et un fils qui joue aux échecs. Tout ça parce que quelqu'un a pensé aux horaires.`,
          impact: { resources: 20, moral: 25, links: 15, comfort: 10 },
          setsFlag: 'nadia_creche',
        },
        {
          id: 'garder_rythme',
          label: "Inscrire Yanis, mais garder tes 28h. Tu as besoin de temps avec eux.",
          conditions: {},
          consequence: `Tu inscris Yanis pour les jours où tu travailles. Mais tu gardes tes 28h.

Le mercredi après-midi, tu es avec eux. Le samedi, vous faites les courses ensemble. Le dimanche, c'est pyjama et crêpes.

C'est un luxe. Un luxe de pauvre — du temps au lieu de l'argent. Mais c'est un choix.

Sofiane, le mercredi, te montre ses devoirs. Il est bon en maths. Tu ne comprends plus rien à ses exercices, mais tu fais semblant, et il le sait, et vous riez.

380 euros de moins que le temps plein. 380 euros de présence en plus.

Tu sais que les magazines diraient que tu « sacrifies ta carrière ». Tu sais aussi que les magazines ne préparent pas les crêpes du dimanche.`,
          impact: { resources: 5, moral: 15, links: 15, comfort: 10 },
          setsFlag: 'nadia_creche',
        },
        {
          id: 'mefiance_creche',
          label: "Ne pas inscrire Yanis. Tu ne connais pas ces gens.",
          conditions: {},
          consequence: `Tu ne l'inscris pas. Yanis reste chez Mme Bouvier les soirs de garde. Ou chez toi, avec Sofiane qui surveille.

Le dispositif fonctionne sans toi. D'autres parents s'inscrivent. Une mère que tu croises à la sortie d'école te dit : « C'est super pour les horaires. Mon fils adore. »

Tu hoches la tête. Tu ne regrettes pas. Tu ne fais pas confiance facilement — Karim t'a appris ça. La confiance est un chèque en blanc, et tu n'as plus de chéquier.

Mais les mois passent, et le temps reste l'ennemi. Les 28h, le bus, la garderie, les courses, les devoirs — la liste dans ta tête ne raccourcit jamais.`,
          impact: { resources: 0, moral: -5, links: -5, comfort: 0 },
          setsFlag: null,
        }
      ]
    },

    // S6 — Monde A — Loisirs / Intégration
    {
      id: 'nadia_s6',
      world: 'A',
      domain: 'liens',
      context: `Samedi, 10h. Sofiane veut s'inscrire au club de basket. L'inscription est à 220 euros. Plus les baskets (60 euros). Plus le trajet — le gymnase est à 3 km, pas de bus le samedi matin.

Tu regardes le relevé bancaire. 220 + 60 = 280 euros. C'est deux semaines de courses.

Sofiane ne demande jamais rien. Il a son téléphone (le tien d'avant), ses potes, ses devoirs. Mais le basket, c'est la première chose qu'il demande depuis des mois.

Tu le regardes. Il a grandi cet été. Il te dépasse presque. Ses yeux disent : s'il te plaît. Sa bouche dit : « c'est pas grave si on peut pas. »

C'est toujours grave quand un gamin de 12 ans dit que c'est pas grave.`,
      choices: [
        {
          id: 'inscrire_basket',
          label: "L'inscrire. Tu trouveras l'argent.",
          conditions: {
            requiresMinStat: { resources: 30 }
          },
          blockedText: "280 euros. Tu n'as pas cette marge. C'est mathématique.",
          consequence: `Tu paies. En trois fois — le club accepte. Les baskets, tu les trouves sur Vinted. 25 euros au lieu de 60. Quasi neuves.

Le premier samedi, tu le déposes en vélo. Trois kilomètres. Il court dans le gymnase comme un chien lâché dans un parc.

Le coach s'appelle Mourad. Il te dit : « Votre fils a un bon potentiel. Il est combatif. »

Combatif. Oui. Il tient ça de toi.

Le trajet du samedi matin devient un rituel. Trois kilomètres en vélo, les deux. Vous ne parlez pas beaucoup. Mais c'est du temps ensemble. Du vrai.

Le compte en banque grince. Mais Sofiane sourit. Et un sourire de 12 ans, ça n'a pas de prix — même quand tu n'as pas d'argent.`,
          impact: { resources: -20, moral: 20, links: 15, comfort: -5 },
          setsFlag: 'nadia_basket',
        },
        {
          id: 'gratuit',
          label: "Chercher une alternative gratuite.",
          conditions: {},
          consequence: `Tu passes la soirée sur Internet. Associations sportives gratuites à Montauban. Tu trouves un atelier foot le mercredi, gratuit, au parc Chambord.

« C'est pas du basket, Sofiane. Mais c'est gratuit et c'est du sport. »

Il hausse les épaules. « C'est bon. Je vais essayer. »

Le mercredi, il y va. Il revient. « C'était bien. Y'avait pas beaucoup de monde. Mais c'était bien. »

C'est bien. Pas génial, pas nul. Bien. Le mot des compromis. Le mot de ta vie.

Au bout d'un mois, il arrête. « Y'a plus personne. Le gars qui organisait, il est parti. »

Sofiane retourne sur le canapé. Le téléphone. Les vidéos. Le canapé.`,
          impact: { resources: 0, moral: -10, links: -5, comfort: 0 },
          setsFlag: null,
        },
        {
          id: 'aide_sociale',
          label: "Demander une aide au CCAS. Il y a peut-être un dispositif sport.",
          conditions: {
            requiresMinStat: { moral: 40 }
          },
          blockedText: "Encore un dossier, encore un guichet. Tu n'en peux plus.",
          consequence: `Le CCAS. Encore un guichet. Encore un dossier. Mais tu y vas.

L'assistante sociale est gentille. « Coupon Sport de la CAF — 30 euros. Aide municipale sport pour enfants — 50 euros sous condition de ressources. Et certains clubs ont un tarif réduit pour les familles monoparentales. »

Tu fais le calcul. 220 - 30 - 50 = 140. Avec le tarif réduit : 100. Plus les baskets Vinted : 25. Total : 125 euros.

C'est encore beaucoup. Mais c'est faisable. En deux fois.

Sofiane est inscrit en novembre. Il commence avec un mois de retard sur les autres. Il court plus vite pour rattraper.`,
          impact: { resources: -10, moral: 10, links: 10, comfort: 0 },
          setsFlag: 'nadia_basket',
        }
      ]
    },

    // S7 — Monde B — Loisirs / Crédit temps
    {
      id: 'nadia_s7',
      world: 'B',
      domain: 'liens',
      context: `Dimanche, 11h. Un tract dans la boîte aux lettres. « Crédit Loisirs Jeunesse — Montauban ».

Le dispositif : chaque enfant de 6 à 16 ans reçoit un crédit annuel de 150 euros pour les activités sportives, culturelles ou artistiques. Valable dans tous les clubs et associations de la ville. Pas de dossier — automatique, lié au quotient familial.

150 euros par enfant. 300 euros pour Sofiane et Yanis. Basket pour Sofiane. Judo, dessin, musique — ce que veut Yanis.

Tu relis le tract. Pas de dossier. Automatique. Tu tournes le papier. Pas de piège. Pas de case à cocher. Pas de lettre recommandée.

Sofiane lit par-dessus ton épaule. « Je peux faire basket ? »

Yanis tire ta manche. « Et moi je veux faire du judo ! Et du dessin ! Et de la trompette ! »

Tu ris. « On va commencer par un, bonhomme. »`,
      choices: [
        {
          id: 'deux_activites',
          label: "Inscrire chacun dans une activité. C'est le moment.",
          conditions: {},
          consequence: `Sofiane : basket au club de Sapiac. 180 euros. Le crédit couvre 150. Reste 30 euros. Faisable.

Yanis : judo au dojo municipal. 120 euros. Le crédit couvre tout.

Le mercredi, tu les déposes. Sofiane court. Yanis trébuche sur son kimono trop grand — Mme Bouvier lui a prêté celui de son petit-fils.

Tu t'assois dans le hall du gymnase. Tu sors un livre. Tu lis.

Tu lis. Ça fait combien de temps que tu n'avais pas lu ? Des mois. Des années, peut-être.

Le temps. Quelqu'un t'a donné du temps. Pas de l'argent — du temps. Les 150 euros, c'est du temps déguisé. Le temps de ne pas remplir un dossier. Le temps de ne pas courir après un guichet. Le temps de lire un livre pendant que tes enfants grandissent à côté.

C'est ça, le luxe. Pas l'argent. Le temps.`,
          impact: { resources: 5, moral: 30, links: 20, comfort: 10 },
          setsFlag: 'nadia_loisirs',
        },
        {
          id: 'economiser_credit',
          label: "Inscrire Sofiane seulement. Yanis est petit, ça peut attendre.",
          conditions: {},
          consequence: `Sofiane fait basket. Yanis attend.

Yanis ne dit rien. Il a 7 ans. Il ne comprend pas les priorités budgétaires. Il comprend qu'il n'a pas de judo.

Le mercredi, tu l'emmènes au parc pendant que Sofiane est au basket. Vous faites du vélo. Il tombe. Il se relève. Il rit.

C'est bien. C'est du temps ensemble. Mais le soir, il te montre une vidéo de judo sur YouTube. « Regarde maman, le monsieur il fait une prise. »

Tu gardes les 150 euros de crédit de Yanis. Pour plus tard. Pour quand « plus tard » arrivera. Sauf que « plus tard », à 7 ans, c'est une éternité.`,
          impact: { resources: 10, moral: 5, links: 5, comfort: 0 },
          setsFlag: null,
        },
        {
          id: 'collectif_parents',
          label: "Inscrire les deux — et proposer un covoiturage sport avec d'autres parents.",
          conditions: {
            requiresMinStat: { links: 40 }
          },
          blockedText: "Tu ne connais pas assez de parents pour organiser ça.",
          consequence: `Tu proposes sur le groupe WhatsApp de l'école. « Covoiturage mercredi après-midi pour les activités ? On tourne. »

Six parents répondent. Un planning se met en place. Un mercredi sur trois, tu conduis (enfin, tu accompagnes en vélo). Les deux autres mercredis, quelqu'un d'autre gère.

C'est bordélique. Les horaires ne tombent jamais juste. Le père de Lucas est toujours en retard. Mais ça fonctionne.

Sofiane fait basket. Yanis fait judo. Et le mercredi où tu ne conduis pas, tu as deux heures. Deux heures à toi. Pour lire. Pour dormir. Pour ne rien faire.

Ne rien faire. C'est le plus grand luxe d'une mère seule. Et quelqu'un vient de te l'offrir.`,
          impact: { resources: 0, moral: 25, links: 25, comfort: 10 },
          setsFlag: 'nadia_loisirs',
        }
      ]
    }
  ]
}
};

// ==================== COMPOSANT PRINCIPAL ====================

const MontaubanMultivers = ({ conseilData = null, onRetour = null }) => {
  const [gameState, setGameState] = useState('intro');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [stats, setStats] = useState({ resources: 50, moral: 50, links: 30, comfort: 40 });
  const [history, setHistory] = useState([]);
  const [flags, setFlags] = useState({});
  const [crossFlags, setCrossFlags] = useState({});

  // Flags issus du Mode Conseil (décisions municipales prises par le joueur)
  // Si le Conseil n'a pas été joué, tous les flags sont false (monde par défaut)
  const conseilFlags = useMemo(() => conseilData?.flags || {}, [conseilData]);
  const [showConsequence, setShowConsequence] = useState(false);
  const [currentChoice, setCurrentChoice] = useState(null);
  const [tooltipStat, setTooltipStat] = useState(null);
  const [sessionGoal, setSessionGoal] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionText, setTransitionText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [returnedPlayer, setReturnedPlayer] = useState(false); // joueur qui reprend une partie

  useEffect(() => {
    const id = localStorage.getItem('montauban_player_id') || 'local_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('montauban_player_id', id);
    setPlayerId(id);
    // Détecter sauvegarde existante
    const save = loadGame();
    if (save && save.selectedCharacterId && save.gameState !== 'summary' && save.gameState !== 'gameover') {
      setHasSave(true);
    }
  }, []);

  const ambiance = useMemo(() => {
    const avgStat = (stats.resources + stats.moral + stats.links + stats.comfort) / 4;
    if (avgStat < 20) return { bg: 'from-slate-950 via-red-950 to-slate-950', cardBg: 'bg-slate-900/95', border: 'border-red-900/30', mood: 'critique' };
    if (avgStat < 35) return { bg: 'from-slate-900 via-slate-800 to-slate-900', cardBg: 'bg-slate-800/90', border: 'border-slate-700/50', mood: 'tendu' };
    if (avgStat < 55) return { bg: 'from-slate-800 via-slate-700 to-slate-800', cardBg: 'bg-slate-700/80', border: 'border-slate-600/50', mood: 'neutre' };
    return { bg: 'from-slate-700 via-slate-600 to-slate-700', cardBg: 'bg-slate-600/70', border: 'border-slate-500/50', mood: 'stable' };
  }, [stats]);

  // Jours de la semaine pour les transitions
  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Lundi'];

  // ==================== PATCH DES SCÈNES SELON DÉCISIONS DU CONSEIL ====================
  // Injecte des choix supplémentaires dans les scènes selon les flags Conseil.
  // Ne modifie pas CHARACTERS directement — produit une version enrichie à la volée.
  // ==================== SAUVEGARDE & REPRISE ====================
  const saveCurrentGame = (overrides = {}) => {
    if (!selectedCharacter) return;
    saveGame({
      selectedCharacterId: selectedCharacter.id,
      gameState,
      sceneIndex,
      stats,
      flags,
      history,
      ...overrides,
    });
  };

  const resumeGame = () => {
    try {
      const save = loadGame();
      if (!save) return;
      const char = CHARACTERS[save.selectedCharacterId];
      if (!char) return;
      const sceneIdx = Math.min(save.sceneIndex || 0, char.scenes.length - 1);
      setSelectedCharacter(char);
      setSceneIndex(sceneIdx);
      setStats(save.stats || char.initialStats);
      setFlags(save.flags || {});
      setHistory(save.history || []);
      setShowConsequence(false);
      setCurrentChoice(null);
      setHasSave(false);
      setReturnedPlayer(true);
      setGameState('playing');
    } catch (e) {
      clearSave();
      setHasSave(false);
    }
  };

  // ==================== ANALYTICS ====================
  const track = (event, data = {}) => trackEvent(supabase, playerId, event, data);

  // ==================== PARTAGE ====================
  const handleShare = () => {
    const text = generateShareText({
      character: selectedCharacter,
      stats,
      history,
      survived: gameState === 'summary' || gameState === 'revelation',
    });
    shareContent({
      text,
      onFallback: () => setShowShareModal(true),
    });
  };

  const handleCopyText = async () => {
    const text = generateShareText({
      character: selectedCharacter,
      stats,
      history,
      survived: true,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2500);
    } catch (e) {
      // Fallback sélection manuelle
    }
  };

  const getShareText = () => generateShareText({
    character: selectedCharacter,
    stats,
    history,
    survived: true,
  });

  const patchScenesWithConseilFlags = (char) => {
    if (!char || !conseilData) return char;

    const patchedScenes = char.scenes.map(scene => {
      const extraChoices = [];

      // ── FLAG : transport_gratuit ────────────────────────────────────────────
      // Mamadou S0 (A, transports) : le chantier bloque, mais le bus est gratuit
      if (conseilFlags.transport_gratuit && scene.id === 'mamadou_s0') {
        extraChoices.push({
          id: 'prendre_bus_gratuit',
          label: "Laisser le vélo, prendre le bus. C'est gratuit maintenant.",
          conditions: {},
          consequence: `Tu gares ton vélo contre un poteau et tu montes dans le 3. Personne ne valide — il n'y a plus rien à valider.\n\nLe chauffeur, Karim, te fait un signe de tête. « Livreur ? »\n\n« Ouais. Le chantier. »\n\n« Ça arrive à tout le monde. Fais attention à ton sac. »\n\nTu arrives avec quatre minutes de retard. Le client est légèrement agacé mais signe. Ton score baisse de quelques points. Mais tu n'as pas de contravention, et tu n'as pas forcé.\n\nTu rembarques dans le prochain bus pour récupérer le vélo. Gratuit. Dans les deux sens.\n\nC'est une petite chose. Mais les petites choses, aujourd'hui, c'est tout ce que tu as.`,
          impact: { resources: 0, moral: 10, links: 5, comfort: 5 },
          setsFlag: 'mamadou_prisBus',
          _conseil_injected: true,
        });
      }

      // Clément S0 (A, transports) : TER raté, mais navette urbaine gratuite
      if (conseilFlags.transport_gratuit && scene.id === 'clement_s0') {
        extraChoices.push({
          id: 'navette_gratuite',
          label: "Prendre la navette urbaine gratuite jusqu'à la gare de Toulouse-Matabiau.",
          conditions: {},
          consequence: `La navette interurbaine — lancée il y a six mois par la mairie — part dans huit minutes. Tu avais oublié qu'elle existait.\n\nTu montes. Zéro euro. Le chauffeur est jovial. « Pour Toulouse ? On arrive à Matabiau à 8h10. »\n\nTu envoies un message à ton chef : « TER retardé, j'arrive à 8h15 par la navette. »\n\nIl répond : « OK, on décale de 15 min. »\n\nDans le bus, tu travailles sur les slides. Une dame à côté s'endort. Un étudiant révise ses partiels. La route est fluide.\n\nTu penses à Sophie. Au nombre de fois où vous vous êtes disputés à cause de la voiture, du TER, de l'argent des trajets.\n\nAujourd'hui, ça a coûté zéro. Tu arrives à l'heure. Et tu n'as pas trahi le deal.`,
          impact: { resources: 5, moral: 15, links: 5, comfort: 5 },
          setsFlag: 'clement_navetteGratuite',
          _conseil_injected: true,
        });
      }

      // ── FLAG : marche_producteurs_local ────────────────────────────────────
      // Mamadou S5 (B, alimentation) : le choix "demander" est déverrouillé sans condition links
      if (conseilFlags.marche_producteurs_local && scene.id === 'mamadou_s5') {
        return {
          ...scene,
          choices: scene.choices.map(c => {
            if (c.id === 'demander') {
              return {
                ...c,
                conditions: {}, // supprime la condition requiresMinStat: { links: 20 }
                consequence: `« La Carte Commune, ça marche comment ? »\n\nPhilippe pose ses courgettes. Il prend le temps. Il a l'habitude — depuis que le marché de producteurs a été intégré au dispositif municipal, il explique ça dix fois par samedi.\n\n« C'est un crédit mensuel. 25 euros pour tout le monde sous un certain revenu. Mais c'est pas juste pour acheter. Y'a des ateliers cuisine, des paniers partagés. »\n\nIl sort une carte de visite. « Rachid du Commun peut t'expliquer le reste. »\n\nTu la prends. C'est la deuxième fois qu'on te parle de Rachid en une semaine.`,
                _conseil_patched: true,
              };
            }
            return c;
          }),
          _extra_choices: extraChoices,
        };
      }

      // Philippe S1 (B, alimentation) : marché déjà intégré, enrichir le contexte via le flag
      if (conseilFlags.marche_producteurs_local && scene.id === 'philippe_s1') {
        extraChoices.push({
          id: 'mention_appel_offres',
          label: "Mentionner à l'adjointe que d'autres producteurs pourraient rejoindre le groupement.",
          conditions: {},
          consequence: `Tu sors ton carnet. Gérard. Marie-Claire. Sanjay. Trois noms.\n\n« Ces trois-là sont prêts. Si on crée un groupement, on peut couvrir plus de variétés et garantir les volumes. »\n\nL'adjointe appelle son assistante. « Prépare un avenant pour trois fournisseurs supplémentaires. »\n\nTu repars avec ta signature et trois coups de téléphone à passer. Gérard ne répond pas tout de suite — il est dans les rangs de tomates. Mais tu sais qu'il rappellera.\n\nC'est comme ça que les choses commencent. Pas par une grande décision. Par un carnet et trois noms.`,
          impact: { resources: 10, moral: 15, links: 20, comfort: 5 },
          setsFlag: 'philippe_groupement',
          _conseil_injected: true,
        });
      }

      // ── FLAG : logement_social_etendu ──────────────────────────────────────
      // Mamadou S6 (A, logement) : nouveau choix service logement municipal
      if (conseilFlags.logement_social_etendu && scene.id === 'mamadou_s6') {
        extraChoices.push({
          id: 'service_logement',
          label: "Appeler le service logement de la mairie. Tu as entendu qu'il y avait des places.",
          conditions: {},
          consequence: `Le numéro est sur le site de la mairie. Tu t'attendais à une hotline automatique. C'est une vraie personne qui décroche.\n\n« Service logement, bonjour. »\n\nTu expliques : livreur, revenus instables, coloc qui part, délai trois semaines.\n\n« On a des T2 en stock dans le parc public étendu. Villebourbon et Sapiac. Loyer encadré entre 320 et 380 euros. Vous pouvez passer dès demain avec vos trois dernières fiches de paie. »\n\nTu raccroches. Tu regardes ton téléphone.\n\nTrois semaines, c'était le problème. Demain, c'est une solution.`,
          impact: { resources: 5, moral: 20, links: 10, comfort: 15 },
          setsFlag: 'mamadou_logementPublic',
          _conseil_injected: true,
        });
      }

      // Nadia S0 (A, logement) : la fuite, le proprio ne répond pas — mais il y a une régie
      if (conseilFlags.logement_social_etendu && scene.id === 'nadia_s2') {
        extraChoices.push({
          id: 'regie_municipale',
          label: "Appeler la régie technique municipale. Le proprio ne répond pas — la mairie peut intervenir.",
          conditions: {},
          consequence: `Tu trouves le numéro sur un flyer glissé sous ta porte il y a trois mois. « Service public d'urgence locative. »\n\nUne voix calme décroche. Tu expliques. La fuite. Les moisissures. Sofiane qui tousse.\n\n« On envoie quelqu'un demain matin. L'intervention est gratuite pour le locataire. On facture ensuite le propriétaire. »\n\nLe lendemain, un technicien sonne à 8h30. Il regarde la fuite, le mur, les taches noires.\n\n« Il faut ouvrir derrière. C'est plus grave que le joint. Votre proprio, il sait ? »\n\n« Il ne répond pas. »\n\nLe technicien note. « On lui envoie une mise en demeure. »\n\nTu fais du café pendant qu'il travaille. Pour la première fois depuis des semaines, tu n'as pas à te battre seule.`,
          impact: { resources: 0, moral: 20, links: 10, comfort: 15 },
          setsFlag: 'nadia_regieInterventee',
          _conseil_injected: true,
        });
      }

      // ── FLAG : maison_peuple_ouverte ───────────────────────────────────────
      // Mamadou S1 (B, transports) : le Commun devient La Maison du Peuple
      if (conseilFlags.maison_peuple_ouverte && scene.id === 'mamadou_s1') {
        return {
          ...scene,
          context: scene.context.replace(
            "Tu passes devant le « Commun » — l'ancien local de la Poste, transformé en... tu ne sais pas trop quoi.",
            "Tu passes devant la Maison du Peuple — l'ancienne bourse du travail, rénovée depuis six mois. Des panneaux dehors : atelier vélo, repair café, cours de français, permanence logement."
          ),
          choices: scene.choices.map(c => {
            if (c.id === 'commun') {
              return {
                ...c,
                label: "T'arrêter à la Maison du Peuple. Cinq minutes.",
                consequence: `Tu poses ton vélo contre le mur de brique rénovée. Le type à dreadlocks s'appelle Rachid. Il t'a vu arriver.\n\n« Livreur ? Tu as l'air crevé. »\n\nIl te tend un verre d'eau. Froide. Vraiment froide — il y a un vrai frigo maintenant, pas juste un robinet.\n\n« J'étais Deliveroo il y a deux ans. Maintenant je coordonne l'atelier vélo ici. Formation payée par la mairie. Si ça t'intéresse. »\n\nTu regardes l'endroit. Propre. Vivant. Des gens qui réparent des vélos. Une femme qui explique quelque chose à un groupe. Une odeur de café.\n\n« C'est ouvert à tout le monde ? »\n\n« C'est fait pour ça. »\n\nTu prends son numéro. Tu es en retard. Mais tu ressors avec quelque chose que tu ne saurais pas nommer.`,
                impact: { resources: -5, moral: 20, links: 25, comfort: 15 },
                _conseil_patched: true,
              };
            }
            return c;
          }),
          _extra_choices: extraChoices,
        };
      }

      // ── FLAG : conseil_quartier_autonome ───────────────────────────────────
      // Mamadou S7 (B, citoyenneté) : l'assemblée est accessible sans avoir rencontré Rachid
      if (conseilFlags.conseil_quartier_autonome && scene.id === 'mamadou_s7') {
        return {
          ...scene,
          choices: scene.choices.map(c => {
            if (c.id === 'aller') {
              return {
                ...c,
                conditions: {}, // supprime requiresFlag: 'mamadou_metRachid'
                consequence: `Tu ne connais pas Rachid. Mais tu as vu l'affiche sur le poteau de la rue des Carmes : « Budget participatif — Assemblée citoyenne — Sapiac. »\n\nUne salle des fêtes. Une trentaine de personnes. Du monde varié.\n\nOn parle du parc qui ferme trop tôt. D'un projet de jardin partagé. Des pistes cyclables.\n\nQuelqu'un demande : « Et les livreurs à vélo ? On voit qu'ils galèrent sur le boulevard. »\n\nTu lèves la main. Un peu surpris toi-même.\n\n« Je suis livreur. Je fais 50 bornes par jour. »\n\nSilence. Puis : « On vous écoute. »\n\nTu parles. Les gens écrivent. Ton témoignage est intégré au cahier de doléances. Il ira en mairie.\n\nTu ressors dans la nuit. Quelque chose d'étrange : tu comptes.`,
                blockedText: undefined,
                _conseil_patched: true,
              };
            }
            return c;
          }),
          _extra_choices: extraChoices,
        };
      }

      // ── FLAG : eau_municipalisee ───────────────────────────────────────────
      // Nadia S0 (A, logement) : la facture d'eau est différente si l'eau est remunicialisée
      // (contextuel uniquement — enrichit le texte de la conséquence d'un choix)
      if (conseilFlags.eau_municipalisee && scene.id === 'nadia_s2') {
        return {
          ...scene,
          context: scene.context + `\n\nEn ouvrant le robinet pour remplir la bassine, tu remarques la facture d'eau sur le comptoir. Tarification progressive. Les premiers 50 litres par jour sont gratuits. La tienne est en dessous. La facture est nulle ce mois-ci.`,
          _extra_choices: extraChoices,
        };
      }

      // Si pas de patch spécifique mais des choix extra, les ajouter quand même
      if (extraChoices.length > 0) {
        return { ...scene, _extra_choices: extraChoices };
      }

      return scene;
    });

    return { ...char, scenes: patchedScenes };
  };

  const selectCharacter = (charId) => {
    const rawChar = CHARACTERS[charId];
    const char = patchScenesWithConseilFlags(rawChar) || rawChar;
    setSelectedCharacter(char);
    setStats(char.initialStats);
    setFlags({});
    setHistory([]);
    setSceneIndex(0);
    setSessionGoal({ text: "Survive la semaine. Fais tes choix. Assume." });
    setGameState('tutorial');
    track('character_selected', { characterId: charId });
    // Sauvegarde initiale
    saveGame({
      selectedCharacterId: charId,
      gameState: 'tutorial',
      sceneIndex: 0,
      stats: char.initialStats,
      flags: {},
      history: [],
    });
  };

  const handleChoice = (choice) => {
    setCurrentChoice(choice);
    setShowConsequence(true);
  };

  const continueAfterConsequence = () => {
    const scene = selectedCharacter.scenes[sceneIndex];
    
    const newStats = {
      resources: Math.min(100, Math.max(0, stats.resources + currentChoice.impact.resources)),
      moral: Math.min(100, Math.max(0, stats.moral + currentChoice.impact.moral)),
      links: Math.min(100, Math.max(0, stats.links + currentChoice.impact.links)),
      comfort: Math.min(100, Math.max(0, stats.comfort + currentChoice.impact.comfort))
    };
    setStats(newStats);

    const newFlags = currentChoice.setsFlag
      ? { ...flags, [currentChoice.setsFlag]: true }
      : flags;
    if (currentChoice.setsFlag) setFlags(newFlags);

    const newHistory = [...history, {
      sceneIndex,
      world: scene.world,
      domain: scene.domain,
      choiceId: currentChoice.id,
      choiceLabel: currentChoice.label,
    }];
    setHistory(newHistory);

    // Analytics
    track('choice_made', {
      characterId: selectedCharacter.id,
      sceneId: scene.id,
      choiceId: currentChoice.id,
      world: scene.world,
      domain: scene.domain,
      sceneIndex,
    });

    setShowConsequence(false);
    setCurrentChoice(null);

    if (Object.values(newStats).some(v => v <= 0)) {
      clearSave();
      track('game_over', { characterId: selectedCharacter.id, sceneIndex });
      setGameState('gameover');
    } else if (sceneIndex < selectedCharacter.scenes.length - 1) {
      // Sauvegarder avant la transition
      saveGame({
        selectedCharacterId: selectedCharacter.id,
        gameState: 'playing',
        sceneIndex: sceneIndex + 1,
        stats: newStats,
        flags: newFlags,
        history: newHistory,
      });
      const nextDay = DAYS[Math.min(sceneIndex + 1, 7)];
      setTransitionText(nextDay + '.');
      setShowTransition(true);
      setTimeout(() => {
        setShowTransition(false);
        setSceneIndex(sceneIndex + 1);
      }, 1200);
    } else {
      clearSave();
      track('game_completed', {
        characterId: selectedCharacter.id,
        finalStats: newStats,
        flagCount: Object.keys(newFlags).length,
      });
      setGameState('revelation');
    }
  };

  const resetGame = () => {
    clearSave();
    track('game_reset', { characterId: selectedCharacter?.id });
    setGameState('intro');
    setSelectedCharacter(null);
    setSceneIndex(0);
    setStats({ resources: 50, moral: 50, links: 30, comfort: 40 });
    setHistory([]);
    setFlags({});
    setShowConsequence(false);
    setCurrentChoice(null);
    setReturnedPlayer(false);
    setHasSave(false);
  };

  // Composant jauge compact
  const StatBar = ({ statKey, value, compact = false }) => {
    const info = STAT_INFO[statKey];
    const Icon = info.icon;
    const isLow = value < 25;
    const isCritical = value < 15;
    
    const colors = {
      amber: { text: 'text-amber-400', bg: 'bg-amber-500', bgLight: 'bg-amber-500/20' },
      purple: { text: 'text-purple-400', bg: 'bg-purple-500', bgLight: 'bg-purple-500/20' },
      blue: { text: 'text-blue-400', bg: 'bg-blue-500', bgLight: 'bg-blue-500/20' },
      emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500', bgLight: 'bg-emerald-500/20' }
    };
    const c = colors[info.color];

    if (compact) {
      return (
        <div 
          className="relative text-center cursor-help group"
          onClick={(e) => { e.stopPropagation(); setTooltipStat(tooltipStat === statKey ? null : statKey); }}
        >
          <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-900/40 animate-pulse' : isLow ? 'bg-red-900/20' : c.bgLight}`}>
            <Icon size={18} className={isCritical ? 'text-red-400' : isLow ? 'text-red-300' : c.text} />
          </div>
          <p className={`text-xs font-mono mt-1 ${isCritical ? 'text-red-400' : isLow ? 'text-red-300' : 'text-white/70'}`}>
            {value}
          </p>
          
          {tooltipStat === statKey && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 p-3 bg-black/95 border border-white/10 rounded-lg shadow-xl z-50 text-left">
              <p className="font-medium text-white text-sm mb-1">{info.name}</p>
              <p className="text-xs text-white/60 leading-relaxed">{info.description}</p>
              {isCritical && <p className="text-xs text-red-400 mt-2 font-medium">⚠ Niveau critique</p>}
              {isLow && !isCritical && <p className="text-xs text-orange-400 mt-2">Attention : niveau bas</p>}
            </div>
          )}
        </div>
      );
    }

    // Mode non-compact : tooltip au clic sur l'icône
    return (
      <div className="flex items-center gap-3">
        <div
          className="relative cursor-help"
          onClick={(e) => { e.stopPropagation(); setTooltipStat(tooltipStat === statKey ? null : statKey); }}
        >
          <Icon size={18} className={isCritical ? 'text-red-400 animate-pulse' : isLow ? 'text-red-300' : c.text} />
          {tooltipStat === statKey && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 p-3 bg-black/95 border border-white/10 rounded-lg shadow-xl z-50">
              <p className="font-medium text-white text-sm mb-1">{info.name}</p>
              <p className="text-xs text-white/60 leading-relaxed">{info.description}</p>
              {isCritical && <p className="text-xs text-red-400 mt-2 font-medium">⚠ Niveau critique — danger</p>}
              {isLow && !isCritical && <p className="text-xs text-orange-400 mt-2">Niveau bas</p>}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/60 font-medium">{info.name}</span>
            <span className={`font-mono ${isCritical ? 'text-red-400' : isLow ? 'text-red-300' : 'text-white/50'}`}>{value}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 rounded-full ${isCritical ? 'bg-red-500' : isLow ? 'bg-red-400' : c.bg}`}
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // ==================== TRANSITION ENTRE SCÈNES ====================
  // ==================== MODAL DE PARTAGE ====================
  const ShareModal = () => {
    if (!showShareModal) return null;
    const text = getShareText();

    return (
      <div
        className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4"
        onClick={() => setShowShareModal(false)}
      >
        <div
          className="w-full max-w-sm bg-zinc-950 border border-white/10 p-6 space-y-5"
          onClick={e => e.stopPropagation()}
        >
          {/* Synthèse */}
          <div>
            <p className="text-white/30 text-xs uppercase tracking-widest font-mono mb-3">Ta synthèse</p>
            <div className="bg-white/5 border border-white/10 p-4 rounded-sm">
              <p className="text-white/70 text-xs leading-relaxed whitespace-pre-line">
                {text}
              </p>
            </div>
          </div>

          {/* Plateformes */}
          <div className="space-y-2">
            <p className="text-white/30 text-xs uppercase tracking-widest font-mono mb-3">Partager via</p>
            {SHARE_PLATFORMS.map(platform => (
              <a
                key={platform.id}
                href={platform.getUrl(text)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 w-full px-4 py-3 text-white text-sm font-bold transition-all ${platform.color}`}
              >
                <span className="w-5 text-center">{platform.icon}</span>
                {platform.label}
              </a>
            ))}

            {/* Copier le texte */}
            <button
              onClick={handleCopyText}
              className="flex items-center gap-3 w-full px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-bold transition-all"
            >
              <span className="w-5 text-center">{copyDone ? '✓' : '📋'}</span>
              {copyDone ? 'Copié !' : 'Copier le texte'}
            </button>
          </div>

          <button
            onClick={() => setShowShareModal(false)}
            className="w-full text-white/30 text-xs py-2 hover:text-white/60 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  };

  if (showTransition) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50 text-lg font-light tracking-widest animate-pulse">
          {transitionText}
        </p>
      </div>
    );
  }

  // ==================== INTRO ====================
  if (gameState === 'intro') {
    const save = hasSave ? loadGame() : null;
    const saveChar = save ? CHARACTERS[save.selectedCharacterId] : null;

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          {onRetour && (
            <button
              onClick={onRetour}
              className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-sm mx-auto"
            >
              ← Menu principal
            </button>
          )}

          <div className="space-y-3">
            <h1 className="text-5xl font-black text-white tracking-tight" style={{ fontFamily: 'system-ui' }}>
              MONTAUBAN
            </h1>
            <p className="text-xl font-light text-amber-400/80 tracking-widest uppercase">Multivers</p>
          </div>
          
          {conseilData && (
            <div className="bg-amber-400/5 border border-amber-400/20 p-4 text-sm text-amber-400/70 leading-relaxed text-left">
              <p className="font-mono text-xs uppercase tracking-widest mb-2 text-amber-400/40">Vos décisions en Conseil sont actives</p>
              <p>Certains choix seront débloqués ou modifiés selon les politiques municipales que vous avez votées.</p>
            </div>
          )}

          {/* Sauvegarde détectée */}
          {hasSave && saveChar && (
            <div className="bg-white/5 border border-white/10 p-5 text-left space-y-3">
              <p className="text-white/30 text-xs uppercase tracking-widest font-mono">Partie en cours</p>
              <p className="text-white/80 text-sm">
                {saveChar.name} — scène {(save.sceneIndex || 0) + 1}/8
              </p>
              <p className="text-white/30 text-xs">Sauvegardée {formatSaveDate(save.savedAt)}</p>
              <button
                onClick={resumeGame}
                className="w-full bg-amber-400 text-black font-bold py-3 px-6 hover:bg-amber-300 transition-all uppercase tracking-widest text-xs"
              >
                ▶ Reprendre la partie
              </button>
              <button
                onClick={() => { clearSave(); setHasSave(false); }}
                className="w-full text-white/20 hover:text-white/40 text-xs py-1 transition-colors"
              >
                Effacer et recommencer
              </button>
            </div>
          )}

          {!hasSave && (
            <>
              <div className="text-white/50 text-sm leading-relaxed space-y-4 py-4">
                <p>Une semaine. Une ville. Deux réalités.</p>
                <p>Les règles changent sans prévenir.</p>
                <p className="text-amber-400/70">Tu le sentiras.</p>
              </div>

              <button 
                onClick={() => { track('game_started'); setGameState('character'); }}
                className="w-full bg-white text-black font-bold py-4 px-8 rounded-none hover:bg-amber-400 transition-all uppercase tracking-widest text-sm"
              >
                Commencer
              </button>
              
              <p className="text-white/30 text-xs">~10 minutes • Choix irréversibles</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ==================== SÉLECTION PERSONNAGE ====================
  if (gameState === 'character') {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-lg mx-auto space-y-6 pt-8">
          <div className="text-center pb-6">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Qui es-tu ?</p>
          </div>

          <div className="space-y-3">
            {Object.values(CHARACTERS).map((char) => (
              <button
                key={char.id}
                onClick={() => selectCharacter(char.id)}
                className="w-full text-left p-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                      {char.name}
                    </h3>
                    <p className="text-white/40 text-sm">{char.age} ans • {char.role}</p>
                  </div>
                  <ChevronRight size={20} className="text-white/20 group-hover:text-amber-400 transition-colors" />
                </div>
                <p className="text-white/50 text-sm mt-3 leading-relaxed">
                  {char.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== TUTORIEL ====================
  if (gameState === 'tutorial') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-6">{selectedCharacter.name}</h2>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 space-y-4">
            <p className="text-white/70 text-sm leading-relaxed">
              Tu as quatre jauges. Elles baissent. Elles montent. Si l'une touche zéro, c'est fini.
            </p>
            
            <div className="space-y-3 py-2">
              <StatBar statKey="resources" value={stats.resources} />
              <StatBar statKey="moral" value={stats.moral} />
              <StatBar statKey="links" value={stats.links} />
              <StatBar statKey="comfort" value={stats.comfort} />
            </div>

            <p className="text-white/50 text-sm">
              Certains choix seront bloqués. Par manque de moyens. De courage. De contacts. C'est normal.
            </p>

            <p className="text-amber-400/70 text-sm">
              Les règles vont changer en cours de route. Ne cherche pas de logique. Observe.
            </p>
          </div>

          <button 
            onClick={() => setGameState('play')}
            className="w-full bg-white text-black font-bold py-4 px-8 hover:bg-amber-400 transition-all uppercase tracking-widest text-sm"
          >
            Commencer la semaine
          </button>
        </div>
      </div>
    );
  }

  // ==================== JEU ====================
  if (gameState === 'playing' && selectedCharacter) {
    const scene = selectedCharacter.scenes[sceneIndex];
    const worldPalette = WORLD_PALETTE[scene.world] || WORLD_PALETTE.A;
    
    return (
      <div className={`min-h-screen bg-gradient-to-b ${ambiance.bg} transition-all duration-1000 flex flex-col`}>
        {/* Header minimaliste */}
        <div className={`${ambiance.cardBg} border-b ${ambiance.border} p-3`}>
          <div className="max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/40 text-xs font-mono">{selectedCharacter.name.toUpperCase()}</span>
              <span className="text-white/30 text-xs font-mono">J{Math.floor(sceneIndex / 2) + 1} • {sceneIndex + 1}/8</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <StatBar statKey="resources" value={stats.resources} compact />
              <StatBar statKey="moral" value={stats.moral} compact />
              <StatBar statKey="links" value={stats.links} compact />
              <StatBar statKey="comfort" value={stats.comfort} compact />
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 p-4 flex items-start justify-center pt-6" onClick={() => setTooltipStat(null)}>
          <div className="max-w-lg w-full space-y-6">
            {/* Lignes de mémoire narrative */}
            {(() => {
              const memLines = (MEMORY_LINES[scene.id] || []).filter(m =>
                flags[m.flag] && (!m.notFlag || !flags[m.notFlag])
              );
              // Ligne spéciale si le joueur reprend après une interruption
              const returnLine = returnedPlayer && sceneIndex === (history.length) ? {
                text: "Tu es revenu. La ville t'attendait.",
              } : null;
              if (!memLines.length && !returnLine) return null;
              return (
                <div className="border-l-2 border-amber-400/20 pl-4 space-y-2">
                  {returnLine && (
                    <p className="text-amber-400/40 text-sm italic leading-relaxed">
                      {returnLine.text}
                    </p>
                  )}
                  {memLines.map((m, i) => (
                    <p key={i} className="text-amber-400/50 text-sm italic leading-relaxed">
                      {m.text}
                    </p>
                  ))}
                </div>
              );
            })()}

            {/* Contexte */}
            <div className={`${ambiance.cardBg} p-6 border ${worldPalette.accent}`}>
              <p className="text-white/90 leading-relaxed whitespace-pre-line text-[15px]">
                {scene.context}
              </p>
            </div>

            {/* Choix ou Conséquence */}
            {!showConsequence ? (
              <div className="space-y-2">
                {[...scene.choices, ...(scene._extra_choices || [])].map((choice) => {
                  const check = checkConditions(choice, stats, flags, crossFlags, conseilFlags);
                  
                  if (!check.available) {
                    const Icon = check.reasons[0]?.icon || Lock;
                    return (
                      <div
                        key={choice.id}
                        className="p-4 bg-white/5 border border-white/5 opacity-50"
                      >
                        <div className="flex items-start gap-3">
                          <Icon size={16} className="text-white/30 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-white/30 text-sm line-through">{choice.label}</p>
                            <p className="text-white/20 text-xs mt-1 italic">
                              {getBlockedText(choice, check.reasons)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleChoice(choice)}
                      className={`w-full text-left p-4 ${ambiance.cardBg} border ${choice._conseil_injected ? 'border-amber-400/30 bg-amber-400/5' : ambiance.border} hover:bg-white/10 hover:border-white/20 transition-all group`}
                    >
                      {choice._conseil_injected && (
                        <p className="text-amber-400/50 text-xs font-mono uppercase tracking-widest mb-2">
                          ↳ Possible grâce à vos décisions en Conseil
                        </p>
                      )}
                      <p className="text-white/90 text-[15px] group-hover:text-white transition-colors">
                        {choice.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 p-6">
                  <p className="text-white/90 leading-relaxed whitespace-pre-line text-[15px]">
                    {currentChoice.consequence}
                  </p>
                </div>
                
                {/* Impacts */}
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  {Object.entries(currentChoice.impact).map(([key, value]) => {
                    if (value === 0) return null;
                    const info = STAT_INFO[key];
                    const Icon = info.icon;
                    return (
                      <div 
                        key={key}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                          value > 0 ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30' : 'bg-red-900/30 text-red-400 border border-red-800/30'
                        }`}
                      >
                        <Icon size={12} />
                        <span className="font-mono">{value > 0 ? '+' : ''}{value}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={continueAfterConsequence}
                  className="w-full bg-white text-black font-bold py-4 px-8 hover:bg-amber-400 transition-all uppercase tracking-widest text-sm"
                >
                  Continuer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== GAME OVER ====================
  if (gameState === 'gameover') {
    const reasons = {
      resources: { title: "FAILLITE", text: "Plus d'argent. Plus de temps. Tu quittes Montauban." },
      moral: { title: "RUPTURE", text: "Tu craques. Le corps tient mais la tête lâche." },
      links: { title: "ISOLEMENT", text: "Plus personne ne répond. Le silence." },
      comfort: { title: "EFFONDREMENT", text: "Ton corps dit stop. Hospitalisé." }
    };
    const failedStat = Object.entries(stats).find(([k, v]) => v <= 0)?.[0] || 'moral';
    
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 text-center">
        <div className="max-w-md space-y-8">
          <h1 className="text-4xl font-black text-red-500 tracking-widest">{reasons[failedStat].title}</h1>
          <p className="text-white/60 text-lg">{reasons[failedStat].text}</p>
          <p className="text-white/30 text-sm">{selectedCharacter?.name} n'a pas tenu.</p>
          <button 
            onClick={resetGame}
            className="bg-white text-black font-bold py-3 px-8 hover:bg-amber-400 transition-all uppercase tracking-widest text-sm"
          >
            Recommencer
          </button>
        </div>
      </div>
    );
  }

  // ==================== DOMAINES (labels) ====================
  const DOMAIN_LABELS = {
    transports: 'Se déplacer',
    travail: 'Travailler',
    sante: 'Se soigner',
    education: 'Apprendre',
    alimentation: 'Manger',
    logement: 'Se loger',
    securite: 'Sécurité',
    climat: 'Climat & environnement',
    liens: 'Liens & loisirs',
    citoyennete: 'Participer',
    droits: 'Droits',
  };

  // Extraire le résumé de contexte (premières lignes significatives)
  const getContextPreview = (context) => {
    if (!context) return '';
    // Prend la première phrase substantielle (après le lieu/heure)
    const lines = context.split('\n').filter(l => l.trim().length > 0);
    // Skip la première ligne si c'est juste un lieu/heure court
    const start = lines[0] && lines[0].length < 40 ? 1 : 0;
    const preview = lines.slice(start, start + 2).join(' ');
    return preview.length > 200 ? preview.substring(0, 200) + '…' : preview;
  };

  // ==================== RÉVÉLATION ====================
  if (gameState === 'revelation') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <Eye size={48} className="mx-auto text-amber-400" />
          
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-white">Tu as survécu.</h2>
            <p className="text-white/50">Mais ce n'était pas une seule ville.</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 text-white/70 text-sm leading-relaxed space-y-4 text-left">
            <p>Chaque jour, tu as fait face aux mêmes problèmes. Te déplacer. Travailler. Manger. Te loger. Vivre.</p>
            <p>Mais le terrain changeait sous tes pieds.</p>
            <p>Certains jours, tu étais <span className="text-white/90 font-medium">seul face au problème</span>. D'autres jours, <span className="text-white/90 font-medium">quelque chose existait</span> autour de toi.</p>
            <p className="text-amber-400 pt-2">Les mêmes besoins. Deux villes différentes.</p>
            <p className="text-white/40">Regarde ce qui changeait — et ce qui ne changeait pas.</p>
          </div>

          <button 
            onClick={() => setGameState('summary')}
            className="w-full bg-white text-black font-bold py-4 px-8 hover:bg-amber-400 transition-all uppercase tracking-widest text-sm"
          >
            Voir la comparaison
          </button>
        </div>
      </div>
    );
  }

  // ==================== RÉCAPITULATIF ====================
  if (gameState === 'summary' && selectedCharacter) {
    // Construire les paires de scènes (S0/S1, S2/S3, S4/S5, S6/S7)
    const pairs = [];
    for (let i = 0; i < selectedCharacter.scenes.length; i += 2) {
      const sceneA = selectedCharacter.scenes[i];
      const sceneB = selectedCharacter.scenes[i + 1];
      const choiceA = history.find(h => h.sceneIndex === i);
      const choiceB = history.find(h => h.sceneIndex === i + 1);
      
      if (sceneA && sceneB) {
        pairs.push({
          domain: sceneA.domain,
          domainB: sceneB.domain,
          sceneA,
          sceneB,
          choiceA,
          choiceB,
        });
      }
    }

    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-2xl mx-auto space-y-6 py-8">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-black text-white">
              La semaine de {selectedCharacter.name}
            </h1>
            <p className="text-white/40 text-sm">Mêmes problèmes. Deux villes.</p>
          </div>

          {/* État final */}
          <div className="bg-white/5 border border-white/10 p-5">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4">État final</p>
            <div className="grid grid-cols-2 gap-4">
              <StatBar statKey="resources" value={stats.resources} />
              <StatBar statKey="moral" value={stats.moral} />
              <StatBar statKey="links" value={stats.links} />
              <StatBar statKey="comfort" value={stats.comfort} />
            </div>
          </div>

          {/* Paires domaine par domaine */}
          {pairs.map((pair, idx) => {
            const domainLabel = DOMAIN_LABELS[pair.domain] || pair.domain;
            
            return (
              <div key={idx} className="bg-white/5 border border-white/10 overflow-hidden">
                {/* Titre domaine */}
                <div className="px-5 py-3 border-b border-white/10 bg-white/5">
                  <p className="text-amber-400/80 text-sm font-bold uppercase tracking-widest">
                    {domainLabel}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
                  {/* Côté A — la ville sans filet */}
                  <div className="p-5 space-y-3">
                    <p className="text-white/30 text-xs uppercase tracking-widest font-mono">Ville A</p>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {getContextPreview(pair.sceneA.context)}
                    </p>
                    {pair.choiceA && (
                      <div className="border-l-2 border-white/20 pl-3 mt-3">
                        <p className="text-white/40 text-xs mb-1">Tu as choisi :</p>
                        <p className="text-white/80 text-sm">{pair.choiceA.choiceLabel}</p>
                      </div>
                    )}
                  </div>

                  {/* Côté B — la ville avec structure */}
                  <div className="p-5 space-y-3">
                    <p className="text-white/30 text-xs uppercase tracking-widest font-mono">Ville B</p>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {getContextPreview(pair.sceneB.context)}
                    </p>
                    {pair.choiceB && (
                      <div className="border-l-2 border-white/20 pl-3 mt-3">
                        <p className="text-white/40 text-xs mb-1">Tu as choisi :</p>
                        <p className="text-white/80 text-sm">{pair.choiceB.choiceLabel}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Conclusion */}
          <div className="bg-white/5 border border-white/10 p-6 text-center space-y-4">
            <p className="text-white/70 text-sm leading-relaxed">
              Tes choix étaient les tiens. Ni bons ni mauvais.<br />
              Ce qui changeait, c'est <span className="text-amber-400">ce qui existait autour de toi.</span>
            </p>
            <p className="text-white/40 text-xs leading-relaxed">
              Les murs. Les portes. Les guichets. Les bus. Les prix. Les gens.<br />
              Dans une ville, tu te débrouillais. Dans l'autre, quelque chose t'attendait.
            </p>
          </div>

          {/* Révélation politique */}
          <div className="bg-amber-400/5 border border-amber-400/20 p-6 text-center space-y-3">
            <p className="text-amber-400/90 text-sm font-medium">
              La Ville A, c'est Montauban gouvernée par l'extrême-droite.
            </p>
            <p className="text-amber-400/90 text-sm font-medium">
              La Ville B, c'est Montauban gouvernée par la gauche écologiste et citoyenne.
            </p>
            <p className="text-white/40 text-xs mt-4">
              Mêmes rues. Mêmes gens. Règles différentes.
            </p>
          </div>

          {/* Profil de fin — calculé selon les flags du parcours */}
          {(() => {
            const ending = computeEndingProfile(selectedCharacter.id, flags);
            if (!ending) return null;
            return (
              <div className={`border p-6 space-y-3 ${ending.couleur}`}>
                <p className={`text-xs uppercase tracking-widest font-mono ${ending.label}`}>
                  Ton parcours
                </p>
                <p className={`text-sm font-bold ${ending.label}`}>{ending.titre}</p>
                <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">
                  {ending.texte}
                </p>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex gap-3">
            <button 
              onClick={resetGame}
              className="flex-1 bg-white/10 border border-white/20 text-white font-bold py-3 px-6 hover:bg-white/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Rejouer
            </button>
            <button 
              onClick={handleShare}
              className="flex-1 bg-white text-black font-bold py-3 px-6 hover:bg-amber-400 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <Share2 size={16} /> Partager
            </button>
          </div>

          <p className="text-center text-white/30 text-xs pt-4">
            <a
              href="https://www.mgec-montauban.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 underline"
            >
              Découvrir le programme MGEC →
            </a>
          </p>

          <p className="text-center text-white/20 text-xs">
            Licence MIT — Collectif du 2 Juillet (C2J)
          </p>

          <ShareModal />
        </div>
      </div>
    );
  }

  return null;
};

export default MontaubanMultivers;
