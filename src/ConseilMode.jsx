import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ChevronRight, Users, Wallet, Heart, Zap, Leaf,
  Clock, CheckCircle, AlertTriangle, ArrowLeft, BarChart3,
  MessageSquare, Building, Bus, Droplets, Home, TreePine,
  ShoppingBasket, Vote, X
} from 'lucide-react';

// ================================================================
// CONFIG SUPABASE (héritée de l'environnement)
// ================================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ton-projet.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'ta-cle-anon';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================================================
// JAUGES MUNICIPALES
// ================================================================
const JAUGES_INFO = {
  solidarite: {
    label: 'Solidarité',
    icon: Heart,
    color: 'text-rose-400',
    bg: 'bg-rose-900/30',
    border: 'border-rose-800/30',
    desc: 'Tissu social, services aux personnes, filets de sécurité',
  },
  legitimite: {
    label: 'Légitimité',
    icon: Vote,
    color: 'text-amber-400',
    bg: 'bg-amber-900/30',
    border: 'border-amber-800/30',
    desc: 'Confiance dans l\'institution, soutien populaire',
  },
  ressources: {
    label: 'Ressources',
    icon: Wallet,
    color: 'text-emerald-400',
    bg: 'bg-emerald-900/30',
    border: 'border-emerald-800/30',
    desc: 'Budget municipal, marge de manœuvre financière',
  },
  tension: {
    label: 'Tension',
    icon: Zap,
    color: 'text-orange-400',
    bg: 'bg-orange-900/30',
    border: 'border-orange-800/30',
    desc: 'Conflits latents, résistances sociales non résolues',
  },
  ecologie: {
    label: 'Écologie',
    icon: Leaf,
    color: 'text-teal-400',
    bg: 'bg-teal-900/30',
    border: 'border-teal-800/30',
    desc: 'Score environnemental, multiplicateur de ROI à long terme',
  },
};

