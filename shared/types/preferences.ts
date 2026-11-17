// A person's own choices (GET/PUT /api/me/preferences), saved with their account.
export interface Preferences {
  units: UnitSystem
  whatsNewAuto: boolean // open What's new by itself after an update
  whatsNewSeen: number // id of the newest update they've seen (0: none)
}
