import type { LinkCardData } from '../types/chat';

export interface ResponseTemplate {
  text?: string;
  html?: string;
  links?: LinkCardData[];
  quickReplies?: string[];
}

export const responses: Record<string, ResponseTemplate> = {
  'termin vereinbaren': {
    text: 'Gerne unterstützen wir Sie bei der Terminvereinbarung in der Hausarztpraxis Orchideenkamp.',
    links: [
      { icon: '📞', title: 'Telefonische Terminvereinbarung', subtitle: '04488 528140', url: 'tel:04488528140', action: 'telefon' },
      { icon: '🌐', title: 'Online-Anfrage', subtitle: 'Formular auf drcarstenschmidt.com', url: 'https://drcarstenschmidt.com', action: 'kontaktformular' },
      { icon: '🏥', title: 'Vor Ort in der Praxis', subtitle: 'Neuer Bahnweg 11, Westerstede', action: 'praxis-besuch' }
    ],
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'termin absagen': {
    text: 'Wenn Sie einen Termin nicht wahrnehmen können, wählen Sie bitte eine passende Option:',
    links: [
      { icon: '📞', title: 'Telefonische Absage', subtitle: '04488 528140', url: 'tel:04488528140', action: 'telefon' },
      { icon: '📠', title: 'Per Fax absagen', subtitle: '04488 5281429', action: 'fax' },
      { icon: '💬', title: 'Daten im Chat übermitteln', subtitle: 'Wir nehmen Ihre Absage hier entgegen', action: 'termin-absagen-formular' }
    ],
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'befund anfragen': {
    text: 'So erhalten Sie Befunde aus unserer Hausarztpraxis:',
    links: [
      { icon: '📞', title: 'Telefonische Anfrage', subtitle: '04488 528140', url: 'tel:04488528140', action: 'telefon' },
      { icon: '📠', title: 'Per Fax anfordern', subtitle: '04488 5281429', action: 'fax' },
      { icon: '🌐', title: 'Online-Kontakt', subtitle: 'Formular auf drcarstenschmidt.com', url: 'https://drcarstenschmidt.com', action: 'kontaktformular' },
      { icon: '🏥', title: 'Vor Ort abholen', subtitle: 'Neuer Bahnweg 11, Westerstede', action: 'praxis-besuch' }
    ],
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'rezept anfordern': {
    text: 'So können Sie Rezepte bei uns anfordern:',
    links: [
      { icon: '📞', title: 'Telefonischer Rezeptservice', subtitle: '04488 528140', url: 'tel:04488528140', action: 'telefon' },
      { icon: '🌐', title: 'Online anfragen', subtitle: 'Formular auf drcarstenschmidt.com', url: 'https://drcarstenschmidt.com', action: 'rezept-formular' },
      { icon: '🏥', title: 'Persönlich in der Praxis', subtitle: 'Neuer Bahnweg 11, Westerstede', action: 'abholen-rezept' }
    ],
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'krankmeldung anfordern': {
    text: 'Krankmeldung (AU) anfordern:',
    links: [
      { icon: '📞', title: 'Telefonischer Kontakt', subtitle: '04488 528140', url: 'tel:04488528140', action: 'telefon' },
      { icon: '📝', title: 'Daten im Chat übermitteln', subtitle: 'Angaben Schritt für Schritt eintragen', action: 'au-formular' },
      { icon: '🏥', title: 'Unterlagen in der Praxis', subtitle: 'Neuer Bahnweg 11, Westerstede', action: 'abholen-au' }
    ],
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'überweisung anfordern': {
    text: 'Überweisungen für Fachärztinnen und Fachärzte:',
    links: [
      { icon: '📞', title: 'Telefonische Anfrage', subtitle: '04488 528140', url: 'tel:04488528140', action: 'telefon' },
      { icon: '📝', title: 'Angaben im Chat übermitteln', subtitle: 'Notwendige Daten eingeben', action: 'ueberweisung-formular' },
      { icon: '🏥', title: 'Abholung in der Praxis', subtitle: 'Neuer Bahnweg 11, Westerstede', action: 'abholen-ueberweisung' }
    ],
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'befunde-senden': {
    text: 'Befunde digital erhalten:',
    html: `
        📥 <strong>Bitte übermitteln Sie folgende Angaben:</strong><br><br>
        • Vollständiger Name<br>
        • Geburtsdatum<br>
        • Telefonnummer für Rückfragen<br>
        • Art der Untersuchung<br>
        • Datum der Untersuchung<br><br>
        Wir informieren Sie, sobald Ihre Befunde bereitstehen oder senden diese auf dem vereinbarten Weg zu.
    `,
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'feedback geben': {
    text: 'Wir freuen uns über Ihre Rückmeldung zur Hausarztpraxis Orchideenkamp!',
    links: [
      { icon: '🌐', title: 'Feedback online teilen', subtitle: 'Formular auf drcarstenschmidt.com', url: 'https://drcarstenschmidt.com', action: 'feedback-formular' },
      { icon: '📞', title: 'Rückmeldung telefonisch', subtitle: '04488 528140', url: 'tel:04488528140', action: 'telefon' }
    ],
    quickReplies: ['Zurück zum Hauptmenü']
  },
  notfall: {
    text: '🚨 Notfall-Informationen:',
    html: `
        <strong>Bei lebensbedrohlichen Notfällen:</strong><br>
        🚑 <a href="tel:112">Notruf 112</a><br><br>
        <strong>Ärztlicher Bereitschaftsdienst:</strong><br>
        📞 <a href="tel:116117">116 117</a><br><br>
        <strong>Giftnotruf:</strong><br>
        ☎️ <a href="tel:05519240">0551 19240</a>
    `,
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'für zuweiser': {
    text: 'Informationen für zuweisende Kolleginnen und Kollegen:',
    links: [
      { icon: '📞', title: 'Kollegiale Rücksprache', subtitle: '04488 528140', url: 'tel:04488528140', action: 'telefon' },
      { icon: '📠', title: 'Überweisung per Fax', subtitle: '04488 5281429', action: 'fax' },
      { icon: '🌐', title: 'Informationen auf der Website', subtitle: 'drcarstenschmidt.com', url: 'https://drcarstenschmidt.com', action: 'zuweiserportal' }
    ],
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'öffnungszeiten': {
    text: 'Unsere Sprechzeiten:',
    html: `
        <strong>Reguläre Zeiten:</strong><br>
        🕐 Montag bis Freitag: 08:00 – 13:00 Uhr<br>
        🕐 Montag & Donnerstag: 15:00 – 18:30 Uhr<br><br>
        Bitte vereinbaren Sie vor Ihrem Besuch einen Termin.
    `,
    links: [
      { icon: '📅', title: 'Termin vereinbaren', subtitle: 'Telefon oder Online-Anfrage', action: 'termin vereinbaren' },
      { icon: '🚨', title: 'Notdienst', subtitle: 'Außerhalb der Öffnungszeiten', action: 'notfall' }
    ],
    quickReplies: ['Zurück zum Hauptmenü']
  },
  kontakt: {
    text: 'So erreichen Sie die Hausarztpraxis Orchideenkamp:',
    links: [
      { icon: '📞', title: 'Telefon', subtitle: '04488 528140', url: 'tel:04488528140', action: 'telefon' },
      { icon: '📠', title: 'Fax', subtitle: '04488 5281429', action: 'fax' },
      { icon: '📍', title: 'Adresse', subtitle: 'Neuer Bahnweg 11, 26655 Westerstede', action: 'praxis-besuch' },
      { icon: '🌐', title: 'Website', subtitle: 'drcarstenschmidt.com', url: 'https://drcarstenschmidt.com', action: 'website' }
    ],
    quickReplies: ['Termin vereinbaren', 'Leistungen', 'Zurück zum Hauptmenü']
  },
  'rezept-formular': {
    text: 'Rezept-Anforderung:',
    html: `
        📝 <strong>Bitte geben Sie folgende Informationen an:</strong><br><br>
        • Ihr vollständiger Name<br>
        • Geburtsdatum<br>
        • Medikamentenname<br>
        • Dosierung<br>
        • Telefonnummer<br><br>
        Wir melden uns innerhalb von 24 Stunden bei Ihnen.
    `,
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'au-formular': {
    text: 'Krankmeldung (AU) anfordern:',
    html: `
        📝 <strong>Arbeitsunfähigkeitsbescheinigung</strong><br><br>
        Bitte geben Sie folgende Informationen an:<br>
        • Ihr vollständiger Name<br>
        • Geburtsdatum<br>
        • Telefonnummer<br>
        • Grund der Krankmeldung<br>
        • Gewünschter Zeitraum<br>
        • Arbeitgeber (Name und Adresse)<br><br>
        Ein Arzt wird sich mit Ihnen in Verbindung setzen.
    `,
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'ueberweisung-formular': {
    text: 'Überweisung anfordern:',
    html: `
        📋 <strong>Überweisung zum Facharzt</strong><br><br>
        Bitte geben Sie folgende Informationen an:<br>
        • Ihr vollständiger Name<br>
        • Geburtsdatum<br>
        • Telefonnummer<br>
        • Facharzt/Fachrichtung<br>
        • Grund der Überweisung<br>
        • Name des Facharztes (falls bekannt)<br><br>
        Wir stellen die Überweisung aus und informieren Sie.
    `,
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'termin-absagen-formular': {
    text: 'Termin absagen:',
    html: `
        📝 <strong>Termin stornieren</strong><br><br>
        Bitte geben Sie folgende Informationen an:<br>
        • Ihr vollständiger Name<br>
        • Geburtsdatum<br>
        • Termin-Datum und Uhrzeit<br>
        • Telefonnummer<br><br>
        Ihr Termin wird umgehend storniert.
    `,
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'abholen-rezept': {
    text: 'Rezept persönlich abholen:',
    html: `
        🏥 <strong>Abholung in der Praxis</strong><br><br>
        Ihr Rezept liegt für Sie bereit.<br><br>
        <strong>Öffnungszeiten:</strong><br>
        Mo-Fr: 08:00 - 12:00 Uhr<br>
        Mo-Fr: 14:00 - 18:00 Uhr<br><br>
        Bitte bringen Sie Ihre Versichertenkarte mit.
    `,
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'abholen-au': {
    text: 'Krankmeldung persönlich abholen:',
    html: `
        🏥 <strong>Abholung in der Praxis</strong><br><br>
        Ihre Arbeitsunfähigkeitsbescheinigung liegt für Sie bereit.<br><br>
        <strong>Öffnungszeiten:</strong><br>
        Mo-Fr: 08:00 - 12:00 Uhr<br>
        Mo-Fr: 14:00 - 18:00 Uhr<br><br>
        Bitte bringen Sie Ihre Versichertenkarte mit.
    `,
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'abholen-ueberweisung': {
    text: 'Überweisung persönlich abholen:',
    html: `
        🏥 <strong>Abholung in der Praxis</strong><br><br>
        Ihre Überweisung liegt für Sie bereit.<br><br>
        <strong>Öffnungszeiten:</strong><br>
        Mo-Fr: 08:00 - 12:00 Uhr<br>
        Mo-Fr: 14:00 - 18:00 Uhr<br><br>
        Bitte bringen Sie Ihre Versichertenkarte mit.
    `,
    quickReplies: ['Zurück zum Hauptmenü']
  },
  telefon: {
    text: 'Sie erreichen uns telefonisch unter 04461-81666 (Mo-Fr 08:00-18:00 Uhr).',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  email: {
    text: 'Gerne können Sie uns per E-Mail unter info@praxis.de kontaktieren. Wir melden uns schnellstmöglich.',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'online-termin': {
    text: 'Für die Online-Terminbuchung nutzen Sie bitte unser Patientenportal. Dort finden Sie alle verfügbaren Zeiten.',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  patientenportal: {
    text: 'Bitte melden Sie sich mit Ihren Zugangsdaten im Patientenportal an. Bei Fragen helfen wir Ihnen telefonisch weiter.',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  bewertung: {
    text: 'Vielen Dank, dass Sie uns bewerten möchten! Ihre Rückmeldung hilft uns, unseren Service zu verbessern.',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'feedback-formular': {
    text: 'Nutzen Sie unser Feedback-Formular, um uns Ihre Anregungen mitzuteilen. Wir freuen uns über jede Rückmeldung.',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  zuweiserportal: {
    text: 'Kolleginnen und Kollegen erreichen unser Zuweiserportal über einen gesicherten Zugang. Bei Fragen helfen wir gern telefonisch weiter.',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'ueberweisung-zuweiser': {
    text: 'Überweisungen für gemeinsame Patienten können Sie uns digital oder telefonisch übermitteln. Vielen Dank für die Zusammenarbeit!',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  abholen: {
    text: 'Sie können Unterlagen jederzeit während unserer Öffnungszeiten persönlich abholen. Bitte bringen Sie Ihre Versichertenkarte mit.',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  website: {
    text: 'Auf unserer Website www.praxis.de finden Sie alle Informationen zu Leistungen und Team.',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  maps: {
    text: 'Unsere Praxis befindet sich im Zentrum. Klicken Sie auf „Anfahrt“, um Google Maps zu öffnen.',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  whatsapp: {
    text: 'Über WhatsApp erreichen Sie uns unter +49 4461 8166. Bitte beachten Sie, dass wir aus Datenschutzgründen keine sensiblen Daten dort austauschen.',
    quickReplies: ['Zurück zum Hauptmenü']
  },
  'zurück zum hauptmenü': {
    text: 'Wie kann ich Ihnen weiterhelfen?',
    quickReplies: [
      'Termin vereinbaren',
      'Termin absagen',
      'Befund anfragen',
      'Rezept anfordern',
      'Krankmeldung anfordern',
      'Überweisung anfordern',
      'Beschwerden einschätzen',
      'Öffnungszeiten',
      'Leistungen',
      'Kontakt'
    ]
  },
  'fragebogen beschwerden starten': {
    text: 'Gerne helfe ich Ihnen dabei, Ihre Beschwerden einzuschätzen. Ich stelle Ihnen nun einige strukturierte Fragen, um die Dringlichkeit besser beurteilen zu können.',
    html: `
        ⚕️ <strong>Medizinischer Beschwerde-Fragebogen</strong><br><br>
        Ich werde Ihnen nun einige Fragen zu Ihren Beschwerden stellen. Bitte antworten Sie so genau wie möglich.<br><br>
        <strong>Wichtig:</strong> Diese Einschätzung ersetzt keine ärztliche Diagnose, sondern dient nur zur Orientierung.
    `,
    quickReplies: ['Zurück zum Hauptmenü']
  },
  default: {
    text: 'Vielen Dank für Ihre Nachricht. Unser Team meldet sich zeitnah bei Ihnen.',
    links: [
      { icon: '📞', title: 'Dringend?', subtitle: 'Jetzt anrufen: 04488 528140', url: 'tel:04488528140', action: 'telefon' }
    ],
    quickReplies: ['Termin vereinbaren', 'Rezept anfordern', 'Krankmeldung anfordern', 'Beschwerden einschätzen', 'Kontakt']
  },
  leistungen: {
    text: 'Unsere Leistungen im Überblick:',
    html: `
        • Hausärztliche und psychosomatische Grundversorgung aller Altersstufen<br>
        • Laboruntersuchungen inkl. Spezialdiagnostik (z. B. Covid-19-Testung)<br>
        • Impfungen inkl. Covid-19 (KW 14+15: mRNA-Impfstoffe wie Comirnaty oder Moderna)<br>
        • Sonographie, EKG, Langzeit-Blutdruckmessung<br>
        • Vorsorge, Prävention, Impfungen, reisemedizinische Beratung, ärztliche Atteste<br>
        • Telemedizinische Leistungen und ernährungsmedizinische Beratung<br>
        • Individuelle Spezialsprechstunden nach Vereinbarung
    `,
    quickReplies: ['Termin vereinbaren', 'Kontakt', 'Zurück zum Hauptmenü']
  },
  'praxis-besuch': {
    text: 'Sie finden uns in der Hausarztpraxis Orchideenkamp:',
    html: `
        <strong>Adresse:</strong><br>
        Neuer Bahnweg 11<br>
        26655 Westerstede<br><br>
        <strong>Sprechzeiten:</strong><br>
        Mo.–Fr.: 08:00 – 13:00 Uhr<br>
        Mo. & Do.: 15:00 – 18:30 Uhr<br><br>
        Bitte vereinbaren Sie vorab einen Termin.
    `,
    quickReplies: ['Termin vereinbaren', 'Kontakt', 'Zurück zum Hauptmenü']
  },
  kontaktformular: {
    text: 'Sie erreichen uns auch über das Kontaktformular auf unserer Website.',
    html: `
        Besuchen Sie <a href="https://drcarstenschmidt.com" target="_blank" rel="noopener">drcarstenschmidt.com</a><br>
        und nutzen Sie das Anfrageformular für Termin- oder Rezeptwünsche.
    `,
    quickReplies: ['Termin vereinbaren', 'Kontakt', 'Zurück zum Hauptmenü']
  },
  fax: {
    text: 'Faxnummer der Hausarztpraxis Orchideenkamp: 04488 5281429',
    quickReplies: ['Termin vereinbaren', 'Kontakt', 'Zurück zum Hauptmenü']
  }
};

export const DEFAULT_QUICK_REPLY_LABELS = [
  'Termin vereinbaren',
  'Termin absagen',
  'Befund anfragen',
  'Rezept anfordern',
  'Krankmeldung anfordern',
  'Überweisung anfordern',
  'Beschwerden einschätzen',
  'Öffnungszeiten',
  'Leistungen',
  'Kontakt'
];

