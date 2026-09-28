// Every text of the admin panel in one place. The admin panel is Serbian only.

export const adminText = {
  siteName: "Ćanti Apartmani",
  title: "Administracija",
  nav: {
    label: "Administracija",
    brandLabel: "Admin",
    calendar: "Kalendar",
    settings: "Podešavanja",
    logout: "Odjava",
    loggingOut: "Odjavljivanje…",
  },
  login: {
    title: "Prijava",
    subtitle: "Administracija apartmana",
    email: "Mejl",
    password: "Lozinka",
    submit: "Prijavi se",
    submitting: "Prijavljivanje…",
    wrongCredentials: "Pogrešan mejl ili lozinka.",
    genericError: "Došlo je do greške, pokušajte ponovo.",
    forbidden: "Ovaj nalog nema pristup administraciji.",
  },
  api: {
    notLoggedIn: "Niste prijavljeni.",
    forbidden: "Nemate pristup.",
    apartmentNotFound: "Apartman ne postoji.",
    saveFailed: "Čuvanje nije uspelo, pokušajte ponovo.",
  },
  comingSoon: {
    calendar: "Ovde će biti kalendar cena po danima.",
    settings: "Ovde će biti osnovne cene apartmana.",
  },
} as const;