// ================================================================
// LES 6 DÉLIBÉRATIONS
// ================================================================
const DELIBERATIONS = [
  // ---------------------------------------------------------------
  // 1. SERVICES PUBLICS — L'eau
  // ---------------------------------------------------------------
  {
    id: 'eau',
    domaine: 'Services publics',
    titre: "L'eau revient à la ville",
    icone: Droplets,
    situation: `Le contrat avec Véolia arrive à échéance dans 6 mois. La remunicipalisation était une promesse de campagne. Ce matin, trois choses sont arrivées en même temps sur votre bureau.`,
    personnages: [
      {
        nom: 'Mohamed',
        role: 'Agent de la régie municipale',
        message: `Il vous a laissé un message vocal : "On est prêts. On a les compétences. Ce qu'il nous faut, c'est que vous ayez confiance en nous."`,
        ton: 'espoir',
      },
      {
        nom: 'Isabelle Roux',
        role: 'DGS',
        message: `Elle entre sans frapper : "J'ai relu le contrat cette nuit. Il y a une clause pénale si on sort avant terme. 400 000€. Ça ne figurait pas dans les estimations."`,
        ton: 'alerte',
      },
      {
        nom: 'Fatima',
        role: 'Militante, collectif Eau Bien Commun',
        message: `Elle attend dans le couloir depuis 8h avec une pétition. 3 200 signatures.`,
        ton: 'attente',
      },
    ],
    opposition: `Le groupe d'opposition UDR a déjà publié un communiqué : "La majorité s'apprête à dilapider l'argent des Montalbanais pour une idéologie."`,
    options: [
      {
        id: 'remunicipalisation_totale',
        label: 'Remunicipalisation totale',
        description: 'Activer la clause de sortie, payer les pénalités, reprendre en régie directe.',
        recit: 'Fatima entre, sourit. Mohamed envoie un SMS à ses collègues. L\'opposition monte au créneau en conseil. Isabelle rédige les avenants jusqu\'à minuit.',
        effets: { solidarite: 3, legitimite: 2, ressources: -2, tension: -1, ecologie: 1 },
        roi: { tour: 4, solidarite: 2, legitimite: 1, ressources: 0, tension: -1, ecologie: 1 },
        flagSet: 'eau_municipalisee',
      },
      {
        id: 'remunicipalisation_partielle',
        label: 'Remunicipalisation partielle',
        description: 'Reprendre le contrôle tarifaire, laisser la gestion technique à Véolia encore 2 ans.',
        recit: 'Fatima repart sans sourire. Mohamed dit "c\'est déjà ça". L\'opposition cherche la faille dans l\'accord.',
        effets: { solidarite: 1, legitimite: 1, ressources: -1, tension: 0, ecologie: 0 },
        roi: { tour: 4, solidarite: 1, legitimite: 0, ressources: 1, tension: 0, ecologie: 0 },
        flagSet: null,
      },
      {
        id: 'tarification_progressive',
        label: 'Tarification progressive',
        description: 'Renégocier le contrat : premiers m³ gratuits, tarif dégressif ensuite.',
        recit: 'Fatima accepte à demi-mot. Véolia hésite puis signe. Mohamed soupire.',
        effets: { solidarite: 2, legitimite: 1, ressources: 0, tension: 0, ecologie: 0 },
        roi: { tour: 3, solidarite: 1, legitimite: 1, ressources: 0, tension: 0, ecologie: 1 },
        flagSet: null,
      },
      {
        id: 'renouvellement_contrat',
        label: 'Renouvellement du contrat privé',
        description: 'Reconduire le contrat tel quel. Stabilité financière à court terme.',
        recit: 'Fatima ne rappelle plus. L\'opposition triomphe discrètement. Un agent demande sa mutation.',
        effets: { solidarite: -1, legitimite: -2, ressources: 1, tension: 2, ecologie: -1 },
        roi: { tour: 5, solidarite: -1, legitimite: -1, ressources: 1, tension: 1, ecologie: -1 },
        flagSet: null,
      },
    ],
  },

  // ---------------------------------------------------------------
  // 2. MOBILITÉS — Les bus
  // ---------------------------------------------------------------
  {
    id: 'transports',
    domaine: 'Mobilités',
    titre: 'Le bus ne paie plus',
    icone: Bus,
    situation: `La gratuité des transports en commun était une promesse phare. Le réseau TUM est déficitaire depuis 3 ans. Le prestataire menace de renégocier si la fréquentation n'augmente pas.`,
    personnages: [
      {
        nom: 'Karim',
        role: 'Chauffeur de bus, ligne 3',
        message: `Il vous croise dans le couloir de la mairie : "On a des bus vides à 14h et blindés à 7h30. La gratuité ça aide pas si les horaires sont nuls. Mais c'est un début."`,
        ton: 'attente',
      },
      {
        nom: 'Patricia',
        role: 'Directrice financière TUM',
        message: `Un mail sec : "La compensation municipale devra couvrir 1,1M€ annuels. On ne peut pas absorber ça sans réduire des lignes rurales."`,
        ton: 'alerte',
      },
      {
        nom: 'Lucie',
        role: 'Mère de famille, quartier Sapiac',
        message: `Elle a posté sur le groupe Facebook du quartier : "Mon fils prend le bus pour aller au lycée. 47€ par mois. C'est pas rien pour nous."`,
        ton: 'espoir',
      },
    ],
    opposition: `Roger, conseiller municipal d'opposition : "Montpellier a mis 10 ans à amortir la gratuité. Vous voulez faire ça en un mandat ?"`,
    options: [
      {
        id: 'gratuite_totale',
        label: 'Gratuité totale immédiate',
        description: 'Tous les bus gratuits dès le 1er janvier. Compensation intégrale par la mairie.',
        recit: 'Lucie partage la nouvelle. Karim voit ses bus se remplir. Patricia envoie un avenant d\'urgence. Roger prépare une motion.',
        effets: { solidarite: 2, legitimite: 2, ressources: -2, tension: -1, ecologie: 2 },
        roi: { tour: 3, solidarite: 2, legitimite: 1, ressources: 0, tension: -1, ecologie: 1 },
        flagSet: 'transport_gratuit',
      },
      {
        id: 'gratuite_partielle',
        label: 'Gratuité ciblée',
        description: 'Gratuit pour les moins de 18 ans et les bénéficiaires des minima sociaux.',
        recit: 'Lucie est soulagée. Karim hausse les épaules. Patricia accepte. Roger se tait.',
        effets: { solidarite: 1, legitimite: 1, ressources: -1, tension: 0, ecologie: 1 },
        roi: { tour: 3, solidarite: 1, legitimite: 1, ressources: 0, tension: 0, ecologie: 0 },
        flagSet: null,
      },
      {
        id: 'tarification_solidaire',
        label: 'Tarification solidaire progressive',
        description: 'Tarif calculé selon les revenus. Zéro à 0€, maximum à 1,50€.',
        recit: 'Lucie calcule si elle est concernée. Karim dit "c\'est compliqué à expliquer". Les panneaux d\'affichage changent.',
        effets: { solidarite: 1, legitimite: 0, ressources: 0, tension: 0, ecologie: 1 },
        roi: { tour: 4, solidarite: 1, legitimite: 1, ressources: 0, tension: 0, ecologie: 0 },
        flagSet: null,
      },
      {
        id: 'report_gratuite',
        label: 'Report à l\'an 2 du mandat',
        description: 'Étude de faisabilité d\'abord. Décision l\'année prochaine.',
        recit: 'Lucie commente "encore des promesses". Karim ne dit rien. Roger sourit.',
        effets: { solidarite: 0, legitimite: -2, ressources: 0, tension: 1, ecologie: 0 },
        roi: { tour: 5, solidarite: 0, legitimite: -1, ressources: 1, tension: 1, ecologie: 0 },
        flagSet: null,
      },
    ],
  },

  // ---------------------------------------------------------------
  // 3. AMÉNAGEMENT URBAIN — Le terrain Ségalières
  // ---------------------------------------------------------------
  {
    id: 'logement',
    domaine: 'Aménagement urbain',
    titre: 'Le terrain Ségalières',
    icone: Home,
    situation: `Un terrain de 2 hectares en friche, quartier Ségalières, vient d'être mis en vente par un promoteur privé qui propose 47 logements haut de gamme. La ville a un droit de préemption. Délai : 3 semaines.`,
    personnages: [
      {
        nom: 'Nadia',
        role: 'Architecte urbaniste à la mairie',
        message: `"C'est l'un des derniers terrains non construits proches du centre. Si on laisse passer, on ne reverra pas ça avant 20 ans."`,
        ton: 'espoir',
      },
      {
        nom: 'Henri',
        role: 'Adjoint aux finances',
        message: `Il frappe sur la table : "La préemption nous coûte 1,8M€. On n'a pas cet argent sans contracter un emprunt. À ce taux-là, ça va peser sur tout le mandat."`,
        ton: 'alerte',
      },
      {
        nom: 'Deux familles du quartier',
        role: 'Locataires Ségalières',
        message: `Une lettre : "Il y a déjà trop de résidences fermées ici. On veut des commerces, un square, quelque chose pour tout le monde."`,
        ton: 'attente',
      },
    ],
    opposition: `Le promoteur demande un rendez-vous. Son assistant appelle trois fois dans la matinée.`,
    options: [
      {
        id: 'preemption_total',
        label: 'Préemption + logements sociaux',
        description: 'Préempter, financer via emprunt, construire 60% social et espaces communs.',
        recit: 'Nadia sourit pour la première fois depuis des mois. Henri ne dort pas bien. Les familles écrivent un mot de remerciement. Le promoteur menace un recours.',
        effets: { solidarite: 3, legitimite: 2, ressources: -3, tension: -1, ecologie: 1 },
        roi: { tour: 5, solidarite: 2, legitimite: 2, ressources: 0, tension: -2, ecologie: 2 },
        flagSet: 'logement_social_etendu',
      },
      {
        id: 'preemption_mixte',
        label: 'Préemption + projet mixte',
        description: 'Préempter, mélanger social, parc public et quelques copropriétés.',
        recit: 'Tout le monde est à moitié satisfait. Henri accepte à contrecœur.',
        effets: { solidarite: 2, legitimite: 1, ressources: -2, tension: 0, ecologie: 1 },
        roi: { tour: 5, solidarite: 1, legitimite: 1, ressources: 0, tension: 0, ecologie: 1 },
        flagSet: null,
      },
      {
        id: 'negociation_promoteur',
        label: 'Négociation (quota social imposé)',
        description: 'Pas de préemption. Imposer 25% de social par convention.',
        recit: 'Le promoteur accepte 20%. Nadia dit "c\'est mieux que rien". Les familles ne répondent pas.',
        effets: { solidarite: 1, legitimite: 0, ressources: 0, tension: 0, ecologie: 0 },
        roi: { tour: 4, solidarite: 0, legitimite: 0, ressources: 1, tension: 0, ecologie: 0 },
        flagSet: null,
      },
      {
        id: 'laisser_vendre',
        label: 'Laisser vendre au promoteur',
        description: 'Pas d\'intervention municipale. Le marché décide.',
        recit: 'Nadia demande à être affectée à un autre service. Les familles rejoignent un collectif. Le quartier change silencieusement.',
        effets: { solidarite: -1, legitimite: -2, ressources: 0, tension: 2, ecologie: -1 },
        roi: { tour: 5, solidarite: -2, legitimite: -1, ressources: 0, tension: 2, ecologie: -2 },
        flagSet: null,
      },
    ],
  },

  // ---------------------------------------------------------------
  // 4. ANIMATION DE LA VILLE — La Maison du Peuple
  // ---------------------------------------------------------------
  {
    id: 'culture',
    domaine: 'Animation de la ville',
    titre: 'La Maison du Peuple',
    icone: Building,
    situation: `Le bâtiment de l'ancienne bourse du travail est vacant depuis 2 ans. Le programme promettait d'en faire un lieu ouvert. Les travaux de mise aux normes sont estimés à 600 000€. Un promoteur propose de racheter.`,
    personnages: [
      {
        nom: 'Sylvie',
        role: 'Présidente d\'une association d\'aide aux sans-abri',
        message: `"On n'a plus de local depuis janvier. On tient des permanences dans le hall de la bibliothèque. Ce bâtiment, ce n'est pas un luxe pour nous, c'est une survie."`,
        ton: 'espoir',
      },
      {
        nom: 'Marc',
        role: 'Directeur régional, chaîne de coworking',
        message: `Sa proposition écrite : "On rachète, on rénove à nos frais, on réserve 20% des espaces aux associations partenaires. Zéro coût pour la ville."`,
        ton: 'neutre',
      },
      {
        nom: 'Trois syndicats locaux',
        role: 'CGT, FO, FSU',
        message: `Ils ont signé une tribune dans La Dépêche : "Ce lieu nous appartient historiquement. Le céder serait une trahison."`,
        ton: 'alerte',
      },
    ],
    opposition: `Jean-Paul, élu d'opposition, ironise : "La Maison du Peuple ! On aura tout entendu. Combien ça coûte, ce symbole ?"`,
    options: [
      {
        id: 'renovation_municipale',
        label: 'Rénovation municipale, accès libre',
        description: 'La ville rénove, le lieu est géré par une association d\'habitants.',
        recit: 'Sylvie pleure un peu. Les syndicats encadrent la tribune. Jean-Paul parle de "gouffre financier". Le lieu ouvre 18 mois plus tard.',
        effets: { solidarite: 3, legitimite: 2, ressources: -2, tension: -2, ecologie: 0 },
        roi: { tour: 5, solidarite: 2, legitimite: 2, ressources: 0, tension: -2, ecologie: 1 },
        flagSet: 'maison_peuple_ouverte',
      },
      {
        id: 'partenariat_coworking',
        label: 'Partenariat avec le coworking',
        description: 'Marc finance et gère. 20% réservé aux asso. Zéro coût immédiat.',
        recit: 'Marc signe rapidement. Sylvie négocie sa place. Les syndicats restent méfiants. Le lieu ouvre en 8 mois.',
        effets: { solidarite: 1, legitimite: 0, ressources: 0, tension: 1, ecologie: 0 },
        roi: { tour: 3, solidarite: 0, legitimite: 0, ressources: 1, tension: 0, ecologie: 0 },
        flagSet: null,
      },
      {
        id: 'cession_partielle',
        label: 'Cession partielle, usage associatif garanti',
        description: 'On cède une partie, on garde l\'autre pour les associations.',
        recit: 'Compromis fragile. Tout le monde surveille la suite. Sylvie a un bureau. Le reste est incertain.',
        effets: { solidarite: 1, legitimite: 0, ressources: 1, tension: 1, ecologie: 0 },
        roi: { tour: 4, solidarite: 0, legitimite: 0, ressources: 1, tension: 0, ecologie: 0 },
        flagSet: null,
      },
      {
        id: 'vente_promoteur',
        label: 'Vente au promoteur',
        description: 'On vend. Bureaux. Rentrée financière immédiate.',
        recit: 'Sylvie disparaît de vos contacts. Les syndicats organisent une manifestation. Jean-Paul se tait, satisfait.',
        effets: { solidarite: -2, legitimite: -3, ressources: 2, tension: 3, ecologie: 0 },
        roi: { tour: 5, solidarite: -2, legitimite: -2, ressources: 1, tension: 2, ecologie: 0 },
        flagSet: null,
      },
    ],
  },

  // ---------------------------------------------------------------
  // 5. CITOYENNETÉ — Le conseil de quartier du Faubourg
  // ---------------------------------------------------------------
  {
    id: 'democratie',
    domaine: 'Citoyenneté',
    titre: 'Le conseil de quartier du Faubourg',
    icone: Vote,
    situation: `Le nouveau conseil de quartier du Faubourg Lacapelle réclame un budget propre de 80 000€ pour rénover la place centrale. C'est la première expérimentation de démocratie participative du mandat. Tout le monde regarde.`,
    personnages: [
      {
        nom: 'Amara',
        role: 'Coordinatrice du conseil de quartier',
        message: `Elle vient en délégation de cinq habitants : "On a fait trois réunions, on a les plans, on a les artisans. On a juste besoin que vous nous fassiez confiance."`,
        ton: 'espoir',
      },
      {
        nom: 'Isabelle Roux',
        role: 'DGS',
        message: `Une note posée sur le bureau : "Juridiquement, on ne peut pas déléguer un budget sans cadre de contrôle. Il faut une convention. Et un audit à mi-parcours."`,
        ton: 'alerte',
      },
      {
        nom: 'Un adjoint',
        role: 'Adjoint à l\'urbanisme',
        message: `Il glisse en aparté : "Si ça foire, c'est nous qui prenons. Et si ça marche, ce sont eux qui auront le mérite."`,
        ton: 'alerte',
      },
    ],
    opposition: `L'opposition n'a encore rien dit. Elle attend de voir si ça échoue.`,
    options: [
      {
        id: 'budget_autonomie_totale',
        label: 'Budget accordé, autonomie totale',
        description: '80 000€ versés directement. Conseil de quartier décide seul.',
        recit: 'Amara serre la main de chaque membre de la délégation. L\'adjoint soupire. Isabelle rédige la convention seule.',
        effets: { solidarite: 2, legitimite: 3, ressources: -1, tension: -2, ecologie: 1 },
        roi: { tour: 4, solidarite: 2, legitimite: 2, ressources: 0, tension: -2, ecologie: 1 },
        flagSet: 'conseil_quartier_autonome',
      },
      {
        id: 'budget_convention',
        label: 'Budget accordé avec convention et audit',
        description: '80 000€, mais avec suivi mensuel et rapport final obligatoire.',
        recit: 'Amara accepte, un peu déçue. Isabelle est rassurée. L\'adjoint attend le premier raté.',
        effets: { solidarite: 1, legitimite: 2, ressources: -1, tension: -1, ecologie: 0 },
        roi: { tour: 4, solidarite: 1, legitimite: 1, ressources: 0, tension: -1, ecologie: 0 },
        flagSet: null,
      },
      {
        id: 'budget_reduit',
        label: 'Budget réduit de moitié',
        description: '40 000€. Le reste l\'année prochaine si les comptes sont bons.',
        recit: 'Amara dit "on fera avec". Elle ne rappelle pas pendant deux semaines.',
        effets: { solidarite: 0, legitimite: 1, ressources: 0, tension: 0, ecologie: 0 },
        roi: { tour: 5, solidarite: 0, legitimite: 0, ressources: 0, tension: 0, ecologie: 0 },
        flagSet: null,
      },
      {
        id: 'refus_projet_repris',
        label: 'Refus, projet repris par la mairie',
        description: 'La mairie gère directement. Plus sûr techniquement.',
        recit: 'Amara quitte le conseil de quartier. L\'opposition jubile discrètement.',
        effets: { solidarite: -2, legitimite: -3, ressources: 0, tension: 2, ecologie: 0 },
        roi: { tour: 4, solidarite: -1, legitimite: -2, ressources: 0, tension: 1, ecologie: 0 },
        flagSet: null,
      },
    ],
  },

  // ---------------------------------------------------------------
  // 6. ÉCONOMIE — Le marché des producteurs
  // ---------------------------------------------------------------
  {
    id: 'economie',
    domaine: 'Économie',
    titre: 'Le marché des producteurs',
    icone: ShoppingBasket,
    situation: `Une friche commerciale en centre-ville peut accueillir un marché permanent de producteurs locaux. Une coopérative de 23 agriculteurs porte le projet. Mais une enseigne nationale a déposé un permis de construire sur le même site.`,
    personnages: [
      {
        nom: 'René',
        role: 'Maraîcher bio à 12km de Montauban',
        message: `"J'ai 54 ans. Si ce marché n'existe pas, je vends mes terres dans deux ans. Je ne suis pas le seul dans ce cas."`,
        ton: 'alerte',
      },
      {
        nom: 'Cabinet d\'avocats',
        role: 'Représentant de l\'enseigne nationale',
        message: `Leur lettre est cordiale mais le sous-texte est clair : un recours est possible si la ville bloque le permis sans motif légal.`,
        ton: 'alerte',
      },
      {
        nom: 'Céline',
        role: 'Directrice du développement économique',
        message: `"La coopérative n'a pas encore le financement complet. Si on les soutient et qu'ils échouent, la friche reste vide. Risque réel."`,
        ton: 'neutre',
      },
    ],
    opposition: `Un collectif de commerçants du centre : "Un supermarché de plus et le centre-ville est mort. On a déjà perdu huit commerces en trois ans."`,
    options: [
      {
        id: 'bloquer_soutenir',
        label: 'Bloquer le permis + soutenir la coopérative',
        description: 'Motif d\'intérêt général. Risque de recours juridique assumé.',
        recit: 'René appelle ses collègues. Le cabinet confirme le recours. Les commerçants affichent un panneau de soutien. Céline monte un dossier de financement d\'urgence.',
        effets: { solidarite: 2, legitimite: 2, ressources: -1, tension: 1, ecologie: 2 },
        roi: { tour: 4, solidarite: 2, legitimite: 1, ressources: 0, tension: -1, ecologie: 2 },
        flagSet: 'marche_producteurs_local',
      },
      {
        id: 'soutien_financier',
        label: 'Soutien financier à la coopérative, permis suspendu',
        description: 'Suspension technique du permis + aide au montage du dossier coopérative.',
        recit: 'René dit "on va y arriver". Céline monte un dossier. Le cabinet attend.',
        effets: { solidarite: 1, legitimite: 1, ressources: -1, tension: 0, ecologie: 2 },
        roi: { tour: 4, solidarite: 1, legitimite: 1, ressources: 0, tension: 0, ecologie: 1 },
        flagSet: null,
      },
      {
        id: 'negociation_enseigne',
        label: 'Négociation avec l\'enseigne (espace local imposé)',
        description: '10% de surface dédiée aux producteurs locaux. Compromis.',
        recit: 'René est sceptique. L\'enseigne accepte 8%. Les commerçants ne signent pas.',
        effets: { solidarite: 0, legitimite: 0, ressources: 0, tension: 0, ecologie: 1 },
        roi: { tour: 3, solidarite: 0, legitimite: 0, ressources: 1, tension: 0, ecologie: 0 },
        flagSet: null,
      },
      {
        id: 'permis_accorde',
        label: 'Permis accordé à l\'enseigne',
        description: 'La loi est la loi. On ne peut pas bloquer sans motif solide.',
        recit: 'René raccroche sans répondre. Les commerçants se résignent. L\'opposition ne dit rien — elle a des liens avec l\'enseigne.',
        effets: { solidarite: -2, legitimite: -2, ressources: 1, tension: 2, ecologie: -2 },
        roi: { tour: 5, solidarite: -2, legitimite: -1, ressources: 1, tension: 2, ecologie: -2 },
        flagSet: null,
      },
    ],
  },
];

