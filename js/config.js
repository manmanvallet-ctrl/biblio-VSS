// Réglages de Biblio VSS. Modifiez ce fichier puis republiez l'application.
window.BIBLIO_CONFIG = {
  // Où arrivent les propositions de ressources (formulaire « Proposer »).
  // Renseignez UNE des deux options :
  //
  // 1. Un service de formulaires qui accepte du JSON (Formspree, Getform, Basin…).
  //    Exemple : "https://formspree.io/f/abcdwxyz"
  suggestionEndpoint: "https://formspree.io/f/meagpwwy",
  //
  // 2. Une adresse e-mail : le formulaire ouvre alors l'application mail du téléphone,
  //    avec le message déjà rempli. Exemple : "contact@exemple.fr"
  suggestionEmail: "",

  // Page neutre ouverte par la « Sortie rapide » dans le navigateur.
  exitUrl: "https://www.google.com/search?q=m%C3%A9t%C3%A9o",
};
