# 📅 Joplin Calendar Plugin

This plugin for [Joplin](https://joplinapp.org/) adds a simple calendar which also helps track notes created and modified each day.

![Showcase](./images/showcase.png)

# ⭐ Features

- The plugin includes a **calendar** and a **notes list**.
- **Calendar Only Mode** is enabled by default. It shows just the calendar,
  skips all note searches, and displays the ISO week number next to the month
  (for example `W44`; a week crossing New Year is shown as `W52/W1`). Disable
  it in the plugin settings to show the note list and note-count dots again.
- **Chinese public holidays** (2025–2026) are highlighted in Calendar Only Mode:
  statutory holidays are tinted red with a filled corner dot, make-up workdays
  (调休) are tinted blue with a hollow corner marker. Hover a day to see the
  holiday name. Toggle this with the "Show Chinese Public Holidays" setting;
  coverage, source URLs and the last import are shown under "Holiday Data
  Status", and data can be updated by importing a JSON file without
  repackaging.

## 📆 Calendar

- Clicking on a calendar date shows the notes created or updated on that date.
- Clicking on the '<' and '>' buttons above the calendar moves between months.
- Clicking on the '<' and '>' buttons above the calendar _while holding `ctrl`_ moves between years.
- Calendar dates have dots beneath them indicating the number of notes written on that day.
  - Each dot represents 2 notes created, up to a maximum of 4 dots.

> [!Tip]
> The create date and updated date for a note can be manually change by clicking on the "🛈" button.

## 🗒️ Notes List

- The notes list shows notes created on the specified date.
- The notes list can show notes updated on the specified date.
  - This must be enabled in the settings.
- The notes list can show notes related to the specified date. These are notes that have the date in the title of the note.
  - This must be enabled in the settings.
  - The Joplin date format is used when searching for related notes.
- Navigate to the notes by clicking on the titles in the notes list.
- Clicking on the '<' and '>' buttons above the notes list moves days.
- Clicking on the '<' and '>' buttons above the notes list _while holding `ctrl`_ moves between days with notes.
- Clicking the `today` button brings back the calendar focus to the current day.
- Notes can be sorted by time of creation, or alphabetically. The sort direction can also be changed.

## ⌨️ Keyboard Shortcuts

### Joplin Wide

| Action              | Default Shortcut  |
| ------------------- | ----------------- |
| Toggle the Calendar | CmdOrCtrl+Shift+` |

### After clicking on Calendar

- Use the arrow key to move between dates.
- Use Ctrl to jump between days with notes.
  - Use Ctrl+Left or Ctrl+Up to jump to the nearest date in the past with a note.
  - Use Ctrl+Right or Ctrl+Down to jump to the nearest date in the future with a note.

### After clicking on the Note List

- Use up and down arrow keys to select notes.

## 🛑 Limitations

- Related notes is still an experimental feature - it will negatively impact performance with larger note books.
- When searching for the nearest note with Related Notes ON, only related notes within the closest 120 days will be checked.

# ⚙️ Development

## Building the plugin

The plugin is built using Webpack, which creates the compiled code in `/dist`. A JPL archive will also be created at the root, which can be used to distribute the plugin or test locally by loading it into Joplin.

To build the plugin, run `npm run dist`. Each run bumps the patch version,
appends a build timestamp, and packages the result in `publish/`.
Alternatively, to automatically rebuild the plugin on source code changes, run
`npm run watch` (it uses `npm run build:raw`, which does not change the version).

## Testing the plugin

Jest is used for unit tests. Run them with: `npm run test`.

## Updating Chinese holiday data

Bundled data lives in `src/gui/holidays/data.ts` and is generated from
[holiday-cn](https://github.com/NateScarlet/holiday-cn) (MIT). After the State
Council publishes next year's schedule, regenerate it:

```bash
npm run holidays:update -- 2026 2027
```

The covered years and source URLs are also shown in the plugin settings.

### Updating without repackaging

The plugin can import holiday data at runtime, so new years do not require a
new `.jpl`:

- **Chinese Holiday Data File** imports a holiday-cn JSON file on desktop. It
  can contain one year object or an array of them.
- **Chinese Holiday JSON URL** shows the direct URL for the next useful year
  (for example 2027); the description lists the other years and the jsDelivr
  mirror. Copy it into a browser to check whether the JSON file is available,
  then import the downloaded file.
- **Holiday Data Status** shows the coverage, source, last import and source
  URLs currently in use.
- No network requests are made. Imported data overrides bundled data; clearing
  the file setting returns to the bundled data.
- File import is desktop-only (Joplin does not support file pickers on mobile).

## Releasing a new version

Every packaging run bumps the version and appends the build time, so each
`.jpl` is unique:

```bash
npm run dist         # patch: 1.4.0 -> 1.4.1-b20261103.t150413
npm run dist:minor   # minor: 1.4.0 -> 1.5.0-b20261103.t150413
npm run dist:major   # major: 1.4.0 -> 2.0.0-b20261103.t150413
npm run release -- --set=2.0.0
```

The format is `<major>.<minor>.<patch>-b<YYYYMMDD>.t<HHmmss>` (local time).
The bump updates `package.json`, `src/manifest.json` and `package-lock.json`
before the build, so the generated `.jpl` carries the new version, and a copy
is saved as `publish/<id>-v<version>.jpl`. If the build fails, the previous
version is restored.

Use `npm run release -- --dry-run` to preview the next version without
changing anything, or `npm run build:raw` to package without bumping.

## Updating the plugin framework

To update the plugin framework, run `npm run update`.

In general this command tries to do the right thing - in particular it's going to merge the changes in package.json and .gitignore instead of overwriting. It will also leave "/src" as well as README.md untouched.

The file that may cause problem is "webpack.config.js" because it's going to be overwritten. For that reason, if you want to change it, consider creating a separate JavaScript file and include it in webpack.config.js. That way, when you update, you only have to restore the line that include your file.