// ================================================================
// HELPERS
// ================================================================
const clamp = (v, min = -20, max = 20) => Math.max(min, Math.min(max, v));

const getTonStyle = (ton) => {
  switch (ton) {
    case 'espoir': return 'border-emerald-800/40 bg-emerald-950/20';
    case 'alerte': return 'border-orange-800/40 bg-orange-950/20';
    default: return 'border-white/10 bg-white/5';
  }
};

const getJaugeBarWidth = (v) => {
  // Valeur entre -20 et +20, on la normalise pour l'affichage
  const normalized = ((v + 20) / 40) * 100;
  return Math.max(2, Math.min(100, normalized));
};

const getJaugeColor = (v) => {
  if (v >= 8) return 'bg-emerald-500';
  if (v >= 3) return 'bg-emerald-700';
  if (v >= -2) return 'bg-white/30';
  if (v >= -8) return 'bg-orange-700';
  return 'bg-red-600';
};

// ================================================================
// COMPOSANTS UI
// ================================================================

const JaugeMini = ({ jaugeKey, value }) => {
  const info = JAUGES_INFO[jaugeKey];
  const Icon = info.icon;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`p-1.5 rounded-sm ${info.bg} ${info.border} border`}>
        <Icon size={12} className={info.color} />
      </div>
      <span className={`text-xs font-mono font-bold ${value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-white/30'}`}>
        {value > 0 ? '+' : ''}{value}
      </span>
    </div>
  );
};

