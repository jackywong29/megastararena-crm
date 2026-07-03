// Master template for the per-show "Meeting Info" spec sheet.
// Sales fills this in so every department reads the same source of truth for a show.
// Values are stored per-show in shows.meeting_info (JSONB) keyed by `key`; the labels/order
// live here in code. Shows can also add their own extra items (stored in meeting_info.extras).

export interface MeetingField {
  key: string
  label: string
  multiline?: boolean
}

export interface MeetingSection {
  title: string
  fields: MeetingField[]
}

export const MEETING_INFO_TEMPLATE: MeetingSection[] = [
  {
    title: 'Timing',
    fields: [
      { key: 'show_start', label: 'Show Start' },
      { key: 'show_end', label: 'Show End' },
      { key: 'door_open', label: 'Door Open' },
      { key: 'sound_check', label: 'Sound Check' },
      { key: 'rehearsal_time', label: 'Rehearsal Time' },
      { key: 'block_lift', label: 'Block Lift' },
      { key: 'load_in_time', label: 'Load In Time' },
    ],
  },
  {
    title: 'Audience & Activity',
    fields: [
      { key: 'before_after_activity', label: 'Before / After Show Activity' },
      { key: 'activity_info', label: 'Activity Info', multiline: true },
      { key: 'capacity', label: 'Capacity' },
    ],
  },
  {
    title: 'Staging & Production',
    fields: [
      { key: 'backdrop', label: 'Backdrop' },
      { key: 'booth_counter', label: 'Booth / Counter' },
      { key: 'booth_counter_open', label: 'Booth / Counter Open Time' },
      { key: 'band_riser', label: 'Band Riser' },
      { key: 'hydraulic', label: 'Hydraulic' },
      { key: 'camera_platform', label: 'Camera Platform' },
      { key: 'mojo_barricade', label: 'Mojo Barricade' },
      { key: 'quick_change_room', label: 'Quick Change Room' },
      { key: 'crane', label: 'Crane' },
      { key: 'follow_spot', label: 'Follow Spot' },
    ],
  },
  {
    title: 'Effects & Lighting',
    fields: [
      { key: 'special_effect', label: 'Special Effect' },
      { key: 'laser_lighting', label: 'Laser / Extra Lighting' },
      { key: 'drone', label: 'Drone' },
    ],
  },
  {
    title: 'Facilities & Parking',
    fields: [
      { key: 'aircond', label: 'Aircond' },
      { key: 'ambulance', label: 'Ambulance' },
      { key: 'b3_parking', label: 'B3 Parking' },
      { key: 'loading_bay_parking', label: 'Loading Bay Parking' },
      { key: 'valet_parking', label: 'Valet Parking' },
    ],
  },
  {
    title: 'Permissions & Readings',
    fields: [
      { key: 'shooting_permission', label: 'Shooting Permission' },
      { key: 'tapping_initial', label: 'Tapping Reading (Initial)' },
      { key: 'tapping_final', label: 'Tapping Reading (Final)' },
    ],
  },
  {
    title: 'Notes',
    fields: [
      { key: 'remarks', label: 'Remarks', multiline: true },
      { key: 'additional_items', label: 'Additional Items / Charges', multiline: true },
    ],
  },
]

// Every template key, flat — handy for counting how many fields are filled.
export const MEETING_INFO_KEYS: string[] = MEETING_INFO_TEMPLATE.flatMap(s => s.fields.map(f => f.key))
