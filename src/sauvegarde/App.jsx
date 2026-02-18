import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Wallet, Brain, Users, Thermometer, ChevronRight, Eye, RotateCcw, 
  Share2, Lock, HelpCircle, X, Target, BarChart3, Heart, User
} from 'lucide-react';

// ==================== CONFIGURATION SUPABASE ====================
// Ces valeurs seront remplacées lors de l'installation
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ton-projet.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'ta-cle-anon';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== DONNÉES DES 6 PERSONNAGES ====================

const CHARACTERS = {
  
  // ============ MAMADOU - Livreur auto-entrepreneur ============
  mamadou: {
    id: 'mamadou',
    name: 'Mamadou',
    age: 28,
    role: 'Livreur auto-entrepreneur',
    description: "Arrivé de Bamako à 19 ans. Naturalisé français. Tu travailles pour trois plateformes de livraison, tu vis en colocation à Sapiac, et tu économises pour une formation.",
    initialStats: { resources: 50, moral: 50, links: 30, comfort: 40 },
    scenes: [
      {
        world: 'A', domain: 'transports',
        context: "Lundi, 11h47. Tu dois livrer rue de la République. La zone est en travaux depuis trois semaines. Le détour officiel ajoute 12 minutes. Ton score de rapidité est déjà à 78% — en dessous de 75%, tu perds ton bonus.",
        choices: [
          { label: "Prendre le détour par les boulevards", consequence: "Tu arrives avec 14 minutes de retard. Le client ne dit rien mais ne laisse pas de pourboire. Ton score tombe à 74%.", impact: { resources: -15, moral: -5, links: 0, comfort: 5 }, worldHint: "Les travaux n'en finissent pas. Pas de piste provisoire.", choiceType: 'neutre' },
          { label: "Couper par la zone piétonne", consequence: "Un agent municipal te verbalise. 90€. 'C'est interdit, vous le savez très bien.' Tu livres quand même à l'heure.", impact: { resources: -25, moral: -15, links: 0, comfort: 0 }, worldHint: "Les contrôles sont fréquents depuis les nouvelles consignes.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'B', domain: 'transports',
        context: "Mardi, 14h20. Livraison rue de la Résistance. Le quartier est en cours de réaménagement — un 'superîlot' avec priorité piétons. Une piste cyclable temporaire a été tracée à la peinture jaune.",
        choices: [
          { label: "Prendre la piste temporaire", consequence: "C'est étroit mais ça passe. Tu livres à l'heure. Le client te propose un verre d'eau, tu refuses poliment.", impact: { resources: 10, moral: 5, links: 0, comfort: 0 }, worldHint: "La signalétique est claire, même improvisée.", choiceType: 'neutre' },
          { label: "T'arrêter au 'Commun' pour remplir ta gourde", consequence: "Le local associatif est frais. Tu discutes 15 minutes avec Rachid qui te parle d'une formation de réparateur vélo. Livraison en retard.", impact: { resources: -10, moral: 15, links: 20, comfort: 10 }, worldHint: "Le 'Commun' est un tiers-lieu ouvert par la mairie.", choiceType: 'solidaire', setsFlag: 'metRachid' }
        ]
      },
      {
        world: 'A', domain: 'securite',
        context: "Mercredi, 18h05. Tu ranges ton vélo devant chez toi, rue des Carmes. Une voiture de police ralentit. Deux agents en descendent. 'Contrôle d'identité, monsieur.'",
        choices: [
          { label: "Coopérer sans rien dire", consequence: "Ils vérifient tes papiers, fouillent ton sac de livraison, te demandent d'où tu viens. 'Malien d'origine ? D'accord.' Ils repartent après 20 minutes.", impact: { resources: -5, moral: -20, links: 0, comfort: -5 }, worldHint: "C'est le troisième contrôle ce mois-ci.", choiceType: 'neutre' },
          { label: "Demander poliment le motif du contrôle", consequence: "'On n'a pas à se justifier.' Le ton monte légèrement. Ils appellent du renfort 'par précaution'. Tu es relâché après 45 minutes, sans suite.", impact: { resources: -10, moral: -25, links: -5, comfort: -10 }, worldHint: "Ton voisin regarde par la fenêtre mais ne sort pas.", choiceType: 'solidaire' }
        ]
      },
      {
        world: 'B', domain: 'travail',
        context: "Jeudi, 10h. Tu reçois un SMS de la Maison de l'Emploi : 'Rappel : votre RDV pour le dispositif Crédit Temps-Formation est confirmé à 14h.' Tu avais postulé il y a deux mois.",
        choices: [
          { label: "Y aller, tant pis pour les livraisons", consequence: "L'agent est à l'écoute. Tu apprends que tu peux suivre une formation de mécanicien cycle, 6 mois, avec maintien d'un revenu minimal. Tu dois réfléchir.", impact: { resources: -15, moral: 20, links: 10, comfort: 0 }, worldHint: "Le dispositif est cofinancé par la Région et la Ville.", choiceType: 'solidaire', setsFlag: 'formationPossible' },
          { label: "Reporter le RDV", consequence: "Tu livres toute la journée. Le soir, tu repenses au SMS. Le prochain créneau disponible est dans 6 semaines.", impact: { resources: 15, moral: -10, links: 0, comfort: 0 }, worldHint: "Les créneaux sont rares mais ils existent.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'climat',
        context: "Vendredi, 15h30. Canicule. 38°C à l'ombre. Les fontaines publiques de la place Nationale sont à sec — 'mesure d'économie'. Tu as vidé ta gourde il y a une heure.",
        choices: [
          { label: "Acheter une bouteille à la supérette", consequence: "2,20€ la petite Evian. Tu bois d'un trait, tu achètes une deuxième. L'argent file.", impact: { resources: -10, moral: 0, links: 0, comfort: 10 }, worldHint: "Les prix ont monté cet été.", choiceType: 'individuel' },
          { label: "Demander de l'eau au restaurant", consequence: "Le serveur te regarde, hésite. 'On n'est pas une fontaine.' Il finit par te donner un verre d'eau du robinet, sans sourire.", impact: { resources: 0, moral: -15, links: -10, comfort: 5 }, worldHint: "Tu te sens comme un mendiant.", choiceType: 'neutre' }
        ]
      },
      {
        world: 'B', domain: 'alimentation',
        context: "Samedi, 13h. Tu passes devant le marché couvert. Un stand affiche 'Carte Commune acceptée'. Tu n'as jamais utilisé la tienne — on te l'a donnée à la mairie mais tu ne sais pas trop comment ça marche.",
        choices: [
          { label: "Essayer la Carte Commune", consequence: "Le maraîcher t'explique : c'est un crédit de 25€/mois pour les produits locaux. Tu repars avec des tomates, des courgettes et un sentiment bizarre — entre fierté et gêne.", impact: { resources: 10, moral: 10, links: 15, comfort: 5 }, worldHint: "Philippe, le maraîcher, te reconnaît de tes livraisons.", choiceType: 'solidaire' },
          { label: "Passer ton chemin", consequence: "Tu manges un kebab en roulant. Le pain est sec. Tu penses à la carte dans ton portefeuille.", impact: { resources: -5, moral: -5, links: 0, comfort: -5 }, worldHint: "Tu te dis que c'est pour les vrais pauvres, pas pour toi.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'logement',
        context: "Dimanche, 11h. Ton coloc t'annonce qu'il part à Toulouse le mois prochain. Tu dois trouver un autre coloc ou un appart moins cher.",
        choices: [
          { label: "Poster une annonce pour un nouveau coloc", consequence: "Trois réponses en deux jours. Un étudiant qui veut payer 200€, un type bizarre, une fille qui cherche 'calme absolu'. Rien de viable.", impact: { resources: 0, moral: -10, links: 0, comfort: -10 }, worldHint: "Le marché locatif est tendu, les proprios exigeants.", choiceType: 'solidaire' },
          { label: "Chercher un studio seul", consequence: "Les rares studios abordables sont à Bas-Pays, loin de tout. Tu ferais 40 minutes de vélo pour rejoindre le centre.", impact: { resources: -5, moral: -15, links: -5, comfort: -15 }, worldHint: "Pas d'aide municipale au logement cette année.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'B', domain: 'citoyennete',
        context: "Lundi suivant, 19h. Rachid t'a invité à une 'Assemblée de Quartier' à Sapiac. Tu ne sais pas trop ce que c'est.",
        choices: [
          { label: "Y aller par curiosité", consequence: "Une trentaine de personnes. On parle des poubelles, du parc, d'un projet de jardin partagé. Tu ne dis rien mais une dame te sourit. Tu repars avec un sentiment étrange d'appartenance.", impact: { resources: -5, moral: 20, links: 25, comfort: 5 }, worldHint: "L'assemblée a un petit budget à répartir collectivement.", choiceType: 'solidaire', requiresFlag: 'metRachid', lockedText: "Tu n'as jamais rencontré Rachid..." },
          { label: "Décliner, tu es crevé", consequence: "Tu restes chez toi. Tu scrolles sur ton téléphone. Tu repenses à Rachid. Tu te dis que tu iras la prochaine fois.", impact: { resources: 5, moral: -5, links: -10, comfort: 5 }, worldHint: "La prochaine assemblée est dans un mois.", choiceType: 'individuel' }
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
    description: "Tu travailles à l'hôpital de Montauban depuis 8 ans. Tu vis seule dans un T2 à Villebourbon. Pas de voiture, tu dépends des bus et de ton vélo. Les gardes s'enchaînent.",
    initialStats: { resources: 45, moral: 40, links: 35, comfort: 45 },
    scenes: [
      {
        world: 'A', domain: 'travail',
        context: "Lundi, 7h15. Le cadre de santé t'appelle : 'Inès, on est en sous-effectif. Tu peux prendre le week-end prochain ? C'est ton troisième d'affilée mais il y a la prime.'",
        choices: [
          { label: "Accepter pour la prime", consequence: "La direction te voit comme un pilier. 180€ de plus ce mois-ci. Ton corps proteste. Tu annules le resto avec ta sœur.", impact: { resources: 20, moral: -20, links: -15, comfort: -15 }, worldHint: "Le service tient grâce aux volontaires qui craquent.", choiceType: 'individuel' },
          { label: "Refuser et proposer une rotation équitable", consequence: "'On verra ce qu'on peut faire.' Ton mail reste sans réponse. Le week-end, le service est en tension. Tes collègues sont épuisées mais te remercient d'avoir posé la question.", impact: { resources: 0, moral: 5, links: 10, comfort: 5 }, worldHint: "La hiérarchie note les 'refus de flexibilité'.", choiceType: 'solidaire' }
        ]
      },
      {
        world: 'B', domain: 'travail',
        context: "Mardi, 14h. Réunion d'équipe. Le cadre présente un nouveau planning co-construit avec les syndicats. Les gardes sont réparties sur la base du volontariat, avec un plafond mensuel.",
        choices: [
          { label: "T'inscrire pour deux week-ends ce mois", consequence: "Tu choisis tes dates. C'est lisible. La prime est moins élevée qu'avant mais le rythme est tenable.", impact: { resources: 10, moral: 10, links: 10, comfort: 5 }, worldHint: "Le planning est affiché un mois à l'avance.", choiceType: 'solidaire' },
          { label: "Ne prendre aucun week-end ce mois", consequence: "Personne ne te le reproche. Tu récupères. Tu te sens un peu coupable quand même — tes collègues portent la charge.", impact: { resources: -5, moral: 5, links: -5, comfort: 15 }, worldHint: "Le système repose sur l'équilibre collectif.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'sante',
        context: "Mercredi, 18h. Tu as une douleur persistante au dos depuis deux semaines. Tu appelles ton médecin traitant. 'Premier créneau disponible : dans trois semaines.'",
        choices: [
          { label: "Attendre le rendez-vous", consequence: "Tu prends du Doliprane. La douleur s'installe. Tu compenses avec des postures qui fatiguent d'autres muscles. Le cercle vicieux.", impact: { resources: 0, moral: -10, links: 0, comfort: -20 }, worldHint: "Trois médecins ont quitté la ville cette année.", choiceType: 'neutre' },
          { label: "Aller aux urgences après ta garde", consequence: "4 heures d'attente. Le médecin urgentiste te prescrit du repos. 'Vous ne devriez pas travailler dans cet état.' Tu reprends le lendemain.", impact: { resources: -10, moral: -15, links: 0, comfort: -10 }, worldHint: "Les urgences sont saturées. Toi aussi.", choiceType: 'neutre' }
        ]
      },
      {
        world: 'B', domain: 'sante',
        context: "Jeudi, 12h. Tu passes devant le Centre de Santé Municipal de Villebourbon. Un panneau indique 'Consultations sans RDV : 14h-16h'. Tu as ta douleur au dos.",
        choices: [
          { label: "Tenter la consultation sans RDV", consequence: "45 minutes d'attente. Une médecin salariée t'examine, prescrit des séances de kiné et te propose un arrêt de 3 jours. 'Prenez soin de vous.'", impact: { resources: -5, moral: 15, links: 5, comfort: 10 }, worldHint: "Le centre de santé municipal emploie des médecins salariés, pas de dépassements.", choiceType: 'solidaire', setsFlag: 'arretMaladie' },
          { label: "Continuer, tu gères", consequence: "Tu rentres chez toi. Le dos te lance. Tu te dis que ça passera. Ça ne passe pas.", impact: { resources: 0, moral: -10, links: 0, comfort: -15 }, worldHint: "Tu connais tes limites. Tu les dépasses souvent.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'travail',
        context: "Vendredi, 22h. Garde de nuit en pédiatrie. Yanis, 7 ans, hospitalisé pour une bronchite sévère, n'arrive pas à dormir. Sa mère est partie à 20h — elle travaille tôt demain. Il pleure doucement.",
        choices: [
          { label: "Rester un moment avec lui, lui parler", consequence: "Tu t'assieds, tu lui racontes une histoire inventée. Il finit par s'endormir. Ta collègue a dû gérer seule deux appels pendant ce temps.", impact: { resources: 0, moral: 15, links: -5, comfort: -10 }, worldHint: "Le protocole dit 'surveillance', pas 'présence'.", choiceType: 'solidaire' },
          { label: "Vérifier ses constantes et passer au suivant", consequence: "Tu fais ton travail. Yanis continue de pleurer. Tu l'entends depuis le couloir. Tu te dis que tu ne peux pas être partout.", impact: { resources: 5, moral: -20, links: 5, comfort: 0 }, worldHint: "Le service tourne. C'est ce qu'on te demande.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'B', domain: 'travail',
        context: "Samedi, 15h. Yanis, 7 ans, sort demain. Sa mère, aide à domicile, ne peut pas venir le chercher avant 19h. Le service ferme à 17h le week-end.",
        choices: [
          { label: "Proposer de rester jusqu'à 19h", consequence: "Ta cadre accepte de te payer les heures sup. Tu joues aux cartes avec Yanis. Sa mère arrive, épuisée mais soulagée. 'Merci, vraiment.'", impact: { resources: 5, moral: 20, links: 15, comfort: -10 }, worldHint: "Le protocole 'Sortie Accompagnée' a été négocié par le collectif soignant.", choiceType: 'solidaire', setsFlag: 'resteAvecYanis' },
          { label: "Appeler le service social pour une solution", consequence: "L'assistante sociale trouve une solution : Yanis ira chez une voisine. C'est carré. Tu rentres à l'heure. Tu te demandes si c'était le mieux.", impact: { resources: 0, moral: 0, links: 5, comfort: 5 }, worldHint: "Le réseau fonctionne, mais c'est impersonnel.", choiceType: 'neutre' }
        ]
      },
      {
        world: 'A', domain: 'travail',
        context: "Dimanche, 13h. Pause déjeuner. Trois collègues discutent dans la salle de repos : 'On devrait faire remonter le problème des effectifs. Écrire un courrier collectif à la direction.'",
        choices: [
          { label: "Signer le courrier", consequence: "Vous êtes sept à signer. Le courrier part. Deux semaines plus tard, convocation individuelle avec le cadre sup. 'On a noté votre... engagement.'", impact: { resources: 0, moral: 10, links: 20, comfort: -5 }, worldHint: "La direction n'aime pas les vagues. Elle note les noms.", choiceType: 'solidaire' },
          { label: "Ne pas t'en mêler", consequence: "Tu finis ton café et tu repars. Le courrier part avec six signatures. Tu croises le regard de Fatima. Elle ne dit rien.", impact: { resources: 0, moral: -15, links: -15, comfort: 5 }, worldHint: "Tu sais que c'est lâche. Tu sais aussi que tu es fatiguée.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'B', domain: 'travail',
        context: "Lundi, 17h. Réunion mensuelle du 'Collectif Soignant' — un espace créé par la nouvelle direction pour discuter des conditions de travail. Aujourd'hui : la question des remplacements.",
        choices: [
          { label: "Prendre la parole sur ton vécu", consequence: "Tu racontes tes trois week-ends d'affilée de l'an dernier. D'autres acquiescent. Une proposition émerge : un pool de remplaçants mutualisé avec l'agglo. La direction prend note.", impact: { resources: -5, moral: 25, links: 20, comfort: 0 }, worldHint: "Le collectif a un pouvoir consultatif, pas décisionnaire. Mais il est écouté.", choiceType: 'solidaire' },
          { label: "Écouter sans intervenir", consequence: "D'autres parlent. Des choses se disent. Tu apprends des trucs. Mais ta fatigue à toi reste invisible.", impact: { resources: 0, moral: 5, links: 10, comfort: 5 }, worldHint: "Participer, c'est aussi écouter. Mais ta voix compte.", choiceType: 'neutre' }
        ]
      }
    ]
  },

  // ============ FRANÇOISE - Retraitée LGBTQ+ ============
  francoise: {
    id: 'francoise',
    name: 'Françoise',
    age: 72,
    role: 'Retraitée, ancienne institutrice',
    description: "Tu as perdu Mireille, ta compagne depuis 40 ans, il y a trois ans. Vous vous êtes mariées en 2015, après tant d'années dans l'ombre. Tu vis seule dans votre maison à Lalande. La solitude pèse.",
    initialStats: { resources: 55, moral: 35, links: 25, comfort: 50 },
    scenes: [
      {
        world: 'A', domain: 'citoyennete',
        context: "Lundi, 10h. Tu dois renouveler ta carte d'identité à la mairie. L'agent regarde ton dossier. 'Situation familiale ?' Tu réponds : 'Veuve.' Il fronce les sourcils. 'Veuve de... ?'",
        choices: [
          { label: "Expliquer calmement", consequence: "'Mon épouse est décédée.' Il tape sans rien dire. Tu sens son malaise. Le formulaire n'a pas de case pour toi.", impact: { resources: 0, moral: -15, links: -5, comfort: 0 }, worldHint: "Les agents n'ont pas été formés. Ton histoire les dérange.", choiceType: 'neutre' },
          { label: "Répondre sèchement 'Mon épouse'", consequence: "Il rougit. 'Ah. D'accord.' Le silence est lourd. Tu sors avec ta carte, mais le goût amer reste.", impact: { resources: 0, moral: -10, links: -10, comfort: 0 }, worldHint: "Tu refuses de te justifier. Mais ça coûte.", choiceType: 'solidaire' }
        ]
      },
      {
        world: 'B', domain: 'citoyennete',
        context: "Mardi, 10h. Renouvellement de carte d'identité. L'agent regarde ton dossier. 'Situation familiale : veuve.' Elle lève les yeux. 'Mes condoléances pour votre épouse. C'est noté.'",
        choices: [
          { label: "Remercier simplement", consequence: "Tu es surprise. C'est la première fois qu'on ne te demande pas d'expliquer. Tu sors avec un sentiment étrange : la normalité.", impact: { resources: 0, moral: 15, links: 5, comfort: 5 }, worldHint: "Les agents ont suivi une formation 'accueil inclusif'.", choiceType: 'neutre' },
          { label: "Lui dire que ça fait du bien d'être reconnue", consequence: "Elle sourit. 'C'est normal.' Tu pleures un peu, sans savoir pourquoi. Elle te tend un mouchoir. 'Prenez soin de vous.'", impact: { resources: 0, moral: 25, links: 15, comfort: 5 }, worldHint: "La reconnaissance, parfois, c'est juste ça : ne pas avoir à se battre.", choiceType: 'solidaire' }
        ]
      },
      {
        world: 'A', domain: 'sante',
        context: "Mercredi, 15h. RDV chez un nouveau médecin. Il regarde ton dossier. 'Je vois que vous avez eu un traitement hormonal dans les années 90. C'était pour... ?' Tu comprends qu'il a mal lu.",
        choices: [
          { label: "Corriger l'erreur patiemment", consequence: "'Non, c'était ma compagne qui était trans. Pas moi.' Il s'excuse, gêné. La consultation continue, mais la confiance est entamée.", impact: { resources: -10, moral: -15, links: 0, comfort: -5 }, worldHint: "Les dossiers médicaux sont mal renseignés. L'histoire se perd.", choiceType: 'neutre' },
          { label: "Dire que ce n'est pas le sujet de la consultation", consequence: "'Je suis venue pour mon dos.' Il insiste : 'C'est pour votre dossier.' Tu te fermes. La consultation est expéditive.", impact: { resources: -10, moral: -20, links: -5, comfort: -10 }, worldHint: "Tu n'as pas envie de raconter ta vie à chaque rendez-vous.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'B', domain: 'sante',
        context: "Jeudi, 11h. RDV au Centre de Santé Municipal. La médecin a accès à ton dossier partagé. 'Je vois votre historique. On continue le suivi habituel ?'",
        choices: [
          { label: "Apprécier la continuité", consequence: "Elle connaît ton parcours. Pas besoin de tout réexpliquer. Tu parles de ton dos, de ton sommeil, de la solitude aussi. Elle t'écoute.", impact: { resources: -5, moral: 20, links: 10, comfort: 10 }, worldHint: "Le dossier médical partagé inclut les infos de Mireille — avec ton accord.", choiceType: 'solidaire' },
          { label: "Demander à voir ce qui est noté", consequence: "Elle te montre l'écran. Tout est là, clair. Tu corriges une date. Elle modifie. 'C'est votre dossier, vous avez le contrôle.'", impact: { resources: -5, moral: 15, links: 5, comfort: 5 }, worldHint: "La transparence te rassure.", choiceType: 'neutre' }
        ]
      },
      {
        world: 'A', domain: 'loisirs',
        context: "Vendredi, 14h. La médiathèque. Tu viens chaque semaine depuis 30 ans. Le rayon 'LGBT' a été 'réorganisé' — les livres sont maintenant dans un coin, derrière les rayonnages techniques.",
        choices: [
          { label: "Demander pourquoi au bibliothécaire", consequence: "'Décision de la mairie. Certains parents se plaignaient.' Tu ne dis rien. Tu empruntes ton livre et tu pars.", impact: { resources: 0, moral: -20, links: -5, comfort: -5 }, worldHint: "L'invisibilisation est une politique.", choiceType: 'neutre' },
          { label: "Écrire un mot au registre de suggestions", consequence: "Tu écris calmement. Une semaine plus tard, le registre a disparu. 'En maintenance', dit l'affiche.", impact: { resources: 0, moral: -15, links: 0, comfort: 0 }, worldHint: "Ta parole ne compte pas ici.", choiceType: 'solidaire' }
        ]
      },
      {
        world: 'B', domain: 'loisirs',
        context: "Samedi, 15h. La médiathèque a un nouveau programme : 'Ateliers Mémoire' — des seniors racontent leur histoire à des lycéens. On t'a proposé de témoigner.",
        choices: [
          { label: "Accepter de témoigner", consequence: "Tu parles de Mireille, de 40 ans d'amour discret, du mariage tardif. Les lycéens écoutent. Une fille pleure. Un garçon te remercie après.", impact: { resources: -5, moral: 30, links: 25, comfort: 0 }, worldHint: "Ton histoire devient un héritage.", choiceType: 'solidaire', setsFlag: 'temoignage' },
          { label: "Refuser, c'est trop intime", consequence: "Tu déclines poliment. Tu restes dans la salle à écouter les autres. C'est bien aussi, mais tu te demandes si tu as raté quelque chose.", impact: { resources: 0, moral: 5, links: 5, comfort: 5 }, worldHint: "Tout le monde n'est pas prêt à se dévoiler. C'est normal.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'climat',
        context: "Dimanche, 16h. Canicule. Tu n'as pas de climatisation. La mairie a mis en place un 'registre canicule' mais personne ne t'a appelée. Tu as soif. Il fait 35°C dans la maison.",
        choices: [
          { label: "Appeler la mairie", consequence: "Répondeur. 'Nos services sont fermés le dimanche.' Tu raccroches. Tu bois de l'eau tiède.", impact: { resources: 0, moral: -15, links: -10, comfort: -20 }, worldHint: "Le registre existe. Personne ne l'utilise.", choiceType: 'neutre' },
          { label: "Appeler ta voisine Gisèle", consequence: "Elle vient te chercher. Tu passes l'après-midi chez elle, devant son ventilateur. Vous parlez de tout et de rien. Ça fait du bien.", impact: { resources: 0, moral: 10, links: 15, comfort: 10 }, worldHint: "L'entraide existe encore. Mais il faut oser demander.", choiceType: 'solidaire' }
        ]
      },
      {
        world: 'B', domain: 'climat',
        context: "Lundi, 11h. Canicule. On sonne. C'est Karim, du 'Réseau Vigilance Quartier'. 'Bonjour madame. On vient voir si vous avez besoin de quelque chose. Il fait chaud.'",
        choices: [
          { label: "Le laisser entrer", consequence: "Il vérifie que tu as de l'eau, que le frigo marche. Il te donne le numéro du réseau. 'On peut venir tous les jours si vous voulez.' Tu acceptes.", impact: { resources: 0, moral: 20, links: 20, comfort: 15 }, worldHint: "Le réseau est financé par la mairie et porté par des bénévoles.", choiceType: 'solidaire' },
          { label: "Dire que tu vas bien, merci", consequence: "Il te laisse sa carte. 'N'hésitez pas.' Tu restes seule. Il fait toujours chaud, mais tu sais que quelqu'un sait que tu existes.", impact: { resources: 0, moral: 10, links: 10, comfort: 5 }, worldHint: "Même refusée, la visite a changé quelque chose.", choiceType: 'neutre' }
        ]
      }
    ]
  },

  // ============ PHILIPPE - Maraîcher périurbain ============
  philippe: {
    id: 'philippe',
    name: 'Philippe',
    age: 55,
    role: 'Maraîcher périurbain',
    description: "12 hectares à Bressols. Tu tentes la conversion bio depuis 3 ans. Deux employés saisonniers. Tu vends sur les marchés et en circuit court. La transmission te préoccupe.",
    initialStats: { resources: 40, moral: 45, links: 40, comfort: 50 },
    scenes: [
      {
        world: 'A', domain: 'economie',
        context: "Lundi, 6h. Marché de Montauban. Ton emplacement a augmenté : 180€/mois contre 120€ l'an dernier. 'Hausse des charges', dit la mairie.",
        choices: [
          { label: "Payer et continuer", consequence: "60€ de plus par mois. Sur des marges déjà serrées, c'est une journée de travail en moins. Tu paies.", impact: { resources: -15, moral: -10, links: 0, comfort: 0 }, worldHint: "Les grandes surfaces ne paient pas ce genre de frais.", choiceType: 'neutre' },
          { label: "Réduire ta présence au marché", consequence: "Tu ne viens plus que le samedi. Tu perds des clients réguliers du mardi. Certains vont ailleurs.", impact: { resources: -10, moral: -15, links: -10, comfort: 5 }, worldHint: "Le marché de centre-ville n'est plus fait pour toi.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'B', domain: 'economie',
        context: "Mardi, 6h. Marché de Montauban. La mairie a créé un 'tarif producteur local' : 80€/mois pour ceux qui vendent leur propre production.",
        choices: [
          { label: "Prendre le tarif producteur", consequence: "Tu économises 100€/mois par rapport aux revendeurs. Ton voisin de stand, qui achète en gros à Rungis, râle. Tant pis pour lui.", impact: { resources: 15, moral: 10, links: 5, comfort: 0 }, worldHint: "La mairie distingue le local du 'faux local'.", choiceType: 'solidaire' },
          { label: "Ne rien changer", consequence: "Tu restes au tarif normal. Par solidarité avec ton voisin, ou par flemme administrative. Tu ne sais pas trop.", impact: { resources: 0, moral: 0, links: 5, comfort: 0 }, worldHint: "Parfois, on ne profite pas des avantages auxquels on a droit.", choiceType: 'neutre' }
        ]
      },
      {
        world: 'A', domain: 'climat',
        context: "Mercredi, 14h. Sécheresse. L'arrêté préfectoral interdit l'irrigation entre 8h et 20h. Tes tomates souffrent. Ton voisin irrigue quand même.",
        choices: [
          { label: "Respecter l'arrêté", consequence: "Tu irrigues la nuit, épuisé. Tes rendements baissent de 20%. Le voisin, lui, a de belles tomates.", impact: { resources: -15, moral: 5, links: 0, comfort: -15 }, worldHint: "Les contrôles sont rares. Ceux qui respectent les règles sont punis.", choiceType: 'solidaire' },
          { label: "Irriguer comme le voisin", consequence: "Tu irrigues à 10h. Personne ne vient vérifier. Tes tomates survivent. Mais tu te sens complice d'un système absurde.", impact: { resources: 5, moral: -15, links: -5, comfort: 0 }, worldHint: "La règle commune ne tient que si tout le monde la respecte.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'B', domain: 'climat',
        context: "Jeudi, 10h. Réunion de la 'Commission Eau' du bassin versant. Agriculteurs, élus, associations. On discute du partage de l'eau en période de sécheresse.",
        choices: [
          { label: "Participer activement", consequence: "Tu proposes un tour d'eau entre voisins. Certains râlent, d'autres approuvent. La discussion est longue mais un accord émerge.", impact: { resources: -10, moral: 15, links: 20, comfort: 0 }, worldHint: "La gestion concertée prend du temps. Mais elle tient mieux.", choiceType: 'solidaire', setsFlag: 'commissionEau' },
          { label: "Écouter sans t'engager", consequence: "Tu observes. Les décisions se prennent sans toi. Tu repars avec l'accord, sans y avoir contribué.", impact: { resources: 0, moral: 0, links: 5, comfort: 5 }, worldHint: "Tu fais partie du collectif. Mais à la marge.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'alimentation',
        context: "Vendredi, 9h. La cantine scolaire lance un appel d'offres. Tu voudrais répondre, mais le cahier des charges demande 2 tonnes/semaine, des certifications, un logiciel de traçabilité.",
        choices: [
          { label: "Tenter quand même", consequence: "Tu passes des heures sur le dossier. Tu es éliminé pour 'capacité insuffisante'. Une entreprise de Toulouse remporte le marché.", impact: { resources: -10, moral: -20, links: 0, comfort: -5 }, worldHint: "Les appels d'offres sont faits pour les gros.", choiceType: 'solidaire' },
          { label: "Laisser tomber", consequence: "Tu retournes à tes salades. La cantine servira des légumes de loin. Tes légumes iront ailleurs — ou nulle part.", impact: { resources: 0, moral: -10, links: -5, comfort: 0 }, worldHint: "Le système t'exclut sans même te refuser.", choiceType: 'neutre' }
        ]
      },
      {
        world: 'B', domain: 'alimentation',
        context: "Samedi, 11h. La mairie propose une 'Convention Circuit Court' : tu livres la cantine 3 fois/semaine, sans appel d'offres, à prix fixé ensemble.",
        choices: [
          { label: "Signer la convention", consequence: "300€/semaine garantis. Tu adaptes tes cultures. La relation avec la cantinière est directe : elle te dit ce qui marche, ce qui ne marche pas.", impact: { resources: 20, moral: 15, links: 15, comfort: 5 }, worldHint: "La convention est légale : l'article L. 2113-12 du code de la commande publique permet les achats directs sous 40 000€.", choiceType: 'solidaire', setsFlag: 'conventionCantine' },
          { label: "Demander à réfléchir", consequence: "Tu hésites. C'est un engagement. Deux semaines plus tard, un autre maraîcher a signé. Le créneau est pris.", impact: { resources: 0, moral: -10, links: -5, comfort: 0 }, worldHint: "L'occasion ne se représentera pas de sitôt.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'travail',
        context: "Dimanche, 8h. Ton saisonnier Ahmed te prévient : il a trouvé un CDI à Toulouse. Il part dans deux semaines. En pleine saison.",
        choices: [
          { label: "Le féliciter et chercher un remplaçant", consequence: "Tu passes 3 jours au téléphone. Personne ne veut bosser aux champs pour le SMIC. Tu finis la saison seul, épuisé.", impact: { resources: -10, moral: -15, links: 0, comfort: -20 }, worldHint: "Le travail agricole n'attire plus. Les conditions sont trop dures.", choiceType: 'neutre' },
          { label: "Lui demander de rester jusqu'à fin septembre", consequence: "'Je comprends, mais...' Il refuse. Tu es en colère, puis tu lâches. Il a raison de partir.", impact: { resources: -5, moral: -20, links: -10, comfort: -10 }, worldHint: "Tu ne peux pas en vouloir à quelqu'un de chercher mieux.", choiceType: 'neutre' }
        ]
      },
      {
        world: 'B', domain: 'travail',
        context: "Lundi, 14h. Réunion à la Chambre d'Agriculture. On présente un nouveau dispositif : 'Groupement d'Employeurs Agricoles' — mutualiser les saisonniers entre fermes.",
        choices: [
          { label: "Rejoindre le groupement", consequence: "Tu partages Ahmed avec deux autres fermes. Il a un temps plein à l'année. Toi, tu as quelqu'un de formé quand tu en as besoin.", impact: { resources: 5, moral: 15, links: 20, comfort: 10 }, worldHint: "Le groupement est soutenu par la mairie et la Région.", choiceType: 'solidaire' },
          { label: "Garder ton fonctionnement actuel", consequence: "Tu préfères rester indépendant. Ahmed part quand même. L'année prochaine, tu verras.", impact: { resources: 0, moral: -5, links: -5, comfort: 0 }, worldHint: "L'indépendance a un prix : la solitude.", choiceType: 'individuel' }
        ]
      }
    ]
  },

  // ============ LÉO - Lycéen ============
  leo: {
    id: 'leo',
    name: 'Léo',
    age: 17,
    role: 'Lycéen en Terminale',
    description: "En Terminale au lycée Bourdelle. Parents divorcés : ta mère à Montauban, ton père à Toulouse. Tu t'intéresses à la politique, tu hésites sur ton orientation. Le monde des adultes te fatigue.",
    initialStats: { resources: 35, moral: 55, links: 50, comfort: 55 },
    scenes: [
      {
        world: 'A', domain: 'education',
        context: "Lundi, 10h. Cours d'EMC (Éducation Morale et Civique). Le sujet du jour : le changement climatique. Le prof commence, puis s'arrête. 'On va faire un QCM plutôt. C'est plus neutre.'",
        choices: [
          { label: "Demander pourquoi", consequence: "'C'est un sujet polémique.' Un élève ricane. Le prof distribue le QCM. Tu le remplis en silence, frustré.", impact: { resources: 0, moral: -15, links: -5, comfort: 0 }, worldHint: "Certains sujets sont devenus 'sensibles'. On les évite.", choiceType: 'neutre' },
          { label: "Proposer un débat quand même", consequence: "'Non, pas le temps.' Quelques élèves te soutiennent. Le prof note ton nom. 'On en reparlera.' Tu ne sais pas si c'est une menace.", impact: { resources: 0, moral: -10, links: 10, comfort: -5 }, worldHint: "Prendre la parole, c'est se faire remarquer. En bien ou en mal.", choiceType: 'solidaire' }
        ]
      },
      {
        world: 'B', domain: 'education',
        context: "Mardi, 10h. Cours d'EMC. Le sujet : le changement climatique. Le prof organise un 'atelier délibératif' : petits groupes, arguments pour/contre, puis synthèse collective.",
        choices: [
          { label: "T'investir dans le débat", consequence: "Ton groupe propose une motion sur la cantine bas-carbone. Elle est votée par la classe. Le prof la transmettra au conseil de vie lycéenne.", impact: { resources: -5, moral: 20, links: 15, comfort: 0 }, worldHint: "Le lycée expérimente la 'démocratie délibérative' avec la mairie.", choiceType: 'solidaire', setsFlag: 'motionLycee' },
          { label: "Participer mollement", consequence: "Tu laisses les autres parler. La motion passe quand même. Tu n'y as pas contribué, mais tu l'as votée.", impact: { resources: 0, moral: 5, links: 5, comfort: 5 }, worldHint: "Tout le monde n'a pas besoin d'être leader. Mais ta voix compte.", choiceType: 'neutre' }
        ]
      },
      {
        world: 'A', domain: 'transports',
        context: "Mercredi, 14h. Tu veux aller voir ton père à Toulouse. Le TER coûte 18€ aller-retour. Ta mère te donne 10€. Il manque 8€.",
        choices: [
          { label: "Demander les 8€ à ton père", consequence: "Il te les envoie par virement. 'Pas de souci.' Mais tu sens que ça l'agace. Le trajet est silencieux.", impact: { resources: 5, moral: -10, links: -5, comfort: 0 }, worldHint: "L'argent circule mal entre tes deux parents.", choiceType: 'neutre' },
          { label: "Ne pas y aller ce week-end", consequence: "Tu restes à Montauban. Tu traînes. Ton père t'appelle, déçu. 'C'est pas grave.' Mais si, c'est grave.", impact: { resources: 0, moral: -20, links: -15, comfort: 5 }, worldHint: "Le coût du transport sépare les familles.", choiceType: 'neutre' }
        ]
      },
      {
        world: 'B', domain: 'transports',
        context: "Jeudi, 8h. Tu découvres le 'Pass Jeunes Occitanie' : TER à 1€ pour les moins de 26 ans le week-end. Il faut s'inscrire en ligne.",
        choices: [
          { label: "T'inscrire tout de suite", consequence: "10 minutes sur ton téléphone. Tu reçois ton pass par mail. Ce week-end, tu iras à Toulouse pour 2€ aller-retour.", impact: { resources: 10, moral: 15, links: 10, comfort: 0 }, worldHint: "Le pass est cofinancé par la Région et les villes partenaires.", choiceType: 'solidaire' },
          { label: "Remettre à plus tard", consequence: "Tu oublies. Le week-end arrive. Tu paies plein pot. Tu t'en veux.", impact: { resources: -10, moral: -5, links: 0, comfort: 0 }, worldHint: "Les bons plans existent, mais il faut les saisir.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'citoyennete',
        context: "Vendredi, 16h. Tu as 17 ans, tu seras majeur en mars. L'inscription sur les listes électorales, tu ne sais pas comment ça marche.",
        choices: [
          { label: "Chercher sur internet", consequence: "Tu trouves le formulaire. Il faut une pièce d'identité, un justificatif de domicile. Celui de ta mère ? De ton père ? Tu refermes l'onglet.", impact: { resources: 0, moral: -10, links: 0, comfort: 0 }, worldHint: "La procédure n'est pas compliquée. Mais personne ne te l'a expliquée.", choiceType: 'neutre' },
          { label: "Laisser tomber pour l'instant", consequence: "Tu verras plus tard. Mars arrive. Tu n'es pas inscrit. Tu ne votes pas aux municipales.", impact: { resources: 0, moral: -15, links: -5, comfort: 0 }, worldHint: "1 jeune sur 3 n'est pas inscrit à 18 ans.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'B', domain: 'citoyennete',
        context: "Samedi, 10h. Tu reçois un courrier de la mairie : 'Tu auras 18 ans cette année. Viens à la Journée Citoyenne le 15 mars — inscription électorale, visite de l'Hôtel de Ville, rencontre avec des élus.'",
        choices: [
          { label: "Y aller", consequence: "Une trentaine de jeunes. On vous explique comment voter, qui décide quoi. Un élu répond à vos questions. Tu repars inscrit et un peu moins perdu.", impact: { resources: -5, moral: 20, links: 15, comfort: 0 }, worldHint: "La mairie invite tous les 'nouveaux majeurs' de l'année.", choiceType: 'solidaire' },
          { label: "Ignorer le courrier", consequence: "Tu jettes le papier. Ton pote Enzo y va. Il te raconte. Tu regrettes un peu.", impact: { resources: 0, moral: -5, links: -5, comfort: 0 }, worldHint: "Les occasions de comprendre le système sont rares.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'loisirs',
        context: "Dimanche, 15h. Tu veux organiser une projection de documentaire au lycée avec ton asso. Il faut l'accord du proviseur. Tu déposes une demande.",
        choices: [
          { label: "Attendre la réponse", consequence: "Deux semaines. Puis trois. Puis 'refusée pour raisons logistiques'. Pas d'explication. Tu laisses tomber.", impact: { resources: 0, moral: -20, links: -10, comfort: 0 }, worldHint: "Les initiatives lycéennes passent par des filtres opaques.", choiceType: 'neutre' },
          { label: "Relancer par mail", consequence: "Le proviseur te reçoit. 'C'est compliqué.' Tu argumentes. Il finit par dire oui, pour une date dans deux mois. Victoire amère.", impact: { resources: -5, moral: 5, links: 5, comfort: -5 }, worldHint: "Insister paie parfois. Mais c'est épuisant.", choiceType: 'solidaire' }
        ]
      },
      {
        world: 'B', domain: 'loisirs',
        context: "Lundi, 12h. Tu veux organiser une projection de documentaire. Le lycée a un 'Budget Participatif Jeunes' — tu peux proposer un projet et le faire voter par les élèves.",
        choices: [
          { label: "Déposer ton projet", consequence: "Tu remplis le formulaire. 50 élèves votent pour. Le proviseur valide. La projection a lieu dans un mois, avec 80 personnes.", impact: { resources: -5, moral: 25, links: 20, comfort: 0 }, worldHint: "Le budget participatif existe depuis 2027 à Montauban.", choiceType: 'solidaire' },
          { label: "Ne pas t'embêter avec la procédure", consequence: "Tu organises la projection chez toi, avec 5 potes. C'est bien aussi. Mais c'est pas pareil.", impact: { resources: 0, moral: 5, links: 5, comfort: 5 }, worldHint: "Le collectif demande un effort. L'intime est plus simple.", choiceType: 'individuel' }
        ]
      }
    ]
  },

  // ============ NADIA - Mère isolée en insertion ============
  nadia: {
    id: 'nadia',
    name: 'Nadia',
    age: 42,
    role: 'Mère isolée, en formation',
    description: "Deux enfants : Sofiane (14 ans) et Inaya (9 ans). Tu es en formation pour devenir aide à domicile. Tu vis en HLM à Beausoleil. Entre la CAF, Pôle Emploi et les devoirs, chaque journée est un Tetris.",
    initialStats: { resources: 30, moral: 45, links: 40, comfort: 35 },
    scenes: [
      {
        world: 'A', domain: 'alimentation',
        context: "Lundi, 8h. Inscription à la cantine pour Inaya. Le tarif est passé de 3,20€ à 4,50€/repas. 'Hausse des coûts', dit le mail de la mairie.",
        choices: [
          { label: "Payer le nouveau tarif", consequence: "90€/mois au lieu de 64€. Tu coupes ailleurs : le forfait téléphone de Sofiane. Il râle. Tu culpabilises.", impact: { resources: -20, moral: -10, links: -5, comfort: 0 }, worldHint: "Le tarif unique ne tient pas compte des revenus.", choiceType: 'neutre' },
          { label: "Faire manger Inaya à la maison le midi", consequence: "Tu dois rentrer entre midi et 14h. Ta formation est à 30 minutes. Tu manges debout. Inaya mange seule.", impact: { resources: 5, moral: -20, links: -10, comfort: -15 }, worldHint: "Économiser coûte du temps et de l'énergie.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'B', domain: 'alimentation',
        context: "Mardi, 8h. Inscription à la cantine. Le nouveau système indexe le tarif sur les revenus ET le patrimoine. Pour toi : 1,80€/repas.",
        choices: [
          { label: "Inscrire Inaya tous les jours", consequence: "36€/mois. Elle mange équilibré, avec ses copines. Tu respires un peu.", impact: { resources: 15, moral: 15, links: 10, comfort: 5 }, worldHint: "L'indexation sur le patrimoine a été votée par référendum local.", choiceType: 'solidaire' },
          { label: "Garder l'habitude de la faire manger à la maison", consequence: "Tu n'oses pas profiter du tarif bas. Tu te dis que d'autres en ont plus besoin. Inaya mange seule.", impact: { resources: 5, moral: -5, links: -5, comfort: -5 }, worldHint: "La fierté empêche parfois d'accepter ce qu'on mérite.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'logement',
        context: "Mercredi, 10h. Ton T3 est trop petit. Sofiane dort dans le salon. Tu voudrais un T4. La liste d'attente HLM : 18 mois, peut-être plus.",
        choices: [
          { label: "Déposer quand même une demande", consequence: "Tu remplis le dossier. 14 pièces justificatives. Trois allers-retours à l'office. 'On vous rappellera.'", impact: { resources: -10, moral: -10, links: 0, comfort: -5 }, worldHint: "La file d'attente est opaque. Tu ne sais pas où tu en es.", choiceType: 'neutre' },
          { label: "Attendre que Sofiane parte", consequence: "Il a 14 ans. Ça fait 4 ans à tenir. Tu serres les dents.", impact: { resources: 0, moral: -15, links: -5, comfort: -10 }, worldHint: "S'adapter à l'injustice, c'est encore l'accepter.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'B', domain: 'logement',
        context: "Jeudi, 10h. Tu reçois un courrier de la Commission Logement. 'Votre situation a été examinée. Un T4 se libère à Beausoleil. Voulez-vous visiter ?'",
        choices: [
          { label: "Visiter et accepter", consequence: "Le T4 est correct. Sofiane aura sa chambre. Le loyer augmente de 50€ mais l'APL suit. Tu signes.", impact: { resources: -5, moral: 25, links: 10, comfort: 20 }, worldHint: "La commission est composée d'élus, de bailleurs ET d'habitants.", choiceType: 'solidaire', setsFlag: 'nouveauLogement' },
          { label: "Refuser, tu as peur du changement", consequence: "Tu déclines. Le T4 va à quelqu'un d'autre. Sofiane ne dit rien. Mais tu vois son regard.", impact: { resources: 0, moral: -20, links: -10, comfort: 0 }, worldHint: "La peur du changement maintient dans l'inconfort.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'travail',
        context: "Vendredi, 14h. Problème de garde. Ta formation finit à 17h30, l'école à 16h30. Inaya doit attendre une heure. L'étude coûte 5€/jour.",
        choices: [
          { label: "Payer l'étude", consequence: "100€/mois. C'est beaucoup. Mais au moins elle est en sécurité.", impact: { resources: -15, moral: 0, links: 0, comfort: 5 }, worldHint: "La garde d'enfant est un coût caché de l'emploi.", choiceType: 'neutre' },
          { label: "Demander à une voisine de la récupérer", consequence: "Mme Fernandez accepte. Mais elle est fatiguée. Tu la sens débordée. Combien de temps ça tiendra ?", impact: { resources: 0, moral: -10, links: -5, comfort: 0 }, worldHint: "L'entraide de voisinage a ses limites.", choiceType: 'solidaire' }
        ]
      },
      {
        world: 'B', domain: 'travail',
        context: "Samedi, 9h. Tu découvres le dispositif 'Crèche à Horaires Décalés' — garde jusqu'à 19h pour les parents en formation ou travail atypique.",
        choices: [
          { label: "Inscrire Inaya", consequence: "Elle va à la garderie jusqu'à 18h, avec goûter inclus. 2€/jour. Tu souffles.", impact: { resources: 10, moral: 15, links: 10, comfort: 10 }, worldHint: "Le dispositif est cofinancé par la CAF et la mairie.", choiceType: 'solidaire' },
          { label: "Continuer avec Mme Fernandez", consequence: "Tu ne veux pas profiter de tout. La voisine continue. Un jour, elle te dit qu'elle ne peut plus.", impact: { resources: 0, moral: -10, links: -10, comfort: -5 }, worldHint: "Refuser l'aide institutionnelle épuise l'aide informelle.", choiceType: 'individuel' }
        ]
      },
      {
        world: 'A', domain: 'loisirs',
        context: "Dimanche, 11h. Sofiane veut s'inscrire au foot. Le club coûte 280€/an + les équipements. Tu n'as pas cette somme.",
        choices: [
          { label: "Lui dire non", consequence: "'On n'a pas les moyens.' Il encaisse. Il reste dans sa chambre. Tu pleures dans la cuisine.", impact: { resources: 0, moral: -25, links: -15, comfort: 0 }, worldHint: "La pauvreté prive les enfants avant les adultes.", choiceType: 'neutre' },
          { label: "Chercher des aides", consequence: "Tu passes 3 heures sur internet. Il existe un 'Pass Sport' de 50€, mais le reste est à ta charge. Tu empruntes à ta sœur.", impact: { resources: -15, moral: -5, links: 5, comfort: 0 }, worldHint: "Les aides existent mais sont éparpillées et conditionnelles.", choiceType: 'solidaire' }
        ]
      },
      {
        world: 'B', domain: 'loisirs',
        context: "Lundi, 18h. Sofiane veut s'inscrire au foot. Tu vas au club. L'entraîneur te parle du 'Crédit Loisirs Municipal' : 25€/mois pour les activités des enfants.",
        choices: [
          { label: "Utiliser le Crédit Loisirs", consequence: "Le foot coûte 30€/mois avec le crédit. Sofiane commence mardi. Il revient épuisé et heureux.", impact: { resources: 5, moral: 25, links: 15, comfort: 5 }, worldHint: "Le crédit est versé directement aux clubs, pas aux familles.", choiceType: 'solidaire' },
          { label: "Payer plein tarif par fierté", consequence: "Tu vides ton livret A. Sofiane joue au foot. Mais tu n'as plus de marge pour les imprévus.", impact: { resources: -20, moral: 5, links: 5, comfort: 0 }, worldHint: "La fierté coûte cher quand on n'a pas les moyens.", choiceType: 'individuel' }
        ]
      }
    ]
  }
};

// ==================== DESCRIPTIONS DES JAUGES ====================

const STAT_INFO = {
  resources: {
    name: "Ressources",
    icon: Wallet,
    color: "amber",
    description: "Ton argent, ton temps disponible, ta marge de manœuvre matérielle. Quand ça tombe à zéro, tu ne peux plus tenir."
  },
  moral: {
    name: "Moral",
    icon: Brain,
    color: "purple",
    description: "Ton énergie psychique, ta dignité, ta capacité à encaisser. Quand ça tombe à zéro, tu craques."
  },
  links: {
    name: "Liens",
    icon: Users,
    color: "blue",
    description: "Ton réseau social, les gens sur qui tu peux compter, ton sentiment d'appartenance. Quand ça tombe à zéro, tu es seul."
  },
  comfort: {
    name: "Confort",
    icon: Thermometer,
    color: "emerald",
    description: "Ton environnement physique : logement, chaleur, corps. Quand ça tombe à zéro, ton corps lâche."
  }
};

// ==================== COMPOSANT PRINCIPAL ====================

const MontaubanMultivers = () => {
  const [gameState, setGameState] = useState('intro');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [stats, setStats] = useState({ resources: 50, moral: 50, links: 30, comfort: 40 });
  const [history, setHistory] = useState([]);
  const [flags, setFlags] = useState({});
  const [showConsequence, setShowConsequence] = useState(false);
  const [currentChoice, setCurrentChoice] = useState(null);
  const [tooltipStat, setTooltipStat] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [sessionGoal, setSessionGoal] = useState(null);

  // Initialisation joueur
  useEffect(() => {
    const initPlayer = async () => {
      let id = localStorage.getItem('montauban_player_id');
      if (!id) {
        try {
          const { data } = await supabase.from('players').insert({}).select('id').single();
          if (data) {
            id = data.id;
            localStorage.setItem('montauban_player_id', id);
          }
        } catch (e) {
          id = 'local_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('montauban_player_id', id);
        }
      }
      setPlayerId(id);
    };
    initPlayer();
  }, []);

  const loadGlobalStats = async () => {
    try {
      const { data: choices } = await supabase
        .from('choices')
        .select('choice_type')
        .order('created_at', { ascending: false })
        .limit(500);

      if (choices && choices.length > 0) {
        const solidaireChoices = choices.filter(c => c.choice_type === 'solidaire').length;
        const solidairePercent = Math.round((solidaireChoices / choices.length) * 100);
        
        setGlobalStats({ totalChoices: choices.length, solidairePercent });
        setSessionGoal({
          type: 'solidaire',
          target: Math.max(solidairePercent + 5, 50),
          current: solidairePercent,
          text: `Cette semaine, ${solidairePercent}% des choix ont été solidaires. Peux-tu faire mieux ?`
        });
      } else {
        setSessionGoal({
          type: 'pioneer',
          text: "Tu es parmi les premiers à jouer. Tes choix définiront la norme."
        });
      }
    } catch (e) {
      setSessionGoal({ type: 'offline', text: "Fais tes choix. Chaque décision compte." });
    }
  };

  const saveChoice = async (sceneData, choiceData) => {
    if (!playerId) return;
    try {
      await supabase.from('choices').insert({
        player_id: playerId,
        character_id: selectedCharacter.id,
        scene_index: sceneIndex,
        world: sceneData.world,
        domain: sceneData.domain,
        choice_label: choiceData.label,
        choice_type: choiceData.choiceType,
        impact: choiceData.impact
      });
    } catch (e) { /* continue offline */ }
  };

  const ambiance = useMemo(() => {
    const avgStat = (stats.resources + stats.moral + stats.links + stats.comfort) / 4;
    if (avgStat < 25) return { bg: 'from-slate-900 via-red-950 to-slate-900', cardBg: 'bg-slate-800/90', border: 'border-red-900/50' };
    if (avgStat < 40) return { bg: 'from-slate-800 via-slate-900 to-slate-800', cardBg: 'bg-slate-700/90', border: 'border-slate-600/50' };
    if (avgStat < 60) return { bg: 'from-slate-700 via-slate-800 to-slate-700', cardBg: 'bg-slate-600/80', border: 'border-slate-500/50' };
    return { bg: 'from-slate-600 via-slate-700 to-slate-600', cardBg: 'bg-slate-500/70', border: 'border-slate-400/50' };
  }, [stats]);

  const selectCharacter = async (charId) => {
    const char = CHARACTERS[charId];
    setSelectedCharacter(char);
    setStats(char.initialStats);
    setFlags({});
    setHistory([]);
    setSceneIndex(0);
    await loadGlobalStats();
    setGameState('goal');
  };

  const handleChoice = (choice) => {
    setCurrentChoice(choice);
    setShowConsequence(true);
  };

  const continueAfterConsequence = async () => {
    const scene = selectedCharacter.scenes[sceneIndex];
    await saveChoice(scene, currentChoice);
    
    const newStats = {
      resources: Math.min(100, Math.max(0, stats.resources + currentChoice.impact.resources)),
      moral: Math.min(100, Math.max(0, stats.moral + currentChoice.impact.moral)),
      links: Math.min(100, Math.max(0, stats.links + currentChoice.impact.links)),
      comfort: Math.min(100, Math.max(0, stats.comfort + currentChoice.impact.comfort))
    };
    setStats(newStats);

    if (currentChoice.setsFlag) setFlags({ ...flags, [currentChoice.setsFlag]: true });

    setHistory([...history, {
      sceneIndex, world: scene.world, domain: scene.domain,
      choice: currentChoice.label, consequence: currentChoice.consequence,
      worldHint: currentChoice.worldHint, choiceType: currentChoice.choiceType
    }]);

    setShowConsequence(false);
    setCurrentChoice(null);

    if (Object.values(newStats).some(v => v <= 0)) {
      setGameState('gameover');
    } else if (sceneIndex < selectedCharacter.scenes.length - 1) {
      setSceneIndex(sceneIndex + 1);
    } else {
      setGameState('revelation');
    }
  };

  const resetGame = () => {
    setGameState('intro');
    setSelectedCharacter(null);
    setSceneIndex(0);
    setStats({ resources: 50, moral: 50, links: 30, comfort: 40 });
    setHistory([]);
    setFlags({});
    setShowConsequence(false);
    setCurrentChoice(null);
    setGlobalStats(null);
    setSessionGoal(null);
  };

  // Composant jauge
  const StatBar = ({ statKey, value, compact = false }) => {
    const info = STAT_INFO[statKey];
    const Icon = info.icon;
    const isLow = value < 25;
    const colors = { amber: 'text-amber-500 bg-amber-500', purple: 'text-purple-500 bg-purple-500', blue: 'text-blue-500 bg-blue-500', emerald: 'text-emerald-500 bg-emerald-500' };
    const [textColor, bgColor] = colors[info.color].split(' ');

    if (compact) {
      return (
        <div className="relative text-center cursor-help" onClick={(e) => { e.stopPropagation(); setTooltipStat(tooltipStat === statKey ? null : statKey); }}>
          <div className={`p-2 rounded-full ${isLow ? 'bg-red-500/20' : `${bgColor}/20`}`}>
            <Icon size={20} className={`mx-auto ${isLow ? 'text-red-500 animate-pulse' : textColor}`} />
          </div>
          <p className={`text-xs font-bold mt-1 ${isLow ? 'text-red-400' : 'text-white/80'}`}>{value}%</p>
          {tooltipStat === statKey && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-3 bg-slate-900 rounded-lg shadow-xl z-50 text-left">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-white text-sm">{info.name}</span>
                <X size={14} className="text-slate-500" onClick={() => setTooltipStat(null)} />
              </div>
              <p className="text-xs text-slate-400">{info.description}</p>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <Icon size={18} className={isLow ? 'text-red-500' : textColor} />
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300">{info.name}</span>
            <span className={isLow ? 'text-red-400' : 'text-slate-400'}>{value}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-700 rounded-full ${isLow ? 'bg-red-500' : bgColor}`} style={{ width: `${value}%` }} />
          </div>
        </div>
      </div>
    );
  };

  // INTRO
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tight">MONTAUBAN</h1>
            <p className="text-2xl font-light text-amber-400 italic">Multivers</p>
          </div>
          <div className="bg-white/10 backdrop-blur p-6 rounded-2xl text-white/80 text-sm space-y-4">
            <p>Une semaine dans la vie d'un habitant de Montauban.</p>
            <p>Des choix quotidiens. Des conséquences réelles.</p>
            <p className="text-amber-400 font-medium">Quelque chose ne tourne pas rond. Tu le sentiras.</p>
          </div>
          <button onClick={() => setGameState('character')} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-4 px-8 rounded-xl">COMMENCER</button>
          <p className="text-slate-500 text-xs">~10 minutes</p>
        </div>
      </div>
    );
  }

  // SÉLECTION PERSONNAGE
  if (gameState === 'character') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
        <div className="max-w-lg mx-auto space-y-4 pt-8">
          <div className="text-center pb-4">
            <p className="text-slate-500 text-sm uppercase tracking-widest mb-2">Choisis ton personnage</p>
            <h2 className="text-2xl font-bold text-white">Qui veux-tu incarner ?</h2>
          </div>
          <div className="grid gap-3">
            {Object.values(CHARACTERS).map((char) => (
              <button key={char.id} onClick={() => selectCharacter(char.id)} className="w-full text-left p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 hover:border-white/30 transition-all group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-400">{char.name}</h3>
                    <p className="text-slate-400 text-sm">{char.age} ans • {char.role}</p>
                  </div>
                  <ChevronRight className="text-slate-500 group-hover:text-amber-400" />
                </div>
                <p className="text-slate-300 text-sm mt-2 line-clamp-2">{char.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // OBJECTIF
  if (gameState === 'goal' && sessionGoal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <Target size={40} className="mx-auto text-amber-400" />
            <p className="text-slate-500 text-sm uppercase tracking-widest">Objectif</p>
          </div>
          <div className="bg-white/10 backdrop-blur p-6 rounded-2xl text-center">
            <h2 className="text-xl font-bold text-white mb-2">{selectedCharacter.name}</h2>
            <p className="text-slate-400 text-sm mb-4">{selectedCharacter.age} ans • {selectedCharacter.role}</p>
            <div className="bg-slate-800/50 p-4 rounded-xl mt-4">
              <p className="text-white/80 text-sm">{sessionGoal.text}</p>
              {sessionGoal.current !== undefined && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Heart size={16} className="text-rose-400" />
                  <span className="text-rose-400 font-bold">{sessionGoal.current}%</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-amber-400 font-bold">{sessionGoal.target}%</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setGameState('play')} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2">
            Commencer <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // JEU
  if (gameState === 'play' && selectedCharacter) {
    const scene = selectedCharacter.scenes[sceneIndex];
    return (
      <div className={`min-h-screen bg-gradient-to-b ${ambiance.bg} transition-all duration-1000 flex flex-col`}>
        <div className={`${ambiance.cardBg} backdrop-blur border-b ${ambiance.border} p-4`}>
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white/60 text-xs uppercase">{selectedCharacter.name} • Jour {Math.floor(sceneIndex / 2) + 1}</span>
              <span className="text-white/30 text-xs">{sceneIndex + 1}/{selectedCharacter.scenes.length}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <StatBar statKey="resources" value={stats.resources} compact />
              <StatBar statKey="moral" value={stats.moral} compact />
              <StatBar statKey="links" value={stats.links} compact />
              <StatBar statKey="comfort" value={stats.comfort} compact />
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 flex items-center justify-center" onClick={() => setTooltipStat(null)}>
          <div className="max-w-md w-full space-y-6">
            <div className={`${ambiance.cardBg} backdrop-blur p-6 rounded-2xl border ${ambiance.border}`}>
              <p className="text-white leading-relaxed text-lg">{scene.context}</p>
            </div>

            {!showConsequence ? (
              <div className="space-y-3">
                {scene.choices.map((choice, i) => {
                  const isLocked = choice.requiresFlag && !flags[choice.requiresFlag];
                  if (isLocked) {
                    return (
                      <div key={i} className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50 opacity-60">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Lock size={16} />
                          <span className="text-sm italic">{choice.lockedText || "Option verrouillée"}</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <button key={i} onClick={() => handleChoice(choice)} className={`w-full text-left p-5 ${ambiance.cardBg} backdrop-blur rounded-2xl border ${ambiance.border} hover:bg-white/20 hover:border-white/30 transition-all group`}>
                      <p className="font-semibold text-white group-hover:text-amber-300">{choice.label}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-900/30 backdrop-blur border border-amber-700/50 p-5 rounded-2xl">
                  <p className="text-white leading-relaxed">{currentChoice.consequence}</p>
                  <p className="text-amber-400/80 text-sm mt-3 italic">{currentChoice.worldHint}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 text-sm">
                  {Object.entries(currentChoice.impact).map(([key, value]) => {
                    if (value === 0) return null;
                    const Icon = STAT_INFO[key].icon;
                    return (
                      <div key={key} className={`flex items-center gap-1 px-3 py-1 rounded-full ${value > 0 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                        <Icon size={14} />
                        <span className="font-bold">{value > 0 ? '+' : ''}{value}</span>
                      </div>
                    );
                  })}
                </div>
                <button onClick={continueAfterConsequence} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2">
                  Continuer <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // GAME OVER
  if (gameState === 'gameover') {
    const reasons = {
      resources: { title: "Faillite", text: "Tu n'as plus les moyens. Tu quittes Montauban." },
      moral: { title: "Épuisement", text: "Tu craques. L'épuisement t'envahit." },
      links: { title: "Isolement", text: "Plus personne ne répond. Tu es seul." },
      comfort: { title: "Effondrement", text: "Ton corps a lâché." }
    };
    const failedStat = Object.entries(stats).find(([k, v]) => v <= 0)?.[0] || 'moral';
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 to-slate-900 flex items-center justify-center p-4 text-center">
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-black text-red-500">{reasons[failedStat].title}</h1>
          <p className="text-white/80 text-lg">{reasons[failedStat].text}</p>
          <button onClick={resetGame} className="bg-white text-slate-900 font-bold py-3 px-8 rounded-xl flex items-center gap-2 mx-auto">
            <RotateCcw size={18} /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  // RÉVÉLATION
  if (gameState === 'revelation') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <Eye size={48} className="mx-auto text-amber-400 animate-pulse" />
          <h2 className="text-2xl font-black text-white">Tu as vécu une semaine à Montauban.</h2>
          <p className="text-white/70 text-lg">Mais pas toujours dans le même Montauban.</p>
          <div className="bg-white/10 backdrop-blur p-6 rounded-2xl text-white/80 text-sm space-y-3">
            <p>Certains jours, tu étais dans un Montauban gouverné par l'extrême-droite.</p>
            <p>D'autres jours, dans un Montauban gouverné par une coalition de gauche écologiste.</p>
            <p className="text-amber-400 font-medium pt-2">Les règles n'étaient pas les mêmes. Tu l'as senti, non ?</p>
          </div>
          <button onClick={() => setGameState('summary')} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-4 px-8 rounded-xl">Voir le détail</button>
        </div>
      </div>
    );
  }

  // RÉCAPITULATIF
  if (gameState === 'summary' && selectedCharacter) {
    const worldAScenes = history.filter(h => h.world === 'A');
    const worldBScenes = history.filter(h => h.world === 'B');
    const playerSolidaire = history.filter(h => h.choiceType === 'solidaire').length;
    const playerIndividuel = history.filter(h => h.choiceType === 'individuel').length;
    const playerSolidairePercent = history.length > 0 ? Math.round((playerSolidaire / history.length) * 100) : 0;

    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto space-y-6 py-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-white">La semaine de {selectedCharacter.name}</h1>
            <p className="text-slate-400">Chaque scène appartenait à un monde différent</p>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl">
            <h3 className="font-bold text-white mb-4">État final</h3>
            <div className="space-y-3">
              <StatBar statKey="resources" value={stats.resources} />
              <StatBar statKey="moral" value={stats.moral} />
              <StatBar statKey="links" value={stats.links} />
              <StatBar statKey="comfort" value={stats.comfort} />
            </div>
          </div>

          <div className="bg-gradient-to-r from-rose-900/30 to-blue-900/30 border border-slate-700 p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-slate-400" />
              <h3 className="font-bold text-white">Tes choix</h3>
            </div>
            <div className="flex justify-around text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Heart size={16} className="text-rose-400" />
                  <span className="text-2xl font-black text-rose-400">{playerSolidaire}</span>
                </div>
                <p className="text-xs text-slate-400">Solidaires</p>
              </div>
              <div className="w-px bg-slate-700" />
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <User size={16} className="text-blue-400" />
                  <span className="text-2xl font-black text-blue-400">{playerIndividuel}</span>
                </div>
                <p className="text-xs text-slate-400">Individuels</p>
              </div>
            </div>
            {globalStats && (
              <p className="text-xs text-slate-500 text-center mt-4 pt-4 border-t border-slate-700">
                En moyenne, les autres joueurs font <span className="text-amber-400 font-bold">{globalStats.solidairePercent}%</span> de choix solidaires.
                {playerSolidairePercent > globalStats.solidairePercent && <span className="text-emerald-400"> Tu fais mieux !</span>}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-red-950/50 border border-red-900/50 p-5 rounded-2xl">
              <h3 className="font-black text-red-400 mb-1">Montauban-RN</h3>
              <p className="text-red-400/60 text-xs mb-4">Extrême-droite au pouvoir</p>
              <div className="space-y-4">
                {worldAScenes.map((h, i) => (
                  <div key={i} className="border-l-2 border-red-800 pl-3">
                    <div className="flex items-start gap-2">
                      {h.choiceType === 'solidaire' && <Heart size={12} className="text-rose-400 mt-1" />}
                      {h.choiceType === 'individuel' && <User size={12} className="text-blue-400 mt-1" />}
                      <p className="font-medium text-red-200 text-sm">{h.choice}</p>
                    </div>
                    <p className="text-red-400/60 text-xs italic mt-1 ml-4">{h.worldHint}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-emerald-950/50 border border-emerald-900/50 p-5 rounded-2xl">
              <h3 className="font-black text-emerald-400 mb-1">Montauban-MGEC</h3>
              <p className="text-emerald-400/60 text-xs mb-4">Gauche écolo & citoyenne</p>
              <div className="space-y-4">
                {worldBScenes.map((h, i) => (
                  <div key={i} className="border-l-2 border-emerald-800 pl-3">
                    <div className="flex items-start gap-2">
                      {h.choiceType === 'solidaire' && <Heart size={12} className="text-rose-400 mt-1" />}
                      {h.choiceType === 'individuel' && <User size={12} className="text-blue-400 mt-1" />}
                      <p className="font-medium text-emerald-200 text-sm">{h.choice}</p>
                    </div>
                    <p className="text-emerald-400/60 text-xs italic mt-1 ml-4">{h.worldHint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-900/30 to-amber-800/30 border border-amber-700/30 p-6 rounded-2xl text-center">
            <p className="text-white/80">Les mêmes journées. Les mêmes besoins.<br /><span className="text-amber-400 font-medium">Des règles différentes changent tout.</span></p>
          </div>

          <div className="flex gap-3">
            <button onClick={resetGame} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2">
              <RotateCcw size={18} /> Rejouer
            </button>
            <button className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2">
              <Share2 size={18} /> Partager
            </button>
          </div>

          <p className="text-center text-slate-500 text-xs pt-4">
            <a href="https://mgec-montauban.fr" className="hover:text-amber-400 underline">Découvrir le programme complet de MGEC →</a>
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default MontaubanMultivers;