const JaugeBar = ({ jaugeKey, value }) => {
  const info = JAUGES_INFO[jaugeKey];
  const Icon = info.icon;
  const width = getJaugeBarWidth(value);
  const color = getJaugeColor(value);

  return (
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-sm ${info.bg} shrink-0`}>
        <Icon size={14} className={info.color} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-white/50 font-medium">{info.label}</span>
          <span className={`text-xs font-mono font-bold ${value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-white/30'}`}>
            {value > 0 ? '+' : ''}{value}
          </span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-700 rounded-full ${color}`}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const DeltaBadge = ({ key_, value }) => {
  if (value === 0) return null;
  const info = JAUGES_INFO[key_];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold border ${
      value > 0
        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30'
        : 'text-red-400 bg-red-950/40 border-red-800/30'
    }`}>
      <Icon size={10} />
      {value > 0 ? '+' : ''}{value}
    </span>
  );
};

// ================================================================
// COMPOSANT PRINCIPAL
// ================================================================

const ConseilMode = ({ onRetour, onTerminer }) => {
  const [phase, setPhase] = useState('intro'); // intro | deliberation | choix_fait | bilan | transition
  const [tourIndex, setTourIndex] = useState(0);
  const [jauges, setJauges] = useState({
    solidarite: 0, legitimite: 0, ressources: 0, tension: 0, ecologie: 0,
  });
  const [decisions, setDecisions] = useState([]); // { deliberation_id, option_id, effets, roi }
  const [optionChoisie, setOptionChoisie] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [roiSchedule, setRoiSchedule] = useState([]); // effets différés en attente

  const deliberationCourante = DELIBERATIONS[tourIndex];
  const totalTours = DELIBERATIONS.length;

  // Initialiser la session Supabase au montage
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data, error } = await supabase
          .from('conseil_sessions')
          .insert([{ tour_actuel: 0 }])
          .select('id')
          .single();
        if (!error && data) setSessionId(data.id);
      } catch (e) {
        console.warn('Supabase non disponible, mode local activé');
      }
    };
    initSession();
  }, []);

  // Appliquer les ROI différés quand on change de tour
  useEffect(() => {
    const roisAAppliquer = roiSchedule.filter(r => r.tour === tourIndex);
    if (roisAAppliquer.length > 0) {
      setJauges(prev => {
        const next = { ...prev };
        roisAAppliquer.forEach(roi => {
          Object.keys(JAUGES_INFO).forEach(k => {
            if (roi[k]) next[k] = clamp(next[k] + roi[k]);
          });
        });
        return next;
      });
    }
  }, [tourIndex]);

  const choisirOption = useCallback(async (option) => {
    // Appliquer les effets immédiats
    setJauges(prev => {
      const next = { ...prev };
      Object.keys(JAUGES_INFO).forEach(k => {
        if (option.effets[k]) next[k] = clamp(next[k] + option.effets[k]);
      });
      return next;
    });

    // Enregistrer le ROI différé
    if (option.roi && option.roi.tour) {
      setRoiSchedule(prev => [...prev, {
        tour: option.roi.tour,
        solidarite: option.roi.solidarite || 0,
        legitimite: option.roi.legitimite || 0,
        ressources: option.roi.ressources || 0,
        tension: option.roi.tension || 0,
        ecologie: option.roi.ecologie || 0,
      }]);
    }

    const decision = {
      deliberation_id: deliberationCourante.id,
      option_id: option.id,
      option_label: option.label,
      option_recit: option.recit,
      effets: option.effets,
      roi: option.roi,
      flagSet: option.flagSet,
    };

    setDecisions(prev => [...prev, decision]);
    setOptionChoisie(option);
    setPhase('choix_fait');

    // Sauvegarder en base
    if (sessionId) {
      setSaving(true);
      try {
        await supabase.from('conseil_decisions').insert([{
          session_id: sessionId,
          tour: tourIndex + 1,
          deliberation_id: deliberationCourante.id,
          option_id: option.id,
          delta_solidarite: option.effets.solidarite || 0,
          delta_legitimite: option.effets.legitimite || 0,
          delta_ressources: option.effets.ressources || 0,
          delta_tension: option.effets.tension || 0,
          delta_ecologie: option.effets.ecologie || 0,
          roi_tour: option.roi?.tour || null,
          roi_solidarite: option.roi?.solidarite || 0,
          roi_legitimite: option.roi?.legitimite || 0,
          roi_ressources: option.roi?.ressources || 0,
          roi_tension: option.roi?.tension || 0,
          roi_ecologie: option.roi?.ecologie || 0,
        }]);
        await supabase.from('conseil_sessions').update({
          tour_actuel: tourIndex + 1,
          jauge_solidarite: jauges.solidarite + (option.effets.solidarite || 0),
          jauge_legitimite: jauges.legitimite + (option.effets.legitimite || 0),
          jauge_ressources: jauges.ressources + (option.effets.ressources || 0),
          jauge_tension: jauges.tension + (option.effets.tension || 0),
          jauge_ecologie: jauges.ecologie + (option.effets.ecologie || 0),
        }).eq('id', sessionId);
      } catch (e) {
        console.warn('Erreur sauvegarde Supabase');
      } finally {
        setSaving(false);
      }
    }
  }, [deliberationCourante, tourIndex, jauges, sessionId]);

  const continuerVersProchain = useCallback(async () => {
    if (tourIndex + 1 >= totalTours) {
      // Générer la world config et terminer
      await finaliserSession();
      setPhase('bilan');
    } else {
      setTourIndex(prev => prev + 1);
      setOptionChoisie(null);
      setPhase('deliberation');
    }
  }, [tourIndex, totalTours]);

  const finaliserSession = async () => {
    if (!sessionId) return;

    // Construire la world config à partir des flags
    const flags = decisions.reduce((acc, d) => {
      if (d.flagSet) acc[d.flagSet] = true;
      return acc;
    }, {});

    const worldConfig = {
      transport_gratuit: flags.transport_gratuit || false,
      eau_municipalisee: flags.eau_municipalisee || false,
      logement_social_etendu: flags.logement_social_etendu || false,
      maison_peuple_ouverte: flags.maison_peuple_ouverte || false,
      marche_producteurs_local: flags.marche_producteurs_local || false,
      conseil_quartier_autonome: flags.conseil_quartier_autonome || false,
      solidarite_score: jauges.solidarite,
      legitimite_score: jauges.legitimite,
      ressources_score: jauges.ressources,
      tension_score: jauges.tension,
      ecologie_score: jauges.ecologie,
    };

    try {
      await supabase.from('conseil_sessions').update({
        completed: true,
        completed_at: new Date().toISOString(),
        tour_actuel: totalTours,
        jauge_solidarite: jauges.solidarite,
        jauge_legitimite: jauges.legitimite,
        jauge_ressources: jauges.ressources,
        jauge_tension: jauges.tension,
        jauge_ecologie: jauges.ecologie,
      }).eq('id', sessionId);

      await supabase.from('conseil_world_config').insert([{
        session_id: sessionId,
        config: worldConfig,
        ...worldConfig,
      }]);
    } catch (e) {
      console.warn('Erreur finalisation');
    }
  };

  // ======================== RENDU ========================

  // INTRO
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <button
            onClick={onRetour}
            className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-sm"
          >
            <ArrowLeft size={14} /> Retour
          </button>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building size={24} className="text-amber-400" />
              <p className="text-amber-400/60 text-xs uppercase tracking-widest font-mono">Mode Conseil</p>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Vous êtes maire.
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Six délibérations. Quinze minutes. Vos décisions configurent le monde dans lequel vivront les personnages du Multivers.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-5 space-y-4">
            <p className="text-white/70 text-sm leading-relaxed">
              Chaque choix affecte cinq jauges municipales. Certains coûtent maintenant et rapportent plus tard. D'autres l'inverse.
            </p>

            <div className="grid grid-cols-5 gap-2 pt-2">
              {Object.entries(JAUGES_INFO).map(([k, info]) => {
                const Icon = info.icon;
                return (
                  <div key={k} className="flex flex-col items-center gap-1.5">
                    <div className={`p-2 rounded-sm ${info.bg} border ${info.border}`}>
                      <Icon size={14} className={info.color} />
                    </div>
                    <span className="text-white/30 text-xs text-center leading-tight">{info.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-amber-400/5 border border-amber-400/20 p-4 text-sm text-amber-400/70 leading-relaxed">
            Jouez le Conseil avant le Multivers — vos décisions d'élu façonneront le contexte dans lequel survit chaque personnage.
          </div>

          <button
            onClick={() => setPhase('deliberation')}
            className="w-full bg-white text-black font-bold py-4 hover:bg-amber-400 transition-all uppercase tracking-widest text-sm"
          >
            Commencer la session
          </button>

          <div className="flex items-center gap-2 justify-center text-white/20 text-xs">
            <Clock size={12} />
            <span>~15 minutes • 6 délibérations</span>
          </div>
        </div>
      </div>
    );
  }

  // BILAN FINAL
  if (phase === 'bilan') {
    const flags = decisions.reduce((acc, d) => {
      if (d.flagSet) acc[d.flagSet] = true;
      return acc;
    }, {});

    const projets = [
      { key: 'eau_municipalisee', label: "Eau remunicialisée", icon: Droplets },
      { key: 'transport_gratuit', label: "Transports gratuits", icon: Bus },
      { key: 'logement_social_etendu', label: "Logement social étendu", icon: Home },
      { key: 'maison_peuple_ouverte', label: "Maison du Peuple ouverte", icon: Building },
      { key: 'marche_producteurs_local', label: "Marché de producteurs locaux", icon: ShoppingBasket },
      { key: 'conseil_quartier_autonome', label: "Conseils de quartier autonomes", icon: Vote },
    ];

    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-lg mx-auto space-y-6 py-8">
          <div className="text-center space-y-2">
            <CheckCircle size={32} className="text-amber-400 mx-auto" />
            <h1 className="text-xl font-black text-white">Session du Conseil terminée</h1>
            <p className="text-white/40 text-sm">Votre ville a été configurée</p>
          </div>

          {/* Jauges finales */}
          <div className="bg-white/5 border border-white/10 p-5 space-y-3">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-4 font-mono">État municipal</p>
            {Object.keys(JAUGES_INFO).map(k => (
              <JaugeBar key={k} jaugeKey={k} value={jauges[k]} />
            ))}
          </div>

          {/* Projets déclenchés */}
          <div className="bg-white/5 border border-white/10 p-5 space-y-3">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-4 font-mono">Projets actifs dans le Multivers</p>
            {projets.map(({ key, label, icon: Icon }) => (
              <div key={key} className={`flex items-center gap-3 p-3 rounded-sm border ${
                flags[key]
                  ? 'bg-emerald-950/20 border-emerald-800/30'
                  : 'bg-white/5 border-white/5 opacity-40'
              }`}>
                <Icon size={14} className={flags[key] ? 'text-emerald-400' : 'text-white/20'} />
                <span className={`text-sm ${flags[key] ? 'text-emerald-300' : 'text-white/30 line-through'}`}>
                  {label}
                </span>
                {flags[key] && <CheckCircle size={12} className="text-emerald-500 ml-auto" />}
              </div>
            ))}
          </div>

          {/* Résumé des décisions */}
          <div className="bg-white/5 border border-white/10 p-5 space-y-4">
            <p className="text-white/30 text-xs uppercase tracking-widest font-mono">Vos délibérations</p>
            {decisions.map((d, i) => {
              const delib = DELIBERATIONS.find(dl => dl.id === d.deliberation_id);
              return (
                <div key={i} className="border-l-2 border-white/10 pl-3 space-y-1">
                  <p className="text-white/30 text-xs">{delib?.domaine}</p>
                  <p className="text-white/60 text-sm font-medium">{d.option_label}</p>
                  <p className="text-white/30 text-xs italic">{d.option_recit}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-amber-400/5 border border-amber-400/20 p-4 text-sm text-amber-400/70 leading-relaxed">
            Ces décisions sont gravées. Quand vous jouerez le Multivers, les personnages vivront dans cette ville — la vôtre.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onRetour}
              className="bg-white/10 border border-white/20 text-white font-bold py-3 hover:bg-white/20 transition-all uppercase tracking-widest text-xs"
            >
              Menu principal
            </button>
            <button
              onClick={() => onTerminer && onTerminer({ jauges, flags: decisions.reduce((a, d) => { if (d.flagSet) a[d.flagSet] = true; return a; }, {}) })}
              className="bg-white text-black font-bold py-3 hover:bg-amber-400 transition-all uppercase tracking-widest text-xs"
            >
              Jouer le Multivers →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DÉLIBÉRATION EN COURS
  const delib = deliberationCourante;
  const IconDelib = delib.icone;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-black/90 border-b border-white/10 p-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <IconDelib size={14} className="text-amber-400" />
              <span className="text-white/40 text-xs font-mono uppercase">{delib.domaine}</span>
            </div>
            <span className="text-white/30 text-xs font-mono">
              {tourIndex + 1} / {totalTours}
            </span>
          </div>

          {/* Barre de progression */}
          <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-amber-400/60 transition-all duration-500"
              style={{ width: `${((tourIndex + (phase === 'choix_fait' ? 1 : 0)) / totalTours) * 100}%` }}
            />
          </div>

          {/* Jauges mini en header */}
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(jauges).map(([k, v]) => (
              <JaugeMini key={k} jaugeKey={k} value={v} />
            ))}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-lg mx-auto p-4 space-y-5 py-6">

        {/* Titre */}
        <div>
          <h2 className="text-xl font-black text-white">{delib.titre}</h2>
          <p className="text-white/40 text-xs mt-1 uppercase tracking-widest font-mono">{delib.domaine}</p>
        </div>

        {/* Situation */}
        <div className="bg-white/5 border border-white/10 p-5">
          <p className="text-white/80 text-sm leading-relaxed">{delib.situation}</p>
        </div>

        {/* Personnages */}
        <div className="space-y-3">
          {delib.personnages.map((p, i) => (
            <div key={i} className={`border p-4 space-y-2 ${getTonStyle(p.ton)}`}>
              <div className="flex items-center gap-2">
                <MessageSquare size={12} className="text-white/30" />
                <span className="text-white/70 text-xs font-bold">{p.nom}</span>
                <span className="text-white/30 text-xs">— {p.role}</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed italic">
                {p.message}
              </p>
            </div>
          ))}
        </div>

        {/* Opposition */}
        <div className="border border-red-900/30 bg-red-950/10 p-4">
          <p className="text-red-400/60 text-xs uppercase tracking-widest mb-2 font-mono">Opposition</p>
          <p className="text-white/50 text-sm italic">{delib.opposition}</p>
        </div>

        {/* Phase : choix */}
        {phase === 'deliberation' && (
          <div className="space-y-3">
            <p className="text-white/30 text-xs uppercase tracking-widest font-mono pt-2">Votre décision</p>
            {delib.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => choisirOption(opt)}
                className="w-full text-left p-5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group space-y-3"
              >
                <p className="text-white/90 text-[15px] font-medium group-hover:text-white transition-colors">
                  {opt.label}
                </p>
                <p className="text-white/40 text-sm leading-relaxed">
                  {opt.description}
                </p>
                {/* Aperçu effets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(opt.effets).map(([k, v]) => (
                    <DeltaBadge key={k} key_={k} value={v} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Phase : conséquence */}
        {phase === 'choix_fait' && optionChoisie && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-amber-400/20 p-5 space-y-3">
              <p className="text-amber-400/60 text-xs uppercase tracking-widest font-mono">Décision prise : {optionChoisie.label}</p>
              <p className="text-white/80 text-sm leading-relaxed italic">
                {optionChoisie.recit}
              </p>
            </div>

            {/* Effets immédiats */}
            <div className="bg-white/5 border border-white/10 p-5 space-y-3">
              <p className="text-white/30 text-xs uppercase tracking-widest font-mono mb-3">Effets immédiats</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(optionChoisie.effets).map(([k, v]) => (
                  <DeltaBadge key={k} key_={k} value={v} />
                ))}
              </div>
            </div>

            {/* ROI différé */}
            {optionChoisie.roi && optionChoisie.roi.tour && (
              <div className="bg-teal-950/20 border border-teal-800/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-teal-400" />
                  <p className="text-teal-400/60 text-xs uppercase tracking-widest font-mono">
                    Effets différés — délibération {optionChoisie.roi.tour}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(optionChoisie.roi)
                    .filter(([k]) => k !== 'tour')
                    .map(([k, v]) => (
                      <DeltaBadge key={k} key_={k} value={v} />
                    ))}
                </div>
              </div>
            )}

            <button
              onClick={continuerVersProchain}
              disabled={saving}
              className="w-full bg-white text-black font-bold py-4 hover:bg-amber-400 transition-all uppercase tracking-widest text-sm disabled:opacity-50"
            >
              {tourIndex + 1 >= totalTours
                ? 'Voir le bilan de session'
                : `Délibération suivante →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConseilMode;
